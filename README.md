# ScioVirtual Discord bot

A Discord bot for ScioVirtual culture, science trivia, community lore, collectibles, camp resources, and friendly social games.

## Setup

1. Install Node.js 20 or later.
2. Install dependencies:

   ```bash
   npm ci
   ```

3. Copy `.env.example` to `.env` and set:
   - `DISCORD_TOKEN` — bot token from the Discord Developer Portal.
   - `DISCORD_APPLICATION_ID` — application ID.
   - `DISCORD_GUILD_ID` — optional testing server ID.
4. Invite the bot with the `bot` and `applications.commands` scopes. It needs permission to view channels, send messages, and create polls.
5. Validate and register commands:

   ```bash
   npm run check
   npm run check-content
   npm run deploy-commands
   ```

   When `DISCORD_GUILD_ID` is set, commands are registered in that server and global commands are cleared to prevent duplicate slash commands. Without it, commands are registered globally.
6. Start the bot:

   ```bash
   npm start
   ```

Never commit `.env` or `data/profiles.json`.

For a persistent server deployment, see [docs/HOSTING.md](docs/HOSTING.md). The current command list and game notes are in [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md). The engagement plan is in [docs/ENGAGEMENT_PLAN.md](docs/ENGAGEMENT_PLAN.md), and the ready-to-post announcement is in [docs/ANNOUNCEMENT.md](docs/ANNOUNCEMENT.md).

## Two-week science pilot

The bot now includes `/question`, `/passport`, and an administrator-only `/pilot` command group. One shared activity engine supports predictions, Two Truths and a Lie, and opinions. Three seasonal Contribution Stamps qualify for an organizer-reviewed sticker claim; stamps cannot be bought or traded. Existing data and commands are retained.

Start with a **draft simulation** using the configuration in `content/pilot/season.json`. Nothing activates or issues merchandise at startup. Read [the pilot operator guide](docs/PILOT.md) for setup, privacy, claims, simulation, and reporting. Run `npm test` to check all workflows; `npm run test:pilot` runs isolated pilot tests without production writes.

## Command guide

### Profiles and progression

- `/start` — create a profile.
- `/profile` — view level, knowledge points, and featured collectible.
- `/inventory` — view Sciocoins, resources, and collectibles.
- `/daily` — claim the daily reward, knowledge points, and a rotating science fact.
- `/leaderboard` — rank by knowledge points, Sciocoins, or streak.
- `/privacy` — control leaderboard visibility, public recognition, or camp features.

Knowledge points track levels (100 KP per level). Ordinary trivia pays 2 coins/3 KP for up to five different correct answers per UTC day. Optional daily rewards are flat at 2 coins/1 KP; there is no streak bonus or penalty. Daily activity and contribution rewards are listed in the pilot guide.

### Games and community

- `/trivia` — answer science questions.
- `/camp-trivia ask` — answer a course-specific trivia question.
- `/race create|join|start|answer|cancel` — run a friendly, non-wager science race. During a race, players can click a choice button or send `1`, `2`, `3`, or `4` as a normal channel message. Enable Discord's **Message Content Intent** for numeric replies.
- `/poll status` — see the next weekly poll.
- `/poll early` — admin-only early random poll.
- `/poll override` — admin-only custom poll for the week.
- `/frog` — receive a Frog of Wisdom quote when you own the collectible.
- `/torture-om opt-in|opt-out|status` — manage the fictional, consent-based Om challenge.
- `/bother-om start` — run a five-minute vote for an opted-in Om target. The winning harmless option sends at most 11 pings or DMs, one hour apart; `/torture-om opt-out` stops future sends immediately.
- `/lore` — read, list, or search community stories.
- `/lore action:submit title:<title> query:<story text>` — submit a student-created story for review.
- `/lore action:solve story:<story id>` — get a key clue and solve it to unlock the next story chapter.
- `/lore action:progress` — see which chapters the server has unlocked.
- `/lore-review list|approve|reject` — moderator review of student submissions.
- `/report` — privately report a player to moderators.

Weekly polls are selected from a question bank, protected from reuse for one year, and announced to the server owner 24 hours before the scheduled post. If the bank is exhausted, the owner is asked to add more prompts. The day after a weekly poll, an opt-in Om challenge style poll may run before its capped fictional DMs begin.

Lore chapters unlock through key clues. The clue and answer are attached to the story entry, each player gets a cooldown after a wrong attempt, and solving grants no currency. There is no daily lore quota or benefit to repeated clicking.

### Collectibles and trading

- `/shop` — view or buy collectibles.
- `/craft` — craft collectibles from resources and Sciocoins.
- `/equip` — feature an owned collectible.
- `/sets` — view collectible set progress.
- `/trade offer|accept|decline|cancel|list` — trade collectibles and Sciocoins with another player.

The shop sells digital cosmetics only. Physical sticker claims are separate, require seasonal stamps and organizer approval, and cannot be purchased with coins or KP. The bot has no gambling, wagers, or random paid draws.

### Camp resources

- `/camp-resources` — students see instructors for courses matching their Discord roles.
- `/camp-course import-csv` — owner/admin sync of repository course and instructor rows into this server.
- `/camp-course add|remove` — server owner/admin manages course categories and linked roles.
- `/camp-instructor add|remove` — server owner/admin manages course instructors.
- `/camp-trivia add|list|remove` — instructors create and manage questions for their course; admins can manage every course.

Instructor mentions are clickable but notifications are suppressed so viewing resources does not repeatedly ping instructors.

The CSV importer reads `role_id`, `role_name`, `instructor_user_id`, and `instructor_tag`. Rows sharing a role become one course with multiple instructors; unrelated server course records are retained.

## Lore contributions

Add a validated `.json` story under `content/lore`. Follow [content/lore/README.md](content/lore/README.md), then run:

```bash
npm run check-content
```

## Updating a PM2 deployment

```bash
bash scripts/manual-update.sh --commands
pm2 logs scioworld
```

Use `pm2 status` to check the process and `pm2 restart scioworld` for a manual restart. Keep backups of `data/profiles.json`.
