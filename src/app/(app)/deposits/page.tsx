"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useMonth } from "@/components/month-context";
import { ClosedMonthNotice, EmptyState, ErrorState, Money, PageHeader, Section, TableSkeleton } from "@/components/common";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Field, Segmented, SimpleSelect } from "@/components/common/form";
import { FormSheet } from "@/components/common/form-sheet";
import { StartFirstMonth } from "@/components/months/start-month";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError, api } from "@/lib/api/client";
import { qk, useApiMutation, useDeposits, useMonthMembers, useSummary } from "@/lib/api/hooks";
import type { Deposit } from "@/lib/api/types";
import { formatDate, formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { usePermissions } from "@/lib/use-permissions";
import { cn } from "@/lib/utils";

const METHODS = ["cash", "bkash", "nagad", "rocket", "bank", "other"] as const;
const PAGE_SIZE = 25;

const schema = z.object({
  member: z.string().min(1, "required"),
  date: z.string().min(1, "required"),
  amount: z.string().refine((v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0, "amount"),
  kind: z.enum(["deposit", "refund"]),
  method: z.enum(METHODS),
  note: z.string().max(255),
});
type Values = z.infer<typeof schema>;

function DepositForm({ deposit, presetMember, onClose }: { deposit: Deposit | null; presetMember?: number; onClose: () => void }) {
  const { t } = useI18n();
  const { month, monthId, defaultDate } = useMonth();
  const { data: monthMembers = [] } = useMonthMembers(monthId);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      member: deposit ? String(deposit.member) : presetMember ? String(presetMember) : "",
      date: deposit?.date ?? defaultDate,
      amount: deposit?.amount ?? "",
      kind: deposit?.kind ?? "deposit",
      method: deposit?.method ?? "cash",
      note: deposit?.note ?? "",
    },
  });

  const save = useApiMutation(
    (v: Values) => {
      const json = { ...v, member: Number(v.member), account: monthId };
      return deposit ? api(`deposits/${deposit.id}`, { method: "PATCH", json }) : api("deposits", { method: "POST", json });
    },
    { invalidate: [qk.month(monthId)], success: t("common.saved") },
  );
  const msg = (k?: string) => (k === "required" ? t("validation.required") : k === "amount" ? t("validation.amount") : k);

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={deposit ? t("deposits.edit") : t("deposits.add")}
      description={month?.label}
      pending={save.isPending}
      onSubmit={handleSubmit((v) =>
        save.mutate(v, {
          onSuccess: onClose,
          onError: (err) => {
            if (err instanceof ApiError) for (const [k, m] of Object.entries(err.fieldErrors)) setError(k as keyof Values, { message: m });
          },
        }),
      )}
    >
      <Controller
        control={control}
        name="kind"
        render={({ field }) => (
          <Segmented
            value={field.value}
            onChange={field.onChange}
            options={[
              { value: "deposit", label: t("deposits.kind.deposit") },
              { value: "refund", label: t("deposits.kind.refund") },
            ]}
          />
        )}
      />
      <Field label={t("common.member")} error={msg(errors.member?.message)}>
        <Controller
          control={control}
          name="member"
          render={({ field }) => (
            <SimpleSelect
              value={field.value}
              onChange={field.onChange}
              placeholder={t("common.selectMember")}
              invalid={!!errors.member}
              options={monthMembers.map((m) => ({ value: String(m.member), label: m.member_name }))}
            />
          )}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("common.amount")} htmlFor="amount" error={msg(errors.amount?.message)}>
          <Input id="amount" inputMode="decimal" placeholder="0" className="text-lg font-semibold" {...register("amount")} />
        </Field>
        <Field label={t("common.date")} htmlFor="date" error={msg(errors.date?.message)}>
          <Input id="date" type="date" min={month?.start_date} max={month?.end_date} {...register("date")} />
        </Field>
      </div>
      <Field label={t("deposits.method")}>
        <Controller
          control={control}
          name="method"
          render={({ field }) => (
            <div className="flex flex-wrap gap-1.5">
              {METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => field.onChange(m)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm",
                    field.value === m ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  {t(`deposits.methods.${m}`)}
                </button>
              ))}
            </div>
          )}
        />
      </Field>
      <Field label={t("common.note")} htmlFor="note">
        <Input id="note" placeholder={t("deposits.notePlaceholder")} {...register("note")} />
      </Field>
    </FormSheet>
  );
}

