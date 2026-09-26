// Compresses the raw surfers from build_surfers.py with meshopt (their WebP textures, already capped at
// 2048 px by the Blender build, pass through: npm gltfpack has no texture codecs) and writes
// public/assets/surfers/surfers.json.
// Run: node scripts/assets/pack-surfers.mjs (after the Blender build; `npm run assets:surfers` runs both).
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';

const BUILD = 'scripts/assets/.build';
const OUT = 'public/assets/surfers';
mkdirSync(OUT, { recursive: true });

/** The GLB's JSON chunk. */
function glbJson(path) {
  const bytes = readFileSync(path);
  return JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
}

/** Standing height from the LOD0 body's position bounds (glTF is y-up), m. */
function bodyHeight(path) {
  const json = glbJson(path);
  const node = json.nodes.find((n) => n.name === 'LOD0');
  const accessor = json.accessors[json.meshes[node.mesh].primitives[0].attributes.POSITION];
  return Math.round((accessor.max[1] - accessor.min[1]) * 1000) / 1000;
}

const manifest = JSON.parse(readFileSync(`${BUILD}/surfers.json`, 'utf8'));
for (const surfer of manifest.surfers) {
  const out = `${OUT}/${surfer.id}.glb`;
  // -kn/-km keep the named LOD nodes, bones and materials; -noq keeps float positions so the bind pose stays exact.
  execFileSync('npx', ['gltfpack', '-i', `${BUILD}/${surfer.id}.glb`, '-o', out, '-cc', '-kn', '-km', '-noq'], { stdio: 'inherit' });
  surfer.height = bodyHeight(`${BUILD}/${surfer.id}.glb`);
  surfer.bytes = statSync(out).size;
}
writeFileSync(`${OUT}/surfers.json`, `${JSON.stringify(manifest, null, 2)}\n`);
for (const s of manifest.surfers) console.log(`${s.id}: ${s.sex}, ${s.height} m, ${(s.bytes / 1e6).toFixed(2)} MB`);
