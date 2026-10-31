"use client";

import type { FormEventHandler, ReactNode } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/** Right-hand drawer with a form: scrollable body, sticky Save / Cancel footer. */
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  pending,
  submitLabel,
  children,
  footerExtra,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  pending?: boolean;
  submitLabel?: string;
  children: ReactNode;
  footerExtra?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <form onSubmit={onSubmit} className="flex h-full min-h-0 flex-col" noValidate>
          <SheetHeader className="border-b">
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">{children}</div>
          <SheetFooter className="flex-row items-center justify-between gap-2 border-t">
            <div>{footerExtra}</div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? t("common.saving") : (submitLabel ?? t("common.save"))}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
