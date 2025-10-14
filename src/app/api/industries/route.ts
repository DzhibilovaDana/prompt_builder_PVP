// src/app/api/industries/route.ts
import { NextResponse } from "next/server";
import { readConfig } from "@/lib/config";
export const dynamic = "force-dynamic";
export async function GET() {
  const cfg = await readConfig();
  return NextResponse.json(cfg.industries);
}