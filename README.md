# ScioVirtual Discord bot

A minimal Discord Gateway bot with `/ping` and `/help`.

## Setup

1. Install Node.js 20 or later and npm. In this directory, run `npm install`.
2. In the [Discord Developer Portal](https://discord.com/developers/applications), create an application. On its **Bot** page, create/reset and copy its bot token. Keep this token private.
3. Copy `.env.example` to `.env` and fill in:
   - `DISCORD_TOKEN`: the bot token from the Bot page.
   - `DISCORD_APPLICATION_ID`: the Application ID on the General Information page.
   - `DISCORD_GUILD_ID`: the test server ID. In Discord, enable Developer Mode under User Settings > Advanced, then right-click the test server and choose Copy Server ID.
4. In the Developer Portal's installation settings, add the `bot` and `applications.commands` scopes for a server install. Generate/use the install link and add the bot to your test server. The bot needs permission to view the channel and send messages.
5. Run `npm run deploy-commands` to register the commands in that server. This replaces the application's existing guild commands in that server with the commands in this project.
6. Run `npm start` and keep the process running. Try `/ping` and `/help` in the test server. Stop the bot with Ctrl+C.

Run these commands from the repository directory on your local machine or home server. Never commit or share `.env`.

For persistent home-server hosting and manual updates, see [docs/HOSTING.md](docs/HOSTING.md).

To add a command, create a module in `src/commands` exporting `data` and `execute`, add it to `src/commands/index.js`, update the help text, and run `npm run deploy-commands` again. Run `npm run check` for syntax checks.
