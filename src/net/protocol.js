import { PROTOCOL_VERSION } from '../sim/config.js';
export const MAX_PACKET_BYTES = 4096;
export function validEnvelope(message) {
  if(!message||typeof message!=='object'||Array.isArray(message))return false;
  try {if(JSON.stringify(message).length>MAX_PACKET_BYTES)return false;}catch{return false;}
  return message.v===PROTOCOL_VERSION&&Number.isSafeInteger(message.seq)&&message.seq>=0
    && ['input','action','start','ping'].includes(message.kind);
}
export function envelope(kind,payload,seq){return {v:PROTOCOL_VERSION,seq,kind,payload};}
export const PEER_OPTIONS = Object.freeze({
  debug:0,secure:true,
  // Deliberately override provider defaults. No paid TURN relay or embedded credentials.
  config:{iceServers:[{urls:'stun:stun.l.google.com:19302'}],iceTransportPolicy:'all'}
});
