# ScioVirtual Discord bot

A Discord Gateway bot for ScioVirtual culture, daily rewards, player profiles, collectibles, and quick social games.

## Setup

1. Install Node.js 20 or later and npm. In this directory, run `npm ci`.
2. In the [Discord Developer Portal](https://discord.com/developers/applications), create an application. On its **Bot** page, create/reset and copy its bot token. Keep this token private.
3. Copy `.env.example` to `.env` and fill in:
   - `DISCORD_TOKEN`: the bot token from the Bot page.
   - `DISCORD_APPLICATION_ID`: the Application ID on the General Information page.
   - `DISCORD_GUILD_ID` (optional): your testing server ID; when set, command deployment registers commands there immediately as well as globally.
4. In the Developer Portal's installation settings, add the `bot` and `applications.commands` scopes for a server install. Generate/use the install link and add the bot to your server. The bot needs permission to view the channel and send messages.
5. Run `npm run check` to validate the source, then `npm run deploy-commands` to register commands globally. If `DISCORD_GUILD_ID` is set, the same commands are also registered immediately in that testing server. Deployment replaces this application's existing command set in each target.
6. Run `npm start` and keep the process running. Try `/start`, `/daily`, `/profile`, `/inventory`, `/frog`, `/lore`, `/ping`, and `/help` in your server. Stop the bot with Ctrl+C.

Run these commands from the repository directory on your local machine or home server. Never commit or share `.env`.

For persistent home-server hosting and manual updates, see [docs/HOSTING.md](docs/HOSTING.md).

The gameplay direction, implemented command set, lore contribution format, economy, minigames, culture rules, and week plan are in [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md).

## Remove old test-server commands

Global registration does not remove commands previously registered to a server; those can appear alongside the global commands. If you used the previous guild-based setup, run the following once in PowerShell from the repository directory after configuring `.env` and running `npm install`. Enable Developer Mode in Discord and copy the ID of the old test server. Replace `YOUR_OLD_SERVER_ID` below with that ID. This deletes only this application's guild-scoped `/ping` and `/help` in that server; it leaves global commands and other guild commands alone. Repeat for any other servers where the old commands were registered.

```powershell
$env:OLD_SERVER_ID = 'YOUR_OLD_SERVER_ID'
@'
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
const { DISCORD_TOKEN, DISCORD_APPLICATION_ID, OLD_SERVER_ID } = process.env;
if (!DISCORD_TOKEN || !DISCORD_APPLICATION_ID || !/^\d+$/.test(OLD_SERVER_ID || '')) throw new Error('Set credentials in .env and OLD_SERVER_ID to the old server ID.');
const rest = new REST().setToken(DISCORD_TOKEN);
const route = Routes.applicationGuildCommands(DISCORD_APPLICATION_ID, OLD_SERVER_ID);
for (const command of await rest.get(route)) {
  if (command.type === 1 && ['ping', 'help'].includes(command.name)) {
    await rest.delete(Routes.applicationGuildCommand(DISCORD_APPLICATION_ID, OLD_SERVER_ID, command.id));
    console.log(`Removed guild command /${command.name}.`);
  }
}
'@ | node --input-type=module
Remove-Item Env:OLD_SERVER_ID
```

The cleanup uses Discord's separate [guild command endpoints](https://docs.discord.com/developers/docs/interactions/slash-commands#delete-guild-application-command). If there were no previous guild commands, no cleanup is needed.

To add a command, create a module in `src/commands` exporting `data` and `execute`, add it to `src/commands/index.js`, update the help text, and run `npm run deploy-commands` again. Run `npm run check` for syntax checks.
