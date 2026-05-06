import React from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persistOptions } from '../shared/persist/queryClient';

type Props = {
  children: React.ReactNode;
};

export default function AppProviders({ children }: Props) {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions as any}>
      {children}
    </PersistQueryClientProvider>
  );
}
