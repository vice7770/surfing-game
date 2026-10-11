import { BufferAttribute, BufferGeometry, DoubleSide, DynamicDrawUsage, Mesh, MeshPhysicalMaterial } from 'three';
import { CURL_CAPACITY, CURL_FIELD, CURL_STRIDE, impactTime } from '../wave/SpillingCurl';
import type { WaterLook } from './water/waterLook';
import { RICH_FAR_FOAM, RICH_REFLECTION, richFarNormal, richFragmentPars, richReflectionPars } from './water/richWaterGlsl';
import { waterRipplePars } from './water/rippleTexture';
import { CLASSIC_ROUGHNESS, waterSpecularPars } from './water/specular';
import { waterChopNormal } from './waterChop';
import { CLASSIC_FOAM, WATER_IOR, waterBodyFragment } from './waterOptics';
import { waterFragmentPars, waterVertexPars } from './WaterSurface';
import { RICH_LIP_GLOW, RICH_SHEET_BODY, RICH_SHEET_BODY_NORMAL, SWEPT_SHEET_BODY } from './barrel/SweptBarrelMesh';

/**
 * Where a curl slice's cross-section is sampled along its lip, s from the sharpened crest (0) to its tip as far as it has
 * gone (1): the outer surface takes them all, the underside the lip's part again, from the tip back toward the crest.
 */
const OUTER = [0, 0.2, 0.4, 0.6, 0.8, 0.93] as const;
const UNDER = [0.93, 0.8, 0.6, 0.4, 0.2] as const;
/** Along the void's floor, as shares of the tip's reach: the face under the lip, darkened for the sky the lip hides. */
const FLOOR = [0.4, 0.7, 0.95] as const;
/**
 * Points per slice: the root and the back of the crest, the outer surface, the tip, the underside, the void's back foot
 * and its floor.
 */
export const CURL_POINTS = 2 + OUTER.length + 1 + UNDER.length + 1 + FLOOR.length;
/** The most ribbons' ends closed with a slice of nothing (`buildCurlRibbon`); past them an end is left as it stands. */
const CAPS = 8;
/** The most slices a ribbon is lofted through, and the vertices and triangle indices it fills. */
const SLICES = CURL_CAPACITY + CAPS;
export const CURL_VERTICES = SLICES * CURL_POINTS;
const INDICES = 6 * (CURL_POINTS - 1) * SLICES;
/** The root and the feet sink this far under the water as drawn, m, so the curl grows out of it with no seam. */
const BURY = 0.04;
/** The crest's back the lip rises from, this share of the landing's distance behind the crest. */
const BACK = 0.6;
/** The void's floor lies this far over the face as drawn, m. */
const FLOOR_LIFT = 0.03;
/**
 * The crest sharpens to a peak this share of H over the crest as drawn, no more (the coordinator's ruling, round 2: a
 * real jet leaves the crest nearly level and falls, so it never stands proud), over the first third of its flight.
 */
const RISE = 0.1;
const SHARPEN = 0.35;
/** Slices of one wave further apart than this along shore, m, are separate ribbons. */
const JOIN = 1.6;
/**
 * The light behind the lip: the share of its far side that sees the sky rather than the wave's own water
 * (`SWEPT_SHEET_BODY`'s F). Behind a small spilling curl lie its void and the crest's water, so it is shaded mostly
 * against the face, translucent green (provisional; the swept barrel's open lip has its own, larger share).
 */
const SKY_BEHIND = 0.1;
/** Toward its tip the lip's far side sees more sky: up to this much more, so its falling edge is its brightest part (P). */
const SKY_AT_TIP = 0.5;
/**
 * The contrast route for the void the gentle face leaves too low (the coordinator's ruling, round 2): the lip's
 * underside and the face under it are darkened for the sky the lip hides, so the void reads as a dark line under a
 * bright lip. Shares of the light taken away, and the floor's opacity (P).
 */
const UNDER_SHADE = 0.45;
const FLOOR_SHADE = 0.6;
const FLOOR_ALPHA = 0.75;
/**
 * Fades, as shares of the landing's distance a/L: the lip grows out of the crest's water from ROOT_FADE[0] behind the
 * crest (invisible) to ROOT_FADE[1] (whole), so no seam shows where it attaches; the underside likewise out of the void's
 * back. As its void fills it whitens, bulks into a white mass and fades out into its landing patch.
 */
