import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService, Friend } from '../../utils/storage';

const FriendsScreen = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadFriends = async () => {
    const loadedFriends = await StorageService.getFriends();
    setFriends(loadedFriends);
  };

  // Reload friends when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadFriends();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFriends();
    setRefreshing(false);
  };

  const handleRemoveFriend = (friend: Friend) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.displayName} from your friends list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await StorageService.removeFriend(friend.persistentId);
            await loadFriends();
          },
        },
      ]
    );
  };

  const renderFriend = ({ item }: { item: Friend }) => {
    const lastSeenText = item.lastSeen
      ? new Date(item.lastSeen).toLocaleDateString()
      : 'Never';

    return (
      <View style={styles.friendItem}>
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>⭐ {item.displayName}</Text>
          <Text style={styles.friendId}>ID: {item.persistentId}</Text>
          <Text style={styles.lastSeen}>Added: {lastSeenText}</Text>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFriend(item)}>
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <Text style={styles.subtitle}>
          {friends.length} {friends.length === 1 ? 'Friend' : 'Friends'}
        </Text>
      </View>

      {/* Friends List */}
      <FlatList
        data={friends}
        renderItem={renderFriend}
        keyExtractor={item => item.persistentId}
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No friends yet</Text>
            <Text style={styles.emptySubtext}>
              Go to the Chat tab and tap "Add Friend" on nearby devices to add them to your friends list.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  header: {
    padding: 20,
    backgroundColor: '#2c2c2e',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3c',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8e8e93',
  },
  listContainer: {
    padding: 20,
  },
  friendItem: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  friendId: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 4,
  },
  lastSeen: {
    fontSize: 12,
    color: '#8e8e93',
  },
  removeButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#8e8e93',
    fontSize: 16,
    lineHeight: 22,
  },
});

export default FriendsScreen;