import { ComingSoon } from "../coming-soon";
import { requireCan } from "@/lib/session";

export default async function Page() {
  await requireCan("changeRequest:create", { practiceId: "" });
  return <ComingSoon title="Change requests" milestone="M10" />;
}
