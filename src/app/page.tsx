import { PriorityBadge } from "@/components/domain/priority-badge";

export default function Home() {
  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-8">
        <span className="font-semibold whitespace-nowrap">
          <span aria-hidden className="mr-2 inline-block size-3 rounded-sm bg-brand" />
          Skill Graph
        </span>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-4 py-16 sm:px-8">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Skill Graph</h1>
        <p className="text-lg text-muted-foreground">
          See how roles, skills and certifications connect, find the gap to the role you want, and plan your
          next step.
        </p>
        <div className="flex flex-wrap gap-2" aria-label="Requirement weights">
          <PriorityBadge weight="critical" />
          <PriorityBadge weight="important" />
          <PriorityBadge weight="nice" />
        </div>
        <p className="text-sm text-muted-foreground">Under construction: the first features land soon.</p>
      </main>
    </>
  );
}
