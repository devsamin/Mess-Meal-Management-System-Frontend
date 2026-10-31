"use client";

import { CalendarPlus, Lock, LockOpen, Pencil, Trash2, UserPlus, UserX } from "lucide-react";
import { useState } from "react";
import { useMonth } from "@/components/month-context";
import { ClosedMonthNotice, EmptyState, ErrorState, Money, PageHeader, Section, TableSkeleton } from "@/components/common";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Field, Segmented, SimpleSelect } from "@/components/common/form";
import { FormSheet } from "@/components/common/form-sheet";
import { StartFirstMonth, StartMonthDialog } from "@/components/months/start-month";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api, fieldError } from "@/lib/api/client";
import { qk, useApiMutation, useMembers, useMonthMembers } from "@/lib/api/hooks";
import type { MonthAccount, MonthMember } from "@/lib/api/types";
import { formatDate, formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { usePermissions } from "@/lib/use-permissions";

function MembershipSheet({
  month,
  membership,
  onClose,
}: {
  month: MonthAccount;
  membership: MonthMember | "new";
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { data: members = [] } = useMembers();
  const { data: enrolled = [] } = useMonthMembers(month.id);
  const isNew = membership === "new";
  const [memberId, setMemberId] = useState(isNew ? "" : String(membership.member));
  const [joined, setJoined] = useState(isNew ? month.start_date : membership.joined_on);
  const [left, setLeft] = useState(isNew ? "" : (membership.left_on ?? ""));
  const [opening, setOpening] = useState(isNew ? "0" : membership.opening_balance);

  const save = useApiMutation(
    () => {
      const body = { member: Number(memberId), joined_on: joined, left_on: left || null, opening_balance: opening || "0" };
      return isNew
        ? api(`months/${month.id}/members`, { method: "POST", json: body })
        : api(`month-members/${membership.id}`, { method: "PATCH", json: body });
    },
    { invalidate: [qk.month(month.id), qk.months], success: t("common.saved") },
  );

  const available = members.filter(
    (m) => m.status === "active" && !enrolled.some((e) => e.member === m.id),
  );

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? t("months.addMember") : membership.member_name}
      description={month.label}
      pending={save.isPending}
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(undefined, { onSuccess: onClose });
      }}
    >
      {isNew && (
        <Field label={t("common.member")} error={fieldError(save.error, "member")}>
          <SimpleSelect
            value={memberId}
            onChange={setMemberId}
            placeholder={t("common.selectMember")}
            options={available.map((m) => ({ value: String(m.id), label: m.name }))}
          />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("months.joinedOn")}>
          <Input type="date" value={joined} min={month.start_date} max={month.end_date} onChange={(e) => setJoined(e.target.value)} />
        </Field>
        <Field label={t("months.leftOn")} hint={t("months.leftOnHint")}>
          <Input type="date" value={left} min={joined} max={month.end_date} onChange={(e) => setLeft(e.target.value)} />
        </Field>
      </div>
      <Field label={t("months.openingBalance")} hint={t("months.openingBalanceHint")}>
        <Input type="number" inputMode="decimal" step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)} />
      </Field>
    </FormSheet>
  );
}

function MonthSettingsSheet({ month, onClose }: { month: MonthAccount; onClose: () => void }) {
  const { t } = useI18n();
  const [split, setSplit] = useState(month.fixed_cost_split);
  const [notes, setNotes] = useState(month.notes);
  const save = useApiMutation(
    () => api(`months/${month.id}`, { method: "PATCH", json: { fixed_cost_split: split, notes } }),
    { invalidate: [qk.months, qk.month(month.id)], success: t("common.saved") },
  );
  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("months.settings")}
      description={month.label}
      pending={save.isPending}
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(undefined, { onSuccess: onClose });
      }}
    >
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
      <Field label={t("common.notes")}>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
      </Field>
    </FormSheet>
  );
}

