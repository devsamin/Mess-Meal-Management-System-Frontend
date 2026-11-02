"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
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

/** Heavy, server-cached month reports: fresh for a minute; mutations invalidate them sooner. */
const REPORT_STALE_MS = 60_000;

export const useMe = () =>
  useQuery({ queryKey: qk.me, queryFn: ({ signal }) => api<Me>("auth/me", { signal }), staleTime: 60_000 });

export const useSettings = () =>
  useQuery({ queryKey: qk.settings, queryFn: ({ signal }) => api<MessSettings>("settings", { signal }), staleTime: 60_000 });

export const useMonths = () =>
  useQuery({ queryKey: qk.months, queryFn: ({ signal }) => api<MonthAccount[]>("months", { signal }), staleTime: 30_000 });

export const useMembers = () =>
  useQuery({ queryKey: qk.members, queryFn: ({ signal }) => api<Member[]>("members", { signal }), staleTime: 30_000 });

export const useCategories = () =>
  useQuery({ queryKey: qk.categories, queryFn: ({ signal }) => api<ExpenseCategory[]>("expense-categories", { signal }), staleTime: 300_000 });

export const useMenu = () =>
  useQuery({ queryKey: qk.menu, queryFn: ({ signal }) => api<WeeklyMenuItem[]>("menu", { signal }), staleTime: 300_000 });

export const useUsers = (enabled = true) =>
  useQuery({ queryKey: qk.users, queryFn: ({ signal }) => api<UserAccount[]>("users", { signal }), enabled });

export const useMonthMembers = (monthId?: number) =>
  useQuery({
    queryKey: [...qk.month(monthId), "members"],
    queryFn: ({ signal }) => api<MonthMember[]>(`months/${monthId}/members`, { signal }),
    enabled: !!monthId,
  });

export const useDashboard = (monthId?: number) =>
  useQuery({
    queryKey: [...qk.month(monthId), "dashboard"],
    queryFn: ({ signal }) => api<Dashboard>(`months/${monthId}/dashboard`, { signal }),
    enabled: !!monthId,
    staleTime: REPORT_STALE_MS,
    refetchInterval: REPORT_STALE_MS, // keeps a dashboard left open fresh; paused while the tab is hidden
    refetchIntervalInBackground: false,
  });

export const useSummary = (monthId?: number) =>
  useQuery({
    queryKey: [...qk.month(monthId), "summary"],
    queryFn: ({ signal }) => api<MonthSummary>(`months/${monthId}/summary`, { signal }),
    enabled: !!monthId,
    staleTime: REPORT_STALE_MS,
  });

export const useReport = (monthId?: number) =>
  useQuery({
    queryKey: [...qk.month(monthId), "report"],
    queryFn: ({ signal }) => api<MonthReport>(`months/${monthId}/report`, { signal }),
    enabled: !!monthId,
    staleTime: REPORT_STALE_MS,
  });

export const useDaySheet = (monthId: number | undefined, date: string) =>
  useQuery({
    queryKey: [...qk.month(monthId), "day", date],
    queryFn: ({ signal }) => api<DaySheet>("meals/day", { query: { month: monthId, date }, signal }),
    enabled: !!monthId && !!date,
    placeholderData: keepPreviousData,
  });

export const useMealGrid = (monthId?: number) =>
  useQuery({
    queryKey: [...qk.month(monthId), "grid"],
    queryFn: ({ signal }) => api<MealGrid>("meals/grid", { query: { month: monthId }, signal }),
    enabled: !!monthId,
    staleTime: REPORT_STALE_MS,
  });

export const useExpenses = (monthId: number | undefined, params: Params) =>
  useQuery({
    queryKey: [...qk.month(monthId), "expenses", params],
    queryFn: ({ signal }) => api<Paginated<Expense>>("expenses", { query: { month: monthId, ...params }, signal }),
    enabled: !!monthId,
    placeholderData: keepPreviousData,
  });

export const useDeposits = (monthId: number | undefined, params: Params) =>
  useQuery({
    queryKey: [...qk.month(monthId), "deposits", params],
    queryFn: ({ signal }) => api<Paginated<Deposit>>("deposits", { query: { month: monthId, ...params }, signal }),
    enabled: !!monthId,
    placeholderData: keepPreviousData,
  });

