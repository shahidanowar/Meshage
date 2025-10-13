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
      // Load username from storage
      const savedUsername = await StorageService.getUsername();
      if (savedUsername) {
        setUsername(savedUsername);
        // Update device name with username
        MeshNetwork.setDeviceName(savedUsername);
      }
      
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
        console.log('Peers found:', event);
        setPeers(event);
        
        // Always auto-connect to available peers
        if (event.length > 0) {
          event.forEach((peer: Peer) => {
            if (peer.status === 3 && !connectedPeers.includes(peer.deviceAddress)) {
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
          setStatus(`Discovery Failed: ${errorMsg}`);
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
      (data: { message: string; fromAddress: string; timestamp: number }) => {
        console.log('Message received:', data);
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
        console.error('Connection error:', error);
        setStatus(`Connection Error: ${JSON.stringify(error)}`);
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
    showPeerModal,
    
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
    getPeerStatusText,
  };
};
