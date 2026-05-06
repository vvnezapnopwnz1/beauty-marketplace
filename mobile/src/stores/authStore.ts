import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { TokenPair, User } from '../api/types';

interface AuthState {
  tokenPair: TokenPair | null;
  user: User | null;
  salonId: string | null;
}

interface AuthActions {
  setTokenPair: (tokenPair: AuthState['tokenPair']) => void;
  setUser: (user: AuthState['user']) => void;
  setSalonId: (salonId: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  tokenPair: null,
  user: null,
  salonId: null,
  setTokenPair: (tokenPair) => {
    if (tokenPair) {
      void SecureStore.setItemAsync('tokenPair', JSON.stringify(tokenPair));
    } else {
      void SecureStore.deleteItemAsync('tokenPair');
    }
    set({ tokenPair });
  },
  setUser: (user) => set({ user }),
  setSalonId: (salonId) => set({ salonId }),
  logout: () => {
    void SecureStore.deleteItemAsync('tokenPair');
    set({ tokenPair: null, user: null, salonId: null });
  },
}));