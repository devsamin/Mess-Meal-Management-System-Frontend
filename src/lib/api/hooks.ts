"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, api } from "./client";
import type {
  ActivityItem,
  Dashboard,
  DaySheet,
  Deposit,
  Expense,
  ExpenseCategory,
  ExtraBill,
  MealGrid,
  Me,
  Member,
  MessSettings,
  MonthAccount,
  MonthMember,
  MonthReport,
  MonthSummary,
  Paginated,
  UserAccount,
  WeeklyMenuItem,
} from "./types";

/**
 * Query keys. Everything derived from one month lives under ["m", monthId] so a
 * single invalidation refreshes totals, balances, lists and sheets together.
 */
export const qk = {
  me: ["me"] as const,
  settings: ["settings"] as const,
  months: ["months"] as const,
  members: ["members"] as const,
  categories: ["categories"] as const,
  menu: ["menu"] as const,
  users: ["users"] as const,
  month: (id: number | undefined) => ["m", id] as const,
};

type Params = Record<string, string | number | boolean | undefined | null>;

export const useMe = () => useQuery({ queryKey: qk.me, queryFn: () => api<Me>("auth/me"), staleTime: 60_000 });

export const useSettings = () =>
  useQuery({ queryKey: qk.settings, queryFn: () => api<MessSettings>("settings"), staleTime: 60_000 });

export const useMonths = () =>
  useQuery({ queryKey: qk.months, queryFn: () => api<MonthAccount[]>("months"), staleTime: 30_000 });

export const useMembers = () =>
  useQuery({ queryKey: qk.members, queryFn: () => api<Member[]>("members"), staleTime: 30_000 });

export const useCategories = () =>
  useQuery({ queryKey: qk.categories, queryFn: () => api<ExpenseCategory[]>("expense-categories"), staleTime: 300_000 });

export const useMenu = () =>
  useQuery({ queryKey: qk.menu, queryFn: () => api<WeeklyMenuItem[]>("menu"), staleTime: 300_000 });

export const useUsers = (enabled = true) =>
  useQuery({ queryKey: qk.users, queryFn: () => api<UserAccount[]>("users"), enabled });

export const useMonthMembers = (monthId?: number) =>
  useQuery({
    queryKey: [...qk.month(monthId), "members"],
    queryFn: () => api<MonthMember[]>(`months/${monthId}/members`),
    enabled: !!monthId,
  });

export const useDashboard = (monthId?: number) =>
  useQuery({
    queryKey: [...qk.month(monthId), "dashboard"],
    queryFn: () => api<Dashboard>(`months/${monthId}/dashboard`),
    enabled: !!monthId,
  });

export const useSummary = (monthId?: number) =>
  useQuery({
    queryKey: [...qk.month(monthId), "summary"],
    queryFn: () => api<MonthSummary>(`months/${monthId}/summary`),
    enabled: !!monthId,
  });

export const useReport = (monthId?: number) =>
  useQuery({
    queryKey: [...qk.month(monthId), "report"],
    queryFn: () => api<MonthReport>(`months/${monthId}/report`),
    enabled: !!monthId,
  });

export const useDaySheet = (monthId: number | undefined, date: string) =>
  useQuery({
    queryKey: [...qk.month(monthId), "day", date],
    queryFn: () => api<DaySheet>("meals/day", { query: { month: monthId, date } }),
    enabled: !!monthId && !!date,
    placeholderData: keepPreviousData,
  });

export const useMealGrid = (monthId?: number) =>
  useQuery({
    queryKey: [...qk.month(monthId), "grid"],
    queryFn: () => api<MealGrid>("meals/grid", { query: { month: monthId } }),
    enabled: !!monthId,
  });

export const useExpenses = (monthId: number | undefined, params: Params) =>
  useQuery({
    queryKey: [...qk.month(monthId), "expenses", params],
    queryFn: () => api<Paginated<Expense>>("expenses", { query: { month: monthId, ...params } }),
    enabled: !!monthId,
    placeholderData: keepPreviousData,
  });

export const useDeposits = (monthId: number | undefined, params: Params) =>
  useQuery({
    queryKey: [...qk.month(monthId), "deposits", params],
    queryFn: () => api<Paginated<Deposit>>("deposits", { query: { month: monthId, ...params } }),
    enabled: !!monthId,
    placeholderData: keepPreviousData,
  });

export const useExtraBills = (monthId: number | undefined, params: Params = {}) =>
  useQuery({
    queryKey: [...qk.month(monthId), "bills", params],
    queryFn: () => api<Paginated<ExtraBill>>("extra-bills", { query: { month: monthId, page_size: 100, ...params } }),
    enabled: !!monthId,
  });

export const useActivity = (monthId?: number) =>
  useQuery({
    queryKey: [...qk.month(monthId), "activity"],
    queryFn: () => api<Paginated<ActivityItem>>("activity", { query: { account: monthId } }),
    enabled: !!monthId,
  });

/**
 * Mutation helper: shows a toast on success/error and invalidates the given keys.
 * Field errors stay on the ApiError so forms can show them inline.
 */
export function useApiMutation<TVars, TData = unknown>(
  fn: (vars: TVars) => Promise<TData>,
  { invalidate = [], success }: { invalidate?: QueryKey[]; success?: string | ((data: TData) => string) } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (data) => {
      await Promise.all(invalidate.map((queryKey) => qc.invalidateQueries({ queryKey })));
      if (success) toast.success(typeof success === "function" ? success(data) : success);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong.");
    },
  });
}
