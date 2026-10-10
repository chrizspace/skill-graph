/** Placeholder for a page whose feature lands in a later milestone (docs/PLAN.md §8). */
export function ComingSoon({ title, milestone }: { title: string; milestone: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">Coming in {milestone}.</p>
    </div>
  );
}
