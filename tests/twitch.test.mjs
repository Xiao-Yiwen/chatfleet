import test from 'node:test';
import assert from 'node:assert/strict';
import { TwitchBridge, validateTwitchToken } from '../lib/twitch.ts';
class MockSocket {
  static instances = [];
  constructor(url) { this.url = url; MockSocket.instances.push(this); }
  close() { this.onclose?.({}); }
  async emit(type, payload, metadata = {}) { await this.onmessage({ data: JSON.stringify({ metadata: { message_type: type, ...metadata }, payload }) }); }
}
const welcome = id => ({ session: { id, keepalive_timeout_seconds: 15 } });
function setup() {
  const originalSocket = globalThis.WebSocket, originalFetch = globalThis.fetch;
  MockSocket.instances = []; globalThis.WebSocket = MockSocket;
  const subscriptions = [], messages = [], statuses = [];
  globalThis.fetch = async (url, init) => { subscriptions.push({ url, init }); return new Response('{}', { status: 202 }); };
  const bridge = new TwitchBridge({ token: 'test-only', clientId: 'client-test', userId: 'user-test', onChat: m => messages.push(m), onStatus: (s, connected) => statuses.push({ s, connected }) });
  bridge.start();
  return { bridge, subscriptions, messages, statuses, done: () => { bridge.stop(); globalThis.WebSocket = originalSocket; globalThis.fetch = originalFetch; } };
}
test('EventSub subscribes after welcome with the authorized broadcaster and read scope', async () => {
  const f = setup(); try { await MockSocket.instances[0].emit('session_welcome', welcome('session-1')); assert.equal(f.subscriptions.length, 1); const b = JSON.parse(f.subscriptions[0].init.body); assert.equal(b.type, 'channel.chat.message'); assert.equal(b.condition.broadcaster_user_id, 'user-test'); assert.equal(b.condition.user_id, 'user-test'); assert.equal(b.transport.session_id, 'session-1'); assert.equal(f.statuses.at(-1).connected, true); } finally { f.done(); }
});
test('real chat events are mapped and deduplicated', async () => {
  const f = setup(); try { const ws = MockSocket.instances[0]; await ws.emit('session_welcome', welcome('session-1')); const e = { event: { message_id: 'message-1', chatter_user_id: '42', chatter_user_name: 'Stella', message: { text: '!shield' } } }; const meta = { subscription_type: 'channel.chat.message' }; await ws.emit('notification', e, meta); await ws.emit('notification', e, meta); assert.equal(f.messages.length, 1); assert.deepEqual(f.messages[0], { id: '42', name: 'Stella', text: '!shield', messageId: 'message-1', source: 'twitch' }); } finally { f.done(); }
});
test('Twitch reconnect transfers the subscription without resubscribing', async () => {
  const f = setup(); try { const ws = MockSocket.instances[0]; await ws.emit('session_welcome', welcome('s1')); await ws.emit('session_reconnect', { session: { reconnect_url: 'wss://eventsub.wss.twitch.tv/ws?reconnect=test' } }); assert.equal(MockSocket.instances.length, 2); await MockSocket.instances[1].emit('session_welcome', welcome('s2')); assert.equal(f.subscriptions.length, 1); assert.equal(f.statuses.at(-1).connected, true); } finally { f.done(); }
});
test('revocation disables the connection', async () => {
  const f = setup(); try { const ws = MockSocket.instances[0]; await ws.emit('session_welcome', welcome('s1')); await ws.emit('revocation', {}); assert.equal(f.statuses.at(-1).connected, false); assert.match(f.statuses.at(-1).s, /revoked/); } finally { f.done(); }
});
test('subscription rejection never reports a live connection', async () => {
  const f = setup(); try { globalThis.fetch = async () => new Response('{}', { status: 403 }); await MockSocket.instances[0].emit('session_welcome', welcome('s1')); assert.equal(f.statuses.at(-1).connected, false); assert.match(f.statuses.at(-1).s, /403/); } finally { f.done(); }
});
test('token validation checks application identity and exact chat scope', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ client_id: 'client', scopes: ['user:read:chat'], user_id: '42', login: 'stella', expires_in: 1000 });
    assert.equal((await validateTwitchToken('test', 'client')).login, 'stella');
    await assert.rejects(validateTwitchToken('test', 'wrong-client'), /Client ID/);
    globalThis.fetch = async () => Response.json({ client_id: 'client', scopes: [], user_id: '42' });
    await assert.rejects(validateTwitchToken('test', 'client'), /user:read:chat/);
    globalThis.fetch = async () => new Response('{}', { status: 401 });
    await assert.rejects(validateTwitchToken('test', 'client'), /expired/);
  } finally { globalThis.fetch = original; }
});
