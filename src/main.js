import './ui/style.css';
import { VillageRenderer } from './render/world.js';
import { Interface } from './ui/interface.js';
import { Session } from './net/session.js';
import { loadProfile,saveProfile,sanitizeProfile } from './profile.js';
import { DEFAULT_RULES } from './sim/config.js';
import { distance } from './sim/world.js';

let state=null,priv=null,session=null,loading=true,world;
let profile=loadProfile(localStorage),rules={...DEFAULT_RULES},muted=true,lowQuality=false;
const keys=new Set();let lastCoins=0,audioContext;
const ui=new Interface(document.getElementById('ui'),{
  act:handleAction,
  profile:(key,value)=>updateProfile(key,value),
  setting:(key,value)=>{rules[key]=key==='endgame'?value:Number(value);}
});
function updateProfile(key,value){
  if(state&&state.phase!=='lobby'){ui.notify('Change your appearance between matches.',false);return;}
  profile=sanitizeProfile({...profile,[key]:value});
  if(!saveProfile(localStorage,profile))ui.notify('This browser could not save your appearance. It will last for this visit.',false);
  if(session)session.action({type:'profile',profile});
  else world?.menu(profile);
}
function tone(){
  if(muted)return;
  try{
    audioContext??=new AudioContext();audioContext.resume();
    for(const [i,hz]of[523.25,659.25,783.99].entries()){
      const o=audioContext.createOscillator(),g=audioContext.createGain(),at=audioContext.currentTime+i*.1;
      o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(.045,at+.01);g.gain.exponentialRampToValueAtTime(.001,at+.5);
      o.connect(g).connect(audioContext.destination);o.start(at);o.stop(at+.5);
    }
  }catch{/* Sound is optional. */}
}
async function connect(mode,code){
  if(loading)return;
  if(!world?.ready){ui.notify('The village assets are still loading.');return;}
  loading=true;session?.close();keys.clear();state=null;priv=null;
  const current=new Session({
    onState:s=>{
      if(session!==current)return;
      const first=!state,previousPhase=state?.phase;state=s;
      if(first&&s.phase==='lobby'&&mode!=='offline')ui.panel='room';
      const me=s.players.find(p=>p.id===current.id);if(me&&me.coins>lastCoins)tone();lastCoins=me?.coins||0;
      if(previousPhase==='lobby'&&s.phase!=='lobby'&&ui.panel==='room')ui.panel=null;
    },
    onPrivate:p=>{if(session===current)priv=p;},
    onStatus:(text,type)=>ui.setStatus(text,type),
    onResult:r=>ui.notify(r.message,r.ok),
    onEnd:message=>{
      if(session!==current)return;
      state=null;priv=null;loading=false;keys.clear();ui.panel='friends';ui.setStatus(message,'warning');ui.notify(message,false);world.menu(profile);
    }
  });session=current;
  try{
    if(mode==='offline'){ui.panel=null;await current.offline(profile,rules);}
    if(mode==='host')await current.host(profile,rules);
    if(mode==='guest')await current.join(profile,code);
  }catch(error){current.close();state=null;priv=null;ui.notify(error.message,false);ui.setStatus(error.message,'warning');ui.panel='friends';world.menu(profile);}
  finally{loading=false;}
}
function leave(){session?.close();session=null;state=null;priv=null;keys.clear();lastCoins=0;ui.panel=null;world?.menu(profile);}
function handleAction(act,value){
  if(act==='practice')return connect('offline');
  if(act==='host')return connect('host');
  if(act==='join')return connect('guest',value);
  if(['friends','wardrobe','settings','room'].includes(act)){ui.panel=act;keys.clear();session?.move({x:0,z:0});return;}
  if(act==='close-panel'){ui.panel=null;return;}
  if(act==='cosmetic'){const [key,color]=value.split('|');updateProfile(key,color);return;}
  if(act==='leave'){leave();return;}
  if(act==='journal'){ui.journal=!ui.journal;return;}
  if(act==='map'){world.mapMode=!world.mapMode;return;}
  if(act==='sound'){muted=!muted;tone();return;}
  if(act==='quality'){lowQuality=!lowQuality;world.quality(lowQuality);return;}
  if(act==='copy')return navigator.clipboard?.writeText(session.code).then(()=>ui.notify('Room code copied.')).catch(()=>ui.notify(`Room code: ${session.code}`));
  if(act==='start'){session?.start();return;}
  if(act==='interact')session?.action({type:'interact'});
  if(act==='kill'&&priv?.contract)session?.action({type:'kill',targetId:priv.contract.targetId});
  if(act==='report'){
    const me=state?.players.find(p=>p.id===session?.id),body=state?.bodies.find(b=>!b.reported&&me&&distance(me,b)<2.5);
    if(body)session?.action({type:'report',bodyId:body.id});else ui.notify('Approach a fallen lantern to report it.',false);
  }
  if(act==='nominate')session?.action({type:'nominate',targetId:value});
  if(act==='vote')session?.action({type:'vote',choice:value});
  if(act==='chat')session?.action({type:'chat',text:value});
}
addEventListener('keydown',e=>{
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){
    if(e.key==='Escape')document.activeElement.blur();return;
  }
  if(e.key==='Escape'){ui.panel=ui.panel?null:'settings';keys.clear();return;}
  if(!state||ui.panel)return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab',' '].includes(e.key))e.preventDefault();
  keys.add(e.code);
  if(e.repeat)return;
  const commands={KeyE:'interact',KeyF:'kill',KeyR:'report',KeyM:'map',KeyJ:'journal',Tab:'room'};
  if(commands[e.code])handleAction(commands[e.code]);
});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>{keys.clear();session?.move({x:0,z:0});});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();session?.move({x:0,z:0});if(session?.mode==='host')ui.notify('Keep this host tab active during the match.',false);}});
addEventListener('beforeunload',()=>session?.close());
let previous=performance.now(),elapsed=0,inputAccumulator=0,uiAccumulator=0;
function frame(now){
  const dt=Math.min(.1,(now-previous)/1000);previous=now;elapsed+=dt;inputAccumulator+=dt;uiAccumulator+=dt;
  if(inputAccumulator>=.05){
    inputAccumulator=0;
    if(session&&!session.closed&&state){
      let x=0,z=0;
      const typing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
      if(!ui.panel&&!typing){x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);z=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);}
      session.move({...world.direction(x,z),sprint:keys.has('ShiftLeft')||keys.has('ShiftRight')});
    }
  }
  if(state)world?.setState(state,session?.id,priv);
  world?.update(dt,elapsed);
  if(uiAccumulator>=.15){uiAccumulator=0;ui.render({state,priv,session,profile,rules,loading,muted,lowQuality});}
  requestAnimationFrame(frame);
}
ui.render({state,priv,session,profile,rules,loading,muted,lowQuality});
try{
  world=new VillageRenderer(document.getElementById('world'));
  await world.load();world.menu(profile);loading=false;ui.setStatus('Ready for a quiet day.','ready');requestAnimationFrame(frame);
}catch(error){console.error(error);ui.fatal('Mossmere needs WebGL2 and its local GLB asset. Try a recent browser with hardware acceleration enabled, and serve the game over HTTP(S). '+error.message);}
