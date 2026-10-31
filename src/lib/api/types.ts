/** Types mirroring the Django REST API. Money and meal counts arrive as decimal strings. */

export type Money = string;
export type MealType = "lunch" | "dinner";
export const MEAL_TYPES: MealType[] = ["lunch", "dinner"];

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
  total_amount?: Money;
}

export interface Me {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "manager" | "member";
  is_manager: boolean;
  preferred_language: string;
  member: { id: number; name: string } | null;
  permissions: {
    manage: boolean;
    enter_own_meals: boolean;
    submit_expenses: boolean;
    view_all: boolean;
    meal_edit_days: number | null;
  };
}

export interface MessSettings {
  name: string;
  members_can_view_all: boolean;
  allow_member_meal_entry: boolean;
  allow_member_expense_submit: boolean;
  member_meal_edit_days: number;
  updated_at: string;
}

export interface Member {
  id: number;
  name: string;
  phone: string;
  photo: string | null;
  joined_on: string;
  left_on: string | null;
  status: "active" | "inactive";
  notes: string;
  user: number | null;
  username: string | null;
  role: "manager" | "member" | null;
  created_at: string;
}

export interface MonthAccount {
  id: number;
  year: number;
  month: number;
  label: string;
  status: "open" | "closed";
  fixed_cost_split: "equal" | "by_days";
  notes: string;
  start_date: string;
  end_date: string;
  member_count: number;
  closed_at: string | null;
  closed_by_name: string | null;
  created_at: string;
}

export interface MonthMember {
  id: number;
  account: number;
  member: number;
  member_name: string;
  member_status: "active" | "inactive";
  joined_on: string;
  left_on: string | null;
  opening_balance: Money;
  closing_balance: Money | null;
}

export interface MemberBalance {
  member_id: number;
  name: string;
  joined_on: string | null;
  left_on: string | null;
  days_present: number;
  meals: string;
  opening_balance: Money;
  deposits: Money;
  refunds: Money;
  net_deposits: Money;
  personal_expenses: Money;
  personal_bills: Money;
  personal_paid: Money;
  total_credit: Money;
  meal_cost: Money;
  shared_cost: Money;
  bill_charges: Money;
  total_charges: Money;
  balance: Money;
  status: "receivable" | "payable" | "settled";
}

export interface CategoryTotal {
  category_id: number;
  category: string;
  code: string;
  in_meal_rate: boolean;
  amount: Money;
  count: number;
}

export interface MonthSummary {
  account_id: number;
  label: string;
  year: number;
  month: number;
  status: "open" | "closed";
  fixed_cost_split: "equal" | "by_days";
  total_meals: string;
  meal_rate: Money;
  meal_rate_exact: string;
  meal_pool: Money;
  meal_expenses: Money;
  meal_bills: Money;
  shared_expenses: Money;
  split_bills: Money;
  total_expenses: Money;
  total_extra_bills: Money;
  total_spending: Money;
  total_deposits: Money;
  total_refunds: Money;
  net_deposits: Money;
  personal_contributions: Money;
  fund_spent: Money;
  opening_balance_total: Money;
  cash_in_hand: Money;
  total_balance: Money;
  total_receivable: Money;
  total_payable: Money;
  balance_check_ok: boolean;
  pending_expense_count: number;
  pending_expense_amount: Money;
  category_totals: CategoryTotal[];
  members: MemberBalance[];
  warnings: string[];
}

export interface DailyMeals {
  date: string;
  lunch: string;
  dinner: string;
  total: string;
}

export interface ActivityItem {
  id: number;
  account: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  summary: string;
  actor_name: string | null;
  created_at: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  code: string;
  include_in_meal_rate: boolean;
  is_active: boolean;
  sort_order: number;
}

export type PaymentSource = "fund" | "personal";

export interface Expense {
  id: number;
  account: number;
  date: string;
  category: number;
  category_name: string;
  amount: Money;
  description: string;
  purchaser: number | null;
  purchaser_name: string | null;
  payment_source: PaymentSource;
  include_in_meal_rate: boolean;
  receipt: string | null;
  status: "approved" | "pending" | "rejected";
  created_by_name: string | null;
  approved_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deposit {
  id: number;
  account: number;
  member: number;
  member_name: string;
  date: string;
  amount: Money;
  kind: "deposit" | "refund";
  method: "cash" | "bkash" | "nagad" | "rocket" | "bank" | "other";
  note: string;
  received_by_name: string | null;
  created_at: string;
}

export interface ExtraBill {
  id: number;
  account: number;
  date: string;
  bill_ref: string;
  title: string;
  description: string;
  amount: Money;
  payment_source: PaymentSource;
  paid_by: number | null;
  paid_by_name: string | null;
  include_in_meal_rate: boolean;
  split_mode: "equal" | "custom";
  shares: { member: number; member_name: string; amount: Money }[];
  per_head: Money | null;
  created_at: string;
}

export interface Dashboard {
  summary: MonthSummary;
  daily_meals: DailyMeals[];
  today: DailyMeals | null;
  today_date: string;
  my_balance: MemberBalance | null;
  recent_expenses: Expense[];
  recent_activity: ActivityItem[];
}

export interface DaySheetRow {
  member_id: number;
  name: string;
  present: boolean;
  editable: boolean;
  meals: Record<MealType, string>;
  total: string;
}

export interface DaySheet {
  account: number;
  date: string;
  is_closed: boolean;
  menu: Partial<Record<MealType, string>>;
  rows: DaySheetRow[];
  totals: Record<MealType | "total", string>;
}

export interface MealGrid {
  days: string[];
  rows: { member_id: number; name: string; days: Record<string, string>; total: string }[];
  day_totals: Record<string, string>;
}

export interface MonthReport {
  summary: MonthSummary;
  daily_meals: DailyMeals[];
  meal_grid: MealGrid;
  expenses: {
    id: number;
    date: string;
    category: string;
    description: string;
    purchaser: string | null;
    payment_source: PaymentSource;
    in_meal_rate: boolean;
    amount: Money;
  }[];
  deposits: { id: number; date: string; member: string; kind: string; method: string; note: string; amount: Money }[];
  extra_bills: {
    id: number;
    date: string;
    bill_ref: string;
    title: string;
    amount: Money;
    payment_source: PaymentSource;
    paid_by: string | null;
    in_meal_rate: boolean;
    shares: { member: string; amount: Money }[];
  }[];
}

export interface WeeklyMenuItem {
  id: number;
  weekday: number;
  meal_type: MealType;
  items: string;
}

export interface UserAccount {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "manager" | "member";
  is_active: boolean;
  last_login: string | null;
  member_id: number | null;
}
