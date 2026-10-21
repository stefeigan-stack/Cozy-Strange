import test from 'node:test';import assert from 'node:assert/strict';
import { action, startMatch, removePlayer, publicSnapshot, privateSnapshot, tick } from '../src/sim/engine.js';
import { started,game,advance,at } from './helpers.js';
const rules={firstContractSeconds:5,contractSeconds:15,contractGapSeconds:5,discussionSeconds:5,defenceSeconds:5,votingSeconds:5,verdictSeconds:3};
function crime(n=5){
  const s=started(n,rules);advance(s,5.1);const c={...s.contract};
  at(s,c.assassinId,{x:0,z:6});at(s,c.targetId,{x:.8,z:6});
  assert.equal(action(s,c.assassinId,{type:'kill',targetId:c.targetId}).ok,true);
  const reporter=Object.values(s.players).find(p=>p.alive&&p.id!==c.assassinId);at(s,reporter.id,{x:0,z:6});
  assert.equal(action(s,reporter.id,{type:'report',bodyId:s.bodies[0].id}).ok,true);return {s,c,reporter};
}
test('M3: no contract means no murder; wrong target, range and walls are rejected',()=>{
  const s=started(5,rules);assert.equal(action(s,'host',{type:'kill',targetId:'p1'}).ok,false);
  advance(s,5.1);const c=s.contract;const wrong=Object.keys(s.players).find(id=>id!==c.targetId&&id!==c.assassinId);
  at(s,c.assassinId,{x:0,z:6});at(s,c.targetId,{x:8,z:6});assert.equal(action(s,c.assassinId,{type:'kill',targetId:c.targetId}).ok,false);
  at(s,c.assassinId,{x:0,z:6});assert.equal(action(s,c.assassinId,{type:'kill',targetId:wrong}).ok,false);
  at(s,c.assassinId,{x:-.9,z:0});at(s,c.targetId,{x:.9,z:0});assert.equal(action(s,c.assassinId,{type:'kill',targetId:c.targetId}).ok,false);
});
test('M3: one contract only, expiry/cooldown, and target disconnect cancellation',()=>{
  const s=started(5,rules);advance(s,5.1);const first={...s.contract};advance(s,1);
  assert.deepEqual(s.contract,first);advance(s,14.1);assert.equal(s.contract,null);
  advance(s,5.2);assert.ok(s.contract);assert.notEqual(s.contract.assassinId,first.assassinId);
  removePlayer(s,s.contract.targetId);assert.equal(s.contract,null);
});
test('M3: a report cancels secrets, exposes evidence, and disables dead-player actions',()=>{
  const {s,c}=crime();assert.equal(s.phase,'discussion');assert.equal(s.contract,null);assert.equal(s.trial.evidence.length,3);
  assert.equal(action(s,c.targetId,{type:'chat',text:'ghost'}).ok,false);assert.equal(action(s,c.targetId,{type:'nominate',targetId:c.assassinId}).ok,false);
  const json=JSON.stringify(publicSnapshot(s));assert.equal(json.includes('assassinId'),false);
});
test('M3: full match path through nomination, defence, sealed majority, public elimination and dawn',()=>{
  const {s,c}=crime();let voters=Object.values(s.players).filter(p=>p.alive);
  voters.forEach(p=>action(s,p.id,{type:'nominate',targetId:c.assassinId}));advance(s,5.1);assert.equal(s.phase,'defence');
  const other=voters.find(p=>p.id!==c.assassinId);assert.equal(action(s,other.id,{type:'chat',text:'Interrupt'}).ok,false);
  assert.equal(action(s,c.assassinId,{type:'chat',text:'I was tending herbs.'}).ok,true);advance(s,5.1);assert.equal(s.phase,'voting');
  for(const p of voters)action(s,p.id,{type:'vote',choice:'guilty'});
  assert.equal(action(s,voters[0].id,{type:'vote',choice:'spare'}).ok,false);
  assert.equal(publicSnapshot(s).trial.votes,undefined);assert.equal(privateSnapshot(s,voters[0].id).vote,'guilty');
  advance(s,5.1);assert.equal(s.phase,'verdict');assert.equal(s.players[c.assassinId].alive,false);assert.equal(s.trial.tally.required,3);
  advance(s,3.1);assert.equal(s.phase,'roam');s.elapsed=s.rules.matchSeconds;tick(s,.05);assert.equal(s.phase,'ended');assert.equal(s.result.winners.length,3);
});
test('M3: tied vote and abstentions cannot convict; nomination tie also spares',()=>{
  const {s,c}=crime();const voters=Object.values(s.players).filter(p=>p.alive);
  voters.forEach(p=>action(s,p.id,{type:'nominate',targetId:c.assassinId}));advance(s,10.2);assert.equal(s.phase,'voting');
  voters.forEach((p,i)=>action(s,p.id,{type:'vote',choice:i<2?'guilty':'spare'}));advance(s,5.1);
  assert.equal(s.trial.convictedId,null);assert.equal(s.players[c.assassinId].alive,true);
  const second=crime();const ids=Object.values(second.s.players).filter(p=>p.alive).map(p=>p.id);
  action(second.s,ids[0],{type:'nominate',targetId:ids[1]});action(second.s,ids[1],{type:'nominate',targetId:ids[0]});advance(second.s,5.1);
  assert.equal(second.s.phase,'verdict');assert.equal(second.s.trial.convictedId,null);
});
test('M3: voting electorate is frozen so disconnections do not lower the majority',()=>{
  const {s,c}=crime();const voters=Object.values(s.players).filter(p=>p.alive);
  voters.forEach(p=>action(s,p.id,{type:'nominate',targetId:c.assassinId}));advance(s,10.2);
  const leaving=voters.find(p=>p.id!==c.assassinId);removePlayer(s,leaving.id);
  voters.filter(p=>p.id!==leaving.id).slice(0,2).forEach(p=>action(s,p.id,{type:'vote',choice:'guilty'}));advance(s,5.1);
  assert.equal(s.trial.tally.required,3);assert.equal(s.trial.convictedId,null);
});
test('M3: configurable dawn, last-survivor deadline and prosperity outcomes',()=>{
  const last=started(3,{endgame:'last-survivor'});last.elapsed=last.rules.matchSeconds;tick(last,.05);assert.deepEqual(last.result.winners,[]);
  const prosper=started(3,{endgame:'prosperity',prosperityGoal:50});prosper.players.host.coins=50;tick(prosper,.05);assert.deepEqual(prosper.result.winners,['host']);
  const solo=started(2);removePlayer(solo,'p1');assert.equal(solo.phase,'ended');assert.deepEqual(solo.result.winners,['host']);
  assert.equal(startMatch(game(1)).ok,false);
});
