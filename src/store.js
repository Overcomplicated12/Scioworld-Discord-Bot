import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function keyFor(guildId, userId) { return `${guildId}:${userId}`; }

function newProfile(guildId, userId) {
  return {
    guildId, userId, coins: 100, knowledgePoints: 0, streak: 0, lastDailyAt: null,
    resources: { 'starter-kit': 1 }, collectibles: ['frog-of-wisdom'],
    frogLastUsedAt: null, frogQuoteHistory: [],
    triviaCooldownUntil: 0, pendingTrivia: null, lastDrawAt: 0,
    equippedCollectible: 'frog-of-wisdom', createdAt: new Date().toISOString(),
  };
}

export function createStore(filePath = path.join(projectRoot, 'data', 'profiles.json')) {
  let state = { profiles: {} };
  function load() {
    try {
      state = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!state || typeof state !== 'object' || !state.profiles || typeof state.profiles !== 'object') state = { profiles: {} };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      state = { profiles: {} };
    }
  }
  function save() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
    const temporaryPath = `${filePath}.tmp`;
    fs.writeFileSync(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(temporaryPath, filePath);
  }
  function getOrCreate(guildId, userId) {
    load();
    const key = keyFor(guildId, userId);
    if (!state.profiles[key]) { state.profiles[key] = newProfile(guildId, userId); save(); }
    const profile = state.profiles[key];
    if (!Array.isArray(profile.collectibles)) profile.collectibles = [];
    if (!Array.isArray(profile.frogQuoteHistory)) profile.frogQuoteHistory = [];
    if (profile.triviaCooldownUntil === undefined) profile.triviaCooldownUntil = 0;
    if (profile.pendingTrivia === undefined) profile.pendingTrivia = null;
    if (profile.lastDrawAt === undefined) profile.lastDrawAt = 0;
    return profile;
  }
  function hasProfile(guildId, userId) {
    load();
    return Boolean(state.profiles[keyFor(guildId, userId)]);
  }
  function claimDaily(guildId, userId, today, yesterday) {
    const profile = getOrCreate(guildId, userId);
    if (profile.lastDailyAt === today) return { profile, claimed: false };
    profile.streak = profile.lastDailyAt === yesterday ? profile.streak + 1 : 1;
    const reward = 25 + Math.min(profile.streak - 1, 6) * 5;
    profile.coins += reward; profile.knowledgePoints += 5; profile.lastDailyAt = today;
    save();
    return { profile, claimed: true, reward };
  }
  function claimFrogQuote(guildId, userId, nowMs, quoteCount) {
    const profile = getOrCreate(guildId, userId);
    if (!profile.collectibles.includes('frog-of-wisdom')) return { allowed: false, reason: 'missing-collectible', profile };
    const cooldownMs = 30 * 60 * 1000;
    const lastUsedMs = profile.frogLastUsedAt ? Date.parse(profile.frogLastUsedAt) : NaN;
    if (Number.isFinite(lastUsedMs) && nowMs - lastUsedMs < cooldownMs) {
      return { allowed: false, reason: 'cooldown', remainingMs: cooldownMs - (nowMs - lastUsedMs), profile };
    }
    let history = Array.isArray(profile.frogQuoteHistory) ? profile.frogQuoteHistory : [];
    if (history.length >= quoteCount) history = [];
    const available = Array.from({ length: quoteCount }, (_, index) => index).filter(index => !history.includes(index));
    const quoteIndex = available[Math.floor(Math.random() * available.length)];
    profile.frogQuoteHistory = [...history, quoteIndex];
    profile.frogLastUsedAt = new Date(nowMs).toISOString();
    save();
    return { allowed: true, quoteIndex, profile };
  }
  function startTrivia(guildId, userId, questionId, nowMs) {
    const profile = getOrCreate(guildId, userId);
    if (profile.pendingTrivia && profile.pendingTrivia.expiresAt > nowMs) return { started: false, reason: 'pending', profile };
    if (profile.triviaCooldownUntil > nowMs) return { started: false, reason: 'cooldown', remainingMs: profile.triviaCooldownUntil - nowMs, profile };
    profile.pendingTrivia = { questionId, startedAt: nowMs, expiresAt: nowMs + 120_000 };
    profile.triviaCooldownUntil = nowMs + 30_000;
    save();
    return { started: true, profile };
  }
  function answerTrivia(guildId, userId, questionId, answerIndex, nowMs, correctAnswer) {
    const profile = getOrCreate(guildId, userId);
    const pending = profile.pendingTrivia;
    if (!pending || pending.expiresAt <= nowMs) { profile.pendingTrivia = null; save(); return { accepted: false, reason: 'expired', profile }; }
    if (pending.questionId !== questionId) return { accepted: false, reason: 'different-question', profile };
    const correct = answerIndex === correctAnswer;
    profile.pendingTrivia = null;
    const coins = correct ? 15 : 0;
    const knowledgePoints = correct ? 10 : 2;
    profile.coins += coins;
    profile.knowledgePoints += knowledgePoints;
    save();
    return { accepted: true, correct, coins, knowledgePoints, profile };
  }
  function buyCollectible(guildId, userId, itemId, cost) {
    const profile = getOrCreate(guildId, userId);
    if (profile.collectibles.includes(itemId)) return { purchased: false, reason: 'owned', profile };
    if (profile.coins < cost) return { purchased: false, reason: 'insufficient-coins', profile, costNeeded: cost - profile.coins };
    profile.coins -= cost;
    profile.collectibles.push(itemId);
    save();
    return { purchased: true, profile };
  }
  function drawCollectible(guildId, userId, itemId, cost, nowMs) {
    const profile = getOrCreate(guildId, userId);
    if (profile.lastDrawAt + 5_000 > nowMs) return { drawn: false, reason: 'cooldown', remainingMs: profile.lastDrawAt + 5_000 - nowMs, profile };
    if (profile.coins < cost) return { drawn: false, reason: 'insufficient-coins', profile, costNeeded: cost - profile.coins };
    profile.coins -= cost;
    profile.lastDrawAt = nowMs;
    const duplicate = profile.collectibles.includes(itemId);
    const duplicateRefund = duplicate ? Math.floor(cost * 0.25) : 0;
    if (duplicate) profile.coins += duplicateRefund;
    else profile.collectibles.push(itemId);
    save();
    return { drawn: true, duplicate, duplicateRefund, profile };
  }
  return { getOrCreate, hasProfile, claimDaily, claimFrogQuote, startTrivia, answerTrivia, buyCollectible, drawCollectible };
}

export const store = createStore();
