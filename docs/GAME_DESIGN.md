# ScioVirtual Discord Bot: game design

## Goal

The bot should make ScioVirtual culture easier to participate in when people are already hanging out in Discord. It is a lightweight social game, not a replacement for Roblox or a large standalone RPG. The best outcome is a busy channel where people learn small science facts, recognize shared jokes and lore, compete kindly, and have a reason to return tomorrow.

## Why play?

The bot's advantage is that it lives in the community's conversation:

- **Instant social play:** a round takes seconds to join and is visible to everyone in the channel.
- **Shared culture:** questions, item names, titles, and rewards refer to Sciovirtual, camp memories, and recurring jokes.
- **Friendly status:** players can collect badges, earn titles, build a streak, and appear on a weekly leaderboard without needing to be the best at a large game.
- **Small, repeatable goals:** there is always one more daily question, item, recipe, or rematch.
- **Recognition:** rare collectibles and cosmetic titles give people something to show off and talk about.

The game should reward showing up and helping the community as much as winning.

## Core player loop

1. A player uses `/start` and receives a short welcome and starter inventory.
2. They use `/daily`, `/frog`, `/trivia`, or join `/race` to earn **Sciocoins** and knowledge.
3. They spend resources on crafting, saving, trading, or cosmetic collectibles.
4. They use `/inventory`, `/profile`, and `/leaderboard` to see progress.
5. They return for a daily bonus, a new question set, an event, or a rematch with friends.

Every action should produce a clear result in one Discord message. A player should be able to understand the first loop in under two minutes.

## Currencies and resources

Keep the first version small:

| Item | Earned from | Used for |
| --- | --- | --- |
| **Sciocoins** | Correct answers, activities, daily bonus | Basic shop items, crafting, and trades |
| **Knowledge points** | Answering questions, especially new categories | Levels, titles, leaderboard recognition |
| **Camp resources** | Minigames and camp integration | Recipes, discounts, or camp-specific rewards |
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
- `/privacy` — hide or show your leaderboard entry.

### Earning

- `/daily` — once per day, award a small bonus and a rotating Sciovirtual fact.
- `/frog` — if the player owns the Frog of Wisdom, reveal a philosopher quote; use a per-player cooldown to prevent spam.
- `/lore [action] [query]` — reveal a random community story, list stories, or search contributed entries.
- `/trivia [category]` — start a short question for the channel or an ephemeral solo question.
- `/race create [category]` — open a friendly time-limited race.
- `/race join` — join an open race.
- `/race answer` — answer the current question through a button or modal where possible.

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
- `/poll status` — view the next weekly poll and its reminder schedule.
- `/poll early|override` — owner/admin controls for the weekly poll, limited to one override per week.
- `/report` — submit a private report; moderators and the server owner receive a DM, with anti-spam limits.
- `/om opt-in|opt-out|status` — manage consent for the harmless fictional Om challenge.
- `/om target|stop` — owner/admin controls for an opted-in target.
- `/om-test` — temporary owner/admin test for the one-minute consent flow.

The implemented foundation includes profiles, trivia, daily rewards with rotating facts, collectibles, crafting, trading, races, leaderboards, polls, camp resources, reports, lore, and the consent-based Om challenge.

## Race minigame

The race is a social event with no wagering:

1. A player creates a race with a topic.
2. Other players join before the lobby closes.
3. The bot posts one question at a time. Players answer with buttons or a short response; the first correct answer gets a point.
4. After three questions, the highest score wins. Ties receive a friendly rematch invitation.
5. The bot announces the result and gives a positive sportsmanship message.

Guardrails:

- no player can join their own race with multiple accounts;
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

The current foundation uses a local JSON profile store with regular backups. Move to SQLite when races and larger inventories need transactions. Keep the game logic independent from Discord and from external camp/Torture Om integrations so either integration can be disabled without losing profiles.

## Integration plan

### Camp resources

Start with an adapter that can read the camp resource catalog and write only approved rewards. Cache the catalog, validate item IDs, and fall back to a local reward table if the service is unavailable. Do not let an external outage block trivia or profile commands.

### Om challenge

Keep this fictional, harmless, and opt-in. The weekly poll chooses a message style, and a selected target receives at most three DMs spaced about 20 minutes apart. `/om opt-out` and the admin stop command end participation immediately. No collectible or wager changes these limits.

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
