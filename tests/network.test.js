import test from 'node:test';import assert from 'node:assert/strict';
import { HostAuthority } from '../src/net/authority.js';import { envelope,PEER_OPTIONS } from '../src/net/protocol.js';import { createGame,tick } from '../src/sim/engine.js';
test('M2: two independent transport inboxes receive authoritative positions and personalized views',()=>{
  const mail={host:[],remote:[]},s=createGame();let clock=0;
  const host=new HostAuthority(s,(id,m)=>mail[id].push(structuredClone(m)),()=>clock);
  host.admit('host',{name:'A'});host.admit('remote',{name:'B'});
  host.receive('remote',envelope('input',{x:1,z:0},0));tick(s,.05);host.publish();
  assert.deepEqual(mail.host[0].state,mail.remote[0].state);assert.equal(mail.remote[1].state.id,'remote');
  assert.equal(mail.host[1].state.id,'host');assert.ok(s.players.remote.x>-1.2);
});
test('M2: replayed, oversized, malformed, spoofed identities and remote start rejected',()=>{
  const s=createGame(),h=new HostAuthority(s,()=>{},()=>0);h.admit('host',{});h.admit('remote',{});
  const m=envelope('input',{x:1,z:0,playerId:'host'},1);assert.equal(h.receive('remote',m),true);
  assert.equal(s.players.host.input.x,0);assert.equal(s.players.remote.input.x,1);assert.equal(h.receive('remote',m),false);
  assert.equal(h.receive('remote',envelope('start',{},2)),false);assert.equal(s.phase,'lobby');
  assert.equal(h.receive('remote',envelope('action',{type:'chat',text:'x'.repeat(5000)},3)),false);
  assert.equal(h.receive('unknown',envelope('start',{},0)),false);assert.equal(h.receive('remote',{v:7,seq:4,kind:'input'}),false);
});
test('M2: rate limit, heartbeat timeout, and lobby disconnect remove stale peer',()=>{
  let now=0;const s=createGame(),h=new HostAuthority(s,()=>{},()=>now);h.admit('host',{});h.admit('remote',{});
  let accepted=0;for(let i=0;i<200;i++)accepted+=h.receive('remote',envelope('input',{x:0,z:0},i))?1:0;
  assert.equal(accepted,80);now=11000;assert.deepEqual(h.checkTimeouts(),['remote']);assert.equal(s.players.remote,undefined);
});
test('M2: ICE configuration is explicitly STUN-only with no TURN credentials',()=>{
  assert.ok(PEER_OPTIONS.config.iceServers.every(s=>s.urls.startsWith('stun:')));
  assert.equal(JSON.stringify(PEER_OPTIONS).includes('credential'),false);
});
