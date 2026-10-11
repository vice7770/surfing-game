import { BufferAttribute, BufferGeometry, DoubleSide, DynamicDrawUsage, Mesh, MeshPhysicalMaterial } from 'three';
import { CURL_CAPACITY, CURL_FIELD, CURL_STRIDE } from '../wave/SpillingCurl';
import type { WaterLook } from './water/waterLook';
import { RICH_FAR_FOAM, RICH_REFLECTION, richFarNormal, richFragmentPars, richReflectionPars } from './water/richWaterGlsl';
import { waterRipplePars } from './water/rippleTexture';
import { CLASSIC_ROUGHNESS, waterSpecularPars } from './water/specular';
import { waterChopNormal } from './waterChop';
import { CLASSIC_FOAM, WATER_IOR, waterBodyFragment } from './waterOptics';
import { waterFragmentPars, waterVertexPars } from './WaterSurface';
import { RICH_LIP_GLOW, RICH_SHEET_BODY, RICH_SHEET_BODY_NORMAL, SWEPT_SHEET_BODY } from './barrel/SweptBarrelMesh';

/**
 * Where a curl slice's cross-section is sampled along its lip's outer surface, s from its root on the back of the crest
 * (0) to where it lands on the face (1); the underside takes the lip's part again, from the tip back toward the crest.
 */
const OUTER = [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.8, 0.89, 0.96] as const;
const UNDER = [0.96, 0.89, 0.8, 0.7, 0.58, 0.46, 0.34] as const;
/** Points per slice: the root, the outer surface, where it lands, the tip's foot, the underside, the void's back foot. */
export const CURL_POINTS = 1 + OUTER.length + 2 + UNDER.length + 1;
/** The most ribbons' ends closed with a slice of nothing (`buildCurlRibbon`); past them an end is left as it stands. */
const CAPS = 16;
/** The most slices a ribbon is lofted through, and the vertices and triangle indices it fills. */
const SLICES = CURL_CAPACITY + CAPS;
export const CURL_VERTICES = SLICES * CURL_POINTS;
const INDICES = 6 * (CURL_POINTS - 1) * SLICES;
/** The root and the feet sink this far under the water as drawn, m, so the curl grows out of it with no seam. */
const BURY = 0.04;
/** The lip rises from the back of the crest, this share of the landing's distance behind it. */
const BACK = 0.6;
/** Its outer surface carries forward over its landing by this share before it falls onto the face (the curl's overhang). */
const OVER = 1.15;
/** Where the void stands its full height above the face, as a share of the landing's distance. */
const WIDEST = 0.55;
/**
 * The lip rises no more than this share of the wave's height over the crest as drawn (P): the solver's crest is rounder
 * and its face gentler than a breaking crest's, so a void W high over the face would stand the lip a third of the wave
 * above it, where a spilling crest only sharpens and pitches. The void is then as high as the face's drop allows.
 */
const RISE = 0.1;
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
/** The very tip's froth: the leading edge breaking up before it lands (P; the coordinator's ruling, 2026-10-11). */
const TIP_FROTH = 0.3;
/**
 * Fades, as shares of the landing's distance a/L: the lip grows out of the crest's water from ROOT_FADE[0] behind the
 * crest (invisible) to ROOT_FADE[1] (whole), so no seam shows where it attaches; the underside likewise out of the void's
 * back. As its void fills it thins, whitens and fades out into its landing patch: gone by the time it has filled.
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

/** A cubic Bézier's point (and with `d`, its derivative) at s, one coordinate. */
function bezier(p0: number, p1: number, p2: number, p3: number, s: number, d = false): number {
  const r = 1 - s;
  if (d) return 3 * r * r * (p1 - p0) + 6 * r * s * (p2 - p1) + 3 * s * s * (p3 - p2);
  return r * r * r * p0 + 3 * r * r * s * p1 + 3 * r * s * s * p2 + s * s * s * p3;
}

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
  indices: Uint32Array;
  vertexCount: number;
  indexCount: number;
}

