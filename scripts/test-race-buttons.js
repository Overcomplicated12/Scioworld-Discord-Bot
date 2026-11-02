import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.js';
import { handleButton, handleNumericMessage } from '../src/commands/race.js';
import { questions } from '../src/questions.js';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'scio-race-buttons-'));
try {
  const persistence = createStore(path.join(directory, 'state.json'));
  const now = Date.now();
  const race = persistence.createRace('g', 'toby', 'science', questions.slice(0, 3).map(question => question.id), now).race;
  assert.equal(persistence.joinRace('g', 'kedar', race.id).joined, true);
  assert.equal(persistence.startRace('g', 'toby', race.id, now).started, true);

  let reply;
  const wrongChoice = (questions[0].answer + 1) % questions[0].choices.length;
  await handleButton({ guildId: 'g', user: { id: 'toby' }, customId: `race:${race.id}:0:${wrongChoice}`, reply: async value => { reply = value; } }, persistence);
  assert.equal(reply.flags, 64, 'A partial race answer should only acknowledge the answering player.');
  assert.match(reply.content, /waiting for another racer/i);

  await handleButton({ guildId: 'g', user: { id: 'kedar' }, customId: `race:${race.id}:0:${questions[0].answer}`, update: async value => { reply = value; } }, persistence);
  assert.match(reply.content, /round 2\/3/i, 'The final answer for a round should post the next question with buttons.');
  assert.match(reply.content, /kedar> answered first/i, 'The next round should identify the first correct racer.');
  assert.equal(reply.components[0].components.length, 4);

  await handleButton({ guildId: 'g', user: { id: 'kedar' }, customId: `race:${race.id}:0:0`, reply: async value => { reply = value; } }, persistence);
  assert.match(reply.content, /already moved on/i, 'Old buttons cannot submit an answer to a later round.');

  let reaction;
  const numericReply = { guildId: 'g', author: { id: 'toby', bot: false }, content: String(((questions[1].answer + 1) % questions[1].choices.length) + 1), react: async value => { reaction = value; } };
  assert.equal(await handleNumericMessage(numericReply, persistence), true);
  assert.equal(reaction, '✅', 'A plain numeric message records the player’s answer.');
  let sent;
  const numericFinal = { guildId: 'g', author: { id: 'kedar', bot: false }, content: String(questions[1].answer + 1), channel: { send: async value => { sent = value; } } };
  assert.equal(await handleNumericMessage(numericFinal, persistence), true);
  assert.match(sent.content, /round 3\/3/i, 'The final numeric answer advances the race.');
  console.log('Race button checks passed: each racer can answer, next question posts, and stale buttons are rejected.');
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
