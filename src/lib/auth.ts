import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "cnc_session";

interface SessionPayload {
  role: "admin_writer";
  iat: number;
  exp: number;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parseCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.trim().split("=");
    if (rawName === name) {
      return decodeURIComponent(rawValueParts.join("="));
    }
  }

  return null;
}

function createSignature(payload: string): string {
  const secret = getRequiredEnv("SESSION_SECRET");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function parsePayload(encodedPayload: string): SessionPayload | null {
  try {
    const json = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const payload = JSON.parse(json) as SessionPayload;

    if (payload.role !== "admin_writer") {
      return null;
    }

    if (typeof payload.iat !== "number" || typeof payload.exp !== "number") {
      return null;
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function isValidPassword(password: string): boolean {
  const expected = getRequiredEnv("APP_PASSWORD");
  return secureEqual(password, expected);
}

export function createSessionToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    role: "admin_writer",
    iat: now,
    exp: now + 60 * 60 * 24 * 14
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createSignature(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string | null | undefined): boolean {
  if (!token) {
    return false;
  }

  const segments = token.split(".");
  if (segments.length !== 2) {
    return false;
  }

  const [payloadSegment, signatureSegment] = segments;
  const expectedSignature = createSignature(payloadSegment);

  if (!secureEqual(signatureSegment, expectedSignature)) {
    return false;
  }

  return parsePayload(payloadSegment) !== null;
}

export function isAuthorizedRequest(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie");
  const token = parseCookieValue(cookieHeader, SESSION_COOKIE_NAME);
  return verifySessionToken(token);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  };
}