export function createCurlRibbon(): CurlRibbon {
  return {
    positions: new Float32Array(3 * CURL_VERTICES), normals: new Float32Array(3 * CURL_VERTICES), foam: new Float32Array(CURL_VERTICES),
    sheet: new Float32Array(CURL_VERTICES), sheetWeight: new Float32Array(CURL_VERTICES), sheetBack: new Float32Array(CURL_VERTICES),
    wall: new Float32Array(3 * CURL_VERTICES), wallNormal: new Float32Array(3 * CURL_VERTICES), exitNormal: new Float32Array(3 * CURL_VERTICES),
    alpha: new Float32Array(CURL_VERTICES), indices: new Uint32Array(INDICES), vertexCount: 0, indexCount: 0,
  };
}

// One slice's cross-section in its own frame (a ahead along its normal from the crest, y up from the crest's top), with
// each point's u along the void, its sheet thickness and which side it lies on (+1 outer, −1 underside, 0 buried).
const sectionA = new Float64Array(CURL_POINTS);
const sectionY = new Float64Array(CURL_POINTS);
const sectionU = new Float64Array(CURL_POINTS);
const sectionSide = new Int8Array(CURL_POINTS);
const sectionFace = new Float64Array(CURL_POINTS);
const sectionNormalA = new Float64Array(CURL_POINTS);
const sectionNormalY = new Float64Array(CURL_POINTS);
const sectionPair = new Int32Array(CURL_POINTS);
const order = new Int32Array(CURL_CAPACITY);
/** The slices in the order they are lofted, with the ends' closing slices. */
const lofted = new Float32Array(SLICES * CURL_STRIDE);
/** Each lofted slice's run: only slices of one run are joined. */
const runOf = new Int32Array(SLICES);

