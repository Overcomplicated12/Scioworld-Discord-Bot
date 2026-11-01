import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStore} from '../src/store.js';
import {execute} from '../src/commands/lore-review.js';
import {checkPilotSchedules} from '../src/pilot-scheduler.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scio-approval-'));
try {
 const file=path.join(dir,'state.json');let store=createStore(file);
 const submission=store.createLoreSubmission('g','author','Frog returns','A short story.');
 const sent=[];let blocked=false;
 const client={guilds:{cache:new Map([['g',{id:'g',name:'Test'}]])},users:{fetch:async id=>({send:async payload=>{if(blocked)throw Error('DMs closed');sent.push({id,payload});}})}};
 let notification;
 const interaction={guildId:'g',guild:{ownerId:'admin'},user:{id:'admin'},client,options:{getSubcommand:()=> 'approve',getString:()=>submission.id},reply:async()=>{}};
 const dispatch=c=>{notification=checkPilotSchedules(c,Date.now(),store);return notification;};
 await execute(interaction,store,dispatch);await notification;
 assert.equal(sent.length,1);assert.equal(sent[0].id,'author');assert.match(sent[0].payload.content,/approved for publication/);assert.match(sent[0].payload.content,/stamps.*separately/);
 assert.deepEqual(sent[0].payload.allowedMentions,{parse:[]});
 await execute(interaction,store,dispatch);await notification;assert.equal(sent.length,1);
 store=createStore(file);await checkPilotSchedules(client,Date.now(),store);assert.equal(sent.length,1);
 store.updateLoreSubmission('g',submission.id,'rejected');store.updateLoreSubmission('g',submission.id,'approved');await checkPilotSchedules(client,Date.now(),store);assert.equal(sent.length,1);
 const another=store.createLoreSubmission('g','other','A second Frog','More lore.');store.updateLoreSubmission('g',another.id,'approved');blocked=true;
 const now=Date.now();await checkPilotSchedules(client,now,store);
 assert.equal(store.getPilotJobs('g',now+1).filter(j=>j.kind==='lore-approved').length,0);
 assert.equal(store.getPilotJobs('g',now+15*60000).filter(j=>j.kind==='lore-approved').length,1);
 blocked=false;await checkPilotSchedules(client,now+15*60000,store);assert.equal(sent.length,2);
 console.log('Lore approval checks passed: correct recipient, immediate dispatch, no duplicate approval DMs, persistence, and failed delivery retry.');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
