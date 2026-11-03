import { AuthService, GUEST_USER } from '../src/services/authService';
import { MemoryStorageAdapter } from '../src/services/storageAdapter';

describe('AuthService', () => {
  let authService: AuthService;
  let memoryAdapter: MemoryStorageAdapter;

  beforeEach(async () => {
    memoryAdapter = new MemoryStorageAdapter();
    authService = new AuthService(memoryAdapter);
  });

  it('defaults to guest user when no session is stored', async () => {
    const user = await authService.getCurrentUser();
    expect(user.provider).toBe('guest');
    expect(user.id).toBe(GUEST_USER.id);
  });

  it('validates email format before sign in', async () => {
    const res = await authService.signInWithEmail('invalid-email');
    expect(res.success).toBe(false);
    expect(res.error).toContain('hợp lệ');
  });

  it('signs in successfully with email and persists session', async () => {
    const res = await authService.signInWithEmail('duyng@example.com', 'password123');
    expect(res.success).toBe(true);
    expect(res.user?.email).toBe('duyng@example.com');
    expect(res.user?.provider).toBe('email');

    const current = await authService.getCurrentUser();
    expect(current.email).toBe('duyng@example.com');
  });

  it('signs in successfully with Google and sets provider badge', async () => {
    const res = await authService.signInWithGoogle('testuser@gmail.com');
    expect(res.success).toBe(true);
    expect(res.user?.provider).toBe('google');
    expect(res.user?.email).toBe('testuser@gmail.com');

    const current = await authService.getCurrentUser();
    expect(current.provider).toBe('google');
  });

  it('signs in successfully with Apple / iCloud', async () => {
    const res = await authService.signInWithApple('apple.id@icloud.com');
    expect(res.success).toBe(true);
    expect(res.user?.provider).toBe('apple');
    expect(res.user?.email).toBe('apple.id@icloud.com');

    const current = await authService.getCurrentUser();
    expect(current.provider).toBe('apple');
  });

  it('clears session and returns to guest on sign out', async () => {
    await authService.signInWithGoogle('test@gmail.com');
    await authService.signOut();

    const current = await authService.getCurrentUser();
    expect(current.provider).toBe('guest');
  });
});
