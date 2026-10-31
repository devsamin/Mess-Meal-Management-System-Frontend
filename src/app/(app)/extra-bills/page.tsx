"use client";

import { Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { useState } from "react";
import { useMonth } from "@/components/month-context";
import { ClosedMonthNotice, EmptyState, ErrorState, Money, PageHeader, TableSkeleton } from "@/components/common";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Field, Segmented, SimpleSelect } from "@/components/common/form";
import { FormSheet } from "@/components/common/form-sheet";
import { StartFirstMonth } from "@/components/months/start-month";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api, fieldError } from "@/lib/api/client";
import { qk, useApiMutation, useExtraBills, useMonthMembers } from "@/lib/api/hooks";
import type { ExtraBill, PaymentSource } from "@/lib/api/types";
import { formatDate, formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { usePermissions } from "@/lib/use-permissions";

const toPaisa = (v: string) => Math.round(Number(v || 0) * 100);
const isAmount = (v: string) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0;

function BillForm({ bill, onClose }: { bill: ExtraBill | null; onClose: () => void }) {
  const { t, lang } = useI18n();
  const { month, monthId, defaultDate } = useMonth();
  const { data: monthMembers = [] } = useMonthMembers(monthId);

  const [title, setTitle] = useState(bill?.title ?? "");
  const [billRef, setBillRef] = useState(bill?.bill_ref ?? "");
  const [date, setDate] = useState(bill?.date ?? defaultDate);
  const [amount, setAmount] = useState(bill?.amount ?? "");
  const [description, setDescription] = useState(bill?.description ?? "");
  const [source, setSource] = useState<PaymentSource>(bill?.payment_source ?? "fund");
  const [paidBy, setPaidBy] = useState(bill?.paid_by ? String(bill.paid_by) : "");
  const [inRate, setInRate] = useState(bill?.include_in_meal_rate ?? false);
  const [mode, setMode] = useState<"equal" | "custom">(bill?.split_mode ?? "equal");
  const [selected, setSelected] = useState<Record<number, string>>(() =>
    bill ? Object.fromEntries(bill.shares.map((s) => [s.member, s.amount])) : {},
  );
  const [touched, setTouched] = useState(false);

  // New bills start with every member of the month selected.
  const allSelected = !bill && !touched && Object.keys(selected).length === 0;
  const selection: Record<number, string> = allSelected
    ? Object.fromEntries(monthMembers.map((m) => [m.member, ""]))
    : selected;
  const ids = Object.keys(selection).map(Number);

  const customTotal = ids.reduce((s, id) => s + toPaisa(selection[id]), 0);
  const customMismatch = mode === "custom" && !inRate && isAmount(amount) && customTotal !== toPaisa(amount);

  const toggle = (id: number, on: boolean) => {
    setTouched(true);
    const next = { ...selection };
    if (on) next[id] = next[id] ?? "";
    else delete next[id];
    setSelected(next);
  };

  const save = useApiMutation(
    () => {
      const json = {
        account: monthId,
        title,
        bill_ref: billRef,
        date,
        amount,
        description,
        payment_source: source,
        paid_by: source === "personal" ? Number(paidBy) || null : null,
        include_in_meal_rate: inRate,
        split_mode: mode,
        share_inputs: inRate ? [] : ids.map((id) => (mode === "custom" ? { member: id, amount: selection[id] || "0" } : { member: id })),
      };
      return bill ? api(`extra-bills/${bill.id}`, { method: "PATCH", json }) : api("extra-bills", { method: "POST", json });
    },
    { invalidate: [qk.month(monthId)], success: t("common.saved") },
  );

  const perHead = ids.length && isAmount(amount) ? Number(amount) / ids.length : 0;

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={bill ? t("bills.edit") : t("bills.add")}
      description={month?.label}
      pending={save.isPending}
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !isAmount(amount) || customMismatch || (!inRate && ids.length === 0)) return;
        save.mutate(undefined, { onSuccess: onClose });
      }}
    >
      <Field label={t("bills.titleField")} htmlFor="title" error={(!title.trim() && save.isError ? t("validation.required") : undefined) ?? fieldError(save.error, "title")}>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("bills.titlePlaceholder")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("common.amount")} htmlFor="amount" error={amount && !isAmount(amount) ? t("validation.amount") : fieldError(save.error, "amount")}>
          <Input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-lg font-semibold" />
        </Field>
        <Field label={t("common.date")} htmlFor="date">
          <Input id="date" type="date" value={date} min={month?.start_date} max={month?.end_date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("bills.billRef")} htmlFor="ref">
          <Input id="ref" value={billRef} onChange={(e) => setBillRef(e.target.value)} placeholder="DESCO-1026" />
        </Field>
        <Field label={t("common.note")} htmlFor="desc">
          <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </div>
      <Field label={t("expenses.paidFrom")}>
        <Segmented
          value={source}
          onChange={setSource}
          options={[
            { value: "fund", label: t("expenses.source.fund") },
            { value: "personal", label: t("bills.paidByMember") },
          ]}
        />
      </Field>
      {source === "personal" && (
        <Field label={t("bills.paidBy")} error={fieldError(save.error, "paid_by")}>
          <SimpleSelect
            value={paidBy}
            onChange={setPaidBy}
            placeholder={t("common.selectMember")}
            options={monthMembers.map((m) => ({ value: String(m.member), label: m.member_name }))}
          />
        </Field>
      )}
      <label className="flex items-start justify-between gap-3 rounded-lg border p-3">
        <span className="text-sm">
          <span className="font-medium">{t("expenses.includeInMealRate")}</span>
          <span className="block text-xs text-muted-foreground">{t("bills.inRateHint")}</span>
        </span>
        <Switch checked={inRate} onCheckedChange={setInRate} />
      </label>

      {!inRate && (
        <Field label={t("bills.responsible")} error={fieldError(save.error, "share_inputs") ?? (ids.length === 0 ? t("bills.pickMembers") : undefined)}>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: "equal", label: t("bills.split.equal") },
              { value: "custom", label: t("bills.split.custom") },
            ]}
          />
          <ul className="mt-2 divide-y rounded-lg border">
            {monthMembers.map((m) => {
              const on = m.member in selection;
              return (
                <li key={m.member} className="flex items-center gap-3 px-3 py-2">
                  <Checkbox checked={on} onCheckedChange={(c) => toggle(m.member, c)} aria-label={m.member_name} />
                  <span className="flex-1 text-sm">{m.member_name}</span>
                  {on &&
                    (mode === "custom" ? (
                      <Input
                        inputMode="decimal"
                        className="h-8 w-28 text-right"
                        value={selection[m.member]}
                        onChange={(e) => {
                          setTouched(true);
                          setSelected({ ...selection, [m.member]: e.target.value });
                        }}
                        aria-label={t("common.amount")}
                      />
                    ) : (
                      <span className="tabular text-sm text-muted-foreground">≈ {formatMoney(perHead, lang)}</span>
                    ))}
                </li>
              );
            })}
          </ul>
          {mode === "custom" && (
            <p className={`text-xs ${customMismatch ? "text-destructive" : "text-muted-foreground"}`}>
              {t("bills.customTotal", { total: formatMoney(customTotal / 100, lang), amount: formatMoney(amount || 0, lang) })}
            </p>
          )}
        </Field>
      )}
    </FormSheet>
  );
}

