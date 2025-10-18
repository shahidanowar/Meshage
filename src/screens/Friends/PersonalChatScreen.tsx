import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { usePersonalChat } from './usePersonalChat';
import { styles } from './PersonalChatScreen.styles';
import type { Message } from '../../types';

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

  const {
    messages,
    messageText,
    isConnected,
    messagesEndRef,
    setMessageText,
    handleSendMessage,
  } = usePersonalChat({ friendId, friendName, friendAddress });

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageItem,
        item.isSent ? styles.sentMessage : styles.receivedMessage,
      ]}>
      {/* <Text style={styles.messageSender}>
        {item.isSent ? 'You' : friendName}
      </Text> */}
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

export default PersonalChatScreen;
