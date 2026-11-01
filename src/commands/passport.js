import { EmbedBuilder, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { store } from '../store.js';
import { PilotError } from '../pilot.js';
import { requireGuild } from './utils.js';
import { privateReply } from './weekly.js';
export const data = new SlashCommandBuilder().setName('passport').setDescription('Your seasonal stamps, sticker claims, and privacy choices.')
  .addSubcommand(c=>c.setName('view').setDescription('View this season or a previous season.').addStringOption(o=>o.setName('season').setDescription('Previous season ID')))
  .addSubcommand(c=>c.setName('history').setDescription('List your seasons.'))
  .addSubcommand(c=>c.setName('claim').setDescription('Request organizer review of your qualified sticker claim.').addStringOption(o=>o.setName('season').setDescription('Season ID')))
  .addSubcommand(c=>c.setName('opt-out').setDescription('Opt out of pilot participation and milestone DMs.').addBooleanOption(o=>o.setName('enabled').setDescription('True to opt out; false to rejoin').setRequired(true)))
  .addSubcommand(c=>c.setName('feedback').setDescription('Privately tell organizers how the pilot feels (once per season).').addStringOption(o=>o.setName('text').setDescription('Feedback — please do not include private information').setMaxLength(1000).setRequired(true)));
export async function execute(i) {
  if (!requireGuild(i)) return;
  try {
    const action=i.options.getSubcommand();
    const args={season:i.options.getString('season')};
    if(action==='opt-out') args.enabled=i.options.getBoolean('enabled');
    if(action==='feedback') args.text=i.options.getString('text');
    const r=store.pilot(i.guildId,i.user.id,action==='view'?'passport':action,args);
    if(action==='history') {
      await i.reply(privateReply(r.length?r.map(s=>`**${s.id}** — ${s.stamps}/${s.threshold} stamps · ${s.claim?.status || 'no claim'}${s.simulation?' · simulation':''}`).join('\n').slice(0,1900):'No seasons yet.')); return;
    }
    if(action!=='view') { await i.reply(privateReply(action==='claim'?`Claim status: **${r.status}**${r.simulation?' (simulation only)':''}. ${r.reason||'Organizers will review it; do not send mailing addresses to the bot.'}`:action==='feedback'?'Thank you. Organizers can read your feedback privately.':r.optedOut?'You opted out. Existing history is retained; new submissions and milestone DMs are disabled.':'You can participate again.')); return; }
    const filled=Math.min(10,Math.floor(r.stamps/r.threshold*10));
    const embed=new EmbedBuilder().setTitle(r.name).setColor(0x3b9771).setDescription(`${r.simulation?'**SIMULATION — no real merchandise or currency rewards**\n':''}${'🟩'.repeat(filled)}${'⬜'.repeat(10-filled)} **${r.stamps}/${r.threshold} stamps**\n${r.qualified?'You qualified!':'Participate whenever you have time.'}`)
      .addFields({name:'Season',value:`${r.id} · ${r.status}\n<t:${Math.floor(r.start/1000)}:F> → <t:${Math.floor(r.end/1000)}:F>\n${r.timezone}`},{name:'Completed contributions',value:r.completed.join('\n').slice(0,1000)||'None yet'},{name:'Remaining opportunities',value:r.status==='closed'?'Submissions closed. Pending reviews can still earn stamps.':`${r.remaining.slice(0,8).map(a=>`${a.id}: ${a.answered?'answered':'answer available'}, ${a.discussed?'explanation approved':'explanation available'}`).join('\n') || 'No remaining daily answers.'}\n${r.loreAvailable?'One original lore contribution can earn 2 stamps.':'Your lore reward has been earned.'}`},{name:'Sticker and claim',value:`${r.sticker}\n${r.claim?.status||'No claim'}${r.claim?.reason?` — ${r.claim.reason}`:''}\n${r.claimsOpen?'Use /passport claim if qualified.':'Claims are not open.'}`},{name:'Eligibility',value:r.eligibility});
    await i.reply({embeds:[embed],flags:MessageFlags.Ephemeral,allowedMentions:{parse:[]}});
  }catch(e){if(!(e instanceof PilotError))throw e; await i.reply(privateReply(e.message));}
}
