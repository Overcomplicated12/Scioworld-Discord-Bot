# ScioWorld Discord Bot

## Project shape

- `src/commands/` contains Discord slash-command definitions and handlers.
- `src/store.js` owns persistent profiles, economy, trades, races, camp data, reports, lore progress, polls, and Om state.
- `src/pilot.js` and `src/commands/pilot.js` contain the seasonal science-pilot rules.
- `content/` contains validated lore and pilot configuration.
- `scripts/` contains content checks, workflow tests, and deployment helpers.
- `data/profiles.json` is runtime state. Never commit it or `.env`.

## Development workflow

1. Read the relevant command, store operation, and content schema before editing.
2. Keep Discord handlers thin; put durable state changes and validation in `src/store.js` or the relevant pure module.
3. Keep all economy profiles guild-scoped. Use the existing `guildId:userId` profile key and add a regression test when changing profile behavior.
4. Preserve privacy controls, cooldowns, rate limits, consent requirements, and moderator permissions.
5. Make one focused commit per feature or fix. Use clear messages such as `feat: ...`, `fix: ...`, `test: ...`, or `docs: ...`.

## Required checks

Run these before committing:

```bash
npm test
```

For lore or pilot content, also run the focused check while iterating:

```bash
npm run check-content
npm run test:pilot
npm run check-python-content
```

For an offline performance check, use `npm run stress-test`. It writes only to a temporary directory. Adjust `STRESS_GUILDS`, `STRESS_USERS`, `STRESS_TRIVIA_ROUNDS`, and `STRESS_RACE_ROUNDS` to scale the run; it never connects to Discord or touches production data.

The dependency-free Python helper at `scripts/python/content_tools.py` validates
the course CSV and lore structure and prints question-bank statistics. It is a
contributor tool; the JavaScript checks remain the runtime validation path.

Content must remain valid JSON. Lore files must follow `content/lore/README.md`. Pilot factual activities need a correct choice, an explanation for every choice, and an HTTPS source.

## Discord and deployment

- Slash-command schema changes require `npm run deploy-commands`.
- Restart the running PM2 process with `pm2 restart scioworld` after deploying code.
- Inspect health with `pm2 status` and live output with `pm2 logs scioworld`.
- Run `npm run verify-deployment` on the deployment host after restarting; it checks PM2, recent login output, environment variables, and registered command names without printing secrets.
- Keep `.env` configured with `DISCORD_TOKEN`, `DISCORD_APPLICATION_ID`, and an optional `DISCORD_GUILD_ID` for testing.
- Do not expose tokens, profile data, private reports, or private submissions in public Discord messages or logs.

## Data safety

- Use the store's existing atomic persistence methods; do not write directly to `data/profiles.json` from a command.
- Preserve existing profile fields and provide safe defaults when adding new fields.
- Avoid destructive migrations. Back up runtime data before deployment and test guild isolation for balances and collectibles.
- Physical sticker claims are separate from the coin shop and require the seasonal passport/review flow.

