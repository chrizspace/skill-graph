import { ComingSoon } from "../coming-soon";
import { requireCan } from "@/lib/session";

export default async function Page() {
  await requireCan("site:manage");
  return <ComingSoon title="Site overview" milestone="M12" />;
}
