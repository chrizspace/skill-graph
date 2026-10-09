import { CircleAlert, CircleDot, CirclePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Weight } from "@/domain/graph";

const styles: Record<Weight, { label: string; Icon: typeof CircleAlert; className: string }> = {
  critical: {
    label: "Critical",
    Icon: CircleAlert,
    className: "bg-critical-subtle text-critical border-critical/30",
  },
  important: {
    label: "Important",
    Icon: CircleDot,
    className: "bg-important-subtle text-important border-important/30",
  },
  nice: { label: "Nice to have", Icon: CirclePlus, className: "bg-nice-subtle text-nice border-nice/30" },
};

export const weightLabel = (weight: Weight) => styles[weight].label;

/** The weight of a requirement. Always icon + label + colour, so it never relies on colour alone. */
export function PriorityBadge({ weight, className }: { weight: Weight; className?: string }) {
  const { label, Icon, className: tone } = styles[weight];
  return (
    <span
      data-weight={weight}
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full border px-2 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      <Icon aria-hidden className="size-3" />
      {label}
    </span>
  );
}
