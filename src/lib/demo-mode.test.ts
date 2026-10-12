import { describe, expect, it } from "vitest";
import { isDemoDeployment } from "./demo-mode";

describe("demo deployment", () => {
  it("is on locally and on previews", () => {
    expect(isDemoDeployment({})).toBe(true);
    expect(isDemoDeployment({ VERCEL_ENV: "preview" })).toBe(true);
    expect(isDemoDeployment({ VERCEL_ENV: "development" })).toBe(true);
  });
  it("is off on production unless the owner turns it on", () => {
    expect(isDemoDeployment({ VERCEL_ENV: "production" })).toBe(false);
    expect(isDemoDeployment({ VERCEL_ENV: "production", ENABLE_DEMO_SIGN_IN: "false" })).toBe(false);
    expect(isDemoDeployment({ VERCEL_ENV: "production", ENABLE_DEMO_SIGN_IN: "1" })).toBe(false);
    expect(isDemoDeployment({ VERCEL_ENV: "production", ENABLE_DEMO_SIGN_IN: "true" })).toBe(true);
  });
});
