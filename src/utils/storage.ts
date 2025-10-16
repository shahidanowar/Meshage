// Simple in-memory storage for username and device ID
// For production, replace with AsyncStorage for persistence across app restarts

class InMemoryStorage {
  private storage: Map<string, string> = new Map();

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }
}

const storage = new InMemoryStorage();

const STORAGE_KEYS = {
  USERNAME: '@meshage_username',
  DEVICE_ID: '@meshage_device_id',
  FRIENDS: '@meshage_friends',
  FRIEND_REQUESTS: '@meshage_friend_requests',
  ONBOARDING_COMPLETE: '@meshage_onboarding_complete',
};

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

// Generate a unique device ID (UUID v4)
const generateDeviceId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const StorageService = {
  // Save username
  saveUsername: async (username: string): Promise<void> => {
    try {
      await storage.setItem(STORAGE_KEYS.USERNAME, username);
      // Mark onboarding as complete when username is saved
      await storage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
    } catch (error) {
      console.error('Error saving username:', error);
    }
  },

  // Get username
  getUsername: async (): Promise<string | null> => {
    try {
      return await storage.getItem(STORAGE_KEYS.USERNAME);
    } catch (error) {
      console.error('Error getting username:', error);
      return null;
    }
  },

  // Clear username
  clearUsername: async (): Promise<void> => {
    try {
      await storage.removeItem(STORAGE_KEYS.USERNAME);
    } catch (error) {
      console.error('Error clearing username:', error);
    }
  },

  // Get or create device ID (persistent unique identifier)
  getDeviceId: async (): Promise<string> => {
    try {
      let deviceId = await storage.getItem(STORAGE_KEYS.DEVICE_ID);
      
      // Generate new ID if doesn't exist
      if (!deviceId) {
        deviceId = generateDeviceId();
        await storage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
        console.log('Generated new device ID:', deviceId);
      } else {
        console.log('Retrieved existing device ID:', deviceId);
      }
      
      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      // Fallback to generating a new one
      return generateDeviceId();
    }
  },

  // Get device ID without creating (returns null if doesn't exist)
  getExistingDeviceId: async (): Promise<string | null> => {
    try {
      return await storage.getItem(STORAGE_KEYS.DEVICE_ID);
    } catch (error) {
      console.error('Error getting existing device ID:', error);
      return null;
    }
  },

  // Friends management
  getFriends: async (): Promise<Friend[]> => {
    try {
      const friendsJson = await storage.getItem(STORAGE_KEYS.FRIENDS);
      if (!friendsJson) return [];
      return JSON.parse(friendsJson);
    } catch (error) {
      console.error('Error getting friends:', error);
      return [];
    }
  },

  addFriend: async (friend: Friend): Promise<void> => {
    try {
      const friends = await StorageService.getFriends();
      
      // Check if friend already exists (by persistentId)
      const existingIndex = friends.findIndex(f => f.persistentId === friend.persistentId);
      
      if (existingIndex >= 0) {
        // Update existing friend
        friends[existingIndex] = { ...friends[existingIndex], ...friend, lastSeen: Date.now() };
      } else {
        // Add new friend
        friends.push({ ...friend, lastSeen: Date.now() });
      }
      
      await storage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(friends));
      console.log('Friend added/updated:', friend.displayName);
    } catch (error) {
      console.error('Error adding friend:', error);
    }
  },

  removeFriend: async (persistentId: string): Promise<void> => {
    try {
      const friends = await StorageService.getFriends();
      const updatedFriends = friends.filter(f => f.persistentId !== persistentId);
      await storage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(updatedFriends));
      console.log('Friend removed:', persistentId);
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  },

  isFriend: async (persistentId: string): Promise<boolean> => {
    try {
      const friends = await StorageService.getFriends();
      return friends.some(f => f.persistentId === persistentId);
    } catch (error) {
      console.error('Error checking friend status:', error);
      return false;
    }
  },

  // Friend Requests management
  getFriendRequests: async (): Promise<FriendRequest[]> => {
    try {
      const requestsJson = await storage.getItem(STORAGE_KEYS.FRIEND_REQUESTS);
      if (!requestsJson) return [];
      return JSON.parse(requestsJson);
    } catch (error) {
      console.error('Error getting friend requests:', error);
      return [];
    }
  },

  addFriendRequest: async (request: FriendRequest): Promise<void> => {
    try {
      const requests = await StorageService.getFriendRequests();
      
      // Check if request already exists
      const existingIndex = requests.findIndex(r => r.persistentId === request.persistentId);
      
      if (existingIndex >= 0) {
        // Update existing request
        requests[existingIndex] = request;
      } else {
        // Add new request
        requests.push(request);
      }
      
      await storage.setItem(STORAGE_KEYS.FRIEND_REQUESTS, JSON.stringify(requests));
      console.log('Friend request added:', request.displayName);
    } catch (error) {
      console.error('Error adding friend request:', error);
    }
  },

  removeFriendRequest: async (persistentId: string): Promise<void> => {
    try {
      const requests = await StorageService.getFriendRequests();
      const updatedRequests = requests.filter(r => r.persistentId !== persistentId);
      await storage.setItem(STORAGE_KEYS.FRIEND_REQUESTS, JSON.stringify(updatedRequests));
      console.log('Friend request removed:', persistentId);
    } catch (error) {
      console.error('Error removing friend request:', error);
    }
  },

  // Onboarding status
  isOnboardingComplete: async (): Promise<boolean> => {
    try {
      const isComplete = await storage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
      const username = await storage.getItem(STORAGE_KEYS.USERNAME);
      // Check both flags to be safe
      return isComplete === 'true' && username !== null;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  },
};
