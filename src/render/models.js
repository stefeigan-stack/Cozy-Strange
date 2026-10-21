import * as THREE from 'three';

const material = (color,name='') => Object.assign(new THREE.MeshStandardMaterial({color,roughness:.88,flatShading:true}),{name});
const M = {
  wood:material('#785b43'),dark:material('#443d32'),cream:material('#f1dfb6'),wall:material('#eacb91','wall'),
  roof:material('#a85e42','roof'),leaf:material('#71945c'),leafLight:material('#91ad67'),leafDark:material('#4a795d'),
  stone:material('#a5a38b'),water:material('#669e9c'),gold:material('#efc36e'),pink:material('#dc967f'),
  glass:material('#476c67'),white:material('#faf1d8')
};
function mesh(parent,geometry,mat,x=0,y=0,z=0,name=''){
  const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.name=name;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
const box=(g,w,h,d,m,x=0,y=0,z=0,name='')=>mesh(g,new THREE.BoxGeometry(w,h,d),m,x,y,z,name);
const sphere=(g,r,m,x,y,z,detail=1,name='')=>mesh(g,new THREE.IcosahedronGeometry(r,detail),m,x,y,z,name);
const cyl=(g,top,bottom,h,m,x=0,y=0,z=0,n=10,name='')=>mesh(g,new THREE.CylinderGeometry(top,bottom,h,n),m,x,y,z,name);
function roof(g,w,h,d,m,y){
  const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(0,h);shape.lineTo(w/2,0);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false});geo.translate(0,y,-d/2);return mesh(g,geo,m);
}
function cottage(){
  const g=new THREE.Group();
  box(g,5.5,.35,4.5,M.stone,0,.16,0);box(g,5.2,2.7,4.25,M.wall,0,1.65,0);
  roof(g,6,2.15,5.1,M.roof,3);
  box(g,.18,2.9,.17,M.wood,-2.53,1.7,2.18);box(g,.18,2.9,.17,M.wood,2.53,1.7,2.18);
  box(g,5.2,.16,.16,M.wood,0,2.9,2.18);
  box(g,1.05,1.9,.15,M.wood,0,1.3,2.18);sphere(g,.07,M.gold,.32,1.3,2.29,1);
  box(g,1.6,.22,.8,M.stone,0,.24,2.5);
  for(const x of [-1.65,1.65]){
    box(g,.95,1.05,.15,M.cream,x,1.95,2.2);box(g,.73,.81,.05,M.glass,x,1.95,2.29);
    box(g,.065,.8,.04,M.cream,x,1.95,2.34);box(g,.75,.07,.04,M.cream,x,1.95,2.34);
    box(g,1.17,.26,.38,M.wood,x,1.27,2.37);
    for(let i=0;i<4;i++){sphere(g,.19,M.leaf,x-.4+i*.27,1.49,2.4);sphere(g,.09,i%2?M.pink:M.gold,x-.4+i*.27,1.67,2.4);}
  }
  box(g,.7,2,.75,M.cream,1.6,4.1,-.8);box(g,.87,.18,.9,M.stone,1.6,5.1,-.8);
  // Small round attic window and timber eaves.
  const win=cyl(g,.39,.39,.1,M.cream,0,3.6,2.59,16);win.rotation.x=Math.PI/2;
  const glass=cyl(g,.28,.28,.12,M.glass,0,3.6,2.65,16);glass.rotation.x=Math.PI/2;
  box(g,.08,.58,.1,M.cream,0,3.6,2.73);
  return g;
}
function tree(){
  const g=new THREE.Group();cyl(g,.22,.38,3.1,M.wood,0,1.55,0);
  for(const [x,y,z,r] of [[0,3.7,0,1.9],[-1.1,3.1,.2,1.2],[1,3.5,.5,1.3],[.2,3,-1,1.4]])sphere(g,r,y>3.3?M.leaf:M.leafLight,x,y,z,1);
  for(const [x,z]of [[-.8,.9],[1,.4],[.4,-1.1],[-1,-.5]])sphere(g,.16,M.pink,x,3.2,z,1);
  return g;
}
function pine(){const g=new THREE.Group();cyl(g,.18,.29,2.2,M.wood,0,1.1,0);for(let i=0;i<3;i++)cyl(g,0,1.7-i*.32,2.6,M.leafDark,0,2.2+i*.8,0,8);return g;}
function well(){const g=new THREE.Group();
  cyl(g,1.25,1.3,.65,M.stone,0,.33,0,14);cyl(g,.92,.92,.03,M.water,0,.68,0,14);
  for(const x of [-1.15,1.15])box(g,.17,2.6,.18,M.wood,x,1.3,0);
  roof(g,3,1,2.3,M.roof,2.5);const beam=cyl(g,.08,.08,2.6,M.wood,0,1.9,0,8);beam.rotation.z=Math.PI/2;
  cyl(g,.018,.018,1.1,M.cream,0,1.38,0,6);cyl(g,.25,.2,.38,M.wood,0,.92,0,8);return g;}
