# ScioVirtual Discord Bot: game design

## Goal

ScioCulture is a social layer for ScioVirtual. It turns the questions, jokes, camp knowledge, and stories already in the community into short activities people can join when they are already in Discord. It is a lightweight community experiment, not a replacement for Roblox, a standalone RPG, or an obligation to check in every day.

The bot’s promise is simple: **participate, learn something, make the community more fun, and leave a little lore behind.** There are no bets, gambling mechanics, paid random draws, or currency cash-out. Seasonal physical sticker eligibility is handled separately through organizer review.

## Product story

ScioCulture helps a community tell its own story. A member can answer a question, teach a course fact, vote on a strange prompt, race a friend, collect a cosmetic artifact, or contribute a lore chapter. The bot connects those small actions to shared recognition: explanations, titles, story entries, course sets, and collectibles that refer back to ScioVirtual culture.

The engagement loop is **notice → participate → understand → contribute → return**. Returning should be attractive because there is new community content, not because missing a day causes a loss.

## Current pilot loop

1. `/start`, then `/question`: answer one optional science activity each day.
2. Optionally explain a prediction or contribute original lore for human review.
3. `/passport view`: see Contribution Stamps and eligibility for one seasonal sticker claim.
4. Organizers review claims and handle mailing externally. Simulation issues no real merchandise.
5. Return for the next question and explanation; there is no daily attendance requirement.

See [PILOT.md](PILOT.md) for the implemented two-week schedule, exact reward amounts, moderation, claims, and reporting. It supersedes the original daily-game progression plan below. Existing games and cosmetics remain optional side activities. Physical stickers cannot be purchased using Sciocoins or KP.

## Currencies and resources

Keep the first version small:

| Item | Earned from | Used for |
| --- | --- | --- |
| **Sciocoins** | Correct answers, activities, daily bonus | Basic shop items, crafting, and trades |
| **Knowledge points** | Answering questions, especially new categories | Levels, titles, leaderboard recognition |
| **Camp resources** | Minigames and camp integration | Existing digital recipes only |
| **Collectibles** | Shop purchases, crafting, and events | Profile display, badges, set completion |
| **Om challenge access** | Explicit opt-in and weekly style poll | Harmless fictional DM challenges with strict caps |

Sciocoins are fictional and have no cash value. Do not sell them, allow cash-out, or make spending money or wagers part of the game.

Suggested starting balance: 100 Sciocoins, one starter collectible, and a small amount of camp resources. A new player should be able to try every core feature without grinding first.

## Commands for the first playable release

### Menu and guidance

- `/start` — create a profile and explain the loop.
- `/help [topic]` — show commands or explain economy, minigames, collectibles, or etiquette.
- `/profile [player]` — show level, title, streak, and selected collectible.
- `/inventory` — show currencies, resources, and collectibles.
- `/leaderboard [knowledge points|Sciocoins|daily streak]` — friendly public rankings.
- `/privacy scope:leaderboard|recognition|camp hide:true|false` — control leaderboard visibility, public profile recognition, or camp feature participation.

### Earning

- `/daily` — once per day, award a small bonus and a rotating Sciovirtual fact.
- `/frog` — if the player owns the Frog of Wisdom, reveal a philosopher quote; use a per-player cooldown to prevent spam.
- `/lore [action] [query]` — reveal a random community story, list stories, or search contributed entries.
- `/lore action:submit title:<title> query:<story text>` — submit a student-created story for review.
- `/lore action:solve story:<story id>` — get and solve the key clue for the next story chapter.
- `/lore action:progress` — see the server’s chapter progress.
- `/trivia [category]` — start a short question for the channel or an ephemeral solo question.
- `/race create [category]` — open a friendly time-limited race.
- `/race join` — join an open race.
- `/race answer` — answer the current question through a button or modal where possible.
- `/camp-trivia ask` — answer a course-specific question created by an instructor.

### Spending and collecting

- `/shop` — show the current rotating shop.
- `/craft [recipe]` — exchange resources for a known item.
- `/equip [collectible]` — display a collectible on the profile.
- `/trade offer|accept|decline|cancel|list` — exchange collectibles and Sciocoins with explicit confirmation from both players.
- `/sets` — view progress toward collectible sets.

### Camp, moderation, and scheduled community features

- `/camp-resources` — show instructors for courses matching the player’s Discord roles.
- `/camp-course add|remove` — owner/admin management of course categories and linked roles.
- `/camp-instructor add|remove` — owner/admin management of course instructors.
- `/camp-trivia add|list|remove` — instructors manage question sets for their own courses; administrators can manage all sets.
- `/poll status` — view the next weekly poll and its reminder schedule.
- `/poll early|override` — owner/admin controls for the weekly poll, limited to one override per week.
- `/report` — submit a private report; moderators and the server owner receive a DM, with anti-spam limits.
- `/lore-review list|approve|reject` — moderators review student lore before it enters the public archive.
- `/torture-om opt-in|opt-out|status` — manage consent for the harmless fictional Om challenge.
- `/torture-om poll [duration]` — owner/admin-only vote for the next harmless Om method; the duration defaults to five minutes.
- `/torture-om target|stop` — owner/admin controls for an opted-in target.
- `/om-test` — temporary owner/admin test for the one-minute consent flow.

