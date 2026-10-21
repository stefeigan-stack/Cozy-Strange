export const COATS = ['#d48658','#6d8d81','#d6b66d','#8b82ae','#b76d77','#5d7e98'];
export const SKINS = ['#eac5a2','#c88c63','#956647','#634531'];
export const HAIRS = ['#443229','#79533c','#bb8a48','#d6d0ba'];
export const PROFILE_KEY = 'mossmere.cosmetics.v1';
export function sanitizeProfile(p = {}) {
  if(!p || typeof p !== 'object' || Array.isArray(p)) p = {};
  const choose = (v,list) => list.includes(v) ? v : list[0];
  return { name: typeof p.name==='string' ? p.name.replace(/[<>\x00-\x1f]/g,'').trim().slice(0,18)||'Wanderer' : 'Wanderer',
    coat:choose(p.coat,COATS), skin:choose(p.skin,SKINS), hair:choose(p.hair,HAIRS),
    hat:['none','beret','straw'].includes(p.hat)?p.hat:'straw' };
}
export function loadProfile(storage) {
  try {return sanitizeProfile(JSON.parse(storage.getItem(PROFILE_KEY)||'{}'));} catch {return sanitizeProfile();}
}
export function saveProfile(storage, profile) {
  try {storage.setItem(PROFILE_KEY,JSON.stringify(sanitizeProfile(profile)));return true;} catch {return false;}
}
