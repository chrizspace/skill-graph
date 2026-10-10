import { describe, expect, it } from "vitest";
import { focusView, overview, roleView } from "@/domain/explore";
import type { MyState } from "@/domain/explore";
import { seedGraph } from "@/domain/testing/seed-graph";
import { layoutFor, SHAPES, stylesheet, toElements, WEIGHT_LABEL } from "./graph-style";

const graph = seedGraph();
const label = (els: ReturnType<typeof toElements>, id: string) =>
  els.find((e) => e.data.id === id)!.data.label;
const classes = (els: ReturnType<typeof toElements>, id: string) =>
  els.find((e) => e.data.id === id)!.classes;

describe("toElements", () => {
  it("the overview is neutral: no weight in labels, no coloured edges", () => {
    const els = toElements(graph, overview(graph));
    expect(els.filter((e) => e.group === "nodes")).toHaveLength(graph.nodes.size);
    expect(label(els, "SQL")).toBe("SQL");
    expect(els.filter((e) => e.group === "edges").every((e) => e.data.weight === null)).toBe(true);
  });

  it("a role in view colours its requirements and spells the weight in the label", () => {
    const els = toElements(graph, roleView(graph, "Data Engineer"));
    expect(label(els, "SQL")).toBe("SQL · Critical");
    expect(label(els, "Spark")).toBe("Spark · Important");
    expect(label(els, "Agile")).toBe("Agile · Nice to have");
    const edge = els.find((e) => e.group === "edges" && e.data.target === "SQL")!;
    expect(edge.classes).toContain("w-critical");
  });

  it("a focus on a skill stays neutral; on a role only that role's requirements are coloured", () => {
    const skill = toElements(graph, focusView(graph, "Python", 1));
    expect(skill.filter((e) => e.group === "edges").every((e) => e.data.weight === null)).toBe(true);
    const role = toElements(graph, focusView(graph, "Data Engineer", 2));
    const coloured = role.filter((e) => e.group === "edges" && e.data.weight);
    expect(coloured.length).toBeGreaterThan(0);
    expect(coloured.every((e) => e.data.source === "Data Engineer")).toBe(true);
  });

  it("my view marks every item in words and symbols, not colour alone", () => {
    const states = new Map<string, MyState>([
      ["SQL", "met"],
      ["Python", "missing"],
      ["Azure Fundamentals (AZ-900)", "expired"],
      ["Certified Kubernetes Administrator (CKA)", "expiring"],
    ]);
    const els = toElements(graph, overview(graph), { states });
    expect(label(els, "SQL")).toBe("✓ SQL");
    expect(label(els, "Python")).toBe("○ Python");
    expect(label(els, "Azure Fundamentals (AZ-900)")).toBe("✓ Azure Fundamentals (AZ-900) (expired)");
    expect(label(els, "Certified Kubernetes Administrator (CKA)")).toContain("(expiring)");
    expect(classes(els, "Python")).toContain("missing");
    expect(classes(els, "Azure Fundamentals (AZ-900)")).toContain("expired");
  });

  it("tools are marked, the centre is marked, and rings follow weight", () => {
    const els = toElements(graph, roleView(graph, "Scrum Master"));
    expect(classes(els, "Scrum Master")).toContain("center");
    const ring = (id: string) => els.find((e) => e.data.id === id)!.data.ring;
    expect([
      ring("Scrum Master"),
      ring("Scrum Master: SAFe"),
      ring("Scrum"),
      ring("Facilitation"),
      ring("Jira"),
    ]).toEqual([0, 1, 2, 3, 4]);
    const tool = [...graph.nodes.values()].find((n) => n.category === "Tool / platform")!;
    expect(classes(toElements(graph, overview(graph)), tool.id)).toContain("tool");
  });
});

describe("layoutFor", () => {
  it("picks a layout per view", () => {
    expect(layoutFor(overview(graph)).name).toBe("fcose");
    expect(layoutFor(roleView(graph, "Data Engineer")).name).toBe("concentric");
    expect(layoutFor(focusView(graph, "SQL", 1)).name).toBe("concentric");
  });
  it("uses a rougher force layout for a big graph", () => {
    const big = overview(graph);
    const many = { ...big, nodes: Array.from({ length: 900 }, () => big.nodes[0]) };
    expect((layoutFor(many) as unknown as { quality: string }).quality).toBe("draft");
    expect((layoutFor(big) as unknown as { quality: string }).quality).toBe("default");
  });
});

describe("stylesheet", () => {
  const colors = Object.fromEntries(
    [
      "background",
      "foreground",
      "muted-foreground",
      "border",
      "ring",
      "critical",
      "important",
      "nice",
      "node-role",
      "node-specialization",
      "node-technical",
      "node-soft",
      "node-certification",
    ].map((k) => [k, "#123456"]),
  ) as Parameters<typeof stylesheet>[0];
  const sheet = stylesheet(colors);
  const find = (selector: string) =>
    sheet.find((s) => s.selector === selector) as unknown as { style: Record<string, unknown> };

  it("weights are colour plus line style, strength is width", () => {
    expect(find("edge.w-critical").style["line-style"]).toBe("solid");
    expect(find("edge.w-important").style["line-style"]).toBe("dashed");
    expect(find("edge.w-nice").style["line-style"]).toBe("dotted");
    expect(find("edge").style.width).toBe("mapData(strength, 1, 5, 1, 6)");
  });
  it("every type has its own shape", () => {
    expect(new Set([SHAPES.role, SHAPES.technical_skill, SHAPES.soft_skill, SHAPES.certification]).size).toBe(
      4,
    );
    expect(find("node.certification").style.shape).toBe("star");
    expect(find("node.soft_skill").style.shape).toBe("diamond");
  });
  it("official paths are arrows", () => {
    expect(find("edge.next_step").style["target-arrow-shape"]).toBe("triangle");
  });
  it("has a label for each weight", () => {
    expect(Object.values(WEIGHT_LABEL)).toEqual(["Critical", "Important", "Nice to have"]);
  });
});
