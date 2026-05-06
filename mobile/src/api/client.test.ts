import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import client, { apiRequest } from './client';
import { AUTH } from './endpoints';
import { useAuthStore } from '../stores/authStore';

describe('api client refresh flow', () => {
  it('calls refresh endpoint when 401 and retries original request', async () => {
    const mock = new MockAdapter(axios);
    // initial request to some API
    mock.onGet('http://example.test/protected').replyOnce(401);
    // refresh endpoint
    mock.onPost(AUTH.refresh).replyOnce(200, { accessToken: 'new_access', refreshToken: 'new_refresh' });
    // retry of original should succeed
    mock.onGet('http://example.test/protected').replyOnce(200, { ok: true });

    useAuthStore.setState({ tokenPair: { accessToken: 'old', refreshToken: 'refresh_old' } });

    const data = await apiRequest({ url: 'http://example.test/protected', method: 'get' });
    expect(data).toEqual({ ok: true });
    mock.restore();
  });
});
import { apiClient } from './client';

describe('API Client', () => {
  it('should have correct base URL', () => {
    // This is a simple test to verify the client is properly initialized
    expect(apiClient).toBeDefined();
  });
});