const ROOT_FADE = [-0.4, 0.1] as const;
const UNDER_FADE = [0.1, 0.35] as const;
const COLLAPSE_FADE = [0.3, 1] as const;
/** Where it falls as a thin sheet, this share of the water behind shows through it (P): translucent, not glass. */
const THIN_SHOWS = 0.3;
/**
 * The Rich curl's roughness: a falling sheet is never mirror-still as the Rich water's base (0.08, broken up there by its
 * ripples) would draw its smooth curve, a plastic sheen (P).
 */
const RICH_CURL_ROUGHNESS = 0.25;
/**
 * The falling sheet's streaks (the advisor, round 2; Surf's Up's falling face, shifted "to give the appearance of
 * downward motion"; Valve's flow map, Vlachos 2010): two layers half a period apart, scrolled along the lip from the
 * crest to its tip, faster toward the tip (`slow` to `fast`, m/s: the surface near the crest moves at 0–0.3 C, the tip
 * at 2.5–4 m/s down), laid in world x across it, 4:1 long (`spacing` across, `length` along, m: 2–4 lip thicknesses at
 * Medium) over a `period` no longer than a touchdown, s, drawn toward the foam colour by up to `strength` (all P).
 */
const STREAKS = { slow: 0.4, fast: 3.2, spacing: 0.3, length: 1.2, period: 0.45, strength: 0.4 } as const;
/**
 * The ragged tip, fixed in world x (Surf's Up's lip trains): fingers cut out of its last fifth at a `period` m, and its
 * froth (up to `froth`) varied with the same noise.
 */
const RAGGED = { period: 0.45, froth: 0.3 } as const;
const smooth = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** The ribbon `buildCurlRibbon` fills: per vertex, its place and normal and how it is shaded; then its triangles. */
export interface CurlRibbon {
  positions: Float32Array;
  normals: Float32Array;
  /** 0 clear water … 1 foam. */
  foam: Float32Array;
  /** The lip's thickness there, m, how far it is shaded as a thin sheet, and the sky's share behind it. */
  sheet: Float32Array;
  sheetWeight: Float32Array;
  sheetBack: Float32Array;
  /** The face under it (its back wall) and that face's normal, for the light behind the sheet. */
  wall: Float32Array;
  wallNormal: Float32Array;
  /** The sheet's other side's normal at the same place (Rich's two-interface transmission). */
  exitNormal: Float32Array;
  /** How much of the water behind shows through: 0 where it fades into the crest or out as it collapses, 1 whole. */
  alpha: Float32Array;
  /** Per vertex: its arc along the lip from the crest, m; where it lies along the lip, 0 crest … 1 tip; its darkening. */
  flow: Float32Array;
  indices: Uint32Array;
  vertexCount: number;
  indexCount: number;
}

export function createCurlRibbon(): CurlRibbon {
  return {
    positions: new Float32Array(3 * CURL_VERTICES), normals: new Float32Array(3 * CURL_VERTICES), foam: new Float32Array(CURL_VERTICES),
    sheet: new Float32Array(CURL_VERTICES), sheetWeight: new Float32Array(CURL_VERTICES), sheetBack: new Float32Array(CURL_VERTICES),
    wall: new Float32Array(3 * CURL_VERTICES), wallNormal: new Float32Array(3 * CURL_VERTICES), exitNormal: new Float32Array(3 * CURL_VERTICES),
    alpha: new Float32Array(CURL_VERTICES), flow: new Float32Array(3 * CURL_VERTICES), indices: new Uint32Array(INDICES), vertexCount: 0, indexCount: 0,
  };
}

/** What a cross-section point is: the crest's water, the lip's outer surface or its underside, or the void's floor. */
const BODY = 0;
const OUTSIDE = 1;
const INSIDE = -1;
const FLOORED = 2;
// One slice's cross-section in its own frame (a ahead along its normal from the crest, y up from the crest's top).
const sectionA = new Float64Array(CURL_POINTS);
const sectionY = new Float64Array(CURL_POINTS);
const sectionS = new Float64Array(CURL_POINTS);
const sectionKind = new Int8Array(CURL_POINTS);
const sectionFace = new Float64Array(CURL_POINTS);
const sectionNormalA = new Float64Array(CURL_POINTS);
const sectionNormalY = new Float64Array(CURL_POINTS);
const sectionPair = new Int32Array(CURL_POINTS);
const outerFace = new Float64Array(OUTER.length);
const order = new Int32Array(CURL_CAPACITY);
/** The slices in the order they are lofted, with the ends' closing slices. */
const lofted = new Float32Array(SLICES * CURL_STRIDE);
/** Each lofted slice's run: only slices of one run are joined. */
const runOf = new Int32Array(SLICES);

