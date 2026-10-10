import Link from "next/link";
import { FilterLinks } from "@/components/app/filter-links";
import { getDb } from "@/db/client";
import { auditPage } from "@/db/site";
import { describeAudit } from "@/lib/audit-text";
import { hrefWith, param } from "@/lib/query";
import { requireCan } from "@/lib/session";

export const metadata = { title: "Audit log · Skill Graph" };

const KINDS = [
  ["node", "Roles and catalogue"],
  ["edge", "Requirements and paths"],
  ["change_request", "Change requests"],
  ["recommendation", "Recommendations"],
  ["practice", "Practices"],
  ["access", "Appointments"],
  ["profile", "People"],
] as const;

/** Who changed what, newest first: roles, requirements, paths, the catalogue, practices, appointments and decisions. */
export default async function Audit({ searchParams }: PageProps<"/site/audit">) {
  const actor = await requireCan("audit:view");
  const sp = await searchParams;
  const entity = KINDS.find(([k]) => k === param(sp.kind))?.[0];
  const page = Math.max(1, Number(param(sp.page)) || 1);
  const { rows, total, pages } = await auditPage(getDb(), { actor }, { entity, page });
  const current = { kind: entity };

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Audit log</h1>
        <p className="mt-1 text-muted-foreground">
          {total} {total === 1 ? "entry" : "entries"}. Every change to the graph, the catalogue, practices and
          appointments is recorded here.
        </p>
      </header>
      <FilterLinks
        label="Show"
        options={[
          { label: "Everything", href: hrefWith("/site/audit", {}, {}), active: !entity },
          ...KINDS.map(([k, label]) => ({
            label,
            href: hrefWith("/site/audit", {}, { kind: k }),
            active: entity === k,
          })),
        ]}
      />
      <ol className="divide-y rounded-lg border">
        {rows.map((r) => {
          const d = describeAudit(r);
          return (
            <li key={r.id} className="flex flex-col gap-0.5 p-3 text-sm">
              <p>
                <span className="font-medium">{r.actor ?? "Someone"}</span> {d.text}
                {d.emergency && <span> (emergency edit)</span>}
                {r.changeRequestId && (
                  <>
                    {" "}
                    <Link href={`/requests/${r.changeRequestId}`} className="underline underline-offset-4">
                      (request)
                    </Link>
                  </>
                )}
              </p>
              <p className="text-muted-foreground">{r.at.toISOString().slice(0, 16).replace("T", " ")} UTC</p>
            </li>
          );
        })}
        {rows.length === 0 && <li className="p-3 text-sm text-muted-foreground">Nothing recorded.</li>}
      </ol>
      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center gap-4 text-sm">
          {page > 1 ? (
            <Link
              href={hrefWith("/site/audit", current, { page: String(page - 1) })}
              className="underline underline-offset-4"
            >
              Newer
            </Link>
          ) : (
            <span className="text-muted-foreground">Newer</span>
          )}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link
              href={hrefWith("/site/audit", current, { page: String(page + 1) })}
              className="underline underline-offset-4"
            >
              Older
            </Link>
          ) : (
            <span className="text-muted-foreground">Older</span>
          )}
        </nav>
      )}
    </div>
  );
}
