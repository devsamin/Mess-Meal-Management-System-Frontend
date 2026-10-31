"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Languages, LogOut, Menu, Moon, Sun, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useMe } from "@/lib/api/hooks";
import { useI18n } from "@/lib/i18n/provider";
import { MonthProvider } from "@/components/month-context";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { NAV_ITEMS } from "@/components/layout/nav";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function Brand() {
  return (
    <Link href="/" className="flex items-center justify-start px-2" aria-label="Home">
      <Image src="/logo.png" alt="Mess Meal Management System" width={80} height={80} priority className="size-20 object-contain" />
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav className="grid gap-0.5">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4" />
            {t(`nav.${item.key}`)}
          </Link>
        );
      })}
    </nav>
  );
}

function UserMenu() {
  const { data: me } = useMe();
  const { t, lang, setLang } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    qc.clear();
    router.replace("/login");
  };
  const name = me?.first_name || me?.member?.name || me?.username || "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="rounded-full" aria-label={t("nav.account")} />}
      >
        <Avatar className="size-8">
          <AvatarImage src="/logo.png" alt={name} className="object-contain" />
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="truncate font-medium text-foreground">{name}</div>
            <div className="text-xs font-normal">
              @{me?.username} · {me?.is_manager ? t("roles.manager") : t("roles.member")}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setLang(lang === "en" ? "bn" : "en")}>
          <Languages /> {lang === "en" ? "বাংলা" : "English"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          {resolvedTheme === "dark" ? <Sun /> : <Moon />}
          {resolvedTheme === "dark" ? t("nav.lightMode") : t("nav.darkMode")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <UserRound /> {t("nav.account")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={logout}>
          <LogOut /> {t("nav.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BottomTabs() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-4">
        {NAV_ITEMS.filter((i) => i.mobile).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground",
                active && "text-primary",
              )}
            >
              <item.icon className="size-5" />
              {t(`nav.${item.key}`)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoading } = useMe();
  const { t } = useI18n();

  return (
    <MonthProvider>
      <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
        <div className="no-print hidden border-r bg-sidebar lg:block">
          <aside className="sticky top-0 flex h-screen flex-col gap-6 p-3">
            <div className="pt-2">
              <Brand />
            </div>
            <NavLinks />
          </aside>
        </div>

        <div className="flex min-w-0 flex-col">
          <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={t("nav.menu")}
            >
              <Menu className="size-5" />
            </Button>
            <MonthSwitcher />
            <div className="ml-auto flex items-center gap-1">{isLoading ? <Skeleton className="size-8 rounded-full" /> : <UserMenu />}</div>
          </header>

          <main className="print-full mx-auto w-full max-w-7xl flex-1 px-3 pt-4 pb-24 sm:px-6 sm:pt-6 lg:pb-10">
            {children}
          </main>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 gap-6 bg-sidebar p-3 pt-5">
          <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
          <Brand />
          <NavLinks onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <BottomTabs />
    </MonthProvider>
  );
}
