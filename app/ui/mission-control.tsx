"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, ArrowDownToLine, ArrowRight, Check, CheckCheck, ChevronRight, CircleHelp, Compass, Copy, ExternalLink, Flag, Gauge, Heart, Layers, List, Orbit, Pause, Play, Radio, RefreshCw, Rocket, ScanLine, Settings2, Shield, Sparkles, Users, X, Zap } from "lucide-react";
import { newGame, SECTORS, parseCommand, type Command, type GameState, type FlightEvent } from "../../lib/game";
import { TwitchBridge, validateTwitchToken, type TwitchChat } from "../../lib/twitch";
import SpaceScene from "./space-scene";

type Tab = "mission" | "crew" | "recorder";
type Modal = "guide" | "twitch" | "obs" | null;
const NAMES = ["lunar_latte", "pixelpilot", "cosmic_fern", "astro_ash", "starrykai", "neon_nova", "orbit_otter", "minty_moon", "voidwalker", "solarbean", "its_comet", "saturn_soup", "juniper.exe", "marsmallow", "captain_mochi", "nebula_nico"];
const COMMANDS = [{ key: "boost" as Command, name: "Engineers", title: "Keep us moving", help: "+5 distance · costs 3 fuel", icon: Zap, color: "lime" }, { key: "shield" as Command, name: "Defenders", title: "Hold the line", help: "+9 shields · absorb debris", icon: Shield, color: "blue" }, { key: "scan" as Command, name: "Scouts", title: "Find the signal", help: "+3 scan · 12 to locate survivors", icon: ScanLine, color: "pink" }];
const clock = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
type ApiResult = { state: GameState; key: string; result?: { accepted: boolean; reason?: string } };
async function api<T = ApiResult>(url: string, init?: RequestInit): Promise<T> { const r = await fetch(url, { ...init, cache: "no-store" }); const d = await r.json() as T & { error?: string }; if (!r.ok) throw new Error(d.error || `Request failed (${r.status}).`); return d; }

