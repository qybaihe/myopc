import { NextResponse } from "next/server";
import { getIntegrationSnapshots } from "@/lib/integration-probes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const services = await getIntegrationSnapshots();
  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    services,
  });
}
