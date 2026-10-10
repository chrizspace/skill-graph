"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { changeSchema, describeChange, type Change } from "@/domain/change-requests";
import type { Weight } from "@/domain/graph";

export interface BuilderData {
  /** "role": feedback on a role or specialisation; "new_role": a proposal for a role that doesn't exist yet */
  about: "role" | "specialization" | "new_role";
  items: { id: string; name: string; type: "technical_skill" | "soft_skill" | "certification" }[];
  /** what the role or specialisation requires now (its own requirements) */
  requirements: { itemId: string; name: string; weight: Weight; note: string }[];
  /** the official paths it has now */
  paths: { toId: string; label: string }[];
  /** roles and specialisations a path can lead to */
  targets: { id: string; label: string }[];
  description: string;
}

type Kind = Change["op"];

const KIND_LABEL: Record<Kind, string> = {
  add_requirement: "Add a requirement",
  update_requirement: "Change a requirement",
  remove_requirement: "Remove a requirement",
  add_path: "Add an official path",
  remove_path: "Remove an official path",
  update_description: "Change the description",
  propose_specialization: "Propose a new specialisation",
  propose_role: "Propose a new role",
};

const WEIGHTS: { value: Weight; label: string }[] = [
  { value: "critical", label: "Critical" },
  { value: "important", label: "Important" },
  { value: "nice", label: "Nice to have" },
];

const kindsFor = (about: BuilderData["about"]): Kind[] =>
  about === "new_role"
    ? ["propose_role"]
    : [
        "add_requirement",
        "update_requirement",
        "remove_requirement",
        "add_path",
        "remove_path",
        "update_description",
        ...(about === "role" ? (["propose_specialization"] as Kind[]) : []),
      ];

/**
 * Builds the list of operations of a change request: pick a kind of change, fill it in, add it; several can go in one
 * request. The list is kept in a hidden field (`changes`, JSON) for the form it sits in; the server checks it again.
 */