function press(){const g=new THREE.Group();
  box(g,1.5,.25,1.3,M.wood,0,.4,0);for(const x of [-.6,.6])for(const z of [-.5,.5])box(g,.16,.8,.16,M.wood,x,.4,z);
  cyl(g,.6,.55,.65,M.wood,0,.82,0,12);cyl(g,.49,.49,.05,M.gold,0,1.17,0,12);
  for(const x of [-.72,.72])box(g,.15,1.8,.17,M.dark,x,1.1,0);box(g,1.7,.16,.23,M.dark,0,1.95,0);
  cyl(g,.065,.065,1.3,M.cream,0,1.8,0,8);box(g,.8,.1,.1,M.wood,0,2.4,0);return g;}
function lamp(){const g=new THREE.Group();cyl(g,.06,.09,2.9,M.wood,0,1.45,0,6);box(g,.7,.08,.1,M.wood,.25,2.86,0);
  const glow=material('#f5d98b');glow.emissive.set('#f3b640');glow.emissiveIntensity=.4;
  box(g,.32,.48,.32,glow,.5,2.5,0);cyl(g,0,.32,.25,M.dark,.5,2.87,0,4);box(g,.4,.08,.4,M.dark,.5,2.22,0);return g;}
function fence(){const g=new THREE.Group();for(const x of [-1.1,1.1]){box(g,.14,1,.14,M.cream,x,.5,0);cyl(g,0,.15,.17,M.cream,x,1.08,0,4);}
  for(const y of [.35,.72])box(g,2.4,.14,.12,M.cream,0,y,0);return g;}
function bench(){const g=new THREE.Group();for(const x of [-.85,.85])for(const z of [-.24,.24])box(g,.13,.58,.14,M.wood,x,.29,z);
  box(g,2,.15,.8,M.wood,0,.64,0);box(g,2,.55,.12,M.wood,0,1.04,-.36);return g;}
function flower(){const g=new THREE.Group();cyl(g,.018,.018,.4,M.leafDark,0,.2,0,5);for(let i=0;i<5;i++)sphere(g,.09,M.white,Math.sin(i*6.28/5)*.11,.44,Math.cos(i*6.28/5)*.11,0);sphere(g,.075,M.gold,0,.48,0,0);return g;}
function crate(){const g=new THREE.Group();box(g,.8,.5,.65,M.wood,0,.25,0);for(const y of [.13,.4])box(g,.84,.06,.68,M.cream,0,y,0);for(let i=0;i<5;i++)sphere(g,.15,M.pink,(i%3-1)*.23,.6,(Math.floor(i/3)-.5)*.22);return g;}
function character(){
  const g=new THREE.Group();
  const coat=material('#d48658','coat'),skin=material('#eac5a2','skin'),hair=material('#443229','hair');
  for(const x of [-.17,.17]){
    const leg=new THREE.Group();leg.name=x<0?'legL':'legR';leg.position.set(x,.69,0);g.add(leg);
    box(leg,.23,.5,.25,M.dark,0,-.25,0);box(leg,.26,.17,.38,M.wood,0,-.51,.065);
  }
  cyl(g,.31,.41,.7,coat,0,1.04,0,10,'coatBody');
  box(g,.075,.62,.03,M.cream,0,1.06,.315);for(const y of [.9,1.1,1.3])sphere(g,.035,M.dark,.1,y,.32,0);
  for(const x of [-.42,.42]){
    const arm=new THREE.Group();arm.name=x<0?'armL':'armR';arm.position.set(x,1.27,0);g.add(arm);
    cyl(arm,.13,.115,.49,coat,0,-.22,0,8);sphere(arm,.125,skin,0,-.5,0,1);
  }
  const head=new THREE.Group();head.name='head';head.position.y=1.65;g.add(head);
  sphere(head,.41,skin,0,0,0,2).scale.set(1,1.05,.95);
  sphere(head,.43,hair,0,.14,-.07,1).scale.set(1,.8,.9);
  for(const x of [-.15,.15]){
    sphere(head,.04,M.dark,x,.01,.35,1);sphere(head,.055,M.pink,x*1.4,-.1,.32,1).scale.set(1,.55,.3);
  }
  sphere(head,.06,skin,0,-.06,.39,1);
  const straw=new THREE.Group();straw.name='hatStraw';head.add(straw);
  cyl(straw,.57,.57,.06,M.gold,0,.32,0,12);cyl(straw,.3,.37,.28,M.gold,0,.47,0,12);cyl(straw,.376,.376,.07,M.wood,0,.35,0,12);
  const beret=new THREE.Group();beret.name='hatBeret';head.add(beret);sphere(beret,.43,coat,.06,.35,0,1).scale.set(1,.42,1);cyl(beret,.04,.04,.12,coat,.05,.56,0,6);
  return g;
}
export function createKit(){
  const kit=new THREE.Group();kit.name='MossmereOriginalKit';
  for(const [name,fn]of Object.entries({cottage,tree,pine,well,press,lamp,fence,bench,flower,crate,character})){
    const model=fn();model.name=name;kit.add(model);
  }
  return kit;
}
