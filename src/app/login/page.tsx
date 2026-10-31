"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Languages, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useI18n } from "@/lib/i18n/provider";
import { Field } from "@/components/common/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const schema = z.object({
  username: z.string().trim().min(1, "required"),
  password: z.string().min(1, "required"),
});
type Values = z.infer<typeof schema>;

function LoginForm() {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { username: "", password: "" } });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(res.status === 401 ? t("login.invalid") : (data.detail ?? t("common.loadError")));
      return;
    }
    const next = params.get("next");
    router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
    router.refresh();
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/10 to-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Image src="/logo.png" alt="Mess Meal Management System" width={96} height={96} priority className="size-24 object-contain" />
          <h1 className="font-heading text-2xl font-semibold">{t("login.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("login.signIn")}</CardTitle>
            <CardDescription>{t("login.help")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4" noValidate>
              <Field label={t("login.username")} htmlFor="username" error={errors.username && t("validation.required")}>
                <Input id="username" autoComplete="username" autoCapitalize="none" autoFocus {...register("username")} />
              </Field>
              <Field label={t("login.password")} htmlFor="password" error={errors.password && t("validation.required")}>
                <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
              </Field>
              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                {t("login.signIn")}
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => setLang(lang === "en" ? "bn" : "en")}>
            <Languages /> {lang === "en" ? "বাংলা" : "English"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