export function ChangeBuilder({ data }: { data: BuilderData }) {
  const kinds = kindsFor(data.about);
  const [ops, setOps] = useState<Change[]>([]);
  const [kind, setKind] = useState<Kind>(kinds[0]);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<Record<string, string>>({});
  const set = (name: string, value: string) => setF((s) => ({ ...s, [name]: value }));
  const val = (name: string, fallback = "") => f[name] ?? fallback;

  const names = new Map<string, string>([
    ...data.items.map((i) => [i.id, i.name] as const),
    ...data.targets.map((t) => [t.id, t.label] as const),
    ...data.paths.map((p) => [p.toId, p.label] as const),
  ]);
  const describe = (op: Change) =>
    describeChange(op, { name: (id) => names.get(id) ?? "an item that no longer exists" });

  const build = (): unknown => {
    const note = val("note").trim() || undefined;
    switch (kind) {
      case "add_requirement":
        return val("mode", "existing") === "new"
          ? {
              op: kind,
              newItem: {
                name: val("newName").trim(),
                type: val("newType", "technical_skill"),
                issuer: val("issuer").trim() || undefined,
              },
              priority: val("weight", "important"),
              note,
            }
          : { op: kind, itemId: val("item"), priority: val("weight", "important"), note };
      case "update_requirement":
        return {
          op: kind,
          itemId: val("req"),
          priority: val("weight") || undefined,
          note: f.note === undefined || f.note === "" ? undefined : f.note.trim(),
        };
      case "remove_requirement":
        return { op: kind, itemId: val("req") };
      case "add_path":
        return {
          op: kind,
          toId: val("target"),
          note,
          typicalMonths: val("months") ? Number(val("months")) : undefined,
        };
      case "remove_path":
        return { op: kind, toId: val("target") };
      case "update_description":
        return { op: kind, description: val("description", data.description).trim() };
      case "propose_specialization":
      case "propose_role":
        return { op: kind, name: val("name").trim(), description: val("description").trim() };
    }
  };

  const add = () => {
    const parsed = changeSchema.safeParse(build());
    if (!parsed.success) {
      setError(
        kind === "add_requirement" && val("mode", "existing") === "existing" && !val("item")
          ? "Choose the skill or certification."
          : kind.endsWith("_requirement") && kind !== "add_requirement" && !val("req")
            ? "Choose which requirement."
            : kind.endsWith("_path") && !val("target")
              ? "Choose the role the path leads to."
              : parsed.error.issues[0]?.message || "Fill in the fields first.",
      );
      return;
    }
    setOps((o) => [...o, parsed.data]);
    setF({});
    setError(null);
  };

  const req = data.requirements.find((r) => r.itemId === val("req"));

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="changes" value={JSON.stringify(ops)} />
      <fieldset className="flex flex-col gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-semibold">What should change?</legend>
        <div className="grid max-w-sm gap-1.5">
          <Label htmlFor="cb-kind">Kind of change</Label>
          <NativeSelect
            id="cb-kind"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as Kind);
              setF({});
              setError(null);
            }}
          >
            {kinds.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </NativeSelect>
        </div>

        {kind === "add_requirement" && (
          <>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="cb-mode"
                  checked={val("mode", "existing") === "existing"}
                  onChange={() => set("mode", "existing")}
                  className="size-4 accent-primary"
                />
                From the catalogue
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="cb-mode"
                  checked={val("mode") === "new"}
                  onChange={() => set("mode", "new")}
                  className="size-4 accent-primary"
                />
                A new skill or certification
              </label>
            </div>
            {val("mode", "existing") === "existing" ? (
              <div className="grid max-w-md gap-1.5">
                <Label htmlFor="cb-item">Skill or certification</Label>
                <NativeSelect id="cb-item" value={val("item")} onChange={(e) => set("item", e.target.value)}>
                  <option value="">Choose…</option>
                  {data.items
                    .filter((i) => !data.requirements.some((r) => r.itemId === i.id))
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                </NativeSelect>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <div className="grid min-w-56 gap-1.5">
                  <Label htmlFor="cb-new-name">Name</Label>
                  <Input
                    id="cb-new-name"
                    value={val("newName")}
                    onChange={(e) => set("newName", e.target.value)}
                    maxLength={120}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cb-new-type">Type</Label>
                  <NativeSelect
                    id="cb-new-type"
                    value={val("newType", "technical_skill")}
                    onChange={(e) => set("newType", e.target.value)}
                  >
                    <option value="technical_skill">Technical skill</option>
                    <option value="soft_skill">Soft skill</option>
                    <option value="certification">Certification</option>
                  </NativeSelect>
                </div>
                {val("newType") === "certification" && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="cb-issuer">Issuer</Label>
                    <Input
                      id="cb-issuer"
                      value={val("issuer")}
                      onChange={(e) => set("issuer", e.target.value)}
                      maxLength={120}
                    />
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="cb-weight">Weight</Label>
                <NativeSelect
                  id="cb-weight"
                  value={val("weight", "important")}
                  onChange={(e) => set("weight", e.target.value)}
                >
                  {WEIGHTS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid min-w-56 flex-1 gap-1.5">
                <Label htmlFor="cb-note">Why it matters (optional)</Label>
                <Input
                  id="cb-note"
                  value={val("note")}
                  onChange={(e) => set("note", e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>
          </>
        )}

        {(kind === "update_requirement" || kind === "remove_requirement") && (
          <>
            <div className="grid max-w-md gap-1.5">
              <Label htmlFor="cb-req">Requirement</Label>
              <NativeSelect id="cb-req" value={val("req")} onChange={(e) => set("req", e.target.value)}>
                <option value="">Choose…</option>
                {data.requirements.map((r) => (
                  <option key={r.itemId} value={r.itemId}>
                    {r.name} ({WEIGHTS.find((w) => w.value === r.weight)!.label})
                  </option>
                ))}
              </NativeSelect>
            </div>
            {kind === "update_requirement" && (
              <div className="flex flex-wrap gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="cb-uweight">New weight</Label>
                  <NativeSelect
                    id="cb-uweight"
                    value={val("weight")}
                    onChange={(e) => set("weight", e.target.value)}
                  >
                    <option value="">
                      Keep {req ? WEIGHTS.find((w) => w.value === req.weight)!.label : "as it is"}
                    </option>
                    {WEIGHTS.filter((w) => w.value !== req?.weight).map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="grid min-w-56 flex-1 gap-1.5">
                  <Label htmlFor="cb-unote">New note (optional)</Label>
                  <Input
                    id="cb-unote"
                    value={val("note")}
                    onChange={(e) => set("note", e.target.value)}
                    maxLength={500}
                    placeholder={req?.note || ""}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {kind === "add_path" && (
          <div className="flex flex-wrap gap-3">
            <div className="grid min-w-56 gap-1.5">
              <Label htmlFor="cb-target">Leads to</Label>
              <NativeSelect
                id="cb-target"
                value={val("target")}
                onChange={(e) => set("target", e.target.value)}
              >
                <option value="">Choose…</option>
                {data.targets
                  .filter((t) => !data.paths.some((p) => p.toId === t.id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cb-months">Typical months</Label>
              <Input
                id="cb-months"
                type="number"
                min={1}
                max={120}
                className="w-28"
                value={val("months")}
                onChange={(e) => set("months", e.target.value)}
              />
            </div>
            <div className="grid min-w-56 flex-1 gap-1.5">
              <Label htmlFor="cb-pnote">Description (optional)</Label>
              <Input
                id="cb-pnote"
                value={val("note")}
                onChange={(e) => set("note", e.target.value)}
                maxLength={500}
              />
            </div>
          </div>
        )}

        {kind === "remove_path" && (
          <div className="grid max-w-md gap-1.5">
            <Label htmlFor="cb-rtarget">Path</Label>
            <NativeSelect
              id="cb-rtarget"
              value={val("target")}
              onChange={(e) => set("target", e.target.value)}
            >
              <option value="">Choose…</option>
              {data.paths.map((p) => (
                <option key={p.toId} value={p.toId}>
                  To {p.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}

        {kind === "update_description" && (
          <div className="grid max-w-2xl gap-1.5">
            <Label htmlFor="cb-desc">New description</Label>
            <Textarea
              id="cb-desc"
              value={val("description", data.description)}
              onChange={(e) => set("description", e.target.value)}
              maxLength={2000}
            />
          </div>
        )}

        {(kind === "propose_role" || kind === "propose_specialization") && (
          <div className="grid max-w-2xl gap-3">
            <div className="grid max-w-md gap-1.5">
              <Label htmlFor="cb-name">Name</Label>
              <Input
                id="cb-name"
                value={val("name")}
                onChange={(e) => set("name", e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cb-pdesc">
                {kind === "propose_role" ? "What does the role do?" : "What does it add?"}
              </Label>
              <Textarea
                id="cb-pdesc"
                value={val("description")}
                onChange={(e) => set("description", e.target.value)}
                maxLength={2000}
              />
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div>
          <Button type="button" variant="outline" onClick={add}>
            Add to the request
          </Button>
        </div>
      </fieldset>

      <section aria-label="Changes in this request" className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Changes in this request ({ops.length})</h3>
        {ops.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet: add at least one change above.</p>
        ) : (
          <ol className="divide-y rounded-lg border">
            {ops.map((op, i) => (
              <li key={i} className="flex items-start gap-3 p-3 text-sm">
                <span className="flex-1">{describe(op)}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove: ${describe(op)}`}
                  onClick={() => setOps((o) => o.filter((_, j) => j !== i))}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
