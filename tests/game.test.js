import test from 'node:test';
import assert from 'node:assert/strict';
import { getWorldStatus, rollExploration, EXPLORE_COOLDOWN_SECONDS } from '../src/game.js';

test('initial world progress', () => {
  const s = getWorldStatus(0);
  assert.equal(s.level, 0);
  assert.equal(s.next.name, 'Town Hall');
  assert.equal(s.pointsRemaining, 60);
});

test('build unlocks the first building', () => {
  const s = getWorldStatus(60);
  assert.equal(s.level, 1);
  assert.equal(s.next.name, 'Research Lab');
});

test('unlimited colony goals after core milestones', () => {
  assert.equal(getWorldStatus(500).next.target, 800);
  assert.equal(getWorldStatus(800).next.target, 1100);
});

test('fixed RNG results do not award negative resources', () => {
  for (const n of [0.001, 0.1, 0.4, 0.9]) {
    const result = rollExploration(() => n);
    for (const key of ['coins', 'wood', 'stone', 'artifacts']) assert.ok(result[key] >= 0);
  }
});

test('launch cooldown is short enough for in-session testing', () => {
  assert.equal(EXPLORE_COOLDOWN_SECONDS, 120);
});
