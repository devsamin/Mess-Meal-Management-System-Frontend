"use client";

import { memo } from "react";
import { useMonth } from "@/components/month-context";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/common";
import { useMealGrid } from "@/lib/api/hooks";
import type { MealGrid } from "@/lib/api/types";
import { formatNumber, todayISO, type Lang } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * One member's row. Memoised: query data is structurally shared, so a background refetch that changed one
 * member leaves every other row's props untouched and React skips them.
 */
const GridRow = memo(function GridRow({
  row,
  days,
  today,
  lang,
}: {
  row: MealGrid["rows"][number];
  days: string[];
  today: string;
  lang: Lang;
}) {
  return (
    <tr className="hover:bg-muted/40">
      <td className="sticky left-0 z-10 max-w-36 truncate bg-card px-3 py-1.5 text-sm font-medium">{row.name}</td>
      {days.map((d) => {
        const v = row.days[d];
        return (
          <td key={d} className={cn("px-1 py-1.5 text-center", d === today && "bg-primary/10", v === "0" && "text-muted-foreground/40")}>
            {v === "0" ? "·" : formatNumber(v, lang)}
          </td>
        );
      })}
      <td className="sticky right-0 bg-card px-3 py-1.5 text-right text-sm font-semibold">{formatNumber(row.total, lang)}</td>
    </tr>
  );
});

/** Member × day totals — the familiar spreadsheet view, read-only. Click a day to edit it. */
export function MonthlyGrid({ onPickDate }: { onPickDate: (date: string) => void }) {
  const { t, lang } = useI18n();
  const { monthId } = useMonth();
  const { data, isLoading, error, refetch } = useMealGrid(monthId);
  const today = todayISO();

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (isLoading || !data) return <TableSkeleton rows={8} />;
  if (!data.rows.length) return <EmptyState title={t("members.noneInMonth")} />;

  const grand = data.rows.reduce((s, r) => s + Number(r.total), 0);
  const isFriday = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, day)).getUTCDay() === 5; // weekly holiday in Bangladesh
  };

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="tabular w-max min-w-full border-collapse text-xs">
        <thead>
          <tr className="bg-muted/50 text-muted-foreground">
            <th className="sticky left-0 z-10 bg-muted px-3 py-2 text-left font-medium">{t("common.member")}</th>
            {data.days.map((d) => (
              <th key={d} className={cn("min-w-8 px-1 py-2 text-center font-medium", d === today && "bg-primary/15 text-foreground", isFriday(d) && "text-primary")}>
                <button type="button" onClick={() => onPickDate(d)} className="w-full hover:underline" title={t("meals.editThisDay")}>
                  {formatNumber(Number(d.slice(8)), lang)}
                </button>
              </th>
            ))}
            <th className="sticky right-0 bg-muted px-3 py-2 text-right font-semibold text-foreground">{t("common.total")}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.rows.map((r) => (
            <GridRow key={r.member_id} row={r} days={data.days} today={today} lang={lang} />
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/40 font-semibold">
            <td className="sticky left-0 z-10 bg-muted px-3 py-2">{t("common.total")}</td>
            {data.days.map((d) => (
              <td key={d} className="px-1 py-2 text-center">
                {data.day_totals[d] === "0" ? "" : formatNumber(data.day_totals[d], lang)}
              </td>
            ))}
            <td className="sticky right-0 bg-muted px-3 py-2 text-right">{formatNumber(grand, lang)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
