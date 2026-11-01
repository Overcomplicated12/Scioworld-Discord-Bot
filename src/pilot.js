// Pure, synchronous season operations. The store commits state + rewards in one atomic write.
export const DAY = 86_400_000;
export class PilotError extends Error {}
const requireThat = (condition, message) => { if (!condition) throw new PilotError(message); };
const unique = list => new Set(list).size;
const inSeason = (s, at) => at >= s.start && at < s.end;
export function validatePilot(config) {
  requireThat(config && /^[a-z0-9-]{1,32}$/.test(config.id), 'Use a short lowercase season ID.');
  requireThat(typeof config.name === 'string' && config.name.length > 0 && config.name.length <= 80, 'Season name must be 1–80 characters.');
  try { new Intl.DateTimeFormat('en', { timeZone: config.timezone }).format(); } catch { throw new PilotError('Set a valid timezone.'); }
  requireThat(Number.isInteger(config.durationDays) && config.durationDays >= 1 && config.durationDays <= 366, 'Season duration must be 1–366 days.');
  requireThat(Number.isInteger(config.threshold) && config.threshold > 0 && config.threshold <= 100, 'Stamp threshold must be 1–100.');
  requireThat(typeof config.simulation === 'boolean' && Number.isInteger(config.inventory) && config.inventory >= 0, 'Set simulation and nonnegative inventory.');
  requireThat(typeof config.sticker === 'string' && config.sticker.length > 0 && config.sticker.length <= 100, 'Set a short sticker name.');
  requireThat(typeof config.eligibility === 'string' && config.eligibility.length > 0 && config.eligibility.length <= 1000, 'Set eligibility rules (up to 1000 characters).');
  for (const key of ['answer', 'correct', 'discussion', 'lore']) for (const field of ['stamps', 'coins', 'kp']) {
    const value = config.rewards?.[key]?.[field];
    requireThat(Number.isInteger(value) && value >= 0 && value <= 1000, `Invalid ${key} ${field} reward.`);
  }
  requireThat(config.rewards.correct.stamps === 0, 'Correctness bonuses cannot give stamps.');
  requireThat(Array.isArray(config.activities) && config.activities.length > 0 && config.activities.length <= 52, 'Provide 1–52 activities.');
  let previousClose = -1;
  const ids = new Set();
  for (const a of config.activities) {
    requireThat(/^[a-z0-9-]{1,32}$/.test(a.id) && !ids.has(a.id), 'Activity IDs must be unique and short.'); ids.add(a.id);
    requireThat(['prediction', 'truths', 'discussion'].includes(a.format), 'Unknown activity format.');
    requireThat(Number.isFinite(a.openDay) && Number.isFinite(a.closeDay) && a.openDay >= previousClose && a.closeDay > a.openDay && a.closeDay <= config.durationDays, 'Activities must be ordered, nonoverlapping, and inside the season.'); previousClose = a.closeDay;
    requireThat(typeof a.prompt === 'string' && a.prompt.length > 0 && a.prompt.length <= 700, 'Activity prompts must be 1–700 characters.');
    requireThat(Array.isArray(a.choices) && a.choices.length >= 2 && a.choices.length <= 4 && a.choices.every(x => typeof x === 'string' && x.length > 0 && x.length <= 80), 'Provide 2–4 short choices.');
    requireThat(a.format !== 'truths' || a.choices.length === 3, 'Two Truths needs exactly three statements.');
    requireThat(Array.isArray(a.explanations) && a.explanations.length === a.choices.length && a.explanations.every(x => typeof x === 'string' && x.length > 0 && x.length <= 250), 'Explain every choice in 1–250 characters.');
    if (a.format !== 'discussion') requireThat(Number.isInteger(a.correct) && a.correct >= 0 && a.correct < a.choices.length && /^https:\/\//.test(a.source), 'Factual questions need a correct answer and an HTTPS source.');
    else requireThat(a.correct === undefined, 'Opinion questions cannot have a correct answer.');
  }
  return config;
}

function award(state, s, userId, source, kind, now, occurredAt = now) {
  if (s.ledger.some(e => e.userId === userId && e.source === source)) return false;
  const reward = s.rewards[kind];
  const p = state.profiles[`${s.guildId}:${userId}`];
  requireThat(p, 'Use /start first.');
  s.ledger.push({ userId, source, kind, ...reward, at: now, occurredAt });
  // Simulation has its own ledger but never changes real balances or inventory.
  if (!s.simulation) { p.coins += reward.coins; p.knowledgePoints += reward.kp; }
  return true;
}
const stamps = (s, userId) => s.ledger.filter(e => e.userId === userId).reduce((n, e) => n + e.stamps, 0);
function settle(state, s, a, now) {
  if (a.closed) return;
  a.closed = true;
  for (const answer of s.answers.filter(x => x.activityId === a.id)) {
    if (a.format !== 'discussion' && answer.choice === a.correct) award(state, s, answer.userId, `correct:${a.id}`, 'correct', now, answer.at);
  }
}
function advance(state, s, now) {
  if (s.status === 'draft') return;
  for (const a of s.activities) if (now >= a.closesAt) settle(state, s, a, now);
  if (now >= s.end) s.status = 'closed';
}
function publicActivity(a, now) {
  const { correct, explanations, source, ...visible } = a;
  return now >= a.closesAt ? { ...visible, correct, explanations, source } : visible;
}
function passport(s, userId, now) {
  const earned = stamps(s, userId);
  return { id: s.id, name: s.name, start: s.start, end: s.end, timezone: s.timezone, status: s.status, simulation: s.simulation, sticker: s.sticker, eligibility: s.eligibility, threshold: s.threshold, stamps: earned, qualified: earned >= s.threshold, claim: s.claims.find(c => c.userId === userId), completed: s.ledger.filter(e => e.userId === userId && e.stamps > 0).map(e => e.source), remaining: s.activities.filter(a => a.closesAt > now).map(a => ({ id: a.id, closesAt: a.closesAt, answered: s.answers.some(x => x.activityId === a.id && x.userId === userId), discussed: s.discussions.some(x => x.activityId === a.id && x.userId === userId && x.status === 'approved') })), loreAvailable: !s.ledger.some(e => e.userId === userId && e.kind === 'lore'), claimsOpen: s.claimsOpen };
}
export function pilotReport(state, s) {
  const meaning = s.ledger.filter(e => ['answer', 'discussion', 'lore'].includes(e.kind));
  const week = n => new Set(meaning.filter(e => e.occurredAt >= s.start + n * 7 * DAY && e.occurredAt < Math.min(s.end, s.start + (n + 1) * 7 * DAY)).map(e => e.userId));
  const w1 = week(0), w2 = week(1), returned = [...w1].filter(id => w2.has(id)).length;
  const active = unique(meaning.map(e => e.userId));
  const people = [...new Set(s.ledger.map(e => e.userId))];
  const lore = (state.loreSubmissions || []).filter(x => x.guildId === s.guildId && inSeason(s, Date.parse(x.createdAt)));
  return {
    season: s.id, simulation: s.simulation,
    newProfiles: Object.values(state.profiles).filter(p => p.guildId === s.guildId && inSeason(s, Date.parse(p.createdAt))).length,
    weeklyParticipants: unique(s.answers.map(x => x.userId)), participantsByActivity: Object.fromEntries(s.activities.map(a => [a.id, unique(s.answers.filter(x => x.activityId === a.id).map(x => x.userId))])),
    week1: w1.size, week2: w2.size, returning: returned, retentionPercent: w1.size ? Math.round(returned / w1.size * 1000) / 10 : null,
    activeParticipants: active, discussions: s.discussions.length, approvedDiscussions: s.discussions.filter(x => x.status === 'approved').length,
    discussionApprovalPercent: s.discussions.length ? Math.round(s.discussions.filter(x => x.status === 'approved').length / s.discussions.length * 1000) / 10 : null,
    discussionParticipantPercent: active ? Math.round(unique(s.discussions.filter(x => meaning.some(e => e.userId === x.userId)).map(x => x.userId)) / active * 1000) / 10 : null,
    loreSubmissions: lore.length, publishedLore: lore.filter(x => x.status === 'approved').length, rewardedLore: s.ledger.filter(e => e.kind === 'lore').length,
    earningStamps: people.filter(id => stamps(s, id) > 0).length, qualified: people.filter(id => stamps(s, id) >= s.threshold).length,
    claims: s.claims.length, fulfilled: s.claims.filter(c => c.status === 'fulfilled').length,
    pendingReviews: s.discussions.filter(x => x.status === 'pending').length + s.claims.filter(c => c.status === 'pending').length,
    reviewActions: s.reviews.length, optOuts: s.optOuts.length, feedback: s.feedback.length,
    reports: (state.reports || []).filter(x => x.guildId === s.guildId && inSeason(s, Date.parse(x.createdAt))).length,
  };
}
const ADMIN = new Set(['create', 'activate', 'quiet', 'publish', 'close', 'review', 'queue', 'reward-lore', 'claims-open', 'claim-review', 'report', 'status']);
export function runPilot(state, guildId, userId, action, args = {}, now = Date.now(), canManage = false) {
  requireThat(guildId && Number.isFinite(now), 'Run this inside a server.');
  if (ADMIN.has(action)) requireThat(canManage, 'Only the server owner or administrators can manage the pilot.');
  state.pilot ??= { seasons: [], quietGuilds: [] };
  const db = state.pilot;
  if (action === 'create') {
    const c = structuredClone(validatePilot(args.config));
    requireThat(!db.seasons.some(s => s.guildId === guildId && s.id === c.id), 'That season ID already exists.');
    requireThat(typeof args.start === 'string' && /(?:Z|[+-]\d\d:\d\d)$/.test(args.start) && Number.isFinite(Date.parse(args.start)), 'Provide an ISO start timestamp with timezone offset.');
    const start = Date.parse(args.start);
    const s = { ...c, guildId, channelId: args.channelId, start, end: start + c.durationDays * DAY, status: 'draft', claimsOpen: false, activities: c.activities.map(a => ({ ...a, opensAt: start + a.openDay * DAY, closesAt: start + a.closeDay * DAY })), answers: [], discussions: [], ledger: [], claims: [], reviews: [], notifications: [], optOuts: [], feedback: [] };
    requireThat(s.channelId, 'Choose the activity channel.'); db.seasons.push(s); return { id: s.id, status: s.status, start: s.start, end: s.end, simulation: s.simulation };
  }
  if (action === 'quiet') {
    requireThat(typeof args.enabled === 'boolean', 'Set quiet mode true or false.');
    db.quietGuilds = db.quietGuilds.filter(id => id !== guildId); if (args.enabled) db.quietGuilds.push(guildId);
    return { quiet: args.enabled };
  }
  if (action === 'is-quiet') return db.quietGuilds.includes(guildId);
  if (action === 'history') return db.seasons.filter(s => s.guildId === guildId).map(s => passport(s, userId, now));
  const s = args.season ? db.seasons.find(s => s.guildId === guildId && s.id === args.season) : [...db.seasons].reverse().find(s => s.guildId === guildId && s.status === 'active') || [...db.seasons].reverse().find(s => s.guildId === guildId);
  requireThat(s, 'No season yet. An administrator can create the draft with /pilot create.');
  advance(state, s, now);
  if (action === 'activate') {
    requireThat(s.status === 'draft' && now < s.end, 'Only an unexpired draft can be activated.');
    requireThat(!db.seasons.some(x => x.guildId === guildId && x.id !== s.id && x.status === 'active' && x.end > now), 'Another season is active.');
    s.status = 'active'; return { status: s.status, simulation: s.simulation };
  }
  if (action === 'status') return { id: s.id, status: s.status, simulation: s.simulation, start: s.start, end: s.end, quiet: db.quietGuilds.includes(guildId), claimsOpen: s.claimsOpen, inventory: s.inventory, eligibility: s.eligibility, activities: s.activities.map(a => ({ id: a.id, opensAt: a.opensAt, closesAt: a.closesAt, posted: Boolean(a.messageId), closed: Boolean(a.closed) })) };
  if (action === 'passport') return passport(s, userId, now);
  if (action === 'report') return pilotReport(state, s);
  if (action === 'queue') return { discussions: s.discussions.filter(d => d.status === 'pending'), claims: s.claims.filter(c => c.status === 'pending'), feedback: s.feedback.slice(-10) };
  if (action === 'opt-out') {
    s.optOuts = s.optOuts.filter(id => id !== userId); if (args.enabled) s.optOuts.push(userId); return { optedOut: Boolean(args.enabled) };
  }
  if (action === 'feedback') {
    requireThat(typeof args.text === 'string' && args.text.trim().length > 0 && args.text.length <= 1000, 'Feedback must be 1–1000 characters.');
    requireThat(!s.feedback.some(f => f.userId === userId), 'You already sent feedback for this season.');
    s.feedback.push({ userId, text: args.text.trim(), at: now }); return { saved: true };
  }
  if (action === 'claims-open') {
    requireThat(s.status !== 'draft', 'Activate the season first.');
    requireThat(s.simulation || (s.inventory > 0 && args.policyMessageUrl?.startsWith(`https://discord.com/channels/${guildId}/`)), 'Real claims need inventory and a link to the published eligibility/capacity policy.');
    s.claimsOpen = true; s.policyMessageUrl = args.policyMessageUrl; return { claimsOpen: true, simulation: s.simulation };
  }
  if (action === 'claim') {
    requireThat(s.claimsOpen && stamps(s, userId) >= s.threshold, 'Claims must be open and you must qualify first.');
    let claim = s.claims.find(c => c.userId === userId);
    if (!claim) { claim = { userId, status: 'pending', at: now, simulation: s.simulation }; s.claims.push(claim); }
    return claim;
  }
  if (action === 'claim-review') {
    const c = s.claims.find(c => c.userId === args.userId); requireThat(c, 'Claim not found.');
    requireThat(['approved', 'rejected', 'fulfilled'].includes(args.decision), 'Choose approved, rejected, or fulfilled.');
    if (c.status === args.decision) return c;
    requireThat((c.status === 'pending' && ['approved', 'rejected'].includes(args.decision)) || (c.status === 'approved' && ['fulfilled', 'rejected'].includes(args.decision)), 'That claim cannot make this transition.');
    requireThat(args.reason?.trim() && args.reason.length <= 500, 'Provide a short review reason.');
    if (args.decision === 'approved' && !s.simulation) requireThat(s.claims.filter(x => ['approved', 'fulfilled'].includes(x.status)).length < s.inventory, 'All inventory is reserved. Leave this claim pending while organizers resolve capacity fairly.');
    c.status = args.decision; c.reason = args.reason; c.reviewedAt = now; c.reviewer = userId;
    s.reviews.push({ kind: 'claim', userId: c.userId, reviewer: userId, at: now, decision: c.status });
    if (c.status === 'fulfilled' && !s.simulation) {
      const p = state.profiles[`${guildId}:${c.userId}`]; p.seasonStickers ??= [];
      if (!p.seasonStickers.some(x => x.season === s.id)) p.seasonStickers.push({ season: s.id, name: s.sticker, at: now });
    }
    return c;
  }
  if (action === 'reward-lore') {
    requireThat(s.status !== 'draft', 'Activate the season first.');
    const l = state.loreSubmissions.find(x => x.guildId === guildId && x.id === args.submissionId);
    requireThat(l && inSeason(s, Date.parse(l.createdAt)), 'Lore must have been submitted during this season.');
    requireThat(!s.optOuts.includes(l.authorId), 'This student opted out of the pilot.');
    requireThat(args.reason?.trim() && args.reason.length <= 500, 'Explain why this original contribution qualifies.');
    const awarded = award(state, s, l.authorId, 'lore', 'lore', now, Date.parse(l.createdAt));
    if (awarded) s.reviews.push({ kind: 'lore', submissionId: l.id, reviewer: userId, reason: args.reason, at: now });
    return { awarded, userId: l.authorId };
  }
  if (action === 'review') {
    const d = s.discussions.find(d => d.id === args.id); requireThat(d, 'Discussion not found.');
    requireThat(['approved', 'revision', 'rejected'].includes(args.decision), 'Choose approved, revision, or rejected.');
    if (d.status === args.decision) return d;
    requireThat(d.status === 'pending', 'Only pending discussions can be reviewed.');
    requireThat(args.reason?.trim() && args.reason.length <= 500, 'Provide short private feedback.');
    requireThat(!s.optOuts.includes(d.userId), 'This student opted out.');
    d.status = args.decision; d.reason = args.reason; d.reviewer = userId; d.reviewedAt = now;
    s.reviews.push({ kind: 'discussion', id: d.id, reviewer: userId, at: now, decision: d.status });
    if (d.status === 'approved') award(state, s, d.userId, `discussion:${d.activityId}`, 'discussion', now, d.at);
    return d;
  }
  const a = args.activity ? s.activities.find(a => a.id === args.activity) : s.activities.find(a => now >= a.opensAt && now < a.closesAt) || [...s.activities].reverse().find(a => now >= a.closesAt);
  requireThat(a, 'No weekly activity is available yet.');
  if (action === 'weekly') {
    requireThat(s.status !== 'draft', 'The season is still a draft.');
    return { season: s.id, simulation: s.simulation, activity: publicActivity(a, now), answer: s.answers.find(x => x.activityId === a.id && x.userId === userId), discussion: s.discussions.find(x => x.activityId === a.id && x.userId === userId), distribution: now >= a.closesAt ? a.choices.map((_, i) => s.answers.filter(x => x.activityId === a.id && x.choice === i).length) : undefined };
  }
  if (action === 'publish') {
    requireThat(s.status === 'active' && inSeason(s, now) && !a.closed && now < a.closesAt, 'Only an upcoming or open activity in an active season can be published.');
    requireThat(!s.activities.some(x => x.id !== a.id && now >= x.opensAt && now < x.closesAt), 'Another activity is open.');
    a.opensAt = now; return { published: true };
  }
  if (action === 'close') {
    requireThat(s.status !== 'draft' && now >= a.opensAt, 'That activity has not opened.');
    a.closesAt = Math.min(a.closesAt, now); settle(state, s, a, now); return { closed: true };
  }
  requireThat(state.profiles[`${guildId}:${userId}`], 'Use /start first.');
  requireThat(!s.optOuts.includes(userId), 'You opted out. Use /passport opt-out enabled:false to participate again.');
  requireThat(s.status === 'active' && inSeason(s, now), 'This season is not accepting submissions.');
  if (action === 'answer') {
    requireThat(now >= a.opensAt && now < a.closesAt && !a.closed, 'Answer submissions have closed or have not opened.');
    requireThat(Number.isInteger(args.choice) && args.choice >= 0 && args.choice < a.choices.length, 'Choose one of the listed answers.');
    let answer = s.answers.find(x => x.userId === userId && x.activityId === a.id);
    if (!answer) { answer = { userId, activityId: a.id, at: now }; s.answers.push(answer); }
    answer.choice = args.choice; answer.updatedAt = now;
    award(state, s, userId, `answer:${a.id}`, 'answer', now, answer.at);
    return { saved: true, choice: a.choices[args.choice], qualified: stamps(s, userId) >= s.threshold };
  }
  if (action === 'discuss') {
    requireThat(now >= a.opensAt, 'This activity has not opened.');
    requireThat(typeof args.text === 'string' && args.text.trim().length > 0 && args.text.length <= 1000, 'Explain your reasoning in 1–1000 characters.');
    let d = s.discussions.find(x => x.userId === userId && x.activityId === a.id);
    requireThat(!d || d.status === 'revision', 'You already submitted for this activity. Check /weekly for feedback.');
    if (!d) { d = { id: `D${s.discussions.length + 1}`, userId, activityId: a.id, at: now }; s.discussions.push(d); }
    d.text = args.text.trim(); d.status = 'pending'; d.updatedAt = now; delete d.reason;
    return { saved: true, id: d.id };
  }
  throw new PilotError('Unknown pilot action.');
}

// Durable work list: replies never expose correct answers until their deadline.
export function pilotJobs(state, guildId, now) {
  const jobs = [];
  for (const s of state.pilot?.seasons || []) {
    if (s.guildId !== guildId || s.status === 'draft') continue;
    advance(state, s, now);
    if (state.pilot.quietGuilds.includes(guildId)) continue;
    for (const a of s.activities) {
      if (now < a.opensAt) continue;
      const revealed = now >= a.closesAt;
      if (!revealed && a.messageId || revealed && a.revealed) continue;
      jobs.push({ kind: 'activity', season: s.id, channelId: s.channelId, activity: publicActivity(a, now), revealed, simulation: s.simulation, distribution: revealed ? a.choices.map((_, i) => s.answers.filter(x => x.activityId === a.id && x.choice === i).length) : undefined });
    }
    for (const userId of new Set(s.ledger.map(e => e.userId))) if (stamps(s, userId) >= s.threshold && !s.notifications.includes(userId) && !s.optOuts.includes(userId)) jobs.push({ kind: 'qualified', season: s.id, userId, simulation: s.simulation });
  }
  return jobs;
}
export function acknowledgePilotJob(state, guildId, job, messageId) {
  const s = state.pilot?.seasons.find(s => s.guildId === guildId && s.id === job.season);
  if (!s) return;
  if (job.kind === 'qualified') { if (!s.notifications.includes(job.userId)) s.notifications.push(job.userId); return; }
  const a = s.activities.find(a => a.id === job.activity.id);
  if (a) { a.messageId = messageId; if (job.revealed) a.revealed = true; }
}
