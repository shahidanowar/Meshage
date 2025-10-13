// Simple in-memory storage for username
// For production, replace with AsyncStorage

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
};
