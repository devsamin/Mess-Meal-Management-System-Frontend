"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMonths } from "@/lib/api/hooks";
import type { MonthAccount } from "@/lib/api/types";
import { monthName, todayISO } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";

interface MonthContextValue {
  months: MonthAccount[];
  month: MonthAccount | undefined;
  monthId: number | undefined;
  setMonthId: (id: number) => void;
  isLoading: boolean;
  isClosed: boolean;
  /** A sensible default date inside the selected month (today if it falls inside). */
  defaultDate: string;
}

const MonthContext = createContext<MonthContextValue | null>(null);
const STORAGE_KEY = "mm_month";

export function MonthProvider({ children }: { children: ReactNode }) {
  const { data: raw, isLoading } = useMonths();
  const { lang } = useI18n();
  // Localize labels once here so every page shows "অক্টোবর ২০২৬" in Bangla.
  const months = useMemo(
    () => (raw ?? []).map((m) => ({ ...m, label: monthName(m.year, m.month, lang) })),
    [raw, lang],
  );
  const [selected, setSelected] = useState<number | undefined>(undefined);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(STORAGE_KEY));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the saved month after mount
      if (saved) setSelected(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const month = useMemo(() => {
    if (!months.length) return undefined;
    const chosen = months.find((m) => m.id === selected);
    if (chosen) return chosen;
    const today = todayISO();
    return months.find((m) => m.start_date <= today && today <= m.end_date) ?? months[0];
  }, [months, selected]);

  const setMonthId = useCallback((id: number) => {
    setSelected(id);
    try {
      localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      /* ignore */
    }
  }, []);

  const defaultDate = useMemo(() => {
    const today = todayISO();
    if (!month) return today;
    if (today < month.start_date) return month.start_date;
    if (today > month.end_date) return month.end_date;
    return today;
  }, [month]);

  const value = useMemo(
    () => ({
      months,
      month,
      monthId: month?.id,
      setMonthId,
      isLoading,
      isClosed: month?.status === "closed",
      defaultDate,
    }),
    [months, month, setMonthId, isLoading, defaultDate],
  );
  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>;
}

export function useMonth() {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error("useMonth must be used inside MonthProvider");
  return ctx;
}
