import test from 'node:test';import assert from 'node:assert/strict';import { readFileSync,existsSync } from 'node:fs';
import { createKit } from '../src/render/models.js';import { HOUSES,STATIONS,walkable } from '../src/sim/world.js';
import { Scene,Mesh,BoxGeometry,MeshStandardMaterial,Box3,Vector3 } from 'three';
import { batchStaticScene } from '../src/render/batch.js';
test('M4: original kit has named reusable models and articulated character parts',()=>{
  const kit=createKit();for(const name of ['cottage','tree','pine','well','press','lamp','fence','bench','flower','crate','character'])assert.ok(kit.getObjectByName(name),name);
  const character=kit.getObjectByName('character');for(const name of ['legL','legR','armL','armR','hatStraw','hatBeret'])assert.ok(character.getObjectByName(name),name);
});
test('M4: generated binary is glTF 2.0 with no external textures or buffers',()=>{
  const file=new URL('../public/assets/mossmere-kit.glb',import.meta.url);assert.ok(existsSync(file),'Run npm run assets first');
  const b=readFileSync(file);assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);
  const length=b.readUInt32LE(12),json=JSON.parse(b.toString('utf8',20,20+length));assert.equal(json.asset.version,'2.0');assert.ok(json.meshes.length>10);assert.ok(json.buffers.every(x=>!x.uri));assert.equal(json.images,undefined);
});
test('M4: every job station is reachable and cottages match shared collision data',()=>{
  for(const [key,p]of Object.entries(STATIONS))assert.ok(walkable(p.x,p.z),key);
  for(const h of HOUSES)assert.equal(walkable(h.x,h.z),false);
});
test('M4: scenery batching preserves transformed bounds and excludes moving objects',()=>{
  const scene=new Scene(),m=new MeshStandardMaterial();
  for(const x of [-4,5]){const cube=new Mesh(new BoxGeometry(1,2,3),m);cube.position.x=x;scene.add(cube);}
  const bounds=new Box3().setFromObject(scene),dynamic=new Mesh(new BoxGeometry(),m);dynamic.position.z=7;scene.add(dynamic);
  const stats=batchStaticScene(scene,new Set([dynamic]));assert.equal(stats.before,2);assert.equal(stats.after,1);assert.equal(dynamic.parent,scene);
  const batch=scene.getObjectByName('StaticSceneryBatch'),after=new Box3().setFromObject(batch);
  assert.ok(after.min.distanceTo(bounds.min)<.0001);assert.ok(after.max.distanceTo(bounds.max)<.0001);
});
