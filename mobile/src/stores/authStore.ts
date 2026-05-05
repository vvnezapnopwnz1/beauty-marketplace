import { create } from 'zustand';

interface AuthState {
  tokenPair: { accessToken: string; refreshToken: string } | null;
  user: { id: string; phone: string; effectiveRoles: string[] } | null;
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
  setTokenPair: (tokenPair) => set({ tokenPair }),
  setUser: (user) => set({ user }),
  setSalonId: (salonId) => set({ salonId }),
  logout: () => set({ tokenPair: null, user: null, salonId: null }),
}));