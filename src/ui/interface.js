import { COATS, SKINS, HAIRS } from '../profile.js';
import { formatClock, jobStation } from '../sim/engine.js';
import { STATIONS, HOUSES, distance, region } from '../sim/world.js';

export const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={leaf:'M5 18C1 6 11 2 21 3c1 12-7 20-15 16M4 21 16 8',coin:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v10m3-8c-3-3-7 1-3 3s0 6-3 3',sun:'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2',people:'M8 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6M2 21v-4a6 6 0 0 1 12 0v4m3-16a3 3 0 0 1 0 6m1 3a5 5 0 0 1 4 5v2',arrow:'M4 12h16m-6-6 6 6-6 6',settings:'M4 7h16M4 17h16M8 4v6m8 4v6',bread:'M4 19V9C-1 2 9 0 12 5c4-5 13-2 8 4v10H4m5-8v5m6-5v5',drop:'M12 2C8 8 5 11 5 15a7 7 0 0 0 14 0c0-4-3-7-7-13',pair:'M4 10h16v10H4zM8 10V6a4 4 0 0 1 8 0v4M12 12v6',moon:'M20 16A9 9 0 0 1 8 4a9 9 0 1 0 12 12',mail:'M3 5h18v14H3zM3 5l9 7 9-7',close:'M6 6l12 12M6 18 18 6',check:'m4 12 5 5L20 6',sound:'M3 9h4l5-5v16l-5-5H3zM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',map:'m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5m6-2v16m6-14v16'};
export const icon=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name]||icons.leaf}"/></svg>`;
const button=(label,act,cls='',value='')=>`<button class="${cls}" data-act="${act}" data-value="${esc(value)}">${label}</button>`;
const phaseLabel={lobby:'The village is gathering',roam:'A quiet day',discussion:'Discuss the evidence',defence:'Hear the defence',voting:'Cast your vote',verdict:'The village has spoken',ended:'A new morning'};
const jobText={delivery:{pickup:['A little bread goes a long way','Collect warm bread from Honeycrust bakery.','Collect bread'],deliver:['A delivery, still warm','Take your bread to the glasshouse across the green.','Deliver bread']},herbs:['Something for the apothecary','Gather a bundle from the herb garden.','Gather herbs'],water:['A small kindness','Fill the watering cans at the village well.','Fill the cans']};
export class Interface {
  constructor(root,handlers){
    this.root=root;this.handlers=handlers;this.panel=null;this.journal=true;this.toastTimer=0;this.status='Loading the village…';this.statusType='loading';this.ready=false;
    root.innerHTML='<div id="menu"></div><div id="hud"></div><div id="journal"></div><div id="contract"></div><div id="prompt"></div><div id="bottom"></div><div id="overlay"></div><div id="trial"></div><div id="toast" role="status" aria-live="polite"></div><div id="fatal" role="alert"></div>';
    root.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(b&&!b.disabled)this.handlers.act(b.dataset.act,b.dataset.value);});
    root.addEventListener('submit',e=>{e.preventDefault();if(e.target.id==='chat-form'){const input=e.target.elements.message;this.handlers.act('chat',input.value);input.value='';}if(e.target.id==='join-form')this.handlers.act('join',e.target.elements.code.value);});
    root.addEventListener('change',e=>{if(e.target.dataset.setting)this.handlers.setting(e.target.dataset.setting,e.target.value);if(e.target.id==='player-name')this.handlers.profile('name',e.target.value);});
  }
  set(id,html){
    const node=document.getElementById(id);if(node._html===html)return;
    const active=document.activeElement,within=node.contains(active),saved=within&&active.id?{id:active.id,value:active.value,start:active.selectionStart,end:active.selectionEnd}:null;
    node.innerHTML=html;node._html=html;
    if(saved){const next=document.getElementById(saved.id);if(next){next.value=saved.value;next.focus({preventScroll:true});try{next.setSelectionRange(saved.start,saved.end);}catch{}}}
  }
  setStatus(text,type){this.status=text;this.statusType=type;}
  notify(message,ok=true){const el=document.getElementById('toast');el.textContent=message;el.className=`toast visible ${ok?'':'error'}`;clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>el.classList.remove('visible'),5000);}
  fatal(message){this.set('fatal',`<div class="fatal"><h2>The village needs a moment</h2><p>${esc(message)}</p><button onclick="location.reload()">Reload</button><a href="./network-test.html">Open the graphics-free connection test</a></div>`);}
  render({state,priv,session,profile,rules,loading,muted,lowQuality}){
    this.profile=profile;this.session=session;this.state=state;this.priv=priv;this.rules=rules;
    if(!state){
      this.set('menu',`<div class="menu-frame"><div class="wordmark">${icon('leaf')} AN ODD LITTLE VILLAGE</div><div class="version">ORIGINAL MULTIPLAYER PROTOTYPE <span>01</span></div><section class="welcome"><div class="eyebrow">MAKE YOURSELF AT HOME.</div><h1>Mossmere<span>A village with a secret.</span></h1><p>Deliver the bread. Tend the garden.<br>Try to trust your neighbours.</p><div class="welcome-actions"><button class="primary big" data-act="practice" ${loading?'disabled':''}>${loading?'Preparing your village…':'Enter practice'} ${icon('arrow')}</button>${button('Play with friends','friends','secondary big')}<div class="fine">Practice is offline, with computer villagers.</div></div><button class="wardrobe-link" data-act="wardrobe"><span class="swatch" style="background:${profile.coat}"></span> ${esc(profile.name)} <span>·</span> Change your look ${icon('arrow')}</button></section><div class="menu-footer"><span><b>01</b> A little honest work</span><span><b>02</b> A very private contract</span><span><b>03</b> A village to convince</span></div><div class="menu-note">Made for trusted friends.<br>Free to play. No account needed.</div></div>`);
      for(const id of ['hud','journal','contract','prompt','bottom','trial'])this.set(id,'');
    } else {
      this.set('menu','');
      const me=state.players.find(p=>p.id===session?.id),living=state.players.filter(p=>p.alive&&p.connected);
      const remaining=Math.max(0,state.rules.matchSeconds-state.elapsed);
      this.set('hud',`<header class="hud"><div class="brand">${icon('leaf')}<div><b>Mossmere</b><span>${esc(me?region(me):'THE VILLAGE GREEN')}</span></div></div><div class="day-clock">${icon(state.phase==='roam'?'sun':'moon')}<span>${esc(phaseLabel[state.phase])}<b>${state.phase==='lobby'?'BEFORE THE FIRST BELL':`${formatClock(remaining)} UNTIL DAWN`}</b></span></div><div class="hud-right"><div class="stat">${icon('people')}<b>${living.length}</b><span>living</span></div><div class="stat coins">${icon('coin')}<b>${me?.coins||0}</b></div>${button(icon('settings'),'settings','icon-btn')}</div></header>`);
      const j=priv?.job;const text=j?(j.type==='delivery'?jobText.delivery[j.stage]:jobText[j.type]):null;
      const pair=priv?.pair,partner=state.players.find(p=>p.id===pair?.partnerId);
      this.set('journal',this.journal?`<aside class="journal panel"><div class="panel-kicker">YOUR POCKET JOURNAL ${button('−','journal','text-btn')}</div>${text?`<div class="job-icon">${icon(STATIONS[jobStation(j)].icon)}</div><h2>${text[0]}</h2><p>${text[1]}</p><div class="job-reward">${icon('coin')} ${j.type==='delivery'?18:j.type==='herbs'?12:10} coins <span>${Math.round(distance(me||{x:0,z:0},STATIONS[jobStation(j)]))}m away</span></div>`:''}<div class="divider"></div><div class="coop-line">${icon('people')}<b>Better together</b><span>+26 each</span></div><p class="small">${pair?`You & ${esc(partner?.profile.name||'a neighbour')}. Both press E at the orchard press, then stay nearby.`:priv?.queued?'Waiting for a random partner. Another villager must join at the press.':'Meet at the orchard press. Join the queue for a randomly paired job.'}</p>${pair?`<div class="progress"><i style="width:${Math.min(100,pair.progress/3*100)}%"></i></div>`:''}<button class="journal-map" data-act="map">${icon('map')} View the village <kbd>M</kbd></button></aside>`:'');
      const c=priv?.contract,target=state.players.find(p=>p.id===c?.targetId);
      this.set('contract',c&&me?.alive?`<aside class="contract"><div class="panel-kicker">${icon('mail')} FOR YOUR EYES ONLY</div><h2>A sealed request</h2><p>Extinguish <b>${esc(target?.profile.name)}</b>’s lantern before the contract expires.</p><div class="contract-time">${formatClock(Math.max(0,c.expiresAt-state.time))}<span>Keep this to yourself.</span></div><p class="small">Approach within 1.8m. Press <kbd>F</kbd> to fulfil the contract.</p></aside>`:'');
      let prompt='Explore the village. Follow the golden job marker.',actionLabel='';
      if(me?.alive&&['roam','lobby'].includes(state.phase)){
        const body=state.bodies.find(b=>!b.reported&&distance(me,b)<2.5);
        if(body){prompt='A fallen lantern. Call the village to trial.';actionLabel=button('<kbd>R</kbd> Report','report');}
        else if(c&&target&&distance(me,target)<1.8){prompt=`Your contract target: ${esc(target.profile.name)}`;actionLabel=button('<kbd>F</kbd> Fulfil contract','kill','danger');}
        else if(distance(me,STATIONS.coop)<2.2){prompt=pair?'Both partners: ready up and remain nearby.':'The orchard press · a job for two';actionLabel=button(`<kbd>E</kbd> ${pair?'Ready to press':priv?.queued?'Waiting for partner':'Join job queue'}`,'interact');}
        else if(j&&distance(me,STATIONS[jobStation(j)])<2.2){prompt=STATIONS[jobStation(j)].label;actionLabel=button(`<kbd>E</kbd> ${text[2]}`,'interact');}
      }
      if(me&&!me.alive){prompt='Your lantern is out. You are spectating a living villager.';actionLabel='';}
      this.set('prompt',['lobby','roam'].includes(state.phase)?`<div class="interaction">${actionLabel}<span>${prompt}</span></div>`:'');
      this.set('bottom',`<div class="session-note"><span class="status-dot ${esc(this.statusType)}"></span>${state.offline?'OFFLINE PRACTICE · COMPUTER VILLAGERS':`${session?.mode==='host'?'HOST':'ONLINE'} · ${esc(session?.code||'')} · ${session?.latency!=null?session.latency+'ms':'TRUSTED FRIENDS'}`}</div><nav class="controls"><span><kbd>W A S D</kbd> Move</span><span><kbd>SHIFT</kbd> Run</span><span>Drag · look</span><span>Scroll · zoom</span><button data-act="journal"><kbd>J</kbd> Journal</button><button data-act="room"><kbd>Tab</kbd> Village</button></nav><div class="minimap-wrap"><span>N</span><canvas id="minimap" width="180" height="180" aria-label="Map of village and players"></canvas><b>THE MOSS MERE</b></div>`);
      this.drawMap(state,session?.id,priv);
      this.renderTrial(state,priv,me);
      if(state.phase==='ended')this.renderResult(state,session);
    }
    this.renderOverlay({profile,rules,muted,lowQuality,session,state,loading});
  }
  renderOverlay({profile,rules,muted,lowQuality,session,state,loading}){
    if(!this.panel){this.set('overlay','');return;}
    let content='',heading='',kicker='';
    if(this.panel==='friends'){
      heading='Invite a little suspicion.';kicker='PLAY WITH FRIENDS';
      content=`<p>Open a village and share its code. Invite 2–8 people you trust; 4–8 makes for a better trial.</p>${button(`${icon('leaf')} Open a village`,'host','primary wide')}
      <div class="or"><span>or join your friends</span></div><form id="join-form"><label for="room-code">8-character room code</label><div class="join-row"><input id="room-code" name="code" maxlength="8" placeholder="ABCD2345" autocomplete="off" autocapitalize="characters" required/><button class="primary" ${loading?'disabled':''}>Join ${icon('arrow')}</button></div></form><div class="network-note">${icon('people')}<p>The host can inspect secret roles and contracts. Keep their tab active. Some networks cannot connect without a TURN relay; no relay is included.</p></div><p class="small status-text">${esc(this.status)}</p>`;
    }
    if(this.panel==='wardrobe'){
      heading='A familiar face.';kicker='YOUR VILLAGER';
      const choices=(label,key,list)=>`<label>${label}</label><div class="swatches">${list.map((c,i)=>`<button class="swatch-btn ${profile[key]===c?'selected':''}" style="--swatch:${c}" data-act="cosmetic" data-value="${key}|${c}" aria-label="${label} ${i+1}" aria-pressed="${profile[key]===c}">${profile[key]===c?icon('check'):''}</button>`).join('')}</div>`;
      content=`<p>Your look is saved on this browser. Coins, jobs and contracts belong to the current village.</p><label for="player-name">Name</label><input id="player-name" value="${esc(profile.name)}" maxlength="18" autocomplete="off"/>${choices('Coat','coat',COATS)}${choices('Complexion','skin',SKINS)}${choices('Hair','hair',HAIRS)}<label>Something for your head</label><div class="segmented">${['none','straw','beret'].map(h=>button(h==='none'?'No hat':h==='straw'?'Straw hat':'Beret','cosmetic',profile.hat===h?'selected':'',`hat|${h}`)).join('')}</div><div class="outfit-preview"><span style="--coat:${profile.coat};--skin:${profile.skin};--hair:${profile.hair}">●</span><p><b>${esc(profile.name)}</b><br>Ready for a very ordinary day.</p></div>${button('All dressed up '+icon('check'),'close-panel','primary wide')}`;
    }
    if(this.panel==='settings'){
      heading='A slower sort of day.';kicker='SETTINGS';
      content=`<div class="setting-row"><span>Gentle sound effects</span>${button(muted?'Off':'On','sound',muted?'toggle':'toggle selected')}</div><div class="setting-row"><span>Graphics</span>${button(lowQuality?'Low power':'Soft shadows','quality','toggle')}</div><p class="small">Use low power if the village feels slow. Desktop keyboard and mouse recommended.</p>`;
      if(!state){content+=`<div class="divider"></div><label for="endgame">Match ending</label><select id="endgame" data-setting="endgame"><option value="survive-dawn" ${rules.endgame==='survive-dawn'?'selected':''}>Survive until dawn · shared victory</option><option value="last-survivor" ${rules.endgame==='last-survivor'?'selected':''}>Last survivor · provisional</option><option value="prosperity" ${rules.endgame==='prosperity'?'selected':''}>Prosperity · 180 coins</option></select><label for="duration">Day length</label><select id="duration" data-setting="matchSeconds">${[180,480,900].map(n=>`<option value="${n}" ${rules.matchSeconds===n?'selected':''}>${n/60} minutes</option>`).join('')}</select><p class="small">All modes end if one villager remains. Last survivor gives no winner at the time limit if several remain.</p>`;}
      content+=`<div class="divider"></div><p class="small">Move: WASD / arrows · run: Shift · interact: E · report: R · contract: F · map: M · journal: J · village: Tab · menu: Esc.</p>${state?button('Leave this village','leave','secondary wide'):''}`;
    }
    if(this.panel==='room'){
      kicker=state?.offline?'OFFLINE PRACTICE':'YOUR VILLAGE';heading=state?.offline?'Meet the test villagers.':'A room for familiar faces.';
      content=state?`${!state.offline?`<label>Room code</label><div class="room-code"><b>${esc(session.code)}</b>${button('Copy','copy','text-btn')}</div><p class="small">${esc(this.status)}</p>`:'<p>Every villager marked CPU is controlled by this browser. No other people are connected.</p>'}<div class="roster">${state.players.map(p=>`<div><span class="avatar-dot" style="background:${p.profile.coat}"></span><b>${esc(p.profile.name)}</b><small>${p.bot?'CPU':p.id==='host'?'HOST':p.id===session.id?'YOU':'PLAYER'}</small><span>${!p.connected?'Left':p.alive?'◦':'Out'}</span></div>`).join('')}</div><p class="small">Ending: ${esc(state.rules.endgame)} · ${state.rules.matchSeconds/60} minutes</p>${state.phase==='lobby'&&session.mode==='host'?button('Begin the day '+icon('arrow'),'start','primary wide'):state.phase==='lobby'?'<p>Waiting for the host to begin the day.</p>':''}${button('Leave village','leave','text-btn wide')}`:'';
    }
    this.set('overlay',`<div class="overlay-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${heading}"><div class="modal-top"><span class="eyebrow">${kicker}</span>${button(icon('close'),'close-panel','icon-btn')}</div><h2>${heading}</h2>${content}</section></div>`);
  }
  renderTrial(s,priv,me){
    if(!s.trial||!['discussion','defence','voting','verdict'].includes(s.phase)){this.set('trial','');return;}
    const t=s.trial,accused=s.players.find(p=>p.id===t.accusedId),victim=s.players.find(p=>p.id===t.victimId),living=s.players.filter(p=>p.alive&&p.connected);
    let actions='';
    if(s.phase==='discussion')actions=`<label>Who should answer to the village?</label><div class="nominees">${living.map(p=>`<button data-act="nominate" data-value="${p.id}" class="${priv?.nominated===p.id?'selected':''}" ${me?.alive?'':'disabled'}><i style="background:${p.profile.coat}"></i>${esc(p.profile.name)}</button>`).join('')}</div><p class="small">${t.nominationCount} nominations · a tied nomination releases everyone.</p>`;
    if(s.phase==='defence')actions=`<div class="defence"><div class="eyebrow">THE ACCUSED HAS THE FLOOR</div><h3>${esc(accused?.profile.name)}</h3><p>${me?.id===t.accusedId?'Tell the village your side of the story below.':'Listen to the defence. Everyone can speak again during voting.'}</p></div>`;
    if(s.phase==='voting')actions=`<h3>Should ${esc(accused?.profile.name)} be convicted?</h3><p>A conviction needs more than half of the living electorate. A tie or missing majority spares the accused.</p><div class="vote-buttons"><button data-act="vote" data-value="guilty" class="danger" ${!me?.alive||priv?.vote?'disabled':''}>Extinguish lantern</button><button data-act="vote" data-value="spare" class="secondary" ${!me?.alive||priv?.vote?'disabled':''}>Spare villager</button></div><p class="small">${priv?.vote?'Your vote is sealed.':t.voteCount+' sealed votes.'} Results appear when time is up.</p>`;
    if(s.phase==='verdict')actions=`<div class="verdict"><div class="lantern-symbol">${icon(t.convictedId?'moon':'sun')}</div><h3>${esc(t.verdict)}</h3>${t.tally?`<p>${t.tally.guilty} voted to convict · ${t.tally.required} required</p>`:''}<p class="small">${t.convictedId?'A lantern rises, and one villager leaves the story.':'The village reopens in a moment.'}</p></div>`;
    const canChat=me?.alive&&s.phase!=='verdict'&&(s.phase!=='defence'||me.id===t.accusedId);
    const messages=t.messages.map(m=>`<div class="chat-message"><b>${esc(s.players.find(p=>p.id===m.playerId)?.profile.name||'Villager')}</b><span>${esc(m.text)}</span></div>`).join('');
    this.set('trial',`<div class="trial-backdrop"><section class="trial-card" role="dialog" aria-modal="true" aria-label="Village trial"><div class="trial-heading"><div><div class="eyebrow">THE WELL-SIDE COURT</div><h2>${phaseLabel[s.phase]}</h2></div><div class="trial-clock">${formatClock(Math.max(0,s.phaseUntil-s.time))}<span>remaining</span></div></div><div class="trial-steps">${['discussion','defence','voting','verdict'].map((p,i)=>`<span class="${p===s.phase?'active':''}"><b>0${i+1}</b> ${p}</span>`).join('')}</div><div class="trial-columns"><div class="evidence"><label>${esc(victim?.profile.name)}’s fallen lantern</label><h3>What the village knows</h3>${t.evidence.map((e,i)=>`<p><b>0${i+1}</b>${esc(e)}</p>`).join('')}<div class="evidence-note">Clues are observations, not a verdict. A matching thread alone is not proof.</div></div><div class="deliberation">${actions}<div class="chat-log" id="chat-log" aria-live="polite">${messages||'<p class="small">The village is listening. Share what you saw.</p>'}</div><form id="chat-form"><input id="chat-message" name="message" maxlength="240" placeholder="${canChat?'Share what you saw…':'Listen to the village…'}" ${canChat?'':'disabled'} autocomplete="off"/><button class="primary" ${canChat?'':'disabled'} aria-label="Send message">${icon('arrow')}</button></form></div></div>${!me?.alive?'<div class="spectator-note">SPECTATING · eliminated villagers cannot discuss or vote.</div>':''}</section></div>`);
    const log=document.getElementById('chat-log');if(log&&this.chatCount!==t.messages.length){log.scrollTop=log.scrollHeight;this.chatCount=t.messages.length;}
  }
  renderResult(s,session){
    this.set('trial',`<div class="overlay-backdrop"><section class="modal result"><div class="eyebrow">THE DAY IS DONE</div><div class="result-sun">${icon('sun')}</div><h2>Every village<br>keeps a story.</h2><p>${esc(s.result?.reason||'The match has ended.')}</p><div class="roster">${[...s.players].sort((a,b)=>b.coins-a.coins).map(p=>`<div><i class="avatar-dot" style="background:${p.profile.coat}"></i><b>${esc(p.profile.name)}</b><small>${s.result?.winners.includes(p.id)?'WINNER':p.bot?'CPU':''}</small><span>${p.coins} ◦</span></div>`).join('')}</div><p class="small">Match coins reset. Your saved appearance stays with you.</p>${button('Back to Mossmere '+icon('arrow'),'leave','primary wide')}</section></div>`);
  }
  drawMap(s,id,priv){
    const canvas=document.getElementById('minimap');if(!canvas)return;const c=canvas.getContext('2d');const scale=2.8,origin=90;
    c.clearRect(0,0,180,180);c.fillStyle='#b7c6a2';c.beginPath();c.arc(90,90,79,0,Math.PI*2);c.fill();
    c.save();c.beginPath();c.arc(90,90,79,0,Math.PI*2);c.clip();c.fillStyle='#8eb5af';c.fillRect(origin+12*scale,0,4*scale,180);
    c.strokeStyle='#ecdfb8';c.lineWidth=5;c.beginPath();c.moveTo(25,104);c.lineTo(150,104);c.moveTo(90,32);c.lineTo(90,146);c.stroke();
    c.fillStyle='#96775b';HOUSES.forEach(h=>c.fillRect(origin+h.x*scale-5,origin+h.z*scale-4,10,8));
    const station=priv?.job?STATIONS[jobStation(priv.job)]:null;if(station){c.fillStyle='#fff4ac';c.beginPath();c.arc(origin+station.x*scale,origin+station.z*scale,4,0,Math.PI*2);c.fill();}
    s.players.filter(p=>p.alive).forEach(p=>{c.fillStyle=p.id===id?'#fffaf0':'#365547';c.beginPath();c.arc(origin+p.x*scale,origin+p.z*scale,p.id===id?4:2.3,0,Math.PI*2);c.fill();});c.restore();
  }
}
