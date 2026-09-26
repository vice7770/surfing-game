import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REQUIRED_BONES } from '../../src/scene/rig/humanoidBones';

/** Node names as three.js's GLTFLoader sanitises them (`PropertyBinding.sanitizeNodeName`). */
const sanitize = (name: string) => name.replace(/\s/g, '_').replace(/[[\]\.:\/]/g, '');

function glbJson(path: string) {
  const bytes = readFileSync(path);
  return JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
}

const manifest: { surfers: { id: string; sex: string; height: number; file: string }[] } = JSON.parse(readFileSync('public/assets/surfers/surfers.json', 'utf8'));

describe('committed surfers', () => {
  it('lists four surfers, two women and two men, within 5 % of the reference rider’s 1.72 m', () => {
    expect(manifest.surfers).toHaveLength(4);
    expect(manifest.surfers.filter((s) => s.sex === 'female')).toHaveLength(2);
    for (const surfer of manifest.surfers) expect(Math.abs(surfer.height - 1.72) / 1.72, surfer.id).toBeLessThan(0.05);
  });

  it.each(manifest.surfers.map((s) => s.id))('%s carries the rig’s bones, one skin, both LODs and compressed geometry', (id) => {
    const json = glbJson(`public/assets/surfers/${id}.glb`);
    const names = new Set<string>(json.nodes.map((n: { name?: string }) => sanitize(n.name ?? '')));
    for (const bone of REQUIRED_BONES) expect(names, bone).toContain(bone);
    expect(json.skins).toHaveLength(1);
    expect(names).toContain('LOD0');
    expect(names).toContain('LOD1');
    expect(json.extensionsUsed).toContain('EXT_meshopt_compression');
    expect(json.extensionsUsed).toContain('EXT_texture_webp');
  });
});
