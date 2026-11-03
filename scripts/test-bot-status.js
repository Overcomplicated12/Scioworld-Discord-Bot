import assert from 'node:assert/strict';
import { execute } from '../src/commands/bot-status.js';

const interaction = isAdmin => {
  let response;
  return {
  guildId: 'guild',
  guild: { ownerId: 'owner' },
  user: { id: 'student' },
  memberPermissions: { has: () => isAdmin },
    reply: async payload => { response = payload; },
    get response() { return response; },
  };
};

const deniedInteraction = interaction(false);
await execute(deniedInteraction);
assert.match(deniedInteraction.response.content, /Only the server owner or an administrator/);
const allowedInteraction = interaction(true);
await execute(allowedInteraction);
assert.match(allowedInteraction.response.content, /ScioVirtual bot status/);
console.log('Bot status permission checks passed.');
