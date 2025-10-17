import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
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
