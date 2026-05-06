import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { Alert } from "react-native";

export function useGuardedMutation<TData, TError, TVariables, TContext>(
  opts: UseMutationOptions<TData, TError, TVariables, TContext>,
  isOnline: boolean
) {
  return useMutation({
    ...opts,
    mutationFn: isOnline
      ? opts.mutationFn
      : async () => {
          Alert.alert("Нет сети", "Операция недоступна офлайн");
          throw new Error("offline");
        },
  });
}
