"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SweptLoft = exports.BARREL_SLOPE = exports.REST = exports.LOFT_SAMPLES = exports.LOFT = exports.tubeSkyView = exports.throatViews = exports.sheetAcross = exports.arcView = exports.THROAT = exports.SHEET = void 0;
exports.collapseFade = collapseFade;
const barrelSpots_1 = require("./barrelSpots");
const frontRecords_1 = require("./frontRecords");
const crestRays_1 = require("./crestRays");
const ProfileLibrary_1 = require("./ProfileLibrary");
const lipSheet_1 = require("./lipSheet");
var lipSheet_2 = require("./lipSheet");
Object.defineProperty(exports, "SHEET", { enumerable: true, get: function () { return lipSheet_2.SHEET; } });
Object.defineProperty(exports, "THROAT", { enumerable: true, get: function () { return lipSheet_2.THROAT; } });
Object.defineProperty(exports, "arcView", { enumerable: true, get: function () { return lipSheet_2.arcView; } });
Object.defineProperty(exports, "sheetAcross", { enumerable: true, get: function () { return lipSheet_2.sheetAcross; } });
Object.defineProperty(exports, "throatViews", { enumerable: true, get: function () { return lipSheet_2.throatViews; } });
Object.defineProperty(exports, "tubeSkyView", { enumerable: true, get: function () { return lipSheet_2.tubeSkyView; } });
/**
 * The swept loft's constants (the Padang Padang spec, Part B, PR 3; docs/research/water-physics/swept-barrel-build.md,
 * "Lofting" and "The seam"; the advisor's rulings, 2026-09-30):
 * - `spacing`, `fine`, m: slices every half metre along the front, a quarter where neighbouring clocks differ by more
 *   than `frames` library frames (the advisor: 2–4, so neighbours stay within a stage);
 * - `budget`, vertices: past it the spacing widens and neighbouring clocks are clamped to T_open/4 (the advisor);
 * - `pinned`: samples at each end of a profile blended onto the water, never reaching the lip or throat [inferred];
 * - `extension`, `extensionSamples`: the surface runs on over the water this far past each end, m, in this many
 *   samples, so the seam's band always has both surfaces [inferred];
 * - `band`, m: the dithered overlap at the mask's edge [inferred];
 * - `endBlend`, m: a front's ends blend into the water over this length [inferred].
 * (After touchdown a slice fades into the water over its tube's own collapse, `ProfileLookup.collapseSeconds`, and a
 * faded slice is dropped.)
 */
exports.LOFT = {
    spacing: 0.5, fine: 0.25, frames: 3, budget: 40_000, pinned: 6, extension: 1.5, extensionSamples: 3, band: 1, endBlend: 2.5,
};
/** Vertices per slice: the profile and its extensions over the water at each end. */
exports.LOFT_SAMPLES = ProfileLibrary_1.PROFILE_POINTS + 2 * exports.LOFT.extensionSamples;
/**
 * Where the profile stands off the solver's water (the advisor's rulings, 2026-10-01; the spec's item 13.4): the library
 * is the authority only where the solver can't overturn, from just behind the crest to the toe. Its back slope and the
 * flat ahead are one Basilisk wave's still water, so they rest on the game's sea, its height and its foam. In H, the
 * slice's crest over the lower of the water at its toe and at its front end: fully lifted from `behind` behind the
 * crest to the toe, and eased down (smoothstep) to the water over `ramp` beyond each [provisional].
 *
 * Ahead of the toe the rest adapts (the forward rest): the solver's depth-averaged breaking smooths its front broad, so
 * its water can stand far above the library's trough there, the true shape near the break, and a plain ramp from the
 * toe dug a trench that hid the tube. The drawn trough holds at the profile's own front level until the solver's
 * water along the ray comes down to within `near` H of it, read every `step` m from the toe, then eases onto it over
 * `ramp` as behind; within `ahead` H of the toe and the profile's own samples (its front end and extension, less the
 * mask's band), easing over what is left where the water hasn't come down by then [provisional].
 */
exports.REST = { behind: 0.1, ramp: 0.5, near: 0.1, ahead: 3, step: 0.5 };
/** H for `REST`, m: the crest's height over the lower of the water at the toe and at the profile's front end. */
function restHeight(crestY, toeY, frontY) {
    return Math.max(1e-6, crestY - (toeY < frontY ? toeY : frontY));
}
/**
 * The library's runs' slope along the wave's path, per spot with a barrel transect (`BARREL_SPOTS`; the owner's 1:19 at
 * Padang Padang).
 */
exports.BARREL_SLOPE = Object.fromEntries(Object.entries(barrelSpots_1.BARREL_SPOTS).flatMap(([spot, barrel]) => (barrel ? [[spot, barrel.slope]] : [])));
const MAX_SLICES = Math.floor(exports.LOFT.budget / exports.LOFT_SAMPLES);
const E = exports.LOFT.extensionSamples;
const EXTENSION_STEP = exports.LOFT.extension / E;
const LAST = ProfileLibrary_1.PROFILE_POINTS - 1;
const PHASE = { pre: 0, open: 1, post: 2 };
/**
 * A slice's fade after touchdown: 1 until then, falling to 0 over its tube's collapse, √(2W/g) (the advisor,
 * 2026-09-30: neither the drawing nor the contact may outlast the pocket); a tube without a void goes at touchdown.
 */
function collapseFade(tau, touchdown, collapse) {
    if (tau <= touchdown)
        return 1;
    return collapse > 0 ? Math.max(0, 1 - (tau - touchdown) / collapse) : 0;
}
/**
 * The swept barrel's loft (the Padang Padang spec, Part B, PR 3): each breaking front's profiles, looked up by its
 * points' foot crests and clocks, stood along its shoreward normal and sewn into the water.
 * - **Anchor** (the advisor's ruling 2; 2026-10-03, u = 1 from the throw): the profile's crest landmark sits on its
 *   point's crest, the anchor on the crest point K = S − c n, before the throw and from it alike, with or without a
 *   throw point. From its throw the point runs on its pace (`SweptCrash`) from where its crest crossed its throw depth,
 *   so the drawn crest leaves from there and runs on at the crest's measured speed.
 * - **After touchdown** (the advisor, 2026-09-30): the drawing keeps the touchdown frame, the visual event; the slice
 *   fades into the water over its tube's collapse, √(2W/g), and is dropped once faded.
 * - **Seam** (ruling 3): a profile's first and last `pinned` samples blend onto the water, the extensions lie on it,
 *   and each vertex carries the mask's value: 1 over the profile, 0 a `band` past it.
 * - **Resampling** (ruling 4): `spacing`, refined to `fine` where neighbouring clocks differ by more than `frames`
 *   frames, within `budget` vertices.
 * - **Overlapping fronts** (the advisor, 2026-09-30): the first front wins; a later front's strip over an earlier
 *   front's is dropped, and counted, so the drawing and the contact show one surface.
 * - **Contact mode** (PR 4, the advisor's ruling 2): each blended case is held at its own last clear frame
 *   (`heldFrame`: the jet off the face, the void open) through touchdown and the collapse (the clock and phase run on),
 *   so it never self-crosses yet follows the drawing until then; each slice's held tip's distance from the drawn one is
 *   kept. Its weights are the drawing's: the lerp toward the same water by the same weight keeps a vertical line's
 *   crossings in order, so a partly weighted lip shrinks as drawn (the advisor, 2026-09-30).
 * A vertex resting on the water asks its height; one lifted fully off it is still level plus the profile.
 * Only + − × ÷ and √, for online determinism: PR 4's contact runs the same code in the worker.
 */
