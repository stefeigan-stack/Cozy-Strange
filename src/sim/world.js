export const WORLD_RADIUS = 27;
export const HOUSES = [
  { x:-12,z:-11,color:'ochre',name:'Honeycrust bakery',rotation:0 },
  { x:-3,z:-17,color:'sage',name:'Fern cottage',rotation:0 },
  { x:6,z:-11,color:'rose',name:'The glasshouse',rotation:0 },
  { x:-18,z:1,color:'rose',name:'Clover cottage',rotation:Math.PI/2 },
  { x:-10,z:15,color:'sage',name:'Willow cottage',rotation:Math.PI },
  { x:3,z:16,color:'ochre',name:'The post house',rotation:Math.PI }
];
export const STATIONS = Object.freeze({
  bakery:{x:-12,z:-7,label:'Honeycrust bakery',icon:'bread'},
  glasshouse:{x:6,z:-7,label:'The glasshouse',icon:'leaf'},
  garden:{x:-18,z:10,label:'Herb garden',icon:'leaf'},
  well:{x:0,z:3,label:'Village well',icon:'drop'},
  coop:{x:6,z:6,label:'Orchard press',icon:'pair'},
  orchard:{x:21,z:-6,label:'Apple orchard',icon:'leaf'}
});
export const OBSTACLES = [
  ...HOUSES.map(h => ({type:'box',x:h.x,z:h.z,w:h.rotation===Math.PI/2?4.5:5.5,d:h.rotation===Math.PI/2?5.5:4.5})),
  {type:'circle',x:0,z:0,r:1.3},
  {type:'circle',x:6,z:4.3,r:0.8}
];
export const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
export function walkable(x,z,r = 0.32) {
  if (!Number.isFinite(x)||!Number.isFinite(z)||Math.hypot(x,z)>WORLD_RADIUS-r) return false;
  // The river has one traversable bridge, at z=5.
  if (x>12-r && x<16+r && Math.abs(z-5)>1.65-r) return false;
  return !OBSTACLES.some(o=>o.type==='circle' ? Math.hypot(x-o.x,z-o.z)<o.r+r : Math.abs(x-o.x)<o.w/2+r && Math.abs(z-o.z)<o.d/2+r);
}
export function movePosition(p,dx,dz) {
  if (walkable(p.x+dx,p.z)) p.x+=dx;
  if (walkable(p.x,p.z+dz)) p.z+=dz;
}
export function clearPath(a,b) {
  const n = Math.ceil(distance(a,b)/0.25);
  for(let i=1;i<n;i++) if(!walkable(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n,0.05)) return false;
  return true;
}
export function region(p) {
  if (p.x>16) return 'the apple orchard';
  if (p.x<-13&&p.z>5) return 'the herb garden';
  if (p.z<-7) return 'the cottage lane';
  if (p.z>10) return 'the southern cottages';
  return 'the village green';
}
