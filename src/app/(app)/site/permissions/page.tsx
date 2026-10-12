import { PermissionsTable } from "@/components/domain/permissions-table";
import { permissionMatrix, userTypeLabel, userTypeSummary, userTypes } from "@/domain/permissions";
import { requireCan } from "@/lib/session";

export const metadata = { title: "Permissions · Skill Navigator" };

/** What each type of user may do. Read-only: the table is built from the same rules the app enforces. */
export default async function Permissions() {
  await requireCan("site:manage");
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Permissions</h1>
        <p className="mt-1 text-muted-foreground">
          What each type of user may do. A person can be several types at once, and their permissions add up.
        </p>
      </header>
      <section aria-labelledby="types" className="flex flex-col gap-2">
        <h2 id="types" className="text-xl font-semibold">
          User types
        </h2>
        <ol className="list-decimal pl-6">
          {userTypes.map((t) => (
            <li key={t}>
              <span className="font-medium">{userTypeLabel[t]}</span>
              <span className="text-muted-foreground">: {userTypeSummary[t]}</span>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="matrix" className="flex flex-col gap-2">
        <h2 id="matrix" className="text-xl font-semibold">
          What they can do
        </h2>
        <PermissionsTable groups={permissionMatrix()} />
      </section>
    </div>
  );
}
