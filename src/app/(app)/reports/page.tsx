"use client";

import { FileSpreadsheet, FileText, Lock, Printer } from "lucide-react";
import { useMonth } from "@/components/month-context";
import { BalanceBadge, ErrorState, Money, PageHeader, Section, TableSkeleton } from "@/components/common";
import { StartFirstMonth } from "@/components/months/start-month";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { backendUrl } from "@/lib/api/client";
import { useReport, useSettings } from "@/lib/api/hooks";
import type { MonthSummary } from "@/lib/api/types";
import { formatDate, formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";

function Formula({ label, expr, result }: { label: string; expr: string; result: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 px-3 py-2 sm:flex-row sm:items-baseline sm:justify-between">
      <span className="text-sm font-medium">{label}</span>
      <span className="tabular text-sm text-muted-foreground">
        {expr} = <span className="font-semibold text-foreground">{result}</span>
      </span>
    </div>
  );
}

function HowItWorks({ s }: { s: MonthSummary }) {
  const { t, lang } = useI18n();
  const m = (v: string | number) => formatMoney(v, lang);
  return (
    <div className="grid gap-2">
      <Formula
        label={t("report.f.mealPool")}
        expr={`${m(s.meal_expenses)} + ${m(s.meal_bills)}`}
        result={m(s.meal_pool)}
      />
      <Formula
        label={t("report.f.mealRate")}
        expr={`${m(s.meal_pool)} ÷ ${formatNumber(s.total_meals, lang)}`}
        result={m(s.meal_rate)}
      />
      <Formula label={t("report.f.mealCost")} expr={t("report.f.mealCostExpr")} result={t("report.f.perMember")} />
      <Formula
        label={t("report.f.shared")}
        expr={`${m(s.shared_expenses)} ${s.fixed_cost_split === "equal" ? t("report.f.splitEqual") : t("report.f.splitDays")}`}
        result={t("report.f.perMember")}
      />
      <Formula label={t("report.f.balance")} expr={t("report.f.balanceExpr")} result={t("report.f.perMember")} />
      <Formula
        label={t("report.f.cash")}
        expr={`${m(s.opening_balance_total)} + ${m(s.net_deposits)} − ${m(s.fund_spent)}`}
        result={m(s.cash_in_hand)}
      />
      <p className="text-xs text-muted-foreground">{t("report.noDoubleCount")}</p>
    </div>
  );
}

export default function ReportsPage() {
  const { t, lang } = useI18n();
  const { month, monthId, months, isLoading: monthsLoading } = useMonth();
  const { data: settings } = useSettings();
  const { data, isLoading, error, refetch } = useReport(monthId);

  if (!monthsLoading && months.length === 0) return <StartFirstMonth />;
  const s = data?.summary;

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {t("report.title")} — {month?.label}
            {month?.status === "closed" && (
              <Badge variant="outline" className="gap-1">
                <Lock className="size-3" /> {t("report.final")}
              </Badge>
            )}
          </span>
        }
        description={
          month?.status === "closed" && month.closed_at
            ? t("report.finalizedOn", { date: formatDateTime(month.closed_at, lang), name: month.closed_by_name ?? "" })
            : t("report.liveNote")
        }
        actions={
          monthId && (
            <>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer /> {t("report.print")}
              </Button>
              <a href={backendUrl(`months/${monthId}/export`, { file_format: "csv" })} className={buttonVariants({ variant: "outline" })} download>
                <FileText /> CSV
              </a>
              <a href={backendUrl(`months/${monthId}/export`, { file_format: "xlsx" })} className={buttonVariants()} download>
                <FileSpreadsheet /> Excel
              </a>
            </>
          )
        }
      />

      <div className="mb-4 hidden print:block">
        <div className="text-lg font-semibold">{settings?.name}</div>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading || !data || !s ? (
        <TableSkeleton rows={10} />
      ) : (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [t("summary.totalMeals"), formatNumber(s.total_meals, lang)],
              [t("summary.mealRate"), formatMoney(s.meal_rate, lang)],
              [t("summary.totalSpending"), formatMoney(s.total_spending, lang)],
              [t("summary.cashInHand"), formatMoney(s.cash_in_hand, lang)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border bg-card p-3">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="tabular text-xl font-semibold">{value}</div>
              </div>
            ))}
          </div>

          <Section title={t("report.howCalculated")}>
            <HowItWorks s={s} />
          </Section>

          <Section title={t("report.memberBreakdown")}>
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <Table className="tabular text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.member")}</TableHead>
                    <TableHead className="text-right">{t("summary.meals")}</TableHead>
                    <TableHead className="text-right">{t("report.col.opening")}</TableHead>
                    <TableHead className="text-right">{t("report.col.deposits")}</TableHead>
                    <TableHead className="text-right">{t("report.col.personal")}</TableHead>
                    <TableHead className="text-right font-semibold">{t("balance.credit")}</TableHead>
                    <TableHead className="text-right">{t("report.col.mealCost")}</TableHead>
                    <TableHead className="text-right">{t("report.col.shared")}</TableHead>
                    <TableHead className="text-right">{t("report.col.bills")}</TableHead>
                    <TableHead className="text-right font-semibold">{t("balance.charges")}</TableHead>
                    <TableHead className="text-right font-semibold">{t("balance.balance")}</TableHead>
                    <TableHead className="no-print" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.members.map((m) => (
                    <TableRow key={m.member_id}>
                      <TableCell className="font-medium whitespace-nowrap">{m.name}</TableCell>
                      <TableCell className="text-right">{formatNumber(m.meals, lang)}</TableCell>
                      <TableCell className="text-right"><Money value={m.opening_balance} /></TableCell>
                      <TableCell className="text-right">{formatMoney(m.net_deposits, lang)}</TableCell>
                      <TableCell className="text-right">{formatMoney(m.personal_paid, lang)}</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(m.total_credit, lang)}</TableCell>
                      <TableCell className="text-right">{formatMoney(m.meal_cost, lang)}</TableCell>
                      <TableCell className="text-right">{formatMoney(m.shared_cost, lang)}</TableCell>
                      <TableCell className="text-right">{formatMoney(m.bill_charges, lang)}</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(m.total_charges, lang)}</TableCell>
                      <TableCell className="text-right font-semibold"><Money value={m.balance} signed /></TableCell>
                      <TableCell className="no-print"><BalanceBadge value={m.balance} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-semibold">
                    <TableCell>{t("common.total")}</TableCell>
                    <TableCell className="text-right">{formatNumber(s.total_meals, lang)}</TableCell>
                    <TableCell className="text-right">{formatMoney(s.opening_balance_total, lang)}</TableCell>
                    <TableCell className="text-right">{formatMoney(s.net_deposits, lang)}</TableCell>
                    <TableCell className="text-right">{formatMoney(s.personal_contributions, lang)}</TableCell>
                    <TableCell />
                    <TableCell className="text-right">{formatMoney(s.meal_pool, lang)}</TableCell>
                    <TableCell className="text-right">{formatMoney(s.shared_expenses, lang)}</TableCell>
                    <TableCell className="text-right">{formatMoney(s.split_bills, lang)}</TableCell>
                    <TableCell />
                    <TableCell className="text-right"><Money value={s.total_balance} signed /></TableCell>
                    <TableCell className="no-print" />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("report.balanceLegend", { receivable: formatMoney(s.total_receivable, lang), payable: formatMoney(s.total_payable, lang) })}
            </p>
          </Section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title={t("dashboard.spendingByCategory")}>
              <Table className="tabular text-sm">
                <TableBody>
                  {s.category_totals.map((c) => (
                    <TableRow key={`${c.category_id}-${c.in_meal_rate}`}>
                      <TableCell>
                        {c.category}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({c.in_meal_rate ? t("expenses.inMealRateShort") : t("expenses.sharedShort")})
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{c.count}×</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(c.amount, lang)}</TableCell>
                    </TableRow>
                  ))}
                  {data.extra_bills.length > 0 && (
                    <TableRow>
                      <TableCell>{t("nav.extraBills")}</TableCell>
                      <TableCell className="text-right">{data.extra_bills.length}×</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(s.total_extra_bills, lang)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Section>
            <Section title={t("nav.deposits")}>
              <div className="max-h-80 overflow-y-auto print:max-h-none">
                <Table className="tabular text-sm">
                  <TableBody>
                    {data.deposits.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="whitespace-nowrap">{formatDate(d.date, lang, "short")}</TableCell>
                        <TableCell>{d.member}</TableCell>
                        <TableCell className="text-right">
                          <Money value={d.kind === "refund" ? `-${d.amount}` : d.amount} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Section>
          </div>

          <Section title={t("meals.monthlySheet")} className="print-break">
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="tabular w-max min-w-full text-[11px]">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="sticky left-0 bg-card px-2 py-1 text-left">{t("common.member")}</th>
                    {data.meal_grid.days.map((d) => (
                      <th key={d} className="px-1 py-1 text-center font-medium">{Number(d.slice(8))}</th>
                    ))}
                    <th className="px-2 py-1 text-right">{t("common.total")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.meal_grid.rows.map((r) => (
                    <tr key={r.member_id}>
                      <td className="sticky left-0 bg-card px-2 py-1 font-medium whitespace-nowrap">{r.name}</td>
                      {data.meal_grid.days.map((d) => (
                        <td key={d} className="px-1 py-1 text-center">{r.days[d] === "0" ? "" : r.days[d]}</td>
                      ))}
                      <td className="px-2 py-1 text-right font-semibold">{r.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title={t("expenses.title")} className="print-break">
            <Table className="tabular text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("common.description")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("expenses.purchaser")}</TableHead>
                  <TableHead className="text-right">{t("common.amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(e.date, lang, "short")}</TableCell>
                    <TableCell>
                      {e.category}
                      {e.description && <span className="text-muted-foreground"> · {e.description}</span>}
                      {e.payment_source === "personal" && <Badge variant="outline" className="ml-2">{t("expenses.source.personal")}</Badge>}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{e.purchaser ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatMoney(e.amount, lang)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-semibold">{t("common.total")}</TableCell>
                  <TableCell className="hidden sm:table-cell" />
                  <TableCell className="text-right font-semibold">{formatMoney(s.total_expenses, lang)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </Section>
        </div>
      )}
    </>
  );
}
