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

For a persistent server deployment, see [docs/HOSTING.md](docs/HOSTING.md). The current command list and game notes are in [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md).

## Command guide

### Profiles and progression

- `/start` — create a profile.
- `/profile` — view level, knowledge points, streak, and featured collectible.
- `/inventory` — view Sciocoins, resources, and collectibles.
- `/daily` — claim the daily reward and knowledge points.
- `/leaderboard` — rank by knowledge points, Sciocoins, or streak.
- `/privacy` — hide or show your leaderboard entry.

Knowledge points are progression points: correct trivia answers give more, participation still gives some, and daily rewards give 5. Every 100 points adds a level.

### Games and community

- `/trivia` — answer science questions.
- `/race create|join|start|answer|cancel` — run a friendly, non-wager science race.
- `/poll status` — see the next weekly poll.
- `/poll early` — admin-only early random poll.
- `/poll override` — admin-only custom poll for the week.
- `/frog` — receive a Frog of Wisdom quote when you own the collectible.
- `/lore` — read, list, or search community stories.
- `/report` — privately report a player to moderators.

Weekly polls are selected from a question bank, protected from reuse for one year, and announced to the server owner 24 hours before the scheduled post. If the bank is exhausted, the owner is asked to add more prompts.

### Collectibles and trading

- `/shop` — view or buy collectibles.
- `/craft` — craft collectibles from resources and Sciocoins.
- `/equip` — feature an owned collectible.
- `/sets` — view collectible set progress.
- `/trade offer|accept|decline|cancel|list` — trade collectibles and Sciocoins with another player.

The bot does not use gambling or random paid draws. Competition is based on answers and participation.

### Camp resources

- `/camp-resources` — students see instructors for courses matching their Discord roles.
- `/camp-course add|remove` — server owner/admin manages course categories and linked roles.
- `/camp-instructor add|remove` — server owner/admin manages course instructors.

Instructor mentions are clickable but notifications are suppressed so viewing resources does not repeatedly ping instructors.

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
