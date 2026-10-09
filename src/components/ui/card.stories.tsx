import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

const meta = { title: "UI/Card", component: Card } satisfies Meta<typeof Card>;
export default meta;

export const Default: StoryObj<typeof meta> = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Data Engineer</CardTitle>
        <CardDescription>Data & AI</CardDescription>
      </CardHeader>
      <CardContent className="text-sm">
        Designs and runs the pipelines that turn raw data into reliable datasets.
      </CardContent>
      <CardFooter>
        <Button size="sm">Compare with my profile</Button>
      </CardFooter>
    </Card>
  ),
};
