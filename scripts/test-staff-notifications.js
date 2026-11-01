import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStore} from '../src/store.js';
import {execute as submitLore} from '../src/commands/lore.js';
import {checkPilotSchedules} from '../src/pilot-scheduler.js';
import {notifySubmissionStaff} from '../src/staff-notifications.js';
import {pilotJobs,acknowledgePilotJob} from '../src/pilot.js';
let notices=[];
const user=(id,blocked=false)=>({id,bot:false,send:async m=>{if(blocked)throw Error('DMs blocked');notices.push({id,...m});}});
const owner=user('owner');const admin=user('admin');
const guild={name:'Test',fetchOwner:async()=>({id:'owner',user:owner}),members:{cache:new Map([['admin',{id:'admin',user:admin,permissions:{has:p=>p==='Administrator'}}]])}};
const d={id:'D1',userId:'student',activityId:'a',text:'private content',status:'pending',updatedAt:10};
const state={loreSubmissions:[],pilot:{quietGuilds:['g'],seasons:[{id:'s',guildId:'g',status:'active',start:0,end:1000,activities:[],discussions:[d],ledger:[]}]}};
let job=pilotJobs(state,'g',10)[0];assert.equal(job.kind,'staff-submission');
assert.equal(await notifySubmissionStaff(guild,job),true);assert.equal(notices.length,1);assert.equal(notices[0].id,'owner');assert(!notices[0].content.includes('private content'));
acknowledgePilotJob(state,'g',job,{delivered:true,now:10});assert.equal(pilotJobs(state,'g',11).length,0);
d.updatedAt=20;job=pilotJobs(state,'g',20)[0];assert(job,'Revisions need a new notice');
guild.fetchOwner=async()=>({id:'owner',user:user('owner',true)});
assert.equal(await notifySubmissionStaff(guild,job),true);assert.equal(notices.at(-1).id,'admin');
acknowledgePilotJob(state,'g',job,{delivered:false,now:20});assert.equal(pilotJobs(state,'g',21).length,0);
assert.equal(pilotJobs(state,'g',20+15*60000).length,1);
state.loreSubmissions.push({id:'LS1',guildId:'g',authorId:'student',status:'pending',staffNoticePending:true});
const lore=pilotJobs(state,'g',21).find(j=>j.type==='lore');assert(lore);
acknowledgePilotJob(state,'g',lore,{delivered:true,now:21});assert(!pilotJobs(state,'g',22).some(j=>j.type==='lore'));
console.log('Staff notice checks passed: private content protection, owner/admin fallback, revisions, durable retries, lore, and quiet mode.');

// Exercise the actual command -> persisted queue -> scheduler -> staff DM chain,
// with no pilot season at all, and verify old unflagged lore is not skipped.
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scio-lore-notice-'));
try {
 const store=createStore(path.join(dir,'data.json'));
 const member={id:'owner',user:owner};
 const g={id:'g',name:'Test',fetchOwner:async()=>member,members:{cache:new Map()}};
 const client={guilds:{cache:new Map([['g',g]])}};
 let dispatchPromise;
 const before=notices.length;
 await submitLore({guildId:'g',user:{id:'student'},client,options:{getString:name=>({action:'submit',title:'A Frog story',query:'The Frog returned from Spain.'})[name]},reply:async()=>{}},store,c=>{dispatchPromise=checkPilotSchedules(c,Date.now(),store);return dispatchPromise;});
 await dispatchPromise;
 const saved=store.listLoreSubmissions('g')[0];
 assert.equal(saved.staffNoticePending,false);
 assert(Number.isFinite(saved.staffNotifiedAt));
 assert.equal(notices.length,before+1);
 await checkPilotSchedules(client,Date.now(),store);
 assert.equal(notices.length,before+1,'Delivered lore must not notify twice');
 const legacy={profiles:{},loreSubmissions:[{id:'old',guildId:'g',authorId:'student',status:'pending'}]};
 assert.equal(pilotJobs(legacy,'g',10)[0].id,'old');
 console.log('Lore command notification integration passed, including seasonless delivery and legacy backlog.');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