export const useExtraBills = (monthId: number | undefined, params: Params = {}) =>
  useQuery({
    queryKey: [...qk.month(monthId), "bills", params],
    queryFn: ({ signal }) =>
      api<Paginated<ExtraBill>>("extra-bills", { query: { month: monthId, page_size: 100, ...params }, signal }),
    enabled: !!monthId,
  });

export const useActivity = (monthId?: number) =>
  useQuery({
    queryKey: [...qk.month(monthId), "activity"],
    queryFn: ({ signal }) => api<Paginated<ActivityItem>>("activity", { query: { account: monthId }, signal }),
    enabled: !!monthId,
  });

/** One immediate edit to cached query data (all queries whose key starts with `queryKey`). */
export interface CacheEdit {
  queryKey: QueryKey;
  update: (old: unknown) => unknown;
}

type Row = { id: number };

/** Edit for a paginated list: drop a row, adjusting the count and (optionally) the running total. */
export function removeRow<T extends Row>(queryKey: QueryKey, id: number, amountOf?: (row: T) => number): CacheEdit {
  return {
    queryKey,
    update: (old) => {
      const page = old as Paginated<T>;
      const row = page.results?.find((r) => r.id === id);
      if (!row) return old;
      const total =
        page.total_amount !== undefined && amountOf ? (Number(page.total_amount) - amountOf(row)).toFixed(2) : page.total_amount;
      return { ...page, count: page.count - 1, results: page.results.filter((r) => r.id !== id), total_amount: total };
    },
  };
}

/** Edit for a paginated list: merge fields into one row. */
export function patchRow<T extends Row>(queryKey: QueryKey, id: number, patch: Partial<T>): CacheEdit {
  return {
    queryKey,
    update: (old) => {
      const page = old as Paginated<T>;
      if (!page.results?.some((r) => r.id === id)) return old;
      return { ...page, results: page.results.map((r) => (r.id === id ? { ...r, ...patch } : r)) };
    },
  };
}

export interface MutationConfig<TVars, TData> {
  invalidate?: QueryKey[];
  success?: string | ((data: TData) => string);
  optimistic?: (vars: TVars) => CacheEdit[];
}

/**
 * Options for `useMutation`: toasts on success/error, invalidates the given keys, and (with `optimistic`)
 * edits the cache immediately and rolls it back if the request fails. Kept apart from the hook so it can be
 * tested with a plain QueryClient.
 */
export function apiMutationOptions<TVars, TData>(
  qc: QueryClient,
  fn: (vars: TVars) => Promise<TData>,
  { invalidate = [], success, optimistic }: MutationConfig<TVars, TData> = {},
) {
  return {
    mutationFn: fn,
    onMutate: async (vars: TVars) => {
      const edits = optimistic?.(vars) ?? [];
      await Promise.all(edits.map((e) => qc.cancelQueries({ queryKey: e.queryKey })));
      const snapshots = edits.flatMap((e) => qc.getQueriesData({ queryKey: e.queryKey }));
      for (const e of edits) {
        qc.setQueriesData({ queryKey: e.queryKey }, (old) => (old === undefined ? old : e.update(old)));
      }
      return { snapshots };
    },
    onSuccess: async (data: TData) => {
      const refetch = Promise.all(invalidate.map((queryKey) => qc.invalidateQueries({ queryKey })));
      // Without an optimistic edit the screen is stale until the refetch lands, so hold the mutation open for it.
      if (!optimistic) await refetch;
      if (success) toast.success(typeof success === "function" ? success(data) : success);
    },
    onError: (err: unknown, _vars: TVars, ctx: { snapshots: [QueryKey, unknown][] } | undefined) => {
      for (const [key, data] of ctx?.snapshots ?? []) qc.setQueryData(key, data);
      toast.error(err instanceof ApiError ? err.message : "Something went wrong.");
    },
  };
}

/**
 * Mutation helper: shows a toast on success/error and invalidates the given keys.
 * Field errors stay on the ApiError so forms can show them inline.
 */
export function useApiMutation<TVars, TData = unknown>(fn: (vars: TVars) => Promise<TData>, config: MutationConfig<TVars, TData> = {}) {
  const qc = useQueryClient();
  return useMutation(apiMutationOptions(qc, fn, config));
}
