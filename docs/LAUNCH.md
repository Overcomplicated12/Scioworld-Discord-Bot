# Director Handoff — ScioWorld

## Before posting

1. Ensure the bot is installed in the ScioVirtual server with required application command permissions.
2. Confirm `/start`, `/explore`, `/world`, `/inventory`, `/build`, and `/camp` work in that server.
3. Confirm links in `src/camp-data.js` are approved and current.
4. Ensure the Cloudflare Worker and D1 database are deployed, with appropriate access assigned to a ScioVirtual maintainer.
5. Keep an offline export/backup plan for the database, and never publish the bot token.

## Suggested Discord announcement (copy/edit)

**ScioWorld is live! 🐸**

We've made a Discord bot where everyone on the server helps build the same ridiculous frog civilization. Explore for materials, contribute toward buildings, and see who has helped the Frog Republic the most.

Get started with `/start`, then try `/explore`, `/inventory`, `/build`, and `/world`.

The bot also includes `/camp resources`, `/camp courses`, and `/camp schedule` for useful ScioVirtual information.

This is an early version, so please report bugs using the ScioVirtual feedback channel. Enjoy!

## Maintenance

- Camp information: edit `src/camp-data.js` and redeploy.
- Game balancing: edit `src/game.js` and redeploy.
- Commands: update `src/commands.js` and `src/index.js`; re-register slash commands if their definitions change.
- Logs: use the Cloudflare dashboard to inspect Worker errors.
- Database: use Wrangler D1 commands to inspect, back up, and migrate schema.

## Safety and limitations

- The Discord bot is only accessible to eligible Discord users; send non-Discord students permitted camp information via email or another approved website.
- No real-money purchases or player-to-player financial stakes.
- Community-wide contributions can appear in messages; do not publish real-world personal information.
- Game data is stored by Discord user and server IDs; confirm applicable organizational privacy requirements before launch.
