"use client";

import { useEffect, useRef, useState } from "react";
import type cytoscape from "cytoscape";
import { layoutEdges, readColors, stylesheet } from "@/lib/graph-style";
import { cn } from "@/lib/utils";

let registered = false;

/** Dims everything except the route and zooms to it; with no route, clears it. */
function applyHighlight(
  cy: cytoscape.Core,
  highlight: { nodes: readonly string[]; edges: readonly string[] } | null | undefined,
) {
  cy.elements().removeClass("dimmed route");
  if (!highlight) return;
  const route = cy.collection();
  for (const id of [...highlight.nodes, ...highlight.edges]) route.merge(cy.getElementById(id));
  if (route.empty()) return;
  cy.elements().addClass("dimmed");
  route.removeClass("dimmed").addClass("route");
  cy.fit(route, 80);
}

/**
 * The drawing: Cytoscape on a canvas, loaded in the browser when needed. It draws `elements` with `layout`, reports
 * clicks (`onSelect`, and a double click as `onOpen`) and follows the colour theme. It knows nothing about roles or
 * skills: the explorer prepares the elements (src/lib/graph-style.ts).
 */
export function GraphCanvas({
  elements,
  layout,
  selectedId,
  highlight,
  onSelect,
  onOpen,
  webgl = false,
  big = false,
  label,
  className,
}: {
  elements: cytoscape.ElementDefinition[];
  layout: cytoscape.LayoutOptions;
  selectedId: string | null;
  /** a route to show: its nodes and edges keep full strength, everything else is dimmed */
  highlight?: { nodes: readonly string[]; edges: readonly string[] } | null;
  onSelect: (id: string | null) => void;
  onOpen?: (id: string) => void;
  /** draw with WebGL instead of the 2D canvas: faster for very big graphs (read once, when the drawing is created) */
  webgl?: boolean;
  /** a very big graph: while panning and zooming, draw a cached image instead of every link (read once, at creation) */
  big?: boolean;
  /** the accessible name of the drawing */
  label: string;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const handlers = useRef({ onSelect, onOpen });
  const highlightRef = useRef(highlight);
  const webglRef = useRef(webgl);
  const bigRef = useRef(big);
  const [ready, setReady] = useState(false);
  const [layoutMs, setLayoutMs] = useState<number | null>(null);
  // milliseconds from the start of the page load to the first finished drawing: what the performance test measures
  const [readyAt, setReadyAt] = useState<number | null>(null);

  useEffect(() => {
    handlers.current = { onSelect, onOpen };
    highlightRef.current = highlight;
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
        style: stylesheet(readColors(host.current), bigRef.current),
        wheelSensitivity: 0.3,
        minZoom: 0.1,
        maxZoom: 3,
        ...(bigRef.current ? { textureOnViewport: true, hideEdgesOnViewport: true, pixelRatio: 1 } : {}),
        ...(webglRef.current
          ? ({
              renderer: {
                name: "canvas",
                webgl: true,
                webglTexSize: 4096,
                webglTexRows: 24,
                webglBatchSize: 2048,
                webglTexPerBatch: 14,
              },
            } as object)
          : {}),
      });
      // the performance test drives the view (pan, zoom) through this
      (host.current as HTMLDivElement & { __cy?: cytoscape.Core }).__cy = cy;
      cy.on("tap", "node", (e) => handlers.current.onSelect(e.target.id()));
      cy.on("dbltap", "node", (e) => handlers.current.onOpen?.(e.target.id()));
      cy.on("tap", (e) => {
        if (e.target === cy) handlers.current.onSelect(null);
      });
      // the colours come from the theme: redraw them when it changes
      observer = new MutationObserver(() => {
        if (cy && host.current) cy.style(stylesheet(readColors(host.current), bigRef.current));
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      cyRef.current = cy;
      performance.mark("graph:created");
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
    // only the strongest links steer a big layout; every link is still drawn
    const steering = new Set(
      layoutEdges(cy.edges().map((e) => ({ id: e.id(), strength: Number(e.data("strength")) }))).map(
        (e) => e.id,
      ),
    );
    const eles = cy.nodes().union(cy.edges().filter((e) => steering.has(e.id())));
    performance.mark("graph:added");
    const run = cy.layout({ ...layout, eles } as unknown as cytoscape.LayoutOptions);
    run.one("layoutstop", () => {
      performance.mark("graph:laid-out");
      cy.fit(undefined, 24);
      applyHighlight(cy, highlightRef.current);
      setLayoutMs(Math.round(performance.now() - started));
      setReadyAt((at) => at ?? Math.round(performance.now()));
    });
    run.run();
  }, [ready, elements, layout]);

  // show or clear a route without drawing the graph again
  useEffect(() => {
    const cy = cyRef.current;
    if (ready && cy) applyHighlight(cy, highlight);
  }, [ready, highlight]);

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
      data-ready-at={readyAt ?? undefined}
      data-nodes={elements.filter((e) => e.group === "nodes").length}
      data-edges={elements.filter((e) => e.group === "edges").length}
      className={cn("h-full min-h-80 w-full rounded-lg border bg-background", className)}
    />
  );
}
