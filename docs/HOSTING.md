# Hosting on Ubuntu or Debian

Use a normal, non-root account with sudo access. The bot connects outbound to the Discord Gateway, so it needs no port forwarding or public web server. The server must stay powered on and connected to the internet.

## Install and configure

1. Install Git, curl, and certificates:

   ```bash
   sudo apt update
   sudo apt install -y git curl ca-certificates
   ```

2. Install Node.js 20 or later and npm using the current [Node.js download instructions](https://nodejs.org/en/download). Verify with `node --version` and `npm --version`. Install PM2 globally under your normal account (if using a system-wide Node installation, npm may require sudo):

   ```bash
   npm install -g pm2
   pm2 --version
   ```

3. Clone the repository and enter it:

   ```bash
   git clone https://github.com/Overcomplicated12/Scioworld-Discord-Bot.git
   cd Scioworld-Discord-Bot
   ```

   For a private repository, configure GitHub authentication first.

4. Copy `.env.example` to `.env` and edit it, for example with `nano .env`:

   ```bash
   cp .env.example .env
   chmod 600 .env
   nano .env
   ```

   Set `DISCORD_TOKEN` to your bot token, `DISCORD_APPLICATION_ID` to the application ID, and `DISCORD_GUILD_ID` to the test server ID. The main README explains where to find these values and how to invite the bot. Keep the token private.

5. Install dependencies, register the test-server commands, and start the bot:

   ```bash
   npm ci
   npm run deploy-commands
   pm2 start ecosystem.config.cjs
   pm2 save
   ```

   Registration replaces this application's existing guild commands in the specified test server.

6. Enable restart after reboot using your normal account:

   ```bash
   pm2 startup
   ```

   Run the command printed by PM2 (it uses sudo to configure the system service), then run `pm2 save` as your normal account. After a Node.js upgrade, regenerate the startup configuration as described in the [PM2 startup documentation](https://pm2.keymetrics.io/docs/usage/startup/).

## Operation and updates

Use the same Linux account for all PM2 commands:

```bash
pm2 status
pm2 logs scioworld
pm2 restart scioworld
pm2 stop scioworld
pm2 save
```

`pm2 save` records the current process list for reboot. Logs are normally under `~/.pm2/logs`.

From the repository directory, update manually with:

```bash
bash scripts/manual-update.sh
```

To also register slash commands, run:

```bash
bash scripts/manual-update.sh --commands
```

From another directory, invoke the script by its absolute path. The script requires a clean working tree on `main`, pulls `origin/main` with fast-forward only, installs dependencies, runs `npm test` if present, optionally registers commands, then starts or restarts PM2 and saves its process list. It does not remove `.env` or application data. A failed install, test, or registration stops the deployment before the PM2 restart; the Git checkout may already have advanced, so fix the error and rerun the script.

## Troubleshooting

- **Dirty working tree or wrong branch:** inspect `git status` and `git branch`; preserve or commit your changes before switching to `main` and updating. Do not discard data you need.
- **Pull fails:** check GitHub authentication and network connectivity. A non-fast-forward update means local `main` has diverged; inspect its history and resolve it manually.
- **Install or tests fail:** check Node/npm versions and the error output; correct the issue before rerunning. If the server cannot reach npm, restore network access.
- **Commands fail to register:** check the three `.env` values, bot membership and permissions, and the server ID. Registration requires network access to Discord.
- **Bot is offline:** check `pm2 status` and `pm2 logs scioworld`, the token, and Discord connectivity. PM2 may restart a process repeatedly if configuration is invalid.
- **Bot does not return after reboot:** run `pm2 startup` and its printed command, then `pm2 save` under the same account that started the bot. Check the generated systemd service and PM2 logs.
