import { useQuery } from "@tanstack/react-query";
import apiClient from "../../api/client";
import { MASTER } from "../../api/endpoints";

export type MasterClient = {
  id: string;
  displayName: string;
  phone?: string | null;
  visitCount?: number;
  visitsCount?: number;
  lastVisitAt?: string | null;
};

export type ClientSegment = "all" | "new" | "regular" | "vip";

export function deriveClientSegment(client: MasterClient): ClientSegment {
  const visits = client.visitCount ?? client.visitsCount ?? 0;
  if (visits >= 10) return "vip";
  if (visits >= 3) return "regular";
  return "new";
}

export function useMasterClientsQuery(search?: string) {
  return useQuery({
    queryKey: ["clients", { search: search?.trim() ?? "" }],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (search?.trim()) {
        query.set("search", search.trim());
      }
      const suffix = query.toString();
      const { data } = await apiClient.get<MasterClient[]>(
        suffix ? `${MASTER.clients}?${suffix}` : MASTER.clients
      );
      return data;
    },
  });
}
