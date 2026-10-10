import { ComingSoon } from "../../coming-soon";
import { requireCan } from "@/lib/session";

export default async function Page() {
  await requireCan("catalogue:manage");
  return <ComingSoon title="Catalogue maintenance" milestone="M12" />;
}
