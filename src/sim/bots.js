import { input, action, jobStation } from './engine.js';
import { STATIONS, distance, walkable } from './world.js';

// Offline testing only. No network session ever constructs this controller.
export class PracticeBots {
  constructor(game){this.game=game;this.lastThink=0;this.goals=new Map();}
  step(){
    const s=this.game;if(s.time-this.lastThink<0.12)return;this.lastThink=s.time;
    for(const p of Object.values(s.players).filter(p=>p.bot&&p.alive)){
      if(['discussion','defence','voting'].includes(s.phase)){this.trial(p);continue;}
      if(s.phase!=='roam')continue;
      const body=s.bodies.find(b=>!b.reported&&distance(b,p)<5);
      let goal=STATIONS[jobStation(p.job)];
      if(body)goal=body;
      else if(s.contract?.assassinId===p.id)goal=s.players[s.contract.targetId];
      else if(p.pairId||s.pairQueue.length)goal=STATIONS.coop;
      if(!goal)continue;
      let dx=goal.x-p.x,dz=goal.z-p.z;let len=Math.hypot(dx,dz);
      if(len>1.3){
        // Local obstacle steering; intentionally simple test characters, not human-like AI.
        let heading=Math.atan2(dx,dz);let best=null;
        for(const offset of [0,.55,-.55,1.15,-1.15,1.8,-1.8,Math.PI]){
          const x=Math.sin(heading+offset),z=Math.cos(heading+offset);
          if(walkable(p.x+x*1.1,p.z+z*1.1)){best={x,z};break;}
        }
        input(s,p.id,best||{x:0,z:0});
      } else input(s,p.id,{x:0,z:0});
      if(s.time-(p.botActAt||0)<1.1)continue;p.botActAt=s.time;
      if(body&&distance(p,body)<2.3)action(s,p.id,{type:'report',bodyId:body.id});
      else if(s.contract?.assassinId===p.id&&distance(p,goal)<1.7)action(s,p.id,{type:'kill',targetId:goal.id});
      else if(distance(p,goal)<2)action(s,p.id,{type:'interact'});
    }
  }
  trial(p){
    const s=this.game,t=s.trial;
    if(s.phase==='discussion'&&s.phaseUntil-s.time<s.rules.discussionSeconds-3&&!Object.hasOwn(t.nominations,p.id)){
      const candidates=Object.values(s.players).filter(v=>v.alive&&v.id!==p.id);
      // Bots share a simple, fallible guess based on a public thread clue.
      const colours={'rust':'#d48658','sage':'#6d8d81','honey':'#d6b66d','lavender':'#8b82ae','rose':'#b76d77','blue':'#5d7e98'};
      const clue=Object.keys(colours).find(c=>t.evidence[0].includes(c));
      const suspect=candidates.find(v=>v.profile.coat===colours[clue])||candidates[0];
      if(suspect)action(s,p.id,{type:'nominate',targetId:suspect.id});
      action(s,p.id,{type:'chat',text:'[Computer] The thread could be a clue, but it is not proof.'});
    }
    if(s.phase==='defence'&&t.accusedId===p.id&&!t.messages.some(m=>m.playerId===p.id&&m.text.startsWith('[Computer] I')))
      action(s,p.id,{type:'chat',text:'[Computer] I was doing village jobs. A matching coat does not prove guilt.'});
    if(s.phase==='voting'&&!t.votes[p.id]&&s.phaseUntil-s.time<s.rules.votingSeconds-3)
      action(s,p.id,{type:'vote',choice:s.random()<.7?'guilty':'spare'});
  }
}
