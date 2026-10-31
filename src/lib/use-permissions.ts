"use client";

import { useMe } from "@/lib/api/hooks";
import { useMonth } from "@/components/month-context";

/** UI-side permission hints. The backend enforces the real rules on every request. */
export function usePermissions() {
  const { data: me } = useMe();
  const { isClosed } = useMonth();
  const manage = !!me?.permissions.manage;
  return {
    me,
    manage,
    /** manager and the month is open */
    canEdit: manage && !isClosed,
    canSubmitExpense: !!me?.permissions.submit_expenses && !isClosed,
    canEnterOwnMeals: !!me?.permissions.enter_own_meals && !isClosed,
    myMemberId: me?.member?.id,
  };
}
