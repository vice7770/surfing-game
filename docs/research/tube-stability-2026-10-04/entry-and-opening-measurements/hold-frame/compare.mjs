import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
//#region src/wave/dispersion.ts
/** Linear (Airy) water-wave dispersion, ω² = g k tanh(kh), in SI units. */
const GRAVITY = 9.81;
//#endregion
//#region src/wave/barrel/ProfileLibrary.ts
const LANDMARK = {
	back: 0,
	crest: 32,
	lip: 64,
	throat: 88,
	toe: 112,
	front: 127
};
/**
* The contact's held frame (the advisor, 2026-09-30): the jet off the face and the void open, each by `gap`, h0: 2 cells
* at level 12 on the runs' 48 h0 domain (tools/basilisk/run_padang.sh; the periodic run's cells are 64/4096 h0).
*/
const CLEAR = { gap: 96 / 4096 };
const FLOATS$2 = 256;
/**
* The highest point of frame f's lower surface (the face and on, from the throat to the front end) under (x, y), h0;
* NaN where none lies under it.
*/
function surfaceBeneath$1(frames, f, x, y) {
	const o = f * FLOATS$2;
	let best = NaN;
	for (let i = LANDMARK.throat; i < LANDMARK.front; i += 1) {
		const x0 = frames[o + 2 * i];
		const x1 = frames[o + 2 * i + 2];
		if (x0 === x1 || (x0 - x) * (x1 - x) > 0) continue;
		const y0 = frames[o + 2 * i + 1];
		const under = y0 + (x - x0) / (x1 - x0) * (frames[o + 2 * i + 3] - y0);
		if (under < y && !(under <= best)) best = under;
	}
	return best;
}
/** Frame f's void height, h0: the most its underside (tip to throat) stands over the lower surface beneath it. */
function voidHeightAt(frames, f) {
	const o = f * FLOATS$2;
	let height = 0;
	for (let i = LANDMARK.lip; i <= LANDMARK.throat; i += 1) {
		const y = frames[o + 2 * i + 1];
		const gap = y - surfaceBeneath$1(frames, f, frames[o + 2 * i], y);
		if (gap > height) height = gap;
	}
	return height;
}
/**
* A case's held frame (the advisor, 2026-09-30): the last frame, at or before one frame before touchdown, whose tip
* stands `CLEAR.gap` over the lower surface beneath it (the jet off the face) and `CLEAR.gap` ahead of its throat (the
* void open, not collapsed onto the face as pad19-a30-l12's last two frames are); its void's height there. With none
* such, the frame before touchdown, unclear.
*/
function heldFrame(c) {
	const count = c.frames.length / FLOATS$2;
	const last = Math.min(count - 1, Math.floor((c.touchdown - c.tauStart) / c.tauStep + 1e-6) - 1);
	for (let f = last; f >= 0; f -= 1) {
		const o = f * FLOATS$2;
		const tipX = c.frames[o + 2 * LANDMARK.lip];
		const tipY = c.frames[o + 2 * LANDMARK.lip + 1];
		if (tipX - c.frames[o + 2 * LANDMARK.throat] < CLEAR.gap) continue;
		if (!(tipY - surfaceBeneath$1(c.frames, f, tipX, tipY) >= CLEAR.gap)) continue;
		return {
			tau: c.tauStart + f * c.tauStep,
			voidHeight: voidHeightAt(c.frames, f),
			clear: true
		};
	}
	const f = Math.max(0, last);
	return {
		tau: c.tauStart + f * c.tauStep,
		voidHeight: voidHeightAt(c.frames, f),
		clear: false
	};
}
//#endregion
//#region src/wave/barrel/profileFormat.ts
const MAGIC = 1112689714;
/** "BRL1": the frames alone, before the tip's velocities (Part B, PR 4). */
const LEGACY = 1112689713;
function decodeCase(bytes) {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const magic = bytes.byteLength < 8 ? 0 : view.getUint32(0, true);
	if (magic !== MAGIC && magic !== LEGACY) throw new Error("Not a barrel case");
	const length = view.getUint32(4, true);
	const meta = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + length)));
	const start = 8 + Math.ceil(length / 4) * 4;
	const floats = new Float32Array(bytes.slice(start).buffer);
	if (magic === LEGACY) return {
		...meta,
		frames: floats
	};
	const count = floats.length / 258;
	return {
		...meta,
		frames: floats.slice(0, count * 2 * 128),
		tipVelocity: floats.slice(count * 2 * 128)
	};
}
//#endregion
//#region src/wave/barrel/heldOverturn.ts
const FLOATS$1 = 256;
/** How far ahead of the tip the face is searched for its point nearest the tip, h0 (metrics.py's 2.0). */
const FACE_REACH = 2;
const none = () => ({
	jetArea: 0,
	voidArea: 0,
	voidLength: 0,
	axisX: 1,
	axisY: 0
});
/** Frame `frame`'s overturn, from a case's frames (PROFILE_POINTS (x, y) pairs per frame, h0). */
function overturnAt(frames, frame) {
	const o = frame * FLOATS$1;
	const x = (i) => frames[o + 2 * i];
	const y = (i) => frames[o + 2 * i + 1];
	const tipX = x(LANDMARK.lip);
	const tipY = y(LANDMARK.lip);
	if (!(tipX - x(LANDMARK.throat) > 0)) return none();
	let k = -1;
	let nearest = Infinity;
	for (let i = LANDMARK.throat; i < 128; i += 1) {
		if (!(x(i) < tipX + FACE_REACH)) continue;
		const dx = x(i) - tipX;
		const dy = y(i) - tipY;
		const d = dx * dx + dy * dy;
		if (d < nearest) {
			nearest = d;
			k = i;
		}
	}
	if (k - LANDMARK.lip < 2) return none();
	let twice = 0;
	for (let i = LANDMARK.lip; i <= k; i += 1) {
		const j = i === k ? LANDMARK.lip : i + 1;
		twice += x(i) * y(j) - x(j) * y(i);
	}
	let longest = 0;
	let from = LANDMARK.lip;
	let to = LANDMARK.lip;
	for (let i = LANDMARK.lip; i <= k; i += 1) for (let j = i + 1; j <= k; j += 1) {
		const dx = x(j) - x(i);
		const dy = y(j) - y(i);
		const d = dx * dx + dy * dy;
		if (d > longest) {
			longest = d;
			from = i;
			to = j;
		}
	}
	const length = Math.sqrt(longest);
	const axisX = length > 0 ? Math.abs(x(to) - x(from)) / length : 1;
	const axisY = length > 0 ? -Math.abs(y(to) - y(from)) / length : 0;
	const throatX = x(LANDMARK.throat);
	let crossing = -1;
	for (let i = 0; i < LANDMARK.lip; i += 1) if ((x(i) - throatX) * (x(i + 1) - throatX) <= 0) crossing = i;
	let jetArea = 0;
	if (crossing >= 0) {
		const run = x(crossing + 1) - x(crossing);
		const t = run !== 0 ? (throatX - x(crossing)) / run : 0;
		const startX = x(crossing) + t * run;
		const startY = y(crossing) + t * (y(crossing + 1) - y(crossing));
		let jet = 0;
		let px = startX;
		let py = startY;
		for (let i = crossing + 1; i <= LANDMARK.throat; i += 1) {
			jet += px * y(i) - x(i) * py;
			px = x(i);
			py = y(i);
		}
		jet += px * startY - startX * py;
		jetArea = Math.abs(jet) / 2;
	}
	return {
		jetArea,
		voidArea: Math.abs(twice) / 2,
		voidLength: length,
		axisX,
		axisY
	};
}
/**
* The lip as a thin sheet (docs/research/water-physics/tube-colour-fix.md, step 1; the advisor's rulings, 2026-10-01):
* the lip's two sides are the profile's runs from the crest to the tip and from the tip back under to the throat
* (`LANDMARK`), and each point between the crest and the throat takes its distance across to the other side, m.
* - `ramp`: points over which the sheet's weight ramps to 0 next to the crest and the throat (1 from 36 to 84);
* - `formed`, h0: the underside's length over which the weight comes in, 0.25 m at h0 7 m. The library folds the
*   underside onto the tip until the cavity forms (its run is a point before the throw, and again at some touchdown
*   frames), when there is no air behind it and the distance across would run down the face: column water, weight 0
*   [provisional].
*/
const SHEET = {
	ramp: 3,
	formed: .035
};
/**
* The dark throat's lip (the Rich look; the advisor's rulings, 2026-10-01): the profile points over whose sheet the lip's
* mean thickness is taken, for the light it lets through onto the inner face (the outer run's middle, clear of the
* crest's root and the tip) [provisional].
*/
const THROAT = {
	thicknessFrom: 40,
	thicknessTo: 60
};
/**
* The view factor, in the slice's plane, of the directions sweeping counter-clockwise from (ax, ay) to (bx, by) (under
* half a turn apart), from a surface whose unit normal is (nx, ny): ½(sin θ2 − sin θ1), θ from the normal, the arc held
* to the half-plane the surface faces. Exact for extruded geometry. Only + − × ÷ √.
*/
function arcView(nx, ny, ax, ay, bx, by) {
	const la = Math.sqrt(ax * ax + ay * ay);
	const lb = Math.sqrt(bx * bx + by * by);
	if (!(la > 0 && lb > 0)) return 0;
	const c1 = (nx * ax + ny * ay) / la;
	const s1 = (nx * ay - ny * ax) / la;
	const c2 = (nx * bx + ny * by) / lb;
	const s2 = (nx * by - ny * bx) / lb;
	const from = c1 >= 0 ? s1 : c2 >= 0 ? -1 : NaN;
	const to = c2 >= 0 ? s2 : c1 >= 0 ? 1 : NaN;
	if (from !== from || to !== to) return 0;
	return to > from ? (to - from) / 2 : 0;
}
/**
* The share of the sky seen through a tube's opening from a point on a surface, in the slice's plane (x along the ray,
* y up; the advisor's ruling, 2026-10-01): the view factor of the directions from the still water's horizon ahead,
* (1, 0), up to the lip's tip as seen from (x, y), on the surface's unit normal (nx, ny) (`arcView`). Exact for an
* extruded tube, where rays below the horizon meet the water and those above the tip the lip. 0 when the tip is not
* above the point.
*/
function tubeSkyView(x, y, nx, ny, tipX, tipY) {
	return tipY - y > 0 ? arcView(nx, ny, 1, 0, tipX - x, tipY - y) : 0;
}
/** Where `acrossTo` found the other side: the segment's first point, and how far along it. */
const foot = {
	k: 0,
	t: 0
};
/**
* Each profile segment k → k + 1 a search may test, 8 floats a segment: its start, its run and the run's inverse square
* length (0 for a point), its midpoint and half its length (`prepareSegments`).
*/
const segments = /* @__PURE__ */ new Float64Array(1024);
/** Segments a block holds, and each block's circle (centre, radius) over them, by its first segment (`prepareSegments`). */
const BLOCK = 4;
const blocks = /* @__PURE__ */ new Float64Array(384);
/** Lays out the run [from, to]'s segments for `acrossTo`, and its blocks of `BLOCK` from `from`. */
function prepareSegments(profile, from, to) {
	for (let k = from; k < to; k += 1) {
		const o = 8 * k;
		const ax = profile[2 * k];
		const ay = profile[2 * k + 1];
		const dx = profile[2 * k + 2] - ax;
		const dy = profile[2 * k + 3] - ay;
		const length2 = dx * dx + dy * dy;
		segments[o] = ax;
		segments[o + 1] = ay;
		segments[o + 2] = dx;
		segments[o + 3] = dy;
		segments[o + 4] = length2 > 0 ? 1 / length2 : 0;
		segments[o + 5] = ax + dx / 2;
		segments[o + 6] = ay + dy / 2;
		segments[o + 7] = Math.sqrt(length2) / 2;
	}
	for (let b = from; b < to; b += BLOCK) {
		const end = b + BLOCK < to ? b + BLOCK : to;
		let x0 = Infinity;
		let x1 = -Infinity;
		let y0 = Infinity;
		let y1 = -Infinity;
		for (let k = b; k <= end; k += 1) {
			const x = profile[2 * k];
			const y = profile[2 * k + 1];
			x0 = x < x0 ? x : x0;
			x1 = x > x1 ? x : x1;
			y0 = y < y0 ? y : y0;
			y1 = y > y1 ? y : y1;
		}
		const cx = (x0 + x1) / 2;
		const cy = (y0 + y1) / 2;
		let r2 = 0;
		for (let k = b; k <= end; k += 1) {
			const ex = profile[2 * k] - cx;
			const ey = profile[2 * k + 1] - cy;
			if (ex * ex + ey * ey > r2) r2 = ex * ex + ey * ey;
		}
		blocks[3 * b] = cx;
		blocks[3 * b + 1] = cy;
		blocks[3 * b + 2] = Math.sqrt(r2);
	}
}
/** The search's best so far: its squared distance, the distance, and where. */
const search = {
	best: Infinity,
	bound: Infinity,
	k: -1,
	t: 0
};
/** Tests segment k against (px, py) for `search`: ties go to the first segment along the run, as a search in order. */
function testSegment(px, py, k) {
	const o = 8 * k;
	const ex = px - segments[o];
	const ey = py - segments[o + 1];
	const dx = segments[o + 2];
	const dy = segments[o + 3];
	let t = (ex * dx + ey * dy) * segments[o + 4];
	t = t < 0 ? 0 : t > 1 ? 1 : t;
	const qx = ex - t * dx;
	const qy = ey - t * dy;
	const d2 = qx * qx + qy * qy;
	if (d2 < search.best || d2 === search.best && k < search.k) {
		search.best = d2;
		search.bound = Math.sqrt(d2);
		search.k = k;
		search.t = t;
	}
}
/** Whether a circle (its centre (x, y) from the point, its radius r) lies beyond the search's bound: it cannot even tie. */
function beyond(x, y, r) {
	const reach = search.bound + r;
	return x * x + y * y > reach * reach * (1 + 1e-9) + 1e-12;
}
/**
* The shortest distance from profile point i to the segments of the run [from, to] (laid out by `prepareSegments`), m,
* the nearest point into `foot`: the first such segment along the run, as a search in order finds it. From `start` (the
* last point's nearest segment, usually next to this one's) it takes a first distance, then tests only the blocks and
* segments whose circles it doesn't rule out (nothing in a circle is nearer than its centre's distance less its radius),
* so most cost a few products, not a projection (the advisor, 2026-10-01: a whole search of each run cost 20 ms a build
* with a long front open). Only + − × ÷ √.
*/
function acrossTo(profile, i, from, to, start = -1) {
	const px = profile[2 * i];
	const py = profile[2 * i + 1];
	search.best = Infinity;
	search.bound = Infinity;
	search.k = -1;
	search.t = 0;
	if (start >= from && start < to) testSegment(px, py, start);
	for (let b = from; b < to; b += BLOCK) {
		if (beyond(px - blocks[3 * b], py - blocks[3 * b + 1], blocks[3 * b + 2])) continue;
		const end = b + BLOCK < to ? b + BLOCK : to;
		for (let k = b; k < end; k += 1) {
			if (k === start || beyond(px - segments[8 * k + 5], py - segments[8 * k + 6], segments[8 * k + 7])) continue;
			testSegment(px, py, k);
		}
	}
	foot.k = search.k;
	foot.t = search.t;
	return Math.sqrt(search.best);
}
/**
* The lip's thickness at each point between the crest and the throat (`SHEET`), into `out` (m): from the crest to the
* tip, the distance to the underside's run; from the tip back to the throat, to the outer run's; 0 at the tip, where
* they meet. Into `back`, how much of the sky the sheet's far side sees there (the advisor's ruling, 2026-10-01): from
* the outer run, the underside's view through the tube's opening where the distance was found (`tubeSkyView`); from
* the underside and the tip, 1, the open sky. `scale`: the slice's h0, m. `walk` (the default) starts each point's
* search from the last one's nearest segment (`acrossTo`; the same answers, fewer tests). Returns how far the underside
* has formed, 0–1: its length over `SHEET.formed` h0 (0 leaves `out` and `back` as they were).
*/
function sheetAcross(profile, scale, out, back, walk = true) {
	const { crest, lip, throat } = LANDMARK;
	let underside = 0;
	for (let k = lip; k < throat; k += 1) {
		const dx = profile[2 * k + 2] - profile[2 * k];
		const dy = profile[2 * k + 3] - profile[2 * k + 1];
		underside += Math.sqrt(dx * dx + dy * dy);
	}
	const formed = Math.min(1, underside / (SHEET.formed * scale));
	if (formed <= 0) return 0;
	const tipX = profile[2 * lip];
	const tipY = profile[2 * lip + 1];
	prepareSegments(profile, crest, lip);
	prepareSegments(profile, lip, throat);
	let start = -1;
	for (let i = crest + 1; i < lip; i += 1) {
		out[i] = acrossTo(profile, i, lip, throat, walk ? start : -1);
		start = foot.k;
		const { k, t } = foot;
		const dx = profile[2 * k + 2] - profile[2 * k];
		const dy = profile[2 * k + 3] - profile[2 * k + 1];
		const length = Math.sqrt(dx * dx + dy * dy);
		back[i] = length > 0 ? tubeSkyView(profile[2 * k] + t * dx, profile[2 * k + 1] + t * dy, -dy / length, dx / length, tipX, tipY) : 0;
	}
	out[lip] = 0;
	back[lip] = 1;
	start = -1;
	for (let i = lip + 1; i < throat; i += 1) {
		out[i] = acrossTo(profile, i, crest, lip, walk ? start : -1);
		start = foot.k;
		back[i] = 1;
	}
	return formed;
}
//#endregion
//#region ../../../../../private/tmp/tube-hold-area-20261004/compare.ts
const WORK = "/private/tmp/tube-hold-area-20261004";
const OWNER = "/private/tmp/tube-lip-attribution-20261004/native-first-owner.json";
const receipt = JSON.parse(readFileSync(OWNER, "utf8"));
const EXPECTED_DIST = "/private/tmp/tube-deep-rider-native-20261004/dist";
assert.equal(receipt.dist, EXPECTED_DIST);
assert(!existsSync(join(WORK, "report.json")), "Finite offline report may run only once in this scratch directory");
const files = [
	"pad19-a20-l12",
	"pad19-a30-l12",
	"pad19-a45-l12",
	"periodic-padang19s-l12"
];
const FLOATS = 256;
const referenceScale = 7;
const sha = (b) => createHash("sha256").update(b).digest("hex");
function surfaceBeneath(frames, f, x, y) {
	const o = f * FLOATS;
	let best = NaN;
	for (let i = LANDMARK.throat; i < LANDMARK.front; i++) {
		const x0 = frames[o + 2 * i], x1 = frames[o + 2 * i + 2];
		if (x0 === x1 || (x0 - x) * (x1 - x) > 0) continue;
		const y0 = frames[o + 2 * i + 1];
		const under = y0 + (x - x0) / (x1 - x0) * (frames[o + 2 * i + 3] - y0);
		if (under < y && !(under <= best)) best = under;
	}
	return best;
}
function maxGap(c, f) {
	const o = f * FLOATS;
	let height = 0;
	for (let i = LANDMARK.lip; i <= LANDMARK.throat; i++) {
		const y = c.frames[o + 2 * i + 1];
		const gap = y - surfaceBeneath(c.frames, f, c.frames[o + 2 * i], y);
		if (gap > height) height = gap;
	}
	return height;
}
function metric(c, f) {
	const o = f * FLOATS, tipX = c.frames[o + 2 * LANDMARK.lip], tipY = c.frames[o + 2 * LANDMARK.lip + 1];
	const reach = tipX - c.frames[o + 2 * LANDMARK.throat];
	const clearance = tipY - surfaceBeneath(c.frames, f, tipX, tipY);
	return {
		frame: f,
		tau: c.tauStart + f * c.tauStep,
		eligible: reach >= CLEAR.gap && clearance >= CLEAR.gap,
		voidArea: overturnAt(c.frames, f).voidArea,
		maxGap: maxGap(c, f),
		lipFloorClearance: Number.isFinite(clearance) ? clearance : null,
		lipThroatReach: reach
	};
}
function detail(c, m) {
	const profile = c.frames.slice(m.frame * FLOATS, (m.frame + 1) * FLOATS);
	const across = /* @__PURE__ */ new Float32Array(128);
	const formed = sheetAcross(profile, 1, across, /* @__PURE__ */ new Float32Array(128));
	let mean = 0, min = Infinity, max = 0;
	for (let i = THROAT.thicknessFrom; i <= THROAT.thicknessTo; i++) {
		mean += across[i];
		min = Math.min(min, across[i]);
		max = Math.max(max, across[i]);
	}
	mean /= THROAT.thicknessTo - THROAT.thicknessFrom + 1;
	const overturn = overturnAt(c.frames, m.frame);
	return {
		...m,
		...overturn,
		roofThickness: {
			measurement: "actual sheetAcross nearest opposite lip-run distance, points40..60",
			units: "h0",
			formed,
			mean,
			min,
			max,
			values40Through60: Array.from(across.subarray(40, 61))
		},
		profile: Array.from(profile)
	};
}
const cases = files.map((id, index) => {
	const asset = `barrels/${id}.bin`, bytes = new Uint8Array(readFileSync(join(EXPECTED_DIST, asset)));
	assert.equal(bytes.byteLength, receipt.served[asset].bytes, "Actual fetched asset size");
	assert.equal(sha(bytes), receipt.served[asset].sha256, "Actual fetched asset hash");
	const c = decodeCase(bytes);
	assert.equal(c.id, id);
	assert(c.frames.every(Number.isFinite));
	const count = c.frames.length / FLOATS;
	assert(Number.isInteger(count));
	const last = Math.min(count - 1, Math.floor((c.touchdown - c.tauStart) / c.tauStep + 1e-6) - 1);
	const eligible = [];
	for (let f = 0; f <= last; f++) {
		const m = metric(c, f);
		if (m.eligible) eligible.push(m);
	}
	assert(eligible.length > 0, "Shipped case has clear eligible frames");
	const current = eligible.at(-1);
	const authoritative = heldFrame(c);
	assert.equal(authoritative.clear, true);
	assert.equal(current.tau, authoritative.tau);
	assert.equal(current.maxGap, authoritative.voidHeight, "Exact copied arithmetic vs exported baseline");
	let best = current, highest = current;
	for (const m of eligible) {
		if (m.voidArea > best.voidArea || m.voidArea === best.voidArea && m.frame > best.frame) best = m;
		if (m.maxGap > highest.maxGap || m.maxGap === highest.maxGap && m.frame > highest.frame) highest = m;
	}
	const original = detail(c, current), maximum = detail(c, best), highestDetail = detail(c, highest), unit = Math.sqrt(referenceScale / GRAVITY);
	return {
		id,
		scope: index < 3 ? "requested-three-pad19-cases" : "additional-periodic-asset-present-in-runtime-owner-receipt",
		asset: {
			file: join(EXPECTED_DIST, asset),
			bytes: bytes.length,
			sha256: sha(bytes)
		},
		source: {
			nonlinearity: c.nonlinearity,
			tauStart: c.tauStart,
			tauStep: c.tauStep,
			touchdown: c.touchdown,
			frameCount: count,
			lastEligibleSearchFrame: last,
			clearThreshold: CLEAR.gap,
			eligibleCount: eligible.length
		},
		current: original,
		maxVoidArea: maximum,
		maxVoidHeight: highestDetail,
		change: {
			framesEarlier: current.frame - best.frame,
			tauEarlier: current.tau - best.tau,
			areaFactor: best.voidArea / current.voidArea,
			maxGapFactor: best.maxGap / current.maxGap,
			roofThicknessMeanFactor: maximum.roofThickness.mean / original.roofThickness.mean,
			naiveCollapseDurationFactor: Math.sqrt(best.maxGap / current.maxGap)
		},
		maxHeightChange: {
			framesEarlier: current.frame - highest.frame,
			tauEarlier: current.tau - highest.tau,
			areaFactor: highest.voidArea / current.voidArea,
			maxGapFactor: highest.maxGap / current.maxGap,
			roofThicknessMeanFactor: highestDetail.roofThickness.mean / original.roofThickness.mean,
			naiveCollapseDurationFactor: Math.sqrt(highest.maxGap / current.maxGap)
		},
		illustrativeAtH0SevenMeters: {
			physicalSceneScaleClaim: false,
			secondsEarlier: (current.tau - best.tau) * unit,
			touchdownSeconds: c.touchdown * unit,
			current: {
				areaSquareMeters: original.voidArea * referenceScale * referenceScale,
				maxGapMeters: original.maxGap * referenceScale,
				meanRoofThicknessMeters: original.roofThickness.mean * referenceScale,
				collapseSeconds: Math.sqrt(2 * original.maxGap * referenceScale / GRAVITY)
			},
			maxVoidArea: {
				areaSquareMeters: maximum.voidArea * referenceScale * referenceScale,
				maxGapMeters: maximum.maxGap * referenceScale,
				meanRoofThicknessMeters: maximum.roofThickness.mean * referenceScale,
				collapseSeconds: Math.sqrt(2 * maximum.maxGap * referenceScale / GRAVITY)
			},
			maxVoidHeight: {
				areaSquareMeters: highestDetail.voidArea * referenceScale * referenceScale,
				maxGapMeters: highestDetail.maxGap * referenceScale,
				meanRoofThicknessMeters: highestDetail.roofThickness.mean * referenceScale,
				collapseSeconds: Math.sqrt(2 * highestDetail.maxGap * referenceScale / GRAVITY)
			}
		},
		eligibleFrames: eligible
	};
});
const report = {
	schema: "tube-hold-area-offline/v1",
	complete: true,
	sourceOwner: OWNER,
	sourceDist: EXPECTED_DIST,
	sourceFiles: [
		"ProfileLibrary.ts",
		"profileFormat.ts",
		"heldOverturn.ts",
		"lipSheet.ts"
	].map((name) => {
		const file = `/Users/regina/Desktop/Projects/surfing-game/src/wave/barrel/${name}`, b = readFileSync(file);
		return {
			file,
			bytes: b.length,
			sha256: sha(b)
		};
	}),
	actualFetchedPadangAssets: files.length,
	requestedPrimaryCases: 3,
	eligibility: "Exact original heldFrame bounds/tip-floor clearance/tip-throat reach; no relaxation",
	selection: "Maximum existing overturnAt voidArea AND maximum existing voidHeight arithmetic over eligible frames; ties use latest frame",
	units: {
		coordinates: "h0",
		area: "h0 squared",
		tau: "sqrt(h0/g)",
		gravity: GRAVITY,
		illustrativeScaleMeters: referenceScale,
		actualCurrentNativeSceneScaleClaim: false
	},
	constraints: {
		productionEdits: false,
		servedDistMutation: false,
		browser: false,
		solverRuns: false,
		offlineOnly: true
	},
	limitations: [
		"Cavity area is the actual heldOverturn polygon measure; it does not prove roominess at every ray or contour validity.",
		"Roof thickness is existing sheetAcross distance, not a newly invented extrusion or a visual-acceptance measure.",
		"Runtime receipt establishes fetched assets, not which case contributes at the retained target cross-section."
	],
	cases
};
const encoded = JSON.stringify(report, null, 2);
assert(Buffer.byteLength(encoded) <= 524288, "Bounded512KiB JSON");
writeFileSync(join(WORK, "report.json"), encoded);
const fmt = (n) => n.toFixed(6);
const rows = ["case	selection	frame	tau	voidArea(h0²)	maxGap(h0)	tipFloor(h0)	tipThroat(h0)	meanRoof40..60(h0)"];
for (const c of cases) for (const [name, m] of [
	["last-clear", c.current],
	["max-area", c.maxVoidArea],
	["max-height", c.maxVoidHeight]
]) rows.push([
	c.id,
	name,
	m.frame,
	fmt(m.tau),
	fmt(m.voidArea),
	fmt(m.maxGap),
	fmt(m.lipFloorClearance),
	fmt(m.lipThroatReach),
	fmt(m.roofThickness.mean)
].join("	"));
writeFileSync(join(WORK, "table.txt"), rows.join("\n") + "\n");
console.log(JSON.stringify({
	complete: true,
	report: join(WORK, "report.json"),
	table: join(WORK, "table.txt"),
	cases: cases.map((c) => ({
		id: c.id,
		currentFrame: c.current.frame,
		maxAreaFrame: c.maxVoidArea.frame,
		...c.change,
		maxHeightFrame: c.maxVoidHeight.frame,
		maxHeightChange: c.maxHeightChange,
		h0SevenMeters: c.illustrativeAtH0SevenMeters
	}))
}));
//#endregion
export {};
