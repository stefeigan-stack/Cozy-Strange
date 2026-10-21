import { DEFAULT_RULES, sanitizeRules, seededRandom } from './config.js';
import { STATIONS, distance, movePosition, clearPath, region } from './world.js';
import { sanitizeProfile } from '../profile.js';

const alive = s => Object.values(s.players).filter(p=>p.alive&&p.connected);
const clone = x => JSON.parse(JSON.stringify(x));
const pick = (s,items) => items[Math.floor(s.random()*items.length)];
const success = message => ({ok:true,message});
const fail = message => ({ok:false,message});
const phaseTrial = phase => ['discussion','defence','voting','verdict'].includes(phase);
export function createGame({seed=42,rules={},offline=false} = {}) {
  return { version:1, time:0, phase:'lobby', phaseUntil:0, rules:sanitizeRules(rules), offline,
    random:seededRandom(seed), players:Object.create(null), bodies:[], contract:null,
    nextContractAt:Infinity, pairs:[], pairQueue:[], trial:null, events:[], eventSequence:0,
    matchStartedAt:0, elapsed:0, result:null, lastContractHolder:null };
}
export function addPlayer(s,id,profile={},bot=false) {
  if (s.phase!=='lobby') return fail('This match has started. Join the next village.');
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||Object.hasOwn(s.players,id)) return fail('Invalid or duplicate player.');
  if (Object.keys(s.players).length>=s.rules.maxPlayers) return fail('The village is full (8 players).');
  const n = Object.keys(s.players).length;
  s.players[id] = { id, profile:sanitizeProfile(profile), bot:!!bot, connected:true,alive:true,
    x:-3+n%4*1.8,z:6+Math.floor(n/4)*1.8,angle:0, input:{x:0,z:0,sprint:false},inputAt:0,
    coins:0,jobsDone:0,job:{type:'delivery',stage:'pickup'},lastJobAt:-100,
    pairId:null,readyUntil:0,lastChatAt:-100,lastActionAt:-100 };
  return success('Welcome to Mossmere.');
}
export function startMatch(s) {
  if(s.phase!=='lobby')return fail('A match is already running.');
  if(alive(s).length<2)return fail('You need at least two connected players.');
  // Lobby jobs are a rehearsal. A new match starts on equal terms.
  for(const p of alive(s)){p.coins=0;p.jobsDone=0;p.job={type:'delivery',stage:'pickup'};p.pairId=null;p.readyUntil=0;p.lastJobAt=-100;}
  s.pairs=[];s.pairQueue=[];
  s.phase='roam';s.matchStartedAt=s.time;s.elapsed=0;s.nextContractAt=s.time+s.rules.firstContractSeconds;
  event(s,'The village wakes. Earn coins, lend a hand, and watch the lanes.');
  return success('The match has begun.');
}
function event(s,text,kind='notice',extra={}) {
  s.events.push({id:++s.eventSequence,time:s.time,text,kind,...extra});
  if(s.events.length>45)s.events.shift();
}
export function removePlayer(s,id) {
  const p=s.players[id];if(!p)return;
  if(s.phase==='lobby'){cancelPair(s,p);delete s.players[id];return;}
  if(!p.connected)return;
  p.connected=false;p.alive=false;p.input={x:0,z:0};
  cancelPair(s,p);cancelContractFor(s,id);
  event(s,`${p.profile.name} disconnected and left this match.`,'disconnect');
  if (s.trial?.accusedId===id && ['discussion','defence','voting'].includes(s.phase)) verdict(s,null,'The accused disconnected. No conviction.');
  checkEndgame(s);
}
function cancelContractFor(s,id) {
  if(s.contract&&(s.contract.assassinId===id||s.contract.targetId===id)){
    s.contract=null;s.nextContractAt=s.time+s.rules.contractGapSeconds;
  }
}
function cancelPair(s,p) {
  s.pairQueue=s.pairQueue.filter(id=>id!==p.id);
  const pair=s.pairs.find(q=>q.id===p.pairId);
  if(pair){pair.members.forEach(id=>{if(s.players[id]){s.players[id].pairId=null;s.players[id].readyUntil=0;}});s.pairs=s.pairs.filter(q=>q!==pair);}
  p.pairId=null;p.readyUntil=0;
}
export function input(s,id,data) {
  const p=s.players[id];if(!p||!p.alive||!p.connected)return fail('Not an active player.');
  if(!data||!Number.isFinite(data.x)||!Number.isFinite(data.z))return fail('Invalid movement.');
  let x=Math.max(-1,Math.min(1,data.x)),z=Math.max(-1,Math.min(1,data.z));const len=Math.hypot(x,z);
  if(len>1){x/=len;z/=len;}
  p.input={x,z,sprint:data.sprint===true};p.inputAt=s.time;return success();
}
export function action(s,id,a) {
  const p=s.players[id];
  if(!p||!p.connected||!p.alive)return fail('Only living players can act.');
  if(!a||typeof a.type!=='string')return fail('Invalid action.');
  if(a.type==='profile'){
    if(s.phase!=='lobby')return fail('Change your appearance between matches.');
    p.profile=sanitizeProfile(a.profile);return success('Appearance saved.');
  }
  if(a.type==='chat')return chat(s,p,a.text);
  if(a.type==='nominate')return nominate(s,p,a.targetId);
  if(a.type==='vote')return vote(s,p,a.choice);
  if(s.phase!=='roam'&&s.phase!=='lobby')return fail('Wait until the village reopens.');
  if(s.time-p.lastActionAt<0.18)return fail('One action at a time.');
  p.lastActionAt=s.time;
  if(a.type==='interact')return interact(s,p);
  if(a.type==='kill')return murder(s,p,a.targetId);
  if(a.type==='report')return report(s,p,a.bodyId);
  return fail('Unknown action.');
}
function interact(s,p) {
  if(distance(p,STATIONS.coop)<2.2){
    if(p.pairId){p.readyUntil=s.time+6;return success('Ready! Both partners must stay by the press for 3 seconds.');}
    if(!s.pairQueue.includes(p.id))s.pairQueue.push(p.id);
    pairPlayers(s);return success(p.pairId?'A random partner is assigned. Both press E beside the orchard press.':'Waiting for another villager at the orchard press.');
  }
  const station=jobStation(p.job);
  if(distance(p,STATIONS[station])>2.2)return fail('Walk closer to your job marker, or the orchard press.');
  if(s.time-p.lastJobAt<3)return fail('Give the job a moment before working again.');
  p.lastJobAt=s.time;
  if(p.job.type==='delivery'&&p.job.stage==='pickup'){
    p.job.stage='deliver';return success('Warm bread collected. Deliver it to the glasshouse.');
  }
  const reward=p.job.type==='delivery'?18:p.job.type==='herbs'?12:10;
  p.coins+=reward;p.jobsDone++;
  p.job=p.jobsDone%3===1?{type:'herbs'}:p.jobsDone%3===2?{type:'water'}:{type:'delivery',stage:'pickup'};
  checkEndgame(s);return success(`Job complete. +${reward} coins. Your next job is in the journal.`);
}
export function jobStation(job) {
  return job.type==='delivery'?(job.stage==='pickup'?'bakery':'glasshouse'):job.type==='herbs'?'garden':'well';
}
function pairPlayers(s) {
  s.pairQueue=s.pairQueue.filter(id=>s.players[id]?.alive&&s.players[id]?.connected&&!s.players[id]?.pairId);
  while(s.pairQueue.length>=2){
    const a=s.pairQueue.splice(Math.floor(s.random()*s.pairQueue.length),1)[0];
    const b=s.pairQueue.splice(Math.floor(s.random()*s.pairQueue.length),1)[0];
    const pair={id:`pair-${++s.eventSequence}`,members:[a,b],progress:0};s.pairs.push(pair);
    s.players[a].pairId=pair.id;s.players[b].pairId=pair.id;
  }
}
function assignContract(s) {
  const players=alive(s);if(players.length<2)return;
  let eligible=players.filter(p=>p.id!==s.lastContractHolder);if(!eligible.length)eligible=players;
  const holder=pick(s,eligible),target=pick(s,players.filter(p=>p!==holder));
  s.contract={assassinId:holder.id,targetId:target.id,expiresAt:s.time+s.rules.contractSeconds};
  s.lastContractHolder=holder.id;
}
function murder(s,p,targetId) {
  if(s.phase!=='roam')return fail('Contracts are only active during a match.');
  const c=s.contract;
  if(!c||c.assassinId!==p.id||c.expiresAt<=s.time)return fail('You have no active contract.');
  if(c.targetId!==targetId)return fail('That villager is not your contract target.');
  const target=s.players[targetId];
  if(!target?.alive||!target.connected)return fail('Your target is unavailable.');
  if(distance(p,target)>1.8||!clearPath(p,target))return fail('Get within 1.8 metres of your target, with a clear path.');
  target.alive=false;target.input={x:0,z:0};cancelPair(s,target);
  // Evidence describes observations. It never serializes the contract/assassin ID.
  const witnesses=alive(s).filter(v=>v.id!==p.id&&distance(v,p)<7&&clearPath(v,p)).map(v=>v.profile.name);
  const palette={ '#d48658':'rust','#6d8d81':'sage','#d6b66d':'honey','#8b82ae':'lavender','#b76d77':'rose','#5d7e98':'blue' };
  s.bodies.push({id:`body-${++s.eventSequence}`,victimId:target.id,x:target.x,z:target.z,
    at:s.time,reported:false,evidence:[`A ${palette[p.profile.coat]} thread was caught on a branch. Several villagers may wear this colour.`,
      `The lantern fell near ${region(target)} at ${formatClock(s.elapsed)}.`,
      witnesses.length?`${witnesses.join(', ')} had a clear view of this area. Ask what they saw.`:'No other living villager was in clear view nearby.']});
  s.contract=null;s.nextContractAt=s.time+s.rules.contractGapSeconds;
  checkEndgame(s);return success('The lantern goes out. Leave the scene before someone notices.');
}
function report(s,p,bodyId) {
  if(s.phase!=='roam')return fail('No reports can be made right now.');
  const body=s.bodies.find(b=>b.id===bodyId&&!b.reported);
  if(!body||distance(p,body)>2.5||!clearPath(p,body))return fail('Move closer to an undiscovered fallen lantern.');
  body.reported=true;s.contract=null;s.nextContractAt=Infinity;
  s.trial={bodyId:body.id,victimId:body.victimId,reporterId:p.id,evidence:clone(body.evidence),
    nominations:{},accusedId:null,votes:{},electorate:[],messages:[],verdict:null,convictedId:null};
  s.phase='discussion';s.phaseUntil=s.time+s.rules.discussionSeconds;
  alive(s).forEach((v,i)=>{v.x=Math.sin(i/alive(s).length*Math.PI*2)*3.8;v.z=Math.cos(i/alive(s).length*Math.PI*2)*3.8;v.input={x:0,z:0};});
  event(s,`${p.profile.name} found ${s.players[body.victimId].profile.name}'s fallen lantern. A trial begins.`,'trial');
  return success('The village gathers at the well.');
}
function nominate(s,p,targetId) {
  if(s.phase!=='discussion')return fail('Nominations are open during discussion.');
  if(targetId!==null&&(!s.players[targetId]?.alive||!s.players[targetId]?.connected))return fail('Nominate a living villager.');
  s.trial.nominations[p.id]=targetId;return success('Nomination recorded. You can change it before discussion ends.');
}
function chat(s,p,text) {
  if(!['discussion','defence','voting'].includes(s.phase))return fail('Discussion opens at a trial.');
  if(s.phase==='defence'&&s.trial.accusedId!==p.id)return fail('The accused has the floor.');
  if(typeof text!=='string'||!text.trim())return fail('Enter a message.');
  if(s.time-p.lastChatAt<1)return fail('Please wait a moment between messages.');
  p.lastChatAt=s.time;
  s.trial.messages.push({id:++s.eventSequence,playerId:p.id,text:text.replace(/[\x00-\x1f]/g,'').trim().slice(0,240),at:s.time});
  if(s.trial.messages.length>40)s.trial.messages.shift();return success();
}
function vote(s,p,choice) {
  if(s.phase!=='voting'||!s.trial.electorate.includes(p.id))return fail('You cannot vote now.');
  if(!['guilty','spare'].includes(choice))return fail('Choose convict or spare.');
  if(Object.hasOwn(s.trial.votes,p.id))return fail('Your vote has already been sealed.');
  s.trial.votes[p.id]=choice;return success('Vote sealed. Results appear when voting closes.');
}
function transitionTrial(s) {
  const t=s.trial;
  if(s.phase==='discussion'){
    const counts={};for(const [voter,id] of Object.entries(t.nominations))if(s.players[voter]?.alive&&s.players[id]?.alive)counts[id]=(counts[id]||0)+1;
    const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    if(!sorted.length||(sorted.length>1&&sorted[0][1]===sorted[1][1]))return verdict(s,null,'No clear nominee. The village releases everyone.');
    t.accusedId=sorted[0][0];s.phase='defence';s.phaseUntil=s.time+s.rules.defenceSeconds;
  } else if(s.phase==='defence') {
    t.electorate=alive(s).map(p=>p.id);s.phase='voting';s.phaseUntil=s.time+s.rules.votingSeconds;
  } else if(s.phase==='voting') {
    const guilty=Object.values(t.votes).filter(v=>v==='guilty').length;
    const required=Math.floor(t.electorate.length/2)+1;
    const convicted=guilty>=required&&s.players[t.accusedId]?.alive?t.accusedId:null;
    verdict(s,convicted,convicted?`${s.players[convicted].profile.name}'s lantern is extinguished.`:'No majority. The accused is spared.',{guilty,required,total:t.electorate.length});
  } else if(s.phase==='verdict') {
    if(!checkEndgame(s)){s.phase='roam';s.trial=null;s.nextContractAt=s.time+s.rules.contractGapSeconds;}
  }
}
function verdict(s,convictedId,text,tally=null) {
  s.trial.verdict=text;s.trial.convictedId=convictedId;s.trial.tally=tally;
  s.phase='verdict';s.phaseUntil=s.time+s.rules.verdictSeconds;
  if(convictedId){const p=s.players[convictedId];p.alive=false;p.x=0;p.z=3;p.input={x:0,z:0};cancelPair(s,p);}
  event(s,text,'verdict');
}
export function checkEndgame(s) {
  if(s.phase==='lobby'||s.phase==='ended')return s.phase==='ended';
  const living=alive(s);let reason=null,winners=[];
  if(living.length<=s.rules.survivors){reason=living.length?'The last lanterns remain.':'No lanterns remain.';winners=living.map(p=>p.id);}
  else if(s.rules.endgame==='prosperity'&&living.some(p=>p.coins>=s.rules.prosperityGoal)){
    reason='A living villager reached the prosperity goal.';winners=living.filter(p=>p.coins>=s.rules.prosperityGoal).map(p=>p.id);
  } else if(s.elapsed>=s.rules.matchSeconds){
    reason=s.rules.endgame==='last-survivor'?'Time limit: unresolved. No last survivor.':'Dawn arrives. The surviving villagers win together.';
    winners=s.rules.endgame==='last-survivor'?[]:living.map(p=>p.id);
  }
  if(!reason)return false;
  s.result={reason,winners};s.phase='ended';s.contract=null;return true;
}
export function tick(s,dt) {
  // The host supplies a fixed timestep; elapsed client time is never accepted.
  if(!Number.isFinite(dt)||dt<=0||dt>0.25)throw new Error('Simulation timestep out of bounds.');
  s.time+=dt;
  if(!['lobby','ended'].includes(s.phase))s.elapsed+=dt;
  if(s.phase==='roam'||s.phase==='lobby'){
    for(const p of alive(s)){
      if(s.time-p.inputAt>0.4)p.input={x:0,z:0,sprint:false};
      const speed=p.input.sprint?5.4:3.6;
      movePosition(p,p.input.x*speed*dt,p.input.z*speed*dt);
      if(Math.hypot(p.input.x,p.input.z)>0.01)p.angle=Math.atan2(p.input.x,p.input.z);
    }
    for(const pair of [...s.pairs]){
      const members=pair.members.map(id=>s.players[id]);
      if(members.some(p=>!p?.alive||!p.connected)){cancelPair(s,members.find(Boolean));continue;}
      if(members.every(p=>p.readyUntil>=s.time&&distance(p,STATIONS.coop)<2.2))pair.progress+=dt;
      else pair.progress=0;
      if(pair.progress>=3){members.forEach(p=>{p.coins+=26;p.jobsDone++;});cancelPair(s,members[0]);event(s,'Two villagers pressed a basket of apples. +26 coins each.','job');}
    }
  }
  if(s.phase==='roam'){
    if(s.contract&&s.contract.expiresAt<=s.time){s.contract=null;s.nextContractAt=s.time+s.rules.contractGapSeconds;}
    if(!s.contract&&s.time>=s.nextContractAt)assignContract(s);
  }
  if(phaseTrial(s.phase)&&s.time>=s.phaseUntil)transitionTrial(s);
  if(s.phase!=='verdict')checkEndgame(s);
}
export function formatClock(seconds) {return `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;}

// Explicit allow-list: never clone and broadcast the authoritative state.
export function publicSnapshot(s) {
  const t=s.trial;
  return {version:s.version,time:s.time,phase:s.phase,phaseUntil:s.phaseUntil,elapsed:s.elapsed,
    rules:clone(s.rules),offline:s.offline,result:clone(s.result),
    players:Object.values(s.players).map(p=>({id:p.id,profile:clone(p.profile),bot:p.bot,
      connected:p.connected,alive:p.alive,x:p.x,z:p.z,angle:p.angle,coins:p.coins,jobsDone:p.jobsDone})),
    // Undiscovered victims are rendered as lanterns, but their evidence appears only after report.
    bodies:s.bodies.map(b=>({id:b.id,victimId:b.victimId,x:b.x,z:b.z,reported:b.reported})),
    events:clone(s.events),
    trial:t?{victimId:t.victimId,reporterId:t.reporterId,evidence:clone(t.evidence),accusedId:t.accusedId,
      nominationCount:Object.keys(t.nominations).length,voteCount:Object.keys(t.votes).length,
      messages:clone(t.messages),verdict:t.verdict,convictedId:t.convictedId,tally:t.tally||null}:null};
}
export function privateSnapshot(s,id) {
  const p=s.players[id];if(!p)return null;
  const pair=s.pairs.find(q=>q.id===p.pairId);
  return {id,job:clone(p.job),pair:pair?{partnerId:pair.members.find(x=>x!==id),progress:pair.progress,ready:p.readyUntil>s.time}:null,
    queued:s.pairQueue.includes(id),
    contract:s.contract?.assassinId===id?{targetId:s.contract.targetId,expiresAt:s.contract.expiresAt}:null,
    nominated:s.trial?.nominations[id]??null,vote:s.trial?.votes[id]??null};
}
