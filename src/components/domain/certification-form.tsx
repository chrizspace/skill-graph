"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export type CertificationFormState = { error?: string; values?: Record<string, string> } | undefined;
type Action = (state: CertificationFormState, formData: FormData) => Promise<CertificationFormState>;

/**
 * Add a certification, or change the dates of one already held (then `fixed` names it). Dates are optional;
 * leave the expiry empty if it doesn't expire. The server checks them and returns what to fix.
 */
export function CertificationForm({
  action,
  options,
  fixed,
  defaults,
}: {
  action: Action;
  /** certifications that can be added: id and name */
  options?: { id: string; name: string }[];
  fixed?: { id: string; name: string };
  defaults?: { obtainedOn?: string | null; expiresOn?: string | null };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const suffix = fixed?.id ?? "new";
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      {fixed ? (
        <input type="hidden" name="nodeId" value={fixed.id} />
      ) : (
        <div className="grid gap-1.5">
          <Label htmlFor={`cert-${suffix}`}>Certification</Label>
          <NativeSelect
            id={`cert-${suffix}`}
            name="nodeId"
            required
            // a select only reads its default when it mounts, so a new default needs a new element
            key={state?.values?.nodeId ?? "empty"}
            defaultValue={state?.values?.nodeId ?? ""}
            className="w-72 max-w-full"
          >
            <option value="" disabled>
              Choose…
            </option>
            {options?.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor={`obtained-${suffix}`}>Obtained on</Label>
        <Input
          id={`obtained-${suffix}`}
          type="date"
          name="obtainedOn"
          defaultValue={state?.values?.obtainedOn ?? defaults?.obtainedOn ?? ""}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`expires-${suffix}`}>Expires on</Label>
        <Input
          id={`expires-${suffix}`}
          type="date"
          name="expiresOn"
          defaultValue={state?.values?.expiresOn ?? defaults?.expiresOn ?? ""}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {fixed ? "Save dates" : "Add certification"}
      </Button>
      {state?.error && (
        <p role="alert" className="basis-full text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
