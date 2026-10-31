"use client";

import { CalendarPlus } from "lucide-react";
import { useState } from "react";
import { useMonth } from "@/components/month-context";
import { EmptyState } from "@/components/common";
import { Field, Segmented, SimpleSelect } from "@/components/common/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { qk, useApiMutation, useMembers } from "@/lib/api/hooks";
import type { MonthAccount } from "@/lib/api/types";
import { monthName, todayISO } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { usePermissions } from "@/lib/use-permissions";

function nextMonthAfter(months: MonthAccount[]) {
  if (!months.length) {
    const [y, m] = todayISO().split("-").map(Number);
    return { year: y, month: m };
  }
  const latest = months[0];
  return latest.month === 12 ? { year: latest.year + 1, month: 1 } : { year: latest.year, month: latest.month + 1 };
}

export function StartMonthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, lang } = useI18n();
  const { months, setMonthId } = useMonth();
  const { data: members = [] } = useMembers();
  const suggested = nextMonthAfter(months);
  const [year, setYear] = useState(suggested.year);
  const [month, setMonth] = useState(suggested.month);
  const [copyFrom, setCopyFrom] = useState(months[0] ? String(months[0].id) : "");
  const [carry, setCarry] = useState(true);
  const [split, setSplit] = useState<"equal" | "by_days">(months[0]?.fixed_cost_split ?? "equal");

  const create = useApiMutation(
    () =>
      api<MonthAccount>("months", {
        method: "POST",
        json: {
          year,
          month,
          copy_from: copyFrom ? Number(copyFrom) : null,
          carry_forward: carry && !!copyFrom,
          fixed_cost_split: split,
          // no source month: enrol every active member explicitly
          ...(copyFrom ? {} : { member_ids: members.filter((m) => m.status === "active").map((m) => m.id) }),
        },
      }),
    {
      invalidate: [qk.months],
      success: (m) => t("months.started", { month: m.label }),
    },
  );

  const submit = () =>
    create.mutate(undefined, {
      onSuccess: (m) => {
        setMonthId(m.id);
        onOpenChange(false);
      },
    });

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: monthName(2026, i + 1, lang).split(" ")[0],
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("months.startTitle")}</DialogTitle>
          <DialogDescription>{t("months.startHelp")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("months.month")}>
              <SimpleSelect value={String(month)} onChange={(v) => setMonth(Number(v))} options={monthOptions} />
            </Field>
            <Field label={t("months.year")}>
              <Input type="number" inputMode="numeric" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </Field>
          </div>
          {months.length > 0 && (
            <Field label={t("months.copyFrom")} hint={t("months.copyFromHint")}>
              <SimpleSelect
                value={copyFrom}
                onChange={setCopyFrom}
                options={[
                  { value: "", label: t("months.allActiveMembers") },
                  ...months.map((m) => ({ value: String(m.id), label: monthName(m.year, m.month, lang) })),
                ]}
              />
            </Field>
          )}
          {copyFrom && (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={carry} onCheckedChange={(c) => setCarry(c)} className="mt-0.5" />
              <span>
                {t("months.carryForward")}
                <span className="block text-xs text-muted-foreground">{t("months.carryForwardHint")}</span>
              </span>
            </label>
          )}
          <Field label={t("months.fixedCostSplit")} hint={t("months.fixedCostSplitHint")}>
            <Segmented
              value={split}
              onChange={setSplit}
              options={[
                { value: "equal", label: t("months.split.equal") },
                { value: "by_days", label: t("months.split.by_days") },
              ]}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? t("common.working") : t("months.start")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StartFirstMonth() {
  const { t } = useI18n();
  const { manage } = usePermissions();
  const [open, setOpen] = useState(false);
  return (
    <>
      <EmptyState
        icon={CalendarPlus}
        title={t("months.noneTitle")}
        description={manage ? t("months.noneManager") : t("months.noneMember")}
        action={
          manage && (
            <Button onClick={() => setOpen(true)}>
              <CalendarPlus /> {t("months.startTitle")}
            </Button>
          )
        }
      />
      {open && <StartMonthDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}
