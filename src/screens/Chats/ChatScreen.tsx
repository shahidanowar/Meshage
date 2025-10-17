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
    messages,
    messageText,
    messagesEndRef,
    username,
    showPeerModal,
    friendRequests,
    setMessageText,
    setShowPeerModal,
    handleConnectToPeer,
    handleSendMessage,
    handleAddFriend,
    handleAcceptFriendRequest,
    handleRejectFriendRequest,
    getPeerStatusText,
    isFriend,
  } = useChatScreen();

  const [showFriendRequestsModal, setShowFriendRequestsModal] = React.useState(false);

  const renderPeer = ({ item }: { item: any }) => {
    const isConnectedPeer = connectedPeers.includes(item.deviceAddress);
    const isAlreadyFriend = isFriend(item.persistentId);
    
    // Check if there's a pending request
    const pendingRequest = friendRequests.find(r => r.persistentId === item.persistentId);
    const hasOutgoingRequest = pendingRequest?.type === 'outgoing';
    const hasIncomingRequest = pendingRequest?.type === 'incoming';
    
    return (
      <View style={styles.peerItem}>
        <View style={styles.peerInfo}>
          <Text style={styles.peerName}>
            {item.displayName || item.deviceName}
            {isAlreadyFriend && ' ⭐'}
          </Text>
          <Text style={styles.peerAddress}>{item.deviceAddress}</Text>
          <Text style={[
            styles.peerStatus,
            isConnectedPeer && { color: '#34c759' }
          ]}>
            {isConnectedPeer ? '✓ Connected' : getPeerStatusText(item.status)}
          </Text>
        </View>
        {!isAlreadyFriend && !hasOutgoingRequest && !hasIncomingRequest && item.persistentId && isConnectedPeer ? (
          <TouchableOpacity
            style={styles.addFriendButton}
            onPress={() => {
              handleAddFriend(item);
              setShowPeerModal(false);
            }}>
            <Text style={styles.addFriendButtonText}>Add Friend</Text>
          </TouchableOpacity>
        ) : hasOutgoingRequest ? (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>Request Sent</Text>
          </View>
        ) : hasIncomingRequest ? (
          <View style={styles.incomingBadge}>
            <Text style={styles.incomingBadgeText}>Respond in 🤝</Text>
          </View>
        ) : isAlreadyFriend ? (
          <View style={styles.friendBadge}>
            <Text style={styles.friendBadgeText}>Friend</Text>
          </View>
        ) : null}
      </View>
    );
  };

  const renderMessage = ({ item }: { item: any }) => {
    return (
      <View
        style={[
          styles.messageItem,
          item.isSent ? styles.sentMessage : styles.receivedMessage,
        ]}>
        <Text style={styles.messageSender}>
          {item.isSent? 'You' : (item.senderName || item.fromAddress || 'Unknown')}
        </Text>
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.messageTime}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.username}>{username}</Text>
          
          <View style={styles.headerButtons}>
            {/* Friend Requests Button - Only show incoming requests count */}
            {friendRequests.filter(r => r.type === 'incoming').length > 0 && (
              <TouchableOpacity
                style={styles.friendRequestButton}
                onPress={() => setShowFriendRequestsModal(true)}>
                <Text style={styles.friendRequestButtonText}>
                  🤝 {friendRequests.filter(r => r.type === 'incoming').length}
                </Text>
              </TouchableOpacity>
            )}
            
            {/* Peer List Button */}
            <TouchableOpacity
              style={styles.peerListButton}
              onPress={() => setShowPeerModal(true)}>
              <Text style={styles.peerListButtonText}>
                👥 {peers.length}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.status}>status: {status}</Text>
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
                    No peers found nearby. Auto-discovery is running...
                  </Text>
                </View>
              }
              contentContainerStyle={styles.modalListContainer}
            />
          </View>
        </View>
      </Modal>

      {/* Friend Requests Modal */}
      <Modal
        visible={showFriendRequestsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFriendRequestsModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Friend Requests</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowFriendRequestsModal(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Friend Requests List - Only show incoming requests */}
            <FlatList
              data={friendRequests.filter(r => r.type === 'incoming')}
              renderItem={({ item }) => (
                <View style={styles.friendRequestItem}>
                  <View style={styles.peerInfo}>
                    <Text style={styles.peerName}>{item.displayName}</Text>
                    <Text style={styles.peerAddress}>ID: {item.persistentId}</Text>
                    <Text style={styles.peerStatus}>
                      {new Date(item.timestamp).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.friendRequestButtons}>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => {
                        handleAcceptFriendRequest(item);
                        setShowFriendRequestsModal(false);
                      }}>
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => {
                        handleRejectFriendRequest(item);
                      }}>
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              keyExtractor={item => item.persistentId}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No friend requests
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