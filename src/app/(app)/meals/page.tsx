"use client";

import { useState } from "react";
import { useMonth } from "@/components/month-context";
import { ClosedMonthNotice, PageHeader } from "@/components/common";
import { DailyEntry } from "@/components/meals/daily-entry";
import { MonthlyGrid } from "@/components/meals/monthly-grid";
import { StartFirstMonth } from "@/components/months/start-month";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n/provider";
import { usePermissions } from "@/lib/use-permissions";

export default function MealsPage() {
  const { t } = useI18n();
  const { month, months, isLoading, isClosed, defaultDate } = useMonth();
  const { manage, canEnterOwnMeals } = usePermissions();
  const [tab, setTab] = useState<string>("day");
  // Keep the chosen date per month; fall back to today (or the nearest day inside the month).
  const [picked, setPicked] = useState<{ monthId: number; date: string } | null>(null);
  const date = picked && picked.monthId === month?.id ? picked.date : defaultDate;

  if (!isLoading && months.length === 0) return <StartFirstMonth />;

  return (
    <>
      <PageHeader
        title={t("meals.title")}
        description={manage ? t("meals.subtitleManager") : canEnterOwnMeals ? t("meals.subtitleMember") : t("meals.subtitleReadOnly")}
      />
      {isClosed && <ClosedMonthNotice />}
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList>
          <TabsTrigger value="day">{t("meals.dailyEntry")}</TabsTrigger>
          <TabsTrigger value="month">{t("meals.monthlySheet")}</TabsTrigger>
        </TabsList>
        <TabsContent value="day" className="mt-4">
          {month && <DailyEntry date={date} onDateChange={(d) => setPicked({ monthId: month.id, date: d })} />}
        </TabsContent>
        <TabsContent value="month" className="mt-4">
          <MonthlyGrid
            onPickDate={(d) => {
              if (month) setPicked({ monthId: month.id, date: d });
              setTab("day");
            }}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
