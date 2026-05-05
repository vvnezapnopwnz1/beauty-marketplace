import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';

export default function Index() {
  const { tokenPair } = useAuthStore();
  
  if (!tokenPair) {
    return <Redirect href="/(auth)/login" />;
  }
  
  return <Redirect href="/(tabs)" />;
}