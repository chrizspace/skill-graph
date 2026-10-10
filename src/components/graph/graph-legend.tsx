import { SHAPES, TYPE_LABEL } from "@/lib/graph-style";
import type { NodeType } from "@/domain/graph";

const shapePath: Record<(typeof SHAPES)[NodeType], string> = {
  hexagon: "M8 1.5 14 5v6l-6 3.5L2 11V5z",
  ellipse: "M8 2.5a5.5 4.5 0 1 0 .01 0z",
  diamond: "M8 1.5 14.5 8 8 14.5 1.5 8z",
  star: "m8 1.5 1.9 4 4.4.6-3.2 3 .8 4.4L8 11.4l-3.9 2.1.8-4.4-3.2-3 4.4-.6z",
};
const fillVar: Record<NodeType, string> = {
  role: "var(--node-role)",
  specialization: "var(--node-specialization)",
  technical_skill: "var(--node-technical)",
  soft_skill: "var(--node-soft)",
  certification: "var(--node-certification)",
};

const Line = ({ dash, color, width = 3 }: { dash?: string; color: string; width?: number }) => (
  <svg aria-hidden width="36" height="10" viewBox="0 0 36 10">
    <line x1="1" y1="5" x2="35" y2="5" stroke={color} strokeWidth={width} strokeDasharray={dash} />
  </svg>
);

/**
 * What the shapes and lines mean. Always visible: colour is never the only signal, so the weight lines are also solid,
 * dashed and dotted, and the weight is written in the labels.
 */
export function GraphLegend({
  showWeights = true,
  showMyView = false,
}: {
  showWeights?: boolean;
  showMyView?: boolean;
}) {
  return (
    <section aria-label="Legend" className="flex flex-col gap-3 rounded-lg border p-3 text-sm">
      <h2 className="text-sm font-semibold">Legend</h2>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
        {(Object.keys(SHAPES) as NodeType[]).map((t) => (
          <li key={t} className="flex items-center gap-2">
            <svg aria-hidden width="18" height="18" viewBox="0 0 16 16">
              <path d={shapePath[SHAPES[t]]} fill={fillVar[t]} stroke="var(--foreground)" strokeWidth="1" />
            </svg>
            {TYPE_LABEL[t]}
          </li>
        ))}
        <li className="col-span-2 flex items-center gap-2 text-muted-foreground">
          <svg aria-hidden width="18" height="18" viewBox="0 0 16 16">
            <path
              d={shapePath.ellipse}
              fill="var(--node-technical)"
              stroke="var(--foreground)"
              strokeWidth="2.5"
            />
          </svg>
          Thick outline: tool or platform
        </li>
      </ul>
      {showWeights && (
        <ul className="flex flex-col gap-1">
          <li className="flex items-center gap-2">
            <Line color="var(--critical)" /> Critical (solid)
          </li>
          <li className="flex items-center gap-2">
            <Line color="var(--important)" dash="7 4" /> Important (dashed)
          </li>
          <li className="flex items-center gap-2">
            <Line color="var(--nice)" dash="2 4" /> Nice to have (dotted)
          </li>
          <li className="text-xs text-muted-foreground">
            Colours show weights only around a role. Thicker lines are stronger links; arrows are official
            career paths.
          </li>
        </ul>
      )}
      {showMyView && (
        <ul className="flex flex-col gap-1">
          <li>✓ I have it</li>
          <li>○ I still need it (hollow, dashed outline)</li>
          <li className="opacity-55">✓ expired certification (faded): still held</li>
        </ul>
      )}
    </section>
  );
}