class SweptLoft {
    library;
    slope;
    result;
    profile = new Float32Array(2 * ProfileLibrary_1.PROFILE_POINTS);
    /** Per front, its slices' σ, before and after refinement. */
    base = new Float64Array(2 * MAX_SLICES + 8);
    sigmas = new Float64Array(2 * MAX_SLICES + 8);
    sample = { x: 0, z: 0, tau: 0, footHeight: 0, footDepth: 0, pace: 0 };
    probe = { x: 0, z: 0, tau: 0, footHeight: 0, footDepth: 0, pace: 0 };
    query;
    point = new Float64Array(2);
    velocity = new Float64Array(2);
    /** A slice's forward rest (`forwardRest`): its hold and end, m past the toe, and the climbs where it eases and at the toe. */
    rest = new Float64Array(4);
    /** Per slice, its anchor (x, z) and its drawn profile's reach along its ray past its extensions, m: its footprint. */
    anchorX = new Float64Array(MAX_SLICES + 1);
    anchorZ = new Float64Array(MAX_SLICES + 1);
    reachBack = new Float64Array(MAX_SLICES + 1);
    reachFront = new Float64Array(MAX_SLICES + 1);
    /** Reusable planned sigma samples: x, z, tau, foot height, foot depth, pace (double precision). */
    planned = new Float64Array(0);
    plannedLive = new Uint8Array(0);
    plannedRayX = new Float64Array(0);
    plannedRayZ = new Float64Array(0);
    rayPlan;
    plannedRay = new Float64Array(2);
    /** Per strip, its footprint's corners (x, z × 4: its slices' back and front reach) and box (x0, x1, z0, z1). */
    corners = new Float64Array(8 * (MAX_SLICES + 1));
    boxes = new Float64Array(4 * (MAX_SLICES + 1));
    contact;
    measureSheet;
    /** A slice's lip thickness per profile point, m, and its far side's view of the sky (`sheetAcross`). */
    sheets = { across: new Float32Array(ProfileLibrary_1.PROFILE_POINTS), back: new Float32Array(ProfileLibrary_1.PROFILE_POINTS) };
    /** A slice's throat views per profile point (`throatViews`). */
    inside = new Float32Array(4 * ProfileLibrary_1.PROFILE_POINTS);
    /** How the drawing's profile blends its cases' frames, for the sheet's tables (`ProfileLibrary.frameBlend`). */
    blend = {
        weight: 0, scale: 0, lowerFrame: 0, lowerNext: 0, lowerShare: 0, upperFrame: 0, upperNext: 0, upperShare: 0,
    };
    constructor(library, slope, options = {}) {
        this.library = library;
        this.slope = slope;
        this.contact = options.contact ?? false;
        this.measureSheet = options.sheet ?? !this.contact;
        this.rayPlan = new crestRays_1.CrestRayPlan(library, slope, exports.LOFT.extension, (0, crestRays_1.minimumCrestRaySpacing)(exports.LOFT.extension, exports.LOFT.spacing));
        this.query = { slope, footHeight: 0, footDepth: 0, seconds: 0 };
        const vertices = (MAX_SLICES + 1) * exports.LOFT_SAMPLES;
        const slices = MAX_SLICES + 1;
        this.result = {
            positions: new Float32Array(3 * vertices), normals: new Float32Array(3 * vertices), mask: new Float32Array(vertices), lift: new Float32Array(vertices),
            sheet: new Float32Array(vertices), sheetWeight: new Float32Array(vertices), sheetBack: new Float32Array(vertices), throat: new Float32Array(4 * vertices),
            indices: new Uint32Array(6 * (exports.LOFT_SAMPLES - 1) * slices), vertexCount: 0, indexCount: 0, sliceCount: 0,
            sliceFront: new Int32Array(slices), sliceSigma: new Float32Array(slices), sliceTau: new Float32Array(slices),
            slicePhase: new Uint8Array(slices), sliceLife: new Float32Array(slices),
            sliceCollapse: new Float32Array(slices), sliceFade: new Float32Array(slices), sliceTipGap: new Float32Array(slices), tipGap: 0,
            sliceRestHold: new Float32Array(slices), sliceRestEnd: new Float32Array(slices), sliceRestClimb: new Float32Array(slices),
            sliceToeClimb: new Float32Array(slices), restSamples: 0,
            clamps: 0, clampedLookups: 0, overlaps: 0, overlapsOpen: 0, overlapOpenWeight: 0,
            rayCorrections: 0, rayMaxBlend: 0, rayMinAdvance: 0, rayInvalidIntervals: 0,
            sliceJoined: new Uint8Array(slices), sliceRayX: new Float32Array(slices), sliceRayZ: new Float32Array(slices),
            sliceWeight: new Float32Array(slices), sliceOverturned: new Uint8Array(slices), sliceTipAlong: new Float32Array(slices),
            sliceTipUp: new Float32Array(slices), sliceAnchorVX: new Float32Array(slices), sliceAnchorVZ: new Float32Array(slices),
            sliceTipTransportAlong: new Float32Array(slices), sliceTipTransportUp: new Float32Array(slices),
            sliceFormed: new Float32Array(slices), sliceTipX: new Float32Array(slices), sliceTipY: new Float32Array(slices), sliceTipZ: new Float32Array(slices),
            sliceMouth: new Float32Array(slices),
        };
    }
    /** Loft the records' fronts over the water (`heightAt`). */
    build(records, count, stillLevel, heightAt) {
        const r = this.result;
        r.vertexCount = 0;
        r.indexCount = 0;
        r.sliceCount = 0;
        r.clamps = 0;
        r.clampedLookups = 0;
        r.tipGap = 0;
        r.overlaps = 0;
        r.overlapsOpen = 0;
        r.overlapOpenWeight = 0;
        r.restSamples = 0;
        r.rayCorrections = 0;
        r.rayMaxBlend = 0;
        r.rayMinAdvance = 0;
        r.rayInvalidIntervals = 0;
        const fronts = this.fronts(records, count);
        // The output budget limits live slices, not the length surveyed before faded slices are removed. A 320 m front
        // already needs more survey samples than the original fixed scratch buffer; grow these reusable arrays before
        // writing them, including space for refinement, so its live end is not silently truncated or read as NaN.
        let samples = 0;
        for (const f of fronts)
            samples = Math.max(samples, Math.ceil((f.last - f.first + 2 * exports.LOFT.extension) / exports.LOFT.spacing) + 1);
        if (this.base.length < samples)
            this.base = new Float64Array(Math.max(samples, 2 * this.base.length));
        if (this.sigmas.length < 2 * samples)
            this.sigmas = new Float64Array(Math.max(2 * samples, 2 * this.sigmas.length));
        // The spacing that fits the budget, and whether refining would overrun it: faded slices are dropped, so only the
        // live ones count.
        let live = 0;
        let extra = 0;
        for (const f of fronts) {
            const survey = this.survey(records, f);
            live += survey.live;
            extra += survey.extra;
        }
        let spacing = exports.LOFT.spacing;
        let budgeted = live + extra > MAX_SLICES;
        if (live > MAX_SLICES)
            spacing = (exports.LOFT.spacing * live) / Math.max(1, MAX_SLICES - 2 * fronts.length);
        for (const f of fronts) {
            if (r.sliceCount >= MAX_SLICES)
                break;
            const n = budgeted ? this.baseSlices(f, spacing, this.sigmas) : this.refinements(records, f, spacing);
            this.loftFront(records, f, n, budgeted, stillLevel, heightAt);
        }
        this.measureRayAdvance();
        this.dropOverlaps();
        this.sealRuns(heightAt);
        this.triangulate();
        return r;
    }
    /** The records' fronts, in order; one of fewer than two points, or all at one σ, has no tangent and is left out. */
    fronts(records, count) {
        const fronts = [];
        let start = 0;
        while (start < count) {
            const id = records[start * frontRecords_1.FRONT_STRIDE + frontRecords_1.FRONT_FIELD.front];
            let end = start + 1;
            while (end < count && records[end * frontRecords_1.FRONT_STRIDE + frontRecords_1.FRONT_FIELD.front] === id)
                end += 1;
            const first = records[start * frontRecords_1.FRONT_STRIDE + frontRecords_1.FRONT_FIELD.sigma];
            const last = records[(end - 1) * frontRecords_1.FRONT_STRIDE + frontRecords_1.FRONT_FIELD.sigma];
            if (end - start >= 2 && last - first > 1e-6)
                fronts.push({ id, start, end, first, last });
            start = end;
        }
        return fronts;
    }
    /** A front's slices every `spacing` or less, evenly from one extension's end to the other's, into `out`; how many. */
    baseSlices(f, spacing, out) {
        const from = f.first - exports.LOFT.extension;
        const span = f.last - f.first + 2 * exports.LOFT.extension;
        const n = Math.ceil(span / spacing) + 1;
        const step = span / (n - 1);
        for (let k = 0; k < n; k += 1)
            out[k] = from + k * step;
        return n;
    }
    /**
     * A front's base slices at `spacing` that have not faded after touchdown (the rest are dropped), and the midpoints
     * the live ones need (neighbouring clocks more than `frames` frames apart).
     */
    survey(records, f) {
        const n = this.baseSlices(f, exports.LOFT.spacing, this.base);
        let live = 0;
        let extra = 0;
        let previous = Number.NaN;
        let previousFrame = 0;
        for (let k = 0; k < n; k += 1) {
            const s = this.at(records, f, this.base[k], this.probe);
            const times = this.library.profileTimes({ slope: this.slope, footHeight: s.footHeight, footDepth: s.footDepth });
            if (collapseFade(s.tau, times.touchdownSeconds, times.collapseSeconds) === 0) {
                previous = Number.NaN;
                continue;
            }
            live += 1;
            if (Math.abs(s.tau - previous) > exports.LOFT.frames * Math.min(times.frameSeconds, previousFrame))
                extra += 1;
            previous = s.tau;
            previousFrame = times.frameSeconds;
        }
        return { live, extra };
    }
    /** A front's base slices, with the midpoints where neighbouring clocks differ by more than `frames` frames, into `sigmas`; how many. */
    refinements(records, f, spacing) {
        const n = this.baseSlices(f, spacing, this.base);
        let out = 0;
        let previousTau = 0;
        let previousFrame = 0;
        for (let k = 0; k < n; k += 1) {
            const s = this.at(records, f, this.base[k], this.probe);
            const frame = this.library.profileTimes({ slope: this.slope, footHeight: s.footHeight, footDepth: s.footDepth }).frameSeconds;
            if (k > 0 && Math.abs(s.tau - previousTau) > exports.LOFT.frames * Math.min(frame, previousFrame))
                this.sigmas[out++] = (this.base[k - 1] + this.base[k]) / 2;
            this.sigmas[out++] = this.base[k];
            previousTau = s.tau;
            previousFrame = frame;
        }
        return out;
    }
    /** Front f's values at σ (see `Sample`), into `into`. */
    at(records, f, sigma, into) {
        const field = (k, name) => records[k * frontRecords_1.FRONT_STRIDE + frontRecords_1.FRONT_FIELD[name]];
        const copy = (k) => {
            into.x = field(k, 'x');
            into.z = field(k, 'z');
            into.tau = field(k, 'tau');
            into.footHeight = field(k, 'footHeight');
            into.footDepth = field(k, 'footDepth');
            into.pace = field(k, 'pace');
        };
        const runOn = (from, to, beyond) => {
            // Past an end, the crest runs on along its end segment; the rest keeps the end's values.
            const dx = field(to, 'x') - field(from, 'x');
            const dz = field(to, 'z') - field(from, 'z');
            const length = Math.sqrt(dx * dx + dz * dz);
            if (length > 1e-9) {
                into.x += (beyond * dx) / length;
                into.z += (beyond * dz) / length;
            }
        };
        if (sigma <= f.first) {
            copy(f.start);
            runOn(f.start + 1, f.start, f.first - sigma);
            return into;
        }
        if (sigma >= f.last) {
            copy(f.end - 1);
            runOn(f.end - 2, f.end - 1, sigma - f.last);
            return into;
        }
        // Front records are sorted by sigma. Keep the first record at an equal sigma on the right, exactly as the old
        // strict '< sigma' scan did, including repeated sigma values; only the bracket search changes.
        let low = f.start + 1;
        let high = f.end - 1;
        while (low < high) {
            const middle = (low + high) >>> 1;
            if (field(middle, 'sigma') < sigma)
                low = middle + 1;
            else
                high = middle;
        }
        const k = low - 1;
        const s0 = field(k, 'sigma');
        const s1 = field(k + 1, 'sigma');
        const t = s1 - s0 > 1e-12 ? (sigma - s0) / (s1 - s0) : 0;
        const lerp = (name) => field(k, name) + t * (field(k + 1, name) - field(k, name));
        into.x = lerp('x');
        into.z = lerp('z');
        into.tau = lerp('tau');
        into.footHeight = lerp('footHeight');
        into.footDepth = lerp('footDepth');
        const pace0 = field(k, 'pace');
        const pace1 = field(k + 1, 'pace');
        into.pace = pace0 === pace0 ? (pace1 === pace1 ? pace0 + t * (pace1 - pace0) : pace0) : pace1;
        return into;
    }
    /** Sample the planned crest/ray/scale once, preserving the original live-run and budget-clock decisions. */
    planRays(records, f, n, budgeted) {
        if (this.plannedLive.length < n) {
            const capacity = Math.max(n, 2 * this.plannedLive.length);
            this.planned = new Float64Array(6 * capacity);
            this.plannedLive = new Uint8Array(capacity);
            this.plannedRayX = new Float64Array(capacity);
            this.plannedRayZ = new Float64Array(capacity);
        }
        this.plannedLive.fill(0, 0, n);
        this.rayPlan.prepareRecords(records, f.start, f.end);
        const r = this.result;
        r.rayMaxBlend = Math.max(r.rayMaxBlend, this.rayPlan.diagnostics.blend);
        r.rayInvalidIntervals += this.rayPlan.diagnostics.invalidIntervals;
        let live = 0;
        let inRun = false;
        let previousTau = 0;
        let limit = n;
        for (let k = 0; k < n; k += 1) {
            const sigma = this.sigmas[k];
            const s = this.at(records, f, sigma, this.sample);
            const times = this.library.profileTimes({ slope: this.slope, footHeight: s.footHeight, footDepth: s.footDepth });
            let tau = s.tau;
            if (budgeted && inRun) {
                const bound = times.touchdownSeconds / 4;
                const clamped = Math.min(previousTau + bound, Math.max(previousTau - bound, tau));
                if (clamped !== tau)
                    r.clamps += 1;
                tau = clamped;
            }
            if (collapseFade(tau, times.touchdownSeconds, times.collapseSeconds) === 0) {
                inRun = false;
                continue;
            }
            if (r.sliceCount + live >= MAX_SLICES) {
                limit = k;
                break;
            }
            this.plannedLive[k] = 1;
            inRun = true;
            previousTau = tau;
            live += 1;
            const plan = 6 * k;
            this.planned[plan] = s.x;
            this.planned[plan + 1] = s.z;
            this.planned[plan + 2] = tau;
            this.planned[plan + 3] = s.footHeight;
            this.planned[plan + 4] = s.footDepth;
            this.planned[plan + 5] = s.pace;
            this.rayPlan.rayAt(sigma, this.plannedRay);
            this.plannedRayX[k] = this.plannedRay[0];
            this.plannedRayZ[k] = this.plannedRay[1];
            if (this.rayPlan.diagnostics.blend > 0)
                r.rayCorrections += 1;
        }
        return limit;
    }
    loftFront(records, f, n, budgeted, stillLevel, heightAt) {
        const r = this.result;
        const { profile } = this;
        // Runs of live slices: a faded slice is dropped, and the slices either side of it are never joined.
        let runStart = -1;
        const closeRun = () => {
            if (runStart >= 0)
                this.joinRun(runStart, r.sliceCount - 1);
            runStart = -1;
        };
        const plannedCount = this.planRays(records, f, n, budgeted);
        for (let k = 0; k < plannedCount; k += 1) {
            if (this.plannedLive[k] !== 1) {
                closeRun();
                continue;
            }
            const sigma = this.sigmas[k];
            const s = this.sample;
            const plan = 6 * k;
            s.x = this.planned[plan];
            s.z = this.planned[plan + 1];
            s.tau = this.planned[plan + 2];
            s.footHeight = this.planned[plan + 3];
            s.footDepth = this.planned[plan + 4];
            s.pace = this.planned[plan + 5];
            const nx = this.plannedRayX[k];
            const nz = this.plannedRayZ[k];
            const tau = s.tau;
            // The drawing keeps the touchdown frame, the visual event; the contact also holds each blended case at its own
            // last clear frame, never self-crossing (the advisor, 2026-09-30). Both clocks run on.
            const query = this.query;
            query.footHeight = s.footHeight;
            query.footDepth = s.footDepth;
            query.seconds = tau;
            query.hold = this.contact ? 'contact' : 'drawing';
            const lookup = this.library.profileAt(query, profile);
            const touchdown = lookup.touchdownSeconds;
            const wFade = collapseFade(tau, touchdown, lookup.collapseSeconds);
            if (wFade === 0) {
                closeRun();
                continue;
            }
            // The drawn slice's lifted span along its ray, m, the same in both modes (overlapping fronts are judged on it:
            // where both rest on the water there is nothing to conflict; the advisor, 2026-10-01); and how far the contact's
            // held tip stands from the drawn one, m (the advisor: the touchdown's own approach).
            let tipGap = 0;
            let drawnCrestX = profile[2 * ProfileLibrary_1.LANDMARK.crest];
            let crestY = profile[2 * ProfileLibrary_1.LANDMARK.crest + 1];
            let drawnToeX = profile[2 * ProfileLibrary_1.LANDMARK.toe];
            let toeY = profile[2 * ProfileLibrary_1.LANDMARK.toe + 1];
            let frontY = profile[2 * LAST + 1];
            let drawnFrontX = profile[2 * LAST];
            if (this.contact) {
                query.hold = 'drawing';
                this.library.pointAt(query, ProfileLibrary_1.LANDMARK.lip, this.point);
                const dx = this.point[0] - profile[2 * ProfileLibrary_1.LANDMARK.lip];
                const dy = this.point[1] - profile[2 * ProfileLibrary_1.LANDMARK.lip + 1];
                tipGap = Math.sqrt(dx * dx + dy * dy);
                this.library.pointAt(query, ProfileLibrary_1.LANDMARK.crest, this.point);
                [drawnCrestX, crestY] = [this.point[0], this.point[1]];
                this.library.pointAt(query, ProfileLibrary_1.LANDMARK.toe, this.point);
                [drawnToeX, toeY] = [this.point[0], this.point[1]];
                this.library.pointAt(query, ProfileLibrary_1.LANDMARK.front, this.point);
                [drawnFrontX, frontY] = [this.point[0], this.point[1]];
            }
            const drawnHeight = restHeight(crestY, toeY, frontY);
            const reachBack = drawnCrestX - (exports.REST.behind + exports.REST.ramp) * drawnHeight;
            // The weights: into the water at the front's ends, and after touchdown.
            const d = Math.min(sigma - f.first, f.last - sigma);
            const r0 = Math.min(1, d / exports.LOFT.endBlend);
            const wEnd = d <= 0 ? 0 : r0 * r0 * (3 - 2 * r0);
            // The contact follows the drawing's weight: the lerp toward the same water by the same weight keeps a vertical
            // line's crossings in order, so a partly weighted lip shrinks as drawn (the advisor, 2026-09-30).
            const w = wEnd * wFade;
            let overturned = 0;
            for (let i = exports.LOFT.pinned; i < LAST - exports.LOFT.pinned; i += 1) {
                if (profile[2 * (i + 1)] < profile[2 * i]) {
                    overturned = 1;
                    break;
                }
            }
            if (r.sliceCount >= MAX_SLICES)
                break;
            if (runStart < 0)
                runStart = r.sliceCount;
            if (lookup.clamped)
                r.clampedLookups += 1;
            // The anchor, the profile's x origin in the world: the crest point K = S − c n, so the profile's crest landmark
            // sits on the point's crest, before the throw and from it alike (the advisor, 2026-10-03: u = 1 from the throw).
            const crest = profile[2 * ProfileLibrary_1.LANDMARK.crest];
            const ax = s.x - crest * nx;
            const az = s.z - crest * nz;
            let life = Number.NaN;
            let anchorVX = 0;
            let anchorVZ = 0;
            if (tau >= 0) {
                life = tau / touchdown;
                if (this.contact) {
                    // Its motion, per second of the clock (the advisor, 2026-09-30 and 2026-10-03): K̇ = Ṡ − ċ n.
                    const follow = this.crestPointVelocity(s, tau, lookup.frameSeconds, nx, nz);
                    anchorVX = follow[0];
                    anchorVZ = follow[1];
                }
            }
            const maskSlice = wFade > 0 ? Math.min(1, Math.max(0, 1 + d / exports.LOFT.band)) : 0;
            // The forward rest, from the drawn slice in both modes, so the contact and the overlaps follow the drawing.
            const forward = this.rest;
            if (w > 0) {
                this.forwardRest(ax, az, nx, nz, drawnToeX, stillLevel + frontY, drawnHeight, drawnFrontX + exports.LOFT.extension - exports.LOFT.band - drawnToeX, heightAt);
            }
            else {
                forward[0] = 0;
                forward[1] = exports.REST.ramp * drawnHeight;
                forward[2] = Number.NaN;
                forward[3] = Number.NaN;
            }
            const [restHold, restEnd] = [forward[0], forward[1]];
            const reachFront = drawnToeX + restEnd;
            // The lip as a thin sheet and the tube's inside, for the drawing only, blended from the library's tables as the
            // profile is from its frames: how far across the lip each point is, what its far side sees, what the inner face
            // sees, once its underside has formed; and the lip's mean thickness.
            let formed = 0;
            let lipThickness = 0;
            if (this.measureSheet && w > 0) {
                query.hold = 'drawing';
                formed = (0, lipSheet_1.sheetTablesLookup)(this.library.frameBlend(query, this.blend), this.sheets);
                if (formed > 0) {
                    (0, lipSheet_1.throatViews)(profile, this.inside);
                    for (let i = lipSheet_1.THROAT.thicknessFrom; i <= lipSheet_1.THROAT.thicknessTo; i += 1)
                        lipThickness += this.sheets.across[i];
                    lipThickness /= lipSheet_1.THROAT.thicknessTo - lipSheet_1.THROAT.thicknessFrom + 1;
                }
            }
            const slice = r.sliceCount;
            r.sliceFormed[slice] = formed;
            r.sliceFront[slice] = f.id;
            r.sliceSigma[slice] = sigma;
            r.sliceTau[slice] = tau;
            r.slicePhase[slice] = tau > touchdown ? PHASE.post : PHASE[lookup.phase];
            r.sliceLife[slice] = life;
            r.sliceCollapse[slice] = lookup.collapseSeconds;
            r.sliceFade[slice] = wFade;
            r.sliceTipGap[slice] = tipGap;
            if (tipGap > r.tipGap)
                r.tipGap = tipGap;
            r.sliceRestHold[slice] = restHold;
            r.sliceRestEnd[slice] = restEnd;
            r.sliceRestClimb[slice] = forward[2];
            r.sliceToeClimb[slice] = forward[3];
            this.anchorX[slice] = ax;
            this.anchorZ[slice] = az;
            this.reachBack[slice] = reachBack;
            this.reachFront[slice] = reachFront;
            r.sliceJoined[slice] = 0;
            r.sliceRayX[slice] = nx;
            r.sliceRayZ[slice] = nz;
            r.sliceWeight[slice] = w;
            r.sliceOverturned[slice] = overturned;
            r.sliceTipAlong[slice] = lookup.tipAlong;
            r.sliceTipUp[slice] = lookup.tipUp;
            if (this.contact) {
                const transport = this.landmarkVelocity(s, tau, lookup.frameSeconds, ProfileLibrary_1.LANDMARK.lip);
                r.sliceTipTransportAlong[slice] = transport[0];
                r.sliceTipTransportUp[slice] = transport[1];
            }
            else {
                r.sliceTipTransportAlong[slice] = 0;
                r.sliceTipTransportUp[slice] = 0;
            }
            r.sliceAnchorVX[slice] = anchorVX;
            r.sliceAnchorVZ[slice] = anchorVZ;
            // How far each point stands off the water: from just behind the crest to the toe, eased onto it either side, and
            // ahead of the toe held as the forward rest says first.
            const profileCrestX = profile[2 * ProfileLibrary_1.LANDMARK.crest];
            const toeX = profile[2 * ProfileLibrary_1.LANDMARK.toe];
            const height = restHeight(profile[2 * ProfileLibrary_1.LANDMARK.crest + 1], profile[2 * ProfileLibrary_1.LANDMARK.toe + 1], profile[2 * LAST + 1]);
            const rampLength = exports.REST.ramp * height;
            const restSpan = restEnd - restHold;
            for (let j = 0; j < exports.LOFT_SAMPLES; j += 1) {
                let along;
                let above = 0;
                let pin = 1;
                let maskAlong = 0;
                let sheet = 0;
                let sheetShare = 0;
                let sheetBack = 0;
                let sky = 1;
                let underLip = 0;
                let inner = 0;
                if (j < E) {
                    along = profile[0] - (E - j) * EXTENSION_STEP;
                }
                else if (j < E + ProfileLibrary_1.PROFILE_POINTS) {
                    const i = j - E;
                    along = profile[2 * i];
                    above = profile[2 * i + 1];
                    // Past the ramps the profile rests on the water; the mask lets the water draw itself a band beyond them.
                    if (i < ProfileLibrary_1.LANDMARK.crest) {
                        const past = profileCrestX - along - exports.REST.behind * height;
                        const u = past > 0 ? Math.min(1, past / rampLength) : 0;
                        pin = Math.max(u * u * (3 - 2 * u), i < exports.LOFT.pinned ? (exports.LOFT.pinned - i) / exports.LOFT.pinned : 0);
                        maskAlong = Math.min(1, Math.max(0, 1 - (past - rampLength) / exports.LOFT.band));
                    }
                    else if (i > ProfileLibrary_1.LANDMARK.toe) {
                        // Ahead, the forward rest alone: it ends within the profile's samples, so its end needs no pin.
                        const past = along - toeX;
                        const u = past > restHold ? Math.min(1, (past - restHold) / restSpan) : 0;
                        pin = u * u * (3 - 2 * u);
                        maskAlong = Math.min(1, Math.max(0, 1 - (past - restEnd) / exports.LOFT.band));
                    }
                    else {
                        pin = 0;
                        maskAlong = 1;
                    }
                    if (formed > 0 && i > ProfileLibrary_1.LANDMARK.crest && i < ProfileLibrary_1.LANDMARK.throat) {
                        sheet = this.sheets.across[i];
                        sheetBack = this.sheets.back[i];
                        sheetShare = formed * Math.min(1, Math.min(i - ProfileLibrary_1.LANDMARK.crest, ProfileLibrary_1.LANDMARK.throat - i) / (lipSheet_1.SHEET.ramp + 1));
                    }
                    if (formed > 0) {
                        sky = this.inside[4 * i];
                        underLip = this.inside[4 * i + 1];
                        inner = formed * this.inside[4 * i + 2];
                    }
                }
                else {
                    along = profile[2 * LAST] + (j - E - LAST) * EXTENSION_STEP;
                    // Held as far as the forward rest reaches, at the profile's front level.
                    above = profile[2 * LAST + 1];
                    const past = along - toeX;
                    const u = past > restHold ? Math.min(1, (past - restHold) / restSpan) : 0;
                    pin = u * u * (3 - 2 * u);
                    maskAlong = Math.min(1, Math.max(0, 1 - (past - restEnd) / exports.LOFT.band));
                }
                const v = slice * exports.LOFT_SAMPLES + j;
                const px = ax + along * nx;
                const pz = az + along * nz;
                const e = w * (1 - pin);
                r.positions[3 * v] = px;
                if (e === 1) {
                    r.positions[3 * v + 1] = stillLevel + above;
                }
                else {
                    const h = heightAt(px, pz);
                    r.positions[3 * v + 1] = e === 0 ? h : h + e * (stillLevel + above - h);
                }
                r.positions[3 * v + 2] = pz;
                r.mask[v] = maskSlice * maskAlong;
                r.lift[v] = e;
                r.sheet[v] = sheet;
                r.sheetWeight[v] = sheetShare * e;
                r.sheetBack[v] = sheetBack;
                r.throat[4 * v] = sky;
                r.throat[4 * v + 1] = underLip;
                r.throat[4 * v + 2] = lipThickness;
                r.throat[4 * v + 3] = inner * e;
            }
            const tip = 3 * (slice * exports.LOFT_SAMPLES + E + ProfileLibrary_1.LANDMARK.lip);
            r.sliceTipX[slice] = r.positions[tip];
            r.sliceTipY[slice] = r.positions[tip + 1];
            r.sliceTipZ[slice] = r.positions[tip + 2];
            r.sliceCount += 1;
        }
        closeRun();
        r.vertexCount = r.sliceCount * exports.LOFT_SAMPLES;
    }
    /** Verify the float32 geometry using the exact rays the contact reads. */
    measureRayAdvance() {
        const r = this.result;
        // Verify the stored float32 geometry, using the exact rays the contact reads. Profile folds along a ray are
        // authored overhang; a negative advance across a front is a different defect, reported independently.
        let minimum = Infinity;
        for (let s = 0; s + 1 < r.sliceCount; s += 1) {
            if (r.sliceJoined[s] !== 1)
                continue;
            for (let j = 0; j < exports.LOFT_SAMPLES; j += 1) {
                const a = 3 * (s * exports.LOFT_SAMPLES + j);
                const b = a + 3 * exports.LOFT_SAMPLES;
                const dx = r.positions[b] - r.positions[a];
                const dz = r.positions[b + 2] - r.positions[a + 2];
                minimum = Math.min(minimum, dx * r.sliceRayZ[s] - dz * r.sliceRayX[s], dx * r.sliceRayZ[s + 1] - dz * r.sliceRayX[s + 1]);
            }
        }
        r.rayMinAdvance = minimum === Infinity ? 0 : minimum;
    }
    /**
     * A slice's forward rest (`REST`; the advisor's ruling, 2026-10-01) into `this.rest`: its hold and end, m past the toe
     * `toeX` (m along the ray from the anchor (ax, az)), and the solver's water over the drawn level `level` where the
     * ease starts and at the toe, m. The water is read along the ray every `REST.step` m from the toe; the hold ends where
     * it first comes within `REST.near` H of the level (between two readings, where the line between them does), and the
     * ease runs `REST.ramp` H from there, all within `REST.ahead` H and `room`, m past the toe. Only + − × ÷.
     */
    forwardRest(ax, az, nx, nz, toeX, level, height, room, heightAt) {
        const out = this.rest;
        const ramp = exports.REST.ramp * height;
        const near = exports.REST.near * height;
        const cap = Math.max(0, Math.min(exports.REST.ahead * height, room));
        // The latest the ease may start and still end within the cap.
        const latest = Math.max(0, cap - ramp);
        let hold = latest;
        let climb = Number.NaN;
        let previous = 0;
        let previousGap = 0;
        for (let k = 0;; k += 1) {
            const at = Math.min(k * exports.REST.step, latest);
            const gap = heightAt(ax + (toeX + at) * nx, az + (toeX + at) * nz) - level;
            this.result.restSamples += 1;
            if (k === 0)
                out[3] = gap;
            if (gap <= near) {
                hold = k === 0 ? 0 : previous + ((at - previous) * (previousGap - near)) / (previousGap - gap);
                climb = k === 0 ? gap : near;
                break;
            }
            if (at >= latest) {
                climb = gap;
                break;
            }
            previous = at;
            previousGap = gap;
        }
        out[0] = hold;
        out[1] = hold + Math.max(Math.min(ramp, cap - hold), 1e-3);
        out[2] = climb;
    }
    /** A run of consecutive slices: its normals, and its strips joined. */
    finishRun(firstSlice, lastSlice) {
        const r = this.result;
        this.normals(firstSlice, lastSlice);
        // Each slice's tube's mouth: the nearest slice of the run without an underside on either side, or the run's end.
        let open = r.sliceSigma[firstSlice];
        for (let s = firstSlice; s <= lastSlice; s += 1) {
            if (!(r.sliceFormed[s] > 0))
                open = r.sliceSigma[s];
            r.sliceMouth[s] = r.sliceFormed[s] > 0 ? r.sliceSigma[s] - open : 0;
        }
        open = r.sliceSigma[lastSlice];
        for (let s = lastSlice; s >= firstSlice; s -= 1) {
            if (!(r.sliceFormed[s] > 0))
                open = r.sliceSigma[s];
            if (r.sliceFormed[s] > 0)
                r.sliceMouth[s] = Math.min(r.sliceMouth[s], open - r.sliceSigma[s]);
        }
        this.joinRun(firstSlice, lastSlice);
    }
    /** Join before overlap decisions; normals and mouth are calculated once on the final surviving runs. */
    joinRun(firstSlice, lastSlice) {
        for (let s = firstSlice; s < lastSlice; s += 1)
            this.result.sliceJoined[s] = 1;
    }
    /**
     * A cut creates a new end, just as the records' ends do. Overlap removal, a faded gap or the vertex budget can leave
     * a surviving strip with a fully raised edge; taper that new end onto the water before making its triangles. Retire
     * the mask inside the surviving mesh's support, so filtering its edge cannot cut water beyond the replacement.
     * Drawing and contact use these same final runs and weights.
     */
    sealRuns(heightAt) {
        const r = this.result;
        let first = 0;
        while (first + 1 < r.sliceCount) {
            if (r.sliceJoined[first] !== 1) {
                first += 1;
                continue;
            }
            let last = first + 1;
            while (last + 1 < r.sliceCount && r.sliceJoined[last] === 1)
                last += 1;
            const cutFirst = r.sliceWeight[first] > 0;
            const cutLast = r.sliceWeight[last] > 0;
            if (cutFirst || cutLast) {
                for (let s = first; s <= last; s += 1) {
                    const distance = Math.min(cutFirst ? r.sliceSigma[s] - r.sliceSigma[first] : Infinity, cutLast ? r.sliceSigma[last] - r.sliceSigma[s] : Infinity);
                    const u = Math.min(1, Math.max(0, distance / exports.LOFT.endBlend));
                    const weight = u * u * (3 - 2 * u);
                    const mask = Math.min(1, Math.max(0, distance / exports.LOFT.band));
                    r.sliceWeight[s] *= weight;
                    for (let j = 0; j < exports.LOFT_SAMPLES; j += 1) {
                        const v = s * exports.LOFT_SAMPLES + j;
                        if (weight < 1 && r.lift[v] > 0) {
                            const water = heightAt(r.positions[3 * v], r.positions[3 * v + 2]);
                            r.positions[3 * v + 1] = water + weight * (r.positions[3 * v + 1] - water);
                            r.lift[v] *= weight;
                            r.sheetWeight[v] *= weight;
                            r.throat[4 * v + 3] *= weight;
                        }
                        r.mask[v] *= mask;
                    }
                    r.sliceTipY[s] = r.positions[3 * (s * exports.LOFT_SAMPLES + E + ProfileLibrary_1.LANDMARK.lip) + 1];
                }
            }
            this.finishRun(first, last);
            first = last + 1;
        }
    }
    /**
     * A thrown slice's crest point's velocity, m per second of its clock (x, z): its point's, Ṡ, less the profile's crest's
     * along the ray, ċ n (the advisor, 2026-09-30 and 2026-10-03). Ṡ = (0, its pace): from its throw its point runs along
     * its column at the pace `SweptCrash` set then, already held near the long-wave speed at its crest, with or without a
     * throw point (without the crash no point carries a pace, and Ṡ is 0). ċ is the contact profile's crest landmark's
     * motion over ±4 frames, as the tip's.
     */
    crestPointVelocity(s, tau, frameSeconds, nx, nz) {
        const pace = s.pace === s.pace ? s.pace : 0;
        const out = this.landmarkVelocity(s, tau, frameSeconds, ProfileLibrary_1.LANDMARK.crest);
        const crestPace = out[0];
        out[0] = -crestPace * nx;
        out[1] = pace - crestPace * nz;
        return out;
    }
    /** Geometric motion of a held profile landmark, averaged over the same four-frame window as its anchor. */
    landmarkVelocity(s, tau, frameSeconds, landmark) {
        const out = this.velocity;
        const query = this.query;
        query.footHeight = s.footHeight;
        query.footDepth = s.footDepth;
        query.hold = 'contact';
        const window = 4 * frameSeconds;
        query.seconds = tau + window;
        this.library.pointAt(query, landmark, this.point);
        const ahead = this.point[0];
        const above = this.point[1];
        query.seconds = tau - window;
        this.library.pointAt(query, landmark, this.point);
        out[0] = (ahead - this.point[0]) / (2 * window);
        out[1] = (above - this.point[1]) / (2 * window);
        return out;
    }
    /** Two triangles per quad of every joined strip. */
    triangulate() {
        const r = this.result;
        for (let s = 0; s + 1 < r.sliceCount; s += 1) {
            if (r.sliceJoined[s] !== 1)
                continue;
            for (let j = 0; j < exports.LOFT_SAMPLES - 1; j += 1) {
                const v00 = s * exports.LOFT_SAMPLES + j;
                const v10 = v00 + exports.LOFT_SAMPLES;
                const i = r.indexCount;
                r.indices[i] = v00;
                r.indices[i + 1] = v10;
                r.indices[i + 2] = v00 + 1;
                r.indices[i + 3] = v00 + 1;
                r.indices[i + 4] = v10;
                r.indices[i + 5] = v10 + 1;
                r.indexCount += 6;
            }
        }
    }
    /**
     * Overlapping fronts (the advisor, 2026-09-30): the first front wins. A later front's strip whose footprint overlaps
     * an earlier front's kept strip is dropped, from the drawing, its mask and the contact alike, and counted. A footprint
     * is the convex hull of its two slices' lifted spans as drawn (from the start of the rest ramp behind the crest to
     * its end past the toe; the same in both modes, so both drop the same strips), so where two fronts only rest on the
     * water there is nothing to conflict (the advisor, 2026-10-01). A strip resting wholly on the water (no weight) is
     * the water: it gives way to any strip over it, and a lifted strip over it keeps its place; those drops are not
     * counted. A front's order is the records'. Only + − × ÷.
     */
    dropOverlaps() {
        const r = this.result;
        const { corners, boxes } = this;
        // Each joined strip's corners and box, and each front's run of slices [start, end) with its box.
        const starts = [];
        const resting = (s) => !(r.sliceWeight[s] > 0) && !(r.sliceWeight[s + 1] > 0);
        for (let s = 0; s < r.sliceCount; s += 1) {
            if (s === 0 || r.sliceFront[s] !== r.sliceFront[s - 1])
                starts.push(s);
            if (r.sliceJoined[s] !== 1)
                continue;
            for (let k = 0; k < 2; k += 1) {
                const slice = s + k;
                for (const [m, reach] of [[0, this.reachBack[slice]], [1, this.reachFront[slice]]]) {
                    corners[8 * s + 4 * k + 2 * m] = this.anchorX[slice] + reach * r.sliceRayX[slice];
                    corners[8 * s + 4 * k + 2 * m + 1] = this.anchorZ[slice] + reach * r.sliceRayZ[slice];
                }
            }
            boxes[4 * s] = Infinity;
            boxes[4 * s + 1] = -Infinity;
            boxes[4 * s + 2] = Infinity;
            boxes[4 * s + 3] = -Infinity;
            for (let c = 0; c < 4; c += 1) {
                boxes[4 * s] = Math.min(boxes[4 * s], corners[8 * s + 2 * c]);
                boxes[4 * s + 1] = Math.max(boxes[4 * s + 1], corners[8 * s + 2 * c]);
                boxes[4 * s + 2] = Math.min(boxes[4 * s + 2], corners[8 * s + 2 * c + 1]);
                boxes[4 * s + 3] = Math.max(boxes[4 * s + 3], corners[8 * s + 2 * c + 1]);
            }
        }
        if (starts.length < 2)
            return;
        starts.push(r.sliceCount);
        const frontBox = (f) => {
            const box = [Infinity, -Infinity, Infinity, -Infinity];
            for (let s = starts[f]; s < starts[f + 1]; s += 1) {
                if (r.sliceJoined[s] !== 1)
                    continue;
                box[0] = Math.min(box[0], boxes[4 * s]);
                box[1] = Math.max(box[1], boxes[4 * s + 1]);
                box[2] = Math.min(box[2], boxes[4 * s + 2]);
                box[3] = Math.max(box[3], boxes[4 * s + 3]);
            }
            return box;
        };
        const apart = (a, i, b, j) => a[i + 1] < b[j] || b[j + 1] < a[i] || a[i + 3] < b[j + 2] || b[j + 3] < a[i + 2];
        for (let later = 1; later + 1 < starts.length; later += 1) {
            for (let earlier = 0; earlier < later; earlier += 1) {
                // Fronts apart are skipped whole; the earlier front's box shrinks as its own strips are dropped, so it is taken now.
                if (apart(frontBox(later), 0, frontBox(earlier), 0))
                    continue;
                for (let s = starts[later]; s < starts[later + 1]; s += 1) {
                    if (r.sliceJoined[s] !== 1)
                        continue;
                    for (let t = starts[earlier]; t < starts[earlier + 1]; t += 1) {
                        if (r.sliceJoined[t] !== 1 || apart(boxes, 4 * s, boxes, 4 * t) || !this.hullsOverlap(8 * s, 8 * t))
                            continue;
                        // A resting strip is the water: a lifted one over an earlier resting one keeps its place, and the water goes.
                        if (!resting(s) && resting(t)) {
                            r.sliceJoined[t] = 0;
                            continue;
                        }
                        r.sliceJoined[s] = 0;
                        if (resting(s))
                            break;
                        r.overlaps += 1;
                        // A dropped strip that held an open tube would show as a hole in a barrel (the advisor: report it), as
                        // high as its weight lifts it.
                        const weight = Math.max(r.sliceWeight[s], r.sliceWeight[s + 1]);
                        const open = (r.slicePhase[s] === 1 && r.sliceOverturned[s] === 1) || (r.slicePhase[s + 1] === 1 && r.sliceOverturned[s + 1] === 1);
                        if (open && weight > 0) {
                            r.overlapsOpen += 1;
                            r.overlapOpenWeight = Math.max(r.overlapOpenWeight, weight);
                        }
                        break;
                    }
                }
            }
        }
    }
    /**
     * Whether two strips' footprints overlap: the convex hulls of their four corners each (at `a` and `b` in `corners`),
     * by separating axes; every pair of a hull's corners gives an axis, the hull's edges among them.
     */
    hullsOverlap(a, b) {
        const c = this.corners;
        for (let hull = 0; hull < 2; hull += 1) {
            const base = hull === 0 ? a : b;
            for (let i = 0; i < 4; i += 1) {
                for (let j = i + 1; j < 4; j += 1) {
                    // The axis across corners i and j.
                    const ax = c[base + 2 * i + 1] - c[base + 2 * j + 1];
                    const az = c[base + 2 * j] - c[base + 2 * i];
                    if (ax === 0 && az === 0)
                        continue;
                    let minA = Infinity;
                    let maxA = -Infinity;
                    let minB = Infinity;
                    let maxB = -Infinity;
                    for (let k = 0; k < 4; k += 1) {
                        const pa = c[a + 2 * k] * ax + c[a + 2 * k + 1] * az;
                        const pb = c[b + 2 * k] * ax + c[b + 2 * k + 1] * az;
                        minA = Math.min(minA, pa);
                        maxA = Math.max(maxA, pa);
                        minB = Math.min(minB, pb);
                        maxB = Math.max(maxB, pb);
                    }
                    // Touching is apart: half-open strips share no point along an edge.
                    if (maxA <= minB || maxB <= minA)
                        return false;
                }
            }
        }
        return true;
    }
    /** Each vertex's normal: across the profile × along the front, by central differences (one-sided at the edges). */
    normals(firstSlice, lastSlice) {
        const { positions: p, normals } = this.result;
        for (let s = firstSlice; s <= lastSlice; s += 1) {
            const sBack = Math.max(firstSlice, s - 1);
            const sAhead = Math.min(lastSlice, s + 1);
            for (let j = 0; j < exports.LOFT_SAMPLES; j += 1) {
                const jBack = Math.max(0, j - 1);
                const jAhead = Math.min(exports.LOFT_SAMPLES - 1, j + 1);
                const a0 = 3 * (s * exports.LOFT_SAMPLES + jBack);
                const a1 = 3 * (s * exports.LOFT_SAMPLES + jAhead);
                const b0 = 3 * (sBack * exports.LOFT_SAMPLES + j);
                const b1 = 3 * (sAhead * exports.LOFT_SAMPLES + j);
                const ax = p[a1] - p[a0];
                const ay = p[a1 + 1] - p[a0 + 1];
                const az = p[a1 + 2] - p[a0 + 2];
                const bx = p[b1] - p[b0];
                const by = p[b1 + 1] - p[b0 + 1];
                const bz = p[b1 + 2] - p[b0 + 2];
                let cx = ay * bz - az * by;
                let cy = az * bx - ax * bz;
                let cz = ax * by - ay * bx;
                const length = Math.sqrt(cx * cx + cy * cy + cz * cz);
                if (length > 1e-12) {
                    cx /= length;
                    cy /= length;
                    cz /= length;
                }
                else {
                    cx = 0;
                    cy = 1;
                    cz = 0;
                }
                const o = 3 * (s * exports.LOFT_SAMPLES + j);
                normals[o] = cx;
                normals[o + 1] = cy;
                normals[o + 2] = cz;
            }
        }
    }
}
exports.SweptLoft = SweptLoft;
