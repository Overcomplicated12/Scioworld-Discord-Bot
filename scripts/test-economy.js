import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../src/store.js';
import { selectTriviaDifficulty, triviaDifficultyForStreak } from '../src/questions.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'scio-economy-'));
try {
 const s=createStore(path.join(dir,'state.json'));let now=Date.UTC(2030,0,1);
 const answer=id=>{assert.equal(s.startTrivia('g','a',id,now).started,true);const r=s.answerTrivia('g','a',id,0,now+1,0);now+=31000;return r;};
 assert.equal(answer('q1').coins,2);assert.equal(answer('q1').coins,0);
 for(let j=2;j<=15;j++) assert.equal(answer('q'+j).coins,2);
 assert.equal(answer('q16').coins,0);
 assert.equal(triviaDifficultyForStreak(0),'easy');
 assert.equal(triviaDifficultyForStreak(3),'medium');
 assert.equal(triviaDifficultyForStreak(6),'hard');
 const difficultyPool=[{difficulty:'easy'},{difficulty:'medium'},{difficulty:'hard'}];
 assert.equal(selectTriviaDifficulty(difficultyPool,undefined,0)[0].difficulty,'easy');
 assert.equal(selectTriviaDifficulty(difficultyPool,undefined,3)[0].difficulty,'medium');
 assert.equal(selectTriviaDifficulty(difficultyPool,undefined,6)[0].difficulty,'hard');
 assert.equal(selectTriviaDifficulty(difficultyPool,'easy',6)[0].difficulty,'hard');
 now+=86400000;assert.equal(answer('q1').coins,2);
 const before=s.getOrCreate('g','a').coins;
 const q={id:'q',choices:['a','b'],answer:0};
 for(let n=0;n<7;n++){
  const r=s.createRace('g','a','science',['q'],now).race;s.joinRace('g','b',r.id);s.startRace('g','a',r.id,now);
  assert.equal(s.startRace('g','a',r.id,now).started,false);
  const result=s.answerRace('g','a',r.id,0,q,now);
  assert.equal(result.rewards.a.coins,n<6?5:0);
  assert.equal(s.startRace('g','a',r.id,now).started,false);
 }
 assert.equal(s.getOrCreate('g','a').coins,before+30);
 assert.equal(s.claimDaily('g','a','2030-01-03','2030-01-02').reward,2);
 assert.equal(s.claimDaily('g','a','2030-01-10','2030-01-09').reward,2);
 assert.equal(s.claimDaily('g','a','2030-01-10','2030-01-09').claimed,false);
 console.log('Economy checks passed: unique daily trivia, weekly race limits, no race replay payouts, flat optional daily reward.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
