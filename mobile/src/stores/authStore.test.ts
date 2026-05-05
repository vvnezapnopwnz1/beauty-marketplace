import { useAuthStore } from './authStore';

describe('Auth Store', () => {
  it('initializes correctly', () => {
    const { tokenPair, user, salonId } = useAuthStore.getState();
    expect(tokenPair).toBeNull();
    expect(user).toBeNull();
    expect(salonId).toBeNull();
  });

  it('sets token pair', () => {
    const tokenPair = { accessToken: 'access', refreshToken: 'refresh' };
    useAuthStore.getState().setTokenPair(tokenPair);
    expect(useAuthStore.getState().tokenPair).toEqual(tokenPair);
  });

  it('sets user', () => {
    const user = { id: '1', phone: '+1234567890', effectiveRoles: ['master'] };
    useAuthStore.getState().setUser(user);
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('sets salonId', () => {
    const salonId = 'salon-1';
    useAuthStore.getState().setSalonId(salonId);
    expect(useAuthStore.getState().salonId).toBe(salonId);
  });

  it('logs out', () => {
    // Set some values first
    const tokenPair = { accessToken: 'access', refreshToken: 'refresh' };
    const user = { id: '1', phone: '+1234567890', effectiveRoles: ['master'] };
    const salonId = 'salon-1';
    
    useAuthStore.getState().setTokenPair(tokenPair);
    useAuthStore.getState().setUser(user);
    useAuthStore.getState().setSalonId(salonId);
    
    // Logout
    useAuthStore.getState().logout();
    
    expect(useAuthStore.getState().tokenPair).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().salonId).toBeNull();
  });
});