/**
 * The curls' ribbon from a snapshot's slices (`CURL_FIELD`; `SpillingCurl.writeCurls`), each slice at its own age in the
 * break's sequence (the advisor, round 2), so a column's curl forms, falls, lands and collapses as the peel passes it:
 * - the crest sharpens to a peak, at most 0.1 H over the crest as drawn, over the first third of the flight;
 * - its tip goes out first, nearly level, and falls ballistically (a parabola in its reach, so its drop grows as t²),
 *   landing on the face as drawn (`heightAt`) where Pick & Feddersen's lip lands, at its touchdown 0.6 √H s;
 * - its void opens under it as it reaches out (in the last third), its underside and the face under it darkened;
 * - from touchdown its void fills over 0.5 s: the lip settles onto the face, whitens from its tip, bulks and fades out.
 * The face stands in for the void's lower branch: the solver's cannot overturn. Slices of one wave in neighbouring
 * columns are joined along shore, in x order.
 */
export function buildCurlRibbon(slices: Float32Array, count: number, heightAt: (x: number, z: number) => number, out: CurlRibbon): CurlRibbon {
  const n = Math.min(count, CURL_CAPACITY, Math.floor(slices.length / CURL_STRIDE));
  for (let s = 0; s < n; s += 1) order[s] = s;
  const field = (s: number, f: number) => slices[s * CURL_STRIDE + f];
  // By wave, then along shore; each run of one wave's slices closed at its ends by a slice of nothing half a column
  // beyond, where it does not already end in one (its front's), so no ribbon ends open.
  const sorted = Array.from(order.subarray(0, n)).sort((p, q) => field(p, CURL_FIELD.wave) - field(q, CURL_FIELD.wave) || field(p, CURL_FIELD.x) - field(q, CURL_FIELD.x));
  const joins = (p: number, q: number) => field(p, CURL_FIELD.wave) === field(q, CURL_FIELD.wave) && Math.abs(field(p, CURL_FIELD.x) - field(q, CURL_FIELD.x)) <= JOIN;
  let count2 = 0;
  let caps = 0;
  let run = 0;
  const copy = (from: number, shift: number, closed: boolean) => {
    lofted.set(slices.subarray(from * CURL_STRIDE, (from + 1) * CURL_STRIDE), count2 * CURL_STRIDE);
    runOf[count2] = run;
    if (closed) {
      const o = count2 * CURL_STRIDE;
      lofted[o + CURL_FIELD.x] += shift;
      lofted[o + CURL_FIELD.length] = 0;
      lofted[o + CURL_FIELD.width] = 0;
      lofted[o + CURL_FIELD.thickness] = 0;
      caps += 1;
    }
    count2 += 1;
  };
  sorted.forEach((s, k) => {
    if (k > 0 && !joins(sorted[k - 1], s)) run += 1;
    const open = field(s, CURL_FIELD.length) > 0 && caps < CAPS;
    if (open && (k === 0 || !joins(sorted[k - 1], s))) copy(s, -0.5, true);
    copy(s, 0, false);
    if (field(s, CURL_FIELD.length) > 0 && caps < CAPS && (k === sorted.length - 1 || !joins(s, sorted[k + 1]))) copy(s, 0.5, true);
  });
  let vertices = 0;
  let indices = 0;
  let previous = -1;
  for (let s = 0; s < count2; s += 1) {
    const o = s * CURL_STRIDE;
    const x = lofted[o + CURL_FIELD.x];
    const z = lofted[o + CURL_FIELD.z];
    const nx = lofted[o + CURL_FIELD.normalX];
    const nz = lofted[o + CURL_FIELD.normalZ];
    const landing = lofted[o + CURL_FIELD.length];
    const height = lofted[o + CURL_FIELD.height];
    const white = lofted[o + CURL_FIELD.white];
    const impact = impactTime(height);
    const flight = impact > 0 ? Math.min(1, Math.max(0, lofted[o + CURL_FIELD.age] / impact)) : 1;
    // The tip's reach, the crest's peak, the void's opening; collapsing, the lip settles, bulks white and fades.
    const reach = flight * landing;
    const peak = RISE * height * smooth(0, SHARPEN, flight);
    const open = smooth(0.4, 1, flight) * (1 - white);
    const settle = smooth(0, 1, white);
    const thickness = lofted[o + CURL_FIELD.thickness] * (1 + 0.8 * smooth(0.2, 0.7, white));
    const fading = 1 - smooth(COLLAPSE_FADE[0], COLLAPSE_FADE[1], white);
    const crestY = heightAt(x, z);
    const face = (a: number) => heightAt(x + nx * a, z + nz * a) - crestY;
    const landed = landing > 0 ? face(landing) : 0;
    // The lip's middle: a ballistic arc from the peak, level there, down onto the face where it lands; settling onto the
    // face as its void fills.
    const middle = (a: number, f: number) => {
      const r = landing > 0 ? a / landing : 0;
      return (peak + (landed - peak) * r * r) * (1 - settle) + (f + 0.5 * thickness) * settle;
    };
    const slope = (a: number) => (landing > 0 ? (2 * (landed - peak) * a) / (landing * landing) : 0) * (1 - settle);
    let p = 0;
    const point = (a: number, y: number, kind: number, along: number, f: number, pair = -1) => {
      sectionA[p] = a;
      sectionY[p] = y;
      sectionS[p] = along;
      sectionKind[p] = kind;
      sectionFace[p] = f;
      sectionPair[p] = pair;
      p += 1;
    };
    // The crest's back, from under the water up toward the peak.
    const back = -BACK * landing;
    const backFace = face(back);
    point(back, backFace - BURY, BODY, 0, backFace);
    const behind = -0.5 * BACK * landing;
    const behindFace = face(behind);
    point(behind, behindFace + 0.55 * (peak + 0.5 * thickness - behindFace), BODY, 0, behindFace);
    // The outer surface, along the lip to its tip, and the tip itself, rounded forward along its fall.
    OUTER.forEach((along, k) => {
      const a = along * reach;
      const f = face(a);
      outerFace[k] = f;
      const d = slope(a);
      const norm = Math.hypot(d, 1);
      const pair = UNDER.indexOf(along as (typeof UNDER)[number]);
      point(a - (0.5 * thickness * d) / norm, middle(a, f) + (0.5 * thickness) / norm, OUTSIDE, along, f,
        pair < 0 ? -1 : 2 + OUTER.length + 1 + pair);
    });
    const tipFace = face(reach);
    {
      const d = slope(reach);
      const norm = Math.hypot(d, 1);
      point(reach + (0.5 * thickness) / norm, middle(reach, tipFace) + (0.5 * thickness * d) / norm, OUTSIDE, 1, tipFace);
    }
    // The underside, from the tip back under the crest.
    UNDER.forEach((along) => {
      const a = along * reach;
      const f = outerFace[OUTER.indexOf(along as (typeof OUTER)[number])];
      const d = slope(a);
      const norm = Math.hypot(d, 1);
      point(a + (0.5 * thickness * d) / norm, middle(a, f) - (0.5 * thickness) / norm, INSIDE, along, f, 2 + OUTER.indexOf(along as (typeof OUTER)[number]));
    });
    // The void's back, the face gone vertical under the crest, down into the water; then its floor, on the face.
    const footA = sectionA[p - 1];
    const footFace = outerFace[1];
    point(footA, footFace - BURY, INSIDE, 0, footFace);
    for (const along of FLOOR) {
      const a = along * reach;
      const f = face(a);
      point(a, f + FLOOR_LIFT, FLOORED, 0, f);
    }
    // Normals in the slice's plane: the loop runs clockwise (a right, y up), so outward is the tangent turned left.
    for (let k = 0; k < CURL_POINTS; k += 1) {
      const before = k > 0 ? k - 1 : k;
      const after = k < CURL_POINTS - 1 ? k + 1 : k;
      const ta = sectionA[after] - sectionA[before];
      const ty = sectionY[after] - sectionY[before];
      const norm = Math.hypot(ta, ty);
      sectionNormalA[k] = norm > 1e-9 ? -ty / norm : 0;
      sectionNormalY[k] = norm > 1e-9 ? ta / norm : 1;
    }
    // The lip's arc from the peak to its tip, along its outer surface, m.
    let arc = 0;
    for (let k = 3; k <= 2 + OUTER.length; k += 1) arc += Math.hypot(sectionA[k] - sectionA[k - 1], sectionY[k] - sectionY[k - 1]);
    // The face under the curl (its back wall), its normal from its drop to where the lip lands.
    const wallSlope = landing > 0 ? landed / landing : 0;
    const wallScale = 1 / Math.hypot(wallSlope, 1);
    const base = vertices;
    for (let k = 0; k < CURL_POINTS; k += 1) {
      const v = vertices + k;
      const a = sectionA[k];
      const kind = sectionKind[k];
      const lip = kind === OUTSIDE || kind === INSIDE;
      const along = sectionS[k];
      out.positions[3 * v] = x + nx * a;
      out.positions[3 * v + 1] = crestY + sectionY[k];
      out.positions[3 * v + 2] = z + nz * a;
      out.normals[3 * v] = nx * sectionNormalA[k];
      out.normals[3 * v + 1] = sectionNormalY[k];
      out.normals[3 * v + 2] = nz * sectionNormalA[k];
      // The other side's normal: the matching point across the sheet (the outer's underside, and back); none, its own.
      const across = sectionPair[k] >= 0 ? sectionPair[k] : k;
      const sign = sectionPair[k] >= 0 ? 1 : -1;
      out.exitNormal[3 * v] = sign * nx * sectionNormalA[across];
      out.exitNormal[3 * v + 1] = sign * sectionNormalY[across];
      out.exitNormal[3 * v + 2] = sign * nz * sectionNormalA[across];
      const u = landing > 0 ? Math.min(1, Math.max(0, a / landing)) : 0;
      // White from where it lands (the tip first) back to the crest as its void fills; clear before (the tip's froth is
      // the fragment's, ragged in world x).
      out.foam[v] = kind === FLOORED ? 0 : Math.min(1, white * (0.6 + 0.8 * u));
      out.sheet[v] = Math.max(0.01, thickness);
      // A thin sheet where it falls, the outer half of the lip; nearer the crest it is the crest's water, shaded as the face.
      out.sheetWeight[v] = lip ? smooth(0.35, 0.8, along) * (1 - out.foam[v]) : 0;
      out.sheetBack[v] = SKY_BEHIND + SKY_AT_TIP * smooth(0.6, 1, along);
      // Faded into the crest where it grows from it (and the underside into the void's back), and out as it collapses;
      // the floor a dark veil over the face as the void opens.
      const attach = kind === FLOORED ? FLOOR_ALPHA * open : kind === INSIDE ? smooth(UNDER_FADE[0], UNDER_FADE[1], along)
        : smooth(ROOT_FADE[0], ROOT_FADE[1], landing > 0 ? a / landing : 0);
      out.alpha[v] = attach * fading * (1 - THIN_SHOWS * out.sheetWeight[v]);
      out.flow[3 * v] = lip ? along * arc : 0;
      out.flow[3 * v + 1] = lip ? along : 0;
      out.flow[3 * v + 2] = kind === FLOORED ? FLOOR_SHADE * open : kind === INSIDE ? UNDER_SHADE * open : 0;
      const wallA = Math.max(0, Math.min(a, landing));
      out.wall[3 * v] = x + nx * wallA;
      out.wall[3 * v + 1] = crestY + (wallA === a ? sectionFace[k] : wallA === 0 ? 0 : landed);
      out.wall[3 * v + 2] = z + nz * wallA;
      out.wallNormal[3 * v] = -wallSlope * nx * wallScale;
      out.wallNormal[3 * v + 1] = wallScale;
      out.wallNormal[3 * v + 2] = -wallSlope * nz * wallScale;
    }
    vertices += CURL_POINTS;
    // Joined to the slice before it in its run: the same wave, a column or less away along shore.
    if (previous >= 0 && runOf[previous] === runOf[s]) {
      const prior = base - CURL_POINTS;
      for (let k = 0; k + 1 < CURL_POINTS; k += 1) {
        const a0 = prior + k;
        const b0 = prior + k + 1;
        const c0 = base + k;
        const d0 = base + k + 1;
        // Counter-clockwise seen from outside: (a, b, c) turns the section's tangent onto +x, outward.
        out.indices[indices++] = a0;
        out.indices[indices++] = b0;
        out.indices[indices++] = c0;
        out.indices[indices++] = b0;
        out.indices[indices++] = d0;
        out.indices[indices++] = c0;
      }
    }
    previous = s;
  }
  out.vertexCount = vertices;
  out.indexCount = indices;
  return out;
}

