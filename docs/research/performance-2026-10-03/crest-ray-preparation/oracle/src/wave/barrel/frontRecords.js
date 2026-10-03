"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FRONT_CAPACITY = exports.FRONT_FIELD = exports.FRONT_STRIDE = void 0;
exports.writeFrontRecords = writeFrontRecords;
/**
 * A front point as the snapshot carries it to the page (the Padang Padang spec, Part B, PR 3): where its crest is, which
 * front and how far along it, its clock, its foot crest and depth (which size and scale its profile), its crest's z
 * where it crossed its throw depth (NaN until then), where its pace starts (PR 5), and, while it runs on that pace, the
 * pace along its column, m per second of its clock (NaN otherwise, and always without the crash): the contact's Ṡ (the
 * advisor, 2026-10-03).
 */
exports.FRONT_STRIDE = 9;
exports.FRONT_FIELD = { x: 0, z: 1, front: 2, sigma: 3, tau: 4, footHeight: 5, footDepth: 6, throwZ: 7, pace: 8 };
/** Most front points a snapshot carries: about one per metre of breaking crest, several fronts across a 320 m window. */
exports.FRONT_CAPACITY = 2048;
/** Writes `points` (in their order: by front, then σ) into `out` as records, as many as fit; returns how many. */
function writeFrontRecords(points, out) {
    const count = Math.min(points.length, Math.floor(out.length / exports.FRONT_STRIDE));
    for (let k = 0; k < count; k += 1) {
        const p = points[k];
        const o = k * exports.FRONT_STRIDE;
        out[o + exports.FRONT_FIELD.x] = p.x;
        out[o + exports.FRONT_FIELD.z] = p.z;
        out[o + exports.FRONT_FIELD.front] = p.front;
        out[o + exports.FRONT_FIELD.sigma] = p.sigma;
        out[o + exports.FRONT_FIELD.tau] = p.tau;
        out[o + exports.FRONT_FIELD.footHeight] = p.footHeight;
        out[o + exports.FRONT_FIELD.footDepth] = p.footDepth;
        out[o + exports.FRONT_FIELD.throwZ] = p.throwZ ?? Number.NaN;
        out[o + exports.FRONT_FIELD.pace] = p.jetPace !== undefined && p.jetUntil !== undefined && p.tau < p.jetUntil ? p.jetPace : Number.NaN;
    }
    return count;
}
