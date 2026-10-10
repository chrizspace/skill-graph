import { ComingSoon } from "../../coming-soon";
import { requireCan } from "@/lib/session";

export default async function Page() {
  await requireCan("audit:view");
  return <ComingSoon title="Audit log" milestone="M12" />;
}
