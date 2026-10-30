import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, act, tick, control, parseCommand, publicState } from '../lib/game.ts';
const start = () => { const s = newGame('abcdef123456', 1000); control(s, 'launch', undefined, 1000); return s; };
const command = (s, text, id = 'a', now = 1000, messageId = crypto.randomUUID(), source = 'demo') => act(s, { id, name: `crew-${id}`, text, source, messageId }, now);

test('only explicit commands are accepted', () => {
  assert.equal(parseCommand(' !BOOST '), 'boost'); assert.equal(parseCommand('!scan please'), 'scan');
  for (const s of ['hello !boost', '!boosted', 'shield', '!shield!']) assert.equal(parseCommand(s), null);
});
test('ready missions reject commands', () => { const s = newGame('test', 1000); assert.equal(command(s, '!boost').accepted, false); assert.equal(s.actions, 0); });
test('one person has a global two-second cooldown across roles', () => {
  const s = start(); assert.ok(command(s, '!boost').accepted); assert.equal(command(s, '!shield', 'a', 2999).accepted, false); assert.ok(command(s, '!shield', 'a', 3000).accepted); assert.equal(s.actions, 2);
});
test('duplicate messages cannot score twice', () => {
  const s = start(); command(s, '!scan', 'a', 1000, 'same'); assert.equal(command(s, '!scan', 'b', 4000, 'same').accepted, false); assert.equal(s.actions, 1);
});
test('three different crew roles trigger a crew sync', () => {
  const s = start(); command(s, '!scan', 'a'); command(s, '!boost', 'b'); command(s, '!shield', 'c'); assert.equal(s.relays, 1); assert.equal(s.score, 105); assert.equal(s.distance, 13); assert.equal(s.shield, 80);
});
test('a solo player cannot manufacture a team sync', () => {
  const s = start(); command(s, '!scan', 'a', 1000); command(s, '!boost', 'a', 3000); command(s, '!shield', 'a', 5000); assert.equal(s.relays, 0);
});
test('crew sync expires after eight seconds', () => {
  const s = start(); command(s, '!scan', 'a', 1000); command(s, '!boost', 'b', 1000); command(s, '!shield', 'c', 10000); assert.equal(s.relays, 0);
});
test('a rescue requires both distance and scanning', () => {
  const s = start(); s.distance = 100; command(s, '!scan', 'a'); assert.equal(s.rescued, 0); command(s, '!scan', 'b'); command(s, '!scan', 'c'); command(s, '!scan', 'd'); assert.equal(s.rescued, 3); assert.equal(s.sector, 1); assert.equal(s.distance, 0); assert.equal(s.scan, 0);
});
test('a complete simulated crew can win the entire mission', () => {
  const s = start(); const pattern = ['scan', 'shield', 'boost', 'boost', 'boost'];
  for (let i = 0; i < 300 && s.status === 'running'; i++) command(s, `!${pattern[i % 5]}`, `demo-${i % 16}`, 1000 + i * 850);
  assert.equal(s.status, 'won'); assert.equal(s.rescued, 9); assert.equal(s.sector, 3); assert.ok(s.elapsed < 180); assert.ok(s.hull > 0); assert.ok(s.relays > 0);
});
test('boost consumes fuel and cannot run on empty', () => {
  const s = start(); s.fuel = 2; assert.equal(command(s, '!boost').accepted, false); assert.equal(s.actions, 0); tick(s, 3000); assert.ok(command(s, '!boost', 'a', 3000).accepted); assert.ok(s.fuel >= 0);
});
test('shield and scan values are capped', () => {
  const s = start(); for (let i = 0; i < 30; i++) command(s, i % 2 ? '!shield' : '!scan', `a${i}`); assert.equal(s.shield, 100); assert.equal(s.scan, 12);
});
test('fast route creates more impact damage', () => {
  const a = start(), b = start(); control(b, 'route', 'fast', 1000); tick(a, 13000); tick(b, 13000); assert.equal(a.shield, 49); assert.equal(b.shield, 41); assert.ok(b.distance > a.distance);
});
test('a mission with no protection can lose to hull damage', () => {
  const s = start(); s.shield = 0; s.hull = 5; tick(s, 13000); assert.equal(s.status, 'lost'); assert.equal(s.hull, 0);
});
test('the rescue window closes at 180 seconds', () => {
  const s = start(); for (let t = 2000; t <= 181000; t += 1000) { s.shield = 100; tick(s, t); } assert.equal(s.elapsed, 180); assert.equal(s.status, 'lost');
});
test('paused time does not consume the rescue window', () => {
  const s = start(); tick(s, 11000); control(s, 'pause', undefined, 11000); tick(s, 70000); assert.equal(s.elapsed, 10); control(s, 'resume', undefined, 70000); tick(s, 75000); assert.equal(s.elapsed, 15);
});
test('fractional polling does not slow the simulation', () => {
  const s = start(); for (let t = 1100; t <= 11000; t += 100) tick(s, t); assert.equal(s.elapsed, 10); assert.ok(Math.abs(s.distance - 8) < 0.001);
});
test('switching input mode clears simulated participation', () => {
  const s = start(); command(s, '!scan'); control(s, 'pause', undefined, 1000); control(s, 'mode', 'twitch', 1000); assert.equal(s.mode, 'twitch'); assert.equal(s.crew.length, 0); assert.equal(s.score, 0); assert.equal(s.status, 'ready'); control(s, 'launch', undefined, 1000); assert.equal(command(s, '!scan').accepted, false); assert.ok(command(s, '!scan', 'real', 1000, 'real-event', 'twitch').accepted);
});
test('reset preserves input mode but clears mission results', () => {
  const s = start(); s.mode = 'twitch'; s.channel = 'captain'; s.score = 999; control(s, 'reset', undefined, 1000); assert.equal(s.score, 0); assert.equal(s.mode, 'twitch'); assert.equal(s.channel, 'captain'); assert.equal(s.status, 'ready');
});
test('read-only state omits deduplication and cooldown internals', () => {
  const s = start(); command(s, '!scan'); const p = publicState(s); assert.equal('processed' in p, false); assert.equal('relay' in p, false); assert.equal('lastAt' in p.crew[0], false);
});
test('recorder and replay protection stay bounded', () => {
  const s = start(); for (let i = 0; i < 650; i++) command(s, '!shield', `${i % 100}`, 1000 + Math.floor(i / 100) * 2000); assert.equal(s.events.length, 55); assert.equal(s.processed.length, 600);
});
