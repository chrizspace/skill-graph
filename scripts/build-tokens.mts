// `pnpm tokens`: writes src/design-system/tokens.css from src/design-system/tokens.ts (a unit test fails if they drift).
import { writeFileSync } from "node:fs";
import { renderTokensCss } from "../src/design-system/render-css";

writeFileSync("src/design-system/tokens.css", renderTokensCss());
console.log("tokens: wrote src/design-system/tokens.css");
