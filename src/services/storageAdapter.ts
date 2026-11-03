import AsyncStorage from '@react-native-async-storage/async-storage';
import { IStorageAdapter } from '../types';

export { IStorageAdapter };

/**
 * Production storage adapter backed by React Native AsyncStorage.
 * Persists offline data to native sandbox storage surviving app restarts and PC shutdown.
 */
export const AsyncStorageAdapter: IStorageAdapter = {
  async getItem<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async setItem<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },

  async getAllKeys(): Promise<readonly string[]> {
    return AsyncStorage.getAllKeys();
  },

  async clear(): Promise<void> {
    await AsyncStorage.clear();
  },
};

/**
 * In-memory storage adapter for testing and isolated sandboxes.
 */
export class MemoryStorageAdapter implements IStorageAdapter {
  private store = new Map<string, string>();

  async getItem<T>(key: string): Promise<T | null> {
    const raw = this.store.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getAllKeys(): Promise<readonly string[]> {
    return Array.from(this.store.keys());
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
