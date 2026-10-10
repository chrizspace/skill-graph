"use client";

import { useEffect, useRef, useState } from "react";
import type cytoscape from "cytoscape";
import { readColors, stylesheet } from "@/lib/graph-style";
import { cn } from "@/lib/utils";

let registered = false;

/**
 * The drawing: Cytoscape on a canvas, loaded in the browser when needed. It draws `elements` with `layout`, reports
 * clicks (`onSelect`, and a double click as `onOpen`) and follows the colour theme. It knows nothing about roles or
 * skills: the explorer prepares the elements (src/lib/graph-style.ts).
 */
export function GraphCanvas({
  elements,
  layout,
  selectedId,
  onSelect,
  onOpen,
  label,
  className,
}: {
  elements: cytoscape.ElementDefinition[];
  layout: cytoscape.LayoutOptions;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onOpen?: (id: string) => void;
  /** the accessible name of the drawing */
  label: string;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const handlers = useRef({ onSelect, onOpen });
  const [ready, setReady] = useState(false);
  const [layoutMs, setLayoutMs] = useState<number | null>(null);

  useEffect(() => {
    handlers.current = { onSelect, onOpen };
  });

  // create Cytoscape once, in the browser
  useEffect(() => {
    let cy: cytoscape.Core | undefined;
    let cancelled = false;
    let observer: MutationObserver | undefined;
    (async () => {
      const [{ default: cytoscape }, { default: fcose }] = await Promise.all([
        import("cytoscape"),
        import("cytoscape-fcose"),
      ]);
      if (cancelled || !host.current) return;
      if (!registered) {
        cytoscape.use(fcose);
        registered = true;
      }
      cy = cytoscape({
        container: host.current,
        style: stylesheet(readColors(host.current)),
        wheelSensitivity: 0.3,
        minZoom: 0.1,
        maxZoom: 3,
      });
      cy.on("tap", "node", (e) => handlers.current.onSelect(e.target.id()));
      cy.on("dbltap", "node", (e) => handlers.current.onOpen?.(e.target.id()));
      cy.on("tap", (e) => {
        if (e.target === cy) handlers.current.onSelect(null);
      });
      // the colours come from the theme: redraw them when it changes
      observer = new MutationObserver(() => {
        if (cy && host.current) cy.style(stylesheet(readColors(host.current)));
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      cyRef.current = cy;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      observer?.disconnect();
      cy?.destroy();
      cyRef.current = null;
    };
  }, []);

  // draw a new view
  useEffect(() => {
    const cy = cyRef.current;
    if (!ready || !cy) return;
    const started = performance.now();
    cy.batch(() => {
      cy.elements().remove();
      cy.add(elements);
    });
    const run = cy.layout(layout);
    run.one("layoutstop", () => {
      cy.fit(undefined, 24);
      setLayoutMs(Math.round(performance.now() - started));
    });
    run.run();
  }, [ready, elements, layout]);

  // follow the selection made elsewhere (the panel, the keyboard)
  useEffect(() => {
    const cy = cyRef.current;
    if (!ready || !cy) return;
    cy.$(":selected").unselect();
    if (selectedId) {
      const n = cy.getElementById(selectedId);
      if (n.nonempty()) {
        n.select();
        cy.animate({ center: { eles: n }, duration: 150 });
      }
    }
  }, [ready, selectedId, elements]);

  return (
    <div
      ref={host}
      role="img"
      aria-label={label}
      data-ready={ready && layoutMs !== null}
      data-layout-ms={layoutMs ?? undefined}
      data-nodes={elements.filter((e) => e.group === "nodes").length}
      data-edges={elements.filter((e) => e.group === "edges").length}
      className={cn("h-full min-h-80 w-full rounded-lg border bg-background", className)}
    />
  );
}
