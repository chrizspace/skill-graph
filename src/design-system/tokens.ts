/**
 * Design tokens: the single source for colours, radius, shadows and motion (docs/PLAN.md §2 "Design system").
 * `pnpm tokens` writes src/design-system/tokens.css from this file; never edit the CSS by hand.
 *
 * Two layers:
 *   - primitives: raw scales (orange, violet, neutral, red, amber, green, blue). Don't use them in components.
 *   - semantic tokens: what components use (background, primary, critical…), defined per theme × mode.
 * Two themes, Orange and Violet, each in light and dark. Contrast pairs are checked in tokens.test.ts.
 */

export type Scale = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950, string>;

export const primitives = {
  // anchored at 500 on a vivid tangerine orange
  orange: {
    50: "#fff4ed",
    100: "#ffe6d5",
    200: "#ffc9a8",
    300: "#ffa470",
    400: "#ff7a36",
    500: "#ff5800",
    600: "#e04a00",
    700: "#b33a00",
    800: "#8f2f05",
    900: "#742909",
    950: "#421103",
  },
  // anchored at 500 on an electric violet
  violet: {
    50: "#faf3ff",
    100: "#f3e3ff",
    200: "#e7c9ff",
    300: "#d69eff",
    400: "#c064ff",
    500: "#a100ff",
    600: "#8a00db",
    700: "#7200b4",
    800: "#5e0a92",
    900: "#4d0b77",
    950: "#2f004d",
  },
  neutral: {
    50: "#fafafa",
    100: "#f4f4f5",
    200: "#e4e4e7",
    300: "#d4d4d8",
    400: "#a1a1aa",
    500: "#71717a",
    600: "#52525b",
    700: "#3f3f46",
    800: "#27272a",
    900: "#18181b",
    950: "#09090b",
  },
  red: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
    900: "#7f1d1d",
    950: "#450a0a",
  },
  amber: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
    950: "#451a03",
  },
  green: {
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d",
    950: "#052e16",
  },
  blue: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
    950: "#172554",
  },
} as const satisfies Record<string, Scale>;

export const themeNames = ["orange", "violet"] as const;
export type ThemeName = (typeof themeNames)[number];
export const modeNames = ["light", "dark"] as const;
export type ModeName = (typeof modeNames)[number];

/** Semantic tokens every theme × mode defines. Names follow shadcn/ui, plus our own (priority, status, node types). */
export const semanticTokenNames = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "link",
  "brand",
  "brand-subtle",
  // weights of a requirement: always shown with an icon and a label too, never by colour alone
  "critical",
  "critical-subtle",
  "important",
  "important-subtle",
  "nice",
  "nice-subtle",
  "success",
  "warning",
  "info",
  // node types in the graph (shape carries the type; these are neutral tints)
  "node-role",
  "node-specialization",
  "node-technical",
  "node-soft",
  "node-certification",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
] as const;
export type SemanticToken = (typeof semanticTokenNames)[number];
export type SemanticTokens = Record<SemanticToken, string>;

const n = primitives.neutral;
const { red, amber, green, blue } = primitives;

function light(
  brand: Scale,
  onPrimary: string,
  primaryShade: 500 | 600,
  linkShade: 600 | 700,
): SemanticTokens {
  const primary = brand[primaryShade];
  return {
    background: "#ffffff",
    foreground: n[950],
    card: "#ffffff",
    "card-foreground": n[950],
    popover: "#ffffff",
    "popover-foreground": n[950],
    primary,
    "primary-foreground": onPrimary,
    secondary: n[100],
    "secondary-foreground": n[900],
    muted: n[100],
    "muted-foreground": n[600],
    accent: brand[50],
    "accent-foreground": brand[800],
    destructive: red[600],
    "destructive-foreground": "#ffffff",
    border: n[200],
    input: "#8a8a93",
    ring: brand[600],
    link: brand[linkShade],
    brand: brand[500],
    "brand-subtle": brand[100],
    critical: red[700],
    "critical-subtle": red[50],
    important: amber[800],
    "important-subtle": amber[50],
    nice: green[700],
    "nice-subtle": green[50],
    success: green[700],
    warning: amber[800],
    info: blue[700],
    "node-role": brand[600],
    "node-specialization": brand[300],
    "node-technical": n[600],
    "node-soft": n[500],
    "node-certification": n[700],
    "chart-1": brand[500],
    "chart-2": brand[300],
    "chart-3": brand[700],
    "chart-4": n[400],
    "chart-5": n[700],
    sidebar: n[50],
    "sidebar-foreground": n[950],
    "sidebar-primary": primary,
    "sidebar-primary-foreground": onPrimary,
    "sidebar-accent": brand[50],
    "sidebar-accent-foreground": brand[800],
    "sidebar-border": n[200],
    "sidebar-ring": brand[600],
  };
}

