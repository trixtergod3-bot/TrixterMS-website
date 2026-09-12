import { readCharacterAchievementsVerified, readPortal, portalRequest } from "../../../lib/portal/data.ts";
import { isPublicPath, publicRequest, readPublic, PublicRateLimitError } from "../../../lib/portal/public-data.ts";
import type { PortalQuery } from "../../../lib/portal/contracts.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query: PortalQuery = Object.create(null) as PortalQuery;
  try {
    for (const [key, value] of url.searchParams) {
      if (Object.hasOwn(query, key)) throw new Error("Duplicate query");
      query[key] = value;
    }
    if (isPublicPath(url.pathname)) publicRequest(url.pathname, query);
    else portalRequest(url.pathname, query);
  } catch {
    return Response.json({ status: "unavailable", data: null, asOf: null, message: "Unknown endpoint or invalid request.", source: "none" }, { status: 400, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  }
  if (isPublicPath(url.pathname)) {
    try {
      const result = await readPublic(url.pathname, query);
      return Response.json(result, { status: result.status === "live" || result.status === "stale" ? 200 : 503, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...(result.status === "unavailable" ? { "Retry-After": "10" } : {}) } });
    } catch (error) {
      if (!(error instanceof PublicRateLimitError)) throw error;
      return Response.json({ status: "unavailable", data: null, asOf: null, message: "Public data is temporarily busy. Please retry shortly.", source: "none" }, { status: 429, headers: { "Retry-After": "1", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    }
  }
  const endpoint = portalRequest(url.pathname, query);
  const result = endpoint.kind === "characterAchievements"
    ? await readCharacterAchievementsVerified(url.pathname.split("/")[3])
    : await readPortal(url.pathname, query);
  return Response.json(result, { status: result.status === "live" || result.status === "fixture" ? 200 : 503, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
