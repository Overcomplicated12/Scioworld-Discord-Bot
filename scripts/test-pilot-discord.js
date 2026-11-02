import assert from 'node:assert/strict';
import { commands } from '../src/commands/index.js';
import { activityMessage, handleInteraction } from '../src/commands/weekly.js';
import { execute as pilotCommand } from '../src/commands/pilot.js';
import { checkPilotSchedules } from '../src/pilot-scheduler.js';
for(const command of commands) command.data.toJSON();
let modal;
await handleInteraction({guildId:'g',user:{id:'student'},customId:'weekly:explain:test:activity',showModal:async value=>{modal=value.toJSON();}});
assert.equal(modal.custom_id,'weekly:submit:test:activity');
assert(modal.components[0].components[0].label.length<=45);
let submitted;
let confirmation;
await handleInteraction({guildId:'g',user:{id:'student'},customId:modal.custom_id,isModalSubmit:()=>true,fields:{getTextInputValue:()=> 'I would test the prediction twice.'},reply:async value=>{confirmation=value;}},{pilot:(...args)=>{submitted=args;return {saved:true};}});
assert.equal(submitted[2],'discuss');
assert.equal(submitted[3].text,'I would test the prediction twice.');
assert.match(confirmation.content,/private review queue/);
let createdProfile = 0;
let answerReply;
await handleInteraction({guildId:'g',user:{id:'new-student'},customId:'weekly:answer:test:activity:0',reply:async value=>{answerReply=value;}},{
  getOrCreate:()=>{createdProfile++;},
  pilot:()=>({simulation:true,choice:'a'}),
});
assert.equal(createdProfile,1,'Answer buttons should work before a student runs /start.');
assert.match(answerReply.content,/Saved/);
let denied;
await pilotCommand({guildId:'g',guild:{ownerId:'owner'},user:{id:'student'},memberPermissions:{has:()=>false},reply:async value=>{denied=value;}});
assert.match(denied.content,/Only/);
const a={id:'a',format:'prediction',prompt:'Predict!',choices:['a','b'],opensAt:1,closesAt:20};
const payload=activityMessage({season:'test',activity:a,simulation:true},10);
assert.equal(payload.components[0].components.length,2);
assert.match(payload.embeds[0].description,/SIMULATION/);
let sends=0,edits=0,acks=0,failAck=true;
const messages=[];
const channel={isTextBased:()=>true,messages:{fetch:async()=>({find:fn=>messages.find(fn)})},send:async p=>{
  sends++; const message={id:'m',author:{id:'bot'},embeds:p.embeds,startThread:async()=>({id:'thread'}),edit:async q=>{edits++;message.embeds=q.embeds;}};messages.push(message);return message;
}};
const client={user:{id:'bot'},guilds:{cache:new Map([['g',{id:'g',channels:{fetch:async()=>channel}}]])}};
const jobs=[{kind:'activity',season:'test',channelId:'c',activity:a,simulation:true}];
const persistence={getPilotJobs:()=>jobs,pilotQuiet:()=>false,ackPilotJob:()=>{if(failAck){failAck=false;throw Error('simulated crash after send');}acks++;jobs.length=0;}};
await checkPilotSchedules(client,10,persistence);
await checkPilotSchedules(client,10,persistence);
assert.equal(sends,1,'Restart reconciliation must reuse the posted message');
assert.equal(edits,2);assert.equal(acks,2);
assert.equal(a.threadId,'thread');
console.log('Discord pilot checks passed: schemas, permissions, buttons, and send-before-save recovery.');
