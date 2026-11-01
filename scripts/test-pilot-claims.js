import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.js';
import { DAY } from '../src/pilot.js';
const config=JSON.parse(fs.readFileSync(new URL('../content/pilot/season.json',import.meta.url)));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scio-claims-'));
try {
 const file=path.join(dir,'state.json');const s=createStore(file);const now=Date.now();
 for(const id of ['a','b'])s.getOrCreate('g',id);
 const run=(action,args={},user='admin',at=now)=>s.pilot('g',user,action,args,at,user==='admin');
 config.simulation=false;config.inventory=1;
 run('create',{config,start:new Date(now-1000).toISOString(),channelId:'c'});run('activate');
 const original=JSON.parse(fs.readFileSync(`${file}.pre-pilot.bak`));assert.equal(original.profiles['g:a'].coins,100);
 for(const user of ['a','b']){
  run('answer',{choice:0},user);
  const lore=s.createLoreSubmission('g',user,'A new Frog experiment','The Frog made a prediction, checked it, and changed his mind.');
  run('reward-lore',{submissionId:lore.id,reason:'Original and coherent contribution'});
  assert.equal(s.listLoreSubmissions('g').find(x=>x.id===lore.id).status,'pending','Reward approval does not publish');
  const second=s.createLoreSubmission('g',user,'More Frog','A second story.');
  assert.equal(run('reward-lore',{submissionId:second.id,reason:'Second story'}).awarded,false);
  assert.equal(run('passport',{},user).stamps,3);
 }
 run('claims-open',{policyMessageUrl:'https://discord.com/channels/g/c/message'});
 for(const user of ['a','b']){run('claim',{},user);run('claim',{},user);}
 assert.equal(run('report').claims,2);
 run('claim-review',{userId:'a',decision:'approved',reason:'Eligibility checked'});
 assert.throws(()=>run('claim-review',{userId:'b',decision:'approved',reason:'Eligibility checked'}),/reserved/);
 assert.equal(run('passport',{},'b').claim.status,'pending');
 assert.throws(()=>run('stock',{count:0}),/reserved/);
 run('stock',{count:2});run('claim-review',{userId:'b',decision:'approved',reason:'Capacity added for all qualified students'});
 run('claim-review',{userId:'a',decision:'fulfilled',reason:'Organizer confirmed external fulfillment'});
 run('claim-review',{userId:'a',decision:'fulfilled',reason:'Retry'});
 assert.equal(s.getOrCreate('g','a').seasonStickers.length,1);
 assert.equal(s.getOrCreate('g','a').coins,117);
 // Close/restart correctness rewards once and preserve existing inventory.
 const before=s.getOrCreate('g','a').collectibles;
 s.getPilotJobs('g',now+6*DAY);s.getPilotJobs('g',now+6*DAY);
 const restarted=createStore(file);assert.equal(restarted.getOrCreate('g','a').coins,120);
 assert.equal(restarted.getOrCreate('g','a').knowledgePoints,6);
 assert.deepEqual(restarted.getOrCreate('g','a').collectibles,before);
 assert.throws(()=>s.pilot('other','a','passport',{season:config.id},now),/No season/);
 run('opt-out',{enabled:true},'b');assert.throws(()=>run('discuss',{text:'hello'},'b'),/opted out/);
 run('feedback',{text:'I enjoyed the weekly pace.'},'a');assert.throws(()=>run('feedback',{text:'again'},'a'),/already/);
 console.log('Claim checks passed: lore publication independence and cap, real balances, inventory, retries, fulfilled collection, privacy, backups, guild isolation.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
