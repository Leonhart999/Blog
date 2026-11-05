// Print bounding boxes / mesh stats of glTF files given as arguments.
import { NodeIO } from '@gltf-transform/core';
import { getBounds } from '@gltf-transform/core';
const io = new NodeIO();
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f);
  const scene = doc.getRoot().listScenes()[0];
  const b = getBounds(scene);
  let tris = 0;
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() ?? 0) / 3;
  const mats = doc.getRoot().listMaterials().map(m => m.getName()).join(',');
  const fmt = v => v.map(x => x.toFixed(2)).join(',');
  console.log(f.split('/').pop().padEnd(40), 'min', fmt(b.min), 'max', fmt(b.max), 'tris', tris, 'nodes', doc.getRoot().listNodes().length, 'mats', mats);
}
