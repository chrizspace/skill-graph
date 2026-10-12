import { userTypeLabel, userTypes, type PermissionGroup, type UserType } from "@/domain/permissions";

/** A checkbox that only shows: ticked means allowed. Spoken as "Allowed" or "Not allowed". */
function Mark({ allowed, type }: { allowed: boolean; type: UserType }) {
  return (
    <span
      role="img"
      aria-label={`${userTypeLabel[type]}: ${allowed ? "allowed" : "not allowed"}`}
      className={
        allowed
          ? "inline-flex size-5 items-center justify-center rounded-sm border border-primary bg-primary text-primary-foreground"
          : "inline-flex size-5 rounded-sm border border-border bg-background"
      }
    >
      {allowed && (
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

/** What each type of user may do: one row per ability, one column per type, read-only. */
export function PermissionsTable({ groups }: { groups: PermissionGroup[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <caption className="sr-only">What each type of user may do</caption>
        <thead>
          <tr className="border-b bg-muted">
            <th scope="col" className="p-3 font-semibold">
              Can…
            </th>
            {userTypes.map((t) => (
              <th key={t} scope="col" className="w-28 p-3 text-center font-semibold">
                {userTypeLabel[t]}
              </th>
            ))}
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.label} className="border-b last:border-b-0">
            <tr>
              <th
                scope="rowgroup"
                colSpan={userTypes.length + 1}
                className="bg-muted/50 px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {g.label}
              </th>
            </tr>
            {g.rows.map((r) => (
              <tr key={r.label} className="border-t">
                <th scope="row" className="p-3 font-normal">
                  {r.label}
                  {r.note && <span className="block text-muted-foreground">{r.note}</span>}
                </th>
                {userTypes.map((t) => (
                  <td key={t} className="p-3 text-center">
                    <Mark allowed={r.allowed[t]} type={t} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
