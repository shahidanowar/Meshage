import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Platform,
  StatusBar,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
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
    username,
    showPeerModal,
    setMessageText,
    setShowPeerModal,
    handleDiscoverPeers,
    handleStopDiscovery,
    handleResetDiscovery,
    handleConnectToPeer,
    handleDisconnect,
    handleSendMessage,
    getPeerStatusText,
  } = useChatScreen();

  const renderPeer = ({ item }: { item: any }) => {
    const isConnectedPeer = connectedPeers.includes(item.deviceAddress);
    
    return (
      <View style={styles.peerItem}>
        <View style={styles.peerInfo}>
          <Text style={styles.peerName}>{item.deviceName}</Text>
          <Text style={styles.peerAddress}>{item.deviceAddress}</Text>
          <Text style={[
            styles.peerStatus,
            isConnectedPeer && { color: '#34c759' }
          ]}>
            {isConnectedPeer ? '✓ Connected' : getPeerStatusText(item.status)}
          </Text>
        </View>
        {!isConnectedPeer && item.status === 3 && (
          <TouchableOpacity
            style={styles.connectButton}
            onPress={() => {
              handleConnectToPeer(item.deviceAddress);
              setShowPeerModal(false);
            }}>
            <Text style={styles.connectButtonText}>Connect</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

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
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.username}>{username}</Text>
          
          {/* Peer List Button */}
          <TouchableOpacity
            style={styles.peerListButton}
            onPress={() => setShowPeerModal(true)}>
            <Text style={styles.peerListButtonText}>
              👥 {peers.length}
            </Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.status}>status: {status}</Text>
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

      {/* Chat Interface - Always Visible */}
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
                {connectedPeers.length > 0 
                  ? 'No messages yet. Start chatting!'
                  : 'Waiting for peers to connect...\nYou can start typing below!'}
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

        {/* Message Input - Always Visible */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder={"Type a message..."}
            placeholderTextColor="#8e8e93"
            value={messageText}
            onChangeText={setMessageText}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
            editable={true}
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

      {/* Peer List Modal */}
      <Modal
        visible={showPeerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPeerModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nearby Devices</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPeerModal(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Peer List */}
            <FlatList
              data={peers}
              renderItem={renderPeer}
              keyExtractor={item => item.deviceAddress}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {isDiscovering 
                      ? 'Scanning for nearby devices...' 
                      : 'No peers found. Discovery is running in background.'}
                  </Text>
                </View>
              }
              contentContainerStyle={styles.modalListContainer}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ChatScreen;