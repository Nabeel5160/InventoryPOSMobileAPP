import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { LoginResponse, UserRole } from '@iq/shared';
import { getApiClient } from '../api';
import { signInWithFirebaseEmail, isFirebaseConfigured } from '../firebase';

const TOKEN_KEY = 'iq_access_token';
const USER_KEY = 'iq_user';

type AuthUser = LoginResponse['user'];

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  hydrated: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  canCompleteSales: () => boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  loading: false,
  hydrated: false,
  error: null,

  async hydrate() {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      if (token && userJson) {
        set({ token, user: JSON.parse(userJson) as AuthUser, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },

  async login(email, password) {
    set({ loading: true, error: null });
    try {
      // Prefer Firebase when configured; Nest/mock still used for session APIs
      if (isFirebaseConfigured()) {
        try {
          await signInWithFirebaseEmail(email, password);
        } catch {
          // Fall through to API login for local demo users
        }
      }
      const result = await getApiClient().login(email, password);
      await SecureStore.setItemAsync(TOKEN_KEY, result.accessToken);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(result.user));
      set({ token: result.accessToken, user: result.user, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Login failed',
      });
      throw err;
    }
  },

  async logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    set({ token: null, user: null });
  },

  canCompleteSales() {
    const role = get().user?.role as UserRole | undefined;
    return role === 'Admin' || role === 'Manager' || role === 'Sales';
  },
}));
