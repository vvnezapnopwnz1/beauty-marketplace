import { useQuery } from "@tanstack/react-query";
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
