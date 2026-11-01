import fs from 'node:fs';
import { AttachmentBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { store } from '../store.js';
import { PilotError } from '../pilot.js';
import { requireGuild } from './utils.js';
import { privateReply } from './weekly.js';
import { checkPilotSchedules } from '../pilot-scheduler.js';
export const canManagePilot = i => i.guild?.ownerId === i.user.id || i.memberPermissions?.has(PermissionFlagsBits.Administrator) === true;
const seasonOption = c => c.addStringOption(o=>o.setName('season').setDescription('Season ID; defaults to current season'));
const decisionOption = (c, values) => c.addStringOption(o=>o.setName('decision').setDescription('Review decision').setRequired(true).addChoices(...values.map(value=>({name:value,value}))));
export const data = new SlashCommandBuilder().setName('pilot').setDescription('Organize science seasons, reviews, sticker claims, and engagement reports.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(c=>c.setName('create').setDescription('Create an inactive draft from content/pilot/season.json.').addStringOption(o=>o.setName('start').setDescription('Exact ISO timestamp, e.g. 2030-01-01T10:00:00-05:00').setRequired(true)).addChannelOption(o=>o.setName('channel').setDescription('Channel for science activity posts').setRequired(true)).addBooleanOption(o=>o.setName('simulation').setDescription('Defaults to true. Explicit false enables real rewards after activation.')))
  .addSubcommand(c=>seasonOption(c.setName('activate').setDescription('Explicitly activate the draft season.')))
  .addSubcommand(c=>seasonOption(c.setName('status').setDescription('Inspect season settings and schedule.')))
  .addSubcommand(c=>c.setName('quiet').setDescription('Pause scheduled bot posts and DMs; deadlines still apply.').addBooleanOption(o=>o.setName('enabled').setDescription('Enable quiet mode').setRequired(true)))
  .addSubcommand(c=>seasonOption(c.setName('publish').setDescription('Open a scheduled activity now.').addStringOption(o=>o.setName('activity').setDescription('Activity ID').setRequired(true))))
  .addSubcommand(c=>seasonOption(c.setName('close').setDescription('Close answers and reveal the current activity.').addStringOption(o=>o.setName('activity').setDescription('Activity ID').setRequired(true))))
  .addSubcommand(c=>seasonOption(c.setName('queue').setDescription('Read private submissions, claims, and feedback.').addIntegerOption(o=>o.setName('page').setDescription('Discussion page, starting at 1').setMinValue(1))))
  .addSubcommand(c=>seasonOption(decisionOption(c.setName('review').setDescription('Approve, request revision, or reject an explanation.').addStringOption(o=>o.setName('id').setDescription('Discussion ID, such as D1').setRequired(true)),['approved','revision','rejected']).addStringOption(o=>o.setName('reason').setDescription('Private feedback').setMaxLength(500).setRequired(true))))
  .addSubcommand(c=>seasonOption(c.setName('reward-lore').setDescription('Award seasonal lore stamps separately from publication approval.').addStringOption(o=>o.setName('submission').setDescription('Lore submission ID').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('Confirm originality, substance, and community relevance').setMaxLength(500).setRequired(true))))
  .addSubcommand(c=>seasonOption(c.setName('claims-open').setDescription('Open claims after publishing a fair eligibility and capacity policy.').addStringOption(o=>o.setName('policy').setDescription('Discord message link to your published policy; required for real claims'))))
  .addSubcommand(c=>seasonOption(decisionOption(c.setName('claim-review').setDescription('Review or fulfill a sticker claim. Mailing is handled externally.').addUserOption(o=>o.setName('student').setDescription('Student whose claim is being reviewed').setRequired(true)),['approved','rejected','fulfilled']).addStringOption(o=>o.setName('reason').setDescription('Short review reason (never include an address)').setRequired(true).setMaxLength(500))))
  .addSubcommand(c=>seasonOption(c.setName('stock').setDescription('Update sticker capacity without changing existing reservations.').addIntegerOption(o=>o.setName('count').setDescription('Total available stickers for the season').setRequired(true).setMinValue(0))))
  .addSubcommand(c=>seasonOption(c.setName('engagement').setDescription('View aggregate participation and Week 1 → Week 2 retention.')));
export async function execute(i) {
  if(!requireGuild(i))return;
  if(!canManagePilot(i)){await i.reply(privateReply('Only the owner or administrators can manage the pilot.'));return;}
  await i.deferReply({flags:64});
  try {
    const action=i.options.getSubcommand(); const args={season:i.options.getString('season')};
    if(action==='create') {
      args.config=JSON.parse(fs.readFileSync(new URL('../../content/pilot/season.json',import.meta.url),'utf8'));
      args.config.simulation=i.options.getBoolean('simulation') ?? true;
      args.start=i.options.getString('start');
      const channel=i.options.getChannel('channel');
      if(!channel?.isTextBased() || channel.isThread?.()) throw new PilotError('Choose a server text channel, not a thread.');
      args.channelId=channel.id;
    }
    if(action==='stock')args.count=i.options.getInteger('count');
    if(action==='quiet')args.enabled=i.options.getBoolean('enabled');
    if(['publish','close'].includes(action))args.activity=i.options.getString('activity');
    if(['review','claim-review','reward-lore'].includes(action))args.reason=i.options.getString('reason');
    if(action==='review'){args.id=i.options.getString('id');args.decision=i.options.getString('decision');}
    if(action==='claim-review'){args.userId=i.options.getUser('student').id;args.decision=i.options.getString('decision');}
    if(action==='reward-lore')args.submissionId=i.options.getString('submission');
    if(action==='claims-open'){
      args.policyMessageUrl=i.options.getString('policy');
      if(args.policyMessageUrl){
        const match=args.policyMessageUrl.match(/^https:\/\/discord.com\/channels\/(\d+)\/(\d+)\/(\d+)$/);
        if(!match || match[1]!==i.guildId)throw new PilotError('Link a policy message in this server.');
        const channel=await i.guild.channels.fetch(match[2]); const message=await channel?.messages?.fetch(match[3]);
        if(!message)throw new PilotError('The policy message could not be verified.');
      }
    }
    const result=store.pilot(i.guildId,i.user.id,action==='engagement'?'report':action,args,Date.now(),true);
    let content;
    let files=[];
    if(action==='queue') {
      const page=(i.options.getInteger('page')||1)-1; const d=result.discussions[page];
      content=`**Private review queue** · ${result.discussions.length} explanations, ${result.claims.length} claims\n${d?`**${d.id}** · ${d.activityId} · <@${d.userId}>\n${d.text}\nUse /pilot review with this ID.`:'No pending explanation on this page.'}\n\nClaims: ${result.claims.slice(0,5).map(c=>`<@${c.userId}>`).join(', ')||'none'}\nAll pending claims and recent private feedback are in the attached file.`;
      files=[new AttachmentBuilder(Buffer.from(JSON.stringify(result,null,2)),{name:'private-pilot-queue.json'})];
    }else if(action==='engagement') {
      content=`**${result.season} engagement${result.simulation?' (simulation)':''}**\nWeek 1: ${result.week1} · Week 2: ${result.week2} · Returning: ${result.returning}\nRetention: ${result.retentionPercent===null?'N/A — no Week 1 participants':`${result.retentionPercent}%`}\nExplanations: ${result.discussions} (${result.approvedDiscussions} approved)\nQualified: ${result.qualified} · Claims: ${result.claims}\nPending reviews: ${result.pendingReviews}\nFull aggregate report attached. Retention counts answers and approved explanations/lore by their original submission week.`;
      files=[new AttachmentBuilder(Buffer.from(JSON.stringify(result,null,2)),{name:'engagement.json'})];
    }else content=`**${action}**\n\`\`\`json\n${JSON.stringify(result,null,2).slice(0,1750)}\n\`\`\``;
    await i.editReply({content,files,allowedMentions:{parse:[]}});
    if(['review','claim-review','reward-lore'].includes(action) && result.userId) {
      try{await (await i.client.users.fetch(result.userId)).send({content:`ScioCulture ${action}: ${result.status || (result.awarded?'lore reward approved':'lore reward already issued')}. ${args.reason}\nCheck /question or /passport in the server for details.`,allowedMentions:{parse:[]}});}catch{ /* Feedback stays in the private command view. */ }
    }
    if(['activate','publish','close','quiet'].includes(action))await checkPilotSchedules(i.client);
  }catch(e){console.error('Pilot command:',e.message);await i.editReply({content:e instanceof PilotError?e.message:'Could not complete this operation. Check the configuration or bot logs.',allowedMentions:{parse:[]}});}
}
