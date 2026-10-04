import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import { BARREL_CASES } from './barrelLibraryIndex';
import { BARREL_SPOTS } from './barrelSpots';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { sheetTablesLookup } from './lipSheet';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { LANDMARK, PROFILE_POINTS, ProfileLibrary, type FrameBlend, type ProfileQuery } from './ProfileLibrary';
import { collapseFade, LOFT, LOFT_SAMPLES, SHEET, SweptLoft, type LoftOptions, type LoftResult } from './sweptLoft';

const slope = 1 / 19;
const cases = readBarrelCases('padang').map(decodeCase).filter(c => c.id === 'pad19-a30-l12' || c.id === 'pad19-a45-l12');
const library = new ProfileLibrary(cases);
const water = () => 0.5;

// Exact reconstructed F64 queries for original joined rows 126/127, not their stored F32 clock/height metadata:
// surf-tube-roof-pair-trace-v2-20261004/offline-first/report.json. These are query fixtures, not a scene recreation.
const retainedPair: readonly ProfileQuery[] = [
  { slope, footHeight: 2.132902355075316, footDepth: 7, seconds: 0.9530038807609096 },
  { slope, footHeight: 2.1626204601763757, footDepth: 7, seconds: 0.9868426724008363 },
];

const blend = (): FrameBlend => ({
  lower: cases[0], upper: cases[1], weight: 0, scale: 0,
  lowerFrame: 0, lowerNext: 0, lowerShare: 0, upperFrame: 0, upperNext: 0, upperShare: 0,
});

/** Synthetic full front, with actual record quantization; fixed slope/rays, no overlapping fronts. */
function records(query: ProfileQuery, varying = false): Float32Array {
  const out = new Float32Array(21 * FRONT_STRIDE);
  for (let k = 0; k < 21; k += 1) {
    const o = k * FRONT_STRIDE;
    out[o + FRONT_FIELD.x] = k;
    out[o + FRONT_FIELD.z] = -100;
    out[o + FRONT_FIELD.front] = 48;
    out[o + FRONT_FIELD.sigma] = k;
    out[o + FRONT_FIELD.tau] = query.seconds + (varying ? (k - 10) * 0.001 : 0);
    out[o + FRONT_FIELD.footHeight] = query.footHeight + (varying ? (k - 10) * 0.002 : 0);
    out[o + FRONT_FIELD.footDepth] = query.footDepth;
    out[o + FRONT_FIELD.throwZ] = query.seconds >= 0 ? -100 : Number.NaN;
    out[o + FRONT_FIELD.pace] = query.seconds >= 0 ? 4 : Number.NaN;
  }
  return out;
}

/** Every allocated result word, including suffixes and NaN payloads, plus every scalar. */
function equalResults(a: LoftResult, b: LoftResult): void {
  expect(Object.keys(a)).toEqual(Object.keys(b));
  for (const [key, value] of Object.entries(a)) {
    const other = b[key as keyof LoftResult];
    if (ArrayBuffer.isView(value)) {
      expect(ArrayBuffer.isView(other), key).toBe(true);
      const view = other as ArrayBufferView;
      expect(view.constructor, key).toBe(value.constructor);
      expect(Buffer.from(value.buffer, value.byteOffset, value.byteLength).equals(
        Buffer.from(view.buffer, view.byteOffset, view.byteLength),
      ), key).toBe(true);
    } else expect(Object.is(value, other), key).toBe(true);
  }
}

function finiteGeometry(result: LoftResult): void {
  for (const [key, width] of [
    ['positions', 3], ['normals', 3], ['mask', 1], ['lift', 1], ['sheet', 1], ['sheetWeight', 1], ['sheetBack', 1], ['throat', 4],
  ] as const) {
    expect(result[key].subarray(0, width * result.vertexCount).every(Number.isFinite), key).toBe(true);
  }
  expect(result.indices.subarray(0, result.indexCount).every(v => v < result.vertexCount)).toBe(true);
}

function transitionQueries(): ProfileQuery[] {
  const q = { ...retainedPair[1], footHeight: Math.fround(retainedPair[1].footHeight) };
  const times = library.profileTimes(q);
  const lower = library.caseBlend(q).lower;
  const hold = library.heldFrameOf(lower).tau * Math.sqrt(times.scale / 9.81);
  return [
    -0.1, hold - times.frameSeconds / 4, hold + times.frameSeconds / 4,
    ...retainedPair.map(p => p.seconds), times.clearSeconds,
    times.touchdownSeconds - 0.005, times.touchdownSeconds + 0.005,
    times.touchdownSeconds + 0.5 * times.collapseSeconds,
    times.touchdownSeconds + 0.99 * times.collapseSeconds,
    times.touchdownSeconds + 1.01 * times.collapseSeconds,
  ].map(seconds => ({ ...q, seconds }));
}

