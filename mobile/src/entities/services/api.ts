import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../api/client";
import { MASTER } from "../../api/endpoints";

export type MasterService = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number | null;
  category?: string | null;
  categorySlug?: string | null;
  description?: string | null;
  isActive: boolean;
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

export type CreateMasterServiceInput = {
  name: string;
  durationMinutes: number;
  priceCents?: number | null;
  categorySlug?: string | null;
  description?: string | null;
};

export function useCreateMasterServiceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMasterServiceInput) => {
      const { data } = await apiClient.post<MasterService>(
        MASTER.services,
        input,
      );
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

export function useUpdateMasterServiceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & CreateMasterServiceInput) => {
      const { data } = await apiClient.put<MasterService>(MASTER.service(id), input);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["services"] });
    },
  });
}
