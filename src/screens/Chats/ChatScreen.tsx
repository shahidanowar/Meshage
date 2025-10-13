import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Switch,
} from 'react-native';
import { useChatScreen } from './useChatScreen';
import { styles } from './ChatScreen.styles';

const ChatScreen = () => {
  const {
    status,
    peers,
    connectedPeers,
    isDiscovering,
    isConnected,
    isGroupOwner,
    messages,
    messageText,
    messagesEndRef,
    autoConnectEnabled,
    username,
    setMessageText,
    setAutoConnectEnabled,
    handleDiscoverPeers,
    handleStopDiscovery,
    handleResetDiscovery,
    handleConnectToPeer,
    handleDisconnect,
    handleSendMessage,
    getPeerStatusText,
  } = useChatScreen();

  const renderPeer = ({ item }: { item: any }) => (
    <View style={styles.peerItem}>
      <View style={styles.peerInfo}>
        <Text style={styles.peerName}>{item.deviceName}</Text>
        <Text style={styles.peerAddress}>{item.deviceAddress}</Text>
        <Text style={styles.peerStatus}>{getPeerStatusText(item.status)}</Text>
      </View>
      {!isConnected && item.status === 3 && (
        <TouchableOpacity
          style={styles.connectButton}
          onPress={() => handleConnectToPeer(item.deviceAddress)}>
          <Text style={styles.connectButtonText}>Connect</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderMessage = ({ item }: { item: any }) => (
    <View
      style={[
        styles.messageItem,
        item.isSent ? styles.sentMessage : styles.receivedMessage,
      ]}>
      <Text style={styles.messageSender}>
        {item.isSent ? 'You' : (item.fromAddress || 'Unknown')}
      </Text>
      <Text style={styles.messageText}>{item.text}</Text>
      <Text style={styles.messageTime}>
        {new Date(item.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.username}>👤 {username}</Text>
        <Text style={styles.status}>{status}</Text>
        
        {/* Auto-Connect Toggle */}
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Auto-Connect</Text>
          <Switch
            value={autoConnectEnabled}
            onValueChange={setAutoConnectEnabled}
            trackColor={{ false: '#767577', true: '#007aff' }}
            thumbColor={autoConnectEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
        
        {isConnected && (
          <View style={styles.connectionBadge}>
            <Text style={styles.badgeText}>
              {isGroupOwner ? '👑 Group Owner' : '🔗 Connected'}
            </Text>
            <Text style={styles.badgeSubtext}>
              {connectedPeers.length} peer(s) connected
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        
          <>
            <TouchableOpacity
              style={[styles.button, isDiscovering && styles.buttonDisabled]}
              onPress={handleDiscoverPeers}
              disabled={isDiscovering}>
              <Text style={styles.buttonText}>
                {isDiscovering ? 'Discovering...' : 'Discover Peers'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.stopButton,
                !isDiscovering && styles.buttonDisabled,
              ]}
              onPress={handleStopDiscovery}
              disabled={!isDiscovering}>
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={handleResetDiscovery}>
              <Text style={styles.buttonText}>Reset</Text>
            </TouchableOpacity>
          </>
        
          <TouchableOpacity
            style={[styles.button, styles.disconnectButton]}
            onPress={handleDisconnect}>
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        
      </View>

      {/* Discovering Indicator */}
      {isDiscovering && (
        <View style={styles.discoveringContainer}>
          <ActivityIndicator size="small" color="#007aff" />
          <Text style={styles.discoveringText}>Scanning for peers...</Text>
        </View>
      )}

      {/* Main Content */}
      {!isConnected ? (
        /* Peer List */
        <FlatList
          data={peers}
          renderItem={renderPeer}
          keyExtractor={item => item.deviceAddress}
          ListHeaderComponent={
            <Text style={styles.listHeader}>
              Discovered Peers ({peers.length})
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {!isDiscovering && (
                <Text style={styles.emptyText}>
                  No peers found. Tap "Discover Peers" to scan.
                </Text>
              )}
            </View>
          }
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        /* Chat Interface */
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={90}>
          {/* Messages List */}
          <ScrollView
            ref={messagesEndRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() =>
              messagesEndRef.current?.scrollToEnd({ animated: true })
            }>
            {messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No messages yet. Start chatting!
                </Text>
              </View>
            ) : (
              messages.map(message => (
                <View key={message.id}>
                  {renderMessage({ item: message })}
                </View>
              ))
            )}
          </ScrollView>

          {/* Message Input */}
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
              style={styles.sendButton}
              onPress={handleSendMessage}
              disabled={!messageText.trim()}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

export default ChatScreen;