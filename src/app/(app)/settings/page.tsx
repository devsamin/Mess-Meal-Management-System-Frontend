"use client";

import { Plus, Save } from "lucide-react";
import { useState } from "react";
import { ErrorState, PageHeader, Section, TableSkeleton } from "@/components/common";
import { Field, Segmented } from "@/components/common/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, fieldError } from "@/lib/api/client";
import { qk, useApiMutation, useCategories, useMenu, useSettings } from "@/lib/api/hooks";
import { MEAL_TYPES, type ExpenseCategory, type MessSettings } from "@/lib/api/types";
import type { Lang } from "@/lib/format";
import { useI18n } from "@/lib/i18n/provider";
import { usePermissions } from "@/lib/use-permissions";

function GeneralSettings({ settings, canEdit }: { settings: MessSettings; canEdit: boolean }) {
  const { t } = useI18n();
  const [form, setForm] = useState(settings);
  const save = useApiMutation(() => api("settings", { method: "PATCH", json: form }), {
    invalidate: [qk.settings, qk.me],
    success: t("common.saved"),
  });
  const toggle = (key: keyof MessSettings, label: string, hint: string) => (
    <label className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <span className="text-sm">
        <span className="font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={!!form[key]} disabled={!canEdit} onCheckedChange={(c) => setForm({ ...form, [key]: c })} />
    </label>
  );
  return (
    <Section title={t("settings.general")}>
      <div className="grid max-w-xl gap-3">
        <Field label={t("settings.messName")} htmlFor="mess-name">
          <Input id="mess-name" value={form.name} disabled={!canEdit} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        {toggle("members_can_view_all", t("settings.viewAll"), t("settings.viewAllHint"))}
        {toggle("allow_member_meal_entry", t("settings.memberMeals"), t("settings.memberMealsHint"))}
        {toggle("allow_member_expense_submit", t("settings.memberExpenses"), t("settings.memberExpensesHint"))}
        <Field label={t("settings.editDays")} hint={t("settings.editDaysHint")} htmlFor="edit-days">
          <Input
            id="edit-days"
            type="number"
            min={0}
            max={31}
            className="w-28"
            disabled={!canEdit}
            value={form.member_meal_edit_days}
            onChange={(e) => setForm({ ...form, member_meal_edit_days: Number(e.target.value) })}
          />
        </Field>
        {canEdit && (
          <Button className="justify-self-start" onClick={() => save.mutate(undefined)} disabled={save.isPending}>
            <Save /> {t("common.save")}
          </Button>
        )}
      </div>
    </Section>
  );
}

function CategoryRow({ category, canEdit }: { category: ExpenseCategory; canEdit: boolean }) {
  const { t } = useI18n();
  const update = useApiMutation(
    (patch: Partial<ExpenseCategory>) => api(`expense-categories/${category.id}`, { method: "PATCH", json: patch }),
    { invalidate: [qk.categories], success: t("common.saved") },
  );
  return (
    <TableRow>
      <TableCell className="font-medium">{category.name}</TableCell>
      <TableCell>
        <Switch
          checked={category.include_in_meal_rate}
          disabled={!canEdit || update.isPending}
          onCheckedChange={(c) => update.mutate({ include_in_meal_rate: c })}
          aria-label={t("expenses.includeInMealRate")}
        />
      </TableCell>
      <TableCell>
        <Switch
          checked={category.is_active}
          disabled={!canEdit || update.isPending}
          onCheckedChange={(c) => update.mutate({ is_active: c })}
          aria-label={t("settings.active")}
        />
      </TableCell>
    </TableRow>
  );
}

function Categories({ canEdit }: { canEdit: boolean }) {
  const { t } = useI18n();
  const { data, isLoading, error, refetch } = useCategories();
  const [name, setName] = useState("");
  const add = useApiMutation(
    () =>
      api("expense-categories", {
        method: "POST",
        json: {
          name,
          code: name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `cat-${Date.now()}`,
          include_in_meal_rate: false,
          sort_order: (data?.length ?? 0) + 1,
        },
      }),
    { invalidate: [qk.categories], success: t("common.saved") },
  );
  return (
    <Section title={t("settings.categories")}>
      <p className="mb-3 text-sm text-muted-foreground">{t("settings.categoriesHint")}</p>
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <TableSkeleton rows={5} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("expenses.category")}</TableHead>
              <TableHead>{t("expenses.inMealRateShort")}</TableHead>
              <TableHead>{t("settings.active")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((c) => <CategoryRow key={c.id} category={c} canEdit={canEdit} />)}
          </TableBody>
        </Table>
      )}
      {canEdit && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) add.mutate(undefined, { onSuccess: () => setName("") });
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("settings.newCategory")} className="max-w-xs" />
          <Button type="submit" variant="outline" disabled={add.isPending}>
            <Plus /> {t("common.add")}
          </Button>
        </form>
      )}
      {fieldError(add.error, "name") && <p className="mt-1 text-xs text-destructive">{fieldError(add.error, "name")}</p>}
    </Section>
  );
}

