export const TICK_RATE = 20;
export const DT = 1 / TICK_RATE;
export const PROTOCOL_VERSION = 1;
export const DEFAULT_RULES = Object.freeze({
  endgame: 'survive-dawn', // Alternatives: last-survivor, prosperity.
  matchSeconds: 480, survivors: 1, prosperityGoal: 180,
  firstContractSeconds: 35, contractSeconds: 65, contractGapSeconds: 25,
  discussionSeconds: 35, defenceSeconds: 20, votingSeconds: 25,
  verdictSeconds: 7, maxPlayers: 8
});
const clamp = (v, lo, hi, fallback) => Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
export function sanitizeRules(input = {}) {
  if(!input||typeof input!=='object'||Array.isArray(input))input={};
  const r = { ...DEFAULT_RULES };
  if (['survive-dawn','last-survivor','prosperity'].includes(input.endgame)) r.endgame = input.endgame;
  for (const [key, lo, hi] of [
    ['matchSeconds',120,1800],['survivors',1,3],['prosperityGoal',50,1000],
    ['firstContractSeconds',5,120],['contractSeconds',15,180],['contractGapSeconds',5,120],
    ['discussionSeconds',5,120],['defenceSeconds',5,90],['votingSeconds',5,90],['verdictSeconds',3,15]
  ]) r[key] = clamp(input[key],lo,hi,r[key]);
  return r;
}
export function seededRandom(seed = 42) {
  let n = seed >>> 0;
  return () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
