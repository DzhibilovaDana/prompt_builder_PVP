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

const BLOCKED_HEADER_NAMES = [
  "x-middleware-subrequest",
  "x-now-route-matches",
  "x-matched-path",
  "x-invoke-path",
  "x-invoke-query",
  "x-invoke-status",
  "x-invoke-error",
  "x-invoke-output",
  "x-vercel-sc-headers",
];

const MAX_BODY_BYTES = 64 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 90;
const GENERATE_RATE_LIMIT_MAX = 30;

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

function logSecurityEvent(req: NextRequest, status: number, reason: string): void {
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || "unknown";
  console.warn(
    JSON.stringify({
      type: "security_event",
      status,
      reason,
      method: req.method,
      path: req.nextUrl.pathname,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    })
  );
}

function deny(req: NextRequest, status: number, error: string, reason: string): NextResponse {
  logSecurityEvent(req, status, reason);
  return NextResponse.json({ error }, { status });
}

function isRateLimited(ip: string, limit: number): boolean {
  const now = Date.now();
  const key = `${ip}:${limit}`;
  const counter = counters.get(key);

  if (!counter || now - counter.windowStartedAt >= RATE_LIMIT_WINDOW_MS) {
    counters.set(key, { count: 1, windowStartedAt: now });
    return false;
  }

  counter.count += 1;
  return counter.count > limit;
}

function hasBlockedPath(pathname: string): boolean {
  const normalized = pathname.toLowerCase();
  return BLOCKED_PATH_PARTS.some((part) => normalized.includes(part));
}

function hasBlockedUserAgent(userAgent: string): boolean {
  const normalized = userAgent.toLowerCase();
  return BLOCKED_UA_PARTS.some((part) => normalized.includes(part));
}

function hasBlockedInternalHeaders(req: NextRequest): boolean {
  return BLOCKED_HEADER_NAMES.some((header) => req.headers.has(header));
}

function isGeneratePath(pathname: string): boolean {
  return pathname.startsWith("/api/generate");
}

function hasSessionCookie(req: NextRequest): boolean {
  const token = req.cookies.get("pb_session")?.value;
  return typeof token === "string" && /^[A-Fa-f0-9]{64}$/.test(token);
}

function hasValidApiToken(req: NextRequest): boolean {
  const configuredApiToken = process.env.PB_API_TOKEN?.trim();
  if (!configuredApiToken) {
    return false;
  }

  const requestToken = req.headers.get("x-api-token")?.trim();
  return Boolean(requestToken && requestToken === configuredApiToken);
}

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (hasBlockedPath(pathname)) {
    return deny(req, 403, "forbidden", "blocked_path_signature");
  }

  if (hasBlockedInternalHeaders(req)) {
    return deny(req, 403, "forbidden", "blocked_internal_headers");
  }

  const userAgent = req.headers.get("user-agent") || "";
  if (userAgent && hasBlockedUserAgent(userAgent)) {
    return deny(req, 403, "forbidden", "blocked_user_agent");
  }

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return deny(req, 413, "payload too large", "payload_limit_exceeded");
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip, RATE_LIMIT_MAX)) {
    return deny(req, 429, "rate limit exceeded", "ip_rate_limit_exceeded");
  }

  if (isGeneratePath(pathname)) {
    if (isRateLimited(ip, GENERATE_RATE_LIMIT_MAX)) {
      return deny(req, 429, "rate limit exceeded", "generate_rate_limit_exceeded");
    }

    const sessionPresent = hasSessionCookie(req);
    const tokenValid = hasValidApiToken(req);

    if (!sessionPresent && !tokenValid) {
      return deny(req, 401, "unauthorized", "missing_generate_access_credentials");
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
