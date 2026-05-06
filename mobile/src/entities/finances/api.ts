import { useQuery } from "@tanstack/react-query";
import apiClient from "../../api/client";
import { MASTER } from "../../api/endpoints";

export type FinancesSummary = {
  incomeCents: number;
  expensesCents: number;
  profitCents: number;
  appointmentsCount?: number;
};

export function useFinancesSummaryQuery() {
  return useQuery({
    queryKey: ["financesSummary"],
    queryFn: async () => {
      const { data } = await apiClient.get<FinancesSummary>(MASTER.financesSummary);
      return data;
    },
  });
}
