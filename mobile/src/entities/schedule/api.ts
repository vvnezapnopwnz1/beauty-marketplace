import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../api/client";
import { MASTER } from "../../api/endpoints";

export type WorkingHour = {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
};

export function useMasterScheduleQuery() {
  return useQuery({
    queryKey: ["masterSchedule"],
    queryFn: async () => {
      const { data } = await apiClient.get<WorkingHour[]>(MASTER.schedule);
      return data;
    },
  });
}

export function useUpdateMasterScheduleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (hours: WorkingHour[]) => {
      const { data } = await apiClient.put<WorkingHour[]>(MASTER.schedule, { hours });
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["masterSchedule"] });
    },
  });
}
