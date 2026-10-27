# ScioWorld

A Discord bot combining a cooperative civilization game with ScioCamp information.

**Stack:** JavaScript (ES modules), Discord Interactions API, Cloudflare Workers, D1 (SQLite).

> Status: starter prototype. **Not yet deployed or tested against Discord/Cloudflare services.**
> Slash commands, resource updates, and database schemas are implemented; production deployment is your team's next step.

## What the bot does

| Command | Action |
|---|---|
| `/start` | Creates a player in the server |
| `/explore` | Finds coins, wood, stone, occasionally artifacts; two-minute demo cooldown |
| `/inventory` | Shows personal resources |
| `/build resource:<wood/stone> amount:<1-20>` | Spends personal resources to advance the shared civilization |
| `/world` | Shows constructed buildings and next milestone |
| `/leaderboard` | Shows community construction contributions |
| `/frog` | Gives intentionally questionable wisdom |
| `/camp resources` | Lists approved resources configured by directors |
| `/camp courses` | Lists course information |
| `/camp schedule` | Lists upcoming activities |

Each Discord server has its **own** players and civilization, so a test server doesn't share progress with the real server.

## Deployment guide (recommended path)

### 0. Prerequisites

- Node.js 20+ and npm
- A Discord Developer application and a separate test Discord server
- A Cloudflare account, Wrangler CLI access

### 1. Install dependencies

```bash
npm install
cp .dev.vars.example .dev.vars
```

On Windows PowerShell, use `Copy-Item .dev.vars.example .dev.vars`.

In `.dev.vars`, fill in your Discord **Application ID**, **Public Key**, **Bot Token**, and your test server's **Guild ID**. The IDs and secrets can be found at https://discord.com/developers/applications . Never commit `.dev.vars` or the token to GitHub.

### 2. Create D1

```bash
npx wrangler login
npx wrangler d1 create scio-world-db
```

Copy the `database_id` returned by Cloudflare into `wrangler.jsonc` in place of `REPLACE_WITH_D1_DATABASE_ID`.

Run the SQL migrations locally:

```bash
npm run db:local
```

Then apply the same schema to the remote database (required before the deployed bot can save progress):

```bash
npm run db:remote
```

### 3. Register test slash commands

```bash
npm run register:guild
```

This uses the values in `.dev.vars` to register commands **only in your test server**, so you can iterate quickly.

### 4. Configure the production Worker public key

```bash
npx wrangler secret put DISCORD_PUBLIC_KEY
```

Paste your application's Public Key (not the Bot Token). The Worker only requires the public key to verify signed interactions. The Bot Token is used by the *local registration script* and should not be a Worker secret.

### 5. Deploy and configure Discord

```bash
npm run deploy
```

Copy the published `https://...workers.dev` URL into the Discord Developer Portal under **General Information → Interactions Endpoint URL**. Discord will verify your endpoint by sending a signed PING; a correct setup replies with PONG.

Install the Discord application in the test server using the Developer Portal's Installation/OAuth2 settings and `applications.commands` scope. If you select `bot`, grant only the permissions actually needed for your installation. Slash-command responses here do not require privileged message-content intent.

### 6. Test the actual commands

Use `/start`, `/explore`, `/inventory`, `/world`, and `/build` in the test server. Test these situations:

- Another member joins and has an independent inventory.
- Two users contribute and the *same* world progresses.
- A player cannot build with insufficient materials.
- Clicking or retrying the same `/build` interaction does not charge twice.
- `/explore` enforces cooldown.
- Workers restart or new deploys do not erase state.
- Resource commands show safe content and don't expose private materials.

After testing, install the app in the ScioVirtual server. Register commands globally with `npm run register:global` when ready. Until then, test guild-specific commands only.

## Local development

`npm run dev` starts a local Worker, but Discord cannot reach `localhost` directly. For real Discord interactions, deploy to Workers (recommended) or use a secure HTTPS tunnel to the local server. Ensure D1 is initialized and the Discord endpoint is configured correctly.

## Keep camp information current

Edit `src/camp-data.js` to populate approved course summaries, resource links, and event details. Keep private files private using Drive permissions. Do not collect campers' names, email addresses, or grades in this MVP.

## Repository structure

```text
src/
  index.js        Request verification, slash-command dispatch, database actions
  commands.js     Slash-command definitions
  game.js         Pure game balance and world milestones
  camp-data.js    Approved camp information
scripts/
  register.js     Guild/global slash-command registration
migrations/
  0001_init.sql   SQLite schema and atomic contribution triggers
tests/
  game.test.js    Core game rules tests
docs/
  ROADMAP.md      Team implementation plan
  LAUNCH.md       Exact instructions for directors
```

## Important constraints

- **MVP only:** No direct messages, player-to-player trading, gambling, financial transactions, or unrestricted user-submitted content.
- Discord generally requires users to be 13+ (or meet a higher local minimum). Younger campers need non-Discord access to resources.
- D1 is persistent but has free-plan usage/storage limits. If this becomes popular, monitor Cloudflare usage.
- The Worker only handles slash-command interactions. For automatic reminders, periodic world events, or push messages, add Cloudflare scheduled handlers and Discord REST permissions later.
- Economy balancing and abuse protection should be validated in student testing.

## References

- Official Discord Cloudflare sample: https://github.com/discord/cloudflare-sample-app (MIT; studied as architecture reference, code here is an independent implementation)
- Discord's Cloudflare tutorial: https://docs.discord.com/developers/tutorials/hosting-on-cloudflare-workers
- D1 getting started: https://developers.cloudflare.com/d1/get-started/
- Discord interactions: https://docs.discord.com/developers/topics/interaction
