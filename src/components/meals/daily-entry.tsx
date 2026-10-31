"use client";

import { ChevronLeft, ChevronRight, Copy, Eraser, Loader2, Save, Sparkles, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useMonth } from "@/components/month-context";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/common";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { qk, useApiMutation, useDaySheet } from "@/lib/api/hooks";
import { MEAL_TYPES, type DaySheet, type MealType } from "@/lib/api/types";
import { clampISO, formatDate, formatNumber, shiftISODate, todayISO } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/** Tap order for a cell. Most changes are 0 ↔ 1, so those come first. */
const CYCLE = ["0", "1", "2", "0.5"];

type Edits = Record<string, string>; // `${memberId}:${mealType}` -> quantity
const keyOf = (memberId: number, meal: MealType) => `${memberId}:${meal}`;
const same = (a: string, b: string) => Number(a) === Number(b);

export function DailyEntry({ date, onDateChange }: { date: string; onDateChange: (d: string) => void }) {
  const { t, lang } = useI18n();
  const { month, monthId } = useMonth();
  const { data, isLoading, isFetching, error, refetch } = useDaySheet(monthId, date);
  const [edits, setEdits] = useState<Edits>({});
  const [pendingDate, setPendingDate] = useState<string | null>(null);

  const sheet = data && data.date === date ? data : undefined;
  const value = (memberId: number, meal: MealType) =>
    edits[keyOf(memberId, meal)] ?? sheet?.rows.find((r) => r.member_id === memberId)?.meals[meal] ?? "0";

  const changes = useMemo(() => {
    if (!sheet) return [];
    return Object.entries(edits)
      .map(([k, q]) => {
        const [member, meal] = k.split(":") as [string, MealType];
        const original = sheet.rows.find((r) => r.member_id === Number(member))?.meals[meal] ?? "0";
        return { member: Number(member), meal_type: meal, quantity: q, original };
      })
      .filter((c) => !same(c.quantity, c.original));
  }, [edits, sheet]);

  const save = useApiMutation(
    () =>
      api<{ saved: number; deleted: number }>("meals/bulk", {
        method: "POST",
        json: { account: monthId, date, entries: changes.map(({ member, meal_type, quantity }) => ({ member, meal_type, quantity })) },
      }),
    { invalidate: [qk.month(monthId)], success: t("meals.saved") },
  );

  const setCell = (memberId: number, meal: MealType, q: string) =>
    setEdits((prev) => ({ ...prev, [keyOf(memberId, meal)]: q }));

  const cycle = (memberId: number, meal: MealType) => {
    const current = value(memberId, meal);
    const idx = CYCLE.findIndex((c) => same(c, current));
    setCell(memberId, meal, CYCLE[(idx + 1) % CYCLE.length]);
  };

  const editableRows = sheet?.rows.filter((r) => r.editable) ?? [];

  const fillLunchDinner = () => {
    const next: Edits = { ...edits };
    for (const r of editableRows.filter((r) => r.present)) {
      next[keyOf(r.member_id, "lunch")] = "1";
      next[keyOf(r.member_id, "dinner")] = "1";
    }
    setEdits(next);
  };

  const clearDay = () => {
    const next: Edits = { ...edits };
    for (const r of editableRows) for (const m of MEAL_TYPES) next[keyOf(r.member_id, m)] = "0";
    setEdits(next);
  };

  const copyPreviousDay = async () => {
    if (!month || date <= month.start_date) {
      toast.info(t("meals.noPreviousDay"));
      return;
    }
    try {
      const prev = await api<DaySheet>("meals/day", { query: { month: monthId, date: shiftISODate(date, -1) } });
      const next: Edits = { ...edits };
      for (const r of editableRows) {
        const p = prev.rows.find((x) => x.member_id === r.member_id);
        for (const m of MEAL_TYPES) next[keyOf(r.member_id, m)] = p?.meals[m] ?? "0";
      }
      setEdits(next);
    } catch {
      toast.error(t("common.loadError"));
    }
  };

  const goTo = (d: string) => {
    if (!month) return;
    const target = clampISO(d, month.start_date, month.end_date);
    if (target === date) return;
    if (changes.length) setPendingDate(target);
    else {
      setEdits({});
      onDateChange(target);
    }
  };

  const totals = (meal: MealType) =>
    sheet?.rows.reduce((sum, r) => sum + Number(value(r.member_id, meal)), 0) ?? 0;
  const grandTotal = MEAL_TYPES.reduce((s, m) => s + totals(m), 0);
  const isToday = date === todayISO();

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => goTo(shiftISODate(date, -1))} disabled={!month || date <= month.start_date} aria-label={t("meals.prevDay")}>
            <ChevronLeft />
          </Button>
          <Input
            type="date"
            value={date}
            min={month?.start_date}
            max={month?.end_date}
            onChange={(e) => e.target.value && goTo(e.target.value)}
            className="w-40"
            aria-label={t("common.date")}
          />
          <Button variant="outline" size="icon" onClick={() => goTo(shiftISODate(date, 1))} disabled={!month || date >= month.end_date} aria-label={t("meals.nextDay")}>
            <ChevronRight />
          </Button>
        </div>
        {!isToday && (
          <Button variant="ghost" size="sm" onClick={() => goTo(todayISO())}>
            {t("common.today")}
          </Button>
        )}
        <span className="text-sm text-muted-foreground">
          {formatDate(date, lang, "long")}
          {isFetching && <Loader2 className="ml-2 inline size-3.5 animate-spin" />}
        </span>
        {editableRows.length > 1 && !sheet?.is_closed && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="ml-auto" />}>
              <Sparkles /> {t("meals.quickFill")}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem onClick={fillLunchDinner}>
                <Sparkles /> {t("meals.fillLunchDinner")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyPreviousDay}>
                <Copy /> {t("meals.copyPrevious")}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={clearDay}>
                <Eraser /> {t("meals.clearDay")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading || !sheet ? (
        <TableSkeleton rows={7} />
      ) : sheet.rows.length === 0 ? (
        <EmptyState title={t("members.noneInMonth")} description={t("meals.addMembersFirst")} />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="w-[38%] px-3 py-2 text-left font-medium">{t("common.member")}</th>
                {MEAL_TYPES.map((m) => (
                  <th key={m} className="px-1 py-2 text-center font-medium">
                    {t(`meals.${m}`)}
                    {sheet.menu[m] && <div className="truncate px-1 text-[10px] font-normal opacity-80">{sheet.menu[m]}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {sheet.rows.map((row) => (
                <tr key={row.member_id} className={cn(!row.present && "opacity-50")}>
                  <td className="truncate px-3 py-1.5 font-medium">
                    {row.name}
                    {!row.present && <span className="block text-[11px] font-normal text-muted-foreground">{t("meals.notPresent")}</span>}
                  </td>
                  {MEAL_TYPES.map((m) => {
                    const v = value(row.member_id, m);
                    const edited = keyOf(row.member_id, m) in edits && !same(v, row.meals[m]);
                    return (
                      <td key={m} className="p-1">
                        <button
                          type="button"
                          disabled={!row.editable}
                          onClick={() => cycle(row.member_id, m)}
                          aria-label={`${row.name} ${t(`meals.${m}`)}: ${v}`}
                          className={cn(
                            "tabular h-10 w-full rounded-lg border text-base font-semibold transition-colors select-none disabled:cursor-not-allowed",
                            Number(v) > 0 ? "border-primary/30 bg-primary/10 text-foreground" : "border-transparent bg-muted/40 text-muted-foreground",
                            edited && "ring-2 ring-status-warning",
                            row.editable && "hover:border-primary/60 active:scale-[0.97]",
                          )}
                        >
                          {Number(v) === 0 ? "–" : Number(v) === 0.5 ? "½" : formatNumber(v, lang)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-muted/30 text-sm font-semibold">
              <tr>
                <td className="px-3 py-2">
                  {t("common.total")} <span className="tabular font-normal text-muted-foreground">· {formatNumber(grandTotal, lang)}</span>
                </td>
                {MEAL_TYPES.map((m) => (
                  <td key={m} className="tabular py-2 text-center">
                    {formatNumber(totals(m), lang)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">{t("meals.tapHint")}</p>

      {changes.length > 0 && (
        <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
          <span className="text-sm">{t("meals.unsaved", { count: changes.length })}</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEdits({})} disabled={save.isPending}>
              <Undo2 /> {t("common.discard")}
            </Button>
            <Button onClick={() => save.mutate(undefined, { onSuccess: () => setEdits({}) })} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
              {t("common.save")}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingDate !== null}
        onOpenChange={(o) => !o && setPendingDate(null)}
        title={t("meals.discardTitle")}
        description={t("meals.discardBody", { count: changes.length })}
        confirmLabel={t("common.discard")}
        destructive
        onConfirm={() => {
          setEdits({});
          if (pendingDate) onDateChange(pendingDate);
          setPendingDate(null);
        }}
      />
    </div>
  );
}
