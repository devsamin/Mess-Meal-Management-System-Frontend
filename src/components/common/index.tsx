"use client";

import { AlertCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Inbox, Lock, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatMoney, toNumber } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Amount with sign-aware coloring; meaning is also carried by the sign and label, not color alone. */
export function Money({
  value,
  signed,
  tone = "auto",
  className,
}: {
  value: string | number | null | undefined;
  signed?: boolean;
  tone?: "auto" | "plain";
  className?: string;
}) {
  const { lang } = useI18n();
  const n = toNumber(value);
  return (
    <span
      className={cn(
        "tabular whitespace-nowrap",
        tone === "auto" && n > 0 && signed && "text-text-good",
        tone === "auto" && n < 0 && "text-text-critical",
        className,
      )}
    >
      {formatMoney(value, lang, { signed })}
    </span>
  );
}

export function BalanceBadge({ value }: { value: string }) {
  const { t } = useI18n();
  const n = toNumber(value);
  if (n > 0)
    return (
      <Badge variant="outline" className="gap-1 border-status-good/40 text-text-good">
        <ArrowDownLeft className="size-3" /> {t("balance.receivable")}
      </Badge>
    );
  if (n < 0)
    return (
      <Badge variant="outline" className="gap-1 border-status-critical/40 text-text-critical">
        <ArrowUpRight className="size-3" /> {t("balance.payable")}
      </Badge>
    );
  return (
    <Badge variant="outline" className="gap-1">
      <CheckCircle2 className="size-3" /> {t("balance.settled")}
    </Badge>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  loading,
  emphasis,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  loading?: boolean;
  emphasis?: boolean;
}) {
  return (
    <Card className={cn("gap-0 py-0", emphasis && "border-primary/40 bg-primary/5")}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
          <span className="truncate">{label}</span>
          {Icon && <Icon className="size-4 shrink-0 opacity-70" />}
        </div>
        {loading ? (
          <Skeleton className="mt-2 h-7 w-24" />
        ) : (
          <div className="tabular mt-1.5 truncate text-2xl font-semibold tracking-tight">{value}</div>
        )}
        {hint && !loading && <div className="mt-1 truncate text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-muted p-3">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  const message = error instanceof ApiError ? error.message : t("common.loadError");
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <AlertCircle className="size-6 text-destructive" />
      <p className="text-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function ClosedMonthNotice() {
  const { t } = useI18n();
  return (
    <div className="no-print mb-4 flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
      <Lock className="size-4 shrink-0" />
      {t("months.closedNotice")}
    </div>
  );
}

export function Section({
  title,
  action,
  children,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-3", className)}>
      <div className="flex items-center justify-between gap-2 px-4 sm:px-6">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        {action}
      </div>
      <CardContent className="px-4 sm:px-6">{children}</CardContent>
    </Card>
  );
}
