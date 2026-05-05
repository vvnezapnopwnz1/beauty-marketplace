import { rtkApi } from '@shared/api/rtkApi'

import type { FinanceSource, } from './types'

export interface FinanceSummaryDTO {
  incomeCents: number
  expenseCents: number
  profitCents: number
}

export interface FinanceTrendPointDTO {
  date: string
  incomeCents: number
  expenseCents: number
}

export interface FinanceTopServiceDTO {
  serviceName: string
  incomeCents: number
}

export interface MasterExpenseCategoryDTO {
  id: string
  name: string
  emoji: string
  sortOrder: number
  createdAt: string
}

export interface MasterExpenseDTO {
  id: string
  categoryId?: string | null
  categoryName?: string | null
  appointmentId?: string | null
  amountCents: number
  description: string
  expenseDate: string
  createdAt: string
}

export interface MasterExpenseListResponse {
  items: MasterExpenseDTO[]
  total: number
}

export interface GetExpensesRequest {
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export interface CreateExpenseRequest {
  categoryId?: string | null
  appointmentId?: string | null
  amountCents: number
  description?: string
  expenseDate: string
}

const masterFinancesApi = rtkApi.injectEndpoints({
  endpoints: builder => ({
    getFinanceSummary: builder.query<FinanceSummaryDTO, { source?: FinanceSource; from?: string; to?: string }>({
      providesTags: ['FinanceSummary'],
      query: params => ({
        url: '/api/v1/master-dashboard/finances/summary',
        params: {
          source: params.source || 'all',
          from: params.from || undefined,
          to: params.to || undefined,
        },
      }),
    }),

    getFinanceTrend: builder.query<FinanceTrendPointDTO[], { source?: FinanceSource; from?: string; to?: string }>({
      providesTags: ['FinanceSummary'],
      query: params => ({
        url: '/api/v1/master-dashboard/finances/trends',
        params: {
          source: params.source || 'all',
          from: params.from || undefined,
          to: params.to || undefined,
        },
      }),
    }),

    getTopServices: builder.query<FinanceTopServiceDTO[], { source?: FinanceSource; from?: string; to?: string }>({
      providesTags: ['FinanceSummary'],
      query: params => ({
        url: '/api/v1/master-dashboard/finances/top-services',
        params: {
          source: params.source || 'all',
          from: params.from || undefined,
          to: params.to || undefined,
        },
      }),
    }),

    getExpenseCategories: builder.query<MasterExpenseCategoryDTO[], void>({
      providesTags: ['FinanceCategories'],
      query: () => '/api/v1/master-dashboard/finances/categories',
    }),

    createExpenseCategory: builder.mutation<MasterExpenseCategoryDTO, { name: string; emoji?: string }>({
      invalidatesTags: ['FinanceCategories'],
      query: body => ({
        url: '/api/v1/master-dashboard/finances/categories',
        method: 'POST',
        body,
      }),
    }),

    updateExpenseCategory: builder.mutation<MasterExpenseCategoryDTO, { id: string; name: string; emoji?: string }>({
      invalidatesTags: ['FinanceCategories'],
      query: ({ id, ...body }) => ({
        url: `/api/v1/master-dashboard/finances/categories/${id}`,
        method: 'PUT',
        body,
      }),
    }),

    deleteExpenseCategory: builder.mutation<void, string>({
      invalidatesTags: ['FinanceCategories'],
      query: id => ({
        url: `/api/v1/master-dashboard/finances/categories/${id}`,
        method: 'DELETE',
      }),
    }),

    getExpenses: builder.query<MasterExpenseListResponse, GetExpensesRequest>({
      providesTags: ['FinanceExpenses'],
      query: params => ({
        url: '/api/v1/master-dashboard/finances/expenses',
        params: {
          from: params.from || undefined,
          to: params.to || undefined,
          page: params.page,
          page_size: params.pageSize,
        },
      }),
      transformResponse: (res: MasterExpenseListResponse) => ({
        items: res.items ?? [],
        total: res.total ?? 0,
      }),
    }),

    createExpense: builder.mutation<MasterExpenseDTO, CreateExpenseRequest>({
      invalidatesTags: ['FinanceExpenses', 'FinanceSummary'],
      query: body => ({
        url: '/api/v1/master-dashboard/finances/expenses',
        method: 'POST',
        body,
      }),
    }),

    updateExpense: builder.mutation<MasterExpenseDTO, { id: string; body: CreateExpenseRequest }>({
      invalidatesTags: ['FinanceExpenses', 'FinanceSummary'],
      query: ({ id, body }) => ({
        url: `/api/v1/master-dashboard/finances/expenses/${id}`,
        method: 'PUT',
        body,
      }),
    }),

    deleteExpense: builder.mutation<void, string>({
      invalidatesTags: ['FinanceExpenses', 'FinanceSummary'],
      query: id => ({
        url: `/api/v1/master-dashboard/finances/expenses/${id}`,
        method: 'DELETE',
      }),
    }),

    exportNpdReport: builder.query<unknown, { month?: string }>({
      query: params => ({
        url: '/api/v1/master-dashboard/finances/export',
        params: { month: params.month || undefined },
      }),
    }),
  }),
})

export const {
  useGetFinanceSummaryQuery,
  useGetFinanceTrendQuery,
  useGetTopServicesQuery,
  useGetExpenseCategoriesQuery,
  useCreateExpenseCategoryMutation,
  useUpdateExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useLazyExportNpdReportQuery,
  useExportNpdReportQuery,
} = masterFinancesApi
