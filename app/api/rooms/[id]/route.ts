import { ApiError, updateRoom } from "../../../../lib/rooms";
import { act, control, publicState } from "../../../../lib/game";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try { const { state } = await updateRoom((await context.params).id, null, () => null); return Response.json(publicState(state), { headers }); }
  catch (e) { return failure(e); }
}
export async function POST(request: Request, context: Context) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new ApiError("Invalid origin.", 403);
    const key = request.headers.get("X-Captain-Key"); if (!key || key.length > 200) throw new ApiError("Captain key required.", 403);
    const raw = await request.text(); if (raw.length > 4000) throw new ApiError("Request too large.", 413);
    let body; try { body = JSON.parse(raw); } catch { throw new ApiError("Invalid JSON.", 400); }
    if (!body || typeof body !== "object") throw new ApiError("Invalid request.", 400);
    const { state, result } = await updateRoom((await context.params).id, key, s => {
      if (body.type === "command") {
        for (const k of ["id", "name", "text", "messageId", "source"]) if (typeof body[k] !== "string" || body[k].length > 200) throw new ApiError("Invalid crew command.", 400);
        if (!["demo", "twitch"].includes(body.source)) throw new ApiError("Invalid command source.", 400);
        return act(s, body);
      }
      if (body.type === "control" && ["ping", "launch", "pause", "resume", "route", "mode", "channel", "reset"].includes(body.action)) {
        if (body.value !== undefined && typeof body.value !== "string") throw new ApiError("Invalid control value.", 400);
        control(s, body.action, body.value); return { accepted: true };
      }
      throw new ApiError("Unknown mission action.", 400);
    });
    return Response.json({ state: publicState(state), result }, { headers });
  } catch (e) { return failure(e); }
}
function failure(e: unknown) { return Response.json({ error: e instanceof ApiError ? e.message : "Mission service unavailable. Try again shortly." }, { status: e instanceof ApiError ? e.status : 503, headers }); }
