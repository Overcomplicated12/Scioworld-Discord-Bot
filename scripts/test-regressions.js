import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.js';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'scioworld-regressions-'));
const filePath = path.join(directory, 'profiles.json');

try {
  const store = createStore(filePath);
  const now = Date.parse('2026-01-01T00:00:00.000Z');

  // Lore challenge state must not block an identical story entry in another guild.
  assert.equal(store.startLoreChallenge('guild-a', 'story', 'entry', 'clue', 'answer').started, true);
  assert.equal(store.startLoreChallenge('guild-b', 'story', 'entry', 'clue', 'answer').started, true);
  assert.equal(store.startLoreDiscussion('guild-a', 'story', 'entry', 'prompt', now).started, true);
  assert.equal(store.startLoreDiscussion('guild-b', 'story', 'entry', 'prompt', now).started, true);

  // A failed Om delivery remains pending until released, then can be retried.
  store.setOmOptIn('guild-a', 'om', true);
  assert.equal(store.setOmTarget('guild-a', 'om').set, true);
  assert.equal(store.activateOm('guild-a', 'poll-1', now).active, true);
  const deliveryTime = now + 10 * 60 * 1000;
  assert.equal(store.recordOmMessage('guild-a', deliveryTime).sent, true);
  assert.equal(store.recordOmMessage('guild-a', deliveryTime + 1).pending, true);
  assert.equal(store.releaseOmMessage('guild-a').released, true);
  assert.equal(store.recordOmMessage('guild-a', deliveryTime + 2).sent, true);
  assert.equal(store.acknowledgeOmMessage('guild-a', deliveryTime + 2).acknowledged, true);
  assert.equal(store.getOmSchedule('guild-a').sentThisActivation, 1);

  // The next weekly due date must not replace the timestamp of the poll just sent.
  store.markPollSent('guild-a', 'poll-1', now, 'channel');
  const schedule = store.getPollSchedule('guild-a');
  assert.equal(schedule.lastSentAt, now);
  assert.equal(schedule.nextDueAt, now + 7 * 24 * 60 * 60 * 1000);

  console.log('Regression checks passed: guild isolation, Om retry acknowledgements, and poll timestamps.');
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
