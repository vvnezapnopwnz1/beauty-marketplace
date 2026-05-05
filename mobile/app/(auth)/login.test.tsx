import React from 'react';
import { render } from '@testing-library/react-native';
import LoginScreen from '../app/(auth)/login';

describe('Login Screen', () => {
  it('renders correctly', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Welcome')).toBeTruthy();
    expect(getByText('Sign in to your account')).toBeTruthy();
  });
});