import tailwindcss from "@tailwindcss/vite";
import type { StorybookConfig } from "@storybook/nextjs-vite";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: { name: "@storybook/nextjs-vite", options: {} },
  // Tailwind 4 through Vite (the app itself uses the Turbopack loader in next.config.ts)
  viteFinal: (vite) => mergeConfig(vite, { plugins: [tailwindcss()] }),
};

export default config;
