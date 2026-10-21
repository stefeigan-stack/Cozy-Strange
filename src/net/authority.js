import { addPlayer, removePlayer, input, action, startMatch, publicSnapshot, privateSnapshot } from '../sim/engine.js';
import { validEnvelope } from './protocol.js';

// Transport-independent boundary. A connection is bound to a host-assigned ID.
export class HostAuthority {
  constructor(game,send,now=()=>performance.now()) {this.game=game;this.send=send;this.now=now;this.peers=new Map();}
  admit(id,profile,bot=false) {
    const result=addPlayer(this.game,id,profile,bot);
    if(result.ok)this.peers.set(id,{seq:-1,tokens:80,refilled:this.now(),seen:this.now()});
    return result;
  }
  receive(id,message) {
    const peer=this.peers.get(id);
    if(!peer||!validEnvelope(message)||message.seq<=peer.seq)return false;
    const now=this.now();peer.tokens=Math.min(80,peer.tokens+(now-peer.refilled)*0.06);peer.refilled=now;
    if(peer.tokens<1)return false;peer.tokens--;peer.seq=message.seq;peer.seen=now;
    let result;
    if(message.kind==='ping') {this.send(id,{type:'pong',at:message.payload?.at});return true;}
    if(message.kind==='input')result=input(this.game,id,message.payload);
    else if(message.kind==='action')result=action(this.game,id,message.payload);
    else if(message.kind==='start')result=id==='host'?startMatch(this.game):{ok:false,message:'Only the host can start the match.'};
    if(message.kind!=='input')this.send(id,{type:'result',...result});
    return result?.ok??false;
  }
  publish() {
    const publicState=publicSnapshot(this.game);
    for(const id of this.peers.keys()){
      if(!this.game.players[id]?.connected)continue;
      this.send(id,{type:'public',state:publicState});
      this.send(id,{type:'private',state:privateSnapshot(this.game,id)});
    }
  }
  disconnect(id){this.peers.delete(id);removePlayer(this.game,id);}
  checkTimeouts(timeout=10000) {
    const expired=[];
    for(const [id,p] of this.peers)if(id!=='host'&&!this.game.players[id]?.bot&&this.now()-p.seen>timeout){expired.push(id);this.disconnect(id);}
    return expired;
  }
}
