import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.js';
import { chooseBotherOptions } from '../src/om.js';
import { parseInstructorCsv } from '../src/camp-csv.js';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'scioworld-bother-'));
try {
  const store = createStore(path.join(directory, 'state.json'));
  const now = Date.UTC(2030, 0, 1, 12);
  const options = chooseBotherOptions(() => 0.5);
  assert.equal(options.length, 3);
  assert.equal(new Set(options.map(option => option.id)).size, 3);

  assert.equal(store.beginBotherPoll('guild', 'alice', 'channel', options, now).reason, 'target-not-opted-in');
  store.setOmOptIn('guild', 'om', true);
  assert.equal(store.setOmTarget('guild', 'om').set, true);
  const started = store.beginBotherPoll('guild', 'alice', 'channel', options, now);
  assert.equal(started.started, true);
  assert.equal(store.beginBotherPoll('guild', 'bob', 'channel', options, now).reason, 'poll-active');
  assert.equal(store.recordBotherVote('guild', 'alice', options[0].id, now).recorded, true);
  assert.equal(store.recordBotherVote('guild', 'alice', options[1].id, now).reason, 'already-voted');
  assert.equal(store.recordBotherVote('guild', 'bob', 'unknown', now).reason, 'invalid-option');
  assert.equal(store.finishBotherPoll('guild', now + 5 * 60_000 - 1).finished, false);
  const finished = store.finishBotherPoll('guild', now + 5 * 60_000);
  assert.equal(finished.finished, true);
  assert.equal(finished.action.count, options[0].count);
  assert.equal(store.beginBotherPoll('guild', 'alice', 'channel', options, now + 5 * 60_000).reason, 'action-active');
  for (let index = 0; index < finished.action.count; index += 1) {
    const result = store.recordBotherSend('guild', now + 5 * 60_000 + index * 60 * 60_000);
    assert.equal(result.sent, true);
    assert.equal(result.action.sent, index + 1);
    assert.equal(result.complete, index === finished.action.count - 1);
  }
  assert.equal(store.recordBotherSend('guild', now + 99 * 60 * 60_000).sent, false);
  assert.equal(store.beginBotherPoll('guild', 'alice', 'channel', options, now + 6 * 60 * 60_000).reason, 'daily-limit');
  assert.equal(store.beginBotherPoll('guild', 'alice', 'channel', options, now + 24 * 60 * 60_000).started, true);
  store.setOmOptIn('guild', 'om', false);
  assert.equal(store.getOmSchedule('guild').botherPoll, null);
  assert.equal(store.getOmSchedule('guild').botherAction, null);

  const courses = parseInstructorCsv('role_id,role_name,instructor_user_id,instructor_tag\n1,"Chemistry, Lab",10,chemist\n1,"Chemistry, Lab",11,assistant\n2,Biology,12,bio');
  assert.equal(courses.length, 2);
  assert.equal(courses[0].instructors.length, 2);
  assert.equal(courses[0].name, 'Chemistry, Lab');
  assert.throws(() => parseInstructorCsv('role_id,role_name\n1,Math'), /missing required columns/);
  console.log('Bother Om and camp CSV checks passed.');
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
