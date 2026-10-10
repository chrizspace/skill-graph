import { ComingSoon } from "../coming-soon";
import { requireTeam } from "@/lib/session";

export default async function Page() {
  await requireTeam();
  return <ComingSoon title="My team" milestone="M11" />;
}
