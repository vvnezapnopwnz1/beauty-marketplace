import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

type MasterClientsResponse = {
  items: MasterClient[];
  total: number;
  page: number;
  pageSize: number;
};

export function useMasterClientsQuery(search?: string) {
  return useQuery({
    queryKey: ["clients", { search: search?.trim() ?? "" }],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (search?.trim()) {
        query.set("search", search.trim());
      }
      const suffix = query.toString();
      const { data } = await apiClient.get<MasterClientsResponse>(
        suffix ? `${MASTER.clients}?${suffix}` : MASTER.clients
      );
      return data.items ?? [];
    },
  });
}

export type CreateMasterClientInput = {
  displayName: string;
  phone?: string | null;
  notes?: string | null;
};

export function useCreateMasterClientMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMasterClientInput) => {
      const { data } = await apiClient.post<MasterClient>(MASTER.clients, input);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