describe('the clear-profile drawing hold', () => {
  it('retains the real Padang pair and measures the held-profile change without a visual acceptance threshold', () => {
    expect(cases.map(c => c.id).sort()).toEqual(['pad19-a30-l12', 'pad19-a45-l12']);
    const profiles = (hold: ProfileQuery['hold']) => retainedPair.map(q => {
      const profile = new Float32Array(2 * PROFILE_POINTS);
      library.profileAt({ ...q, hold }, profile);
      return profile;
    });
    const original = profiles('drawing');
    const held = profiles('contact');
    const originalDelta = original[1][2 * 83 + 1] - original[0][2 * 83 + 1];
    const heldDelta = held[1][2 * 83 + 1] - held[0][2 * 83 + 1];
    expect(originalDelta).toBe(-1.3689085245132446);
    expect(heldDelta).not.toBe(originalDelta);
    const rawFrames = retainedPair.map(q => library.frameBlend({ ...q, hold: 'drawing' }, blend()));
    const heldFrames = retainedPair.map(q => library.frameBlend({ ...q, hold: 'contact' }, blend()));
    expect(rawFrames.map(b => [b.lowerFrame, b.lowerNext])).toEqual([[154, 155], [156, 157]]);
    expect(heldFrames[1].lowerFrame + heldFrames[1].lowerShare).toBeCloseTo(155, 10);
    expect(heldFrames[0].upperFrame + heldFrames[0].upperShare).toBe(rawFrames[0].upperFrame + rawFrames[0].upperShare);
    expect(heldFrames[1].upperFrame + heldFrames[1].upperShare).toBe(rawFrames[1].upperFrame + rawFrames[1].upperShare);
    const maximumDelta = (p: Float32Array[]) => Math.max(...Array.from({ length: 57 }, (_, i) =>
      Math.abs(p[1][2 * (LANDMARK.crest + i) + 1] - p[0][2 * (LANDMARK.crest + i) + 1]),
    ));
    console.info('clear-roof exact query pair', JSON.stringify({
      rows: [126, 127], point: 83, originalDeltaY: originalDelta, heldDeltaY: heldDelta,
      originalMaxAbsDeltaY32to88: maximumDelta(original), heldMaxAbsDeltaY32to88: maximumDelta(held),
    }));
  });

  it('keeps explicit-disabled and default drawing outputs byte-identical through holds, touchdown and collapse', () => {
    const original = new SweptLoft(library, slope);
    const disabled = new SweptLoft(library, slope, { holdClearDrawing: false });
    for (const q of transitionQueries()) {
      const front = records(q, true);
      equalResults(original.build(front, 21, 0.5, water), disabled.build(front, 21, 0.5, water));
    }
  });

  it('ignores the option in contact mode for every result array, including auxiliary drawing landmarks and optional sheets', () => {
    for (const sheet of [undefined, false, true]) {
      const original = new SweptLoft(library, slope, { contact: true, sheet, holdClearDrawing: false });
      const enabled = new SweptLoft(library, slope, { contact: true, sheet, holdClearDrawing: true });
      for (const q of transitionQueries()) {
        const front = records(q, true);
        equalResults(original.build(front, 21, 0.5, water), enabled.build(front, 21, 0.5, water));
      }
    }
  });

  it('uses one held geometry/sheet authority on full lofts while preserving the original clock, phase, fade and schedule', () => {
    const original = new SweptLoft(library, slope);
    const enabled = new SweptLoft(library, slope, { holdClearDrawing: true });
    const profile = new Float32Array(2 * PROFILE_POINTS);
    const sheets = { across: new Float32Array(PROFILE_POINTS), back: new Float32Array(PROFILE_POINTS) };
    let checked = 0;
    for (const q of transitionQueries()) {
      const front = records(q);
      const a = original.build(front, 21, 0.5, water);
      const b = enabled.build(front, 21, 0.5, water);
      expect([b.vertexCount, b.indexCount, b.sliceCount]).toEqual([a.vertexCount, a.indexCount, a.sliceCount]);
      for (const key of ['sliceFront', 'sliceSigma', 'sliceTau', 'slicePhase', 'sliceLife', 'sliceCollapse', 'sliceFade', 'sliceWeight', 'sliceJoined', 'sliceRayX', 'sliceRayZ'] as const) {
        expect(b[key].subarray(0, b.sliceCount), key).toEqual(a[key].subarray(0, a.sliceCount));
      }
      finiteGeometry(b);
      if (b.sliceCount === 0) continue;
      const middle = b.sliceSigma.subarray(0, b.sliceCount).findIndex(sigma => sigma === 10);
      expect(middle).toBeGreaterThanOrEqual(0);
      const actual = { ...q, footHeight: front[FRONT_FIELD.footHeight], seconds: front[FRONT_FIELD.tau], hold: 'contact' } as const;
      const lookup = library.profileAt(actual, profile);
      const fade = collapseFade(actual.seconds, lookup.touchdownSeconds, lookup.collapseSeconds);
      const formed = sheetTablesLookup(library.frameBlend(actual, blend()), sheets);
      expect(b.sliceTau[middle]).toBe(actual.seconds);
      expect(b.sliceFade[middle]).toBe(Math.fround(fade));
      expect(b.sliceFormed[middle]).toBe(Math.fround(formed));
      for (let point = LANDMARK.crest; point <= LANDMARK.toe; point += 1) {
        const v = middle * LOFT_SAMPLES + LOFT.extensionSamples + point;
        expect(b.positions[3 * v + 1], `tau=${actual.seconds}, point=${point}`).toBe(Math.fround(0.5 + fade * profile[2 * point + 1]));
        expect(b.lift[v]).toBe(Math.fround(fade));
        if (formed > 0 && point > LANDMARK.crest && point < LANDMARK.throat) {
          const ramp = Math.min(1, Math.min(point - LANDMARK.crest, LANDMARK.throat - point) / (SHEET.ramp + 1));
          expect(b.sheet[v]).toBe(sheets.across[point]);
          expect(b.sheetBack[v]).toBe(sheets.back[point]);
          expect(b.sheetWeight[v]).toBe(Math.fround(formed * ramp * fade));
        }
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('snapshots the drawing option at construction rather than following later caller mutation', () => {
    const options: LoftOptions = { holdClearDrawing: true };
    const captured = new SweptLoft(library, slope, options);
    options.holdClearDrawing = false;
    const front = records(retainedPair[1]);
    equalResults(captured.build(front, 21, 0.5, water), new SweptLoft(library, slope, { holdClearDrawing: true }).build(front, 21, 0.5, water));
    options.holdClearDrawing = false;
    const disabled = new SweptLoft(library, slope, options);
    options.holdClearDrawing = true;
    equalResults(disabled.build(front, 21, 0.5, water), new SweptLoft(library, slope).build(front, 21, 0.5, water));
  });

  it('keeps every shipped spot case finite at late-clear, touchdown and collapse clocks without changing contact or clock/fade authority', () => {
    const visited: string[] = [];
    for (const spot of new Set(BARREL_CASES.map(entry => entry.spot))) {
      const rules = BARREL_SPOTS[spot];
      if (!rules) throw new Error(`The shipped barrel spot ${spot} has no loft configuration`);
      const spotCases = readBarrelCases(spot).map(decodeCase);
      const spotLibrary = new ProfileLibrary(spotCases);
      for (const c of spotCases) {
        visited.push(c.id);
        const base = { slope: rules.slope, footHeight: Math.fround(c.nonlinearity * rules.footDepth), footDepth: rules.footDepth };
        const times = spotLibrary.profileTimes(base);
        const original = new SweptLoft(spotLibrary, rules.slope);
        const enabled = new SweptLoft(spotLibrary, rules.slope, { holdClearDrawing: true });
        // Explicit sheets also exercise the contact's auxiliary drawing lookup and matching frameBlend selector.
        const contact = new SweptLoft(spotLibrary, rules.slope, { contact: true, sheet: true });
        const flaggedContact = new SweptLoft(spotLibrary, rules.slope, { contact: true, sheet: true, holdClearDrawing: true });
        const clocks = [
          Math.min(times.touchdownSeconds, times.clearSeconds + times.frameSeconds / 4),
          times.touchdownSeconds,
          times.touchdownSeconds + times.collapseSeconds / 2,
          times.touchdownSeconds + times.collapseSeconds + times.frameSeconds,
        ];
        for (const seconds of clocks) {
          const front = records({ ...base, seconds });
          const a = original.build(front, 21, 0.5, water);
          const b = enabled.build(front, 21, 0.5, water);
          finiteGeometry(b);
          expect([b.vertexCount, b.indexCount, b.sliceCount], c.id).toEqual([a.vertexCount, a.indexCount, a.sliceCount]);
          for (const key of ['sliceSigma', 'sliceTau', 'slicePhase', 'sliceLife', 'sliceCollapse', 'sliceFade', 'sliceWeight', 'sliceJoined'] as const) {
            expect(b[key].subarray(0, b.sliceCount), `${c.id}: ${key}`).toEqual(a[key].subarray(0, a.sliceCount));
          }
          const actual = { ...base, footHeight: front[FRONT_FIELD.footHeight], footDepth: front[FRONT_FIELD.footDepth], seconds: front[FRONT_FIELD.tau] };
          const actualTimes = spotLibrary.profileTimes(actual);
          const fade = collapseFade(actual.seconds, actualTimes.touchdownSeconds, actualTimes.collapseSeconds);
          if (fade === 0) expect([b.vertexCount, b.indexCount, b.sliceCount], c.id).toEqual([0, 0, 0]);
          else {
            expect(b.indexCount, c.id).toBeGreaterThan(0);
            expect(b.sliceTau.subarray(0, b.sliceCount).every(tau => tau === actual.seconds), c.id).toBe(true);
            expect(b.sliceFade.subarray(0, b.sliceCount).every(w => w === Math.fround(fade)), c.id).toBe(true);
          }
          equalResults(contact.build(front, 21, 0.5, water), flaggedContact.build(front, 21, 0.5, water));
        }
      }
    }
    expect(visited.sort()).toEqual(BARREL_CASES.map(entry => entry.id).sort());
  });
});
