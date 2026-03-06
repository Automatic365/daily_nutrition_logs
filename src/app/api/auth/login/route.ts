import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  isValidPassword,
  sessionCookieOptions
} from "@/lib/auth";

interface LoginBody {
  password?: unknown;
}

export async function POST(request: Request) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (typeof body.password !== "string") {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  if (!isValidPassword(body.password)) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const token = createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());

  return response;
}
