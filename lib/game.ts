/** Pure, deterministic simulation shared by server, preview, and tests. */
export type Command = "boost" | "shield" | "scan";
export type FlightStatus = "ready" | "running" | "paused" | "won" | "lost";
export type Crew = { id: string; name: string; role: Command; actions: number; lastAt: number };
export type FlightEvent = { id: string; at: number; text: string; kind: "system" | "chat" | "relay" | "danger"; name?: string; command?: Command; source?: "demo" | "twitch" };
export type GameState = {
  id: string; status: FlightStatus; mode: "demo" | "twitch"; channel: string;
  elapsed: number; lastTick: number; hull: number; shield: number; fuel: number;
  sector: number; distance: number; scan: number; rescued: number; score: number;
  route: "safe" | "fast"; crew: Crew[]; events: FlightEvent[]; processed: string[];
  relay: { command: Command; user: string; at: number }[]; lastRelay: number;
  actions: number; relays: number; launchedAt: number | null;
};
export const SECTORS = [
  { name: "Verdant Reach", code: "VR–07", type: "BOTANICAL RESEARCH STATION", briefing: "Three scientists. One fading distress signal. Bring them home.", color: "#92cba3" },
  { name: "The Amber Drift", code: "AD–12", type: "ASTEROID MINING OUTPOST", briefing: "A mining crew is stranded in the debris field. Keep those shields up.", color: "#e5b97a" },
  { name: "The Violet Expanse", code: "VE–03", type: "DEEP SPACE OBSERVATORY", briefing: "One last signal beyond the nebula. No one gets left behind.", color: "#b6a1eb" },
];
const clamp = (n: number, max = 100) => Math.max(0, Math.min(max, n));
export function addEvent(s: GameState, e: Omit<FlightEvent, "id" | "at">) {
  s.events.push({ ...e, id: `${s.elapsed}-${s.actions}-${s.events.length}-${s.score}`, at: s.elapsed });
  s.events = s.events.slice(-55);
}
export function newGame(id: string, now = Date.now()): GameState {
  const s: GameState = { id, status: "ready", mode: "demo", channel: "", elapsed: 0, lastTick: now, hull: 100, shield: 65, fuel: 85, sector: 0, distance: 0, scan: 0, rescued: 0, score: 0, route: "safe", crew: [], events: [], processed: [], relay: [], lastRelay: -20, actions: 0, relays: 0, launchedAt: null };
  addEvent(s, { kind: "system", text: "Flight systems online. Waiting for the captain." });
  return s;
}
function checkSector(s: GameState) {
  if (s.status !== "running" || s.distance < 100 || s.scan < 12) return;
  s.rescued += 3; s.score += 300; s.sector++;
  addEvent(s, { kind: "system", text: `Rescue complete. ${s.rescued} people safely aboard.` });
  s.distance = 0; s.scan = 0; s.shield = clamp(s.shield + 15);
  if (s.sector >= 3) {
    s.status = "won"; s.score += Math.round((180 - s.elapsed) * 5 + s.hull * 3);
    addEvent(s, { kind: "relay", text: "MISSION COMPLETE. Nine lives saved. One incredible crew." });
  } else addEvent(s, { kind: "system", text: `Entering ${SECTORS[s.sector].name}. Scan for the next distress signal.` });
}
export function tick(s: GameState, now = Date.now()): GameState {
  const steps = Math.max(0, Math.floor((now - s.lastTick) / 1000));
  if (s.status !== "running") return s;
  for (let i = 0; i < Math.min(steps, 181) && s.status === "running"; i++) {
    s.elapsed++; s.fuel = clamp(s.fuel + 0.8); s.distance = clamp(s.distance + (s.route === "fast" ? 1.3 : 0.8));
    if (s.elapsed % 12 === 0) {
      const damage = s.route === "fast" ? 24 : 16;
      const absorbed = Math.min(s.shield, damage); s.shield -= absorbed; s.hull = clamp(s.hull - (damage - absorbed));
      addEvent(s, { kind: "danger", text: absorbed === damage ? `Debris impact absorbed. Shields −${damage}.` : `Hull hit! ${damage - absorbed} damage. Call for !shield.` });
    }
    checkSector(s);
    if (s.status === "running" && (s.hull <= 0 || s.elapsed >= 180)) {
      s.status = "lost";
      addEvent(s, { kind: "danger", text: s.hull <= 0 ? "Hull integrity lost. Your crew can try again." : "Rescue window closed. Regroup and launch again." });
    }
  }
  s.lastTick += steps * 1000;
  return s;
}
export function parseCommand(text: string): Command | null {
  const m = text.trim().toLowerCase().match(/^!(boost|shield|scan)(?:\s|$)/);
  return m ? m[1] as Command : null;
}
export function act(s: GameState, input: { id: string; name: string; text: string; messageId: string; source: "demo" | "twitch" }, now = Date.now()): { accepted: boolean; reason?: string } {
  tick(s, now);
  if (s.status !== "running") return { accepted: false, reason: "Launch or resume the mission first." };
  if (s.mode !== input.source) return { accepted: false, reason: "This command belongs to a different input mode." };
  const command = parseCommand(input.text);
  if (!command) return { accepted: false, reason: "Use !boost, !shield, or !scan." };
  if (s.processed.includes(input.messageId)) return { accepted: false, reason: "Duplicate message." };
  let member = s.crew.find(c => c.id === input.id);
  if (member && now - member.lastAt < 2000) return { accepted: false, reason: "One action per person every 2 seconds." };
  if (command === "boost" && s.fuel < 3) return { accepted: false, reason: "Fuel is recharging. Try !scan or !shield." };
  if (!member) {
    if (s.crew.length >= 1000) return { accepted: false, reason: "This mission has reached its 1,000-crew capacity." };
    member = { id: input.id, name: input.name.slice(0, 35), role: command, actions: 0, lastAt: 0 }; s.crew.push(member);
  }
  member.lastAt = now; member.role = command; member.actions++; s.actions++; s.score += 10;
  s.processed.push(input.messageId); s.processed = s.processed.slice(-600);
  if (command === "boost") { s.distance = clamp(s.distance + (s.route === "fast" ? 7 : 5)); s.fuel = clamp(s.fuel - 3); }
  if (command === "shield") s.shield = clamp(s.shield + 9);
  if (command === "scan") s.scan = clamp(s.scan + 3, 12);
  addEvent(s, { kind: "chat", name: member.name, command, text: `!${command}`, source: input.source });
  s.relay = s.relay.filter(r => now - r.at <= 8000);
  s.relay = s.relay.filter(r => r.command !== command); s.relay.push({ command, user: input.id, at: now });
  if (s.relay.length === 3 && new Set(s.relay.map(r => r.user)).size === 3 && s.elapsed - s.lastRelay >= 5) {
    s.lastRelay = s.elapsed; s.relays++; s.score += 75; s.shield = clamp(s.shield + 6); s.distance = clamp(s.distance + 8); s.relay = [];
    addEvent(s, { kind: "relay", text: "CREW SYNC! Three roles, three people. +75 points +8 distance +6 shield." });
  }
  checkSector(s);
  return { accepted: true };
}
export function control(s: GameState, action: string, value?: string, now = Date.now()) {
  tick(s, now);
  if (action === "launch" && s.status === "ready") { s.status = "running"; s.launchedAt = now; s.lastTick = now; addEvent(s, { kind: "system", text: "Liftoff! Crew, scan for survivors and keep us moving." }); }
  else if (action === "pause" && s.status === "running") { s.status = "paused"; addEvent(s, { kind: "system", text: "Captain paused the mission." }); }
  else if (action === "resume" && s.status === "paused") { s.status = "running"; s.lastTick = now; addEvent(s, { kind: "system", text: "Mission resumed. All hands on deck." }); }
  else if (action === "route" && (value === "safe" || value === "fast")) s.route = value;
  else if (action === "mode" && (s.status === "ready" || s.status === "paused") && (value === "demo" || value === "twitch")) {
    const fresh = newGame(s.id, now); fresh.mode = value; fresh.channel = s.channel; Object.assign(s, fresh);
  }
  else if (action === "channel") s.channel = (value || "").slice(0, 35);
  else if (action === "reset") { const fresh = newGame(s.id, now); fresh.mode = s.mode; fresh.channel = s.channel; Object.assign(s, fresh); }
}
export function publicState(s: GameState) {
  const { processed: _processed, relay: _relay, ...state } = s;
  return { ...state, crew: state.crew.map(({ lastAt: _lastAt, ...c }) => c) };
}
