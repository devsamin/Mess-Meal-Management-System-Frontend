"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useMonth } from "@/components/month-context";
import { Field, Segmented, SimpleSelect } from "@/components/common/form";
import { FormSheet } from "@/components/common/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ApiError, api, mediaUrl, toFormData } from "@/lib/api/client";
import { qk, useApiMutation, useCategories, useMonthMembers } from "@/lib/api/hooks";
import type { Expense } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/provider";
import { usePermissions } from "@/lib/use-permissions";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    date: z.string().min(1, "required"),
    category: z.string().min(1, "required"),
    amount: z
      .string()
      .min(1, "required")
      .refine((v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0, "amount"),
    description: z.string().max(255),
    purchaser: z.string(),
    payment_source: z.enum(["fund", "personal"]),
    include_in_meal_rate: z.boolean(),
    receipt: z.instanceof(File).nullable().optional(),
    remove_receipt: z.boolean(),
  })
  .refine((v) => v.payment_source !== "personal" || v.purchaser, { path: ["purchaser"], message: "purchaser" });

type Values = z.infer<typeof schema>;

export function ExpenseForm({ expense, onClose }: { expense: Expense | null; onClose: () => void }) {
  const { t } = useI18n();
  const { month, monthId, defaultDate } = useMonth();
  const { manage, myMemberId } = usePermissions();
  const { data: categories = [] } = useCategories();
  const { data: monthMembers = [] } = useMonthMembers(monthId);
  const fileRef = useRef<HTMLInputElement>(null);
  const touchedRate = useRef(!!expense);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: expense?.date ?? defaultDate,
      category: expense ? String(expense.category) : "",
      amount: expense?.amount ?? "",
      description: expense?.description ?? "",
      purchaser: expense?.purchaser ? String(expense.purchaser) : manage ? "" : String(myMemberId ?? ""),
      payment_source: expense?.payment_source ?? (manage ? "fund" : "personal"),
      include_in_meal_rate: expense?.include_in_meal_rate ?? true,
      receipt: null,
      remove_receipt: false,
    },
  });

  const categoryId = useWatch({ control, name: "category" });
  const receipt = useWatch({ control, name: "receipt" });
  const removeReceipt = useWatch({ control, name: "remove_receipt" });
  const activeCategories = categories.filter((c) => c.is_active || String(c.id) === categoryId);

  // Pick the default category, and follow the category's meal-rate default until the user overrides it.
  useEffect(() => {
    if (!categoryId && activeCategories.length) setValue("category", String(activeCategories[0].id));
  }, [categoryId, activeCategories, setValue]);
  useEffect(() => {
    const cat = categories.find((c) => String(c.id) === categoryId);
    if (cat && !touchedRate.current) setValue("include_in_meal_rate", cat.include_in_meal_rate);
  }, [categoryId, categories, setValue]);

  const save = useApiMutation(
    (v: Values) => {
      const payload = {
        account: monthId,
        date: v.date,
        category: v.category,
        amount: v.amount,
        description: v.description,
        purchaser: v.purchaser || null,
        payment_source: v.payment_source,
        include_in_meal_rate: v.include_in_meal_rate,
        ...(v.receipt ? { receipt: v.receipt } : {}),
        ...(expense && v.remove_receipt ? { remove_receipt: true } : {}),
      };
      const form = toFormData(payload);
      return expense
        ? api<Expense>(`expenses/${expense.id}`, { method: "PATCH", form })
        : api<Expense>("expenses", { method: "POST", form });
    },
    {
      invalidate: [qk.month(monthId)],
      success: (e) => (e.status === "pending" ? t("expenses.submittedPending") : t("common.saved")),
    },
  );

  const onSubmit = handleSubmit((values) =>
    save.mutate(values, {
      onSuccess: onClose,
      onError: (err) => {
        if (err instanceof ApiError)
          for (const [k, msg] of Object.entries(err.fieldErrors)) setError(k as keyof Values, { message: msg });
      },
    }),
  );

  const msg = (key?: string) =>
    key === "required" ? t("validation.required") : key === "amount" ? t("validation.amount") : key === "purchaser" ? t("validation.purchaser") : key;

  const existingReceipt = expense?.receipt && !removeReceipt ? mediaUrl(expense.receipt) : null;

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={expense ? t("expenses.edit") : t("expenses.add")}
      description={!manage ? t("expenses.memberNote") : month?.label}
      onSubmit={onSubmit}
      pending={save.isPending}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("common.amount")} htmlFor="amount" error={msg(errors.amount?.message)}>
          <Input id="amount" inputMode="decimal" placeholder="0" autoFocus={!expense} {...register("amount")} className="text-lg font-semibold" />
        </Field>
        <Field label={t("common.date")} htmlFor="date" error={msg(errors.date?.message)}>
          <Input id="date" type="date" min={month?.start_date} max={month?.end_date} {...register("date")} />
        </Field>
      </div>

      <Field label={t("expenses.category")} error={msg(errors.category?.message)}>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <div className="flex flex-wrap gap-1.5">
              {activeCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => field.onChange(String(c.id))}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm",
                    field.value === String(c.id) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        />
      </Field>

      <Field label={t("common.description")} htmlFor="description" error={msg(errors.description?.message)}>
        <Input id="description" placeholder={t("expenses.descriptionPlaceholder")} {...register("description")} />
      </Field>

      {manage && (
        <Field label={t("expenses.purchaser")} hint={t("expenses.purchaserHint")} error={msg(errors.purchaser?.message)}>
          <Controller
            control={control}
            name="purchaser"
            render={({ field }) => (
              <SimpleSelect
                value={field.value}
                onChange={field.onChange}
                placeholder={t("common.selectMember")}
                options={[{ value: "", label: t("expenses.noPurchaser") }, ...monthMembers.map((m) => ({ value: String(m.member), label: m.member_name }))]}
              />
            )}
          />
        </Field>
      )}

      <Field label={t("expenses.paidFrom")} hint={t("expenses.paidFromHint")}>
        <Controller
          control={control}
          name="payment_source"
          render={({ field }) => (
            <Segmented
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: "fund", label: t("expenses.source.fund") },
                { value: "personal", label: t("expenses.source.personal") },
              ]}
            />
          )}
        />
      </Field>

      <Controller
        control={control}
        name="include_in_meal_rate"
        render={({ field }) => (
          <label className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <span className="text-sm">
              <span className="font-medium">{t("expenses.includeInMealRate")}</span>
              <span className="block text-xs text-muted-foreground">{t("expenses.includeInMealRateHint")}</span>
            </span>
            <Switch
              checked={field.value}
              onCheckedChange={(c) => {
                touchedRate.current = true;
                field.onChange(c);
              }}
            />
          </label>
        )}
      />

      <Field label={t("expenses.receipt")} hint={t("expenses.receiptHint")}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => setValue("receipt", e.target.files?.[0] ?? null)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <ImageIcon /> {receipt ? receipt.name : t("expenses.attachReceipt")}
          </Button>
          {receipt && (
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setValue("receipt", null)} aria-label={t("common.remove")}>
              <X />
            </Button>
          )}
          {existingReceipt && !receipt && (
            <>
              <a href={existingReceipt} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                {t("expenses.viewReceipt")}
              </a>
              <Button type="button" variant="ghost" size="sm" onClick={() => setValue("remove_receipt", true)}>
                {t("common.remove")}
              </Button>
            </>
          )}
        </div>
      </Field>
    </FormSheet>
  );
}
