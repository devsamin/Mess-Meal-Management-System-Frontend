"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Coins,
  HandCoins,
  PiggyBank,
  Plus,
  Scale,
  ShoppingBasket,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { useMonth } from "@/components/month-context";
import { BalanceBadge, EmptyState, ErrorState, Money, PageHeader, Section, StatCard } from "@/components/common";
import { BalanceBars, CategoryBars, DailyMealsChart } from "@/components/dashboard/charts";
import { StartFirstMonth } from "@/components/months/start-month";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/lib/api/hooks";
import { MEAL_TYPES } from "@/lib/api/types";
import { formatDate, formatMoney, formatNumber, relativeTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { usePermissions } from "@/lib/use-permissions";

export default function DashboardPage() {
  const { t, lang } = useI18n();
  const { month, monthId, months, isLoading: monthsLoading } = useMonth();
  const { manage, canSubmitExpense } = usePermissions();
  const { data, isLoading, error, refetch } = useDashboard(monthId);

  if (!monthsLoading && months.length === 0) return <StartFirstMonth />;

  const s = data?.summary;
  const loading = isLoading || monthsLoading;

  return (
    <>
      <PageHeader
        title={t("dashboard.title")}
        description={
          month && (
            <span className="inline-flex items-center gap-2">
              {month.label}
              <Badge variant={month.status === "open" ? "secondary" : "outline"}>{t(`months.status.${month.status}`)}</Badge>
            </span>
          )
        }
        actions={
          month?.status === "open" && (
            <>
              <Link href="/meals" className={buttonVariants({ variant: "outline" })}>
                <UtensilsCrossed /> {t("dashboard.enterMeals")}
              </Link>
              {canSubmitExpense && (
                <Link href="/expenses?new=1" className={buttonVariants()}>
                  <Plus /> {t("expenses.add")}
                </Link>
              )}
            </>
          )
        }
      />

      {error && <ErrorState error={error} onRetry={() => refetch()} />}

      {s && manage && s.pending_expense_count > 0 && (
        <Link
          href="/expenses?status=pending"
          className="mb-4 flex items-center gap-2 rounded-lg border border-status-warning/50 bg-status-warning/10 px-3 py-2 text-sm"
        >
          <ClipboardList className="size-4 shrink-0" />
          {t("dashboard.pendingApprovals", { count: s.pending_expense_count, amount: formatMoney(s.pending_expense_amount, lang) })}
        </Link>
      )}
      {s?.warnings.map((w) => (
        <div key={w} className="mb-4 flex items-center gap-2 rounded-lg border border-status-warning/50 bg-status-warning/10 px-3 py-2 text-sm">
          <AlertTriangle className="size-4 shrink-0" /> {w}
        </div>
      ))}

      {data?.my_balance && (
        <Card className="mb-4 border-primary/30 bg-primary/5 py-0">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm text-muted-foreground">{t("dashboard.myBalance")}</div>
              <div className="mt-1 flex items-center gap-3">
                <Money value={data.my_balance.balance} signed className="text-3xl font-semibold" />
                <BalanceBadge value={data.my_balance.balance} />
              </div>
            </div>
            <dl className="tabular grid grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">{t("summary.meals")}</dt>
                <dd className="font-medium">{formatNumber(data.my_balance.meals, lang)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("balance.credit")}</dt>
                <dd className="font-medium">{formatMoney(data.my_balance.total_credit, lang)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("balance.charges")}</dt>
                <dd className="font-medium">{formatMoney(data.my_balance.total_charges, lang)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label={t("summary.totalMeals")}
          icon={UtensilsCrossed}
          loading={loading}
          value={s && formatNumber(s.total_meals, lang)}
          hint={data?.today && t("dashboard.todayCount", { count: formatNumber(data.today.total, lang) })}
        />
        <StatCard
          label={t("summary.mealRate")}
          icon={Scale}
          loading={loading}
          emphasis
          value={s && formatMoney(s.meal_rate, lang)}
          hint={t("summary.perMeal")}
        />
        <StatCard
          label={t("summary.mealExpenses")}
          icon={ShoppingBasket}
          loading={loading}
          value={s && formatMoney(s.meal_pool, lang, { decimals: 0 })}
          hint={t("summary.inMealRate")}
        />
        <StatCard
          label={t("summary.otherCosts")}
          icon={Coins}
          loading={loading}
          value={s && formatMoney(Number(s.shared_expenses) + Number(s.split_bills), lang, { decimals: 0 })}
          hint={t("summary.otherCostsHint")}
        />
        <StatCard
          label={t("summary.deposits")}
          icon={HandCoins}
          loading={loading}
          value={s && formatMoney(s.net_deposits, lang, { decimals: 0 })}
          hint={s && Number(s.personal_contributions) > 0 ? t("summary.plusPersonal", { amount: formatMoney(s.personal_contributions, lang, { decimals: 0 }) }) : undefined}
        />
        <StatCard
          label={t("summary.cashInHand")}
          icon={PiggyBank}
          loading={loading}
          value={s && <Money value={s.cash_in_hand} />}
          hint={
            s && (
              <span className="inline-flex items-center gap-1">
                {s.balance_check_ok ? <CheckCircle2 className="size-3 text-text-good" /> : <AlertTriangle className="size-3 text-text-critical" />}
                {s.balance_check_ok ? t("summary.checkOk") : t("summary.checkFail")}
              </span>
            )
          }
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title={t("dashboard.dailyMeals")} className="lg:col-span-2">
          {loading ? <Skeleton className="h-56 w-full" /> : data && <DailyMealsChart data={data.daily_meals} today={data.today_date} />}
        </Section>
        <Section
          title={t("dashboard.todaysMeals")}
          action={<span className="text-xs text-muted-foreground">{data && formatDate(data.today_date, lang, "weekday")}</span>}
        >
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : data?.today ? (
            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                {MEAL_TYPES.map((mt) => (
                  <div key={mt} className="rounded-lg bg-muted/60 p-3">
                    <div className="tabular text-2xl font-semibold">{formatNumber(data.today![mt], lang)}</div>
                    <div className="text-xs text-muted-foreground">{t(`meals.${mt}`)}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <span className="text-muted-foreground">{t("dashboard.estimatedCost")}</span>
                <span className="tabular font-medium">
                  {s && formatMoney(Number(data.today.total) * Number(s.meal_rate), lang, { decimals: 0 })}
                </span>
              </div>
              <Link href="/meals" className={buttonVariants({ variant: "outline", size: "sm" })}>
                {t("dashboard.openMealSheet")}
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("dashboard.notThisMonth")}</p>
          )}
        </Section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section
          title={t("dashboard.memberBalances")}
          className="lg:col-span-2"
          action={
            <Link href="/reports" className="text-xs font-medium text-primary hover:underline">
              {t("dashboard.fullReport")}
            </Link>
          }
        >
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : s && s.members.length ? (
            <>
              <BalanceBars members={s.members} />
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm" style={{ background: "var(--diverge-pos)" }} /> {t("balance.receivableLong")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm" style={{ background: "var(--diverge-neg)" }} /> {t("balance.payableLong")}
                </span>
              </p>
            </>
          ) : (
            <EmptyState title={t("members.noneInMonth")} />
          )}
        </Section>
        <Section title={t("dashboard.spendingByCategory")}>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : s && s.category_totals.length ? (
            <CategoryBars totals={s.category_totals} />
          ) : (
            <p className="text-sm text-muted-foreground">{t("expenses.none")}</p>
          )}
        </Section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section
          title={t("dashboard.recentExpenses")}
          action={
            <Link href="/expenses" className="text-xs font-medium text-primary hover:underline">
              {t("common.viewAll")}
            </Link>
          }
        >
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : data?.recent_expenses.length ? (
            <ul className="divide-y">
              {data.recent_expenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{e.description || e.category_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(e.date, lang, "short")} · {e.category_name}
                      {e.purchaser_name && ` · ${e.purchaser_name}`}
                      {e.status !== "approved" && ` · ${t(`expenses.status.${e.status}`)}`}
                    </div>
                  </div>
                  <span className="tabular shrink-0 font-medium">{formatMoney(e.amount, lang)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("expenses.none")}</p>
          )}
        </Section>
        <Section title={t("dashboard.recentActivity")}>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : data?.recent_activity.length ? (
            <ul className="divide-y">
              {data.recent_activity.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    {a.summary}
                    {a.actor_name && <span className="text-muted-foreground"> — {a.actor_name}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(a.created_at, lang)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("dashboard.noActivity")}</p>
          )}
        </Section>
      </div>
      {!manage && !data?.my_balance && s && (
        <p className="mt-4 text-xs text-muted-foreground">{t("dashboard.noLinkedMember")}</p>
      )}
    </>
  );
}
