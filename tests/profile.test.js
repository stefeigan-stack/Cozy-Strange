import test from 'node:test';import assert from 'node:assert/strict';
import { sanitizeProfile,saveProfile,loadProfile } from '../src/profile.js';
test('M1: only cosmetic fields persist; match currency and contracts never persist',()=>{
  const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
  saveProfile(storage,{name:'Clover',coat:'#6d8d81',hat:'beret',coins:900,contract:{targetId:'x'},alive:false});
  const p=loadProfile(storage);assert.equal(p.name,'Clover');assert.equal(p.hat,'beret');assert.equal(p.coins,undefined);assert.equal(p.contract,undefined);assert.equal(p.alive,undefined);
});
test('M1: malformed storage, invalid colours and overlong names safely fall back',()=>{
  assert.equal(loadProfile({getItem:()=>'{broken'}).name,'Wanderer');
  assert.equal(sanitizeProfile({name:'a'.repeat(100),coat:'url(evil)'}).name.length,18);
  assert.equal(sanitizeProfile({coat:'url(evil)'}).coat,'#d48658');
  assert.equal(saveProfile({setItem:()=>{throw Error();}},{}),false);
});
