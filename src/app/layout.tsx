import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skill Graph",
  description: "Roles, skills and technologies as a graph: find the gap to the role you want.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // the design system has one theme (Orange, light); a later theme is selected with data-theme (src/design-system)
    <html lang="en" data-theme="orange" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
