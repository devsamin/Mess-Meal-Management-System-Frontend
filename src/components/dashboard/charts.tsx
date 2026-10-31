"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CategoryTotal, DailyMeals, MemberBalance } from "@/lib/api/types";
import { formatDate, formatMoney, formatNumber, toNumber } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";

/** Single-series bar chart: total meals per day. One series → no legend; the card title names it. */
export function DailyMealsChart({ data, today }: { data: DailyMeals[]; today?: string }) {
  const { t, lang } = useI18n();
  const rows = data.map((d) => ({ ...d, day: Number(d.date.slice(8)), value: toNumber(d.total) }));
  return (
    <div className="h-56 w-full" role="img" aria-label={t("dashboard.dailyMeals")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: -20 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={8}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as (DailyMeals & { value: number }) | undefined;
              if (!active || !row) return null;
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                  <div className="mb-1 font-medium">
                    {formatDate(row.date, lang, "weekday")}
                    {row.date === today && ` · ${t("common.today")}`}
                  </div>
                  <div className="tabular grid grid-cols-[auto_auto] gap-x-4 text-muted-foreground">
                    <span>{t("meals.lunch")}</span>
                    <span className="text-right text-foreground">{formatNumber(row.lunch, lang)}</span>
                    <span>{t("meals.dinner")}</span>
                    <span className="text-right text-foreground">{formatNumber(row.dinner, lang)}</span>
                    <span className="font-medium text-foreground">{t("common.total")}</span>
                    <span className="text-right font-medium text-foreground">{formatNumber(row.total, lang)}</span>
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="value" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Diverging bars around zero: blue = the mess owes the member, red = the member owes.
 * Every row also prints the signed amount, so color is never the only cue.
 */
export function BalanceBars({ members }: { members: MemberBalance[] }) {
  const { t, lang } = useI18n();
  const max = Math.max(1, ...members.map((m) => Math.abs(toNumber(m.balance))));
  const sorted = [...members].sort((a, b) => toNumber(b.balance) - toNumber(a.balance));
  return (
    <ul className="grid gap-1.5" aria-label={t("dashboard.memberBalances")}>
      {sorted.map((m) => {
        const v = toNumber(m.balance);
        const pct = (Math.abs(v) / max) * 50;
        return (
          <li
            key={m.member_id}
            className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-3 rounded-md px-1 py-1 text-sm hover:bg-muted/60"
            title={`${m.name}: ${t("balance.credit")} ${formatMoney(m.total_credit, lang)} − ${t("balance.charges")} ${formatMoney(m.total_charges, lang)}`}
          >
            <span className="truncate">{m.name}</span>
            <span className="relative h-3">
              <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
              <span
                className="absolute inset-y-0.5 rounded-sm"
                style={{
                  width: `${pct}%`,
                  left: v >= 0 ? "50%" : `${50 - pct}%`,
                  background: v >= 0 ? "var(--diverge-pos)" : "var(--diverge-neg)",
                }}
              />
            </span>
            <span className="tabular w-24 text-right font-medium">{formatMoney(v, lang, { signed: true })}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Spending per category — single hue magnitude bars with labels. */
export function CategoryBars({ totals }: { totals: CategoryTotal[] }) {
  const { t, lang } = useI18n();
  const max = Math.max(1, ...totals.map((c) => toNumber(c.amount)));
  return (
    <ul className="grid gap-3">
      {totals.map((c) => (
        <li key={`${c.category_id}-${c.in_meal_rate}`} className="grid gap-1 text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate">
              {c.category}
              <span className="ml-1.5 text-xs text-muted-foreground">
                {c.in_meal_rate ? t("expenses.inMealRateShort") : t("expenses.sharedShort")}
              </span>
            </span>
            <span className="tabular font-medium">{formatMoney(c.amount, lang)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full"
              style={{ width: `${(toNumber(c.amount) / max) * 100}%`, background: "var(--series-1)" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
