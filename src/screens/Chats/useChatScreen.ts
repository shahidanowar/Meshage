import { useState, useEffect, useRef } from 'react';
import {
  NativeModules,
  NativeEventEmitter,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { StorageService } from '../../utils/storage';

interface Peer {
  deviceName: string;
  deviceAddress: string;
  status: number;
  persistentId?: string; // Persistent device ID extracted from deviceName
  displayName?: string; // Username extracted from deviceName
}

interface DiscoveryEvent {
  status: string;
  reasonCode?: number;
}

interface Message {
  id: string;
  text: string;
  fromAddress: string;
  timestamp: number;
  isSent: boolean;
}

interface ConnectionInfo {
  isGroupOwner: boolean;
  groupOwnerAddress: string;
}

const { MeshNetwork } = NativeModules;
const MeshNetworkEvents = new NativeEventEmitter(MeshNetwork);

// Utility function to parse device identifier "username|deviceId"
const parseDeviceIdentifier = (deviceName: string): { displayName: string; persistentId?: string } => {
  const parts = deviceName.split('|');
  
  if (parts.length === 2) {
    return {
      displayName: parts[0],
      persistentId: parts[1],
    };
  }
  
  // Fallback for devices without persistent ID (old format or other apps)
  return {
    displayName: deviceName,
    persistentId: undefined,
  };
};

export const useChatScreen = () => {
  const [status, setStatus] = useState<string>('Not Initialized');
  const [peers, setPeers] = useState<Peer[]>([]);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isGroupOwner, setIsGroupOwner] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState<string>('');
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('User');
  const [showPeerModal, setShowPeerModal] = useState<boolean>(false);
  const [deviceId, setDeviceId] = useState<string>('');
  const [friendsList, setFriendsList] = useState<Set<string>>(new Set());
  const [friendRequests, setFriendRequests] = useState<Array<{ persistentId: string; displayName: string; deviceAddress: string; timestamp: number; type?: 'incoming' | 'outgoing' }>>([]);
  const messagesEndRef = useRef<any>(null);
  const hasAutoStarted = useRef<boolean>(false);
  const connectionAttempts = useRef<Map<string, number>>(new Map());
  const connectionRetryTimers = useRef<Map<string, any>>(new Map());

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    const permissionsToRequest: Array<typeof PermissionsAndroid.PERMISSIONS[keyof typeof PermissionsAndroid.PERMISSIONS]> = [];

    if (Platform.Version >= 33) {
      // Android 13+
      permissionsToRequest.push(
        PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      );
    } else if (Platform.Version >= 31) {
      // Android 12
      permissionsToRequest.push(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
    } else {
      // Android 11 and below
      permissionsToRequest.push(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      );
    }

    try {
      const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);
      const allGranted = Object.values(granted).every(
        r => r === PermissionsAndroid.RESULTS.GRANTED,
      );
      if (allGranted) {
        console.log('All required permissions granted');
        return true;
      } else {
        console.log('One or more permissions were denied:', granted);
        return false;
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      // Load username and device ID from storage
      const savedUsername = await StorageService.getUsername();
      const savedDeviceId = await StorageService.getDeviceId(); // Gets or creates device ID
      
      if (savedUsername) {
        setUsername(savedUsername);
      }
      
      setDeviceId(savedDeviceId);
      
      // Load friends list
      const friends = await StorageService.getFriends();
      setFriendsList(new Set(friends.map(f => f.persistentId)));
      console.log('Loaded friends:', friends.length);
      
      // Load friend requests
      const requests = await StorageService.getFriendRequests();
      setFriendRequests(requests);
      console.log('Loaded friend requests:', requests.length);
      
      // Create device identifier: "username|deviceId"
      // Format: "Alice|abc-123-def" so other devices can parse it
      const deviceIdentifier = savedUsername 
        ? `${savedUsername}|${savedDeviceId}` 
        : `User|${savedDeviceId}`;
      
      console.log('Device Identifier:', deviceIdentifier);
      console.log('Persistent Device ID:', savedDeviceId);
      
      // Update device name with username AND device ID
      MeshNetwork.setDeviceName(deviceIdentifier);
      
      MeshNetwork.init();
      setStatus('Initialized');

      // Auto-start discovery after permissions
      if (!hasAutoStarted.current) {
        hasAutoStarted.current = true;
        const hasPermission = await requestPermissions();
        if (hasPermission) {
          setStatus('Auto-starting discovery...');
          setTimeout(() => {
            MeshNetwork.discoverPeers();
          }, 1000); // Small delay to ensure initialization
        } else {
          setStatus('Permissions required. Tap Discover Peers.');
        }
      }
    };

    initializeApp();

    const attemptConnection = (peer: Peer) => {
      const attempts = connectionAttempts.current.get(peer.deviceAddress) || 0;
      
      if (!connectedPeers.includes(peer.deviceAddress)) {
        console.log(`Auto-connecting to: ${peer.deviceName} (attempt ${attempts + 1})`);
        MeshNetwork.connectToPeer(peer.deviceAddress);
        connectionAttempts.current.set(peer.deviceAddress, attempts + 1);
        
        // Set retry timer (retry after 5 seconds if connection fails)
        const existingTimer = connectionRetryTimers.current.get(peer.deviceAddress);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }
        
        const retryTimer = setTimeout(() => {
          // Check if still not connected and peer still available
          if (!connectedPeers.includes(peer.deviceAddress) && 
              peers.some(p => p.deviceAddress === peer.deviceAddress && p.status === 3)) {
            console.log(`Retrying connection to: ${peer.deviceName}`);
            attemptConnection(peer);
          }
        }, 5000); // Retry after 5 seconds
        
        connectionRetryTimers.current.set(peer.deviceAddress, retryTimer);
      }
    };

    const onPeersFoundListener = MeshNetworkEvents.addListener(
      'onPeersFound',
      (event: Peer[]) => {
        console.log('Peers found (raw):', event);
        
        // Parse device identifiers and add persistent IDs
        const parsedPeers = event.map((peer: Peer) => {
          const { displayName, persistentId } = parseDeviceIdentifier(peer.deviceName);
          
          return {
            ...peer,
            displayName,
            persistentId,
          };
        });
        
        console.log('Peers found (parsed):', parsedPeers);
        setPeers(parsedPeers);
        
        // Always auto-connect to available peers
        if (parsedPeers.length > 0) {
          parsedPeers.forEach((peer: Peer) => {
            if (peer.status === 3 && !connectedPeers.includes(peer.deviceAddress)) {
              console.log(`Found peer: ${peer.displayName} (ID: ${peer.persistentId || 'none'})`);
              attemptConnection(peer);
            }
          });
        }
      },
    );

    const onDiscoveryStateChangedListener = MeshNetworkEvents.addListener(
      'onDiscoveryStateChanged',
      (event: DiscoveryEvent | string) => {
        let eventStatus: string;
        let reasonCode: number | undefined;
        let message: string | undefined;

        if (typeof event === 'object' && event.status) {
          eventStatus = event.status;
          reasonCode = event.reasonCode;
          message = (event as any).message;
        } else {
          eventStatus = event as string;
        }

        console.log('Discovery state changed:', eventStatus, 'Reason:', reasonCode, 'Message:', message);

        if (eventStatus.includes('Started')) {
          setIsDiscovering(true);
        } else if (eventStatus.includes('Stopped') || eventStatus.includes('Failed')) {
          setIsDiscovering(false);
        }

        if (eventStatus.includes('Failed')) {
          const errorMsg = message || `Error code ${reasonCode || 'Unknown'}`;
          setStatus(`Discovery Failed: ${errorMsg} - Retrying...`);
          
          // Auto-retry on discovery failure
          console.log('Discovery failed - Auto-retrying in 3 seconds...');
          setTimeout(() => {
            console.log('Restarting discovery...');
            MeshNetwork.discoverPeers();
          }, 3000); // Retry after 3 seconds
          
        } else if (eventStatus.toLowerCase().includes('already')) {
          // Handle "Already discovering" error
          setStatus('Already discovering - Resetting...');
          console.log('Already discovering error - Resetting and restarting...');
          
          // Stop and restart
          setTimeout(() => {
            MeshNetwork.stopDiscovery();
            setTimeout(() => {
              console.log('Restarting discovery after reset...');
              MeshNetwork.discoverPeers();
            }, 1000);
          }, 1000);
          
        } else {
          setStatus(eventStatus);
        }
      },
    );

    const onConnectionChangedListener = MeshNetworkEvents.addListener(
      'onConnectionChanged',
      (event: ConnectionInfo | boolean) => {
        console.log('Connection changed:', event);
        if (typeof event === 'boolean') {
          setIsConnected(event);
          if (!event) {
            setConnectedPeers([]);
            setIsGroupOwner(false);
            setStatus('Disconnected');
          }
        } else {
          setIsConnected(true);
          setIsGroupOwner(event.isGroupOwner);
          setStatus(
            event.isGroupOwner
              ? `Connected as Group Owner (${event.groupOwnerAddress})`
              : `Connected to ${event.groupOwnerAddress}`,
          );
        }
      },
    );

    const onPeerConnectedListener = MeshNetworkEvents.addListener(
      'onPeerConnected',
      (address: string) => {
        console.log('Peer connected:', address);
        setConnectedPeers(prev => [...new Set([...prev, address])]);
        setStatus(`Peer connected: ${address}`);
        
        // Clear retry timer for this peer since connection succeeded
        const timer = connectionRetryTimers.current.get(address);
        if (timer) {
          clearTimeout(timer);
          connectionRetryTimers.current.delete(address);
        }
        // Reset connection attempts
        connectionAttempts.current.delete(address);
      },
    );

    const onPeerDisconnectedListener = MeshNetworkEvents.addListener(
      'onPeerDisconnected',
      (address: string) => {
        console.log('Peer disconnected:', address);
        setConnectedPeers(prev => prev.filter(p => p !== address));
        setStatus(`Peer disconnected: ${address}`);
      },
    );

    const onMessageReceivedListener = MeshNetworkEvents.addListener(
      'onMessageReceived',
      async (data: { message: string; fromAddress: string; timestamp: number }) => {
        console.log('Message received:', data);
        
        // Check if it's a friend request
        if (data.message.startsWith('FRIEND_REQUEST:')) {
          const parts = data.message.split(':');
          if (parts.length === 3) {
            const requestPersistentId = parts[1];
            const requestDisplayName = parts[2];
            
            // Check if already friends
            const isAlreadyFriend = await StorageService.isFriend(requestPersistentId);
            if (isAlreadyFriend) {
              console.log('Friend request from existing friend, ignoring');
              return;
            }
            
            // Add to friend requests as incoming
            const friendRequest = {
              persistentId: requestPersistentId,
              displayName: requestDisplayName,
              deviceAddress: data.fromAddress,
              timestamp: data.timestamp,
              type: 'incoming' as const,
            };
            
            await StorageService.addFriendRequest(friendRequest);
            setFriendRequests(prev => {
              const filtered = prev.filter(r => r.persistentId !== requestPersistentId);
              return [...filtered, friendRequest];
            });
            
            console.log('Friend request received from:', requestDisplayName);
          }
          return;
        }
        
        // Check if it's a friend request acceptance
        if (data.message.startsWith('FRIEND_ACCEPT:')) {
          console.log('=== FRIEND_ACCEPT MESSAGE RECEIVED ===');
          console.log('Raw message:', data.message);
          console.log('From address:', data.fromAddress);
          
          const parts = data.message.split(':');
          if (parts.length === 3) {
            const acceptPersistentId = parts[1];
            const acceptDisplayName = parts[2];
            
            console.log('Parsed - ID:', acceptPersistentId, 'Name:', acceptDisplayName);
            
            // Check if already friends
            const isAlreadyFriend = await StorageService.isFriend(acceptPersistentId);
            if (isAlreadyFriend) {
              console.log('Already friends with', acceptDisplayName, '- skipping');
              return;
            }
            
            // Add as friend
            await StorageService.addFriend({
              persistentId: acceptPersistentId,
              displayName: acceptDisplayName,
              deviceAddress: data.fromAddress,
            });
            console.log('✅ Added to storage:', acceptDisplayName);
            
            // Update local friends list
            setFriendsList(prev => {
              const newSet = new Set([...prev, acceptPersistentId]);
              console.log('✅ Updated friendsList state, size:', newSet.size);
              return newSet;
            });
            
            // Remove from outgoing friend requests
            await StorageService.removeFriendRequest(acceptPersistentId);
            setFriendRequests(prev => {
              const filtered = prev.filter(r => r.persistentId !== acceptPersistentId);
              console.log('✅ Removed from friend requests, remaining:', filtered.length);
              return filtered;
            });
            
            console.log('✅ Friend request accepted by:', acceptDisplayName);
          } else {
            console.log('❌ Invalid FRIEND_ACCEPT format:', data.message);
          }
          return;
        }
        
        // Check if it's a direct message (personal chat)
        if (data.message.startsWith('DIRECT_MSG:')) {
          // Don't show direct messages in the broadcast chat
          console.log('Chats - Ignoring direct message (shown in personal chat)');
          return;
        }
        
        // Regular broadcast message
        const newMessage: Message = {
          id: `${data.timestamp}-${data.fromAddress}`,
          text: data.message,
          fromAddress: data.fromAddress,
          timestamp: data.timestamp,
          isSent: false,
        };
        setMessages(prev => [...prev, newMessage]);
      },
    );

    const onMessageSentListener = MeshNetworkEvents.addListener(
      'onMessageSent',
      (data: { message: string; success: boolean }) => {
        console.log('Message sent:', data);
      },
    );
    const onConnectionErrorListener = MeshNetworkEvents.addListener(
      'onConnectionError',
      (error: any) => {
        // Handle specific error codes
        const reasonCode = error?.reasonCode || error;
        const deviceAddress = error?.deviceAddress;
        
        // Log all errors for debugging, but some are just informational
        console.log('Connection event:', { reasonCode, deviceAddress });
        
        let errorMessage = 'Connection Error';
        
        switch (reasonCode) {
          case 1:
            // Error code 1 is informational - "Already advertising/discovering"
            // This is normal after connection succeeds, not a real error
            console.log('Info: Already advertising/discovering (this is normal)');
            // Don't show error message or reset - this is harmless
            return; // Exit early, don't update status
            break;
          case 3:
            errorMessage = 'Peer no longer available';
            console.log(`Error code 3 (Endpoint Unknown) for ${deviceAddress} - Peer left the network`);
            // Stop retrying for this peer since it's gone
            const timer = connectionRetryTimers.current.get(deviceAddress);
            if (timer) {
              clearTimeout(timer);
              connectionRetryTimers.current.delete(deviceAddress);
              console.log(`Stopped retrying connection to ${deviceAddress}`);
            }
            connectionAttempts.current.delete(deviceAddress);
            break;
          case 13:
            errorMessage = 'Network I/O Error - Will retry automatically';
            console.log(`Error code 13 (IO Error) for ${deviceAddress} - Retry logic will handle this`);
            break;
          case 8001:
            errorMessage = 'Connection rejected';
            console.log(`Error code 8001 (Rejected) for ${deviceAddress}`);
            break;
          case 8002:
            errorMessage = 'Connection failed - Will retry';
            console.log(`Error code 8002 (Connection Failed) for ${deviceAddress} - Will retry`);
            // Let the automatic retry logic handle this
            break;
          default:


            console.log(`Unknown connection error: ${reasonCode} for ${deviceAddress}`);
            errorMessage = `Error code ${reasonCode}`;
        }
        
        setStatus(errorMessage);
        
        // Note: Retry logic will automatically handle this in the attemptConnection function
      },
    );

    return () => {
      onPeersFoundListener.remove();
      onDiscoveryStateChangedListener.remove();
      onConnectionChangedListener.remove();
      onPeerConnectedListener.remove();
      onPeerDisconnectedListener.remove();
      onMessageReceivedListener.remove();
      onMessageSentListener.remove();
      onConnectionErrorListener.remove();
      
      // Clear all retry timers
      connectionRetryTimers.current.forEach((timer) => {
        clearTimeout(timer);
      });
      connectionRetryTimers.current.clear();
      connectionAttempts.current.clear();
    };
  }, []);

  const handleDiscoverPeers = async () => {
    const hasPermission = await requestPermissions();
    if (hasPermission) {
      setPeers([]);
      MeshNetwork.discoverPeers();
    } else {
      setStatus('Permission denied. Cannot discover peers.');
    }
  };

  const handleStopDiscovery = () => {
    MeshNetwork.stopDiscovery();
    setIsDiscovering(false);
  };

  const handleResetDiscovery = () => {
    // Stop any ongoing discovery and reset local UI state
    try {
      MeshNetwork.stopDiscovery();
    } catch (e) {
      // no-op
    }
    setIsDiscovering(false);
    setPeers([]);
    setStatus('Reset. Ready to discover.');
  };

  const handleConnectToPeer = (deviceAddress: string) => {
    console.log('Connecting to peer:', deviceAddress);
    MeshNetwork.connectToPeer(deviceAddress);
    setSelectedPeer(deviceAddress);
  };

  const handleDisconnect = () => {
    MeshNetwork.disconnect();
    setMessages([]);
    setSelectedPeer(null);
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    
    const newMessage: Message = {
      id: `${Date.now()}-sent`,
      text: messageText,
      fromAddress: username, // Use username instead of 'You'
      timestamp: Date.now(),
      isSent: true,
    };
    
    setMessages(prev => [...prev, newMessage]);
    MeshNetwork.sendMessage(messageText, null); // null = broadcast to all
    setMessageText('');
    
    // Auto scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const getPeerStatusText = (statusCode: number): string => {
    switch (statusCode) {
      case 0: return 'Connected';
      case 1: return 'Invited';
      case 2: return 'Failed';
      case 3: return 'Available';
      case 4: return 'Unavailable';
      default: return 'Unknown';
    }
  };

  const handleAddFriend = async (peer: Peer) => {
    if (!peer.persistentId) {
      console.warn('Cannot add friend without persistent ID');
      return;
    }

    // Send friend request to the peer
    const friendRequestMessage = `FRIEND_REQUEST:${deviceId}:${username}`;
    MeshNetwork.sendMessage(friendRequestMessage, peer.deviceAddress);
    
    // Save as outgoing request so we can track it
    await StorageService.addFriendRequest({
      persistentId: peer.persistentId,
      displayName: peer.displayName || peer.deviceName,
      deviceAddress: peer.deviceAddress,
      timestamp: Date.now(),
      type: 'outgoing',
    });
    
    setFriendRequests(prev => {
      const filtered = prev.filter(r => r.persistentId !== peer.persistentId);
      return [...filtered, {
        persistentId: peer.persistentId!,
        displayName: peer.displayName || peer.deviceName,
        deviceAddress: peer.deviceAddress,
        timestamp: Date.now(),
        type: 'outgoing' as const,
      }];
    });
    
    // Auto-connect to peer
    handleConnectToPeer(peer.deviceAddress);
    
    console.log('Friend request sent to:', peer.displayName);
  };

  const handleAcceptFriendRequest = async (request: { persistentId: string; displayName: string; deviceAddress: string }) => {
    // Add to friends list
    await StorageService.addFriend({
      persistentId: request.persistentId,
      displayName: request.displayName,
      deviceAddress: request.deviceAddress,
    });

    // Update local friends list
    setFriendsList(prev => new Set([...prev, request.persistentId]));
    
    // Remove from friend requests
    await StorageService.removeFriendRequest(request.persistentId);
    setFriendRequests(prev => prev.filter(r => r.persistentId !== request.persistentId));
    
    // Send acceptance message back - BROADCAST to ensure delivery
    const acceptMessage = `FRIEND_ACCEPT:${deviceId}:${username}`;
    
    // Try to send directly first
    MeshNetwork.sendMessage(acceptMessage, request.deviceAddress);
    console.log('Sent FRIEND_ACCEPT to:', request.deviceAddress);
    
    // Also broadcast to ensure the message reaches the requester
    setTimeout(() => {
      MeshNetwork.sendMessage(acceptMessage, null);
      console.log('Broadcasted FRIEND_ACCEPT to all peers');
    }, 100);
    
    console.log('Friend request accepted:', request.displayName);
  };

  const handleRejectFriendRequest = async (request: { persistentId: string; displayName: string }) => {
    // Remove from friend requests
    await StorageService.removeFriendRequest(request.persistentId);
    setFriendRequests(prev => prev.filter(r => r.persistentId !== request.persistentId));
    
    console.log('Friend request rejected:', request.displayName);
  };

  const isFriend = (persistentId?: string): boolean => {
    if (!persistentId) return false;
    return friendsList.has(persistentId);
  };

  return {
    // State
    status,
    peers,
    connectedPeers,
    isDiscovering,
    isConnected,
    isGroupOwner,
    messages,
    messageText,
    selectedPeer,
    messagesEndRef,
    username,
    deviceId, // Persistent device ID for friends feature
    showPeerModal,
    friendsList,
    friendRequests,
    
    // State setters
    setMessageText,
    setShowPeerModal,
    
    // Handlers
    handleDiscoverPeers,
    handleStopDiscovery,
    handleResetDiscovery,
    handleConnectToPeer,
    handleDisconnect,
    handleSendMessage,
    handleAddFriend,
    handleAcceptFriendRequest,
    handleRejectFriendRequest,
    getPeerStatusText,
    isFriend,
  };
};
