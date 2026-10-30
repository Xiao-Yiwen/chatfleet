import { env } from "cloudflare:workers";
import { newGame, tick, type GameState } from "./game";
type Row = { id: string; host_hash: string; state: string; version: number; created_at: number };
function db() { if (!env.DB) throw new Error("Mission database is unavailable."); return env.DB; }
export async function hashKey(key: string) { return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key)))].map(b => b.toString(16).padStart(2, "0")).join(""); }
export async function createRoom() {
  const id = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const key = crypto.randomUUID() + crypto.randomUUID();
  const state = newGame(id);
  await db().prepare("INSERT INTO rooms (id, host_hash, state, version, created_at) VALUES (?, ?, ?, 0, ?)").bind(id, await hashKey(key), JSON.stringify(state), Date.now()).run();
  return { state, key };
}
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function updateRoom<T>(id: string, key: string | null, mutate: (s: GameState) => T) {
  if (!/^[a-f0-9]{12}$/.test(id)) throw new ApiError("Invalid mission ID.", 400);
  const digest = key === null ? null : await hashKey(key);
  for (let attempt = 0; attempt < 8; attempt++) {
    const row = await db().prepare("SELECT * FROM rooms WHERE id = ?").bind(id).first<Row>();
    if (!row) throw new ApiError("Mission not found. Create a new mission.", 404);
    if (digest !== null && digest !== row.host_hash) throw new ApiError("This action requires the captain's key.", 403);
    const state: GameState = JSON.parse(row.state); const before = row.state;
    tick(state); const result = mutate(state); const serialized = JSON.stringify(state);
    if (serialized === before) return { state, result };
    const written = await db().prepare("UPDATE rooms SET state = ?, version = version + 1 WHERE id = ? AND version = ?").bind(serialized, id, row.version).run();
    if (written.meta.changes) return { state, result };
  }
  throw new ApiError("Mission is busy. Try again in a moment.", 409);
}