export default function MissionControl() {
  const [flight, setFlight] = useState<GameState>(() => newGame("preview", 0));
  const [tab, setTab] = useState<Tab>("mission");
  const [modal, setModal] = useState<Modal>(null);
  const [overlay, setOverlay] = useState(false);
  const [ready, setReady] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [autoCrew, setAutoCrew] = useState(true);
  const [message, setMessage] = useState("");
  const [clientId, setClientId] = useState("");
  const [connection, setConnection] = useState("Twitch is not connected");
  const [connected, setConnected] = useState(false);
  const credential = useRef<{ id: string; key: string } | null>(null);
  const roomId = useRef(""); const initialised = useRef(false);
  const bridge = useRef<TwitchBridge | null>(null); const popup = useRef<Window | null>(null); const oauthState = useRef("");
  const flightRef = useRef(flight); flightRef.current = flight;
  const queue = useRef<Promise<unknown>>(Promise.resolve()); const pending = useRef(0); const epoch = useRef(0);
  const demoIndex = useRef(0);
  const [origin, setOrigin] = useState("");
  const modalRef = useRef<HTMLElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const showToast = useCallback((t: string) => { setToast(t); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 4500); return () => clearTimeout(t); } }, [toast]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    const focusables = () => Array.from(modalRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled)') || []);
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setModal(null); return; }
      if (e.key !== "Tab") return;
      const items = focusables(), first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; previous?.focus(); };
  }, [modal]);
  useEffect(() => { const feed = feedRef.current; if (feed) feed.scrollTop = feed.scrollHeight; }, [flight.actions, flight.status, flight.events.length]);

  const send = useCallback((body: Record<string, unknown>, silent = false): Promise<any> => {
    pending.current++; epoch.current++;
    const operation = queue.current.catch(() => {}).then(async () => {
      const c = credential.current; if (!c) throw new Error("Mission is still connecting. Please wait.");
      const d = await api(`/api/rooms/${c.id}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Captain-Key": c.key }, body: JSON.stringify(body) });
      epoch.current++; setFlight(d.state); setError("");
      if (!silent && d.result?.accepted === false) showToast(d.result.reason || "Command could not be accepted.");
      return d;
    });
    queue.current = operation;
    return operation.catch(e => { setError(e.message); return null; }).finally(() => { pending.current--; });
  }, [showToast]);
  const ctl = useCallback((action: string, value?: string) => send({ type: "control", action, value }), [send]);
  const init = useCallback(async () => {
    setError(""); setReady(false);
    try {
      const params = new URLSearchParams(location.search);
      if (params.has("oauth")) {
        const result = Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
        if (window.opener) { window.opener.postMessage({ type: "chatfleet-oauth", ...result }, location.origin); history.replaceState(null, "", location.pathname); window.close(); }
        else setError("Return to your captain console and connect Twitch again.");
        return;
      }
      const shared = params.get("overlay");
      setOrigin(location.origin); setClientId(localStorage.getItem("chatfleet-client-id") || "");
      if (shared) {
        setOverlay(true); roomId.current = shared;
        setFlight(await api<GameState>(`/api/rooms/${shared}`)); setReady(true); return;
      }
      const saved = localStorage.getItem("chatfleet-captain");
      if (saved) {
        try {
          const c = JSON.parse(saved); if (typeof c.id !== "string" || typeof c.key !== "string") throw new Error("Invalid saved mission");
          // Verify ownership without modifying game behavior.
          const d = await api(`/api/rooms/${c.id}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Captain-Key": c.key }, body: JSON.stringify({ type: "control", action: "ping" }) });
          credential.current = c; roomId.current = c.id; setFlight(d.state); setReady(true); setIsHost(true); return;
        } catch { localStorage.removeItem("chatfleet-captain"); }
      }
      const d = await api("/api/rooms", { method: "POST" });
      const c = { id: d.state.id, key: d.key }; credential.current = c; roomId.current = c.id;
      localStorage.setItem("chatfleet-captain", JSON.stringify(c)); setFlight(d.state); setReady(true); setIsHost(true);
    } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { if (!initialised.current) { initialised.current = true; void init(); } return () => bridge.current?.stop(); }, [init]);
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(async () => {
      if (pending.current) return;
      const at = epoch.current;
      try { const s = await api<GameState>(`/api/rooms/${roomId.current}`); if (epoch.current === at) { setFlight(s); setError(""); } }
      catch (e) { setError((e as Error).message); }
    }, 1000);
    return () => clearInterval(t);
  }, [ready]);
  useEffect(() => {
    if (!ready || !isHost || !autoCrew || flight.mode !== "demo" || flight.status !== "running") return;
    const timer = setInterval(() => {
      if (pending.current > 2) return;
      const i = demoIndex.current++; const f = flightRef.current;
      const pattern: Command[] = ["scan", "shield", "boost", "boost", "boost"];
      const command = pattern[i % 5]; const n = NAMES[i % NAMES.length];
      void send({ type: "command", id: `demo-${i % NAMES.length}`, name: n, text: `!${command}`, messageId: crypto.randomUUID(), source: "demo" }, true);
    }, 850);
    return () => clearInterval(timer);
  }, [ready, isHost, autoCrew, flight.mode, flight.status, send]);

  useEffect(() => {
    const listener = async (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== popup.current || event.data?.type !== "chatfleet-oauth") return;
      if (!oauthState.current || event.data.state !== oauthState.current) { setError("Twitch security check failed. Connect again."); return; }
      oauthState.current = "";
      if (!event.data.access_token) { setError(event.data.error_description || "Twitch connection cancelled."); return; }
      setBusy(true);
      try {
        const token = event.data.access_token;
        const identity = await validateTwitchToken(token, clientId.trim());
        bridge.current?.stop();
        await ctl("reset"); await ctl("mode", "twitch"); await ctl("channel", identity.login);
        const b = new TwitchBridge({ token, clientId: clientId.trim(), userId: identity.user_id,
          onChat: (chat: TwitchChat) => { if (parseCommand(chat.text)) void send({ type: "command", ...chat }, true); },
          onStatus: (text, live) => { setConnection(text); setConnected(live); },
        });
        bridge.current = b; b.start(); setModal(null); showToast("Authorize complete. Launch your mission when chat is ready.");
      } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
    };
    window.addEventListener("message", listener); return () => window.removeEventListener("message", listener);
  }, [clientId, ctl, send, showToast]);
  function connectTwitch() {
    if (!/^[a-zA-Z0-9]{10,80}$/.test(clientId.trim())) { showToast("Enter your Twitch application's public Client ID."); return; }
    localStorage.setItem("chatfleet-client-id", clientId.trim()); oauthState.current = crypto.randomUUID();
    const p = new URLSearchParams({ client_id: clientId.trim(), redirect_uri: `${location.origin}/?oauth=callback`, response_type: "token", scope: "user:read:chat", state: oauthState.current, force_verify: "true" });
    popup.current = window.open(`https://id.twitch.tv/oauth2/authorize?${p}`, "chatfleet-twitch", "width=560,height=740");
    if (!popup.current) showToast("Allow popups to sign in with Twitch.");
  }
  async function switchDemo() { bridge.current?.stop(); setConnected(false); setConnection("Twitch is not connected"); await ctl("reset"); await ctl("mode", "demo"); setModal(null); }
  async function primary() {
    if (!ready || busy) return;
    setBusy(true);
    if (flight.status === "ready") await ctl("launch");
    else if (flight.status === "running") await ctl("pause");
    else if (flight.status === "paused") await ctl("resume");
    else { await ctl("reset"); }
    setBusy(false);
  }
  const overlayUrl = `${origin}/?overlay=${flight.id}`;
  async function copy(text: string) { try { await navigator.clipboard.writeText(text); showToast("Copied to clipboard"); } catch { showToast("Copy isn't available. Select and copy the URL below."); } }
  function exportLog() {
    const { id, mode, channel, status, score, rescued, elapsed, crew, actions, relays, events } = flight;
    const blob = new Blob([JSON.stringify({ project: "ChatFleet", exportedAt: new Date().toISOString(), id, mode, channel, status, score, rescued, elapsed, crew, actions, relays, events }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `chatfleet-${id}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function manual(command: Command) { await send({ type: "command", id: "demo-you", name: "you", text: `!${command}`, messageId: crypto.randomUUID(), source: "demo" }); }
  const active = flight.status === "running";
  const finished = flight.status === "won" || flight.status === "lost";
  const sector = SECTORS[Math.min(flight.sector, 2)];
  const captainLabel = flight.status === "ready" ? "Launch mission" : active ? "Pause mission" : flight.status === "paused" ? "Resume mission" : "New mission";
  const progress = Math.min(100, ((flight.sector + flight.distance / 100) / 3) * 100);

  if (overlay) return <main className="overlay-shell"><div className="overlay-top"><span className="brand"><Orbit size={25}/> chatfleet<span className="tiny-tag">{flight.mode === "demo" ? "DEMO" : "LIVE CHAT"}</span></span><span className="mono">{clock(180 - flight.elapsed)} · {flight.status.toUpperCase()}</span></div>{error && <div className="error-banner">{error}</div>}<div className="overlay-scene"><SpaceScene sector={flight.sector} moving={active} shield={flight.shield} scanned={flight.scan >= 12}/><div className="overlay-title"><small>COMMUNITY RESCUE MISSION</small><h1>{flight.status === "won" ? "Everyone made it home." : sector.name}</h1><p>{flight.rescued}/9 rescued · {flight.crew.length} crew · {flight.score.toLocaleString()} points</p></div></div><div className="overlay-bottom"><Meter label="HULL" value={flight.hull} icon={Heart} color="lime"/><Meter label="SHIELDS" value={flight.shield} icon={Shield} color="blue"/><div className="overlay-commands">CREW, WE NEED YOU <strong>!boost <span>·</span> !shield <span>·</span> !scan</strong></div></div></main>;

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="ChatFleet home"><span className="brand-icon"><Orbit size={25}/></span>chatfleet<span className="brand-dot">.</span></a>
      <div className="workspace-label">YOUR FLIGHT DECK</div>
      <nav aria-label="Main navigation">
        <button className={tab === "mission" ? "nav-item selected" : "nav-item"} onClick={() => setTab("mission")}><Compass size={18}/>Mission control<span className="nav-dot"/></button>
        <button className={tab === "crew" ? "nav-item selected" : "nav-item"} onClick={() => setTab("crew")}><Users size={18}/>Crew manifest<span className="nav-count">{flight.crew.length}</span></button>
        <button className={tab === "recorder" ? "nav-item selected" : "nav-item"} onClick={() => setTab("recorder")}><List size={18}/>Flight recorder</button>
      </nav>
      <div className="sidebar-mission"><span className="eyebrow">THE CURRENT EXPEDITION</span><div className="mission-icon"><Orbit size={36}/></div><h3>Operation Homebound</h3><p>Three signals.<br/>Nine lives. One crew.</p><div className="sector-dots">{SECTORS.map((s, i) => <span key={s.code} className={flight.sector > i ? "done" : flight.sector === i ? "current" : ""}/>)}</div><span className="mono muted">EXPEDITION 001</span></div>
      <div className="sidebar-bottom"><button className="nav-item" onClick={() => setModal("guide")}><CircleHelp size={18}/>How to play<ExternalLink size={13}/></button><button className="nav-item" onClick={() => setModal("twitch")}><Settings2 size={18}/>Connection settings</button><div className="built-with"><span className="codex-mark">⌘</span><span>Built with <strong>OpenAI Codex</strong><small>TWITCHCON HACKATHON 2026</small></span></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb">Flight deck<ChevronRight size={14}/><span>{tab === "mission" ? "Mission control" : tab === "crew" ? "Crew manifest" : "Flight recorder"}</span></div><div className="topbar-right"><span className={`mode-badge ${flight.mode === "twitch" ? "twitch-mode" : ""}`}><span/>{flight.mode === "demo" ? "DEMO MODE" : connected ? "TWITCH CONNECTED" : "TWITCH OFFLINE"}</span><button className="icon-btn help-top" aria-label="How to play" onClick={() => setModal("guide")}><CircleHelp size={18}/></button><span className="captain-avatar">C</span></div></header>
      <div className="content-layout"><main className="main-content">
        {error && <div className="error-banner" role="alert">{error} <button onClick={() => void init()}>Reconnect</button></div>}
        <div className="page-heading"><div><div className="eyebrow"><span className="little-cross">✦</span> YOUR CHAT. YOUR CREW.</div><h1>{tab === "mission" ? "A little chaos. A lot of teamwork." : tab === "crew" ? "Every viewer has a part to play." : "Every mission tells a story."}</h1><p>{tab === "mission" ? "You’re the captain. Chat’s the crew. Let’s bring everyone home." : tab === "crew" ? "The people behind every boost, every shield, every rescue." : "Your crew’s actions, captured as they happen."}</p></div><button className="btn secondary obs-top" onClick={() => setModal("obs")}><Layers size={16}/>OBS overlay<ArrowRight size={15}/></button></div>
        <div className="stats-row"><Stat label="LIVES RESCUED" value={<>{flight.rescued}<span className="stat-denom"> / 9</span></>} sub="No one gets left behind" icon={Heart} color="lime"/><Stat label={flight.mode === "demo" ? "SIMULATED CREW" : "CREW ABOARD"} value={flight.crew.length.toString().padStart(2, "0")} sub={flight.mode === "demo" ? "Demo viewers, real teamwork" : "Unique participating viewers"} icon={Users} color="blue"/><Stat label="COMMUNITY SCORE" value={flight.score.toLocaleString().padStart(4, "0")} sub={<><Sparkles size={12}/>{flight.relays} crew sync bonuses</>} icon={Flag} color="pink"/></div>
        {tab === "mission" && <>
          <section className="mission-card">
            <div className="mission-card-header"><div><span className={`status-dot ${active ? "pulsing" : ""}`}/><span className="eyebrow">OPERATION HOMEBOUND</span><span className="mission-status">{active ? "In flight" : flight.status === "ready" ? "Awaiting launch" : flight.status === "paused" ? "Paused" : flight.status === "won" ? "Mission complete" : "Mission ended"}</span></div><div className={`countdown ${180 - flight.elapsed < 30 ? "urgent" : ""}`}><Activity size={14}/><span className="mono">{clock(180 - flight.elapsed)}</span><small>RESCUE WINDOW</small></div></div>
            <div className="scene-wrap"><SpaceScene sector={flight.sector} moving={active} shield={flight.shield} scanned={flight.scan >= 12}/><div className="planet-title"><span className="eyebrow">SECTOR {Math.min(flight.sector + 1, 3)} / 3 · {sector.type}</span><h2>{sector.name}</h2><p>{sector.briefing}</p></div><div className="scan-badge"><Radio size={14}/>{flight.scan >= 12 ? "SIGNAL LOCKED" : `SIGNAL SCAN ${Math.round(flight.scan / 12 * 100)}%`}</div>{(finished || flight.status === "paused") && <div className="result-panel"><span>{flight.status === "won" ? "✦ MISSION ACCOMPLISHED" : flight.status === "lost" ? "END OF TRANSMISSION" : "MISSION PAUSED"}</span><h2>{flight.status === "won" ? "Everyone made it home." : flight.status === "lost" ? "A brave crew. Another chance." : "Take a breath, captain."}</h2><p>{flight.status === "paused" ? "The rescue clock is stopped. Resume when you’re ready." : `${flight.rescued} lives rescued · ${flight.actions} crew actions · ${flight.score.toLocaleString()} points`}</p></div>}</div>
            <div className="telemetry"><Meter label="HULL INTEGRITY" value={flight.hull} icon={Heart} color="lime"/><Meter label="SHIELD CAPACITY" value={flight.shield} icon={Shield} color="blue"/><Meter label="ENGINE FUEL" value={flight.fuel} icon={Zap} color="amber"/></div>
            <div className="journey"><div className="journey-label"><span><span className="tiny-dot"/> EXPEDITION PROGRESS</span><span className="mono">{Math.round(progress)}%</span></div><div className="journey-track"><div style={{ width: `${progress}%` }}/>{[0, 1, 2, 3].map(i => <span key={i} style={{ left: `${i / 3 * 100}%` }} className={flight.sector >= i ? "reached" : ""}>{flight.sector > i ? <Check size={9}/> : null}</span>)}</div><div className="journey-places"><span>Departure</span><span>Verdant Reach</span><span>Amber Drift</span><span>Home, together</span></div></div>
          </section>
          <section className="crew-section"><div className="section-heading"><h2>Three roles. One mission.</h2><span>Type a command. Become part of the story.</span></div><div className="command-grid">{COMMANDS.map(c => <button key={c.key} className={`command-card ${c.color}`} onClick={() => flight.mode === "demo" ? void manual(c.key) : showToast(`Type !${c.key} in your Twitch channel's chat.`)} disabled={!ready || !active} aria-label={`Send !${c.key} command`}><div className="command-card-top"><span className="role-icon"><c.icon size={20}/></span><code>!{c.key}</code></div><h3>{c.title}</h3><p>{c.help}</p><div className="command-card-bottom"><span>{c.name}</span><span><Users size={12}/>{flight.crew.filter(m => m.role === c.key).length}</span></div></button>)}</div><div className="sync-note"><Sparkles size={15}/><p><strong>Better together.</strong> Three different people using all three roles within 8 seconds unlock a Crew Sync bonus.</p><span>+75 PTS</span></div></section>
          <section className="captain-panel"><div className="section-heading"><h2><Compass size={17}/>The captain’s call</h2><span>Your next move matters.</span></div><div className="route-row"><button className={`route-card ${flight.route === "safe" ? "chosen" : ""}`} onClick={() => void ctl("route", "safe")} disabled={!ready || finished}><div><Shield size={18}/><strong>The scenic route</strong><span className="route-tag">LOW RISK</span></div><p>Steady engines. Lighter debris. A little breathing room.</p><span className="radio-dot"/></button><button className={`route-card ${flight.route === "fast" ? "chosen" : ""}`} onClick={() => void ctl("route", "fast")} disabled={!ready || finished}><div><Zap size={18}/><strong>Through the drift</strong><span className="route-tag amber-text">HIGH RISK</span></div><p>Faster boosts. Heavier impacts. Trust your defenders.</p><span className="radio-dot"/></button></div></section>
        </>}
        {tab === "crew" && <section className="table-card"><div className="section-heading"><h2>Crew manifest</h2><span>{flight.mode === "demo" ? "All listed crew are simulated" : `Twitch channel: ${flight.channel || "not connected"}`}</span></div>{flight.crew.length ? <table><thead><tr><th>CREW MEMBER</th><th>CURRENT ROLE</th><th>ACTIONS</th><th>CONTRIBUTION</th></tr></thead><tbody>{[...flight.crew].sort((a, b) => b.actions - a.actions).map((c, i) => <tr key={c.id}><td><span className={`small-avatar avatar-${i % 4}`}>{c.name.slice(0, 1).toUpperCase()}</span><strong>{c.name}</strong>{i === 0 && <Sparkles size={13} className="lime-text"/>}</td><td><code className={COMMANDS.find(x => x.key === c.role)?.color}>{c.role}</code></td><td className="mono">{c.actions}</td><td><span className="contribution-track"><span style={{ width: `${Math.min(100, c.actions / Math.max(1, flight.actions) * 100)}%` }}/></span></td></tr>)}</tbody></table> : <Empty icon={Users} title="Your crew is waiting in the wings." text="Launch a demo mission and watch your community come aboard."/>}</section>}
        {tab === "recorder" && <section className="table-card"><div className="section-heading"><h2>Flight recorder</h2><button className="btn small secondary" onClick={exportLog}><ArrowDownToLine size={14}/>Export JSON</button></div><div className="full-log">{[...flight.events].reverse().map((e, i) => <div className={`full-log-row ${e.kind}`} key={`${e.id}-${i}`}><span className="mono muted">T+{clock(e.at)}</span><EventIcon event={e}/><p>{e.name && <strong>{e.name} </strong>}{e.text}</p><span className="event-kind">{e.source || e.kind}</span></div>)}</div><p className="log-footnote">The latest 55 events are retained per mission. Export before starting a new mission.</p></section>}
        <footer className="page-footer"><span><span className="tiny-dot"/> Small commands. Big adventures.</span><span>CODEX × TWITCHCON 2026</span></footer>
      </main>
      <aside className="right-panel"><div className="connection-panel"><div className="eyebrow">YOUR BROADCAST</div><div className="broadcast-channel"><span className="twitch-icon">▣</span><div><strong>{flight.mode === "demo" ? "The demo universe" : `twitch.tv/${flight.channel || "your-channel"}`}</strong><p><span className={`tiny-dot ${connected ? "online" : ""}`}/>{flight.mode === "demo" ? "Simulated chat · no account needed" : connected ? "EventSub connected" : "Connect Twitch to receive chat"}</p></div></div><button className="btn secondary connect-btn" onClick={() => setModal("twitch")}><Radio size={15}/>{flight.mode === "demo" ? "Connect your Twitch" : "Manage connection"}<ArrowRight size={14}/></button></div>
        <div className="feed-heading"><h2>Crew comms</h2><span className="feed-status"><span className={active ? "tiny-dot online" : "tiny-dot"}/>{flight.mode === "demo" ? "SIMULATED" : connected ? "LIVE" : "OFFLINE"}</span></div>
        <div className="feed" ref={feedRef} aria-label="Crew communications log" role="log" aria-live="off">{!flight.actions && <div className="feed-intro"><div className="signal-orbit"><Radio size={24}/></div><h3>A whole crew in your chat.</h3><p>Launch the mission to hear your crew come to life.</p><div className="demo-messages"><div><span>lunar_latte</span><code>!scan</code></div><div><span>pixelpilot</span><code>!boost</code></div><div><span>cosmic_fern</span><code>!shield</code></div></div><small>EXAMPLE CHAT COMMANDS</small></div>}{flight.events.slice(-13).map((e, i) => <FeedEvent event={e} key={`${e.id}-${i}`}/>)}</div>
        <div className="chat-composer">{flight.mode === "demo" ? <><div className="demo-toggle"><span><span className="tiny-dot amber-dot"/>SIMULATED CREW</span><label className="switch"><input type="checkbox" checked={autoCrew} onChange={e => setAutoCrew(e.target.checked)} aria-label="Automatic simulated crew"/><span/></label></div><form onSubmit={async e => { e.preventDefault(); const c = parseCommand(message); if (!c) { showToast("Try !boost, !shield, or !scan"); return; } setMessage(""); await manual(c); }}><input placeholder="Try !boost, !shield, !scan…" aria-label="Simulate a chat command" value={message} onChange={e => setMessage(e.target.value)} disabled={!active}/><button disabled={!active || !message.trim()} aria-label="Send simulated command"><ArrowRight size={16}/></button></form><p>Try a command yourself. One action every 2s.</p></> : <div className="twitch-chat-note"><Radio size={16}/><p>Commands arrive from Twitch chat.<br/>{connection}</p></div>}</div>
        <div className="launch-panel"><span className="eyebrow">{active ? "YOU HAVE THE CONN" : finished ? "UNTIL THE NEXT ADVENTURE" : "ALL SYSTEMS GO"}</span><button className={`btn primary ${active ? "pause-btn" : ""}`} onClick={() => void primary()} disabled={!ready || busy || (flight.mode === "twitch" && !connected && flight.status === "ready")}>{busy ? <RefreshCw size={17} className="spin"/> : active ? <Pause size={17}/> : finished ? <RefreshCw size={17}/> : <Rocket size={17}/>}<span>{!ready ? "Connecting systems…" : captainLabel}</span>{!active && <ArrowRight size={17}/>}</button><p>{flight.mode === "demo" ? "A 3-minute mission. A very real team effort." : "Keep this captain tab open during your stream."}</p>{flight.status !== "ready" && <button className="reset-btn" onClick={() => { if (window.confirm("End this mission and clear its crew, score, and flight log?")) void ctl("reset"); }}><RefreshCw size={12}/>Reset mission</button>}</div>
      </aside></div>
    </div>
    {toast && <div className="toast" role="status"><Check size={16}/>{toast}</div>}
    {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}><section className="modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close icon-btn" onClick={() => setModal(null)} aria-label="Close dialog"><X size={20}/></button>
      {modal === "guide" && <><span className="eyebrow lime-text">WELCOME ABOARD, CAPTAIN</span><h2 id="modal-title">Your chat is the crew.</h2><p className="modal-lead">Rescue 9 people across 3 sectors before the 3-minute window closes. No download for viewers. Just chat.</p><div className="guide-steps"><div><span>01</span><div><h3>Launch the mission</h3><p>Start in demo mode with simulated crew, or connect your own Twitch channel.</p></div></div><div><span>02</span><div><h3>Give everyone a role</h3><p><code>!boost</code> moves the ship. <code>!shield</code> absorbs debris every 12 seconds. <code>!scan</code> locates survivors. Four scans and 100 distance complete each rescue.</p></div></div><div><span>03</span><div><h3>Make teamwork count</h3><p>Three distinct viewers using all three commands within 8 seconds trigger Crew Sync. One viewer can act every 2 seconds. Choose a route, manage fuel, and get everyone home.</p></div></div></div><button className="btn primary" onClick={() => setModal(null)}>Let’s fly<ArrowRight size={16}/></button></>}
      {modal === "twitch" && <><span className="eyebrow purple-text">TWITCH CONNECTION</span><h2 id="modal-title">Bring your real crew.</h2><p className="modal-lead">Connect the Twitch account you stream from. Chat commands will power your mission in real time.</p><div className="connection-state"><Radio size={18}/><span>{connection}</span></div><label className="field-label" htmlFor="client-id">TWITCH APPLICATION CLIENT ID</label><input id="client-id" className="modal-input" value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Your public Twitch Client ID" autoComplete="off"/><p className="field-help">Create an application in the <a href="https://dev.twitch.tv/console/apps" target="_blank" rel="noreferrer">Twitch developer console ↗</a>. Use the Chat Bot category and register this exact OAuth redirect URL:</p><div className="copy-field"><code>{origin}/?oauth=callback</code><button className="icon-btn" onClick={() => void copy(`${origin}/?oauth=callback`)} aria-label="Copy Twitch redirect URL"><Copy size={15}/></button></div><p className="field-help">Only <code>user:read:chat</code> permission is requested. The Twitch token stays in this tab’s memory. Reconnect after reloading. Connecting starts a fresh mission.</p><button className="btn twitch-btn" disabled={busy || !ready} onClick={connectTwitch}><Radio size={16}/>{busy ? "Connecting…" : "Authorize with Twitch"}<ExternalLink size={15}/></button><button className="text-btn" onClick={() => void switchDemo()}>Use demo mode instead</button></>}
      {modal === "obs" && <><span className="eyebrow lime-text">MADE FOR YOUR STREAM</span><h2 id="modal-title">Mission control. On stream.</h2><p className="modal-lead">A clean, read-only view of this mission. The captain console and overlay share the same saved state.</p><div className="overlay-mini"><Orbit size={30}/><div><strong>chatfleet.</strong><span>YOUR CHAT. YOUR CREW.</span></div><code>!boost · !shield · !scan</code></div><label className="field-label">THIS MISSION’S OVERLAY URL</label><div className="copy-field"><code>{overlayUrl}</code><button className="icon-btn" onClick={() => void copy(overlayUrl)} aria-label="Copy OBS overlay URL"><Copy size={15}/></button></div><ol className="obs-steps"><li>In OBS, add a <strong>Browser Source</strong>.</li><li>Paste this URL. Set width <strong>1920</strong>, height <strong>1080</strong>.</li><li>Keep your captain tab open for Twitch chat or simulated crew.</li></ol><p className="field-help">This hosted preview is private. OBS needs a locally running copy or a publicly accessible deployment. A normal browser preview works when signed in. The overlay never contains your captain key or Twitch token.</p><a href={overlayUrl} target="_blank" rel="noreferrer" className="btn primary">Open overlay preview<ExternalLink size={16}/></a></>}
    </section></div>}
  </div>;
}
function Stat({ label, value, sub, icon: Icon, color }: { label: string; value: React.ReactNode; sub: React.ReactNode; icon: typeof Heart; color: string }) { return <div className="stat-card"><div><span className="eyebrow">{label}</span><div className="stat-value">{value}</div><p>{sub}</p></div><span className={`stat-icon ${color}`}><Icon size={20}/></span></div>; }
function Meter({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Heart; color: string }) { return <div className={`meter ${color}`}><div><span><Icon size={13}/>{label}</span><strong className="mono">{Math.round(value)}<small>%</small></strong></div><div className="meter-track"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }}/></div></div>; }
function EventIcon({ event }: { event: FlightEvent }) { const Icon = event.kind === "relay" ? Sparkles : event.kind === "danger" ? Shield : event.kind === "chat" ? COMMANDS.find(c => c.key === event.command)?.icon || Radio : Radio; return <Icon size={14}/>; }
function FeedEvent({ event: e }: { event: FlightEvent }) { return e.kind === "chat" ? <div className="chat-event"><span className={`chat-avatar ${e.command}`}>{(e.name || "?").slice(0, 1).toUpperCase()}</span><div><strong className={e.command}>{e.name}</strong><span>!{e.command}</span></div><small className="mono">{clock(e.at)}</small></div> : <div className={`system-event ${e.kind}`}><EventIcon event={e}/><span>{e.text}</span></div>; }
function Empty({ icon: Icon, title, text }: { icon: typeof Users; title: string; text: string }) { return <div className="empty-state"><Icon size={35}/><h3>{title}</h3><p>{text}</p></div>; }
