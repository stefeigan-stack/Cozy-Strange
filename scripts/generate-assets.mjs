import { mkdir, writeFile } from 'node:fs/promises';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createKit } from '../src/render/models.js';

// Node Blob adapter for the official Three.js exporter. No remote asset service.
globalThis.FileReader = class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result=`data:${blob.type};base64,${Buffer.from(result).toString('base64')}`;this.onloadend?.();});}
};
const output=new URL('../public/assets/',import.meta.url);await mkdir(output,{recursive:true});
const data=await new GLTFExporter().parseAsync(createKit(),{binary:true,onlyVisible:false});
await writeFile(new URL('mossmere-kit.glb',output),Buffer.from(data));
console.log(`Original glTF 2.0 village kit: ${(data.byteLength/1024).toFixed(0)} KB`);
