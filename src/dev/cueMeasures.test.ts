import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { readGlbSkeleton } from '../scene/rig/glbSkeleton';
import { cueShift, stanceMarks, type CueMarks } from './cueMeasures';

const marks = (offset: Vector3): CueMarks => ({
  hips: new Vector3(0, 0.9, 0).add(offset),
  head: new Vector3(0, 1.6, 0).add(offset),
  hands: [new Vector3(0.4, 1.2, 0).add(offset), new Vector3(-0.4, 1.2, 0).add(offset)],
});

describe('the cue measures (step 5)', () => {
  it('reads the largest shift of the watched points along an axis of the board', () => {
    const a = marks(new Vector3());
    const b = marks(new Vector3(0.02, -0.15, 0.08));
    b.head.z += 0.04;
    expect(cueShift(a, b, 'y')).toBeCloseTo(0.15, 9);
    expect(cueShift(a, b, 'z')).toBeCloseTo(0.12, 9);
    expect(cueShift(a, b, 'x')).toBeCloseTo(0.02, 9);
    // The body's cues read the hips and the head: the hands move for their own reasons.
    b.hands[0].z += 0.5;
    expect(cueShift(a, b, 'z', ['hips', 'head'])).toBeCloseTo(0.12, 9);
  });

  // The front view (about 11 m, 52°): 10 cm is about 10 pixels at 1080p. Each body cue, between its input's
  // extremes, on the four surfers, Regular and Goofy: weight (trim back to forward, along the board), edge (Compress
  // frontside to backside, across it) and depth (trim to Compress, along the deck's normal).
  it('moves the body 10 cm or more with the weight, the edge and the depth', () => {
    for (const surfer of ['surfer1', 'surfer2', 'surfer3', 'surfer4']) {
      const bytes = readFileSync(`public/assets/surfers/${surfer}.glb`);
      const skeleton = () => readGlbSkeleton(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
      for (const side of ['regular', 'goofy'] as const) {
        const at = (id: string) => stanceMarks(id, side, skeleton());
        const where = `${surfer} ${side}`;
        expect(cueShift(at('trim-back'), at('trim-forward'), 'z', ['hips', 'head']), `${where}: weight`).toBeGreaterThan(0.1);
        expect(cueShift(at('compress-frontside'), at('compress-backside'), 'x', ['hips', 'head']), `${where}: edge`).toBeGreaterThan(0.1);
        expect(cueShift(at('trim'), at('compress-frontside'), 'y', ['hips', 'head']), `${where}: depth`).toBeGreaterThan(0.1);
      }
    }
  }, 240_000);

  it('marks a stance as the game draws it, on the board', () => {
    const bytes = readFileSync('public/assets/surfers/surfer2.glb');
    const skeleton = readGlbSkeleton(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    const trim = stanceMarks('trim', 'regular', skeleton);
    const compress = stanceMarks('compress-frontside', 'regular', skeleton);
    // Standing on the deck: the hips about a metre above it, the head higher; Compress is lower.
    expect(trim.hips.y).toBeGreaterThan(0.6);
    expect(trim.head.y).toBeGreaterThan(trim.hips.y + 0.3);
    expect(compress.hips.y).toBeLessThan(trim.hips.y);
  });
});
