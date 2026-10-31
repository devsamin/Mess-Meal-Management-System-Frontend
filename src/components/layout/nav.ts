import {
  BarChart3,
  CalendarRange,
  LayoutDashboard,
  Receipt,
  Settings,
  ShoppingBasket,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  key: string; // i18n key under nav.*
  icon: LucideIcon;
  mobile?: boolean; // shown in the bottom tab bar
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", key: "dashboard", icon: LayoutDashboard, mobile: true },
  { href: "/meals", key: "meals", icon: UtensilsCrossed, mobile: true },
  { href: "/expenses", key: "expenses", icon: ShoppingBasket, mobile: true },
  { href: "/deposits", key: "deposits", icon: Wallet },
  { href: "/extra-bills", key: "extraBills", icon: Receipt },
  { href: "/reports", key: "reports", icon: BarChart3, mobile: true },
  { href: "/members", key: "members", icon: Users },
  { href: "/months", key: "months", icon: CalendarRange },
  { href: "/settings", key: "settings", icon: Settings },
];

