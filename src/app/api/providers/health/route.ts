import { NextResponse } from "next/server";
import { getProvidersHealth } from "@/lib/inference";
import { sanitizeProviderSecrets } from "@/lib/providerSecrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const providers = getProvidersHealth();
  return NextResponse.json({ mode: "ok", providers });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const providerKeys = sanitizeProviderSecrets(body.providerKeys);
  const providers = getProvidersHealth(providerKeys);

  return NextResponse.json({
    mode: "ok",
    source: "request.providerKeys",
    providers,
  });
}
