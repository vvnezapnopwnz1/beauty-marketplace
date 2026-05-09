import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../api/client";
import { MASTER } from "../../api/endpoints";

export type FinancesSummary = {
  incomeCents: number;
  expensesCents: number;
  profitCents: number;
  appointmentsCount?: number;
};

export type FinanceTrendPoint = {
  date: string;
  incomeCents: number;
  expenseCents: number;
};

export type TopService = {
  serviceName: string;
  incomeCents: number;
};

export type ExpenseCategory = {
  id: string;
  name: string;
  emoji: string;
  sortOrder: number;
};

export type Expense = {
  id: string;
  categoryId?: string | null;
  categoryName?: string | null;
  amountCents: number;
  description: string;
  expenseDate: string;
  createdAt: string;
};

export type ExpenseListResponse = {
  items: Expense[];
  total: number;
};

type DateRangeParams = { source?: string; from?: string; to?: string };

function buildQuery(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function useFinancesSummaryQuery(params: DateRangeParams = {}) {
  return useQuery({
    queryKey: ["financesSummary", params],
    queryFn: async () => {
      const { data } = await apiClient.get<FinancesSummary>(
        `${MASTER.financesSummary}${buildQuery(params)}`
      );
      return data;
    },
  });
}

export function useFinanceTrendQuery(params: DateRangeParams = {}) {
  return useQuery({
    queryKey: ["financeTrend", params],
    queryFn: async () => {
      const { data } = await apiClient.get<FinanceTrendPoint[]>(
        `${MASTER.financesTrend}${buildQuery(params)}`
      );
      return data ?? [];
    },
  });
}

export function useTopServicesQuery(params: DateRangeParams = {}) {
  return useQuery({
    queryKey: ["financeTopServices", params],
    queryFn: async () => {
      const { data } = await apiClient.get<TopService[]>(
        `${MASTER.financesTopServices}${buildQuery(params)}`
      );
      return data ?? [];
    },
  });
}

export function useExpenseCategoriesQuery() {
  return useQuery({
    queryKey: ["expenseCategories"],
    queryFn: async () => {
      const { data } = await apiClient.get<ExpenseCategory[]>(
        MASTER.financesExpenseCategories
      );
      return data ?? [];
    },
  });
}

export function useCreateExpenseCategoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; emoji?: string }) => {
      const { data } = await apiClient.post<ExpenseCategory>(
        MASTER.financesExpenseCategories,
        input
      );
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expenseCategories"] });
    },
  });
}

export function useDeleteExpenseCategoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`${MASTER.financesExpenseCategories}/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expenseCategories"] });
    },
  });
}

export function useExpensesQuery(params: {
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  return useQuery({
    queryKey: ["expenses", params],
    queryFn: async () => {
      const { data } = await apiClient.get<ExpenseListResponse>(
        `${MASTER.financesExpenses}${buildQuery({
          from: params.from,
          to: params.to,
          page: params.page,
          page_size: params.pageSize,
        })}`
      );
      return data;
    },
  });
}

export function useCreateExpenseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      categoryId?: string | null;
      amountCents: number;
      description?: string | null;
      expenseDate: string;
    }) => {
      const { data } = await apiClient.post<Expense>(
        MASTER.financesExpenses,
        input
      );
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expenses"] });
      void qc.invalidateQueries({ queryKey: ["financesSummary"] });
    },
  });
}

export function useDeleteExpenseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`${MASTER.financesExpenses}/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["expenses"] });
      void qc.invalidateQueries({ queryKey: ["financesSummary"] });
    },
  });
}
