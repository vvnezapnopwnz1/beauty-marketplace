import React from 'react';
import { render } from '@testing-library/react-native';
import RootLayout from './app/_layout';

// Mock the useAuthStore hook
jest.mock('./src/stores/authStore', () => ({
  useAuthStore: () => ({
    tokenPair: null,
    setTokenPair: jest.fn(),
    setUser: jest.fn(),
  }),
}));

describe('Root Layout', () => {
  it('renders without crashing', () => {
    // Since the component uses hooks that require a React context,
    // we'll just check that it renders without throwing errors
    expect(() => render(<RootLayout />)).not.toThrow();
  });
});