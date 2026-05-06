import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useNotificationStream() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // RN EventSource support is inconsistent. Keep polling fallback always-on.
    const timer = setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: ["notificationsUnreadCount"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }, 30_000);

    return () => clearInterval(timer);
  }, [queryClient]);
}