export default function DepositsPage() {
  const { t, lang } = useI18n();
  const { monthId, months, isLoading: monthsLoading, isClosed } = useMonth();
  const { canEdit } = usePermissions();
  const [member, setMember] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<{ deposit: Deposit | null; member?: number } | null>(null);
  const [deleting, setDeleting] = useState<Deposit | null>(null);
  const summary = useSummary(monthId);
  const { data, isLoading, error, refetch } = useDeposits(monthId, { member, page, page_size: PAGE_SIZE, ordering: "-date" });
  const del = useApiMutation((id: number) => api(`deposits/${id}`, { method: "DELETE" }), {
    invalidate: [qk.month(monthId)],
    success: t("common.deleted"),
  });

  if (!monthsLoading && months.length === 0) return <StartFirstMonth />;
  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  return (
    <>
      <PageHeader
        title={t("deposits.title")}
        description={t("deposits.subtitle")}
        actions={
          canEdit && (
            <Button onClick={() => setEditing({ deposit: null })}>
              <Plus /> {t("deposits.add")}
            </Button>
          )
        }
      />
      {isClosed && <ClosedMonthNotice />}

      <Section title={t("deposits.byMember")} className="mb-4">
        {summary.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {summary.data?.members.map((m) => (
              <button
                key={m.member_id}
                type="button"
                onClick={() => {
                  setMember(member === String(m.member_id) ? "" : String(m.member_id));
                  setPage(1);
                }}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors hover:bg-muted/60",
                  member === String(m.member_id) && "border-primary bg-primary/5",
                )}
              >
                <div className="truncate text-sm font-medium">{m.name}</div>
                <div className="tabular mt-1 text-lg font-semibold">{formatMoney(m.net_deposits, lang)}</div>
                <div className="text-xs text-muted-foreground">
                  {t("deposits.due")}: <Money value={Math.min(0, Number(m.balance))} />
                </div>
              </button>
            ))}
          </div>
        )}
      </Section>

      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <TableSkeleton />
      ) : data.results.length === 0 ? (
        <EmptyState
          title={t("deposits.none")}
          action={canEdit && <Button onClick={() => setEditing({ deposit: null, member: member ? Number(member) : undefined })}><Plus /> {t("deposits.add")}</Button>}
        />
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>{t("deposits.countLabel", { count: data.count })}</span>
            <span>
              {t("deposits.netTotal")}: <span className="tabular font-semibold text-foreground">{formatMoney(data.total_amount, lang)}</span>
            </span>
          </div>
          <Card className="py-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.date")}</TableHead>
                    <TableHead>{t("common.member")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("deposits.method")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("common.note")}</TableHead>
                    <TableHead className="text-right">{t("common.amount")}</TableHead>
                    {canEdit && <TableHead className="w-20" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(d.date, lang, "short")}</TableCell>
                      <TableCell className="font-medium">
                        {d.member_name}
                        {d.kind === "refund" && <Badge variant="outline" className="ml-2">{t("deposits.kind.refund")}</Badge>}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{t(`deposits.methods.${d.method}`)}</TableCell>
                      <TableCell className="hidden max-w-60 truncate text-muted-foreground md:table-cell">{d.note || "—"}</TableCell>
                      <TableCell className="text-right font-medium">
                        <Money value={d.kind === "refund" ? `-${d.amount}` : d.amount} />
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => setEditing({ deposit: d })} aria-label={t("common.edit")}>
                              <Pencil />
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(d)} aria-label={t("common.delete")}>
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label={t("common.previous")}>
                <ChevronLeft />
              </Button>
              <span className="text-sm">{t("common.pageOf", { page, total: totalPages })}</span>
              <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label={t("common.next")}>
                <ChevronRight />
              </Button>
            </div>
          )}
        </>
      )}

      {editing && <DepositForm deposit={editing.deposit} presetMember={editing.member} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("deposits.deleteTitle")}
        description={deleting && t("deposits.deleteBody", { amount: formatMoney(deleting.amount, lang), member: deleting.member_name })}
        confirmLabel={t("common.delete")}
        destructive
        pending={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </>
  );
}