const WEEKDAYS = [5, 6, 0, 1, 2, 3, 4]; // Saturday first, as weeks are counted in Bangladesh

function WeeklyMenu({ canEdit }: { canEdit: boolean }) {
  const { t } = useI18n();
  const { data, isLoading } = useMenu();
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const current = (wd: number, mt: string) => draft?.[`${wd}:${mt}`] ?? data?.find((m) => m.weekday === wd && m.meal_type === mt)?.items ?? "";
  const save = useApiMutation(
    () =>
      api("menu/bulk", {
        method: "PUT",
        json: WEEKDAYS.flatMap((wd) => MEAL_TYPES.map((mt) => ({ weekday: wd, meal_type: mt, items: current(wd, mt) }))),
      }),
    { invalidate: [qk.menu], success: t("common.saved") },
  );
  return (
    <Section title={t("settings.weeklyMenu")}>
      {isLoading ? (
        <TableSkeleton rows={7} />
      ) : (
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("settings.day")}</TableHead>
                {MEAL_TYPES.map((mt) => (
                  <TableHead key={mt}>{t(`meals.${mt}`)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {WEEKDAYS.map((wd) => (
                <TableRow key={wd}>
                  <TableCell className="font-medium">{t(`weekdays.${wd}`)}</TableCell>
                  {MEAL_TYPES.map((mt) => (
                    <TableCell key={mt} className="min-w-44">
                      {canEdit ? (
                        <Input
                          value={current(wd, mt)}
                          onChange={(e) => setDraft({ ...(draft ?? {}), [`${wd}:${mt}`]: e.target.value })}
                          className="h-8"
                        />
                      ) : (
                        current(wd, mt) || "—"
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {canEdit && (
        <Button className="mt-3" onClick={() => save.mutate(undefined, { onSuccess: () => setDraft(null) })} disabled={!draft || save.isPending}>
          <Save /> {t("common.save")}
        </Button>
      )}
    </Section>
  );
}

function Account() {
  const { t, lang, setLang } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const change = useApiMutation(
    () => api("auth/change-password", { method: "POST", json: { current_password: current, new_password: next } }),
    { success: t("settings.passwordChanged") },
  );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title={t("settings.language")}>
        <Segmented<Lang>
          value={lang}
          onChange={setLang}
          className="max-w-xs"
          options={[
            { value: "en", label: "English" },
            { value: "bn", label: "বাংলা" },
          ]}
        />
      </Section>
      <Section title={t("settings.changePassword")}>
        <form
          className="grid max-w-sm gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            change.mutate(undefined, {
              onSuccess: () => {
                setCurrent("");
                setNext("");
              },
            });
          }}
        >
          <Field label={t("settings.currentPassword")} htmlFor="cur" error={fieldError(change.error, "current_password")}>
            <Input id="cur" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label={t("settings.newPassword")} htmlFor="new" error={fieldError(change.error, "new_password")}>
            <Input id="new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Button type="submit" className="justify-self-start" disabled={!current || next.length < 6 || change.isPending}>
            {t("settings.changePassword")}
          </Button>
        </form>
      </Section>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useI18n();
  const { manage } = usePermissions();
  const { data: settings, isLoading, error, refetch } = useSettings();
  return (
    <>
      <PageHeader title={t("settings.title")} description={manage ? t("settings.subtitleManager") : t("settings.subtitleMember")} />
      <Tabs defaultValue={manage ? "general" : "account"}>
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="general">{t("settings.general")}</TabsTrigger>
          <TabsTrigger value="categories">{t("settings.categories")}</TabsTrigger>
          <TabsTrigger value="menu">{t("settings.weeklyMenu")}</TabsTrigger>
          <TabsTrigger value="account">{t("settings.account")}</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-4">
          {error ? <ErrorState error={error} onRetry={() => refetch()} /> : isLoading || !settings ? <TableSkeleton rows={4} /> : <GeneralSettings key={settings.updated_at} settings={settings} canEdit={manage} />}
        </TabsContent>
        <TabsContent value="categories" className="mt-4">
          <Categories canEdit={manage} />
        </TabsContent>
        <TabsContent value="menu" className="mt-4">
          <WeeklyMenu canEdit={manage} />
        </TabsContent>
        <TabsContent value="account" className="mt-4">
          <Account />
        </TabsContent>
      </Tabs>
    </>
  );
}
