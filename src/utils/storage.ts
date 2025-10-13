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
};

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
};
