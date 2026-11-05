// Merge selected KayKit (CC0) glTF models into one compressed GLB per bundle.
// Each source model becomes a top-level node named after its file (without
// extension), so pages can clone models by name.
//
// Usage (from the project root):
//   node scripts/build-models.mjs estate          -> public/models/estate.glb
//   node scripts/build-models.mjs rooms           -> public/models/rooms.glb
//   node scripts/build-models.mjs rooms --all out.glb   (every model, for previews)
import path from 'node:path';
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, unpartition, dedup, prune, weld, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

// Hexagon pack models for the home-page estate (paths relative to its gltf dir).
const ESTATE = [
  'tiles/base/hex_grass', 'tiles/base/hex_water',
  'tiles/rivers/hex_river_A', 'tiles/rivers/hex_river_A_curvy', 'tiles/rivers/hex_river_crossing_A',
  'tiles/roads/hex_road_A', 'tiles/roads/hex_road_B', 'tiles/roads/hex_road_M',
  'buildings/red/building_castle_red', 'buildings/red/building_tower_B_red',
  'buildings/red/building_church_red', 'buildings/red/building_blacksmith_red', 'buildings/red/building_tavern_red',
  'buildings/red/building_market_red', 'buildings/red/building_home_A_red', 'buildings/red/building_home_B_red',
  'buildings/red/building_windmill_red', 'buildings/red/building_watermill_red', 'buildings/red/building_well_red',
  'buildings/red/building_archeryrange_red', 'buildings/red/building_lumbermill_red',
  'buildings/neutral/building_grain', 'buildings/neutral/building_dirt',
  'decoration/nature/trees_A_large', 'decoration/nature/trees_A_medium', 'decoration/nature/trees_A_small',
  'decoration/nature/trees_B_large', 'decoration/nature/trees_B_medium', 'decoration/nature/trees_B_small',
  'decoration/nature/tree_single_A', 'decoration/nature/tree_single_B',
  'decoration/nature/hills_A_trees', 'decoration/nature/hills_B_trees', 'decoration/nature/hill_single_A', 'decoration/nature/hill_single_B',
  'decoration/nature/mountain_A_grass_trees', 'decoration/nature/mountain_B_grass', 'decoration/nature/mountain_C_grass_trees',
  'decoration/nature/rock_single_A', 'decoration/nature/rock_single_C', 'decoration/nature/waterlily_A', 'decoration/nature/waterplant_A',
  'decoration/nature/cloud_big', 'decoration/nature/cloud_small',
  'decoration/props/flag_red', 'decoration/props/tent', 'decoration/props/barrel',
  'decoration/props/sack', 'decoration/props/target', 'decoration/props/weaponrack', 'decoration/props/wheelbarrow',
  'decoration/props/resource_lumber',
];


// Dungeon Remastered models shared by the section interiors.
const ROOMS = [
  'wall', 'wall_arched', 'wall_window_open', 'wall_shelves', 'wall_doorway', 'wall_corner', 'pillar', 'pillar_decorated',
  'floor_wood_large', 'floor_wood_large_dark', 'floor_tile_large', 'floor_tile_small',
  'torch_mounted', 'torch_lit', 'candle_lit', 'candle_triple', 'candle_melted', 'candle_thin_lit',
  'shelves', 'shelf_large', 'shelf_small_candles',
  'table_medium', 'table_long', 'table_long_decorated_A', 'table_small', 'stool', 'chair',
  'keg', 'keg_decorated', 'barrel_large', 'barrel_small', 'barrel_small_stack', 'box_large', 'box_small', 'box_stacked', 'crates_stacked',
  'banner_shield_red', 'banner_patternA_red', 'banner_patternB_yellow', 'banner_patternC_blue', 'banner_thin_green', 'banner_triple_red',
  'chest', 'chest_gold', 'coin_stack_large', 'coin_stack_small', 'trunk_medium_A', 'trunk_large_A',
  'plate_food_A', 'plate_food_B', 'plate', 'bottle_A_brown', 'bottle_A_labeled_green', 'bottle_B_green',
  'sword_shield', 'keyring_hanging', 'stairs_wood',
];

const BUNDLES = {
  estate: { dir: '.vendor-src/kaykit/addons/kaykit_medieval_hexagon_pack/Assets/gltf', list: ESTATE, out: 'public/models/estate.glb' },
  rooms: { dir: '.vendor-src/dungeon/addons/kaykit_dungeon_remastered/Assets/gltf', list: ROOMS, out: 'public/models/rooms.glb' },
};

const [bundleName, flag, altOut] = process.argv.slice(2);
const bundle = BUNDLES[bundleName];
if (!bundle) {
  console.error('usage: node scripts/build-models.mjs <' + Object.keys(BUNDLES).join('|') + '> [--all out.glb]');
  process.exit(1);
}
const srcDir = bundle.dir;
const outFile = flag === '--all' ? altOut : bundle.out;

// Source files may be .gltf (+ .bin), .gltf.glb or .glb.
const EXTS = ['.gltf', '.gltf.glb', '.glb'];
const resolve = (rel) => EXTS.map((e) => path.join(srcDir, rel + e)).find((f) => fs.existsSync(f));
const baseName = (rel) => path.basename(rel);

function listAll(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listAll(p));
    else if (/\.(gltf|glb)$/.test(e.name) && !p.includes('waterless') && !/_(blue|green|yellow)\.gltf$/.test(e.name)) {
      out.push(path.relative(srcDir, p).replace(/\\/g, '/').replace(/(\.gltf\.glb|\.gltf|\.glb)$/, ''));
    }
  }
  return out;
}

const list = flag === '--all' ? listAll(srcDir) : bundle.list;

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

const target = await io.read(resolve(list[0]));
const root = target.getRoot();
const mainScene = root.listScenes()[0];

// Wrap the scene content of a freshly merged model in one named node.
function wrap(scene, name) {
  const holder = target.createNode(name);
  for (const child of scene.listChildren()) holder.addChild(child);
  return holder;
}

const firstHolder = wrap(mainScene, baseName(list[0]));
mainScene.addChild(firstHolder);

for (const rel of list.slice(1)) {
  const file = resolve(rel);
  if (!file) { console.warn('missing', rel); continue; }
  const src = await io.read(file);
  const map = mergeDocuments(target, src);
  const srcScene = map.get(src.getRoot().listScenes()[0]);
  const holder = wrap(srcScene, baseName(rel));
  mainScene.addChild(holder);
  srcScene.dispose();
}

await target.transform(
  unpartition(),
  dedup(),
  prune({ keepLeaves: true }),
  weld(),
  quantize(),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);

fs.mkdirSync(path.dirname(outFile), { recursive: true });
await io.write(outFile, target);
console.log('models', list.length, 'bytes', fs.statSync(outFile).size, '->', outFile);
