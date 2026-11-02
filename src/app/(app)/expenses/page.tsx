"use client";

import { Check, ChevronLeft, ChevronRight, MoreHorizontal, Paperclip, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useMonth } from "@/components/month-context";
import { ClosedMonthNotice, EmptyState, ErrorState, Money, PageHeader, TableSkeleton } from "@/components/common";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { SimpleSelect } from "@/components/common/form";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { StartFirstMonth } from "@/components/months/start-month";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, mediaUrl } from "@/lib/api/client";
import { patchRow, qk, removeRow, useApiMutation, useCategories, useExpenses, useMonthMembers } from "@/lib/api/hooks";
import type { Expense } from "@/lib/api/types";
import { formatDate, formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { usePermissions } from "@/lib/use-permissions";

const PAGE_SIZE = 25;

function StatusBadge({ status }: { status: Expense["status"] }) {
  const { t } = useI18n();
  if (status === "approved") return null;
  return (
    <Badge variant="outline" className={status === "pending" ? "border-status-warning text-foreground" : "text-text-critical"}>
      {t(`expenses.status.${status}`)}
    </Badge>
  );
}

function ExpensesView() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const { monthId, months, isLoading: monthsLoading, isClosed } = useMonth();
  const { manage, canSubmitExpense, me } = usePermissions();
  const { data: categories = [] } = useCategories();
  const { data: monthMembers = [] } = useMonthMembers(monthId);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [purchaser, setPurchaser] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const [editing, setEditing] = useState<Expense | "new" | null>(params.get("new") ? "new" : null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const filters = { search: debouncedSearch, category, purchaser, status, payment_source: source, page, page_size: PAGE_SIZE, ordering: "-date" };
  const { data, isLoading, error, refetch, isPlaceholderData } = useExpenses(monthId, filters);

  const act = useApiMutation(
    ({ id, action }: { id: number; action: "approve" | "reject" | "delete" }) =>
      action === "delete" ? api(`expenses/${id}`, { method: "DELETE" }) : api(`expenses/${id}/${action}`, { method: "POST" }),
    {
      invalidate: [qk.month(monthId)],
      success: t("common.done"),
      optimistic: ({ id, action }) => {
        const lists = [...qk.month(monthId), "expenses"];
        if (action === "delete") return [removeRow<Expense>(lists, id, (e) => Number(e.amount))];
        return [patchRow<Expense>(lists, id, { status: action === "approve" ? "approved" : "rejected" })];
      },
    },
  );

  const closeForm = () => {
    setEditing(null);
    if (params.get("new")) router.replace("/expenses");
  };

  const canChange = (e: Expense) =>
    manage ? !isClosed : !isClosed && e.status === "pending" && e.created_by_name !== null && e.purchaser === me?.member?.id;

  if (!monthsLoading && months.length === 0) return <StartFirstMonth />;

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  const rowActions = (e: Expense) =>
    canChange(e) && (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("common.actions")} />}>
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {manage && e.status !== "approved" && (
            <DropdownMenuItem onClick={() => act.mutate({ id: e.id, action: "approve" })}>
              <Check /> {t("expenses.approve")}
            </DropdownMenuItem>
          )}
          {manage && e.status === "pending" && (
            <DropdownMenuItem onClick={() => act.mutate({ id: e.id, action: "reject" })}>
              <X /> {t("expenses.reject")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setEditing(e)}>
            <Pencil /> {t("common.edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDeleting(e)}>
            <Trash2 /> {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

  return (
    <>
      <PageHeader
        title={t("expenses.title")}
        description={t("expenses.subtitle")}
        actions={
          canSubmitExpense && (
            <Button onClick={() => setEditing("new")}>
              <Plus /> {t("expenses.add")}
            </Button>
          )
        }
      />
      {isClosed && <ClosedMonthNotice />}

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-[1fr_repeat(4,minmax(0,170px))]">
        <div className="relative col-span-2 md:col-span-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("expenses.searchPlaceholder")}
            className="pl-8"
          />
        </div>
        <SimpleSelect
          value={category}
          onChange={resetPage(setCategory)}
          options={[{ value: "", label: t("expenses.allCategories") }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
        />
        <SimpleSelect
          value={purchaser}
          onChange={resetPage(setPurchaser)}
          options={[{ value: "", label: t("expenses.allPurchasers") }, ...monthMembers.map((m) => ({ value: String(m.member), label: m.member_name }))]}
        />
        <SimpleSelect
          value={source}
          onChange={resetPage(setSource)}
          options={[
            { value: "", label: t("expenses.allSources") },
            { value: "fund", label: t("expenses.source.fund") },
            { value: "personal", label: t("expenses.source.personal") },
          ]}
        />
        <SimpleSelect
          value={status}
          onChange={resetPage(setStatus)}
          options={[
            { value: "", label: t("expenses.allStatuses") },
            { value: "approved", label: t("expenses.status.approved") },
            { value: "pending", label: t("expenses.status.pending") },
            { value: "rejected", label: t("expenses.status.rejected") },
          ]}
        />
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <TableSkeleton />
      ) : data.results.length === 0 ? (
        <EmptyState
          title={t("expenses.none")}
          description={t("expenses.noneHint")}
          action={canSubmitExpense && <Button onClick={() => setEditing("new")}><Plus /> {t("expenses.add")}</Button>}
        />
      ) : (
        <div className={isPlaceholderData ? "opacity-60 transition-opacity" : ""}>
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>{t("expenses.countLabel", { count: data.count })}</span>
            <span>
              {t("common.total")}: <span className="tabular font-semibold text-foreground">{formatMoney(data.total_amount, lang)}</span>
            </span>
          </div>

          {/* Desktop table */}
          <Card className="hidden py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("common.description")}</TableHead>
                  <TableHead>{t("expenses.purchaser")}</TableHead>
                  <TableHead>{t("expenses.paidFrom")}</TableHead>
                  <TableHead className="text-right">{t("common.amount")}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(e.date, lang, "short")}</TableCell>
                    <TableCell className="max-w-72">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{e.category_name}</Badge>
                        <span className="truncate">{e.description}</span>
                        {e.receipt && (
                          <a href={mediaUrl(e.receipt) ?? "#"} target="_blank" rel="noreferrer" aria-label={t("expenses.viewReceipt")}>
                            <Paperclip className="size-3.5 text-muted-foreground" />
                          </a>
                        )}
                        <StatusBadge status={e.status} />
                      </div>
                      {!e.include_in_meal_rate && <div className="text-xs text-muted-foreground">{t("expenses.notInMealRate")}</div>}
                    </TableCell>
                    <TableCell>{e.purchaser_name ?? "—"}</TableCell>
                    <TableCell>
                      <span className={e.payment_source === "personal" ? "font-medium" : "text-muted-foreground"}>
                        {t(`expenses.source.${e.payment_source}`)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <Money value={e.amount} tone="plain" />
                    </TableCell>
                    <TableCell>{rowActions(e)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <ul className="grid gap-2 md:hidden">
            {data.results.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 rounded-xl border bg-card p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">{e.category_name}</Badge>
                    <StatusBadge status={e.status} />
                  </div>
                  <div className="mt-1 truncate font-medium">{e.description || e.category_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(e.date, lang, "short")}
                    {e.purchaser_name && ` · ${e.purchaser_name}`} · {t(`expenses.source.${e.payment_source}`)}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="tabular font-semibold">{formatMoney(e.amount, lang)}</span>
                  {rowActions(e)}
                </div>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label={t("common.previous")}>
                <ChevronLeft />
              </Button>
              <span className="text-sm">{t("common.pageOf", { page, total: totalPages })}</span>
              <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label={t("common.next")}>
                <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      )}

      {editing && <ExpenseForm expense={editing === "new" ? null : editing} onClose={closeForm} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("expenses.deleteTitle")}
        description={deleting && t("expenses.deleteBody", { amount: formatMoney(deleting.amount, lang), date: formatDate(deleting.date, lang) })}
        confirmLabel={t("common.delete")}
        destructive
        pending={act.isPending}
        onConfirm={() => {
          if (!deleting) return;
          act.mutate({ id: deleting.id, action: "delete" }); // optimistic: a failure restores the row and shows an error
          setDeleting(null);
        }}
      />
    </>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ExpensesView />
    </Suspense>
  );
}
