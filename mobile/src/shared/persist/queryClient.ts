import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { shouldDehydrateQuery } from './rqAllowlist';

const buster = process.env.EXPO_PUBLIC_APP_VERSION ?? Constants.expoConfig?.version ?? '0';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 1000 * 60 * 60 * 24,
      retry(failureCount, error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401) return false;
        return failureCount < 2;
      },
      refetchOnReconnect: 'always',
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  throttleTime: 1000,
});

export const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 24,
  buster,
  dehydrateOptions: { shouldDehydrateQuery },
};

export { PersistQueryClientProvider };
