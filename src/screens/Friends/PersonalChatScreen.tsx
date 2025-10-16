import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeModules, NativeEventEmitter } from 'react-native';
import { StorageService } from '../../utils/storage';

const { MeshNetwork } = NativeModules;
const MeshNetworkEvents = new NativeEventEmitter(MeshNetwork);

interface Message {
  id: string;
  text: string;
  fromAddress: string;
  timestamp: number;
  isSent: boolean;
}

type RouteParams = {
  PersonalChat: {
    friendId: string;
    friendName: string;
    friendAddress?: string;
  };
};

const PersonalChatScreen = () => {
  const route = useRoute<RouteProp<RouteParams, 'PersonalChat'>>();
  const navigation = useNavigation();
  const { friendId, friendName, friendAddress } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [myDeviceId, setMyDeviceId] = useState<string>('');
  const messagesEndRef = useRef<any>(null);

  useEffect(() => {
    // Load my device ID
    const loadDeviceId = async () => {
      const deviceId = await StorageService.getDeviceId();
      setMyDeviceId(deviceId);
    };
    loadDeviceId();
  }, []);

  useEffect(() => {
    // Check if friend is currently connected
    const checkConnection = () => {
      // Friend is connected if their address is in the connected peers list
      if (friendAddress && connectedPeers.includes(friendAddress)) {
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    };
    checkConnection();
  }, [connectedPeers, friendAddress]);

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
              myDeviceId,
              friendId,
              messageContent: messageContent.substring(0, 20)
            });
            
            // Show message if it's meant for ME and from MY FRIEND
            // The sender puts MY device ID as the target
            if (targetPersistentId === myDeviceId) {
              // This message is for me, add it to the chat
              const newMessage: Message = {
                id: `${data.timestamp}-${data.fromAddress}`,
                text: messageContent,
                fromAddress: data.fromAddress,
                timestamp: data.timestamp,
                isSent: false,
              };
              setMessages(prev => [...prev, newMessage]);
              console.log('✅ PersonalChat - Received message meant for me:', messageContent);
            } else {
              console.log('❌ PersonalChat - Message not meant for me (target:', targetPersistentId, 'me:', myDeviceId, ')');
            }
          }
          return;
        }
        
        // Skip system messages
        if (data.message.startsWith('FRIEND_REQUEST:') || data.message.startsWith('FRIEND_ACCEPT:')) {
          return;
        }
        
        // Skip broadcast messages (messages without DIRECT_MSG prefix)
        // These are shown in the Chats screen, not in personal chats
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
  }, [friendId]);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    const newMessage: Message = {
      id: `${Date.now()}-sent`,
      text: messageText,
      fromAddress: 'You',
      timestamp: Date.now(),
      isSent: true,
    };

    setMessages(prev => [...prev, newMessage]);

    // Add DIRECT_MSG prefix to indicate this is a private message
    const directMessage = `DIRECT_MSG:${friendId}:${messageText}`;
    
    // Always broadcast direct messages to ensure delivery
    // The receiver will filter and only show messages meant for them
    MeshNetwork.sendMessage(directMessage, null);
    console.log('PersonalChat - Broadcasting direct message to friend:', friendId);

    setMessageText('');

    setTimeout(() => {
      messagesEndRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageItem,
        item.isSent ? styles.sentMessage : styles.receivedMessage,
      ]}>
      <Text style={styles.messageSender}>
        {item.isSent ? 'You' : friendName}
      </Text>
      <Text style={styles.messageText}>{item.text}</Text>
      <Text style={styles.messageTime}>
        {new Date(item.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.friendName}>{friendName}</Text>
          <Text style={styles.connectionStatus}>
            {isConnected ? '🟢 Online' : '⚪ Offline'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <FlatList
          ref={messagesEndRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No messages yet. Start chatting with {friendName}!
              </Text>
            </View>
          }
          onContentSizeChange={() =>
            messagesEndRef.current?.scrollToEnd({ animated: true })
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            placeholderTextColor="#8e8e93"
            value={messageText}
            onChangeText={setMessageText}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !messageText.trim() && styles.buttonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!messageText.trim()}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2c2c2e',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3c',
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: '#007aff',
  },
  headerInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  connectionStatus: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 2,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
  },
  messageItem: {
    maxWidth: '80%',
    marginBottom: 15,
    padding: 12,
    borderRadius: 12,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007aff',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#2c2c2e',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a9a9a9',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    color: '#a9a9a9',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    marginTop: 40,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8e8e93',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#2c2c2e',
    borderTopWidth: 1,
    borderTopColor: '#3a3a3c',
    alignItems: 'center',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#007aff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  buttonDisabled: {
    backgroundColor: '#007aff80',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PersonalChatScreen;
