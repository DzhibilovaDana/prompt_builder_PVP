import { NextRequest, NextResponse } from "next/server";

type Counter = {
  count: number;
  windowStartedAt: number;
};

const counters = new Map<string, Counter>();

const BLOCKED_PATH_PARTS = [
  "/.env",
  "/wp-admin",
  "/phpmyadmin",
  "/cgi-bin",
  "/vendor/phpunit",
  "/_ignition",
  "/actuator",
];

const BLOCKED_UA_PARTS = [
  "sqlmap",
  "nikto",
  "nmap",
  "masscan",
  "zgrab",
  "wpscan",
  "gobuster",
  "acunetix",
  "metasploit",
  "curl/7.",
  "python-requests",
  "go-http-client",
];

const MAX_BODY_BYTES = 64 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 90;

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const counter = counters.get(ip);

  if (!counter || now - counter.windowStartedAt >= RATE_LIMIT_WINDOW_MS) {
    counters.set(ip, { count: 1, windowStartedAt: now });
    return false;
  }

  counter.count += 1;
  return counter.count > RATE_LIMIT_MAX;
}

function hasBlockedPath(pathname: string): boolean {
  const normalized = pathname.toLowerCase();
  return BLOCKED_PATH_PARTS.some((part) => normalized.includes(part));
}

function hasBlockedUserAgent(userAgent: string): boolean {
  const normalized = userAgent.toLowerCase();
  return BLOCKED_UA_PARTS.some((part) => normalized.includes(part));
}

function requiresApiToken(pathname: string): boolean {
  return pathname.startsWith("/api/generate") || pathname.startsWith("/api/providers/health");
}

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (hasBlockedPath(pathname)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const userAgent = req.headers.get("user-agent") || "";
  if (userAgent && hasBlockedUserAgent(userAgent)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
  }

  const configuredApiToken = process.env.PB_API_TOKEN?.trim();
  if (configuredApiToken && requiresApiToken(pathname)) {
    const token = req.headers.get("x-api-token")?.trim();
    if (!token || token !== configuredApiToken) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
