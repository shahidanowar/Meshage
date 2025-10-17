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
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
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
      if (friendAddress && connectedPeers.includes(friendAddress)) {
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    };
    checkConnection();
  }, [connectedPeers, friendAddress]);

  // Listen to network events
  useEffect(() => {
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
      (data: { address: string }) => {
        console.log('PersonalChat - Peer connected:', data.address);
        setConnectedPeers(prev => [...new Set([...prev, data.address])]);
      }
    );

    const onPeerDisconnectedListener = MeshNetworkEvents.addListener(
      'onPeerDisconnected',
      (data: { address: string }) => {
        console.log('PersonalChat - Peer disconnected:', data.address);
        setConnectedPeers(prev => prev.filter(p => p !== data.address));
      }
    );

    return () => {
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
    MeshNetwork.sendMessage(directMessage, myUsername, null);
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
