import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Readiness } from "@/domain/assess";

const bands: Record<Readiness["band"], { label: string; hint: string }> = {
  reachable: { label: "Reachable", hint: "every Critical requirement met" },
  stretch: { label: "Stretch", hint: "at least half of the weighted requirements met" },
  far: { label: "Far", hint: "less than half met" },
};

/** Readiness for a target: weighted share of requirements met, and its band. */
export function ReadinessMeter({
  readiness,
  label,
  className,
}: {
  readiness: Readiness;
  label: string;
  className?: string;
}) {
  const percent = Math.round(readiness.score * 100);
  const band = bands[readiness.band];
  return (
    <div className={cn("grid gap-1.5", className)} data-band={readiness.band}>
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <Progress value={percent} aria-label={`${label}: ${percent}% ready`} />
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{band.label}</span>: {band.hint}
        {!readiness.criticalMet && readiness.band !== "reachable"
          ? ", Critical requirements still missing"
          : ""}
      </p>
    </div>
  );
}