export default function ExtraBillsPage() {
  const { t, lang } = useI18n();
  const { monthId, months, isLoading: monthsLoading, isClosed } = useMonth();
  const { canEdit } = usePermissions();
  const { data, isLoading, error, refetch } = useExtraBills(monthId);
  const [editing, setEditing] = useState<ExtraBill | "new" | null>(null);
  const [deleting, setDeleting] = useState<ExtraBill | null>(null);
  const del = useApiMutation((id: number) => api(`extra-bills/${id}`, { method: "DELETE" }), {
    invalidate: [qk.month(monthId)],
    success: t("common.deleted"),
  });

  if (!monthsLoading && months.length === 0) return <StartFirstMonth />;

  return (
    <>
      <PageHeader
        title={t("bills.title")}
        description={t("bills.subtitle")}
        actions={
          canEdit && (
            <Button onClick={() => setEditing("new")}>
              <Plus /> {t("bills.add")}
            </Button>
          )
        }
      />
      {isClosed && <ClosedMonthNotice />}

      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <TableSkeleton rows={4} />
      ) : data.results.length === 0 ? (
        <EmptyState icon={Receipt} title={t("bills.none")} description={t("bills.noneHint")} />
      ) : (
        <>
          <p className="mb-2 text-sm text-muted-foreground">
            {t("common.total")}: <span className="tabular font-semibold text-foreground">{formatMoney(data.total_amount, lang)}</span>
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {data.results.map((b) => (
              <Card key={b.id} className="py-0">
                <CardContent className="grid gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{b.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(b.date, lang)}
                        {b.bill_ref && ` · #${b.bill_ref}`}
                        {" · "}
                        {b.payment_source === "fund" ? t("expenses.source.fund") : t("bills.paidByName", { name: b.paid_by_name ?? "" })}
                      </div>
                    </div>
                    <div className="text-right">
                      <Money value={b.amount} tone="plain" className="text-lg font-semibold" />
                      {b.per_head && <div className="text-xs text-muted-foreground">{t("bills.perHead", { amount: formatMoney(b.per_head, lang) })}</div>}
                    </div>
                  </div>
                  {b.description && <p className="text-sm text-muted-foreground">{b.description}</p>}
                  {b.include_in_meal_rate ? (
                    <Badge variant="secondary" className="justify-self-start">{t("bills.inMealRate")}</Badge>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {b.shares.map((s) => (
                        <Badge key={s.member} variant="outline" className="tabular">
                          {s.member_name}: {formatMoney(s.amount, lang)}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {canEdit && (
                    <div className="flex justify-end gap-1 border-t pt-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(b)}>
                        <Pencil /> {t("common.edit")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleting(b)}>
                        <Trash2 /> {t("common.delete")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {editing && <BillForm bill={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("bills.deleteTitle")}
        description={deleting?.title}
        confirmLabel={t("common.delete")}
        destructive
        pending={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  );
}