const curlVertexPars = /* glsl */ `attribute float curlFoam;
attribute float curlSheet;
attribute float curlSheetWeight;
attribute float curlSheetBack;
attribute vec3 curlWall;
attribute vec3 curlWallNormal;
attribute vec3 curlExitNormal;
attribute float curlAlpha;
attribute vec3 curlFlow;
varying float vCurlAlpha;
varying vec3 vCurlFlow;
varying float vSweptSheet;
varying float vSweptSheetWeight;
varying float vSweptSheetBack;
varying float vSweptWallDepth;
varying vec3 vSweptWallNormal;
varying vec3 vSweptExitNormal;`;
const curlFragmentPars = /* glsl */ `varying float vCurlAlpha;
varying vec3 vCurlFlow;
// Value noise for the lip's streaks and its ragged tip, on an integer hash.
float curlHash( ivec2 c ) {
  uvec2 v = uvec2( c ) * uvec2( 1664525u, 22695477u ) + uvec2( 1013904223u, 1u );
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v ^= v >> 16u;
  v.x += v.y * 1664525u;
  return float( v.x ) * ( 1.0 / 4294967296.0 );
}
float curlNoise( vec2 p ) {
  vec2 i = floor( p );
  vec2 f = p - i;
  vec2 u = f * f * ( 3.0 - 2.0 * f );
  ivec2 c = ivec2( i );
  return mix( mix( curlHash( c ), curlHash( c + ivec2( 1, 0 ) ), u.x ), mix( curlHash( c + ivec2( 0, 1 ) ), curlHash( c + ivec2( 1, 1 ) ), u.x ), u.y );
}
varying float vSweptSheet;
varying float vSweptSheetWeight;
varying float vSweptSheetBack;
varying float vSweptWallDepth;
varying vec3 vSweptWallNormal;
varying vec3 vSweptExitNormal;`;
// The curl's own foam (its whitening as it lands), not the water's under it: the falling lip carries no air until then.
// Its body is the face's under it, the same column of water to the bed, so it takes the face's colour where it is no sheet.
const curlBeginNormal = /* glsl */ `vec3 objectNormal = vec3( normal );
vWaterDepth = max( 0.0, waterHeightAt( position.xz ) - waterBedAt( position.xz ) );
vWaterFoam = curlFoam;
vCurlAlpha = curlAlpha;
vCurlFlow = curlFlow;
vWaterFlow = waterFlowAt( position.xz );
vSweptSheet = curlSheet;
vSweptSheetWeight = curlSheetWeight;
vSweptSheetBack = curlSheetBack;
vSweptWallDepth = max( 0.0, curlWall.y - waterBedAt( curlWall.xz ) );
vSweptWallNormal = curlWallNormal;
vSweptExitNormal = curlExitNormal;`;
/**
 * The water's view cosine, held off grazing on the curl: a height field is never seen edge on, but the curl's silhouette
 * is, where the body fell to the deep reflectance and the sheet's light to nothing behind a full Fresnel, drawing it a dark
 * rim. Its edge shows as the face beside it at a slant.
 */
