"use client";

import { useEffect, useState } from "react";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import type { NavGroup } from "@/domain/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NavLinks } from "./nav-links";

const KEY = "sidebar-collapsed";

/**
 * The sidebar from 768px: the navigation, with a button at the bottom ("Collapse", then only its icon) that folds it away to a narrow rail and back. The choice is
 * kept in this browser. The navigation stays in the page while folded (hidden), so its open groups are remembered.
 */
export function Sidebar({ groups }: { groups: NavGroup[] }) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      // restoring a choice made earlier, which the server render can't know
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(KEY) === "1") setCollapsed(true);
    } catch {
      /* storage can be blocked: the sidebar just starts open */
    }
  }, []);
  const set = (value: boolean) => {
    setCollapsed(value);
    try {
      localStorage.setItem(KEY, value ? "1" : "0");
    } catch {
      /* not kept, still works */
    }
  };
  return (
    <aside className={cn("hidden shrink-0 flex-col border-r p-4 md:flex", collapsed ? "w-16" : "w-60")}>
      <div id="sidebar-nav" hidden={collapsed}>
        <NavLinks groups={groups} />
      </div>
      <Button
        variant="ghost"
        aria-expanded={!collapsed}
        aria-controls="sidebar-nav"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        onClick={() => set(!collapsed)}
        className={cn("mt-auto", collapsed ? "w-full px-0" : "w-fit gap-3 px-3 text-muted-foreground")}
      >
        {collapsed ? <PanelLeftOpenIcon aria-hidden /> : <PanelLeftCloseIcon aria-hidden />}
        {!collapsed && <span>Collapse</span>}
      </Button>
    </aside>
  );
}
