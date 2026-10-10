import { toNextJsHandler } from "better-auth/next-js";
import { authConfigured, getAuth } from "@/lib/auth";

const unavailable = () => Response.json({ error: "Sign-in isn't configured." }, { status: 503 });

export const GET = (request: Request) =>
  authConfigured ? toNextJsHandler(getAuth()).GET(request) : unavailable();
export const POST = (request: Request) =>
  authConfigured ? toNextJsHandler(getAuth()).POST(request) : unavailable();
