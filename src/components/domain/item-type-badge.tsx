import { Award, Code2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatalogueType } from "@/domain/graph";

const types: Record<CatalogueType, { label: string; Icon: typeof Code2 }> = {
  technical_skill: { label: "Technical skill", Icon: Code2 },
  soft_skill: { label: "Soft skill", Icon: Users },
  certification: { label: "Certification", Icon: Award },
};

export const itemTypeLabel = (type: CatalogueType) => types[type].label;

/** Which kind of catalogue item this is: technical skill, soft skill or certification. */
export function ItemTypeBadge({ type, className }: { type: CatalogueType; className?: string }) {
  const { label, Icon } = types[type];
  return (
    <span
      data-type={type}
      className={cn(
        "inline-flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground",
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {label}
    </span>
  );
}
