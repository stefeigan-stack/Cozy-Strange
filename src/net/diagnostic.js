import { Session } from './session.js';
import { sanitizeProfile } from '../profile.js';
import { esc } from '../ui/interface.js';
const el=id=>document.getElementById(id);let session=null,direction={x:0,z:0},keys=new Set();
function disconnect(){session?.close();session=null;direction={x:0,z:0};keys.clear();el('status').textContent='Disconnected.';el('room').textContent='';el('host').disabled=false;el('join').disabled=false;}
async function connect(mode){
  disconnect();el('host').disabled=true;el('join').disabled=true;
  const current=new Session({
    onStatus:(text)=>{el('status').textContent=text;el('room').textContent=current.code||'';},
    onState:s=>{el('summary').textContent=`${s.phase} · ${s.players.length} real players · local identity ${current.id} · round-trip ${current.latency??'—'} ms`;
      el('players').innerHTML=s.players.map(p=>`<tr><td>${esc(p.profile.name)}${p.id===current.id?' (you)':''}</td><td>${p.x.toFixed(2)}, ${p.z.toFixed(2)}</td><td>${p.coins}</td><td>${!p.connected?'disconnected':p.alive?'alive':'out'}</td></tr>`).join('');
      el('start').disabled=mode!=='host'||s.phase!=='lobby';},
    onPrivate:p=>el('private').textContent=JSON.stringify(p,null,2),
    onResult:r=>el('result').textContent=(r.ok?'':'Rejected: ')+(r.message||''),
    onEnd:message=>{el('status').textContent=message;el('host').disabled=false;el('join').disabled=false;}
  });session=current;
  try{const profile=sanitizeProfile({name:el('name').value});if(mode==='host')await current.host(profile,{});else await current.join(profile,el('code').value);}
  catch(e){current.close();el('status').textContent=e.message;el('host').disabled=false;el('join').disabled=false;}
}
el('host').onclick=()=>connect('host');el('join').onclick=()=>connect('guest');el('leave').onclick=disconnect;
el('interact').onclick=()=>session?.action({type:'interact'});el('start').onclick=()=>session?.start();
document.querySelectorAll('[data-x]').forEach(b=>{
  b.addEventListener('pointerdown',e=>{b.setPointerCapture(e.pointerId);direction={x:Number(b.dataset.x),z:Number(b.dataset.z)};});
  b.addEventListener('pointerup',()=>direction={x:0,z:0});b.addEventListener('pointercancel',()=>direction={x:0,z:0});
});
addEventListener('keydown',e=>{if(document.activeElement?.tagName==='INPUT')return;if(e.code.startsWith('Arrow'))e.preventDefault();keys.add(e.code);if(e.code==='KeyE'&&!e.repeat)session?.action({type:'interact'});});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();direction={x:0,z:0};});
setInterval(()=>{
  const x=direction.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
  const z=direction.z+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
  session?.move({x,z});
},50);
addEventListener('beforeunload',()=>session?.close());
