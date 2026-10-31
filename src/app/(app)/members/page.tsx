"use client";

import { ImageIcon, MoreHorizontal, Pencil, Phone, Plus, Trash2, UserCheck, UserX } from "lucide-react";
import { useRef, useState } from "react";
import { useMonth } from "@/components/month-context";
import { EmptyState, ErrorState, PageHeader, TableSkeleton } from "@/components/common";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Field, Segmented } from "@/components/common/form";
import { FormSheet } from "@/components/common/form-sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api, fieldError, mediaUrl, toFormData } from "@/lib/api/client";
import { qk, useApiMutation, useMembers } from "@/lib/api/hooks";
import type { Member } from "@/lib/api/types";
import { formatDate, initials, todayISO } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { usePermissions } from "@/lib/use-permissions";

function MemberForm({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const { t } = useI18n();
  const { month } = useMonth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(member?.name ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [joined, setJoined] = useState(member?.joined_on ?? todayISO());
  const [notes, setNotes] = useState(member?.notes ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [withLogin, setWithLogin] = useState(!!member?.username);
  const [username, setUsername] = useState(member?.username ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"member" | "manager">(member?.role ?? "member");
  const [addToMonth, setAddToMonth] = useState(true);

  const save = useApiMutation(
    () => {
      const values: Record<string, unknown> = { name, phone, joined_on: joined, notes };
      if (photo) values.photo = photo;
      if (withLogin) {
        if (username !== (member?.username ?? "")) values.login_username = username;
        if (password) values.login_password = password;
        if (role !== member?.role) values.login_role = role;
      }
      if (!member && addToMonth && month?.status === "open") values.add_to_month = month.id;
      const form = toFormData(values);
      return member ? api(`members/${member.id}`, { method: "PATCH", form }) : api("members", { method: "POST", form });
    },
    { invalidate: [qk.members, qk.month(month?.id), qk.months], success: t("common.saved") },
  );

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={member ? t("members.edit") : t("members.add")}
      pending={save.isPending}
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        save.mutate(undefined, { onSuccess: onClose });
      }}
    >
      <div className="flex items-center gap-3">
        <Avatar className="size-14">
          {(photo || member?.photo) && <AvatarImage src={photo ? URL.createObjectURL(photo) : (mediaUrl(member!.photo) ?? undefined)} alt="" />}
          <AvatarFallback>{initials(name || "?")}</AvatarFallback>
        </Avatar>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <ImageIcon /> {t("members.photo")}
        </Button>
      </div>
      <Field label={t("members.name")} htmlFor="name" error={fieldError(save.error, "name")}>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus={!member} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("members.phone")} htmlFor="phone" error={fieldError(save.error, "phone")}>
          <Input id="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
        </Field>
        <Field label={t("members.joinedOn")} htmlFor="joined">
          <Input id="joined" type="date" value={joined} onChange={(e) => setJoined(e.target.value)} />
        </Field>
      </div>
      <Field label={t("common.notes")} htmlFor="notes">
        <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      {!member && month?.status === "open" && (
        <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
          {t("members.addToMonth", { month: month.label })}
          <Switch checked={addToMonth} onCheckedChange={setAddToMonth} />
        </label>
      )}
      <div className="rounded-lg border p-3">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            <span className="font-medium">{t("members.canLogin")}</span>
            <span className="block text-xs text-muted-foreground">{t("members.canLoginHint")}</span>
          </span>
          <Switch checked={withLogin} onCheckedChange={setWithLogin} disabled={!!member?.username} />
        </label>
        {withLogin && (
          <div className="mt-3 grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("login.username")} htmlFor="username" error={fieldError(save.error, "login_username")}>
                <Input id="username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} />
              </Field>
              <Field
                label={member?.username ? t("members.newPassword") : t("login.password")}
                htmlFor="password"
                error={fieldError(save.error, "login_password")}
              >
                <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
            </div>
            <Field label={t("members.role")}>
              <Segmented
                value={role}
                onChange={setRole}
                options={[
                  { value: "member", label: t("roles.member") },
                  { value: "manager", label: t("roles.manager") },
                ]}
              />
            </Field>
          </div>
        )}
      </div>
    </FormSheet>
  );
}

export default function MembersPage() {
  const { t, lang } = useI18n();
  const { month } = useMonth();
  const { manage } = usePermissions();
  const { data: members, isLoading, error, refetch } = useMembers();
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<Member | "new" | null>(null);
  const [confirm, setConfirm] = useState<{ member: Member; action: "deactivate" | "activate" | "delete" } | null>(null);

  const act = useApiMutation(
    ({ member, action }: { member: Member; action: "deactivate" | "activate" | "delete" }) =>
      action === "delete" ? api(`members/${member.id}`, { method: "DELETE" }) : api(`members/${member.id}/${action}`, { method: "POST" }),
    { invalidate: [qk.members, qk.month(month?.id), qk.months], success: t("common.done") },
  );

  const list = (members ?? []).filter((m) => showInactive || m.status === "active");
  const inactiveCount = (members ?? []).filter((m) => m.status === "inactive").length;

  return (
    <>
      <PageHeader
        title={t("members.title")}
        description={t("members.subtitle")}
        actions={
          manage && (
            <Button onClick={() => setEditing("new")}>
              <Plus /> {t("members.add")}
            </Button>
          )
        }
      />
      {inactiveCount > 0 && (
        <label className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={showInactive} onCheckedChange={setShowInactive} />
          {t("members.showInactive", { count: inactiveCount })}
        </label>
      )}

      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <TableSkeleton />
      ) : list.length === 0 ? (
        <EmptyState title={t("members.none")} action={manage && <Button onClick={() => setEditing("new")}><Plus /> {t("members.add")}</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((m) => (
            <Card key={m.id} className="flex-row items-center gap-3 px-4 py-3">
              <Avatar className="size-11">
                {m.photo && <AvatarImage src={mediaUrl(m.photo) ?? undefined} alt="" />}
                <AvatarFallback className="bg-primary/10 font-medium text-primary">{initials(m.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{m.name}</span>
                  {m.role === "manager" && <Badge variant="secondary">{t("roles.manager")}</Badge>}
                  {m.status === "inactive" && <Badge variant="outline">{t("members.status.inactive")}</Badge>}
                </div>
                <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {m.phone && (
                    <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 hover:underline">
                      <Phone className="size-3" /> {m.phone}
                    </a>
                  )}
                  <span>{t("members.since", { date: formatDate(m.joined_on, lang) })}</span>
                  {m.username && <span>@{m.username}</span>}
                </div>
              </div>
              {manage && (
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("common.actions")} />}>
                    <MoreHorizontal />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(m)}>
                      <Pencil /> {t("common.edit")}
                    </DropdownMenuItem>
                    {m.status === "active" ? (
                      <DropdownMenuItem onClick={() => setConfirm({ member: m, action: "deactivate" })}>
                        <UserX /> {t("members.deactivate")}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => setConfirm({ member: m, action: "activate" })}>
                        <UserCheck /> {t("members.activate")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setConfirm({ member: m, action: "delete" })}>
                      <Trash2 /> {t("common.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </Card>
          ))}
        </div>
      )}

      {editing && <MemberForm member={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm && t(`members.confirm.${confirm.action}.title`, { name: confirm.member.name })}
        description={confirm && t(`members.confirm.${confirm.action}.body`)}
        destructive={confirm?.action !== "activate"}
        pending={act.isPending}
        onConfirm={() => confirm && act.mutate(confirm, { onSuccess: () => setConfirm(null) })}
      />
    </>
  );
}
