import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.js';
import { questions } from '../src/questions.js';

const numberArg = (name, fallback, minimum, maximum) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${name} must be an integer from ${minimum} to ${maximum}.`);
  return value;
};

const guilds = numberArg('STRESS_GUILDS', 2, 1, 10);
const usersPerGuild = numberArg('STRESS_USERS', 50, 2, 500);
const triviaRounds = numberArg('STRESS_TRIVIA_ROUNDS', 5, 1, 20);
const raceRounds = numberArg('STRESS_RACE_ROUNDS', 3, 1, 10);
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'scioworld-stress-'));
const filePath = path.join(directory, 'profiles.json');
const startedAt = process.hrtime.bigint();
let operations = 0;

try {
  const store = createStore(filePath);
  for (let guildIndex = 0; guildIndex < guilds; guildIndex += 1) {
    const guildId = `stress-guild-${guildIndex}`;
    const userIds = Array.from({ length: usersPerGuild }, (_, index) => `stress-user-${index}`);
    for (const userId of userIds) { store.getOrCreate(guildId, userId); operations += 1; }

    for (let userIndex = 0; userIndex < userIds.length; userIndex += 1) {
      const userId = userIds[userIndex];
      for (let round = 0; round < triviaRounds; round += 1) {
        const question = questions[(userIndex * triviaRounds + round) % questions.length];
        const now = Date.UTC(2030, 0, 1) + (round * 31_000);
        assert.equal(store.startTrivia(guildId, userId, question.id, now).started, true);
        assert.equal(store.answerTrivia(guildId, userId, question.id, question.answer, now + 1_000, question.answer).accepted, true);
        operations += 2;
      }
    }

    for (let raceIndex = 0; raceIndex < Math.min(usersPerGuild - 1, 10); raceIndex += 1) {
      const host = userIds[raceIndex];
      const challenger = userIds[raceIndex + 1];
      const raceQuestions = Array.from({ length: raceRounds }, (_, round) => questions[(raceIndex + round) % questions.length]);
      const now = Date.UTC(2030, 0, 2) + raceIndex * 100_000;
      const created = store.createRace(guildId, host, 'stress', raceQuestions.map(question => question.id), now);
      assert.equal(created.created, true);
      assert.equal(store.joinRace(guildId, challenger, created.race.id).joined, true);
      assert.equal(store.startRace(guildId, host, created.race.id, now + 1_000).started, true);
      for (let round = 0; round < raceQuestions.length; round += 1) {
        const question = raceQuestions[round];
        // The challenger submits an incorrect answer first; the host then
        // submits the correct answer and advances the round.
        const miss = (question.answer + 1) % question.choices.length;
        const waiting = store.answerRace(guildId, challenger, created.race.id, miss, question, now + 2_000 + round * 2);
        assert.equal(waiting.answered, true);
        assert.equal(waiting.complete, false);
        const result = store.answerRace(guildId, host, created.race.id, question.answer, question, now + 3_000 + round * 2);
        assert.equal(result.answered, true);
        if (result.finished) break;
      }
      operations += 4 + raceRounds;
    }

    assert.equal(store.listProfiles(guildId, 'knowledgePoints').length, usersPerGuild);
  }

  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
  const memory = process.memoryUsage();
  console.log(`Stress test passed: ${operations} operations, ${guilds} guilds, ${usersPerGuild} users/guild.`);
  console.log(`Elapsed: ${elapsedMs.toFixed(0)} ms · RSS: ${(memory.rss / 1024 / 1024).toFixed(1)} MB · heap: ${(memory.heapUsed / 1024 / 1024).toFixed(1)} MB`);
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
