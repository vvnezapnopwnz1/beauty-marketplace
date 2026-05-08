import { useQuery } from "@tanstack/react-query";
import apiClient from "../../api/client";
import { MASTER } from "../../api/endpoints";

export type MasterAppointment = {
  id: string;
  /** Present for salon visits; personal visits omit this. */
  salonId?: string;
  startsAt: string;
  endsAt: string;
  status: string;
  serviceName: string;
  clientLabel: string;
  clientPhone?: string;
  clientNote?: string;
  totalPriceCents: number;
};

export type MasterAppointmentsResponse = {
  items: MasterAppointment[];
  total: number;
  page: number;
  pageSize: number;
};

type RecordsParams = {
  from: string;
  to: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export function useMasterAppointmentsQuery(params: RecordsParams) {
  const { from, to, status, page = 1, pageSize = 20 } = params;
  return useQuery({
    queryKey: ["appointments", { from, to, status, page, pageSize }],
    queryFn: async () => {
      const search = new URLSearchParams({
        from,
        to,
        page: String(page),
        page_size: String(pageSize),
      });
      if (status) {
        search.set("status", status);
      }
      const { data } = await apiClient.get<MasterAppointmentsResponse>(
        `${MASTER.appointments}?${search.toString()}`
      );
      return data;
    },
  });
}
