"use client";

import { useRef, useState } from "react";
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
  const button = useRef<HTMLButtonElement>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);
  return (
    <div className="md:hidden">
      <Button
        ref={button}
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
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            setOpen(false);
            // the panel is gone: the focus goes back to the button that opened it, not nowhere
            button.current?.focus();
          }}
        >
          <NavLinks groups={groups} />
        </div>
      )}
    </div>
  );
}
