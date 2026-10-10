import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isManager, isPracticeLead } from "@/domain/access";
import { requireActor } from "@/lib/session";

export default async function Home() {
  const actor = await requireActor();
  const types = [
    "Employee",
    ...(isManager(actor) ? ["Manager"] : []),
    ...(isPracticeLead(actor) ? ["Practice Lead"] : []),
    ...(actor.siteLead ? ["Site Lead"] : []),
  ];
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Welcome, {actor.name.split(" ")[0]}</h1>
      <Card>
        <CardHeader>
          <CardTitle>You are signed in as</CardTitle>
          <CardDescription>{actor.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2" aria-label="Your user types">
          {types.map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
        </CardContent>
      </Card>
      <p className="text-muted-foreground">
        Your role, readiness and development plan will appear here as the next features land.
      </p>
    </div>
  );
}