export default function MonthsPage() {
  const { t, lang } = useI18n();
  const { months, month, setMonthId, isLoading, isClosed } = useMonth();
  const { manage, canEdit } = usePermissions();
  const memberships = useMonthMembers(month?.id);
  const [startOpen, setStartOpen] = useState(false);
  const [editing, setEditing] = useState<MonthMember | "new" | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "close" | "reopen" | "delete" | { remove: MonthMember }>(null);

  const action = useApiMutation(
    async (kind: "close" | "reopen" | "delete" | { remove: MonthMember }) => {
      if (kind === "delete") return api(`months/${month!.id}`, { method: "DELETE" });
      if (typeof kind === "object") return api(`month-members/${kind.remove.id}`, { method: "DELETE" });
      return api(`months/${month!.id}/${kind}`, { method: "POST" });
    },
    { invalidate: [qk.months, qk.month(month?.id)], success: t("common.done") },
  );

  if (!isLoading && months.length === 0) return <StartFirstMonth />;

  return (
    <>
      <PageHeader
        title={t("months.title")}
        description={t("months.subtitle")}
        actions={
          manage && (
            <Button onClick={() => setStartOpen(true)}>
              <CalendarPlus /> {t("months.startTitle")}
            </Button>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Section title={t("months.allMonths")}>
          <ul className="grid gap-1">
            {months.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => setMonthId(m.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-muted ${m.id === month?.id ? "bg-muted font-medium" : ""}`}
                >
                  <span>{m.label}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {t("months.memberCount", { count: m.member_count })}
                    {m.status === "closed" ? <Lock className="size-3.5" /> : <Badge variant="secondary">{t("months.status.open")}</Badge>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Section>

        {month && (
          <div className="grid content-start gap-4">
            {isClosed && <ClosedMonthNotice />}
            <Section
              title={month.label}
              action={
                manage && (
                  <div className="flex flex-wrap gap-2">
                    {canEdit && (
                      <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                        <Pencil /> {t("months.settings")}
                      </Button>
                    )}
                    {isClosed ? (
                      <Button variant="outline" size="sm" onClick={() => setConfirm("reopen")}>
                        <LockOpen /> {t("months.reopen")}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setConfirm("close")}>
                        <Lock /> {t("months.close")}
                      </Button>
                    )}
                  </div>
                )
              }
            >
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">{t("common.status")}</dt>
                  <dd className="font-medium">{t(`months.status.${month.status}`)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("months.period")}</dt>
                  <dd className="font-medium">
                    {formatDate(month.start_date, lang, "short")} – {formatDate(month.end_date, lang, "short")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("months.fixedCostSplit")}</dt>
                  <dd className="font-medium">{t(`months.split.${month.fixed_cost_split}`)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("months.closedAt")}</dt>
                  <dd className="font-medium">
                    {month.closed_at ? `${formatDateTime(month.closed_at, lang)} · ${month.closed_by_name ?? ""}` : "—"}
                  </dd>
                </div>
              </dl>
              {month.notes && <p className="mt-3 rounded-md bg-muted/50 p-3 text-sm">{month.notes}</p>}
            </Section>

            <Section
              title={t("months.membersThisMonth")}
              action={
                canEdit && (
                  <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
                    <UserPlus /> {t("months.addMember")}
                  </Button>
                )
              }
            >
              {memberships.isLoading ? (
                <TableSkeleton rows={5} />
              ) : memberships.error ? (
                <ErrorState error={memberships.error} onRetry={() => memberships.refetch()} />
              ) : !memberships.data?.length ? (
                <EmptyState title={t("members.noneInMonth")} />
              ) : (
                <div className="-mx-4 overflow-x-auto sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("common.member")}</TableHead>
                        <TableHead>{t("months.joinedOn")}</TableHead>
                        <TableHead>{t("months.leftOn")}</TableHead>
                        <TableHead className="text-right">{t("months.openingBalance")}</TableHead>
                        {isClosed && <TableHead className="text-right">{t("months.closingBalance")}</TableHead>}
                        {canEdit && <TableHead className="w-20" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {memberships.data.map((mm) => (
                        <TableRow key={mm.id}>
                          <TableCell className="font-medium">
                            {mm.member_name}
                            {mm.member_status === "inactive" && (
                              <Badge variant="outline" className="ml-2">{t("members.status.inactive")}</Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(mm.joined_on, lang, "short")}</TableCell>
                          <TableCell>{mm.left_on ? formatDate(mm.left_on, lang, "short") : "—"}</TableCell>
                          <TableCell className="text-right"><Money value={mm.opening_balance} signed /></TableCell>
                          {isClosed && (
                            <TableCell className="text-right">
                              <Money value={mm.closing_balance} signed />
                            </TableCell>
                          )}
                          {canEdit && (
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(mm)} aria-label={t("common.edit")}>
                                  <Pencil />
                                </Button>
                                <Button variant="ghost" size="icon-sm" onClick={() => setConfirm({ remove: mm })} aria-label={t("common.remove")}>
                                  <UserX />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Section>

            {manage && !isClosed && month.member_count === 0 && (
              <Button variant="destructive" className="justify-self-start" onClick={() => setConfirm("delete")}>
                <Trash2 /> {t("months.deleteEmpty")}
              </Button>
            )}
          </div>
        )}
      </div>

      {startOpen && <StartMonthDialog open={startOpen} onOpenChange={setStartOpen} />}
      {editing && month && <MembershipSheet month={month} membership={editing} onClose={() => setEditing(null)} />}
      {settingsOpen && month && <MonthSettingsSheet month={month} onClose={() => setSettingsOpen(false)} />}
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm === "close"
            ? t("months.closeConfirmTitle", { month: month?.label ?? "" })
            : confirm === "reopen"
              ? t("months.reopenConfirmTitle", { month: month?.label ?? "" })
              : confirm === "delete"
                ? t("months.deleteEmpty")
                : t("months.removeMemberTitle")
        }
        description={
          confirm === "close"
            ? t("months.closeConfirmBody")
            : confirm === "reopen"
              ? t("months.reopenConfirmBody")
              : confirm === "delete"
                ? t("months.deleteConfirmBody")
                : t("months.removeMemberBody")
        }
        destructive={confirm === "delete" || typeof confirm === "object"}
        pending={action.isPending}
        onConfirm={() => confirm && action.mutate(confirm, { onSuccess: () => setConfirm(null) })}
      />
    </>
  );
}