const VIEW_COS = 'float waterViewCos = dot( waterN, waterV );';
const CURL_VIEW_COS = 'float waterViewCos = max( 0.3, abs( dot( waterN, waterV ) ) );';
/** A number as a GLSL float literal. */
const f = (value: number) => (Number.isInteger(value) ? `${value}.0` : `${value}`);
/** The ragged tip (`RAGGED`): fingers cut out of its last fifth, fixed in world x. */
const CURL_RAGGED_TIP = `
if ( vCurlFlow.y > 0.8 ) {
  float curlCut = curlNoise( vec2( vWaterWorld.x / ${f(RAGGED.period)}, 11.3 ) );
  if ( ( vCurlFlow.y - 0.8 ) / 0.2 > 0.25 + 0.75 * curlCut ) discard;
}`;
/** The tip's froth, varied in world x with the same noise as its fingers (`RAGGED`). */
const CURL_FOAM = `float curlFoam = clamp( vWaterFoam + ${f(RAGGED.froth)} * smoothstep( 0.82, 1.0, vCurlFlow.y )
  * ( 0.3 + 1.4 * curlNoise( vec2( vWaterWorld.x / ${f(RAGGED.period)}, 11.3 ) ) ), 0.0, 1.0 );
`;
/** The falling sheet's streaks (`STREAKS`): Valve's two-layer flow map, along the lip's arc, in world x across it. */
const CURL_STREAKS = `
{
  float curlPhase = fract( waterTime / ${f(STREAKS.period)} );
  float curlSpeed = mix( ${f(STREAKS.slow)}, ${f(STREAKS.fast)}, vCurlFlow.y );
  vec2 curlUv = vec2( vWaterWorld.x / ${f(STREAKS.spacing)}, vCurlFlow.x / ${f(STREAKS.length)} );
  float curlA = curlNoise( curlUv - vec2( 0.0, curlSpeed * curlPhase * ${f(STREAKS.period / STREAKS.length)} ) );
  float curlB = curlNoise( curlUv + vec2( 0.37, 0.61 ) - vec2( 0.0, curlSpeed * fract( curlPhase + 0.5 ) * ${f(STREAKS.period / STREAKS.length)} ) );
  float curlStreak = smoothstep( 0.5, 0.8, mix( curlA, curlB, abs( 1.0 - 2.0 * curlPhase ) ) );
  diffuseColor.rgb = mix( diffuseColor.rgb, waterFoamColor, ${f(STREAKS.strength)} * curlStreak * smoothstep( 0.3, 0.6, vCurlFlow.y ) * ( 1.0 - curlFoam ) );
}`;
/** The void's darkening (the contrast route): the light the lip hides from its underside and the face under it. */
const CURL_SHADE = `outgoingLight *= 1.0 - vCurlFlow.z;
#include <opaque_fragment>`;
const curlBeginVertex = /* glsl */ `vec3 transformed = vec3( position );
vWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;`;

