/**
 * Every component in src/components, listed for the Storybook overview (Design system/Overview).
 * catalogue.test.ts fails if a component has no story or isn't listed here: add both when you add a component.
 */
export type ComponentGroup = "App" | "Domain" | "UI";

export interface CatalogueEntry {
  name: string;
  group: ComponentGroup;
  /** Path from the repository root. */
  file: string;
  description: string;
}

export const componentCatalogue: CatalogueEntry[] = [
  {
    group: "App",
    name: "App shell",
    file: "src/components/app/app-shell.tsx",
    description: "Header, navigation per user type, user menu and the page area.",
  },
  {
    group: "App",
    name: "Filter links",
    file: "src/components/app/filter-links.tsx",
    description: "A filter as a row of links that keeps the other filters in the URL.",
  },
  {
    group: "App",
    name: "Microsoft sign-in",
    file: "src/components/app/microsoft-button.tsx",
    description: "Starts the Microsoft (Entra ID) sign-in.",
  },
  {
    group: "App",
    name: "Mobile menu",
    file: "src/components/app/mobile-nav.tsx",
    description: "The navigation below 768px, behind a menu button.",
  },
  {
    group: "App",
    name: "Navigation",
    file: "src/components/app/nav-links.tsx",
    description: "The menu groups for a person's user types, with the current page marked.",
  },
  {
    group: "Domain",
    name: "Priority badge",
    file: "src/components/domain/priority-badge.tsx",
    description: "A requirement's weight: Critical, Important or Nice to have, with icon and label.",
  },
  {
    group: "Domain",
    name: "Item type badge",
    file: "src/components/domain/item-type-badge.tsx",
    description: "Technical skill, soft skill or certification.",
  },
  {
    group: "Domain",
    name: "Certification status",
    file: "src/components/domain/certification-status.tsx",
    description: "A held certification: valid, expiring, or expired (faded, still counts as held).",
  },
  {
    group: "Domain",
    name: "Requirement list",
    file: "src/components/domain/requirement-list.tsx",
    description: "A role's requirements grouped by type, each with its weight and note.",
  },
  {
    group: "Domain",
    name: "Role card",
    file: "src/components/domain/role-card.tsx",
    description: "A role in the browser: practice, summary, core weights and specialisations.",
  },
  {
    group: "Domain",
    name: "Readiness meter",
    file: "src/components/domain/readiness-meter.tsx",
    description: "Weighted share of a target's requirements met, with its band.",
  },
  {
    group: "UI",
    name: "Alert",
    file: "src/components/ui/alert.tsx",
    description: "A short, important message in the page.",
  },
  {
    group: "UI",
    name: "Avatar",
    file: "src/components/ui/avatar.tsx",
    description: "A person's picture or initials.",
  },
  { group: "UI", name: "Badge", file: "src/components/ui/badge.tsx", description: "A small label." },
  {
    group: "UI",
    name: "Button",
    file: "src/components/ui/button.tsx",
    description: "Actions, in six variants and several sizes.",
  },
  {
    group: "UI",
    name: "Card",
    file: "src/components/ui/card.tsx",
    description: "A group of related content.",
  },
  {
    group: "UI",
    name: "Dialog",
    file: "src/components/ui/dialog.tsx",
    description: "A modal window, e.g. to confirm a destructive change.",
  },
  {
    group: "UI",
    name: "Dropdown menu",
    file: "src/components/ui/dropdown-menu.tsx",
    description: "A menu of actions behind a button.",
  },
  { group: "UI", name: "Input", file: "src/components/ui/input.tsx", description: "A text field." },
  { group: "UI", name: "Label", file: "src/components/ui/label.tsx", description: "A form field's label." },
  { group: "UI", name: "Progress", file: "src/components/ui/progress.tsx", description: "A progress bar." },
  {
    group: "UI",
    name: "Select",
    file: "src/components/ui/select.tsx",
    description: "Pick one option from a list.",
  },
  {
    group: "UI",
    name: "Separator",
    file: "src/components/ui/separator.tsx",
    description: "A dividing line.",
  },
  {
    group: "UI",
    name: "Skeleton",
    file: "src/components/ui/skeleton.tsx",
    description: "A placeholder while content loads.",
  },
  {
    group: "UI",
    name: "Table",
    file: "src/components/ui/table.tsx",
    description: "Rows and columns of data.",
  },
  {
    group: "UI",
    name: "Tabs",
    file: "src/components/ui/tabs.tsx",
    description: "Switch between views of the same content.",
  },
  {
    group: "UI",
    name: "Toggle",
    file: "src/components/ui/toggle.tsx",
    description: "A button that stays on or off.",
  },
  {
    group: "UI",
    name: "Toggle group",
    file: "src/components/ui/toggle-group.tsx",
    description: "A set of toggles, one or many selected.",
  },
  {
    group: "UI",
    name: "Tooltip",
    file: "src/components/ui/tooltip.tsx",
    description: "A short hint on hover or focus.",
  },
];

/** The Storybook docs id for an entry: its stories use the title `${group}/${name}`. */
export const docsId = (e: Pick<CatalogueEntry, "group" | "name">) =>
  `${e.group}-${e.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "--docs";
