import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { defaultTheme, themeInitScript } from "@/design-system/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skill Graph",
  description: "Roles, skills and technologies as a graph: find the gap to the role you want.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // the server renders the default theme; the inline script puts a saved choice on <html> before the first paint
    // (so `suppressHydrationWarning`, since the attribute differs from what was rendered)
    <html lang="en" data-theme={defaultTheme} className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
