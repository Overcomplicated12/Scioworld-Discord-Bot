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
3. They spend resources on crafting, saving, trading, or a cosmetic collectible draw.
4. They use `/inventory`, `/profile`, and `/leaderboard` to see progress.
5. They return for a daily bonus, a new question set, an event, or a rematch with friends.

Every action should produce a clear result in one Discord message. A player should be able to understand the first loop in under two minutes.

## Currencies and resources

Keep the first version small:

| Item | Earned from | Used for |
| --- | --- | --- |
| **Sciocoins** | Correct answers, race wins, daily bonus | Wagers, prize draws, basic shop items |
| **Knowledge points** | Answering questions, especially new categories | Levels, titles, leaderboard recognition |
| **Camp resources** | Minigames and camp integration | Recipes, discounts, or camp-specific rewards |
| **Collectibles** | Prize draws, crafting, events | Profile display, badges, set completion |
| **Torture Om charges** | Approved integration rewards | A limited camp feature, subject to per-player limits |

Sciocoins are fictional and have no cash value. Do not sell them, allow cash-out, or make spending money part of the game. Wagers should be optional and capped so a player cannot lose all progress in one round.

Suggested starting balance: 100 Sciocoins, one starter collectible, and a small amount of camp resources. A new player should be able to try every core feature without grinding first.

## Commands for the first playable release

### Menu and guidance

- `/start` — create a profile and explain the loop.
- `/help [topic]` — show commands or explain economy, minigames, collectibles, or etiquette.
- `/profile [player]` — show level, title, streak, and selected collectible.
- `/inventory` — show currencies, resources, and collectibles.
- `/leaderboard [weekly|all-time]` — planned friendly rankings.

### Earning

- `/daily` — once per day, award a small bonus and a rotating Sciovirtual fact.
- `/frog` — if the player owns the Frog of Wisdom, reveal a philosopher quote; use a per-player cooldown to prevent spam.
- `/lore [action] [query]` — reveal a random community story, list stories, or search contributed entries.
- `/trivia [category]` — start a short question for the channel or an ephemeral solo question.
- `/race create [category] [wager]` — open a time-limited race.
- `/race join` — join an open race.
- `/race answer` — answer the current question through a button or modal where possible.

### Spending and collecting

- `/shop` — show the current rotating shop.
- `/draw [count]` — spend Sciocoins on random collectibles with visible rarity odds.
- `/craft [recipe]` — exchange resources for a known item.
- `/equip [collectible]` — display a collectible on the profile.
- `/trade offer|accept|decline|cancel|list` — exchange collectibles and Sciocoins with explicit confirmation from both players.

The implemented foundation is `/ping`, `/help`, `/start`, `/profile`, `/inventory`, `/daily`, `/trivia`, `/shop`, `/draw`, `/frog`, and `/lore`. Leaderboards and races are planned next; add them after profiles and persistent storage are reliable.

## Race Bet minigame

The race is a social event, not a high-pressure gambling system:

1. A player creates a race with a topic, maximum players, answer time, and optional wager.
2. Other players join before the lobby closes. Everyone sees the rules and the wager before confirming.
3. The bot posts one question at a time. Players answer with buttons or a short response; the first correct answer gets a point.
4. After 5–10 questions, the highest score wins. Ties receive an equal split or a rematch.
5. The winner receives the wager pool plus a small knowledge-point bonus. The bot announces the result and gives a positive sportsmanship message.

Guardrails:

- wagers are optional, use only fictional Sciocoins, and have a low server-wide cap;
- a player cannot wager more than a fixed percentage of their balance;
- no player can join their own race with multiple accounts;
- answers are accepted only during the active question and are rate-limited;
- the host can cancel before the first question, with all wagers refunded;
- disconnects and timeouts have a documented refund rule;
- harassment, spam, answer flooding, and targeting another player are not part of the game.

## Prize draws and collectibles

Use a rotating collection tied to Sciovirtual culture. Examples include the Frog of Wisdom, fictional camp artifacts, stickers, emotes, scientist badges, and lore references. Each item should have:

- a name and one-sentence story;
- a rarity (common, uncommon, rare, legendary);
- a profile display or set-bonus purpose;
- a duplicate policy, such as conversion into crafting dust or a small refund.

Show the odds before a draw. Avoid rewards that make a player permanently stronger than everyone else. A rare prize can be memorable, cosmetic, or grant a modest temporary bonus such as a discount. A limited number of extra Torture Om charges can be an event reward only when the integration owner approves the limit.

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
race: id, guild_id, host_id, category, wager, players, questions, scores,
      state, created_at, closes_at
question: id, category, prompt, answers, explanation, difficulty, active
item: id, name, rarity, description, source, tradeable
```

The current foundation uses a local JSON profile store with regular backups. Move to SQLite when races and larger inventories need transactions. Keep the game logic independent from Discord and from external camp/Torture Om integrations so either integration can be disabled without losing profiles.

## Integration plan

### Camp resources

Start with an adapter that can read the camp resource catalog and write only approved rewards. Cache the catalog, validate item IDs, and fall back to a local reward table if the service is unavailable. Do not let an external outage block trivia or profile commands.

### Torture Om

Make this opt-in and quota based. Store a per-player allowance, record every grant and use, and enforce a server-wide daily ceiling. The bot should display the remaining allowance and return a clear message when the integration is unavailable. No collectible or wager should bypass these limits.

## Success criteria

The first release is ready when:

- a new player can start, answer a question, inspect inventory, and receive a reward;
- two or more players can complete a race with an optional wager and deterministic refunds;
- balances and collectibles survive a bot restart;
- commands have cooldowns and invalid input does not crash the bot;
- organizers can add questions, items, and lore without changing game logic;
- the bot has been tested in the testing server and behaves politely in a busy channel.

## Week plan

| Day | Deliverable |
| --- | --- |
| Monday | Repository and testing server complete. Finish this design and agree on the first command list. |
| Tuesday | Implement `/start`, `/help`, `/profile`, `/inventory`, `/daily`, and persistent profiles. |
| Wednesday | Add trivia, rewards, the basic economy, and the first collectible set. |
| Thursday | Add race lobbies, optional capped wagers, leaderboards, cooldowns, and moderation controls. |
| Friday | Add the camp resource adapter and a limited Torture Om adapter behind feature flags. |
| Saturday | Test edge cases, restart persistence, duplicate rewards, permissions, and channel behavior; polish copy. |
| Sunday | Run a clean deployment test, verify commands in Discord, back up data, and prepare the submission demo. |

If time gets tight, keep trivia, profiles, inventory, daily rewards, and collectibles as the submission MVP. Races and external integrations can be marked as the next milestone without weakening the core cultural experience.
