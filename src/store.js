import fs from 'node:fs';
import { runPilot, pilotJobs, acknowledgePilotJob } from './pilot.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const economy = JSON.parse(fs.readFileSync(new URL('../content/pilot/season.json', import.meta.url), 'utf8')).economy;
for (const key of ['triviaDailyLimit','triviaCoins','triviaKP','raceWeeklyLimit','raceCoins','raceKP','dailyCoins','dailyKP']) {
  if (!Number.isInteger(economy?.[key]) || economy[key] < 0) throw new Error(`Invalid economy setting: ${key}`);
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function keyFor(guildId, userId) { return `${guildId}:${userId}`; }

function newProfile(guildId, userId) {
  return {
    guildId, userId, coins: 100, knowledgePoints: 0, streak: 0, lastDailyAt: null,
    resources: { 'starter-kit': 1 }, collectibles: ['frog-of-wisdom'],
    frogLastUsedAt: null, frogQuoteHistory: [],
    triviaCooldownUntil: 0, pendingTrivia: null, triviaStreak: 0, bestTriviaStreak: 0,
    reportCooldownUntil: 0,
    equippedCollectible: 'frog-of-wisdom', createdAt: new Date().toISOString(),
  };
}

export function createStore(filePath = path.join(projectRoot, 'data', 'profiles.json')) {
  let state = { profiles: {}, trades: [], nextTradeId: 1, races: [], nextRaceId: 1, reports: [], nextReportId: 1, campResources: {}, campTrivia: {}, nextCampTriviaId: 1, campTriviaAnswers: {}, loreSubmissions: [], nextLoreSubmissionId: 1, loreProgress: {}, loreDiscussions: {}, loreChallenges: {}, pollSchedules: {}, omSchedules: {} };
  function load() {
    try {
      state = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!state || typeof state !== 'object' || !state.profiles || typeof state.profiles !== 'object' || Array.isArray(state.profiles)) throw new Error('Profile store is invalid; refusing to overwrite existing data. Restore a verified backup.');
      if (!Array.isArray(state.trades)) state.trades = [];
      if (!Number.isInteger(state.nextTradeId) || state.nextTradeId < 1) state.nextTradeId = 1;
      if (!Array.isArray(state.races)) state.races = [];
      if (!Number.isInteger(state.nextRaceId) || state.nextRaceId < 1) state.nextRaceId = 1;
      if (!Array.isArray(state.reports)) state.reports = [];
      if (!Number.isInteger(state.nextReportId) || state.nextReportId < 1) state.nextReportId = state.reports.length + 1;
      if (!state.campResources || typeof state.campResources !== 'object') state.campResources = {};
      if (!state.campTrivia || typeof state.campTrivia !== 'object') state.campTrivia = {};
      if (!Number.isInteger(state.nextCampTriviaId) || state.nextCampTriviaId < 1) state.nextCampTriviaId = 1;
      if (!state.campTriviaAnswers || typeof state.campTriviaAnswers !== 'object') state.campTriviaAnswers = {};
      if (!Array.isArray(state.loreSubmissions)) state.loreSubmissions = [];
      if (!Number.isInteger(state.nextLoreSubmissionId) || state.nextLoreSubmissionId < 1) state.nextLoreSubmissionId = state.loreSubmissions.length + 1;
      if (!state.loreProgress || typeof state.loreProgress !== 'object') state.loreProgress = {};
      if (!state.loreDiscussions || typeof state.loreDiscussions !== 'object') state.loreDiscussions = {};
      if (!state.loreChallenges || typeof state.loreChallenges !== 'object') state.loreChallenges = {};
      if (!state.pollSchedules || typeof state.pollSchedules !== 'object') state.pollSchedules = {};
      if (!state.omSchedules || typeof state.omSchedules !== 'object') state.omSchedules = {};
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      state = { profiles: {}, trades: [], nextTradeId: 1, races: [], nextRaceId: 1, reports: [], nextReportId: 1, campResources: {}, campTrivia: {}, nextCampTriviaId: 1, campTriviaAnswers: {}, loreSubmissions: [], nextLoreSubmissionId: 1, loreProgress: {}, loreDiscussions: {}, loreChallenges: {}, pollSchedules: {}, omSchedules: {} };
    }
  }
  function save() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
    const temporaryPath = `${filePath}.tmp`;
    const descriptor = fs.openSync(temporaryPath, 'w', 0o600);
    try {
      fs.writeFileSync(descriptor, `${JSON.stringify(state, null, 2)}\n`);
      fs.fsyncSync(descriptor);
    } finally { fs.closeSync(descriptor); }
    fs.renameSync(temporaryPath, filePath);
    const directory = fs.openSync(path.dirname(filePath), 'r');
    try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
  }
  // All pilot operations run synchronously without awaits, in this one PM2 process.
  // Save the complete ledger and balances together, so retries cannot double-pay.
  function pilotTransaction(operation) {
    load();
    if (!state.pilot && fs.existsSync(filePath)) {
      const backup = `${filePath}.pre-pilot.bak`;
      if (!fs.existsSync(backup)) fs.copyFileSync(filePath, backup, fs.constants.COPYFILE_EXCL);
    }
    const before = structuredClone(state);
    try { const result = operation(state); save(); return structuredClone(result); }
    catch (error) { state = before; throw error; }
  }
  function pilot(guildId, userId, action, args = {}, now = Date.now(), canManage = false) {
    return pilotTransaction(state => runPilot(state, guildId, userId, action, args, now, canManage));
  }
  function getPilotJobs(guildId, now = Date.now()) { return pilotTransaction(state => pilotJobs(state, guildId, now)); }
  function ackPilotJob(guildId, job, messageId) { return pilotTransaction(state => acknowledgePilotJob(state, guildId, job, messageId)); }
  function pilotQuiet(guildId) { load(); return state.pilot?.quietGuilds.includes(guildId) || false; }
  function getOrCreate(guildId, userId) {
    load();
    const key = keyFor(guildId, userId);
    if (!state.profiles[key]) { state.profiles[key] = newProfile(guildId, userId); save(); }
    const profile = state.profiles[key];
    if (!Array.isArray(profile.collectibles)) profile.collectibles = [];
    if (!Array.isArray(profile.frogQuoteHistory)) profile.frogQuoteHistory = [];
    if (profile.triviaCooldownUntil === undefined) profile.triviaCooldownUntil = 0;
    if (profile.pendingTrivia === undefined) profile.pendingTrivia = null;
    if (profile.triviaStreak === undefined) profile.triviaStreak = 0;
    if (profile.bestTriviaStreak === undefined) profile.bestTriviaStreak = profile.triviaStreak;
    if (profile.reportCooldownUntil === undefined) profile.reportCooldownUntil = 0;
    if (profile.leaderboardOptOut === undefined) profile.leaderboardOptOut = false;
    if (profile.recognitionOptOut === undefined) profile.recognitionOptOut = false;
    if (profile.campOptOut === undefined) profile.campOptOut = false;
    return profile;
  }
  function hasProfile(guildId, userId) {
    load();
    return Boolean(state.profiles[keyFor(guildId, userId)]);
  }
  function claimDaily(guildId, userId, today, yesterday) {
    const profile = getOrCreate(guildId, userId);
    if (profile.lastDailyAt === today) return { profile, claimed: false };
    // Preserve the historical streak value, but remove streak pressure and escalating rewards.
    const reward = economy.dailyCoins;
    profile.coins += reward; profile.knowledgePoints += economy.dailyKP; profile.lastDailyAt = today;
    save();
    return { profile, claimed: true, reward, knowledgePoints: economy.dailyKP };
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
    const day = new Date(nowMs).toISOString().slice(0, 10);
    if (profile.triviaRewardDay !== day) { profile.triviaRewardDay = day; profile.triviaRewardQuestions = []; }
    const eligible = correct && !profile.triviaRewardQuestions.includes(questionId) && profile.triviaRewardQuestions.length < economy.triviaDailyLimit;
    const coins = eligible ? economy.triviaCoins : 0;
    const knowledgePoints = eligible ? economy.triviaKP : 0;
    if (eligible) profile.triviaRewardQuestions.push(questionId);
    profile.triviaStreak = correct ? (profile.triviaStreak || 0) + 1 : 0;
    profile.bestTriviaStreak = Math.max(profile.bestTriviaStreak || 0, profile.triviaStreak);
    profile.coins += coins;
    profile.knowledgePoints += knowledgePoints;
    save();
    return { accepted: true, correct, coins, knowledgePoints, triviaStreak: profile.triviaStreak, profile };
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
  function createTradeOffer(guildId, fromUserId, toUserId, giveItem, wantItem, giveCoins, wantCoins, nowMs) {
    if (fromUserId === toUserId) return { created: false, reason: 'self' };
    const sender = getOrCreate(guildId, fromUserId);
    if (!sender.collectibles.includes(giveItem)) return { created: false, reason: 'missing-give-item' };
    if (sender.coins < giveCoins) return { created: false, reason: 'insufficient-give-coins', costNeeded: giveCoins - sender.coins };
    if (giveItem === wantItem && giveCoins === wantCoins) return { created: false, reason: 'identical' };
    load();
    const id = `T${String(state.nextTradeId++).padStart(4, '0')}`;
    state.trades.push({ id, guildId, fromUserId, toUserId, giveItem, wantItem, giveCoins, wantCoins, status: 'pending', createdAt: new Date(nowMs).toISOString(), expiresAt: new Date(nowMs + 24 * 60 * 60 * 1000).toISOString() });
    save();
    return { created: true, offer: state.trades[state.trades.length - 1] };
  }
  function findTrade(id) {
    load();
    return state.trades.find(trade => trade.id.toLowerCase() === id.toLowerCase());
  }
  function settleTrade(guildId, userId, id, action, nowMs) {
    const trade = findTrade(id);
    if (!trade) return { settled: false, reason: 'not-found' };
    if (trade.guildId !== guildId) return { settled: false, reason: 'wrong-server' };
    if (trade.status !== 'pending') return { settled: false, reason: 'not-pending', trade };
    if (new Date(trade.expiresAt).getTime() <= nowMs) { trade.status = 'expired'; save(); return { settled: false, reason: 'expired', trade }; }
    if (action === 'cancel' && trade.fromUserId !== userId) return { settled: false, reason: 'not-owner' };
    if (action === 'decline' && trade.toUserId !== userId) return { settled: false, reason: 'not-recipient' };
    if (action !== 'accept') { trade.status = action; trade.resolvedAt = new Date(nowMs).toISOString(); save(); return { settled: true, trade }; }
    if (trade.toUserId !== userId) return { settled: false, reason: 'not-recipient' };
    load();
    const senderKey = keyFor(guildId, trade.fromUserId);
    const recipientKey = keyFor(guildId, trade.toUserId);
    if (!state.profiles[senderKey]) state.profiles[senderKey] = newProfile(guildId, trade.fromUserId);
    if (!state.profiles[recipientKey]) state.profiles[recipientKey] = newProfile(guildId, trade.toUserId);
    const sender = state.profiles[senderKey];
    const recipient = state.profiles[recipientKey];
    if (!sender.collectibles.includes(trade.giveItem)) return { settled: false, reason: 'sender-missing-item' };
    if (!recipient.collectibles.includes(trade.wantItem)) return { settled: false, reason: 'recipient-missing-item' };
    if (sender.coins < trade.giveCoins) return { settled: false, reason: 'sender-missing-coins' };
    if (recipient.coins < trade.wantCoins) return { settled: false, reason: 'recipient-missing-coins' };
    if (recipient.collectibles.includes(trade.giveItem)) return { settled: false, reason: 'recipient-already-owns-give' };
    if (sender.collectibles.includes(trade.wantItem)) return { settled: false, reason: 'sender-already-owns-want' };
    sender.collectibles.splice(sender.collectibles.indexOf(trade.giveItem), 1);
    recipient.collectibles.splice(recipient.collectibles.indexOf(trade.wantItem), 1);
    sender.collectibles.push(trade.wantItem);
    recipient.collectibles.push(trade.giveItem);
    sender.coins = sender.coins - trade.giveCoins + trade.wantCoins;
    recipient.coins = recipient.coins - trade.wantCoins + trade.giveCoins;
    trade.status = 'accepted'; trade.resolvedAt = new Date(nowMs).toISOString();
    save();
    return { settled: true, trade };
  }
  function pendingTrades(guildId, userId) {
    load();
    return state.trades.filter(trade => trade.guildId === guildId && trade.status === 'pending' && (trade.fromUserId === userId || trade.toUserId === userId));
  }
  function listProfiles(guildId, metric) {
    load();
    return Object.values(state.profiles).filter(profile => profile.guildId === guildId && !profile.leaderboardOptOut).sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
  }
  function setLeaderboardPrivacy(guildId, userId, optedOut) {
    const profile = getOrCreate(guildId, userId); profile.leaderboardOptOut = optedOut; save(); return profile;
  }
  function setPrivacy(guildId, userId, scope, optedOut) {
    const profile = getOrCreate(guildId, userId);
    const fields = { leaderboard: 'leaderboardOptOut', recognition: 'recognitionOptOut', camp: 'campOptOut' };
    if (!fields[scope]) return { updated: false, reason: 'invalid-scope', profile };
    profile[fields[scope]] = optedOut; save(); return { updated: true, profile };
  }
  function equipCollectible(guildId, userId, itemId) {
    const profile = getOrCreate(guildId, userId);
    if (!profile.collectibles.includes(itemId)) return { equipped: false, reason: 'missing-item', profile };
    profile.equippedCollectible = itemId; save(); return { equipped: true, profile };
  }
  function craftCollectible(guildId, userId, outputId, inputResource, inputCount, coinCost) {
    const profile = getOrCreate(guildId, userId);
    if (profile.collectibles.includes(outputId)) return { crafted: false, reason: 'owned', profile };
    if ((profile.resources[inputResource] || 0) < inputCount) return { crafted: false, reason: 'missing-resource', profile };
    if (profile.coins < coinCost) return { crafted: false, reason: 'insufficient-coins', profile, costNeeded: coinCost - profile.coins };
    profile.resources[inputResource] -= inputCount; profile.coins -= coinCost; profile.collectibles.push(outputId); save(); return { crafted: true, profile };
  }
  function createRace(guildId, hostId, category, questionIds, nowMs) {
    load();
    if (state.races.some(race => race.guildId === guildId && ['lobby', 'active'].includes(race.status))) return { created: false, reason: 'active-race' };
    const host = getOrCreate(guildId, hostId);
    const id = `R${String(state.nextRaceId++).padStart(4, '0')}`;
    const race = { id, guildId, hostId, category, questionIds, players: [hostId], scores: { [hostId]: 0 }, answers: {}, round: -1, status: 'lobby', createdAt: new Date(nowMs).toISOString(), lastActivityAt: nowMs };
    state.races.push(race); save(); return { created: true, race };
  }
  function joinRace(guildId, userId, raceId) {
    load(); const race = state.races.find(item => item.guildId === guildId && item.id.toLowerCase() === raceId.toLowerCase());
    if (!race) return { joined: false, reason: 'not-found' }; if (race.status !== 'lobby') return { joined: false, reason: 'not-lobby' }; if (race.players.includes(userId)) return { joined: false, reason: 'already-joined' };
    const profileKey = keyFor(guildId, userId);
    if (!state.profiles[profileKey]) state.profiles[profileKey] = newProfile(guildId, userId);
    const profile = state.profiles[profileKey];
    race.players.push(userId); race.scores[userId] = 0; race.lastActivityAt = Date.now(); save(); return { joined: true, race };
  }
  function startRace(guildId, userId, raceId, nowMs) {
    load(); const race = state.races.find(item => item.guildId === guildId && item.id.toLowerCase() === raceId.toLowerCase());
    if (!race) return { started: false, reason: 'not-found' }; if (race.hostId !== userId) return { started: false, reason: 'not-host' }; if (race.status !== 'lobby') return { started: false, reason: 'not-lobby' }; if (race.players.length < 2) return { started: false, reason: 'not-enough-players' };
    race.status = 'active'; race.round = 0; race.answers = {}; race.startedAt = new Date(nowMs).toISOString(); race.lastActivityAt = nowMs; save(); return { started: true, race, questionId: race.questionIds[0] };
  }
  function answerRace(guildId, userId, raceId, answerIndex, question, nowMs) {
    load(); const race = state.races.find(item => item.guildId === guildId && item.id.toLowerCase() === raceId.toLowerCase());
    if (!race) return { answered: false, reason: 'not-found' }; if (race.status !== 'active') return { answered: false, reason: 'not-active' }; if (!race.players.includes(userId)) return { answered: false, reason: 'not-player' };
    if (!question || question.id !== race.questionIds[race.round] || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= question.choices.length) return { answered: false, reason: 'invalid-answer' };
    if (!race.answers[race.round]) race.answers[race.round] = {};
    if (race.answers[race.round][userId] !== undefined) return { answered: false, reason: 'already-answered' };
    race.answers[race.round][userId] = answerIndex; race.lastActivityAt = nowMs;
    const complete = race.players.every(player => race.answers[race.round][player] !== undefined);
    if (!complete) { save(); return { answered: true, complete: false, correct: answerIndex === question.answer, race }; }
    for (const player of race.players) if (race.answers[race.round][player] === question.answer) race.scores[player] += 1;
    race.round += 1;
    if (race.round >= race.questionIds.length) {
      race.status = 'finished'; race.finishedAt = new Date(nowMs).toISOString(); const max = Math.max(...Object.values(race.scores)); const winners = race.players.filter(player => race.scores[player] === max);
      const rewards = {};
      for (const playerId of race.players) {
        const profileKey = keyFor(guildId, playerId);
        if (!state.profiles[profileKey]) state.profiles[profileKey] = newProfile(guildId, playerId);
        const p = state.profiles[profileKey];
        const date = new Date(nowMs); const day = date.getUTCDay();
        date.setUTCDate(date.getUTCDate() - (day + 6) % 7); date.setUTCHours(0, 0, 0, 0);
        const week = date.toISOString();
        if (p.raceRewardWeek !== week) { p.raceRewardWeek = week; p.raceRewardCount = 0; }
        const eligible = p.raceRewardCount < economy.raceWeeklyLimit;
        p.raceRewardCount += 1;
        const reward = eligible && max > 0 && winners.includes(playerId) ? { coins: economy.raceCoins, knowledgePoints: economy.raceKP } : { coins: 0, knowledgePoints: 0 };
        state.profiles[profileKey].coins += reward.coins;
        state.profiles[profileKey].knowledgePoints += reward.knowledgePoints;
        rewards[playerId] = reward;
      }
      race.rewardsAwarded = true; save(); return { answered: true, complete: true, finished: true, winners, rewards, race };
    }
    save(); return { answered: true, complete: true, finished: false, nextQuestionId: race.questionIds[race.round], race };
  }
  function cancelRace(guildId, userId, raceId, isModerator = false) {
    load(); const race = state.races.find(item => item.guildId === guildId && item.id.toLowerCase() === raceId.toLowerCase()); if (!race) return { cancelled: false, reason: 'not-found' }; if (!isModerator && race.hostId !== userId) return { cancelled: false, reason: 'not-host' }; if (!['lobby', 'active'].includes(race.status)) return { cancelled: false, reason: 'not-active' }; race.status = 'cancelled'; race.cancelledAt = new Date().toISOString(); save(); return { cancelled: true, race };
  }
  function getRace(guildId, raceId) { load(); return state.races.find(item => item.guildId === guildId && item.id.toLowerCase() === raceId.toLowerCase()); }
  function getOperationalStatus(guildId, nowMs = Date.now()) {
    load();
    const poll = getPollSchedule(guildId, nowMs);
    const om = getOmSchedule(guildId);
    return {
      activeRaces: state.races.filter(race => race.guildId === guildId && ['lobby', 'active'].includes(race.status)).length,
      openReports: state.reports.filter(report => report.guildId === guildId && report.status === 'open').length,
      nextPollAt: poll.nextDueAt,
      omTargetId: om.targetId,
      omActive: om.activeUntil > nowMs,
    };
  }
  function expireRaces(guildId, nowMs, lobbyMs = 15 * 60 * 1000, activeMs = 3 * 60 * 1000) {
    load();
    const expired = [];
    for (const race of state.races.filter(item => item.guildId === guildId && ['lobby', 'active'].includes(item.status))) {
      const lastActivity = race.lastActivityAt || Date.parse(race.startedAt || race.createdAt);
      const limit = race.status === 'lobby' ? lobbyMs : activeMs;
      if (Number.isFinite(lastActivity) && nowMs - lastActivity >= limit) {
        race.status = 'expired'; race.expiredAt = new Date(nowMs).toISOString(); expired.push(race);
      }
    }
    if (expired.length) save();
    return expired;
  }
  function createReport(guildId, reporterId, reportedUserId, reason, nowMs) {
    const reporter = getOrCreate(guildId, reporterId);
    if (reporter.reportCooldownUntil > nowMs) return { created: false, reason: 'cooldown', remainingMs: reporter.reportCooldownUntil - nowMs };
    load();
    const hourAgo = nowMs - 60 * 60 * 1000;
    const recentReports = state.reports.filter(report => report.guildId === guildId && report.reporterId === reporterId && Date.parse(report.createdAt) > hourAgo);
    if (recentReports.length >= 5) return { created: false, reason: 'hourly-limit' };
    state.reports.push({ id: `P${String(state.nextReportId++).padStart(4, '0')}`, guildId, reporterId, reportedUserId, reason, createdAt: new Date(nowMs).toISOString(), status: 'open' });
    const profileKey = keyFor(guildId, reporterId);
    if (!state.profiles[profileKey]) state.profiles[profileKey] = newProfile(guildId, reporterId);
    state.profiles[profileKey].reportCooldownUntil = nowMs + 60 * 1000;
    save();
    return { created: true };
  }
  function listReports(guildId, status = 'open') {
    load();
    return state.reports.filter(report => report.guildId === guildId && (!status || report.status === status)).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
  function updateReport(guildId, reportId, status) {
    load();
    const report = state.reports.find(item => item.guildId === guildId && item.id?.toLowerCase() === reportId.toLowerCase());
    if (!report) return { updated: false, reason: 'not-found' };
    if (!['open', 'closed'].includes(status)) return { updated: false, reason: 'invalid-status' };
    report.status = status; report.updatedAt = new Date().toISOString(); save(); return { updated: true, report };
  }
  function getCampResources(guildId) {
    load();
    return Object.values(state.campResources[guildId] || {}).sort((a, b) => a.name.localeCompare(b.name));
  }
  function addCampCourse(guildId, name, roleId, roleName) {
    load();
    if (!state.campResources[guildId]) state.campResources[guildId] = {};
    const courseId = name.trim().toLowerCase();
    if (state.campResources[guildId][courseId]) return { added: false, reason: 'exists' };
    state.campResources[guildId][courseId] = { id: courseId, name: name.trim(), roleId, roleName, instructors: [] };
    save();
    return { added: true, course: state.campResources[guildId][courseId] };
  }
  function removeCampCourse(guildId, name) {
    load();
    const courses = state.campResources[guildId] || {};
    const courseId = name.trim().toLowerCase();
    if (!courses[courseId]) return { removed: false, reason: 'not-found' };
    const course = courses[courseId];
    delete courses[courseId];
    save();
    return { removed: true, course };
  }
  function addCampInstructor(guildId, courseName, userId, username) {
    load();
    const course = (state.campResources[guildId] || {})[courseName.trim().toLowerCase()];
    if (!course) return { added: false, reason: 'course-not-found' };
    if (course.instructors.some(instructor => instructor.userId === userId)) return { added: false, reason: 'exists' };
    course.instructors.push({ userId, username });
    save();
    return { added: true, course };
  }
  function removeCampInstructor(guildId, courseName, userId) {
    load();
    const course = (state.campResources[guildId] || {})[courseName.trim().toLowerCase()];
    if (!course) return { removed: false, reason: 'course-not-found' };
    const index = course.instructors.findIndex(instructor => instructor.userId === userId);
    if (index < 0) return { removed: false, reason: 'not-found' };
    const [instructor] = course.instructors.splice(index, 1);
    save();
    return { removed: true, course, instructor };
  }
  function exportCampResources(guildId) {
    load();
    return JSON.stringify(Object.values(state.campResources[guildId] || {}), null, 2);
  }
  function importCampResources(guildId, rawData) {
    let parsed;
    try { parsed = JSON.parse(rawData); } catch { return { imported: false, reason: 'invalid-json' }; }
    if (!Array.isArray(parsed) || parsed.some(course => !course || typeof course.name !== 'string' || typeof course.roleId !== 'string' || typeof course.roleName !== 'string' || !Array.isArray(course.instructors))) return { imported: false, reason: 'invalid-shape' };
    const courses = {};
    for (const course of parsed) {
      const id = course.name.trim().toLowerCase();
      if (!id || courses[id] || course.instructors.some(instructor => !instructor || typeof instructor.userId !== 'string' || typeof instructor.username !== 'string')) return { imported: false, reason: 'invalid-shape' };
      courses[id] = { id, name: course.name.trim(), roleId: course.roleId, roleName: course.roleName, instructors: course.instructors.map(instructor => ({ userId: instructor.userId, username: instructor.username })) };
    }
    load(); state.campResources[guildId] = courses; save(); return { imported: true, count: Object.keys(courses).length };
  }
  function isCampInstructor(guildId, courseName, userId) {
    load();
    const course = (state.campResources[guildId] || {})[courseName.trim().toLowerCase()];
    return Boolean(course?.instructors?.some(instructor => instructor.userId === userId));
  }
  function addCampTriviaQuestion(guildId, courseName, authorId, prompt, choices, answer) {
    load();
    const courseId = courseName.trim().toLowerCase();
    if (!(state.campResources[guildId] || {})[courseId]) return { added: false, reason: 'course-not-found' };
    if (!Array.isArray(choices) || choices.length !== 4 || !Number.isInteger(answer) || answer < 0 || answer > 3) return { added: false, reason: 'invalid-question' };
    if (!state.campTrivia[guildId]) state.campTrivia[guildId] = {};
    if (!Array.isArray(state.campTrivia[guildId][courseId])) state.campTrivia[guildId][courseId] = [];
    const question = { id: `CT${String(state.nextCampTriviaId++).padStart(4, '0')}`, courseId, authorId, prompt: prompt.trim(), choices: choices.map(choice => choice.trim()), answer, createdAt: new Date().toISOString() };
    state.campTrivia[guildId][courseId].push(question); save(); return { added: true, question };
  }
  function listCampTriviaQuestions(guildId, courseName) {
    load(); return [...((state.campTrivia[guildId] || {})[courseName.trim().toLowerCase()] || [])];
  }
  function removeCampTriviaQuestion(guildId, courseName, questionId) {
    load(); const courseId = courseName.trim().toLowerCase(); const questions = (state.campTrivia[guildId] || {})[courseId] || []; const index = questions.findIndex(question => question.id.toLowerCase() === questionId.toLowerCase());
    if (index < 0) return { removed: false, reason: 'not-found' }; const [question] = questions.splice(index, 1); save(); return { removed: true, question };
  }
  function answerCampTrivia(guildId, userId, questionId, answerIndex) {
    load();
    const questions = Object.values(state.campTrivia[guildId] || {}).flat();
    const question = questions.find(item => item.id.toLowerCase() === questionId.toLowerCase());
    if (!question) return { accepted: false, reason: 'not-found' };
    const key = `${guildId}:${userId}:${question.id}`;
    if (state.campTriviaAnswers[key]) return { accepted: false, reason: 'already-answered' };
    const profile = getOrCreate(guildId, userId);
    state.campTriviaAnswers[key] = true;
    const correct = answerIndex === question.answer;
    const reward = correct ? { coins: 10, knowledgePoints: 8 } : { coins: 0, knowledgePoints: 2 };
    profile.coins += reward.coins; profile.knowledgePoints += reward.knowledgePoints; save();
    return { accepted: true, correct, reward, question };
  }
  function createLoreSubmission(guildId, authorId, title, text, tags = []) {
    load();
    const cleanTags = tags.filter(Boolean).map(tag => tag.trim().toLowerCase()).filter(Boolean).slice(0, 6);
    const submission = { id: `LS${String(state.nextLoreSubmissionId++).padStart(4, '0')}`, guildId, authorId, title: title.trim(), text: text.trim(), tags: cleanTags, status: 'pending', staffNoticePending: true, createdAt: new Date().toISOString() };
    state.loreSubmissions.push(submission); save(); return submission;
  }
  function listLoreSubmissions(guildId, status = null) {
    load(); return state.loreSubmissions.filter(item => item.guildId === guildId && (!status || item.status === status)).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
  function updateLoreSubmission(guildId, submissionId, status) {
    load(); const submission = state.loreSubmissions.find(item => item.guildId === guildId && item.id.toLowerCase() === submissionId.toLowerCase());
    if (!submission) return { updated: false, reason: 'not-found' };
    if (!['approved', 'rejected'].includes(status)) return { updated: false, reason: 'invalid-status' };
    if (submission.status !== status) {
      if (status === 'approved' && !submission.approvalNotifiedAt) {
        submission.approvalNoticePending = true;
        delete submission.approvalNoticeNextAt;
      } else if (status !== 'approved') submission.approvalNoticePending = false;
    }
    submission.status = status; submission.reviewedAt = new Date().toISOString(); save(); return { updated: true, submission };
  }
  function loreKey(storyId, entryId) { return `${storyId}:${entryId}`; }
  function getLoreProgress(guildId, stories) {
    load();
    if (!state.loreProgress[guildId]) state.loreProgress[guildId] = {};
    for (const story of stories) if (story.entries.length && state.loreProgress[guildId][story.id] === undefined) state.loreProgress[guildId][story.id] = 0;
    save(); return state.loreProgress[guildId];
  }
  function startLoreDiscussion(guildId, storyId, entryId, prompt, nowMs = Date.now()) {
    load(); const key = loreKey(storyId, entryId); const existing = state.loreDiscussions[key];
    if (existing && !existing.unlocked) return { started: false, reason: 'active', discussion: existing };
    const discussion = { guildId, storyId, entryId, prompt, participants: [], startedAt: nowMs, unlocked: false };
    state.loreDiscussions[key] = discussion; save(); return { started: true, discussion };
  }
  function joinLoreDiscussion(guildId, userId, storyId, entryId) {
    load(); const key = loreKey(storyId, entryId); const discussion = state.loreDiscussions[key];
    if (!discussion || discussion.guildId !== guildId || discussion.unlocked) return { joined: false, reason: 'inactive' };
    if (discussion.participants.includes(userId)) return { joined: false, reason: 'already-joined', discussion };
    discussion.participants.push(userId);
    if (discussion.participants.length >= 3) {
      const progress = state.loreProgress[guildId] || (state.loreProgress[guildId] = {});
      const nextIndex = Number.isInteger(progress[storyId]) ? progress[storyId] + 1 : 1;
      progress[storyId] = nextIndex; discussion.unlocked = true; discussion.unlockedAt = Date.now();
    }
    save(); return { joined: true, unlocked: discussion.unlocked, discussion };
  }
  function normalizeAnswer(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function startLoreChallenge(guildId, storyId, entryId, clue, answer, aliases = [], nowMs = Date.now()) {
    load(); const key = loreKey(storyId, entryId); const existing = state.loreChallenges?.[key];
    if (existing && !existing.solved) return { started: false, reason: 'active', challenge: existing };
    if (!state.loreChallenges) state.loreChallenges = {};
    const challenge = { guildId, storyId, entryId, clue, answer: normalizeAnswer(answer), aliases: [answer, ...aliases].map(normalizeAnswer), attempts: {}, startedAt: nowMs, solved: false };
    state.loreChallenges[key] = challenge; save(); return { started: true, challenge };
  }
  function answerLoreChallenge(guildId, userId, storyId, entryId, submittedAnswer, nowMs = Date.now()) {
    load(); const key = loreKey(storyId, entryId); const challenge = state.loreChallenges?.[key];
    if (!challenge || challenge.guildId !== guildId || challenge.solved) return { solved: false, reason: 'inactive' };
    const lastAttempt = challenge.attempts[userId] || 0;
    if (nowMs - lastAttempt < 30 * 60 * 1000) return { solved: false, reason: 'cooldown', remainingMs: 30 * 60 * 1000 - (nowMs - lastAttempt) };
    challenge.attempts[userId] = nowMs;
    const correct = challenge.aliases.includes(normalizeAnswer(submittedAnswer));
    if (correct) {
      const progress = state.loreProgress[guildId] || (state.loreProgress[guildId] = {});
      progress[storyId] = Math.max(progress[storyId] || 0, (progress[storyId] || 0) + 1);
      challenge.solved = true; challenge.solvedAt = nowMs; challenge.solvedBy = userId;
    }
    save(); return { solved: correct, reason: correct ? 'correct' : 'incorrect', challenge };
  }
  function getPollSchedule(guildId, nowMs = Date.now()) {
    load();
    if (!state.pollSchedules[guildId]) {
      state.pollSchedules[guildId] = { nextDueAt: nowMs + 7 * 24 * 60 * 60 * 1000, lastSentAt: null, channelId: null, history: [], reminderSent: false, exhaustedReminderAt: null, overrideWeek: null };
      save();
    }
    const schedule = state.pollSchedules[guildId];
    if (!Array.isArray(schedule.history)) schedule.history = [];
    if (schedule.nextDueAt === undefined) schedule.nextDueAt = nowMs + 7 * 24 * 60 * 60 * 1000;
    if (schedule.reminderSent === undefined) schedule.reminderSent = false;
    return schedule;
  }
  function markPollReminderSent(guildId) {
    const schedule = getPollSchedule(guildId);
    schedule.reminderSent = true;
    save();
  }
  function markPollExhaustedReminderSent(guildId, nowMs) {
    const schedule = getPollSchedule(guildId, nowMs);
    schedule.exhaustedReminderAt = nowMs;
    save();
  }
  function markPollSent(guildId, pollId, nowMs, channelId, override = false) {
    const schedule = getPollSchedule(guildId, nowMs);
    schedule.history.push({ pollId, usedAt: nowMs });
    schedule.history = schedule.history.filter(item => item.usedAt > nowMs - 366 * 24 * 60 * 60 * 1000);
    schedule.lastSentAt = nowMs;
    schedule.nextDueAt = nowMs + 7 * 24 * 60 * 60 * 1000;
    schedule.channelId = channelId;
    schedule.reminderSent = false;
    schedule.exhaustedReminderAt = null;
    schedule.overrideWeek = Math.floor(nowMs / (7 * 24 * 60 * 60 * 1000));
    save();
  }
  function pollOverrideAvailable(guildId, nowMs) {
    const schedule = getPollSchedule(guildId, nowMs);
    return schedule.overrideWeek !== Math.floor(nowMs / (7 * 24 * 60 * 60 * 1000));
  }
  function pollUsedWithinYear(guildId, pollId, nowMs) {
    const schedule = getPollSchedule(guildId, nowMs);
    return schedule.history.some(item => item.pollId === pollId && item.usedAt > nowMs - 366 * 24 * 60 * 60 * 1000);
  }
  function getOmSchedule(guildId) {
    load();
    if (!state.omSchedules[guildId]) { state.omSchedules[guildId] = { optedIn: [], targetId: null, activatedFor: null, activeUntil: 0, lastSentAt: 0, sentDate: null, sentToday: 0, sentThisActivation: 0, nextSendAt: 0, mode: null, modePoll: null, botherPoll: null, botherAction: null, botherStartedAt: {} }; save(); }
    const schedule = state.omSchedules[guildId];
    if (!Array.isArray(schedule.optedIn)) schedule.optedIn = [];
    if (!schedule.botherStartedAt || typeof schedule.botherStartedAt !== 'object') schedule.botherStartedAt = {};
    return schedule;
  }
  function setOmOptIn(guildId, userId, optedIn) {
    const schedule = getOmSchedule(guildId);
    if (optedIn && !schedule.optedIn.includes(userId)) schedule.optedIn.push(userId);
    if (!optedIn) { schedule.optedIn = schedule.optedIn.filter(id => id !== userId); if (schedule.targetId === userId) { schedule.targetId = null; schedule.botherPoll = null; schedule.botherAction = null; schedule.activeUntil = 0; } }
    save(); return schedule;
  }
  function setOmTarget(guildId, userId) {
    const schedule = getOmSchedule(guildId);
    if (!schedule.optedIn.includes(userId)) return { set: false, reason: 'not-opted-in' };
    schedule.targetId = userId; save(); return { set: true, schedule };
  }
  function clearOmTarget(guildId) { const schedule = getOmSchedule(guildId); schedule.targetId = null; schedule.activeUntil = 0; schedule.botherPoll = null; schedule.botherAction = null; save(); return schedule; }
  function activateOm(guildId, activationKey, nowMs) {
    const schedule = getOmSchedule(guildId);
    if (!schedule.targetId || !schedule.optedIn.includes(schedule.targetId) || schedule.activatedFor === activationKey) return { active: false, schedule };
    schedule.activatedFor = activationKey; schedule.activeUntil = nowMs + 60 * 60 * 1000; schedule.nextSendAt = nowMs + Math.floor(Math.random() * 5 * 60 * 1000); schedule.lastSentAt = 0; schedule.sentDate = null; schedule.sentToday = 0; schedule.sentThisActivation = 0; save(); return { active: true, schedule };
  }
  function recordOmMessage(guildId, nowMs) {
    const schedule = getOmSchedule(guildId);
    if (!schedule.targetId || !schedule.activeUntil || nowMs > schedule.activeUntil) return { sent: false, reason: 'inactive', schedule };
    if (schedule.nextSendAt && nowMs < schedule.nextSendAt) return { sent: false, reason: 'waiting', schedule };
    if (schedule.lastSentAt && nowMs - schedule.lastSentAt < 20 * 60 * 1000) return { sent: false, reason: 'spacing-cap', schedule };
    const date = new Date(nowMs).toISOString().slice(0, 10);
    if (schedule.sentDate !== date) { schedule.sentDate = date; schedule.sentToday = 0; }
    if (schedule.sentToday >= 6) return { sent: false, reason: 'daily-cap', schedule };
    if ((schedule.sentThisActivation || 0) >= 3) { schedule.activeUntil = nowMs; save(); return { sent: false, reason: 'activation-cap', schedule }; }
    schedule.lastSentAt = nowMs; schedule.sentToday += 1; schedule.sentThisActivation = (schedule.sentThisActivation || 0) + 1;
    if (schedule.sentThisActivation >= 3) schedule.activeUntil = nowMs;
    else schedule.nextSendAt = nowMs + 20 * 60 * 1000;
    save(); return { sent: true, targetId: schedule.targetId, mode: schedule.mode, schedule };
  }
  function beginOmModePoll(guildId, activationKey, nowMs, channelId) { const schedule = getOmSchedule(guildId); schedule.modePoll = { activationKey, channelId, endsAt: nowMs + 60 * 60 * 1000, votes: {}, voters: [] }; save(); return schedule.modePoll; }
  function recordOmModeVote(guildId, userId, mode) { const schedule = getOmSchedule(guildId); if (!schedule.modePoll) return { recorded: false, reason: 'not-active' }; if (schedule.modePoll.voters.includes(userId)) return { recorded: false, reason: 'already-voted' }; schedule.modePoll.voters.push(userId); schedule.modePoll.votes[mode] = (schedule.modePoll.votes[mode] || 0) + 1; save(); return { recorded: true }; }
  function finishOmModePoll(guildId, nowMs) { const schedule = getOmSchedule(guildId); if (!schedule.modePoll || nowMs < schedule.modePoll.endsAt) return { finished: false }; const entries = Object.entries(schedule.modePoll.votes); schedule.mode = entries.length ? entries.sort((a, b) => b[1] - a[1])[0][0] : 'water-drop'; schedule.modePoll = null; save(); return { finished: true, mode: schedule.mode }; }
  function beginBotherPoll(guildId, userId, channelId, options, nowMs) {
    const schedule = getOmSchedule(guildId);
    const today = new Date(nowMs).toISOString().slice(0, 10);
    if (!schedule.targetId || !schedule.optedIn.includes(schedule.targetId)) return { started: false, reason: 'target-not-opted-in' };
    if (schedule.botherPoll && schedule.botherPoll.endsAt > nowMs) return { started: false, reason: 'poll-active' };
    if (schedule.botherAction) return { started: false, reason: 'action-active' };
    if (schedule.botherStartedAt[userId] === today) return { started: false, reason: 'daily-limit' };
    schedule.botherStartedAt[userId] = today;
    schedule.botherPoll = { startedBy: userId, channelId, targetId: schedule.targetId, options, startedAt: nowMs, endsAt: nowMs + 5 * 60_000, votes: {}, voters: [] };
    save(); return { started: true, poll: schedule.botherPoll };
  }
  function setBotherPollMessage(guildId, messageId) { const poll = getOmSchedule(guildId).botherPoll; if (!poll) return false; poll.messageId = messageId; save(); return true; }
  function recordBotherVote(guildId, userId, optionId, nowMs) {
    const poll = getOmSchedule(guildId).botherPoll;
    if (!poll || nowMs >= poll.endsAt) return { recorded: false, reason: 'not-active' };
    if (!poll.options.some(option => option.id === optionId)) return { recorded: false, reason: 'invalid-option' };
    if (poll.voters.includes(userId)) return { recorded: false, reason: 'already-voted' };
    poll.voters.push(userId); poll.votes[optionId] = (poll.votes[optionId] || 0) + 1; save(); return { recorded: true };
  }
  function finishBotherPoll(guildId, nowMs) {
    const schedule = getOmSchedule(guildId); const poll = schedule.botherPoll;
    if (!poll || nowMs < poll.endsAt) return { finished: false };
    schedule.botherPoll = null;
    if (!schedule.optedIn.includes(poll.targetId) || schedule.targetId !== poll.targetId) { save(); return { finished: true, cancelled: true }; }
    const highest = Math.max(0, ...poll.options.map(option => poll.votes[option.id] || 0));
    if (!highest) { save(); return { finished: true, noVotes: true }; }
    const winners = poll.options.filter(option => (poll.votes[option.id] || 0) === highest);
    const option = winners[Math.floor(Math.random() * winners.length)];
    schedule.botherAction = { ...option, targetId: poll.targetId, channelId: poll.channelId, sent: 0, nextAt: nowMs };
    save(); return { finished: true, option, action: { ...schedule.botherAction } };
  }
  function recordBotherSend(guildId, nowMs) {
    const schedule = getOmSchedule(guildId); const action = schedule.botherAction;
    if (!action || nowMs < action.nextAt) return { sent: false };
    if (!schedule.optedIn.includes(action.targetId) || schedule.targetId !== action.targetId) { schedule.botherAction = null; save(); return { sent: false, cancelled: true }; }
    action.sent += 1;
    const complete = action.sent >= action.count;
    const sentAction = { ...action };
    if (complete) schedule.botherAction = null;
    else action.nextAt = nowMs + 60 * 60_000;
    save(); return { sent: true, action: sentAction, complete };
  }
  function closeBotherPoll(guildId) { const schedule = getOmSchedule(guildId); schedule.botherPoll = null; schedule.botherAction = null; save(); return schedule; }
  return { pilot, getPilotJobs, ackPilotJob, pilotQuiet, getOrCreate, hasProfile, claimDaily, claimFrogQuote, startTrivia, answerTrivia, buyCollectible, createTradeOffer, settleTrade, pendingTrades, listProfiles, setLeaderboardPrivacy, setPrivacy, equipCollectible, craftCollectible, createRace, joinRace, startRace, answerRace, cancelRace, getRace, expireRaces, getOperationalStatus, createReport, listReports, updateReport, getCampResources, addCampCourse, removeCampCourse, addCampInstructor, removeCampInstructor, exportCampResources, importCampResources, isCampInstructor, addCampTriviaQuestion, listCampTriviaQuestions, removeCampTriviaQuestion, answerCampTrivia, createLoreSubmission, listLoreSubmissions, updateLoreSubmission, getLoreProgress, startLoreDiscussion, joinLoreDiscussion, startLoreChallenge, answerLoreChallenge, getPollSchedule, markPollReminderSent, markPollExhaustedReminderSent, markPollSent, pollOverrideAvailable, pollUsedWithinYear, getOmSchedule, setOmOptIn, setOmTarget, clearOmTarget, activateOm, recordOmMessage, beginOmModePoll, recordOmModeVote, finishOmModePoll, beginBotherPoll, setBotherPollMessage, recordBotherVote, finishBotherPoll, recordBotherSend, closeBotherPoll };
}

export const store = createStore();
