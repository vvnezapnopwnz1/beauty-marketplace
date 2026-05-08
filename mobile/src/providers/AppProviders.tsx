import React from "react";
import * as Sentry from "@sentry/react-native";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, persistOptions } from "../shared/persist/queryClient";
import { initSentry } from "../shared/telemetry/sentry";
import { ThemeProvider } from "../shared/theme/ThemeProvider";
import "../shared/i18n/i18n";

type Props = {
  children: React.ReactNode;
};

initSentry();

export default function AppProviders({ children }: Props) {
  return (
    <Sentry.ErrorBoundary>
      <ThemeProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={persistOptions as any}
        >
          {children}
        </PersistQueryClientProvider>
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  );
}