The implemented foundation includes profiles, trivia, daily rewards with rotating facts, collectibles, crafting, trading, races, leaderboards, polls, camp resources, reports, lore, and the consent-based Om challenge.

Lore uses clue-solving rather than a daily grind. Each story begins with one available entry. The next chapter provides a key clue; players can discuss possible answers, but only a correct answer unlocks it. Wrong attempts have a cooldown, clues grant no currency, and each chapter can be unlocked only once per server.

## Race minigame

The race is a social event with no wagering:

1. A player creates a race with a topic.
2. Other players join before the lobby closes.
3. The bot posts one question at a time. Players answer with buttons or a short response; the first correct answer gets a point.
4. After three questions, the highest score wins. Ties receive a friendly rematch invitation.
5. The bot announces the result and gives a positive sportsmanship message.

Guardrails:

- Discord IDs cannot join the same race twice; organizers handle suspected alternate-account abuse;
- answers are accepted only during the active question and are rate-limited;
- the host or a moderator can cancel before the first question;
- hosts or moderators can cancel a lobby or active race when a player disconnects;
- harassment, spam, answer flooding, and targeting another player are not part of the game.

## Collectibles

Use a shop and crafting collection tied to Sciovirtual culture. Examples include the Frog of Wisdom, fictional camp artifacts, stickers, scientist badges, and lore references. Each item should have:

- a name and one-sentence story;
- a rarity (common, uncommon, rare, legendary);
- a profile display or set-bonus purpose;
- a duplicate policy, such as conversion into crafting dust or a small refund.

Keep rewards cosmetic or modest. A rare item can be memorable, part of a set, or grant a small temporary bonus such as a discount. Avoid permanent advantages.

## Culture and safety rules

The bot should make the community friendlier by design:

- Give credit for participation, learning, helping, and good sportsmanship.
- Use opt-in public games; keep solo questions private when possible.
- Let players hide their profile or leaderboard entry if they want.
- Keep a simple `/report` or moderator-only review path for abusive names, custom content, or spam.
- Never require real money, personal information, or public embarrassment to progress.
- Use a cooldown and daily limits so the bot does not dominate the channel.
- Keep question sources and accepted answers reviewable by the organizers.

## Data needed for the MVP

Persist one profile per Discord user and server:

```text
profile: user_id, guild_id, coins, knowledge_points, streak, last_daily_at,
         resources, collectibles, equipped_collectible, frog_last_used_at,
         frog_quote_history, created_at
race: id, guild_id, host_id, category, players, questions, scores,
      state, created_at, closes_at
question: id, category, prompt, answers, explanation, difficulty, active
item: id, name, rarity, description, source, tradeable
```

The current foundation uses a local JSON profile store with regular backups. Pilot rewards and balances share one synchronous atomic JSON write; SQLite is deferred while hosting uses one process. Keep the game logic independent from Discord and from external camp/Torture Om integrations so either integration can be disabled without losing profiles.

## Integration plan

### Camp resources

Start with an adapter that can read the camp resource catalog and write only approved rewards. Cache the catalog, validate item IDs, and fall back to a local reward table if the service is unavailable. Do not let an external outage block trivia or profile commands.

### Om challenge

Keep this fictional, harmless, and opt-in. The weekly poll chooses a message style, and a selected target receives at most three DMs spaced about 20 minutes apart. `/torture-om opt-out` and the admin stop command end participation immediately. No collectible or wager changes these limits.

`/bother-om start` is a separate, consent-gated five-minute community vote. It only works after an administrator selects an opted-in target. The selected option sends no more than 11 harmless pings or DMs, spaced one hour apart. Opting out or an admin stop cancels pending sends immediately.

## Success criteria

The first release is ready when:

- a new player can start, answer a question, inspect inventory, and receive a reward;
- two or more players can complete a race with deterministic scoring;
- balances and collectibles survive a bot restart;
- commands have cooldowns and invalid input does not crash the bot;
- organizers can add questions, items, and lore without changing game logic;
- the bot has been tested in the testing server and behaves politely in a busy channel.

## Week plan

| Day | Deliverable |
| --- | --- |
| Monday | Repository and testing server complete. Design document and command list are maintained here. |
| Tuesday | Implement `/start`, `/help`, `/profile`, `/inventory`, `/daily`, and persistent profiles. |
| Wednesday | Add trivia, rewards, the basic economy, and the first collectible set. |
| Thursday | Add race lobbies, leaderboards, cooldowns, moderation controls, and friendly social features. |
| Friday | Add the local camp resource adapter and the consent-based Om challenge behind weekly scheduling and caps. |
| Saturday | Run syntax, content, workflow, persistence, duplicate-reward, permission, and channel checks; polish copy. |
| Sunday | Run a clean deployment test, verify commands in Discord, back up data, and prepare the submission demo. |

If time gets tight, keep trivia, profiles, inventory, daily rewards, and collectibles as the submission MVP. Races and external integrations can be marked as the next milestone without weakening the core cultural experience.
