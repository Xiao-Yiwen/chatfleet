import { createRoom } from "../../../lib/rooms";
import { publicState } from "../../../lib/game";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Invalid origin." }, { status: 403 });
  try { const r = await createRoom(); return Response.json({ state: publicState(r.state), key: r.key }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Mission database unavailable. Please try again shortly." }, { status: 503 }); }
}