function dark(brand: Scale, onPrimary: string, primaryShade: 400 | 500): SemanticTokens {
  const primary = brand[primaryShade];
  return {
    background: n[950],
    foreground: n[50],
    card: n[900],
    "card-foreground": n[50],
    popover: n[900],
    "popover-foreground": n[50],
    primary,
    "primary-foreground": onPrimary,
    secondary: n[800],
    "secondary-foreground": n[50],
    muted: n[800],
    "muted-foreground": n[400],
    accent: brand[950],
    "accent-foreground": brand[200],
    destructive: red[500],
    "destructive-foreground": n[950],
    border: n[800],
    input: n[500],
    ring: brand[400],
    link: brand[300],
    brand: brand[500],
    "brand-subtle": brand[950],
    critical: red[400],
    "critical-subtle": red[950],
    important: amber[400],
    "important-subtle": amber[950],
    nice: green[400],
    "nice-subtle": green[950],
    success: green[400],
    warning: amber[400],
    info: blue[400],
    "node-role": brand[400],
    "node-specialization": brand[700],
    "node-technical": n[400],
    "node-soft": n[500],
    "node-certification": n[300],
    "chart-1": brand[400],
    "chart-2": brand[600],
    "chart-3": brand[200],
    "chart-4": n[500],
    "chart-5": n[300],
    sidebar: n[900],
    "sidebar-foreground": n[50],
    "sidebar-primary": primary,
    "sidebar-primary-foreground": onPrimary,
    "sidebar-accent": brand[950],
    "sidebar-accent-foreground": brand[200],
    "sidebar-border": n[800],
    "sidebar-ring": brand[400],
  };
}

/**
 * The vivid orange is too light for white text, so Orange buttons carry near-black text; violet takes white text.
 * Text-coloured brand (links) uses a darker shade in light mode and a lighter one in dark mode.
 */
export const themes: Record<ThemeName, Record<ModeName, SemanticTokens>> = {
  orange: {
    light: light(primitives.orange, n[950], 500, 700),
    dark: dark(primitives.orange, n[950], 500),
  },
  violet: {
    light: light(primitives.violet, "#ffffff", 500, 600),
    dark: dark(primitives.violet, n[950], 400),
  },
};

export const themeLabels: Record<ThemeName, string> = { orange: "Orange", violet: "Violet" };

export const radius = { base: "0.625rem" } as const;
export const motion = {
  "duration-fast": "120ms",
  "duration-normal": "200ms",
  "duration-slow": "320ms",
  "ease-standard": "cubic-bezier(0.2, 0, 0, 1)",
} as const;
/** How strongly a held-but-expired certification is faded. */
export const opacity = { expired: "0.55" } as const;

/** Pairs that must meet WCAG 2.2 AA in every theme and mode: [foreground, background, minimum ratio]. */
export const contrastPairs: [SemanticToken, SemanticToken, number][] = [
  ["foreground", "background", 4.5],
  ["card-foreground", "card", 4.5],
  ["popover-foreground", "popover", 4.5],
  ["primary-foreground", "primary", 4.5],
  ["secondary-foreground", "secondary", 4.5],
  ["muted-foreground", "background", 4.5],
  ["muted-foreground", "muted", 4.5],
  ["accent-foreground", "accent", 4.5],
  ["destructive-foreground", "destructive", 4.5],
  ["link", "background", 4.5],
  ["critical", "background", 4.5],
  ["critical", "critical-subtle", 4.5],
  ["important", "background", 4.5],
  ["important", "important-subtle", 4.5],
  ["nice", "background", 4.5],
  ["nice", "nice-subtle", 4.5],
  ["success", "background", 4.5],
  ["warning", "background", 4.5],
  ["info", "background", 4.5],
  ["sidebar-foreground", "sidebar", 4.5],
  ["sidebar-accent-foreground", "sidebar-accent", 4.5],
  // non-text contrast (WCAG 1.4.11): focus ring, form field borders, graph nodes
  ["ring", "background", 3],
  ["input", "background", 3],
  ["node-role", "background", 3],
  ["node-technical", "background", 3],
  ["node-certification", "background", 3],
];
