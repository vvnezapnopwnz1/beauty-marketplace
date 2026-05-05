import React from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../src/api/client';

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const { tokenPair, setTokenPair, setUser } = useAuthStore();

  useEffect(() => {
    // Check for existing session on app start
    const checkExistingSession = async () => {
      try {
        const tokenPairStr = await SecureStore.getItemAsync('tokenPair');
        if (tokenPairStr) {
          const storedTokenPair = JSON.parse(tokenPairStr);
          setTokenPair(storedTokenPair);
          
          // Fetch user data
          // const response = await apiClient.get<User>('/users/me');
          // setUser(response.data);
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  if (isLoading) {
    // Show splash screen or loading indicator
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      {!tokenPair ? (
        // Unauthenticated user - show auth flow
        <Stack.Screen name="(auth)" />
      ) : (
        // Authenticated user - show main app
        <Stack.Screen name="(tabs)" />
      )}
    </Stack>
  );
}