import { createGame,addPlayer,startMatch,tick } from '../src/sim/engine.js';
export function game(n=5,rules={}){
  const s=createGame({seed:7,rules});for(let i=0;i<n;i++)addPlayer(s,i===0?'host':`p${i}`,{name:`Villager ${i}`,coat:['#d48658','#6d8d81','#d6b66d','#8b82ae','#b76d77'][i%5]});return s;
}
export function advance(s,seconds){for(let i=0;i<Math.ceil(seconds/.05);i++)tick(s,.05);}
export function started(n=5,rules={}){const s=game(n,rules);startMatch(s);return s;}
export function at(s,id,position){Object.assign(s.players[id],position);s.players[id].lastActionAt=-100;}
