import Peer from 'peerjs';
import { DT, PROTOCOL_VERSION } from '../sim/config.js';
import { createGame, tick } from '../sim/engine.js';
import { PracticeBots } from '../sim/bots.js';
import { HostAuthority } from './authority.js';
import { PEER_OPTIONS, envelope, MAX_PACKET_BYTES } from './protocol.js';

const roomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8)),v=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[v%31]).join('');
const seed = () => crypto.getRandomValues(new Uint32Array(1))[0];
// getRandomValues also works on local HTTP test origins; randomUUID may not.
const playerId = () => 'p-'+Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
export class Session {
  constructor({onState,onPrivate,onStatus,onResult,onEnd}){
    Object.assign(this,{onState,onPrivate,onStatus,onResult,onEnd});
    this.connections=new Map();this.seq=0;this.closed=false;this.timers=[];this.id=null;this.lastStateAt=performance.now();this.latency=null;
  }
  receive(message){
    if(this.closed||!message||typeof message!=='object')return;
    if(message.type==='welcome') {this.id=message.id;this.accepted=true;this.onStatus('Connected to village','connected');}
    if(message.type==='public'){this.lastStateAt=performance.now();this.onState(message.state);}
    if(message.type==='private')this.onPrivate(message.state);
    if(message.type==='result'&&message.message)this.onResult(message);
    if(message.type==='pong'&&Number.isFinite(message.at))this.latency=Math.round(performance.now()-message.at);
    if(message.type==='rejected'||message.type==='shutdown')this.fail(message.message);
  }
  async offline(profile,rules){
    this.mode='offline';this.id='host';this.code=null;
    this.authority=new HostAuthority(createGame({seed:seed(),rules,offline:true}),(id,m)=>{if(id==='host')this.receive(m);});
    this.authority.admit('host',profile);
    const names=['Pip','Wren','Clover','Juniper','Otis'];
    const coats=['#6d8d81','#d6b66d','#8b82ae','#b76d77','#5d7e98'];
    names.forEach((name,i)=>this.authority.admit(`bot${i}`,{name,coat:coats[i],hat:i%2?'beret':'straw'},true));
    this.bots=new PracticeBots(this.authority.game);
    this.onStatus('Offline practice · 5 computer villagers','offline');this.startLoop();this.start();
  }
  async host(profile,rules){
    this.mode='host';this.id='host';this.code=roomCode();
    this.authority=new HostAuthority(createGame({seed:seed(),rules}),(id,m)=>id==='host'?this.receive(m):this.safeSend(this.connections.get(id),m));
    this.authority.admit('host',profile);
    this.onStatus('Opening a village…','connecting');
    this.peer=new Peer(`mossmere-${this.code}`,PEER_OPTIONS);
    this.peer.on('connection',c=>this.acceptConnection(c));
    await this.waitForPeer();
    if(this.closed)return;
    this.onStatus('Village open · share your room code','connected');this.startLoop();
  }
  async join(profile,code){
    this.mode='guest';this.code=code.trim().toUpperCase();
    if(!/^[A-Z2-9]{8}$/.test(this.code))throw new Error('Enter the 8-character code from your host.');
    this.onStatus('Connecting to the village…','connecting');
    this.peer=new Peer(PEER_OPTIONS);await this.waitForPeer();if(this.closed)return;
    const c=this.peer.connect(`mossmere-${this.code}`,{reliable:true,serialization:'json'});this.hostConnection=c;
    c.on('open',()=>{this.onStatus('Data channel open · waiting for host admission','connecting');this.safeSend(c,{type:'hello',v:PROTOCOL_VERSION,profile});});
    c.on('iceStateChanged',ice=>{if(!this.accepted)this.onStatus(`Direct connection: ${ice}`,'connecting');});
    c.on('data',m=>this.receive(m));
    c.on('close',()=>this.fail('The host connection closed. This match has ended; ask the host for a new room.'));
    c.on('error',()=>this.fail('Could not connect to the host. Try another network; this prototype has no TURN relay.'));
    this.timers.push(setTimeout(()=>{if(!this.accepted)this.fail('Connection timed out. Check the room code and host tab, then try another network. Some networks require TURN, which is not configured.');},15000));
    this.timers.push(setInterval(()=>{
      if(!this.accepted||this.closed)return;
      this.send('ping',{at:performance.now()});
      if(performance.now()-this.lastStateAt>10000)this.fail('No host updates for 10 seconds. The match ended locally. Rejoin a new room.');
    },2000));
  }
  waitForPeer(){
    return new Promise((resolve,reject)=>{
      let opened=false;
      const timeout=setTimeout(()=>{if(!opened)reject(new Error('Signalling timed out. The free PeerJS service may be unavailable or blocked.'));},15000);
      this.timers.push(timeout);
      this.peer.on('open',()=>{opened=true;clearTimeout(timeout);resolve();});
      this.peer.on('error',e=>{
        const message=e.type==='peer-unavailable'?'That village is unavailable. Check the code and that the host is still online.':`Connection problem (${e.type||'network'}). Try again or use offline practice.`;
        if(!opened){clearTimeout(timeout);reject(new Error(message));}else this.onResult({ok:false,message});
      });
      this.peer.on('disconnected',()=>{
        if(this.closed)return;
        this.onStatus('Signalling lost · existing peers can continue','warning');
        this.timers.push(setTimeout(()=>{if(!this.closed&&!this.peer.destroyed)this.peer.reconnect();},1500));
      });
      this.peer.on('close',()=>{if(!this.closed)this.fail('The networking service closed. Open a new village to continue.');});
    });
  }
  acceptConnection(c){
    let admittedId=null;
    if(this.connections.size>=7){c.on('open',()=>{this.safeSend(c,{type:'rejected',message:'The village is full.'});setTimeout(()=>c.close(),250);});return;}
    const handshake=setTimeout(()=>{if(!admittedId)c.close();},7000);
    this.timers.push(handshake);
    c.on('data',m=>{
      if(this.closed)return;
      if(!admittedId){
        let size;try{size=JSON.stringify(m).length;}catch{return c.close();}
        if(size>MAX_PACKET_BYTES||m?.type!=='hello'||m.v!==PROTOCOL_VERSION){c.close();return;}
        const id=playerId();
        const result=this.authority.admit(id,m.profile);
        if(!result.ok){this.safeSend(c,{type:'rejected',message:result.message});setTimeout(()=>c.close(),300);return;}
        admittedId=id;clearTimeout(handshake);this.connections.set(id,c);
        this.safeSend(c,{type:'welcome',id,v:PROTOCOL_VERSION});this.authority.publish();
      } else this.authority.receive(admittedId,m);
    });
    const disconnect=()=>{clearTimeout(handshake);if(admittedId){this.connections.delete(admittedId);this.authority.disconnect(admittedId);this.authority.publish();}};
    c.on('close',disconnect);c.on('error',disconnect);
  }
  safeSend(c,m){if(c?.open)try{c.send(m);}catch{/* Timeout/close handling removes the peer. */}}
  startLoop(){
    let previous=performance.now(),accumulator=0,frames=0;
    this.authority.publish();
    this.timers.push(setInterval(()=>{
      if(this.closed)return;
      const now=performance.now(),gap=(now-previous)/1000;previous=now;
      if(gap>5&&this.mode==='host'){this.fail('The host tab stopped responding. The match ended. Keep the host tab active during play.');return;}
      accumulator+=Math.min(gap,.25);
      while(accumulator>=DT){this.bots?.step();tick(this.authority.game,DT);accumulator-=DT;frames++;}
      if(frames>=2){this.authority.publish();frames=0;}
      for(const id of this.authority.checkTimeouts()){this.connections.get(id)?.close();this.connections.delete(id);}
    },DT*1000));
  }
  send(kind,payload){
    if(this.closed)return;
    const m=envelope(kind,payload,this.seq++);
    if(this.authority)this.authority.receive('host',m);else this.safeSend(this.hostConnection,m);
  }
  move(value){this.send('input',value);}
  action(value){this.send('action',value);}
  start(){this.send('start',{});}
  fail(message){if(this.closed)return;this.onEnd(message);this.close();}
  close(){
    if(this.closed)return;
    if(this.mode==='host')for(const c of this.connections.values())this.safeSend(c,{type:'shutdown',message:'The host closed the village. Open a new room to play again.'});
    this.closed=true;this.timers.forEach(t=>{clearTimeout(t);clearInterval(t);});
    this.connections.forEach(c=>c.close());this.peer?.destroy();
  }
}
