import { BadgeCheck, CalendarClock, History } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CertificationStatus as Status } from "@/domain/profile";

const statuses: Record<Status, { label: string; Icon: typeof BadgeCheck; className: string }> = {
  valid: { label: "Valid", Icon: BadgeCheck, className: "text-success" },
  expiring: { label: "Expiring", Icon: CalendarClock, className: "text-warning" },
  expired: { label: "Expired", Icon: History, className: "text-muted-foreground" },
};

const formatDay = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * A held certification: its name and status. An expired one still counts as held: it's shown faded with the date it
 * expired, so it's visible the person once earned it (docs/PLAN.md §1).
 */
export function CertificationStatus({
  name,
  status,
  expiresOn,
  className,
}: {
  name: string;
  status: Status;
  expiresOn?: string | null;
  className?: string;
}) {
  const { label, Icon, className: tone } = statuses[status];
  const when = expiresOn
    ? status === "expired"
      ? `expired on ${formatDay(expiresOn)}`
      : `expires on ${formatDay(expiresOn)}`
    : "doesn't expire";
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center gap-2",
        status === "expired" && "opacity-(--opacity-expired)",
        className,
      )}
    >
      <span className="font-medium">{name}</span>
      <span className={cn("inline-flex items-center gap-1 text-xs", tone)}>
        <Icon aria-hidden className="size-3.5" />
        {label}
        <span className="text-muted-foreground">· {when}</span>
      </span>
    </span>
  );
}