/**
 * The curls' ribbon from a snapshot's slices (`CURL_FIELD`; `SpillingCurl.writeCurls`). Each slice's cross-section is a
 * lip pitching forward off the crest onto the water's face as drawn (`heightAt`): the face is the void's lower branch,
 * standing in for the solver's, which cannot overturn. Its outer surface rises from the back of the crest, carries
 * forward over the void and falls onto the face where Pick & Feddersen's lip lands, L cos θ ahead; it stands so that the
 * void under it is W high above the face where it is widest; its underside lies the lip's thickness inside it, down to
 * the void's back under the crest. Slices of one wave in neighbouring columns are joined along shore, in x order.
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
    const length = lofted[o + CURL_FIELD.length];
    const width = lofted[o + CURL_FIELD.width];
    const white = lofted[o + CURL_FIELD.white];
    // Collapsing, it thins as its void fills.
    const thickness = lofted[o + CURL_FIELD.thickness] * (1 - 0.7 * white);
    const fading = 1 - smooth(COLLAPSE_FADE[0], COLLAPSE_FADE[1], white);
    const landing = length * Math.cos(lofted[o + CURL_FIELD.tilt]);
    const crestY = heightAt(x, z);
    const face = (a: number) => heightAt(x + nx * a, z + nz * a) - crestY;
    // The lip's outer surface: a cubic from its root on the back of the crest, over the crest at the height that stands
    // the void W above the face where it is widest (no more than RISE over the crest), carried forward past its landing
    // and down onto the face there.
    const back = -BACK * landing;
    const rise = RISE * lofted[o + CURL_FIELD.height];
    const apex = Math.max(thickness, Math.min(rise, width + thickness + face(WIDEST * landing))) / 0.75;
    const backFace = face(back);
    const landed = face(landing);
    const ax = [back, -0.1 * landing, OVER * landing, landing];
    const ay = [backFace - BURY, apex, apex, landed - BURY];
    let p = 0;
    const point = (a: number, y: number, side: number, pair: number, known?: number) => {
      const f = known ?? face(a);
      sectionA[p] = a;
      sectionY[p] = y;
      sectionU[p] = landing > 0 ? Math.min(1, Math.max(0, a / landing)) : 0;
      sectionSide[p] = side;
      sectionFace[p] = f;
      sectionPair[p] = pair;
      p += 1;
    };
    point(ax[0], ay[0], 0, -1, backFace);
    for (const t of OUTER) {
      // Its partner across the lip, where the underside has one.
      const pair = UNDER.indexOf(t as (typeof UNDER)[number]);
      point(bezier(ax[0], ax[1], ax[2], ax[3], t), bezier(ay[0], ay[1], ay[2], ay[3], t), 1, pair < 0 ? -1 : 1 + OUTER.length + 2 + pair);
    }
    point(ax[3], ay[3], 0, -1, landed);
    // The underside: the outer surface less the lip's thickness along its normal, from the tip back under the crest.
    const underA = (t: number) => {
      const da = bezier(ax[0], ax[1], ax[2], ax[3], t, true);
      const dy = bezier(ay[0], ay[1], ay[2], ay[3], t, true);
      const norm = Math.hypot(da, dy) || 1;
      return [bezier(ax[0], ax[1], ax[2], ax[3], t) + (thickness * dy) / norm, bezier(ay[0], ay[1], ay[2], ay[3], t) - (thickness * da) / norm];
    };
    const [tipA] = underA(UNDER[0]);
    const tipFace = face(tipA);
    point(tipA, tipFace - BURY, 0, -1, tipFace);
    UNDER.forEach((t) => {
      const [a, y] = underA(t);
      point(a, y, -1, 1 + OUTER.indexOf(t));
    });
    // The void's back: the face gone vertical under the crest, down into the water.
    const footA = sectionA[p - 1];
    const footFace = face(footA);
    point(footA, footFace - BURY, 0, -1, footFace);
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
    // The face under the curl (its back wall), its normal from its drop to where the lip lands.
    const slope = landing > 0 ? landed / landing : 0;
    const wallScale = 1 / Math.hypot(slope, 1);
    const base = vertices;
    for (let k = 0; k < CURL_POINTS; k += 1) {
      const v = vertices + k;
      const a = sectionA[k];
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
      const u = sectionU[k];
      const lip = sectionSide[k] !== 0;
      // White from where it lands (the tip first) back to the crest as its void fills; clear before, but for a little
      // froth on its very tip as it falls.
      out.foam[v] = Math.min(1, Math.max(white * (0.6 + 0.8 * u), lip && length > 0 ? TIP_FROTH * smooth(0.82, 1, u) : 0));
      out.sheet[v] = Math.max(0.01, thickness);
      // A thin sheet where it falls, the outer half of the lip; nearer the crest it is the crest's water, shaded as the face.
      out.sheetWeight[v] = lip ? smooth(0.45, 0.9, u) * (1 - out.foam[v]) : 0;
      out.sheetBack[v] = SKY_BEHIND + SKY_AT_TIP * smooth(0.7, 1, u);
      // Faded into the crest where it grows from it (and the underside into the void's back), and out as it collapses.
      const attach = sectionSide[k] < 0 ? smooth(UNDER_FADE[0], UNDER_FADE[1], u)
        : smooth(ROOT_FADE[0], ROOT_FADE[1], landing > 0 ? a / landing : 0);
      out.alpha[v] = attach * fading * (1 - THIN_SHOWS * out.sheetWeight[v]);
      const wallA = Math.max(0, Math.min(a, landing));
      out.wall[3 * v] = x + nx * wallA;
      out.wall[3 * v + 1] = crestY + (wallA === a ? sectionFace[k] : face(wallA));
      out.wall[3 * v + 2] = z + nz * wallA;
      out.wallNormal[3 * v] = -slope * nx * wallScale;
      out.wallNormal[3 * v + 1] = wallScale;
      out.wallNormal[3 * v + 2] = -slope * nz * wallScale;
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
varying float vCurlAlpha;
varying float vSweptSheet;
varying float vSweptSheetWeight;
varying float vSweptSheetBack;
varying float vSweptWallDepth;
varying vec3 vSweptWallNormal;
varying vec3 vSweptExitNormal;`;
const curlFragmentPars = /* glsl */ `varying float vCurlAlpha;
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
        .replace('#include <color_fragment>', 'diffuseColor.a *= vCurlAlpha;')
        .replace('#include <emissivemap_fragment>', (rich
          ? waterBodyFragment(false, true, RICH_FAR_FOAM, RICH_SHEET_BODY + RICH_LIP_GLOW)
            .replace('vec3 waterN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );', RICH_SHEET_BODY_NORMAL)
          : waterBodyFragment(false, true, CLASSIC_FOAM, SWEPT_SHEET_BODY)).replace(VIEW_COS, CURL_VIEW_COS))
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
