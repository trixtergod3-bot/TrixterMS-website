import { readCharacterAchievementsVerified, readPortal, portalRequest } from "../../../lib/portal/data";
import type { PortalQuery } from "../../../lib/portal/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query: PortalQuery = {};
  try {
    for (const [key, value] of url.searchParams) {
      if (Object.hasOwn(query, key)) throw new Error("Duplicate query");
      query[key] = value;
    }
    portalRequest(url.pathname, query);
  } catch {
    return Response.json({ status: "unavailable", data: null, asOf: null, message: "Unknown endpoint or invalid request.", source: "none" }, { status: 400 });
  }
  const endpoint = portalRequest(url.pathname, query);
  const result = endpoint.kind === "characterAchievements"
    ? await readCharacterAchievementsVerified(url.pathname.split("/")[3])
    : await readPortal(url.pathname, query);
  return Response.json(result, { status: result.status === "live" || result.status === "fixture" ? 200 : 503, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
