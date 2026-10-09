import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta = { title: "UI/Tabs", component: Tabs } satisfies Meta<typeof Tabs>;
export default meta;

export const GraphOrTable: StoryObj<typeof meta> = {
  render: () => (
    <Tabs defaultValue="graph" className="max-w-md">
      <TabsList>
        <TabsTrigger value="graph">Graph</TabsTrigger>
        <TabsTrigger value="table">Table</TabsTrigger>
      </TabsList>
      <TabsContent value="graph" className="text-sm">
        The interactive graph.
      </TabsContent>
      <TabsContent value="table" className="text-sm">
        The same data as a table.
      </TabsContent>
    </Tabs>
  ),
};
