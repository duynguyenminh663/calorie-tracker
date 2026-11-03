import { AsyncStorageAdapter } from './storageAdapter';
import { AuthProvider, IStorageAdapter, UserProfile } from '../types';

const USER_SESSION_KEY = '@calorie_user_session';

export const GUEST_USER: UserProfile = {
  id: 'guest_user',
  name: 'Khách (Ngoại tuyến)',
  provider: 'guest',
};

export class AuthService {
  private adapter: IStorageAdapter;

  constructor(adapter: IStorageAdapter = AsyncStorageAdapter) {
    this.adapter = adapter;
  }

  async getCurrentUser(): Promise<UserProfile> {
    try {
      const stored = await this.adapter.getItem<UserProfile>(USER_SESSION_KEY);
      if (stored && stored.id) {
        return stored;
      }
    } catch (err) {
      console.warn('Failed to read user session, fallback to guest:', err);
    }
    return GUEST_USER;
  }

  async signInWithEmail(
    email: string,
    password?: string
  ): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      return { success: false, error: 'Vui lòng nhập địa chỉ email hợp lệ' };
    }

    const name = trimmed.split('@')[0];
    const user: UserProfile = {
      id: `usr_email_${Date.now()}`,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      email: trimmed,
      provider: 'email',
    };

    await this.adapter.setItem(USER_SESSION_KEY, user);
    return { success: true, user };
  }

  async signInWithGoogle(
    mockEmail?: string
  ): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      const email = mockEmail?.trim() || 'user@gmail.com';
      const name = email.split('@')[0];
      const user: UserProfile = {
        id: `usr_google_${Date.now()}`,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        email: email,
        provider: 'google',
        avatarUrl: 'https://lh3.googleusercontent.com/a/default-user',
      };

      await this.adapter.setItem(USER_SESSION_KEY, user);
      return { success: true, user };
    } catch (err: any) {
      return { success: false, error: `Đăng nhập Google thất bại: ${err?.message || 'Lỗi mạng'}` };
    }
  }

  async signInWithApple(
    mockAppleId?: string
  ): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      const appleId = mockAppleId?.trim() || 'apple.user@icloud.com';
      const name = appleId.split('@')[0];
      const user: UserProfile = {
        id: `usr_apple_${Date.now()}`,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        email: appleId,
        provider: 'apple',
      };

      await this.adapter.setItem(USER_SESSION_KEY, user);
      return { success: true, user };
    } catch (err: any) {
      return { success: false, error: `Đăng nhập Apple/iCloud thất bại: ${err?.message || 'Lỗi mạng'}` };
    }
  }

  async continueAsGuest(): Promise<UserProfile> {
    await this.adapter.setItem(USER_SESSION_KEY, GUEST_USER);
    return GUEST_USER;
  }

  async signOut(): Promise<void> {
    await this.adapter.setItem(USER_SESSION_KEY, GUEST_USER);
  }
}

export const defaultAuthService = new AuthService();
