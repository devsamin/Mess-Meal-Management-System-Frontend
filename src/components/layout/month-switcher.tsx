"use client";

import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useMonth } from "@/components/month-context";
import { useI18n } from "@/lib/i18n/provider";
import { monthName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

/** Month navigation used by every page: previous / next arrows plus a dropdown. */
export function MonthSwitcher() {
  const { months, month, setMonthId, isLoading } = useMonth();
  const { t, lang } = useI18n();

  if (isLoading) return <Skeleton className="h-8 w-44" />;
  if (!month) return <span className="text-sm text-muted-foreground">{t("months.none")}</span>;

  // months are ordered newest first
  const idx = months.findIndex((m) => m.id === month.id);
  const older = months[idx + 1];
  const newer = months[idx - 1];
  const items = months.map((m) => ({ value: String(m.id), label: monthName(m.year, m.month, lang) }));

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={!older}
        onClick={() => older && setMonthId(older.id)}
        aria-label={t("months.previous")}
      >
        <ChevronLeft />
      </Button>
      <Select items={items} value={String(month.id)} onValueChange={(v) => v && setMonthId(Number(v))}>
        <SelectTrigger className="h-8 min-w-36 font-medium" aria-label={t("months.select")}>
          <SelectValue />
          {month.status === "closed" && <Lock className="size-3.5 text-muted-foreground" />}
        </SelectTrigger>
        <SelectContent>
          {items.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={!newer}
        onClick={() => newer && setMonthId(newer.id)}
        aria-label={t("months.next")}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
