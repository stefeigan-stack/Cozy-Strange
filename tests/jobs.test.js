import test from 'node:test';import assert from 'node:assert/strict';
import { action,removePlayer } from '../src/sim/engine.js';import { STATIONS } from '../src/sim/world.js';import { game,at,advance } from './helpers.js';
test('M1: bread requires pickup and proximity, then awards exactly 18 match coins',()=>{
  const s=game(2);at(s,'host',STATIONS.glasshouse);assert.equal(action(s,'host',{type:'interact'}).ok,false);
  at(s,'host',STATIONS.bakery);assert.equal(action(s,'host',{type:'interact'}).ok,true);assert.equal(s.players.host.coins,0);
  advance(s,3.1);at(s,'host',STATIONS.glasshouse);assert.equal(action(s,'host',{type:'interact'}).ok,true);assert.equal(s.players.host.coins,18);
  at(s,'host',STATIONS.glasshouse);action(s,'host',{type:'interact'});assert.equal(s.players.host.coins,18);
});
test('M3: two randomly paired players both ready at the press earn 26 each once',()=>{
  const s=game(4);for(const id of ['host','p1']){at(s,id,STATIONS.coop);action(s,id,{type:'interact'});}
  assert.equal(s.pairs.length,1);assert.equal(s.players.host.pairId,s.players.p1.pairId);
  advance(s,.3);for(const id of ['host','p1'])action(s,id,{type:'interact'});
  advance(s,3.1);assert.equal(s.players.host.coins,26);assert.equal(s.players.p1.coins,26);assert.equal(s.pairs.length,0);
});
test('M3: co-op requires both nearby and cancels on disconnect',()=>{
  const s=game(3);for(const id of ['host','p1']){at(s,id,STATIONS.coop);action(s,id,{type:'interact'});}
  advance(s,.3);action(s,'host',{type:'interact'});advance(s,4);assert.equal(s.players.host.coins,0);
  s.phase='roam';removePlayer(s,'p1');assert.equal(s.players.host.pairId,null);assert.equal(s.pairs.length,0);
});
test('M2: lobby departures clear paired jobs and readiness before both members disappear',()=>{
  const s=game(4);
  for(const id of ['p1','p2']){at(s,id,STATIONS.coop);action(s,id,{type:'interact'});}
  advance(s,.3);for(const id of ['p1','p2'])action(s,id,{type:'interact'});
  assert.ok(s.players.p2.readyUntil>s.time);
  removePlayer(s,'p1');assert.equal(s.players.p2.pairId,null);assert.equal(s.players.p2.readyUntil,0);
  removePlayer(s,'p2');assert.doesNotThrow(()=>advance(s,1));assert.equal(s.pairs.length,0);
  at(s,'p3',STATIONS.coop);action(s,'p3',{type:'interact'});removePlayer(s,'p3');
  assert.deepEqual(s.pairQueue,[]);assert.equal(s.players.host.coins,0);
});
