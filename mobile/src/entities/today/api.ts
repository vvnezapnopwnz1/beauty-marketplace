import { useQuery } from "@tanstack/react-query";
import apiClient from "../../api/client";
import { MASTER } from "../../api/endpoints";

export type TodaySummary = {
  date: string;
  appointmentsCount: number;
  revenueCents: number;
  attendanceRatePct: number;
  nextAppointment?: {
    id: string;
    startsAt: string;
    clientName: string;
    serviceName: string;
    minutesUntil: number;
  };
  schedulePreview: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    clientName: string;
    serviceName: string;
    status: string;
  }>;
  weeklyAttendance: Array<number | null>;
};

export function useTodayQuery(date: string) {
  return useQuery({
    queryKey: ["today", { date }],
    queryFn: async () => {
      const { data } = await apiClient.get<TodaySummary>(
        `${MASTER.today}?date=${encodeURIComponent(date)}`
      );
      return data;
    },
  });
}
