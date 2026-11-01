import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStore} from '../src/store.js';
import {DAY,validatePilot} from '../src/pilot.js';
const config=validatePilot(JSON.parse(fs.readFileSync(new URL('../content/pilot/season.json',import.meta.url))));
assert.equal(config.activities.length,14);
for(const [day,a] of config.activities.entries()){assert.equal(a.openDay,day);assert.equal(a.closeDay,day+1);}
assert.equal(new Set(config.activities.map(a=>a.prompt)).size,14);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scio-daily-'));
try{
 const s=createStore(path.join(dir,'state.json'));const now=Date.UTC(2030,0,1);
 s.getOrCreate('g','a');
 s.pilot('g','admin','create',{config,start:new Date(now).toISOString(),channelId:'c'},now,true);
 s.pilot('g','admin','activate',{},now,true);
 for(let day=0;day<14;day++){
  const at=now+day*DAY;
  assert.equal(s.pilot('g','a','weekly',{},at).activity.id,config.activities[day].id);
  assert.equal(s.pilot('g','a','weekly',{},at).activity.correct,undefined);
  s.pilot('g','a','answer',{choice:0},at);
  s.pilot('g','a','answer',{choice:1},at+1);
 }
 assert.equal(s.pilot('g','a','passport',{},now+14*DAY).stamps,14);
 assert.equal(s.pilot('g','admin','report',{},now+14*DAY,true).retentionPercent,100);
 console.log('Daily question checks passed: 14 unique prompts, daily rollover, hidden answers, and no revision double-pay.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
