// Core interfaces for Meshage P2P app

export interface Peer {
  deviceName: string;
  deviceAddress: string;
  status: number;
  persistentId?: string; // Persistent ID extracted from deviceName
  displayName?: string; // Username extracted from deviceName
}

export interface Message {
  id: string;
  text: string;
  fromAddress: string;
  senderName: string;
  timestamp: number;
  isSent: boolean;
}

export interface Friend {
  persistentId: string;
  displayName: string;
  deviceAddress?: string;
  lastSeen?: number;
}

export interface FriendRequest {
  persistentId: string;
  displayName: string;
  deviceAddress: string;
  timestamp: number;
  type?: 'incoming' | 'outgoing'; // Track if we sent or received the request
}

export interface DiscoveryEvent {
  status: string;
  reasonCode?: number;
}

export interface ConnectionInfo {
  isGroupOwner: boolean;
  groupOwnerAddress: string;
}

// Event data types from native module
export interface MessageReceivedEvent {
  message: string;
  fromAddress: string;
  senderName: string;
  timestamp: number;
}

export interface MessageSentEvent {
  message: string;
  success: boolean;
}

export interface PeerConnectedEvent {
  address: string;
}

export interface PeerDisconnectedEvent {
  address: string;
}


