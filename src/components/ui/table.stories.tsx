import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PriorityBadge } from "@/components/domain/priority-badge";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "./table";

const meta = { title: "UI/Table", component: Table } satisfies Meta<typeof Table>;
export default meta;

const rows = [
  ["SQL", "critical", "Technical skill"],
  ["Python", "critical", "Technical skill"],
  ["Spark", "important", "Technical skill"],
  ["Agile", "nice", "Technical skill"],
] as const;

export const Requirements: StoryObj<typeof meta> = {
  render: () => (
    <Table>
      <TableCaption>Data Engineer: core requirements</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Weight</TableHead>
          <TableHead>Type</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(([item, weight, type]) => (
          <TableRow key={item}>
            <TableCell className="font-medium">{item}</TableCell>
            <TableCell>
              <PriorityBadge weight={weight} />
            </TableCell>
            <TableCell>{type}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};
