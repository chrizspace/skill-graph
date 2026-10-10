"use client";

import { createContext, useActionState, useContext, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * What a form's server action returns: a message to show, and, after a refusal, what was typed (a form is reset after
 * every action, so the fields need it as their defaults or the person would lose their input).
 */
export type ActionState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;

const StateContext = createContext<ActionState>(undefined);

/** The value a field starts with: what the person typed before a refusal, else the saved one. */
function useTyped(name: string | undefined, saved: unknown) {
  const state = useContext(StateContext);
  return (name && state?.values?.[name]) ?? (saved === undefined || saved === null ? "" : String(saved));
}

/** A text field of an ActionForm: it comes back with what was typed after a refusal. */
export function ActionInput({ defaultValue, ...props }: ComponentProps<typeof Input>) {
  return (
    <Input
      key={useTyped(props.name, defaultValue)}
      defaultValue={useTyped(props.name, defaultValue)}
      {...props}
    />
  );
}

export function ActionTextarea({ defaultValue, ...props }: ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      key={useTyped(props.name, defaultValue)}
      defaultValue={useTyped(props.name, defaultValue)}
      {...props}
    />
  );
}

/** A select of an ActionForm. (A select only reads its default when it mounts, hence the key.) */
export function ActionSelect({ defaultValue, children, ...props }: ComponentProps<typeof NativeSelect>) {
  const value = useTyped(props.name, defaultValue);
  return (
    <NativeSelect key={value} defaultValue={value} {...props}>
      {children}
    </NativeSelect>
  );
}

/**
 * A form that runs a server action and shows what came back: the problems to fix (the fields keep what was typed), or
 * a short confirmation. Use ActionInput, ActionTextarea and ActionSelect for its fields.
 */
export function ActionForm({
  action,
  children,
  submit,
  variant = "default",
  className,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  /** the label of the submit button; leave out to supply your own in the children */
  submit?: string;
  variant?: "default" | "outline" | "destructive";
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <StateContext value={state}>
      <form action={formAction} className={cn("flex flex-col gap-3", className)}>
        {children}
        {submit && (
          <div>
            <Button type="submit" variant={variant} disabled={pending}>
              {pending ? "Saving…" : submit}
            </Button>
          </div>
        )}
        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state?.ok && !state.error && (
          <p role="status" className="text-sm text-muted-foreground">
            {state.ok}
          </p>
        )}
      </form>
    </StateContext>
  );
}
