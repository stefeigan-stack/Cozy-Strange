import test from 'node:test';import assert from 'node:assert/strict';
import { input,tick } from '../src/sim/engine.js';import { walkable,clearPath } from '../src/sim/world.js';import { game } from './helpers.js';
test('M1: normalized movement, sprint cap, and stale input timeout',()=>{
  const s=game(1),p=s.players.host;p.x=0;p.z=6;
  input(s,'host',{x:999,z:999,sprint:true});tick(s,.05);
  assert.ok(Math.hypot(p.x,p.z-6)<=5.4*.05+.00001);
  for(let i=0;i<12;i++)tick(s,.05);const x=p.x;tick(s,.05);assert.equal(p.x,x);
});
test('M1: invalid coordinates and client teleport fields are rejected or ignored',()=>{
  const s=game(1);assert.equal(input(s,'host',{x:NaN,z:0}).ok,false);
  assert.equal(input(s,'host',{x:0,z:Infinity}).ok,false);
  input(s,'host',{x:0,z:0,position:{x:100,z:100}});tick(s,.05);assert.ok(s.players.host.x<10);
});
test('M1: houses, village boundary and river are solid; bridge is walkable',()=>{
  assert.equal(walkable(-12,-11),false);assert.equal(walkable(30,0),false);
  assert.equal(walkable(14,0),false);assert.equal(walkable(14,5),true);
  assert.equal(clearPath({x:11,z:0},{x:17,z:0}),false);
});
