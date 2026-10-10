"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MenuIcon, XIcon } from "lucide-react";
import type { NavGroup } from "@/domain/navigation";
import { Button } from "@/components/ui/button";
import { NavLinks } from "./nav-links";

/** The navigation below 768px: a button that opens a panel under the header. It closes when the page changes. */
export function MobileNav({ groups }: { groups: NavGroup[] }) {
  // open for the page it was opened on: going to another page closes it
  const [openOn, setOpenOn] = useState<string | null>(null);
  const pathname = usePathname();
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);
  return (
    <div className="md:hidden">
      <Button
        variant="outline"
        size="icon"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen(!open)}
      >
        {open ? <XIcon aria-hidden /> : <MenuIcon aria-hidden />}
      </Button>
      {open && (
        <div
          id="mobile-nav"
          className="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b bg-background p-4 shadow-md"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <NavLinks groups={groups} />
        </div>
      )}
    </div>
  );
}
