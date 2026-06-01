import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../api/client";
import { USER } from "../../api/endpoints";
import type { MeResponse } from "../../api/types";

export function useMeQuery() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get<MeResponse>(USER.me);
      return data;
    },
  });
}

export type UpdateMeInput = {
  displayName?: string | null;
  bio?: string | null;
  master?: {
    specializations: string[];
    yearsExperience?: number | null;
  } | null;
};

export function useUpdateMeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateMeInput) => {
      const { data } = await apiClient.put<MeResponse>(USER.me, payload);
      return data;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useUpdateAvatarMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fileUri: string) => {
      console.log("[Avatar Upload] Starting upload mutation for URI:", fileUri);
      const formData = new FormData();
      const filename = fileUri.split("/").pop() || "avatar.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      console.log("[Avatar Upload] Appending file to FormData:", {
        uri: fileUri,
        name: filename,
        type,
      });

      formData.append("avatar", {
        uri: fileUri,
        name: filename,
        type,
      } as any);

      console.log("[Avatar Upload] Sending POST to", USER.avatar);
      const { data } = await apiClient.post<{ avatarUrl: string }>(
        USER.avatar,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      console.log("[Avatar Upload] Upload success! Response data:", data);
      return data;
    },
    onSuccess: (data) => {
      console.log("[Avatar Upload] Mutation onSuccess trigger. Invalidating 'me' query.");
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: any) => {
      console.error("[Avatar Upload] Mutation error:", err?.response?.data || err);
    }
  });
}
