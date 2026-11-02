import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.js';
import { checkRaceSchedules } from '../race-scheduler.js';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'scio-race-timeouts-'));
try {
  const persistence = createStore(path.join(directory, 'state.json'));
  const now = Date.UTC(2030, 0, 1);
  const race = persistence.createRace('g', 'host', 'science', ['bio-01'], now, 'channel-1').race;
  const messages = [];
  const channel = { isTextBased: () => true, send: async message => { messages.push(message); } };
  const client = { guilds: { cache: new Map([['g', { id: 'g', channels: { fetch: async id => id === 'channel-1' ? channel : null } }]]) } };
  await checkRaceSchedules(client, persistence, now + 15 * 60 * 1000 + 1);
  assert.equal(persistence.getRace('g', race.id).status, 'expired');
  assert.equal(messages.length, 1);
  assert.match(messages[0], /timed out/);
  assert.match(messages[0], /No one started/);
  console.log('Race timeout checks passed: expired races post one clear channel notice.');
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
