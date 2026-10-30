/** Browser-side EventSub adapter. OAuth tokens never go to the game server. */
export type TwitchChat = { id: string; name: string; text: string; messageId: string; source: "twitch" };
type Options = { token: string; clientId: string; userId: string; onChat: (chat: TwitchChat) => void; onStatus: (status: string, connected: boolean) => void };
export class TwitchBridge {
  private socket: WebSocket | null = null;
  private sockets = new Set<WebSocket>();
  private watchdog: ReturnType<typeof setTimeout> | undefined;
  private retry: ReturnType<typeof setTimeout> | undefined;
  private validation: ReturnType<typeof setInterval> | undefined;
  private stopped = false;
  private failures = 0;
  private seen = new Set<string>();
  private options: Options;
  constructor(options: Options) { this.options = options; }
  start() {
    this.stopped = false; this.open("wss://eventsub.wss.twitch.tv/ws", false);
    this.validation = setInterval(() => { void this.validate(); }, 55 * 60 * 1000);
  }
  stop() {
    this.stopped = true; clearTimeout(this.watchdog); clearTimeout(this.retry); clearInterval(this.validation);
    for (const socket of this.sockets) socket.close(); this.sockets.clear(); this.socket = null;
  }
  private async validate() {
    try {
      const r = await fetch("https://id.twitch.tv/oauth2/validate", { headers: { Authorization: `OAuth ${this.options.token}` } });
      if (r.status === 401) { this.stop(); this.options.onStatus("Twitch authorization expired. Connect again.", false); }
    } catch { this.options.onStatus("Token validation unavailable; checking the connection.", false); }
  }
  private scheduleRetry() {
    if (this.stopped || this.retry) return;
    this.options.onStatus("Twitch disconnected. Reconnecting…", false);
    this.retry = setTimeout(() => { this.retry = undefined; this.open("wss://eventsub.wss.twitch.tv/ws", false); }, Math.min(30000, 1000 * 2 ** this.failures++));
  }
  private open(url: string, transferred: boolean) {
    if (this.stopped) return;
    if (!url.startsWith("wss://eventsub.wss.twitch.tv/")) { this.options.onStatus("Unexpected Twitch reconnect address.", false); return; }
    const previous = this.socket;
    const ws = new WebSocket(url); this.sockets.add(ws);
    let keepalive = 15;
    const resetWatchdog = () => {
      clearTimeout(this.watchdog);
      this.watchdog = setTimeout(() => { ws.close(); this.scheduleRetry(); }, (keepalive + 5) * 1000);
    };
    ws.onmessage = async event => {
      try {
        const message = JSON.parse(event.data); const type = message.metadata?.message_type;
        if (type === "session_welcome") {
          this.socket = ws; keepalive = message.payload.session.keepalive_timeout_seconds || 15;
          if (previous && previous !== ws) previous.close();
          if (!transferred) {
            const r = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
              method: "POST", headers: { Authorization: `Bearer ${this.options.token}`, "Client-Id": this.options.clientId, "Content-Type": "application/json" },
              body: JSON.stringify({ type: "channel.chat.message", version: "1", condition: { broadcaster_user_id: this.options.userId, user_id: this.options.userId }, transport: { method: "websocket", session_id: message.payload.session.id } }),
            });
            if (!r.ok) { this.stop(); this.options.onStatus(`Twitch subscription failed (${r.status}). Check user:read:chat authorization.`, false); return; }
          }
          this.failures = 0; this.options.onStatus("Twitch chat connected", true); resetWatchdog();
        } else if (type === "session_reconnect") {
          this.open(message.payload.session.reconnect_url, true);
        } else if (type === "revocation") {
          this.stop(); this.options.onStatus("Twitch revoked chat access. Connect again.", false);
        } else {
          resetWatchdog();
          if (type === "notification" && message.metadata.subscription_type === "channel.chat.message") {
            const e = message.payload.event; const messageId = e.message_id;
            if (!messageId || this.seen.has(messageId)) return;
            this.seen.add(messageId); if (this.seen.size > 1000) this.seen.delete(this.seen.values().next().value!);
            this.options.onChat({ id: e.chatter_user_id, name: e.chatter_user_name, text: e.message.text, messageId, source: "twitch" });
          }
        }
      } catch { this.options.onStatus("Twitch event error. Reconnecting…", false); ws.close(); this.scheduleRetry(); }
    };
    ws.onclose = () => { this.sockets.delete(ws); if (!this.stopped && (this.socket === ws || this.socket === null)) this.scheduleRetry(); };
    ws.onerror = () => { this.options.onStatus("Twitch connection interrupted.", false); ws.close(); };
  }
}
export async function validateTwitchToken(token: string, clientId: string) {
  const r = await fetch("https://id.twitch.tv/oauth2/validate", { headers: { Authorization: `OAuth ${token}` } });
  if (!r.ok) throw new Error("Twitch authorization is invalid or expired. Please connect again.");
  const v = await r.json() as { client_id?: string; scopes?: string[]; user_id?: string; login: string; expires_in: number };
  if (v.client_id !== clientId || !v.scopes?.includes("user:read:chat") || !v.user_id) throw new Error("Authorize this Twitch Client ID with the user:read:chat permission.");
  return v as { user_id: string; login: string; expires_in: number };
}
