import test from 'node:test';import assert from 'node:assert/strict';
import { publicSnapshot,privateSnapshot } from '../src/sim/engine.js';import { HostAuthority } from '../src/net/authority.js';import { started,advance } from './helpers.js';
test('M2: public state contains no contract, assassin, target, future assignment, or RNG',()=>{
  const s=started(5,{firstContractSeconds:5});advance(s,5.1);assert.ok(s.contract);
  const publicJSON=JSON.stringify(publicSnapshot(s));for(const key of ['assassinId','targetId','contract','nextContractAt','random','lastContractHolder'])assert.equal(publicJSON.includes(`"${key}"`),false,key);
  for(const id of Object.keys(s.players))assert.equal(!!privateSnapshot(s,id).contract,id===s.contract.assassinId);
});
test('M2: actual authority fanout sends contract data only to its holder',()=>{
  const s=started(5,{firstContractSeconds:5});advance(s,5.1);const messages=[];
  const h=new HostAuthority(s,(id,message)=>messages.push({id,message}));
  for(const id of Object.keys(s.players))h.peers.set(id,{});h.publish();
  const secrets=messages.filter(m=>m.message.type==='private'&&m.message.state.contract);
  assert.equal(secrets.length,1);assert.equal(secrets[0].id,s.contract.assassinId);
});
