"use client";

import { componentCatalogue, docsId, type ComponentGroup } from "../catalogue";
import { contrastRatio } from "../contrast";
import {
  contrastPairs,
  fonts,
  motion,
  primitives,
  semanticTokenNames,
  themeLabels,
  themeNames,
  themes,
} from "../tokens";

/** Blocks for the Storybook overview page (src/design-system/overview.mdx). Not app components. */

export function ColorScales() {
  return (
    <div className="not-prose grid gap-4">
      {Object.entries(primitives).map(([scale, steps]) => (
        <div key={scale}>
          <div className="mb-1 text-sm font-medium capitalize">{scale}</div>
          <div className="grid grid-cols-11 overflow-hidden rounded-lg border">
            {Object.entries(steps).map(([step, hex]) => (
              <div
                key={step}
                className="flex h-16 flex-col justify-end p-1 text-[10px]"
                style={{ background: hex }}
              >
                <span className={Number(step) >= 500 ? "text-white" : "text-black"}>
                  {step}
                  <br />
                  {hex}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Every semantic token per theme, plus a live swatch of the current one. */
export function SemanticTokens() {
  return (
    <div className="not-prose overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="text-left">
            <th className="border-b p-2">Token</th>
            <th className="border-b p-2">Current</th>
            {themeNames.map((t) => (
              <th key={t} className="border-b p-2">
                {themeLabels[t]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanticTokenNames.map((name) => (
            <tr key={name}>
              <td className="border-b p-2 font-mono">{name}</td>
              <td className="border-b p-2">
                <span
                  className="inline-block size-6 rounded border"
                  style={{ background: `var(--${name})` }}
                />
              </td>
              {themeNames.map((t) => (
                <td key={t} className="border-b p-2">
                  <span className="flex items-center gap-1.5 font-mono">
                    <span
                      className="inline-block size-4 rounded border"
                      style={{ background: themes[t][name] }}
                    />
                    {themes[t][name]}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The contrast pairs checked in tokens.test.ts, with their ratios. */
export function ContrastTable() {
  return (
    <div className="not-prose overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="text-left">
            <th className="border-b p-2">Pair</th>
            <th className="border-b p-2">Minimum</th>
            {themeNames.map((t) => (
              <th key={t} className="border-b p-2">
                {themeLabels[t]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {contrastPairs.map(([fg, bg, min]) => (
            <tr key={`${fg}-${bg}`}>
              <td className="border-b p-2 font-mono">
                {fg} on {bg}
              </td>
              <td className="border-b p-2">{min}:1</td>
              {themeNames.map((t) => (
                <td key={t} className="border-b p-2">
                  <span
                    className="rounded px-1.5 py-0.5 font-medium"
                    style={{ color: themes[t][fg], background: themes[t][bg] }}
                  >
                    {contrastRatio(themes[t][fg], themes[t][bg]).toFixed(1)}:1
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const typeScale = [
  ["text-5xl font-bold", "Heading 1: 48 px bold"],
  ["text-4xl font-bold", "Heading 2: 36 px bold"],
  ["text-2xl font-semibold", "Heading 3: 24 px semibold"],
  ["text-xl font-semibold", "Heading 4: 20 px semibold"],
  ["text-lg", "Lead: 18 px"],
  ["text-base", "Body: 16 px"],
  ["text-sm", "Small: 14 px, most UI text"],
  ["text-xs", "Extra small: 12 px, badges and captions"],
] as const;

export function Typography() {
  return (
    <div className="not-prose grid gap-2">
      <p className="text-sm text-muted-foreground">
        <code>{fonts.sans}</code>
      </p>
      {typeScale.map(([cls, label]) => (
        <div key={cls} className="flex items-baseline gap-4">
          <code className="w-40 shrink-0 text-xs text-muted-foreground">{cls}</code>
          <span className={cls}>{label}</span>
        </div>
      ))}
      <div className="flex items-baseline gap-4">
        <code className="w-40 shrink-0 text-xs text-muted-foreground">font-mono</code>
        <span className="font-mono text-sm">AZ-104 · 2026-11-14</span>
      </div>
    </div>
  );
}

export function RadiusAndShadows() {
  return (
    <div className="not-prose flex flex-wrap gap-4">
      {["rounded-sm", "rounded-md", "rounded-lg", "rounded-xl", "rounded-2xl", "rounded-full"].map((r) => (
        <div key={r} className={`flex size-20 items-center justify-center border bg-card text-[10px] ${r}`}>
          {r}
        </div>
      ))}
      {["shadow-xs", "shadow-sm", "shadow-md", "shadow-lg"].map((s) => (
        <div
          key={s}
          className={`flex size-20 items-center justify-center rounded-lg bg-card text-[10px] ${s}`}
        >
          {s}
        </div>
      ))}
    </div>
  );
}

export function Motion() {
  return (
    <ul className="not-prose grid gap-1 text-sm">
      {Object.entries(motion).map(([name, value]) => (
        <li key={name}>
          <code>--{name}</code>: {value}
        </li>
      ))}
    </ul>
  );
}

const groups: ComponentGroup[] = ["Domain", "UI"];

/** Every component in the catalogue, with a link to its docs page. */
export function ComponentIndex() {
  return (
    <div className="not-prose grid gap-6">
      {groups.map((group) => (
        <div key={group}>
          <h3 className="mb-2 text-base font-semibold">{group}</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {componentCatalogue
              .filter((e) => e.group === group)
              .map((e) => (
                <li key={e.file} className="rounded-lg border p-3">
                  <a
                    className="font-medium text-link underline-offset-4 hover:underline"
                    href={`./?path=/docs/${docsId(e)}`}
                    target="_top"
                  >
                    {e.name}
                  </a>
                  <p className="text-xs text-muted-foreground">{e.description}</p>
                  <code className="text-[10px] text-muted-foreground">{e.file}</code>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
