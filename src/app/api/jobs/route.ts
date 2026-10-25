import { NextRequest, NextResponse } from "next/server";
import { parseFilters } from "@/lib/search";
import { searchCatalog } from "@/lib/catalog";
export async function GET(request: NextRequest) {
  const filters = parseFilters(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  const result = await searchCatalog(filters);
  return NextResponse.json(result, {
    status: result.error ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
