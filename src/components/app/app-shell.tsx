import Link from "next/link";
import type { NavGroup } from "@/domain/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileNav } from "./mobile-nav";
import { ThemeMenuGroup } from "./theme-switch";
import { NavLinks } from "./nav-links";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/**
 * The frame around every signed-in page: header, navigation (a sidebar from 768px, a menu below), the user menu
 * and the page area. `signOut` is a server action passed in by the layout, so the shell stays presentational.
 */
export function AppShell({
  groups,
  user,
  signOut,
  children,
}: {
  groups: NavGroup[];
  user: { name: string; email: string };
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="relative flex items-center gap-3 border-b px-4 py-3 sm:px-6">
        <MobileNav groups={groups} />
        <Link href="/" className="font-semibold whitespace-nowrap">
          <span aria-hidden className="mr-2 inline-block size-3 rounded-sm bg-brand" />
          Skill Graph
        </Link>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2" aria-label={`Account menu for ${user.name}`}>
                <Avatar size="sm">
                  <AvatarFallback>{initials(user.name)}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline">{user.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="font-normal">
                <span className="block font-medium">{user.name}</span>
                <span className="block text-xs text-muted-foreground">{user.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ThemeMenuGroup />
              <DropdownMenuSeparator />
              <form action={signOut} className="p-1">
                <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
                  Sign out
                </Button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r p-4 md:block">
          <NavLinks groups={groups} />
        </aside>
        <main id="content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
