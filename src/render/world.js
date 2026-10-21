import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HOUSES, STATIONS, walkable } from '../sim/world.js';
import { seededRandom } from '../sim/config.js';
import { jobStation } from '../sim/engine.js';
import { batchStaticScene } from './batch.js';

const mat=(c,extra={})=>new THREE.MeshStandardMaterial({color:c,roughness:.94,flatShading:true,...extra});
export class VillageRenderer {
  constructor(canvas){
    this.canvas=canvas;
    try {this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}
    catch {this.renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'default'});}
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#bed2c3');this.scene.fog=new THREE.Fog('#bed2c3',45,125);
    this.camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.1,220);
    this.scene.add(new THREE.HemisphereLight('#fff4d8','#687e63',2.2));
    this.sun=new THREE.DirectionalLight('#ffe2a6',3.2);this.sun.position.set(-20,35,18);
    this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.camera.left=-35;this.sun.shadow.camera.right=35;
    this.sun.shadow.camera.top=35;this.sun.shadow.camera.bottom=-35;this.sun.shadow.camera.near=1;this.sun.shadow.camera.far=100;
    this.sun.shadow.normalBias=.055;this.sun.shadow.bias=-.00015;this.scene.add(this.sun);
    this.actors=new Map();this.bodyModels=new Map();this.labels=new Map();this.clouds=[];this.smoke=[];
    this.yaw=.35;this.pitch=.62;this.zoom=11;this.mapMode=false;this.ready=false;this.state=null;this.priv=null;this.selfId=null;
    this.focus=new THREE.Vector3(0,1,4);this.mode='menu';this.time=0;
    this.labelLayer=document.createElement('div');this.labelLayer.className='world-labels';document.body.append(this.labelLayer);
    this.resize=()=>{this.renderer.setSize(innerWidth,innerHeight,false);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();};
    addEventListener('resize',this.resize);this.resize();
    let dragging=false,lastX=0,lastY=0;
    canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(!dragging)return;this.yaw-=(e.clientX-lastX)*.006;this.pitch=THREE.MathUtils.clamp(this.pitch+(e.clientY-lastY)*.004,.32,1.25);lastX=e.clientX;lastY=e.clientY;});
    canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=THREE.MathUtils.clamp(this.zoom+e.deltaY*.012,6,18);},{passive:false});
  }
  async load(){
    const gltf=await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/mossmere-kit.glb`);
    this.kit=gltf.scene;this.buildVillage();this.ready=true;
  }
  model(name,x=0,z=0,scale=1,rotation=0){
    const m=this.kit.getObjectByName(name).clone(true);m.position.set(x,0,z);m.scale.setScalar(scale);m.rotation.y=rotation;
    m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});this.scene.add(m);return m;
  }
  add(geo,material,x=0,y=0,z=0){const mesh=new THREE.Mesh(geo,material);mesh.position.set(x,y,z);mesh.receiveShadow=true;this.scene.add(mesh);return mesh;}
  path(points,width,color='#d2c3a0'){
    const curve=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,.028,z)));
    const positions=[],indices=[];const samples=curve.getPoints(80);
    samples.forEach((p,i)=>{
      const tangent=curve.getTangent(i/80);const side=new THREE.Vector3(-tangent.z,0,tangent.x).multiplyScalar(width/2);
      positions.push(p.x+side.x,p.y,p.z+side.z,p.x-side.x,p.y,p.z-side.z);
      if(i<80){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
    });
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();this.add(g,mat(color));
  }
  buildVillage(){
    const rand=seededRandom(87),grass=mat('#91ab73'),earth=mat('#aa9672'),sand=mat('#dac7a0'),water=mat('#7aaba7',{roughness:.38,metalness:.06});
    this.add(new THREE.CylinderGeometry(29.4,28.5,1.8,96),earth,0,-1.02,0);
    this.add(new THREE.CylinderGeometry(30.5,30.5,.22,96),sand,0,-.86,0);
    this.add(new THREE.CylinderGeometry(29.4,29.4,.18,96),grass,0,-.1,0);
    this.water=this.add(new THREE.PlaneGeometry(1000,1000),water,0,-.97,0);this.water.rotation.x=-Math.PI/2;
    const river=this.add(new THREE.PlaneGeometry(4,53.4),water,14,.025,0);river.rotation.x=-Math.PI/2;
    for(const x of [11.75,16.25]){const bank=this.add(new THREE.PlaneGeometry(.55,53.4),sand,x,.02,0);bank.rotation.x=-Math.PI/2;}
    this.path([[-23,6],[-12,5],[-4,3],[0,0],[4,-4],[6,-7]],2.8);
    this.path([[-12,-7],[-10,-3],[-4,0],[0,0],[7,4],[11,5],[20,5],[22,0],[21,-6]],2.5);
    this.path([[-3,-14],[-3,-6],[0,0],[0,7],[-2,11],[-10,11]],2.3);
    this.path([[-18,10],[-12,9],[-6,5]],1.7);
    this.path([[3,12],[0,7],[0,0]],2.2);
    const plaza=this.add(new THREE.CylinderGeometry(4.5,4.5,.07,48),mat('#c3b599'),0,.03,0);
    for(let i=0;i<25;i++){
      const a=i/25*Math.PI*2;
      const stone=this.add(new THREE.BoxGeometry(.66,.07,.27),mat(i%2?'#e0cfad':'#bcae90'),Math.sin(a)*4.2,.09,Math.cos(a)*4.2);stone.rotation.y=a;
    }
    for(const h of HOUSES){
      const house=this.model('cottage',h.x,h.z,1,h.rotation);
      const c={ochre:['#e8ce98','#ac6247'],sage:['#b7c7a4','#597c70'],rose:['#dfb29e','#855e5c']}[h.color];
      house.traverse(o=>{if(o.isMesh&&['wall','roof'].includes(o.material.name)){o.material=o.material.clone();o.material.color.set(c[o.material.name==='wall'?0:1]);}});
      for(let i=0;i<3;i++){
        const puff=this.add(new THREE.IcosahedronGeometry(.34,1),mat('#ece1cb',{transparent:true,opacity:.4}),h.x+1.6,5.5+i*.6,h.z-.8);
        this.smoke.push({mesh:puff,x:h.x+1.6,z:h.z-.8,offset:i*1.5+rand()*5});
      }
    }
    this.model('well');this.model('press',6,4.3);this.model('crate',7.5,4.2);this.model('crate',8.5,4.4,.8);
    this.model('bench',-4.9,-3,1,.5);this.model('bench',3.7,2.8,1,-2.2);
    for(const [x,z]of[[-7,-5],[8,-3],[-4,9],[10,5],[-15,6],[3,-13]])this.model('lamp',x,z);
    // Wooden bridge: deck aligns with the simulation's one river crossing.
    const timber=mat('#ac8860');
    for(let i=0;i<13;i++)this.add(new THREE.BoxGeometry(.4,.18,3.15),timber,11.6+i*.4,.17,5);
    for(const z of [3.55,6.45]){
      this.add(new THREE.BoxGeometry(5.4,.13,.12),mat('#d6bd90'),14,1.04,z);
      for(const x of [11.5,14,16.5])this.add(new THREE.BoxGeometry(.16,1.1,.16),timber,x,.55,z);
    }
    for(let i=0;i<9;i++){
      const x=19+(i%3)*2.6,z=-12+Math.floor(i/3)*4.5;
      if(Math.hypot(x,z)<27)this.model('tree',x,z,.8+(i%2)*.1);
    }
    for(let i=0;i<26;i++){
      const a=i/26*Math.PI*2,r=26+rand()*2;
      const x=Math.sin(a)*r,z=Math.cos(a)*r;
      if(x>10&&x<18)continue;
      this.model(i%3===0?'pine':'tree',x,z,.75+rand()*.4,rand()*6.28);
    }
    for(const [x,z,sc]of[[-20,-9,.85],[-21,15,.9],[-11,-20,1],[-7,-7,.75],[7,10,.8],[-17,-18,.85],[6,-21,.9]])this.model('tree',x,z,sc);
    for(const [x,z,rot]of[[-20,7,0],[-17.6,7,0],[-15.2,7,0],[-20,13,0],[-17.6,13,0],[-15.2,13,0],[-21.2,10,Math.PI/2]])this.model('fence',x,z,1,rot);
    for(let row=0;row<3;row++){
      this.add(new THREE.BoxGeometry(3,.1,.7),mat('#8d7553'),-18,.08,9+row*1.1);
      for(let i=0;i<5;i++){
        const herb=this.add(new THREE.IcosahedronGeometry(.27,0),mat(i%2?'#829857':'#597f64'),-19.2+i*.6,.3,9+row*1.1);herb.scale.y=1.4;
      }
    }
    // Deterministic meadow, instanced to keep draw calls modest.
    const grassGeo=new THREE.ConeGeometry(.06,.27,3),grassMesh=new THREE.InstancedMesh(grassGeo,mat('#7a995c'),1000);
    const matrix=new THREE.Matrix4(),color=new THREE.Color();let count=0;
    for(let i=0;i<3000&&count<1000;i++){
      const x=(rand()-.5)*55,z=(rand()-.5)*55;
      if(!walkable(x,z)||Math.abs(x)<4||Math.abs(z-5)<2||Math.hypot(x,z)<6)continue;
      matrix.makeTranslation(x,.16,z);grassMesh.setMatrixAt(count,matrix);color.setHSL(.22+rand()*.05,.22,.4+rand()*.12);grassMesh.setColorAt(count++,color);
    }grassMesh.count=count;this.scene.add(grassMesh);
    for(let i=0;i<65;i++){
      const x=(rand()-.5)*49,z=(rand()-.5)*48;
      if(walkable(x,z)&&Math.hypot(x,z)>6&&!(Math.abs(x)<4)&&!(Math.abs(z-5)<2))this.model('flower',x,z,.6+rand()*.7);
    }
    for(let i=0;i<16;i++){
      const a=rand()*Math.PI*2,r=29+rand()*.8;
      const rock=this.add(new THREE.IcosahedronGeometry(.6+rand()*.5,0),mat('#969c83'),Math.sin(a)*r,-.4,Math.cos(a)*r);rock.scale.y=.65;
    }
    // Quiet landscape silhouettes and soft clouds beyond the playable island.
    for(let i=0;i<8;i++){
      const mountain=this.add(new THREE.ConeGeometry(12+rand()*10,15+rand()*10,6),mat(i%2?'#98b4a0':'#a6bfaa'),-75+i*22,-2,-65-rand()*15);mountain.rotation.y=rand()*3;
    }
    for(let i=0;i<9;i++){
      const g=new THREE.Group();for(let j=0;j<4;j++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(2,1),mat('#e5e7d6'));m.position.set(j*2,Math.sin(j)*.5,0);m.scale.set(1.2,.5,.8);g.add(m);}
      g.position.set(-65+i*17,22+rand()*12,-35-rand()*40);this.scene.add(g);this.clouds.push(g);
    }
    this.marker=new THREE.Group();
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.6,.045,8,32),new THREE.MeshBasicMaterial({color:'#fff1b5'}));ring.rotation.x=Math.PI/2;this.marker.add(ring);
    const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.19),mat('#f5d88a',{emissive:'#e5bd53',emissiveIntensity:.3}));gem.position.y=1.9;this.marker.add(gem);
    this.scene.add(this.marker);this.marker.visible=false;
    const fireflyGeo=new THREE.BufferGeometry(),pos=[];for(let i=0;i<60;i++)pos.push((rand()-.5)*50,.6+rand()*2,(rand()-.5)*50);
    fireflyGeo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));this.fireflies=new THREE.Points(fireflyGeo,new THREE.PointsMaterial({color:'#ffedb0',size:.07,transparent:true,opacity:.6}));this.scene.add(this.fireflies);
    this.sceneryStats=batchStaticScene(this.scene,new Set([...this.clouds,...this.smoke.map(s=>s.mesh),this.marker,this.fireflies]));
  }
  makeActor(p){
    const model=this.model('character',p.x,p.z);model.traverse(o=>{if(o.isMesh){o.material=o.material.clone();if(o.material.name==='coat')o.material.color.set(p.profile.coat);if(o.material.name==='skin')o.material.color.set(p.profile.skin);if(o.material.name==='hair')o.material.color.set(p.profile.hair);}});
    model.getObjectByName('hatStraw').visible=p.profile.hat==='straw';model.getObjectByName('hatBeret').visible=p.profile.hat==='beret';
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(.46,20),new THREE.MeshBasicMaterial({color:'#364739',transparent:true,opacity:.19,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.035;model.add(shadow);
    const label=document.createElement('div');label.className='name-tag';label.textContent=p.profile.name+(p.bot?' · CPU':'');this.labelLayer.append(label);
    const a={model,label,profile:JSON.stringify(p.profile),target:new THREE.Vector3(p.x,0,p.z),last:new THREE.Vector3(p.x,0,p.z),phase:0,wasAlive:true,deadAt:0};this.actors.set(p.id,a);return a;
  }
  setState(state,id,priv){this.state=state;this.selfId=id;this.priv=priv;this.mode='game';}
  menu(profile){
    this.mode='menu';this.marker.visible=false;
    const p={id:'preview',x:-3,z:6,profile,alive:true};
    const a=this.actors.get('preview');if(a&&a.profile!==JSON.stringify(profile))this.removeActor('preview');
    if(this.ready&&!this.actors.has('preview'))this.makeActor(p);
    for(const [id,a]of this.actors){a.model.visible=id==='preview';a.label.style.display='none';}
  }
  removeActor(id){const a=this.actors.get(id);if(a){this.scene.remove(a.model);a.label.remove();a.model.traverse(o=>{if(o.isMesh)o.material.dispose();});this.actors.delete(id);}}
  update(dt,elapsed){
    if(!this.ready)return;
    this.time=elapsed;
    this.clouds.forEach((c,i)=>c.position.x+=dt*(.1+i*.008));
    this.smoke.forEach(({mesh,x,z,offset})=>{const t=(elapsed*.4+offset)%3;mesh.position.set(x+Math.sin(t)*.4,5.3+t,z+t*.15);mesh.scale.setScalar(.8+t*.25);mesh.material.opacity=.3*(1-t/3);});
    this.fireflies.rotation.y=Math.sin(elapsed*.03)*.04;
    if(this.mode==='menu'){
      const a=elapsed*.025;this.camera.position.set(33+Math.sin(a)*3,29,39+Math.cos(a)*2);this.camera.lookAt(-1,0,-1);
    }else if(this.state){
      const s=this.state;
      if(this.actors.has('preview'))this.actors.get('preview').model.visible=false;
      for(const p of s.players){
        let a=this.actors.get(p.id);
        if(a&&a.profile!==JSON.stringify(p.profile)){this.removeActor(p.id);a=null;}
        if(!a)a=this.makeActor(p);
        if(a.wasAlive&&!p.alive)a.deadAt=elapsed;
        a.wasAlive=p.alive;a.target.set(p.x,0,p.z);
        const old=a.model.position.clone();a.model.position.lerp(a.target,1-Math.exp(-dt*14));
        let diff=p.angle-a.model.rotation.y;diff=Math.atan2(Math.sin(diff),Math.cos(diff));a.model.rotation.y+=diff*(1-Math.exp(-dt*15));
        const speed=old.distanceTo(a.model.position)/Math.max(dt,.001);a.phase+=dt*Math.min(speed*3,13);
        const stride=Math.min(speed*.12,.6);for(const [name,sign]of[['legL',1],['legR',-1],['armL',-1],['armR',1]])a.model.getObjectByName(name).rotation.x=Math.sin(a.phase)*stride*sign;
        a.model.position.y=Math.abs(Math.sin(a.phase*2))*stride*.06;
        a.model.visible=p.connected&&(p.alive||elapsed-a.deadAt<5);
        if(!p.alive){const t=Math.min(1,(elapsed-a.deadAt)/4);a.model.position.y=t*2;a.model.scale.setScalar(Math.max(.01,1-t));}
        else a.model.scale.setScalar(1);
        a.label.classList.toggle('self',p.id===this.selfId);
      }
      for(const [id,a]of this.actors)if(id!=='preview'&&!s.players.some(p=>p.id===id))this.removeActor(id);
      for(const b of s.bodies){
        if(!this.bodyModels.has(b.id)){
          const g=new THREE.Group();const candle=new THREE.Mesh(new THREE.BoxGeometry(.3,.5,.3),mat('#6b725b'));candle.position.y=.3;g.add(candle);
          const light=new THREE.Mesh(new THREE.SphereGeometry(.14,8,8),new THREE.MeshBasicMaterial({color:'#bad7d1'}));light.position.y=.9;g.add(light);
          g.position.set(b.x,0,b.z);this.scene.add(g);this.bodyModels.set(b.id,g);
        }
        const m=this.bodyModels.get(b.id);m.visible=!b.reported;m.children[1].position.y=.9+Math.sin(elapsed*2)*.1;
      }
      for(const [id,m]of this.bodyModels)if(!s.bodies.some(b=>b.id===id)){this.scene.remove(m);this.bodyModels.delete(id);}
      const self=s.players.find(p=>p.id===this.selfId);
      const focusPlayer=self?.alive?self:s.players.find(p=>p.alive)||self;
      if(focusPlayer){const a=this.actors.get(focusPlayer.id);this.focus.lerp(new THREE.Vector3(a.model.position.x,1.1,a.model.position.z),1-Math.exp(-dt*7));}
      const radius=this.mapMode?45:this.zoom,pitch=this.mapMode?1.45:this.pitch;
      const desired=new THREE.Vector3(this.focus.x+Math.sin(this.yaw)*radius*Math.cos(pitch),this.focus.y+Math.sin(pitch)*radius,this.focus.z+Math.cos(this.yaw)*radius*Math.cos(pitch));
      this.camera.position.lerp(desired,1-Math.exp(-dt*8));this.camera.lookAt(this.focus);
      const station=this.priv?.job?STATIONS[jobStation(this.priv.job)]:null;
      this.marker.visible=!!station&&!!self?.alive&&['roam','lobby'].includes(s.phase);
      if(station){this.marker.position.set(station.x,.14,station.z);this.marker.children[1].position.y=1.7+Math.sin(elapsed*2)*.15;this.marker.children[1].rotation.y=elapsed;}
      for(const p of s.players){const a=this.actors.get(p.id),v=a.model.position.clone().add(new THREE.Vector3(0,2.6,0));v.project(this.camera);
        const show=p.alive&&a.model.visible&&v.z<1&&Math.abs(v.x)<1.05&&Math.abs(v.y)<1.1&&a.model.position.distanceTo(this.camera.position)<26;
        a.label.style.display=show?'block':'none';a.label.style.transform=`translate(-50%,-50%) translate(${(v.x*.5+.5)*innerWidth}px,${(-v.y*.5+.5)*innerHeight}px)`;
      }
    }
    this.renderer.render(this.scene,this.camera);
  }
  direction(x,z){return {x:x*Math.cos(this.yaw)+z*Math.sin(this.yaw),z:-x*Math.sin(this.yaw)+z*Math.cos(this.yaw)};}
  quality(low){this.renderer.setPixelRatio(low?1:Math.min(devicePixelRatio,1.6));this.renderer.shadowMap.enabled=!low;this.resize();}
}
