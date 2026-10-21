import assert from 'node:assert/strict';import { readFile,access,readdir } from 'node:fs/promises';
const root=new URL('../dist/',import.meta.url),html=await readFile(new URL('index.html',root),'utf8');
const refs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]);
assert.ok(refs.some(r=>r.endsWith('.js')),'Compiled JavaScript is linked');
for(const path of refs){assert.ok(!path.startsWith('/'),'GitHub Pages requires relative asset URLs: '+path);assert.ok(!/^https?:/.test(path),'No CDN assets');await access(new URL(path,root));}
await access(new URL('assets/mossmere-kit.glb',root));
const js=(await Promise.all((await readdir(new URL('assets/',root))).filter(f=>f.endsWith('.js')).map(f=>readFile(new URL('assets/'+f,root),'utf8')))).join('\n');
assert.ok(!js.includes('/src/main.js'),'No development entrypoint');assert.ok(!/sk-[a-zA-Z0-9]{20,}/.test(js),'No API-key-like string');
console.log('Production check passed: relative Pages paths, bundled JS/CSS, local GLB, no CDN assets.');
