import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.js';
import { dailyFacts, dailyFact } from '../src/daily-facts.js';

const filePath = path.join(os.tmpdir(), `scioworld-workflow-${process.pid}.json`);
try { fs.unlinkSync(filePath); } catch {}
try {
  const store = createStore(filePath);
  const guild = 'test-guild';
  const alice = 'alice';
  const bob = 'bob';
  const now = Date.now();

  const first = store.getOrCreate(guild, alice);
  assert.equal(first.coins, 100);
  assert.equal(first.collectibles.includes('frog-of-wisdom'), true);

  const trivia = store.startTrivia(guild, alice, 'question-1', now);
  assert.equal(trivia.started, true);
  const answer = store.answerTrivia(guild, alice, 'question-1', 0, now + 1000, 0);
  assert.equal(answer.accepted, true);
  assert.equal(answer.correct, true);
  assert.equal(answer.knowledgePoints, 10);

  const bobProfile = store.getOrCreate(guild, bob);
  assert.equal(bobProfile.collectibles.includes('frog-of-wisdom'), true);
  assert.equal(store.buyCollectible(guild, alice, 'camp-sticker', 40).purchased, true);
  assert.equal(store.buyCollectible(guild, bob, 'pocket-beaker', 50).purchased, true);
  const offer = store.createTradeOffer(guild, alice, bob, 'camp-sticker', 'pocket-beaker', 0, 0, now);
  assert.equal(offer.created, true);
  assert.equal(store.settleTrade(guild, bob, offer.offer.id, 'accept', now + 1000).settled, true);
  assert.equal(store.getOrCreate(guild, alice).collectibles.includes('pocket-beaker'), true);

  const race = store.createRace(guild, alice, 'science', ['question-1', 'question-2', 'question-3'], now);
  assert.equal(race.created, true);
  assert.equal(store.joinRace(guild, bob, race.race.id).joined, true);
  assert.equal(store.startRace(guild, alice, race.race.id, now + 1000).started, true);

  store.setOmOptIn(guild, bob, true);
  assert.equal(store.setOmTarget(guild, bob).set, true);
  store.beginOmModePoll(guild, 'activation', now, 'channel');
  assert.equal(store.recordOmModeVote(guild, alice, 'water-drop').recorded, true);
  assert.equal(store.finishOmModePoll(guild, now + 60 * 60 * 1000 + 1).finished, true);
  assert.equal(store.activateOm(guild, 'activation', now + 60 * 60 * 1000 + 1).active, true);
  const firstOm = now + 60 * 60 * 1000 + 5 * 60 * 1000;
  assert.equal(store.recordOmMessage(guild, firstOm).sent, true);
  assert.equal(store.recordOmMessage(guild, firstOm + 20 * 60 * 1000).sent, true);
  assert.equal(store.recordOmMessage(guild, firstOm + 40 * 60 * 1000).sent, true);
  assert.equal(store.recordOmMessage(guild, firstOm + 60 * 60 * 1000).sent, false);

  const reloaded = createStore(filePath);
  assert.equal(reloaded.getOrCreate(guild, alice).collectibles.includes('pocket-beaker'), true);
  assert.equal(dailyFacts.length >= 10, true);
  assert.notEqual(dailyFact('2026-10-30'), dailyFact('2026-10-31'));
  console.log('Workflow checks passed.');
} finally {
  try { fs.unlinkSync(filePath); } catch {}
}
