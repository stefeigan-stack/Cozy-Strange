import { Mesh } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Only scenery is passed here. Characters and animation roots remain independent.
export function batchStaticScene(scene,dynamicRoots=new Set()){
  scene.updateMatrixWorld(true);
  const groups=new Map();
  scene.traverse(o=>{
    if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material))return;
    for(let p=o;p;p=p.parent)if(dynamicRoots.has(p))return;
    const m=o.material,key=[m.type,m.color?.getHex(),m.emissive?.getHex(),m.emissiveIntensity,m.roughness,m.metalness,m.opacity,m.transparent,m.side,o.castShadow,o.receiveShadow].join(':');
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);
  });
  let before=0,after=0;
  for(const meshes of groups.values()){
    before+=meshes.length;after++;
    if(meshes.length<2)continue;
    const geometries=meshes.map(m=>{
      const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();
      for(const key of Object.keys(g.attributes))if(!['position','normal'].includes(key))g.deleteAttribute(key);
      if(!g.attributes.normal)g.computeVertexNormals();g.applyMatrix4(m.matrixWorld);return g;
    });
    const merged=mergeGeometries(geometries,false);
    if(!merged){geometries.forEach(g=>g.dispose());continue;}
    merged.computeBoundingSphere();const batch=new Mesh(merged,meshes[0].material);
    batch.name='StaticSceneryBatch';batch.castShadow=meshes[0].castShadow;batch.receiveShadow=meshes[0].receiveShadow;
    meshes.forEach(m=>m.removeFromParent());scene.add(batch);geometries.forEach(g=>g.dispose());
  }
  return {before,after};
}
