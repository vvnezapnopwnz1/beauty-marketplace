import { useQuery } from "@tanstack/react-query";
import apiClient from "../../api/client";
import { MASTER } from "../../api/endpoints";

export type MasterService = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number | null;
  category?: string | null;
  categorySlug?: string | null;
  isActive?: boolean;
};

export function useMasterServicesQuery() {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data } = await apiClient.get<MasterService[]>(MASTER.services);
      return data;
    },
  });
}
