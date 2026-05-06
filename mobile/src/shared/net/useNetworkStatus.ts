import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export function useNetworkStatus(): {
  isOnline: boolean;
  lastOnlineAt: Date | null;
} {
  const [isOnline, setOnline] = useState(true);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(new Date());

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      const connected = state.isConnected === true;
      const reachable = state.isInternetReachable;
      const online = connected && (reachable === true || reachable === null);

      setOnline(online);
      if (online) {
        setLastOnlineAt(new Date());
      }
    });
  }, []);

  return { isOnline, lastOnlineAt };
}