/**
 * The spilling lip as drawn (the Canyon spilling lip): the curls' ribbon (`buildCurlRibbon`), shaded as the water is in
 * either look, on the water's own uniforms, with the face's column of water as its body, so it takes the face's colour;
 * where it falls thin, its outer half, it is a sheet lit from behind as the swept barrel's lip is (`SWEPT_SHEET_BODY`,
 * tube-colour-fix.md; Rich's two-interface transmission and the lip's glow), translucent and brightest toward its tip.
 * Blended: it fades into the crest where it attaches and out into its landing as it collapses, white. Look only: nothing
 * collides with it. The coordinator's review of the first stills (2026-10-11): no plastic sheen, no dark rim, no seam,
 * no end cap.
 */
export class SpillingCurlMesh {
  readonly mesh: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  readonly ribbon = createCurlRibbon();
  private readonly attributes: { name: string; attribute: BufferAttribute; size: number; from: (ribbon: CurlRibbon) => Float32Array }[];
  private readonly index: BufferAttribute;
  private look: WaterLook = 'classic';

  constructor(uniforms: Record<string, { value: unknown }>) {
    const geometry = new BufferGeometry();
    const make = (size: number) => new BufferAttribute(new Float32Array(size * CURL_VERTICES), size).setUsage(DynamicDrawUsage);
    this.attributes = [
      { name: 'position', attribute: make(3), size: 3, from: (r) => r.positions },
      { name: 'normal', attribute: make(3), size: 3, from: (r) => r.normals },
      { name: 'curlFoam', attribute: make(1), size: 1, from: (r) => r.foam },
      { name: 'curlSheet', attribute: make(1), size: 1, from: (r) => r.sheet },
      { name: 'curlSheetWeight', attribute: make(1), size: 1, from: (r) => r.sheetWeight },
      { name: 'curlSheetBack', attribute: make(1), size: 1, from: (r) => r.sheetBack },
      { name: 'curlWall', attribute: make(3), size: 3, from: (r) => r.wall },
      { name: 'curlWallNormal', attribute: make(3), size: 3, from: (r) => r.wallNormal },
      { name: 'curlExitNormal', attribute: make(3), size: 3, from: (r) => r.exitNormal },
      { name: 'curlAlpha', attribute: make(1), size: 1, from: (r) => r.alpha },
      { name: 'curlFlow', attribute: make(3), size: 3, from: (r) => r.flow },
    ];
    for (const { name, attribute } of this.attributes) geometry.setAttribute(name, attribute);
    this.index = new BufferAttribute(new Uint32Array(INDICES), 1).setUsage(DynamicDrawUsage);
    geometry.setIndex(this.index);
    geometry.setDrawRange(0, 0);
    // Blended where it fades into the crest and out as it collapses; it still writes depth, so it sorts with itself.
    const material = new MeshPhysicalMaterial({
      color: '#ffffff', roughness: CLASSIC_ROUGHNESS, metalness: 0, ior: WATER_IOR, side: DoubleSide, transparent: true,
    });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      const rich = this.look === 'rich';
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${waterVertexPars}\n${curlVertexPars}`)
        .replace('#include <beginnormal_vertex>', curlBeginNormal)
        .replace('#include <begin_vertex>', curlBeginVertex);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', rich
          ? `#include <common>\n${waterFragmentPars}\n${richFragmentPars}\n${waterRipplePars}\n${waterSpecularPars}\n${richReflectionPars}\n${curlFragmentPars}`
          : `#include <common>\n${waterFragmentPars}\n${curlFragmentPars}`)
        .replace('#include <normal_fragment_begin>', rich ? richFarNormal : waterChopNormal)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>${CURL_RAGGED_TIP}`)
        .replace('#include <color_fragment>', 'diffuseColor.a *= vCurlAlpha;')
        .replace('#include <emissivemap_fragment>', CURL_FOAM + (rich
          ? waterBodyFragment(false, true, RICH_FAR_FOAM, RICH_SHEET_BODY + RICH_LIP_GLOW)
            .replace('vec3 waterN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );', RICH_SHEET_BODY_NORMAL)
          : waterBodyFragment(false, true, CLASSIC_FOAM, SWEPT_SHEET_BODY)).replace(VIEW_COS, CURL_VIEW_COS).split('vWaterFoam').join('curlFoam') + CURL_STREAKS)
        .replace('#include <opaque_fragment>', CURL_SHADE)
        .replace('#include <lights_fragment_maps>', rich ? RICH_REFLECTION : '#include <lights_fragment_maps>');
    };
    material.customProgramCacheKey = () => `breakline-spilling-curl-${this.look}`;
    this.mesh = new Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  /** Graphics setting (G8): shaded as the Classic water, or the Rich. */
  setLook(look: WaterLook): void {
    if (look === this.look) return;
    this.look = look;
    this.mesh.material.roughness = look === 'rich' ? RICH_CURL_ROUGHNESS : CLASSIC_ROUGHNESS;
    this.mesh.material.needsUpdate = true;
  }

  /** Draw the curls of `count` slices over the water as drawn (`heightAt`); none hides the mesh. */
  update(slices: Float32Array, count: number, heightAt: (x: number, z: number) => number): void {
    const ribbon = count > 0 ? buildCurlRibbon(slices, count, heightAt, this.ribbon) : undefined;
    if (!ribbon || ribbon.indexCount === 0) {
      this.mesh.visible = false;
      this.mesh.geometry.setDrawRange(0, 0);
      return;
    }
    for (const { attribute, size, from } of this.attributes) {
      (attribute.array as Float32Array).set(from(ribbon).subarray(0, size * ribbon.vertexCount));
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, size * ribbon.vertexCount);
      attribute.needsUpdate = true;
    }
    (this.index.array as Uint32Array).set(ribbon.indices.subarray(0, ribbon.indexCount));
    this.index.clearUpdateRanges();
    this.index.addUpdateRange(0, ribbon.indexCount);
    this.index.needsUpdate = true;
    this.mesh.geometry.setDrawRange(0, ribbon.indexCount);
    this.mesh.visible = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
