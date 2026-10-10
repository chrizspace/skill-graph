"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * A button for something that can't be undone: it opens a window saying what will be lost, and only the confirm button
 * there runs the action (a server action, as the form's `action`).
 */
export function ConfirmButton({
  action,
  label,
  title,
  confirmLabel = label,
  fields = {},
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  label: string;
  title: string;
  confirmLabel?: string;
  /** what the action needs to know (hidden fields of the form) */
  fields?: Record<string, string>;
  /** what will be lost, written for the person confirming */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col gap-2 text-sm">{children}</div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <form
            action={async (formData) => {
              await action(formData);
              setOpen(false);
            }}
          >
            {Object.entries(fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <Button type="submit" variant="destructive">
              {confirmLabel}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
