import { useQueryClient } from "@tanstack/react-query";
import apiClient from "../../api/client";
import { MASTER } from "../../api/endpoints";
import type { MasterAppointmentsResponse } from "../../entities/appointments/api";
import { useNetworkStatus } from "../../shared/net/useNetworkStatus";
import { useGuardedMutation } from "../../shared/query/useGuardedMutation";

type ReschedulePayload = {
  id: string;
  startsAt: string;
  endsAt?: string;
};

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();

  return useGuardedMutation({
    mutationFn: async ({ id, startsAt, endsAt }: ReschedulePayload) => {
      await apiClient.put(MASTER.appointment(id), {
        startsAt,
        ...(endsAt ? { endsAt } : {}),
      });
    },
    onMutate: async ({ id, startsAt, endsAt }) => {
      await queryClient.cancelQueries({ queryKey: ["appointments"] });
      const previous = queryClient.getQueriesData<MasterAppointmentsResponse>({
        queryKey: ["appointments"],
      });

      for (const [key, value] of previous) {
        if (!value?.items?.length) {
          continue;
        }
        const patched: MasterAppointmentsResponse = {
          ...value,
          items: value.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  startsAt,
                  endsAt: endsAt ?? item.endsAt,
                }
              : item
          ),
        };
        queryClient.setQueryData(key, patched);
      }

      return { previous };
    },
    onError: (_error, _vars, context) => {
      context?.previous?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  }, isOnline);
}
