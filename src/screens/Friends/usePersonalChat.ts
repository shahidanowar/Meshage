import { useState, useEffect, useRef } from 'react';
import { NativeModules, NativeEventEmitter } from 'react-native';
import { StorageService } from '../../utils/storage';
import type { Message } from '../../types';

const { MeshNetwork } = NativeModules;
const MeshNetworkEvents = new NativeEventEmitter(MeshNetwork);

interface UsePersonalChatProps {
  friendId: string;
  friendName: string;
  friendAddress?: string;
}

export const usePersonalChat = ({ friendId, friendName, friendAddress }: UsePersonalChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectedPeerAddresses, setConnectedPeerAddresses] = useState<string[]>([]);
  const [connectedPeerIds, setConnectedPeerIds] = useState<Map<string, string>>(new Map()); // address -> persistentId
  const [myPersistentId, setMyPersistentId] = useState<string>('');
  const [myUsername, setMyUsername] = useState<string>('User');
  const messagesEndRef = useRef<any>(null);

  // Load user data and chat history
  useEffect(() => {
    const loadUserData = async () => {
      const persistentId = await StorageService.getPersistentId();
      setMyPersistentId(persistentId);
      
      const username = await StorageService.getUsername();
      setMyUsername(username || 'User');

      // Load chat history for this friend
      const history = await StorageService.getChatHistory(friendId);
      if (history.length > 0) {
        setMessages(history);
        console.log(`Loaded ${history.length} messages from history for friend: ${friendId}`);
      }
    };
    loadUserData();
  }, [friendId]);

  // Check connection status
  useEffect(() => {
    const checkConnection = () => {
      // Check if friend is connected by either:
      // 1. Device address match (if we have friendAddress)
      // 2. Persistent ID match (check all connected peers)
      const isConnectedByAddress = friendAddress && connectedPeerAddresses.includes(friendAddress);
      const isConnectedById = Array.from(connectedPeerIds.values()).includes(friendId);
      
      const connected = isConnectedByAddress || isConnectedById;
      setIsConnected(connected);
      
      console.log('PersonalChat - Connection check:', {
        friendId,
        friendAddress,
        connectedPeerAddresses,
        connectedPeerIds: Array.from(connectedPeerIds.entries()),
        isConnectedByAddress,
        isConnectedById,
        finalStatus: connected
      });
    };
    checkConnection();
  }, [connectedPeerAddresses, connectedPeerIds, friendAddress, friendId]);

  // Listen to network events
  useEffect(() => {
    // Listen to peers found to map addresses to persistent IDs
    const onPeersFoundListener = MeshNetworkEvents.addListener(
      'onPeersFound',
      (peers: Array<{ deviceName: string; deviceAddress: string; status: number }>) => {
        console.log('PersonalChat - Peers found:', peers.length);
        
        // Build mapping of connected peers (status 0 = connected)
        const newConnectedAddresses: string[] = [];
        const newPeerIdMap = new Map<string, string>();
        
        peers.forEach(peer => {
          if (peer.status === 0) { // Connected
            newConnectedAddresses.push(peer.deviceAddress);
            
            // Extract persistent ID from device name
            const parts = peer.deviceName.split('|');
            if (parts.length === 2) {
              const persistentId = parts[1];
              newPeerIdMap.set(peer.deviceAddress, persistentId);
              console.log('PersonalChat - Peer mapping:', {
                address: peer.deviceAddress,
                name: parts[0],
                persistentId,
                isFriend: persistentId === friendId
              });
            }
          }
        });
        
        setConnectedPeerAddresses(newConnectedAddresses);
        setConnectedPeerIds(newPeerIdMap);
      }
    );

    const onMessageReceivedListener = MeshNetworkEvents.addListener(
      'onMessageReceived',
      (data: { message: string; fromAddress: string; timestamp: number }) => {
        console.log('PersonalChat - Message received:', {
          message: data.message.substring(0, 50) + '...',
          fromAddress: data.fromAddress,
          expectedFriendId: friendId,
        });
        
        // Check if it's a direct message
        if (data.message.startsWith('DIRECT_MSG:')) {
          const parts = data.message.split(':', 3);
          console.log('PersonalChat - Parsing DIRECT_MSG, parts:', parts.length);
          
          if (parts.length === 3) {
            const targetPersistentId = parts[1];
            const messageContent = parts[2];
            
            console.log('PersonalChat - Message details:', {
              targetPersistentId,
              myPersistentId,
              friendId,
              messageContent: messageContent.substring(0, 20)
            });
            
            // Show message if it's meant for ME and from MY FRIEND
            if (targetPersistentId === myPersistentId) {
              const newMessage: Message = {
                id: `${data.timestamp}-${data.fromAddress}`,
                text: messageContent,
                fromAddress: data.fromAddress,
                senderName: friendName,
                timestamp: data.timestamp,
                isSent: false,
              };
              setMessages(prev => {
                // Check for duplicate message (same ID)
                const isDuplicate = prev.some(msg => msg.id === newMessage.id);
                if (isDuplicate) {
                  console.log('PersonalChat - Duplicate message detected, skipping');
                  return prev;
                }
                
                const updated = [...prev, newMessage];
                // Save to storage
                StorageService.saveChatHistory(friendId, updated);
                return updated;
              });
              console.log('✅ PersonalChat - Received message meant for me:', messageContent);
            } else {
              console.log('❌ PersonalChat - Message not meant for me (target:', targetPersistentId, 'me:', myPersistentId, ')');
            }
          }
          return;
        }
        
        // Skip system messages
        if (data.message.startsWith('FRIEND_REQUEST:') || data.message.startsWith('FRIEND_ACCEPT:')) {
          return;
        }
        
        // Skip broadcast messages
        console.log('PersonalChat - Ignoring broadcast message');
      }
    );

    const onPeerConnectedListener = MeshNetworkEvents.addListener(
      'onPeerConnected',
      (data: { address: string; deviceName?: string } | string) => {
        const address = typeof data === 'string' ? data : data.address;
        const deviceName = typeof data === 'object' ? data.deviceName : undefined;
        
        console.log('PersonalChat - Peer connected:', address, deviceName);
        setConnectedPeerAddresses(prev => [...new Set([...prev, address])]);
        
        // Extract persistent ID from device name if available
        if (deviceName) {
          const parts = deviceName.split('|');
          if (parts.length === 2) {
            const persistentId = parts[1];
            setConnectedPeerIds(prev => new Map(prev).set(address, persistentId));
            console.log('PersonalChat - Mapped peer:', { address, persistentId });
          }
        }
      }
    );

    const onPeerDisconnectedListener = MeshNetworkEvents.addListener(
      'onPeerDisconnected',
      (data: { address: string } | string) => {
        const address = typeof data === 'string' ? data : data.address;
        
        console.log('PersonalChat - Peer disconnected:', address);
        setConnectedPeerAddresses(prev => prev.filter(p => p !== address));
        setConnectedPeerIds(prev => {
          const updated = new Map(prev);
          updated.delete(address);
          return updated;
        });
      }
    );

    return () => {
      onPeersFoundListener.remove();
      onMessageReceivedListener.remove();
      onPeerConnectedListener.remove();
      onPeerDisconnectedListener.remove();
    };
  }, [friendId, myPersistentId, friendName]);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    const newMessage: Message = {
      id: `${Date.now()}-sent`,
      text: messageText,
      fromAddress: 'me',
      senderName: myUsername,
      timestamp: Date.now(),
      isSent: true,
    };

    setMessages(prev => {
      const updated = [...prev, newMessage];
      // Save to storage
      StorageService.saveChatHistory(friendId, updated);
      return updated;
    });

    // Add DIRECT_MSG prefix to indicate this is a private message
    const directMessage = `DIRECT_MSG:${friendId}:${messageText}`;
    console.log("usePersonalChat: directMessage: ", directMessage)
    
    // Always broadcast direct messages to ensure delivery
    // Include persistent ID in sender name so receiver can identify sender
    const senderIdentifier = `${myUsername}|${myPersistentId}`;
    MeshNetwork.sendMessage(directMessage, senderIdentifier, null);
    console.log('PersonalChat - Broadcasting direct message to friend:', friendId);

    setMessageText('');

    setTimeout(() => {
      messagesEndRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return {
    messages,
    messageText,
    isConnected,
    messagesEndRef,
    setMessageText,
    handleSendMessage,
  };
};
