import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
//#region src/wave/dispersion.ts
/** Linear (Airy) water-wave dispersion, ω² = g k tanh(kh), in SI units. */
const GRAVITY = 9.81;
/**
* Explicit wavenumber from Guo (2002), exact in both limits and within 0.8 %
* of the dispersion root at every depth. Cheap enough for per-cell use.
* `depth` is still-water depth in metres; Infinity means deep water.
*/
function waveNumber(omega, depth, g = GRAVITY) {
	if (!(depth > 0)) throw new RangeError(`Water depth must be positive, got ${depth}`);
	const deep = omega * omega / g;
	if (!Number.isFinite(depth)) return deep;
	const x = deep * depth;
	const y = omega * Math.sqrt(depth / g);
	return x * Math.pow(1 - Math.exp(-Math.pow(y, 2.5)), -.4) / depth;
}
/** Exact dispersion root by Newton iteration from the Guo estimate, for setup-time use. */
function exactWaveNumber(omega, depth, g = GRAVITY) {
	let k = waveNumber(omega, depth, g);
	if (!Number.isFinite(depth)) return k;
	for (let iteration = 0; iteration < 20; iteration += 1) {
		const tanh = Math.tanh(k * depth);
		const residual = g * k * tanh - omega * omega;
		const slope = g * tanh + g * k * depth * (1 - tanh * tanh);
		const next = k - residual / slope;
		if (Math.abs(next - k) <= 1e-15 * k) return next;
		k = next;
	}
	return k;
}
function waveKinematics(period, depth, g = GRAVITY) {
	const omega = 2 * Math.PI / period;
	const k = exactWaveNumber(omega, depth, g);
	const kh = k * depth;
	const n = Number.isFinite(kh) ? .5 * (1 + 2 * kh / Math.sinh(2 * kh)) : .5;
	const phaseSpeed = omega / k;
	return {
		k,
		wavelength: 2 * Math.PI / k,
		phaseSpeed,
		groupSpeed: n * phaseSpeed,
		kh
	};
}
//#endregion
//#region src/wave/random.ts
/** Deterministic mulberry32 stream; `salt` separates independent streams drawn from one seed. */
function seededRandom(seed, salt = 0) {
	let value = (seed ^ salt) >>> 0;
	return () => {
		value = value + 1831565813 >>> 0;
		let t = value;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}
//#endregion
//#region src/wave/pool.ts
/**
* The Wave Pool (the movement-flow spec): a training pool whose machine sends the same wave every POOL.period
* seconds onto an A-frame reef, a finger that breaks first at its tip and peels both ways, a right and a left each
* wave, for faces of 1.0, 1.25 and 1.5 m. The same solver rides it as every spot. The layout is the water-physics
* advisor's (2026-10-01 consult, docs/research/water-physics/consult-log.md), provisional until the sweep:
* - the machine's floor `feedDepth` deep under the relaxation zone, where a regular wave of the pool's height is
*   near linear (Ursell about 8; at 4.5 m it was 41 and a linear input would shed free harmonics);
* - a ramp square to the crests (so it turns nothing) at `rampSlope`, at least half a wavelength long so it
*   reflects little, up to a terrace `terraceDepth` deep: shallow, so little depth is left to refract over (at
*   2.5 m still 1.7 times the biggest breaking depth, so nothing breaks on it);
* - the reef on the terrace: a finger pointing seaward, its tip at z = `apexZ` (x = 0, on the grid's symmetry
*   line), its two arms at `armAngle` to the incoming crests, rounded over a half-width `tipRounding` at the tip (a
*   hyperbola: the width over which the focus spreads, 0.5–1 wavelength on the terrace), easing to
*   `outerArmAngle` past |x| = `bendX` over `bendWidth` m (a curve, not a kink, which would refract like a small
*   tip), so the arms' longer outer run stays in the tank with its peel still about 46°. Refraction turns the
*   crests toward the arms, so arms at 71° break at a peel angle of about 47–50° along them (measured): Scarfe's
*   46–55° for intermediates' standard manoeuvres, about 6–6.5 m/s at 1.1–1.25 m faces;
* - seaward of the terrace's edge the finger's faces run on at their gradient instead of stopping at the terrace:
*   in front of the finger (|x| under about 90 m) two ridges aligned with the approach, their crests dipping seaward
*   at about 1:43 along the path and their sides at 1:18 normal, down to 4–8 m at the zone's inner edge, where the
*   tank blends them into the feed over 10 m (a step reflecting at most about 3 % of the energy into the zone). This
*   is Mead's "focus" (Mead 2000, table 3.3: contour-normal gradients 1:10–1:80, alignments 40–90°), which gathers the
*   waves onto the finger and eases the take-off. Found after the sweep and kept on the advisor's ruling
*   (2026-10-01): every measurement was made on it. If the zone or the feed ever moves, recheck the step; if a size
*   ever breaks on the arms before the tip, look at the axis first (deeper than the ridges, so it draws less);
* - its face climbs at `gradient` square to the crest line, about 1:18: Mead & Black's orthogonal gradient of about
*   1:28 along the ray at breaking, which crosses the arms at about 50° (their intensity about 2.6–2.8, a face that
*   throws without a tube; set along +z it made the arms about 1:9 and tubed), to its crest: `crestDepth` deep at
*   the tip, shallowing along each arm to `crestEndDepth` at its end (a ramped reef: a deeper tip focuses less, so
*   it breaks over a small peak rather than closing out across the finger and starving the flanks, and the
*   shallowing crest keeps the arms' refracted waves breaking in order; the advisor, 2026-10-01);
* - behind the crest a reef top `flatWidth` wide, then the lagoon inside the finger, `lagoonDepth` deep;
* - past |x| = `armLength` each arm tapers over `taperWidth` into the terrace, its crest deepening to the terrace's,
*   so the break fades into a shoulder to kick out on, and the lagoon's return flow leaves through the channels
*   beside it, level across the window's open side edges;
* - a beach face at `shoreSlope` up to the waterline at z = 0, and on up to the deck, `deck` m above the water.
* Mutable for the probes.
*/
const POOL = {
	period: 10,
	feedDepth: 9,
	rampSlope: 1 / 9,
	terraceDepth: 2.5,
	apexZ: -210,
	armAngle: 71,
	outerArmAngle: 65,
	bendX: 40,
	bendWidth: 14,
	tipRounding: 15,
	gradient: 1 / 18,
	crestDepth: 1,
	crestEndDepth: .5,
	flatWidth: 6,
	lagoonDepth: 1.8,
	armLength: 82,
	taperWidth: 25,
	/**
	* Where riders wait, x, m: on the right arm just past the tip's fast section, where the break line settles to its
	* steady peel (about 6 m/s along the arm from |x| 27 out; the break-line probe, 2026-10-01).
	*/
	takeOffX: 27,
	/** How far seaward of the tip's face the terrace reaches before the ramp, m: short, so the ramp's free harmonics don't reorder the crest. */
	terraceLead: 20,
	shoreSlope: 1 / 8,
	deck: .6,
	alongShore: 280
};
/** Where the terrace begins, z, m: seaward of the tip's face by `terraceLead`. */
function poolTerraceZ() {
	const p = POOL;
	return p.apexZ - (p.terraceDepth - p.crestDepth) / p.gradient - p.terraceLead;
}
/** Where the ramp rises from the machine's floor, z, m. */
function poolRampFootZ() {
	return poolTerraceZ() - (POOL.feedDepth - POOL.terraceDepth) / POOL.rampSlope;
}
/** A regular wave's Hs, 4√m0, for its height H: m0 = a²/2 = H²/8, so Hs = √2 H. */
/** smoothstep, kept here so this module and Bathymetry's import only each other's types. */
function ease(edge0, edge1, value) {
	const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
	return t * t * (3 - 2 * t);
}
/** The crest line's slope dz/d|x| at along-shore position x: the hyperbola's at the tip, its arms easing from armAngle to outerArmAngle. */
function crestSlope(u) {
	const p = POOL;
	const bend = ease(p.bendX - p.bendWidth / 2, p.bendX + p.bendWidth / 2, u);
	const angle = p.armAngle + (p.outerArmAngle - p.armAngle) * bend;
	return Math.tan(angle * Math.PI / 180) * (u / Math.hypot(u, p.tipRounding));
}
/** The crest line's z at |x| on a 0.25 m table, integrated from its slope; rebuilt when POOL changes (the probes set it). */
const CREST_STEP = .25;
let crestTable;
function crestTableFor() {
	const key = JSON.stringify(POOL);
	if (crestTable?.key === key) return crestTable.z;
	const count = Math.ceil(POOL.alongShore / CREST_STEP) + 2;
	const z = new Float64Array(count);
	for (let i = 1; i < count; i += 1) z[i] = z[i - 1] + CREST_STEP * (crestSlope((i - 1) * CREST_STEP) + crestSlope(i * CREST_STEP)) / 2;
	crestTable = {
		key,
		z
	};
	return z;
}
/** Where the crest line (the top of the reef's arms) crosses along-shore position x: rounded at the tip, bent outward. */
function poolCrestZ(x) {
	const table = crestTableFor();
	const at = Math.min(table.length - 1.001, Math.abs(x) / CREST_STEP);
	const i = Math.floor(at);
	return POOL.apexZ + table[i] + (table[i + 1] - table[i]) * (at - i);
}
/** The share of a step along +z that lies square to the crest line at along-shore position x: the cosine of the line's angle there. */
function poolNormalShare(x) {
	return 1 / Math.hypot(1, crestSlope(Math.abs(x)));
}
/** How far each arm has tapered into the terrace at along-shore position x: 0 on the reef, 1 past its end. */
function poolTaper(x) {
	return ease(POOL.armLength, POOL.armLength + POOL.taperWidth, Math.abs(x));
}
/** The pool's still depth below datum at (x, z), m; negative on the deck. */
function poolDepth(x, z) {
	const p = POOL;
	const ramp = Math.min(p.feedDepth, p.terraceDepth + Math.max(0, poolTerraceZ() - z) * p.rampSlope);
	const taper = poolTaper(x);
	const crestLine = poolCrestZ(x);
	const ramped = p.crestDepth + (p.crestEndDepth - p.crestDepth) * Math.min(1, Math.abs(x) / p.armLength);
	const crest = ramped + (p.terraceDepth - ramped) * taper;
	const lagoon = p.lagoonDepth + (p.terraceDepth - p.lagoonDepth) * taper;
	const normal = poolNormalShare(x);
	const face = crest + Math.max(0, crestLine - z) * normal * p.gradient;
	const inside = Math.max(0, z - crestLine - p.flatWidth) * normal;
	const reef = z <= crestLine ? face : Math.min(lagoon, crest + inside * p.gradient);
	const bed = Math.min(ramp, reef);
	const beach = Math.max(-p.deck, -z * p.shoreSlope);
	return Math.min(bed, beach);
}
function poolSpot() {
	return {
		name: "pool",
		depthAt: poolDepth
	};
}
/** The machine's relaxation zone is this many wavelengths at its floor long: 1.5–2 absorb a 10 s wave (the advisor). */
const POOL_ZONE_WAVELENGTHS = 1.75;
/**
* The pool's tank across shore, m (a TankLayout without its edge depth): the relaxation zone over the machine's
* floor ending just seaward of the ramp, the fine grid from just seaward of the terrace to the shore.
*/
function poolTankLayout(shore) {
	const zoneInner = poolRampFootZ() - 10;
	return {
		offshore: zoneInner - POOL_ZONE_WAVELENGTHS * waveKinematics(POOL.period, POOL.feedDepth).wavelength,
		zoneInner,
		blendEnd: zoneInner + 10,
		fineFrom: poolTerraceZ() - 10,
		shore
	};
}
//#endregion
//#region src/wave/Bathymetry.ts
function smoothstep(edge0, edge1, value) {
	const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
	return t * t * (3 - 2 * t);
}
/** Dean (1991) equilibrium profile h = A s^(2/3) at offshore distance s, capped, with a planar foreshore on land. */
function deanDepth(offshore, a = .12, maxDepth = 12, landSlope = .06) {
	if (offshore <= 0) return offshore * landSlope;
	return Math.min(maxDepth, a * Math.pow(offshore, 2 / 3));
}
const BEACH_BAR = {
	offshore: 90,
	height: .9,
	width: 18,
	ripSpacing: 110,
	ripWidth: 22,
	ripJitter: 25
};
const POINT_HEADLAND = {
	center: 0,
	halfWidth: 150,
	protrusion: 120,
	slope: .04,
	maxDepth: 12
};
/**
* The Beach's outer bar and shelf (the wave-sizes spec; docs/research/outer-profiles.md): a Gaussian bar 2 m
* high 450 m out (crest 5 m deep, inside Duck's 300–600 m and 3–8 m), 80 m long so its tail leaves the inner
* bed alone, on Dean's profile continued to 30 m.
*/
const BEACH_OUTER = {
	barOffshore: 450,
	barHeight: 2,
	barWidth: 80,
	maxDepth: 30
};
/** The Point's shelf past its 12 m: a gentler 1:67 slope to 30 m (an assumption; see the research doc). */
const POINT_OUTER = {
	slope: .015,
	maxDepth: 30
};
/**
* The Teahupo'o Reef (the Teahupo'o Reef spec): a left slab. The tank's deep water rises up a
* 1:2.29 forereef (Rodríguez-Burguette et al. 2025, a model of Teahupo'o's reef) to a shelf
* about 10 m deep (Shand 2024), where the wave stands up before the reef rises again to its
* crest, about 1.5 m under the surface (WSL). The ledge rises from the shelf, its foot meeting
* the shelf's edge at the peak (x = crestX), and runs at `angle` degrees to the shoreline,
* furthest out toward −x, so each wave breaks there first and peels toward +x (a left) at the
* shelf's celerity over the sine of the crest's angle to it (`ledgePeel`). A pass runs along the
* window's +x open edge, level across it like the Canyon's axis, where the left ends. A planar
* beach face caps it all. Sources and provisional values: docs/research/teahupoo-reef-sources.md.
* Mutable for the design sweep (`scripts/reefShape.ts`).
*/
const REEF = {
	deep: 30,
	foreSlope: 1 / 2.29,
	shelfEdge: -150,
	shelfDepth: 10,
	ledgeSlope: 1 / 2.29,
	crestDepth: 1.5,
	crestX: -80,
	crestZ: -120,
	angle: 45,
	passX: 80,
	passHalfWidth: 25,
	passDepth: 12,
	takeOffX: -50,
	flatWidth: 20,
	lagoonDepth: 2.5,
	inlandSlope: 1 / 9.64
};
/** Where the Reef's crest line (the top of its ledge) crosses along-shore position x. */
function reefCrestZ(x) {
	return REEF.crestZ + (x - REEF.crestX) * Math.tan(REEF.angle * Math.PI / 180);
}
/** Distance seaward of the Reef's crest line, m, measured across it (negative shoreward of it). */
function reefSeaward(x, z) {
	return (reefCrestZ(x) - z) * Math.cos(REEF.angle * Math.PI / 180);
}
/**
* Padang Padang (the Padang Padang spec): a left over a coral reef on the west coast of Bali's Bukit, built from Mead's
* components for it (ramp, focus, wedge, pinnacle; no platform: Mead 2000, table 4.1), as Mead & Black's idealised
* Bingin beds (1999; Mead 2000, ch. 5). The swell arrives square to the tank in water `deep` deep (the tank's edge,
* where its linear sea is near-linear; the Bukit's terrace has already wrapped it), climbs a shore-parallel forereef
* at `foreSlope` to a knee `kneeDepth` deep, then Mead's ramp at `rampSlope`, level along shore. From the ramp rises
* the wedge to a reef flat `crestDepth` deep that nearly dries at the lowest spring tides. The wave climbs it at Mead &
* Black's orthogonal gradient along its own path, inferred from the measured vortex ratios of its tubes (about 1:19;
* Mead & Black 2001), so `wedgeSlope`, measured across the crest line, is steeper by the path's angle to it (the
* owner's decision, 2026-09-29: docs/research/water-physics/basilisk-profiles.md). The wedge's top
* edge (the crest line) runs at `angle` degrees to the ramp's contours from the peak (x = peakX, where the wedge's base
* is `baseDepth` deep), so each wave breaks there first and peels toward +x (a left) at the celerity over the wedge's
* base over the sine of that angle (phase matching). A spur on the swell's line through the peak (Mead's focus) draws
* the waves' energy onto it, so it breaks first. Upcoast of the peak the wedge fades out over `endWidth` m, so the
* bed is the bare ramp, level along shore, at the window's −x open edge (an open edge copies its neighbours: a bed
* sloping across it ran the Reef's Big swell to NaN); a channel runs along the +x open edge, level across its axis,
* where the left ends, `kneeDepth` deep shoreward of `channelFrom`. A planar beach face caps it all. The window is
* `alongShore` m wide, so the peak stands clear of the −x side feed. Sources and provisional values: docs/research/padang-padang-sources.md.
* Mutable for the design sweep (`scripts/padangShape.ts`).
*/
const PADANG = {
	deep: 25,
	foreSlope: 1 / 20,
	foreRounding: 10,
	kneeDepth: 12,
	rampSlope: 1 / 80,
	/**
	* The wedge's slope across its crest line: 1:19 along the swell's path, which crosses the 40° line obliquely (1:14.6
	* as the swell arrives square, about 1:15.8 once refraction turns it toward the wedge's normal). At 1:19 across the line
	* the swell climbed 1:24.8: in Basilisk (level 11) the peak's face went vertical 16 m before the flat and threw a tube
	* of 0.125 H²; at 1:19 along the path, 3.6 m before it, the lip landing on the flat and the tube 0.208 H², 1.7 × larger.
	*/
	wedgeSlope: 1 / 15,
	baseDepth: 7,
	crestDepth: 1.25,
	peakX: -60,
	peakZ: -170,
	angle: 40,
	endWidth: 20,
	alongShore: 320,
	channelX: 160,
	channelHalfWidth: 45,
	shoreSlope: .2,
	takeOffX: -50,
	/** How far the channel is deepened from the ramp toward the knee's depth: its crests ran ahead over it and tilted the reef's down-reef crests (the design sweep's). */
	channelDeepening: 1,
	/**
	* How far seaward the channel is deepened, z (−Infinity: from the knee). Held at the knee's depth all the way out, its
	* crests ran ahead and tilted the down-reef crests about 11° before the wedge (the advisor, 2026-09-29), a peel of
	* 15.9 m/s against 10.7 without it. Deepened only shoreward of where the ramp is about 5 m deep (the wedge base's depth
	* at the ride's end), the crests offshore of it cross the bare ramp as they do along the reef: 22 clean waves at 11.3
	* m/s, the two halves of each alike (docs/research/padang-padang-report.md). The line is the sweep's, provisional.
	*/
	channelFrom: -138,
	/**
	* Mead's focus: a spur along the incoming swell through the peak, `focusRelief` m above the bed where it meets the
	* wedge's base, tapering (cos²) to nothing `focusLength` m seaward and `focusInset` m up the wedge, `focusHalfWidth` m
	* to either side of the peak. The advisor's ruling (2026-09-29, from Mead 2000, figs 5.1–5.2): about a wavelength
	* across (a narrower shoal diffracts rather than focuses), its crest deepening seaward at 1:20–1:40 inside Mead's
	* focus gradients (1:10–1:80). All provisional.
	*/
	focusRelief: 2,
	focusLength: 150,
	focusInset: 80,
	focusHalfWidth: 70
};
/** Where Padang Padang's wedge rises from the ramp at its peak: `baseDepth` deep, (baseDepth − crestDepth) / wedgeSlope across the crest line. */
function padangBaseZ() {
	const { peakZ, baseDepth, crestDepth, wedgeSlope, angle } = PADANG;
	return peakZ - (baseDepth - crestDepth) / wedgeSlope / Math.cos(angle * Math.PI / 180);
}
/** Where Padang Padang's forereef meets its ramp (the knee's centre): the ramp climbs from kneeDepth there to baseDepth at the peak's base. */
function padangKneeZ() {
	return padangBaseZ() - (PADANG.kneeDepth - PADANG.baseDepth) / PADANG.rampSlope;
}
/** Where Padang Padang's forereef rises from deep water (its foot's centre). */
function padangForeFootZ() {
	return padangKneeZ() - (PADANG.deep - PADANG.kneeDepth) / PADANG.foreSlope;
}
/** Where Padang Padang's crest line (the top of its wedge) crosses along-shore position x. */
function padangCrestZ(x) {
	return PADANG.peakZ + (x - PADANG.peakX) * Math.tan(PADANG.angle * Math.PI / 180);
}
/** Distance seaward of Padang Padang's crest line, m, measured across it (negative shoreward of it). */
function padangSeaward(x, z) {
	return (padangCrestZ(x) - z) * Math.cos(PADANG.angle * Math.PI / 180);
}
/** max(0, d), rounded quadratically (C¹) over ±r: a ramp's knee without a slope break. */
function rounded(d, r) {
	if (d <= -r) return 0;
	if (d >= r) return d;
	return (d + r) * (d + r) / (4 * r);
}
/**
* A canyon cut through the shelf. It bends the swell off its axis, leaving a
* shadow over it, and gathers it on its flank: 60–130 m from the axis at the
* break line, by the swell's direction and period. The axis runs along the
* window's open edge (x = 80, half the 160 m window), so the window holds the
* focusing flank and the bed is level across the boundary. On the centreline
* the focus fell on the open edges and the break line was all shadow; with a
* canyon wall crossing an edge, the edge cells ran unstable until the
* dispersive terms carried the surface's curvature across open edges.
*/
const CANYON = {
	axisX: 80,
	halfWidth: 30,
	depth: 14,
	head: 60,
	fullAt: 160,
	fadeStart: 200,
	fadeEnd: 250
};
function beach(seed) {
	const random = seededRandom(seed, 780996);
	const rips = [];
	for (let k = -8; k <= 8; k += 1) rips.push(k * BEACH_BAR.ripSpacing + (random() * 2 - 1) * BEACH_BAR.ripJitter);
	return {
		name: "beach",
		depthAt(x, z) {
			const offshore = -z;
			let gap = 0;
			for (const rip of rips) gap = Math.max(gap, Math.exp(-(((x - rip) / BEACH_BAR.ripWidth) ** 2)));
			const bar = BEACH_BAR.height * Math.exp(-(((offshore - BEACH_BAR.offshore) / BEACH_BAR.width) ** 2)) * (1 - gap);
			const outerBar = BEACH_OUTER.barHeight * Math.exp(-(((offshore - BEACH_OUTER.barOffshore) / BEACH_OUTER.barWidth) ** 2));
			return deanDepth(offshore, .12, BEACH_OUTER.maxDepth) - bar - outerBar;
		}
	};
}
function point() {
	const { center, halfWidth, protrusion, slope, maxDepth } = POINT_HEADLAND;
	return {
		name: "point",
		depthAt(x, z) {
			const offshore = -protrusion * smoothstep(center + halfWidth, center - halfWidth, x) - z;
			if (offshore <= 0) return offshore * .06;
			const shelf = maxDepth / slope;
			return offshore <= shelf ? slope * offshore : Math.min(POINT_OUTER.maxDepth, maxDepth + POINT_OUTER.slope * (offshore - shelf));
		}
	};
}
/** The Reef's bed in its parts: the pass's weight, the reef's own depth, how far inside its crest, and the shore's. */
function reefTerms(x, z) {
	const r = REEF;
	const fore = z >= r.shelfEdge ? r.shelfDepth : Math.min(r.deep, r.shelfDepth + (r.shelfEdge - z) * r.foreSlope);
	const seaward = reefSeaward(x, z);
	const ledge = r.crestDepth + Math.max(0, seaward) * r.ledgeSlope;
	const inside = Math.max(0, -seaward);
	const lagoon = Math.min(r.lagoonDepth, r.crestDepth + Math.max(0, inside - r.flatWidth) * r.ledgeSlope);
	const onReef = z >= r.shelfEdge ? Math.min(r.shelfDepth, seaward >= 0 ? ledge : lagoon) : fore;
	return {
		pass: Math.exp(-(((x - r.passX) / r.passHalfWidth) ** 2)),
		onReef,
		fore,
		inside,
		beachFace: z >= 0 ? -z * .06 : z >= r.shelfEdge ? -z * r.inlandSlope : Infinity
	};
}
function reef() {
	return {
		name: "reef",
		depthAt(x, z) {
			const { pass, onReef, fore, beachFace } = reefTerms(x, z);
			const depth = onReef + (Math.max(fore, REEF.passDepth) - onReef) * pass;
			return Math.min(depth, beachFace);
		},
		materialAt(x, z) {
			const r = REEF;
			const { pass, onReef, inside, beachFace } = reefTerms(x, z);
			const reefWall = r.flatWidth + (r.lagoonDepth - r.crestDepth) / r.ledgeSlope;
			return pass < .5 && onReef < beachFace && inside < reefWall ? "reef" : "sand";
		}
	};
}
/** cos²(π/2 · d/reach) inside ±reach, 0 beyond: a bump's profile, C¹ at its centre and its edge. */
function bump(d, reach) {
	return Math.abs(d) >= reach ? 0 : Math.cos(Math.PI / 2 * (d / reach)) ** 2;
}
/** Padang Padang's focus, 0–1: 1 on the swell's line through the peak where it crosses the wedge's base. */
function padangFocusShape(x, z) {
	const p = PADANG;
	const seaward = padangBaseZ() - z;
	return bump(x - p.peakX, p.focusHalfWidth) * bump(seaward, seaward >= 0 ? p.focusLength : p.focusInset);
}
/** Padang Padang's bed in its parts: the channel's weight, the depth beneath the beach face, and the beach face's. */
function padangTerms(x, z) {
	const p = PADANG;
	const knee = padangKneeZ();
	const r = p.foreRounding;
	const fore = p.kneeDepth + (rounded(knee - z, r) - rounded(padangForeFootZ() - z, r)) * p.foreSlope;
	const ramp = fore - rounded(z - knee, r) * p.rampSlope;
	const wedge = p.crestDepth + Math.max(0, padangSeaward(x, z)) * p.wedgeSlope;
	const reef = ramp - Math.max(0, ramp - wedge) * smoothstep(p.peakX - p.endWidth, p.peakX, x) - p.focusRelief * padangFocusShape(x, z);
	const channel = Math.exp(-(((x - p.channelX) / p.channelHalfWidth) ** 2));
	const inshore = p.channelFrom === -Infinity ? 1 : smoothstep(p.channelFrom - 2 * r, p.channelFrom + 2 * r, z);
	return {
		channel,
		depth: reef + (ramp + (fore - ramp) * p.channelDeepening * inshore - reef) * channel,
		beachFace: z < 0 ? -z * p.shoreSlope : -z * .06
	};
}
function padang() {
	return {
		name: "padang",
		depthAt(x, z) {
			const { depth, beachFace } = padangTerms(x, z);
			return Math.min(depth, beachFace);
		},
		materialAt(x, z) {
			const { channel, depth, beachFace } = padangTerms(x, z);
			return channel < .5 && depth < beachFace ? "reef" : "sand";
		}
	};
}
function canyon() {
	return {
		name: "canyon",
		depthAt(x, z) {
			const offshore = -z;
			const along = smoothstep(CANYON.head, CANYON.fullAt, offshore) * (1 - smoothstep(CANYON.fadeStart, CANYON.fadeEnd, offshore));
			return deanDepth(offshore) + CANYON.depth * Math.exp(-(((x - CANYON.axisX) / CANYON.halfWidth) ** 2)) * along;
		}
	};
}
function createSpot(name, seed) {
	switch (name) {
		case "beach": return beach(seed);
		case "point": return point();
		case "reef": return reef();
		case "canyon": return canyon();
		case "padang": return padang();
		case "pool": return poolSpot();
	}
}
//#endregion
//#region src/wave/ShallowWaterSolver.ts
/**
* Cross-shore edges from `offshore` to `shore`: uniform cells of about `fine`
* shoreward of `fineFrom`, growing by at most `growth` per cell to `coarse`
* toward `offshore`. The offshore cells are scaled together to fit exactly.
*/
function stretchedEdges(offshore, shore, fineFrom, fine, coarse, growth = 1.08) {
	const fineCount = Math.max(1, Math.round((shore - fineFrom) / fine));
	const fineSpacing = (shore - fineFrom) / fineCount;
	const span = fineFrom - offshore;
	const spacings = [];
	let covered = 0;
	let spacing = fineSpacing;
	while (covered < span) {
		spacing = Math.min(coarse, spacing * growth);
		spacings.push(spacing);
		covered += spacing;
	}
	const scale = spacings.length > 0 ? span / covered : 1;
	const edges = new Float64Array(spacings.length + fineCount + 1);
	edges[0] = offshore;
	let z = offshore;
	for (let k = spacings.length - 1; k >= 0; k -= 1) {
		z += spacings[k] * scale;
		edges[spacings.length - k] = z;
	}
	edges[spacings.length] = fineFrom;
	for (let k = 1; k <= fineCount; k += 1) edges[spacings.length + k] = fineFrom + k * fineSpacing;
	edges[edges.length - 1] = shore;
	return edges;
}
//#endregion
//#region src/wave/SwellReadout.ts
/** McCowan depth-limited breaker index H_b/h_b; Sandwell's d_b = 1.28 H_b is 1/0.78. */
const BREAKER_INDEX = .78;
//#endregion
//#region src/wave/surfForecast.ts
/** H1/10 over H1/3 in a Rayleigh sea (docs/research/surf-size-sources.md). */
const SETS_OVER_TYPICAL = 1.27;
/** Komar & Gaughan's breaker height from a deep-water height and period, m: H_b = 0.39 g^0.2 (T H0²)^0.4. */
function komarGaughan(significantHeight, period) {
	return .39 * GRAVITY ** .2 * (period * significantHeight ** 2) ** .4;
}
//#endregion
//#region src/wave/FoamField.ts
/** A modest surf bore: 0.25 m running onto 1 m of still water. */
const REFERENCE_BORE = {
	stillDepth: 1,
	depth: 1.25
};
/**
* Energy a bore dissipates per unit crest length, divided by ρ, m³/s³: g q ΔH,
* with the hydraulic-jump head loss ΔH = (h₂ − h₁)³/(4 h₁ h₂), the bore speed
* c = √(g h₂ (h₁ + h₂)/(2 h₁)) and the discharge through it q = c h₁ (e.g. Chow 1959).
* The still depth ahead is h₁ and the local depth behind the front h₂.
*/
function boreDissipation(stillDepth, depth) {
	if (!(stillDepth > 0) || !(depth > stillDepth)) return 0;
	const headLoss = (depth - stillDepth) ** 3 / (4 * stillDepth * depth);
	const speed = Math.sqrt(GRAVITY * depth * (stillDepth + depth) / (2 * stillDepth));
	return GRAVITY * speed * stillDepth * headLoss;
}
boreDissipation(REFERENCE_BORE.stillDepth, REFERENCE_BORE.depth);
2 * Math.sqrt(3) / 5;
//#endregion
//#region src/wave/barrel/sliceClock.ts
/**
* The slice clock's constants (the advisor, 2026-09-30):
* - `smoothing`, m: the onsets are smoothed along the front over a 2 m standard deviation, about a quarter of
*   Padang Padang's open curl (V_p ≈ 9–10 m/s over the 0.82–0.85 s open phase of round 6's run: 7–8 m);
* - `bunched`, m²: below this weighted variance of σ (two points under about 0.6 m apart; two a column apart are
*   0.25), a fit's slope is meaningless and the mean is used;
* - `earliest`, √(h0/g): the library's first frame before the face goes vertical (its runs output from 3 before),
*   the earliest a slice's clock reads. All provisional.
*/
const CLOCK = {
	smoothing: 2,
	bunched: .1,
	earliest: -3
};
/** Padang Padang's tables (round 6's transect: the 7 m foot, 1:19 along the path to the 1.25 m flat). */
const PADANG_ONSET = {
	h0: 7,
	band: [6, 5],
	join: [
		{
			period: 14,
			rows: [
				[1.2, 2.29],
				[1.75, 2.82],
				[2.29, 3.24],
				[2.74, 3.61],
				[3.15, 3.92]
			]
		},
		{
			period: 16,
			rows: [
				[1.19, 2.61],
				[1.6, 3.18],
				[1.84, 3.66],
				[2.21, 4.13],
				[2.68, 4.55]
			]
		},
		{
			period: 17,
			rows: [
				[1.29, 2.61],
				[1.74, 3.13],
				[2.16, 3.5],
				[2.51, 3.82],
				[2.82, 3.92]
			]
		},
		{
			period: 18,
			rows: [
				[1.29, 2.55],
				[1.82, 2.92],
				[2.37, 3.34],
				[2.86, 3.71],
				[3.3, 3.82]
			]
		}
	],
	throwDepth: {
		intercept: 1.56,
		slope: .56,
		heights: [.99, 2.5]
	}
};
CLOCK.smoothing * Math.sqrt(7);
//#endregion
//#region src/wave/barrel/barrelSpots.ts
/**
* How far over a reef's top its throw's floor sits, m: the pass's Gaussian tail lifts the flat's still depth by up to
* 0.4 mm across the window, so a floor at exactly the top's depth was never crossed there (a numerical margin, not a
* physical one; the advisor kept it, 2026-10-01).
*/
const FLOOR_MARGIN = .01;
/**
* Padang Padang's front rules (the advisor, 2026-10-01; the peak PR): as a crest's face steepens, its highest cell jumps
* forward, and the crest ahead started a track of its own, unsized, which never joined (163 jumps in 180 s of its Small
* sea, against 23 joins and 199 lost, with the rule off: as often as the Reef's). So a sized crest continues as the
* furthest crest within 10 m ahead of it in its column, as the Reef's does. Its join past the throw depth is the Reef's alone.
*/
const PADANG_FRONT = { jumpReach: 10 };
/**
* The Reef's transect (Part B, PR 7; the advisor's rulings, 2026-10-01): its 10 m shelf, the ledge at 1:4.2 along the
* swell's path (the slope the Teahupo'o Reef report measured along the path, and the advisor's periodic_reef42 run) to
* the 1.5 m reef crest. All provisional.
* - **The join:** the game's solver's fresh onset on that transect (the spotOnset probe, 2026-10-01: regular waves
*   driven in 10 m, each wave's highest over the band, the median still depth under its crest where Kennedy's fresh test
*   first fired, 12 waves a row). Drives that broke before the ledge, whose onsets outnumbered their waves by more than
*   two (the 5.5 m drive at every period, the 4.5 m at 15 s), are left out: big Reef sets breaking before the ledge sit
*   outside the ledge's library, a Reef behaviour question for the Reef session. At 16–17 s the 3.5 m drive first breaks
*   at 2.0 m, against 4.9–5.6 m at 14–15 s: longer periods shoal longer before breaking.
* - **The band:** Padang Padang's 6–5 m at 7 m, scaled to the 10 m foot (the probe read the same band).
* - **The throw:** the line through the two runs, foot crest against the still depth where the face goes vertical
*   (`plunge_measure.py`): reef42's 2.127 m crest at 1.928 m, at the top's edge, and reef42_a35's 3.503 m at 5.159 m,
*   15 m seaward of the top on the ledge's face, H/d ≈ 0.95 at the vertical in both. So d = 2.35 η − 3.07 (the advisor,
*   2026-10-01; provisional: a third case near A0 0.28 would test whether it is linear). Through the origin it would
*   throw reef42's own wave 0.9 m too deep. Bigger waves break deeper: a 4 m crest throws about 6.3 m down the face.
* - **The floor:** no shallower than the reef's top at the tide, which the line meets at η ≈ 1.95 m. It stands for crests
*   the solver breaks near the edge (the advisor, refined after the front's check): the smallest waves cross the edge
*   unbroken (H/h ≈ 0.4 there) and break depth-limited where the inner flat shoals to about 0.73 m, which the ledge's
*   cases would draw wrongly, so the front's join reach (1.5 H past the throw depth) lets them go as the solver's bores.
* - **Its cases:** reef42 (A0 0.21) alone. reef60 (1:6) waits for per-slice slopes. reef42_a35 (A0 0.35) sets the throw
*   line but is out of the index: its lip landmark flickers between the curl's top and the jet's tip, so even the
*   advisor's robust trace leaves 13 of its 77 open frames flagged and its tip fit up to 6 √(g h0) (the bar: about 90 %
*   clean, at most about 1.5). The small case (A0 ≈ 0.09, over the inner flat) is owed at level 13.
*/
const REEF_THROW_SLOPE = 3.231 / (3.503 - 2.127);
/**
* Every spot's barrel transect, where its cases are in the library. Padang Padang's is round 6's (the owner's 1:19 along
* the path from the wedge's 7 m foot, read live for the design sweep); the Reef's, its shelf's 10 m and the ledge along
* the swell's path. The Reef's fine zone starts at the shelf's edge, so its front follows crests from there.
*
* The Reef's front (the advisor's rulings, 2026-10-01; provisional): its crests' highest cells jump forward to the
* ledge's edge as their faces steepen, so a sized crest follows the furthest crest within 10 m ahead (the advisor's
* 1.5 H would catch none of the jumps measured); and its small waves break only as they cross onto the top, so a crest
* may join up to 1.5 of its wave heights past its throw depth.
*/
const BARREL_SPOTS = {
	padang: {
		slope: 1 / 19,
		get footDepth() {
			return PADANG.baseDepth;
		},
		onset: PADANG_ONSET,
		frontFrom: "zone",
		front: PADANG_FRONT
	},
	point: {
		slope: .0465116,
		footDepth: 7,
		onset: {
			h0: 7,
			band: [6, 5],
			join: [
				{
					period: 9,
					rows: [
						[.62, 1.58],
						[1.01, 2.14],
						[1.37, 2.65],
						[1.73, 3.16],
						[1.99, 3.67]
					]
				},
				{
					period: 11,
					rows: [
						[.6, 1.72],
						[.91, 2.33],
						[1.19, 2.88],
						[1.33, 3.44],
						[1.68, 4.05]
					]
				},
				{
					period: 12,
					rows: [
						[.69, 1.67],
						[1.08, 2.19],
						[1.4, 2.7],
						[1.75, 3.12],
						[2.12, 3.49]
					]
				},
				{
					period: 14,
					rows: [
						[.77, 1.67],
						[1.22, 2.14],
						[1.78, 2.6],
						[2.4, 3.12],
						[2.88, 3.49]
					]
				}
			],
			throwDepth: {
				intercept: 1.551,
				slope: .946,
				heights: [.558, 2.099]
			}
		},
		frontFrom: "zone"
	},
	reef: {
		slope: .238095,
		get footDepth() {
			return REEF.shelfDepth;
		},
		onset: {
			h0: 10,
			band: [60 / 7, 50 / 7],
			join: [
				{
					period: 14,
					rows: [
						[.9, 3.69],
						[1.67, 4.17],
						[2.41, 4.88],
						[3.14, 5.83]
					]
				},
				{
					period: 15,
					rows: [
						[.89, 4.17],
						[1.63, 5.12],
						[2.26, 5.6]
					]
				},
				{
					period: 16,
					rows: [
						[.9, 4.17],
						[1.68, 5.12],
						[2.27, 2.02],
						[2.83, 2.98]
					]
				},
				{
					period: 17,
					rows: [
						[.89, 4.17],
						[1.72, 5.36],
						[2.46, 2.02],
						[2.92, 3.21]
					]
				}
			],
			throwDepth: {
				intercept: 1.928 - 2.127 * REEF_THROW_SLOPE,
				slope: REEF_THROW_SLOPE,
				heights: [0, Infinity]
			},
			get floor() {
				return REEF.crestDepth + FLOOR_MARGIN;
			}
		},
		frontFrom: "fine",
		front: {
			jumpReach: 10,
			joinPast: 1.5
		}
	}
};
//#endregion
//#region src/wave/barrel/sweptLoft.ts
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
const LOFT = {
	spacing: .5,
	fine: .25,
	frames: 3,
	budget: 4e4,
	pinned: 6,
	extension: 1.5,
	extensionSamples: 3,
	band: 1,
	endBlend: 2.5
};
/** Vertices per slice: the profile and its extensions over the water at each end. */
const LOFT_SAMPLES = 128 + 2 * LOFT.extensionSamples;
Object.fromEntries(Object.entries(BARREL_SPOTS).flatMap(([spot, barrel]) => barrel ? [[spot, barrel.slope]] : []));
Math.floor(LOFT.budget / LOFT_SAMPLES);
const E = LOFT.extensionSamples;
LOFT.extension / E;
/** The window's along-shore width, m: the config's, else Padang Padang's own (its peak clear of the side feed), else ALONG_SHORE. */
function alongShoreOf(config) {
	return config.alongShore ?? (config.spot === "padang" ? PADANG.alongShore : config.spot === "pool" ? POOL.alongShore : 160);
}
/** Wave-tank layout across shore, m (z increases toward the beach). */
const TANK = {
	offshore: -330,
	zoneInner: -270,
	blendEnd: -190,
	fineFrom: -150,
	shore: 30
};
/** Flat tank bed offshore of each spot's blend, m below datum: Padang Padang's is the deep water beyond its forereef, read live for the sweep. */
const OFFSHORE_DEPTH = {
	beach: 5,
	point: 8,
	reef: REEF.deep,
	canyon: 5,
	get padang() {
		return PADANG.deep;
	},
	get pool() {
		return POOL.feedDepth;
	}
};
/** A big day's edge is this many buoy heights deep, so the zone's linear sea stays near linear (the wave-sizes spec). */
const EDGE_DEPTH_PER_HS = 3.3;
/** …and at most this share of the deep-water wavelength, keeping kh ≤ 2.5 where the solver's dispersion holds. */
const EDGE_DEPTH_MAX_WAVELENGTHS = .4;
/** A deeper tank's relaxation zone is at least this share of the edge wavelength long. */
const ZONE_WAVELENGTHS = .75;
/** The furthest a tank reaches offshore, m. */
const TANK_REACH = -3e3;
/** A bed that gets no more than FLAT_RISE deeper anywhere within FLAT_REACH seaward has levelled off, m: the edge stops there. */
const FLAT_REACH = 300;
const FLAT_RISE = .1;
/**
* The tank for a swell (the wave-sizes spec): today's for small days, Practice and the Canyon; for a big day,
* its edge where the take-off transect's bed first reaches the edge depth (or levels off short of it), and far
* enough out that the blend onto the spot's bed lies 20 m seaward of the fine zone, which starts 40 m seaward
* of where the sets break (Komar–Gaughan's H1/10 over the breaker index). The relaxation zone is at least 60 m
* and 0.75 of the edge wavelength long; the edge takes the bed's depth there, within the kh limit.
*/
function tankLayout(config) {
	const today = {
		...TANK,
		edgeDepth: OFFSHORE_DEPTH[config.spot]
	};
	if (config.spot === "canyon") return today;
	if (config.spot === "pool") return {
		...poolTankLayout(TANK.shore),
		edgeDepth: today.edgeDepth
	};
	if (config.spot === "reef") {
		const zone = Math.max(TANK.zoneInner - TANK.offshore, ZONE_WAVELENGTHS * waveKinematics(config.peakPeriod, today.edgeDepth).wavelength);
		return {
			...today,
			offshore: TANK.zoneInner - zone
		};
	}
	if (config.spot === "padang") {
		const spot = createSpot("padang", config.seed);
		const sets = Math.min(.9 * (today.edgeDepth + config.tide), SETS_OVER_TYPICAL * komarGaughan(config.significantHeight, config.peakPeriod) / BREAKER_INDEX);
		const reach = alongShoreOf(config) / 2;
		let setBreak = TANK.fineFrom + 40;
		for (let x = -reach; x <= reach; x += 5) {
			let z = TANK.shore;
			while (z > TANK_REACH && spot.depthAt(x, z) + config.tide < sets) z -= 1;
			setBreak = Math.min(setBreak, z);
		}
		const fineFrom = Math.min(TANK.fineFrom, setBreak - 40);
		const blend = TANK.blendEnd - TANK.zoneInner;
		const foreFoot = padangForeFootZ() - PADANG.foreRounding;
		const zoneInner = Math.min(fineFrom - 20 - blend, foreFoot - blend);
		return {
			offshore: zoneInner - Math.max(TANK.zoneInner - TANK.offshore, ZONE_WAVELENGTHS * waveKinematics(config.peakPeriod, today.edgeDepth).wavelength),
			zoneInner,
			blendEnd: zoneInner + blend,
			fineFrom,
			shore: TANK.shore,
			edgeDepth: today.edgeDepth
		};
	}
	const deepWavelength = GRAVITY * config.peakPeriod ** 2 / (2 * Math.PI);
	const wanted = Math.max(today.edgeDepth, Math.min(EDGE_DEPTH_PER_HS * config.significantHeight, EDGE_DEPTH_MAX_WAVELENGTHS * deepWavelength));
	if (wanted <= today.edgeDepth) return today;
	const spot = createSpot(config.spot, config.seed);
	const depth = (z) => spot.depthAt(0, z);
	const deepens = (z) => {
		for (let ahead = 10; ahead <= FLAT_REACH; ahead += 10) if (depth(z - ahead) - depth(z) >= FLAT_RISE) return true;
		return false;
	};
	let reached = TANK.zoneInner;
	while (depth(reached) < wanted && reached > TANK_REACH && deepens(reached)) reached -= 1;
	if (Math.min(wanted, depth(reached)) <= today.edgeDepth) return today;
	const setDepth = SETS_OVER_TYPICAL * komarGaughan(config.significantHeight, config.peakPeriod) / BREAKER_INDEX;
	let setBreak = reached;
	while (depth(setBreak) > setDepth && setBreak < TANK.fineFrom) setBreak += 1;
	const fineFrom = Math.min(TANK.fineFrom, setBreak - 40);
	const blend = TANK.blendEnd - TANK.zoneInner;
	const zoneInner = Math.min(reached, fineFrom - 20 - blend);
	const edgeDepth = Math.min(depth(zoneInner), EDGE_DEPTH_MAX_WAVELENGTHS * deepWavelength);
	return {
		offshore: zoneInner - Math.max(TANK.zoneInner - TANK.offshore, ZONE_WAVELENGTHS * waveKinematics(config.peakPeriod, edgeDepth).wavelength),
		zoneInner,
		blendEnd: zoneInner + blend,
		fineFrom,
		shore: TANK.shore,
		edgeDepth
	};
}
process.env.CHROME;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const KEYS = {
	Space: {
		key: " ",
		keyCode: 32
	},
	Enter: {
		key: "Enter",
		keyCode: 13
	},
	Escape: {
		key: "Escape",
		keyCode: 27
	},
	ArrowLeft: {
		key: "ArrowLeft",
		keyCode: 37
	},
	ArrowUp: {
		key: "ArrowUp",
		keyCode: 38
	},
	ArrowRight: {
		key: "ArrowRight",
		keyCode: 39
	},
	ArrowDown: {
		key: "ArrowDown",
		keyCode: 40
	},
	KeyR: {
		key: "r",
		keyCode: 82
	},
	KeyC: {
		key: "c",
		keyCode: 67
	},
	KeyM: {
		key: "m",
		keyCode: 77
	},
	KeyA: {
		key: "a",
		keyCode: 65
	},
	KeyD: {
		key: "d",
		keyCode: 68
	},
	KeyW: {
		key: "w",
		keyCode: 87
	},
	KeyS: {
		key: "s",
		keyCode: 83
	}
};
var Page = class Page {
	static async connect(url) {
		const socket = new WebSocket(url);
		await new Promise((resolve, reject) => {
			socket.addEventListener("open", resolve, { once: true });
			socket.addEventListener("error", reject, { once: true });
		});
		return new Page(socket);
	}
	constructor(socket) {
		this.socket = socket;
		this.id = 0;
		this.pending = /* @__PURE__ */ new Map();
		this.listeners = /* @__PURE__ */ new Map();
		socket.addEventListener("message", (event) => {
			const message = JSON.parse(event.data);
			if (message.id !== void 0) {
				const waiter = this.pending.get(message.id);
				this.pending.delete(message.id);
				if (message.error) waiter?.reject(/* @__PURE__ */ new Error(`${message.error.message} (${waiter.method})`));
				else waiter?.resolve(message.result);
			} else for (const listener of this.listeners.get(message.method) ?? []) listener(message.params);
		});
	}
	send(method, params = {}) {
		const id = ++this.id;
		this.socket.send(JSON.stringify({
			id,
			method,
			params
		}));
		return new Promise((resolve, reject) => this.pending.set(id, {
			resolve,
			reject,
			method
		}));
	}
	on(method, listener) {
		const list = this.listeners.get(method) ?? [];
		list.push(listener);
		this.listeners.set(method, list);
	}
	/** Evaluate `expression` in the page (awaiting promises); `gesture` counts it as a user action. */
	async eval(expression, gesture = false) {
		const { result, exceptionDetails } = await this.send("Runtime.evaluate", {
			expression,
			awaitPromise: true,
			returnByValue: true,
			userGesture: gesture
		});
		if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
		return result.value;
	}
	/** Size the window so the page's viewport is exactly width × height CSS pixels. */
	async fitViewport(width, height) {
		const { windowId } = await this.send("Browser.getWindowForTarget");
		for (let pass = 0; pass < 3; pass += 1) {
			const inner = await this.eval("({ w: innerWidth, h: innerHeight })");
			if (inner.w === width && inner.h === height) return;
			const { bounds } = await this.send("Browser.getWindowBounds", { windowId });
			await this.send("Browser.setWindowBounds", {
				windowId,
				bounds: {
					width: bounds.width + width - inner.w,
					height: bounds.height + height - inner.h
				}
			});
			await sleep(300);
		}
	}
	async waitFor(expression, timeoutMs = 3e4, everyMs = 100) {
		const started = Date.now();
		for (;;) {
			const value = await this.eval(expression).catch(() => void 0);
			if (value) return value;
			if (Date.now() - started > timeoutMs) throw new Error(`timed out waiting for ${expression}`);
			await sleep(everyMs);
		}
	}
	/** Click the centre of the first element matching `selector` whose text includes `text`, as a real mouse click. */
	async click(selector, text = "") {
		const box = await this.waitFor(`(() => {
      const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((node) => node.textContent.includes(${JSON.stringify(text)}) && node.getClientRects().length);
      if (!el) return null;
      el.scrollIntoView({ block: 'nearest' });
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`, 15e3);
		await this.send("Input.dispatchMouseEvent", {
			type: "mouseMoved",
			x: box.x,
			y: box.y
		});
		await sleep(60);
		await this.send("Input.dispatchMouseEvent", {
			type: "mousePressed",
			x: box.x,
			y: box.y,
			button: "left",
			clickCount: 1
		});
		await sleep(40);
		await this.send("Input.dispatchMouseEvent", {
			type: "mouseReleased",
			x: box.x,
			y: box.y,
			button: "left",
			clickCount: 1
		});
	}
	async keyDown(code) {
		const { key, keyCode } = KEYS[code];
		await this.send("Input.dispatchKeyEvent", {
			type: "rawKeyDown",
			code,
			key,
			windowsVirtualKeyCode: keyCode,
			nativeVirtualKeyCode: keyCode
		});
	}
	async keyUp(code) {
		const { key, keyCode } = KEYS[code];
		await this.send("Input.dispatchKeyEvent", {
			type: "keyUp",
			code,
			key,
			windowsVirtualKeyCode: keyCode,
			nativeVirtualKeyCode: keyCode
		});
	}
	async press(code, holdMs = 80) {
		await this.keyDown(code);
		await sleep(holdMs);
		await this.keyUp(code);
	}
};
//#endregion
//#region ../../../../../private/tmp/gpu-dx24-quality-adapter/owned-cdp.mjs
async function launch({ url, width, height, port, args = [] }) {
	let occupied = false;
	try {
		occupied = (await fetch("http://127.0.0.1:" + port + "/json/version")).ok;
	} catch {}
	if (occupied) throw Error("Owned CDP port already occupied");
	const profile = mkdtempSync(join(tmpdir(), "breakline-dx24-quality-"));
	let chrome, page, closed = false;
	const close = async () => {
		if (closed) return;
		closed = true;
		try {
			page?.socket?.close();
			chrome?.kill();
			await sleep(500);
		} finally {
			rmSync(profile, {
				recursive: true,
				force: true
			});
		}
	};
	try {
		chrome = spawn(process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
			"--remote-debugging-port=" + port,
			"--user-data-dir=" + profile,
			"--no-first-run",
			"--no-default-browser-check",
			"--disable-extensions",
			"--disable-backgrounding-occluded-windows",
			"--disable-renderer-backgrounding",
			"--disable-background-timer-throttling",
			"--autoplay-policy=no-user-gesture-required",
			"--window-size=" + width + "," + (height + 40),
			"--window-position=60,60",
			"--app=" + url,
			...args
		], { stdio: "ignore" });
		let launchError;
		chrome.once("error", (error) => {
			launchError = error;
		});
		let target;
		for (let n = 0; n < 100 && !target; n++) {
			await sleep(150);
			if (launchError) throw launchError;
			try {
				target = (await (await fetch("http://127.0.0.1:" + port + "/json/list")).json()).find((t) => t.type === "page" && t.url.startsWith(url.split("?")[0]));
			} catch {}
		}
		if (!target) throw Error("Owned quality Chrome did not open target");
		page = await Page.connect(target.webSocketDebuggerUrl);
		page.close = close;
		await page.send("Page.enable");
		await page.send("Runtime.enable");
		await page.send("Emulation.setFocusEmulationEnabled", { enabled: true });
		await page.fitViewport(width, height);
		return page;
	} catch (error) {
		await close();
		throw error;
	}
}
//#endregion
//#region ../../../../../private/tmp/gpu-dx24-quality-adapter/derived.ts
/**
* Actual worker/GPU dx=2 versus dx=4 quality screen; no FPS claim.
* ./node_modules/.bin/rolldown scripts/browser/gpu-resolution-fidelity.ts -o /private/tmp/gpu-resolution-fidelity.mjs --format esm --platform node
* node /private/tmp/gpu-resolution-fidelity.mjs --url=http://localhost:4188/ --dir=/private/tmp/frozen-dist --out=/private/tmp/padang-dx-quality
* --plan=true validates the probe/grids and injected JavaScript without launching Chrome.
* Run sequentially while other GPU benchmarks are idle. Fixed 1/60 s steps; renderSpacing=1 in both runs.
*/
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
	const equal = arg.indexOf("=");
	if (!arg.startsWith("--") || equal < 0) throw new Error("Use --name=value arguments");
	return [arg.slice(2, equal), arg.slice(equal + 1)];
}));
const out = resolve(args.out ?? "/private/tmp/padang-dx-quality");
const checkpoints = (args.at ?? "5,15,30").split(",").map(Number);
if (!checkpoints.length || checkpoints.some((t, i) => !Number.isFinite(t) || t <= 0 || t > 60 || Math.abs(t * 60 - Math.round(t * 60)) > 1e-7 || i > 0 && t <= checkpoints[i - 1])) throw new Error("--at must be increasing positive times <=60 s on the 1/60 s clock");
const settings = {
	spot: "padang",
	stage: 2,
	compute: "auto",
	source: "buoy",
	significantHeight: 3.8,
	peakPeriod: 18,
	directionDegrees: 0,
	spread: 0,
	spreading: 150,
	tide: 0,
	windSpeed: 0,
	stormWindSpeed: 18,
	stormFetchKm: 600,
	stormDurationHours: 36,
	stormDistanceKm: 3e3
};
const shared = {
	seed: 8761,
	componentCount: 64,
	alongShore: 320,
	fineSpacing: 1,
	spinUpPeriods: Number(args.spinUp ?? 2),
	startSeaTime: Number(args.seaTime ?? 400)
};
if (!Number.isFinite(shared.spinUpPeriods) || shared.spinUpPeriods < 0 || !Number.isFinite(shared.startSeaTime)) throw new Error("Invalid warm clock");
const specs = [{
	label: "dx2",
	dx: 2,
	url: args.before ?? args.url ?? "http://localhost:4188/",
	directory: args.beforeDir ?? args.dir
}, {
	label: "dx4",
	dx: 4,
	url: args.after ?? args.url ?? "http://localhost:4188/",
	directory: args.afterDir ?? args.dir
}];
const urls = specs.map((spec) => {
	const url = new URL(spec.url);
	url.searchParams.set("diagnostics", "");
	url.searchParams.set("graphics", "high");
	url.searchParams.set("renderSpacing", "1");
	return url.href;
});
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
function installQualityHelpers() {
	const d = window.breaklineDiagnostics;
	if (!d) throw new Error("Missing diagnostics");
	const requireFinite = (value, context) => {
		if (!Number.isFinite(value)) throw new Error("Nonfinite " + context);
		return value;
	};
	const selectedStatus = () => {
		const host = d.mode.host, s = host.snapshot.status;
		if (s.compute !== "gpu") throw new Error("GPU quality run fell back to CPU");
		if (s.ride) throw new Error("Expected riderless Wave Lab, got a ride");
		for (const key of [
			"seaTime",
			"cells",
			"breakDepth",
			"breakingFraction",
			"lipLaunches",
			"lipVolume",
			"lipJets",
			"lipRollers",
			"lipAirborne",
			"spray",
			"onsetScale"
		]) requireFinite(s[key], "status." + key);
		return {
			seaTime: s.seaTime,
			cells: s.cells,
			compute: s.compute,
			breakPoint: s.breakPoint,
			breakDepth: s.breakDepth,
			breaker: s.breaker,
			breakingFraction: s.breakingFraction,
			peel: s.peel,
			lipLaunches: s.lipLaunches,
			lipVolume: s.lipVolume,
			lipJets: s.lipJets,
			lipRollers: s.lipRollers,
			lipAirborne: s.lipAirborne,
			spray: s.spray,
			onsetScale: s.onsetScale,
			contactBuildMs: requireFinite(s.pipelineMs?.contact, "contact build timing"),
			frontCount: host.snapshot.frontCount,
			bubbleCount: host.snapshot.bubbleCount,
			sprayCount: host.snapshot.sprayCount
		};
	};
	function cubic(data, grid, x, z) {
		const weights = (t) => {
			const t2 = t * t, t3 = t2 * t;
			return [
				(-t3 + 2 * t2 - t) / 2,
				(3 * t3 - 5 * t2 + 2) / 2,
				(-3 * t3 + 4 * t2 + t) / 2,
				(t3 - t2) / 2
			];
		};
		const slopes = (t) => {
			const t2 = t * t;
			return [
				(-3 * t2 + 4 * t - 1) / 2,
				(9 * t2 - 10 * t) / 2,
				(-9 * t2 + 8 * t + 1) / 2,
				(3 * t2 - 2 * t) / 2
			];
		};
		const gx = (x - grid.xMin) / grid.spacing, gz = (z - grid.zMin) / grid.spacing, ix = Math.floor(gx), iz = Math.floor(gz);
		const wx = weights(gx - ix), wz = weights(gz - iz), dx = slopes(gx - ix), dz = slopes(gz - iz);
		let height = 0, slopeX = 0, slopeZ = 0;
		for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) {
			const row = Math.max(0, Math.min(grid.nz - 1, iz + k - 1)), col = Math.max(0, Math.min(grid.nx - 1, ix + i - 1));
			const h = data[2 * (row * grid.nx + col)];
			height += wz[k] * wx[i] * h;
			slopeX += wz[k] * dx[i] * h;
			slopeZ += dz[k] * wx[i] * h;
		}
		return [
			requireFinite(height, "height sample"),
			requireFinite(slopeX / grid.spacing, "slope x"),
			requireFinite(slopeZ / grid.spacing, "slope z")
		];
	}
	function profiles(probe) {
		const host = d.mode.host, grid = host.init.grid, data = host.snapshot.surface;
		const x = [], z = [], height = [], slopeX = [], slopeZ = [], peaks = [];
		for (let i = 0; i < probe.transects; i++) x.push(probe.xMin + i * probe.xStep);
		for (let k = 0; k < probe.samples; k++) z.push(probe.zMin + k * probe.zStep);
		const right = grid.xMin + (grid.nx - 1) * grid.spacing, front = grid.zMin + (grid.nz - 1) * grid.spacing;
		if (x[0] < grid.xMin || x.at(-1) > right || z[0] < grid.zMin || z.at(-1) > front) throw new Error("Common probe extends beyond render grid");
		for (let i = 0; i < x.length; i++) {
			const candidates = [];
			for (let k = 0; k < z.length; k++) {
				const h = cubic(data, grid, x[i], z[k]);
				height.push(h[0]);
				slopeX.push(h[1]);
				slopeZ.push(h[2]);
			}
			for (let k = 1; k < z.length - 1; k++) {
				const n = i * z.length + k;
				if (height[n] > .2 && height[n] >= height[n - 1] && height[n] > height[n + 1]) candidates.push({
					x: x[i],
					z: z[k],
					height: height[n]
				});
			}
			candidates.sort((a, b) => b.height - a.height);
			const chosen = [];
			for (const p of candidates) if (chosen.every((old) => Math.abs(old.z - p.z) >= 20)) {
				chosen.push(p);
				if (chosen.length === 2) break;
			}
			peaks.push(chosen);
		}
		return {
			x,
			z,
			height,
			slopeX,
			slopeZ,
			peaks
		};
	}
	async function aggregate(geometry, focus, baselineTime) {
		const sea = await d.mode.host.exportState(), stream = new Blob([sea.bytes]).stream();
		const bytes = new Uint8Array(await new Response(sea.deflated ? stream.pipeThrough(new DecompressionStream("deflate")) : stream).arrayBuffer());
		const view = new DataView(bytes.buffer);
		if (bytes.length < 8 || view.getUint32(0, true) !== 1397052465) throw new Error("Not SET1");
		const length = view.getUint32(4, true), header = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + length)));
		const floats = new Float32Array(bytes.buffer, 8 + Math.ceil(length / 4) * 4), arrays = {};
		let offset = 0;
		for (const [name, count] of header.arrays) {
			if (offset + count > floats.length) throw new Error("Truncated " + name);
			arrays[name] = floats.subarray(offset, offset + count);
			offset += count;
		}
		const nx = header.nx, nz = header.nz, size = nx * nz;
		if (nz !== geometry.dz.length || nx !== geometry.nx) throw new Error("Export/grid geometry mismatch");
		requireFinite(header.solverTime, "solverTime");
		requireFinite(header.seaTimeOffset, "seaTimeOffset");
		const finiteFields = [
			"h",
			"qx",
			"qz",
			"foam.dense",
			"foam.residual",
			"aeration.air",
			"aeration.depth",
			"breakingStrength",
			"breakingAge",
			"plungeHold",
			"predictor.x",
			"predictor.z"
		];
		const finite = {};
		for (const name of finiteFields) {
			const values = arrays[name];
			if (!values || values.length !== size) throw new Error("Missing/wrong field " + name);
			let min = Infinity, max = -Infinity;
			for (let i = 0; i < values.length; i++) {
				const v = requireFinite(values[i], name + "[" + i + "]");
				min = Math.min(min, v);
				max = Math.max(max, v);
			}
			finite[name] = {
				count: values.length,
				min,
				max
			};
		}
		if (finite.h.min < 0) throw new Error("Negative water depth");
		const blank = () => ({
			wetAreaM2: 0,
			activeBreakingIndicatorAreaM2: 0,
			strengthWeightedAreaM2: 0,
			denseFoamAreaM2: 0,
			residualFoamAreaM2: 0,
			totalFoamAreaM2: 0,
			airVolumeM3: 0,
			plumeDepthAreaM3: 0,
			voidFractionAreaM2: 0
		});
		const domain = blank(), nearBreak = blank();
		const add = (dest, n, area) => {
			const h = arrays.h[n], b = arrays.breakingStrength[n];
			if (h > 1e-4) dest.wetAreaM2 += area;
			if (h > .01 && b > 0) dest.activeBreakingIndicatorAreaM2 += area;
			dest.strengthWeightedAreaM2 += b * area;
			dest.denseFoamAreaM2 += arrays["foam.dense"][n] * area;
			dest.residualFoamAreaM2 += arrays["foam.residual"][n] * area;
			dest.totalFoamAreaM2 += (arrays["foam.dense"][n] + arrays["foam.residual"][n]) * area;
			dest.airVolumeM3 += arrays["aeration.air"][n] * area;
			dest.plumeDepthAreaM3 += arrays["aeration.depth"][n] * area;
			dest.voidFractionAreaM2 += (arrays["aeration.depth"][n] > 0 ? Math.min(1, arrays["aeration.air"][n] / arrays["aeration.depth"][n]) : 0) * area;
		};
		const xMin = d.mode.host.init.windowXMin;
		for (let k = 0; k < nz; k++) {
			const area = geometry.dx * geometry.dz[k], z = geometry.z[k];
			for (let i = 0; i < nx; i++) {
				const n = k * nx + i, x = xMin + (i + .5) * geometry.dx;
				add(domain, n, area);
				if (Math.abs(x - focus.x) <= 40 && Math.abs(z - focus.z) <= 100) add(nearBreak, n, area);
			}
		}
		const onset = {
			newColumns: 0,
			newWidthM: 0,
			firstSolverTime: null,
			lastSolverTime: null
		};
		for (const [name, sentinel] of [
			["lastOnset", -Infinity],
			["lastThrow", -Infinity],
			["outerBreak", Infinity]
		]) {
			const values = arrays[name];
			if (!values || values.length !== nx) throw new Error("Missing history " + name);
			for (const value of values) {
				if (!Number.isFinite(value) && value !== sentinel) throw new Error("Invalid " + name + " history");
				if (name === "lastOnset" && Number.isFinite(value) && value > baselineTime + 1e-5) {
					onset.newColumns++;
					onset.firstSolverTime = onset.firstSolverTime === null ? value : Math.min(onset.firstSolverTime, value);
					onset.lastSolverTime = onset.lastSolverTime === null ? value : Math.max(onset.lastSolverTime, value);
				}
			}
		}
		onset.newWidthM = onset.newColumns * geometry.dx;
		const points = header.front?.points ?? [], groups = /* @__PURE__ */ new Map();
		let thrown = 0, newJoined = 0, newThrown = 0, firstNewJoined = null, firstNewThrown = null, activeJetClaimAreaM2 = 0;
		for (const p of points) {
			for (const key of [
				"x",
				"z",
				"sigma",
				"tau",
				"joined",
				"footHeight",
				"footDepth"
			]) requireFinite(p[key], "front." + key);
			const group = groups.get(p.front) ?? {
				points: 0,
				minSigma: Infinity,
				maxSigma: -Infinity
			};
			group.points++;
			group.minSigma = Math.min(group.minSigma, p.sigma);
			group.maxSigma = Math.max(group.maxSigma, p.sigma);
			groups.set(p.front, group);
			if (p.joined > baselineTime + 1e-7) {
				newJoined++;
				firstNewJoined = firstNewJoined === null ? p.joined : Math.min(firstNewJoined, p.joined);
			}
			if (p.thrown !== null) {
				requireFinite(p.thrown, "front.thrown");
				thrown++;
				if (p.thrown > baselineTime + 1e-7) {
					newThrown++;
					firstNewThrown = firstNewThrown === null ? p.thrown : Math.min(firstNewThrown, p.thrown);
				}
			}
			if (p.jetWindow !== void 0 && p.jetUntil !== void 0 && p.tau < p.jetUntil) {
				requireFinite(p.jetWindow, "front.jetWindow");
				activeJetClaimAreaM2 += 2 * p.jetWindow * geometry.dx;
			}
		}
		return {
			clock: {
				solverTime: header.solverTime,
				seaTimeOffset: header.seaTimeOffset,
				seaTime: header.solverTime + header.seaTimeOffset
			},
			finite,
			domain,
			nearBreak,
			onset,
			front: {
				points: points.length,
				fronts: groups.size,
				crestSpanM: [...groups.values()].reduce((sum, g) => sum + g.maxSigma - g.minSigma, 0),
				activeColumnWidthM: points.length * geometry.dx,
				thrownColumnWidthM: thrown * geometry.dx,
				activeJetClaimAreaM2,
				newJoinedPoints: newJoined,
				newThrownPoints: newThrown,
				firstNewJoinedSolverTime: firstNewJoined,
				firstNewThrownSolverTime: firstNewThrown
			},
			counters: header.counters
		};
	}
	function tubeGeometry() {
		const r = d.mode.barrelLoft;
		if (!r) return { present: false };
		const samples = r.sliceCount ? r.vertexCount / r.sliceCount : 0;
		if (r.sliceCount && (!Number.isInteger(samples) || samples < 1)) throw new Error("Invalid loft sample dimensions");
		const regions = {
			back: {
				tested: 0,
				reversed: 0
			},
			roof: {
				tested: 0,
				reversed: 0
			},
			underside: {
				tested: 0,
				reversed: 0
			},
			face: {
				tested: 0,
				reversed: 0
			},
			forwardRest: {
				tested: 0,
				reversed: 0
			}
		};
		let joins = 0, cuts = 0, endWeightMax = 0, maxRayTurnDegrees = 0, minY = Infinity, maxY = -Infinity;
		for (let i = 0; i < r.vertexCount * 3; i++) {
			const value = requireFinite(r.positions[i], "loft position");
			requireFinite(r.normals[i], "loft normal");
			if (i % 3 === 1) {
				minY = Math.min(minY, value);
				maxY = Math.max(maxY, value);
			}
		}
		for (let i = 0; i < r.vertexCount; i++) {
			requireFinite(r.lift[i], "loft lift");
			requireFinite(r.mask[i], "loft mask");
		}
		for (let i = 0; i < r.indexCount; i++) if (!Number.isInteger(r.indices[i]) || r.indices[i] >= r.vertexCount) throw new Error("Invalid loft index");
		for (let s = 0; s < r.sliceCount; s++) {
			if (s === 0 || !r.sliceJoined[s - 1] || s === r.sliceCount - 1 || !r.sliceJoined[s]) endWeightMax = Math.max(endWeightMax, r.sliceWeight[s]);
			if (s === r.sliceCount - 1) continue;
			if (!r.sliceJoined[s]) {
				cuts++;
				continue;
			}
			joins++;
			const dot = Math.max(-1, Math.min(1, r.sliceRayX[s] * r.sliceRayX[s + 1] + r.sliceRayZ[s] * r.sliceRayZ[s + 1]));
			maxRayTurnDegrees = Math.max(maxRayTurnDegrees, Math.acos(dot) * 180 / Math.PI);
			for (let j = 0; j < samples; j++) {
				const a = s * samples + j, b = (s + 1) * samples + j;
				if (Math.min(r.lift[a], r.lift[b]) <= .01) continue;
				const region = j < 35 ? regions.back : j < 67 ? regions.roof : j < 91 ? regions.underside : j < 115 ? regions.face : regions.forwardRest;
				region.tested++;
				if ((r.positions[3 * b] - r.positions[3 * a]) * r.sliceRayZ[s] - (r.positions[3 * b + 2] - r.positions[3 * a + 2]) * r.sliceRayX[s] < 0) region.reversed++;
			}
		}
		return {
			present: true,
			vertexCount: r.vertexCount,
			indexCount: r.indexCount,
			sliceCount: r.sliceCount,
			samples,
			joins,
			cuts,
			overlaps: r.overlaps,
			overlapsOpen: r.overlapsOpen,
			overlapOpenWeight: r.overlapOpenWeight,
			clamps: r.clamps,
			clampedLookups: r.clampedLookups,
			endWeightMax,
			maxRayTurnDegrees,
			minY: r.vertexCount ? minY : null,
			maxY: r.vertexCount ? maxY : null,
			regions,
			caveat: "Reversed across-front orientation is a structural fold indicator, not a complete self-intersection/contact test. The same implementation is used in both grids."
		};
	}
	window.__qualityHelpers = {
		selectedStatus,
		profiles,
		aggregate,
		tubeGeometry
	};
}
const helperSource = `(${installQualityHelpers.toString()})()`;
new Function(helperSource);
function geometry(config) {
	const tank = tankLayout(config), edges = stretchedEdges(tank.offshore, tank.shore, tank.fineFrom, config.fineSpacing ?? 1, config.coarseSpacing ?? 4);
	return {
		nx: Math.round(config.alongShore / config.dx),
		dx: config.dx,
		dz: Array.from(edges.slice(1), (edge, k) => edge - edges[k]),
		z: Array.from(edges.slice(1), (edge, k) => (edge + edges[k]) / 2),
		tank
	};
}
const plan = {
	settings,
	shared,
	checkpoints,
	fixedStep: 1 / 60,
	steps: Math.round(checkpoints.at(-1) * 60),
	renderSpacing: 1,
	variants: specs.map((spec, i) => ({
		label: spec.label,
		url: urls[i],
		physicsGrid: {
			nx: geometry({
				...settings,
				...shared,
				dx: spec.dx
			}).nx,
			nz: geometry({
				...settings,
				...shared,
				dx: spec.dx
			}).dz.length
		}
	}))
};
if (plan.steps !== 1800 || plan.variants[0].physicsGrid.nx !== 160 || plan.variants[1].physicsGrid.nx !== 80 || plan.variants.some((v) => v.physicsGrid.nz !== 725)) throw new Error("dx2/4 geometry/clock changed");
plan.numericApproximation = "Alongshore dx2→dx4; fineSpacing1 and all other sea inputs fixed. Not exact semantics or FPS.";
plan.expectedNative = {
	viewport: "1708 × 926",
	browserDpr: 2,
	renderPixelRatio: 1.75,
	canvas: "2989 × 1620",
	graphics: {
		"preset": "high",
		"renderScale": 1,
		"nativePixelDensity": true,
		"frameLimit": 60,
		"waterSimulation": "auto",
		"seaDetail": "rich",
		"caustics": true,
		"sprayMist": true,
		"oceanView": "far",
		"foam": "detailed",
		"waterLook": "rich",
		"particles": "high"
	},
	contactSamplingM: 1,
	independentMaskSamplingM: 1
};
if (args.plan === "true") {
	console.log(JSON.stringify(plan, null, 2));
	process.exit(0);
}
mkdirSync(out, { recursive: true });
async function bundleMetadata(base, directory) {
	if (!directory) throw new Error("Immutable directory required");
	const root = resolve(directory), files = ["index.html", ...readdirSync(join(root, "assets")).filter((n) => /\.(js|css)$/.test(n)).sort().map((n) => "assets/" + n)], sha = createHash("sha256");
	for (const file of files) {
		sha.update(file);
		sha.update(readFileSync(join(root, file)));
	}
	const verified = [];
	for (const file of files) {
		const response = await fetch(new URL(file, base));
		if (!response.ok) throw new Error("Missing served " + file);
		const served = new Uint8Array(await response.arrayBuffer());
		const expected = hash(readFileSync(join(root, file)));
		if (hash(served) !== expected) throw new Error("Served file differs " + file);
		verified.push({
			file,
			sha256: expected
		});
	}
	const response = await fetch(base);
	if (!response.ok || hash(new Uint8Array(await response.arrayBuffer())) !== hash(readFileSync(join(root, "index.html")))) throw new Error("Served index differs from frozen directory");
	const workers = files.filter((file) => /^assets\/surfZoneWorker-[^/]+\.js$/.test(file));
	if (workers.length !== 1) throw new Error("Expected one served worker");
	const workerResponse = await fetch(new URL(workers[0], base));
	if (!workerResponse.ok) throw new Error("Missing worker");
	const bytes = new Uint8Array(await workerResponse.arrayBuffer());
	if (hash(bytes) !== hash(readFileSync(join(root, workers[0])))) throw new Error("Served worker differs from frozen directory");
	const source = new TextDecoder().decode(bytes);
	return {
		root,
		verified,
		sha256: sha.digest("hex"),
		worker: workers[0],
		workerSha256: hash(bytes),
		containsRowScratch: source.includes("fn rowScratch("),
		containsSideTimes: source.includes("var<workgroup> sideTimes:")
	};
}
const instrument = `(() => {
  let seed=0x5eed; Math.random=()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};
  const NativeWorker=window.Worker;window.Worker=class extends NativeWorker {
    postMessage(request,transfer){if(request?.type==='start'&&request.config?.spot==='padang'){
      request={...request,options:{...request.options,contact:true}};
      window.__qualityLatestStart={config:{...request.config},contact:request.options.contact,rider:request.options.rider,renderSpacing:request.options.renderSpacing,barrelCaseCount:request.options.barrelCases?.length??0};
    }return super.postMessage(request,transfer);}
  };
  const raf=requestAnimationFrame.bind(window);window.__qualityStopFrames=false;window.requestAnimationFrame=callback=>raf(time=>{if(!window.__qualityStopFrames)callback(time);});
  localStorage.setItem('breakline.settings.v1',JSON.stringify({graphics:{"preset":"high","renderScale":1,"nativePixelDensity":true,"frameLimit":60,"waterSimulation":"auto","seaDetail":"rich","caustics":true,"sprayMist":true,"oceanView":"far","foam":"detailed","waterLook":"rich","particles":"high"},detected:{preset:'high',water:'accurate',lowPerformance:false},seen:{rideHints:true,lowPerformanceNotice:true}}));
})();`;
const page = await launch({
	url: urls[0],
	port: Number(args.cdp ?? 9450),
	width: Number(args.width ?? 1280),
	height: Number(args.height ?? 720),
	args: ["--mute-audio"]
});
const failures = [];
const consoleMessages = [];
let activeLabel = "startup";
page.on("Runtime.consoleAPICalled", (event) => {
	const message = event.args.map((a) => a.value ?? a.description ?? "").join(" ");
	consoleMessages.push({
		run: activeLabel,
		type: event.type,
		message
	});
	if (event.type === "error" || /non.?finite|\bNaN\b|numerical.*unstable/i.test(message)) failures.push({
		run: activeLabel,
		type: event.type,
		message
	});
});
page.on("Runtime.exceptionThrown", (event) => failures.push({
	run: activeLabel,
	type: "exception",
	message: event.exceptionDetails.exception?.description ?? event.exceptionDetails.text
}));
const assertNoFailures = () => {
	if (failures.length) throw new Error("Browser/GPU error: " + JSON.stringify(failures));
};
const bounded = async (promise, seconds, context) => {
	let timer;
	try {
		return await Promise.race([promise, new Promise((_, reject) => {
			timer = setTimeout(() => reject(/* @__PURE__ */ new Error(context + " timeout")), seconds * 1e3);
		})]);
	} finally {
		clearTimeout(timer);
	}
};
const report = {
	schema: 1,
	date: (/* @__PURE__ */ new Date()).toISOString(),
	method: "Actual worker GPU; two riderless paused Lab runs on the same seed/warm clock, 1/60 s per completed snapshot. Continuous RAF rendering is suspended after initialization; checkpoints are manually rendered from the same fixed camera. This measures quality, not real-time FPS.",
	plan,
	caveats: [
		"Both runs use 1 m render/contact sampling to isolate physical dx. RenderSpacing=2 fidelity is measured separately.",
		"Physical foam/air aggregates use exported float32 cell fields and exact stretched-cell areas. Active breaking-indicator area is a source proxy; the transient FoamField.source field is not exported. Front widths and activeJetClaimAreaM2 sum across fronts and may count overlapping columns/claims more than once.",
		"Riderless worker contact is enabled identically;1m geometry is checked, but no board/contact trajectory is certified. Turbulence is not exported by SET1 and is not directly compared. Native checkpoints remain held, not a FPS run.",
		"Warm states are independently spun up on their respective grids. Differences at t=0 are reported rather than removed.",
		"Tube folds/cuts are tracked separately; their presence cannot establish that dx=4 caused an existing loft defect."
	],
	runs: [],
	comparisons: []
};
let commonProbe;
let cameraPose;
let baselineSolverTime;
async function capture(spec, index) {
	activeLabel = spec.label;
	const bundle = await bundleMetadata(spec.url, spec.directory);
	await page.send("Page.navigate", { url: urls[index] });
	await page.waitFor("window.breaklineDiagnostics && window.breaklineLab && document.querySelector('.screen-menu') && !document.querySelector('.is-scene-pending')", 12e4);
	const initial = await bounded(page.eval(`(async()=>{
    const d=window.breaklineDiagnostics,lab=window.breaklineLab;lab.clock.paused=true;window.__qualityStopFrames=true;
    await d.start(${JSON.stringify(settings)},${JSON.stringify({
		...shared,
		dx: spec.dx
	})},{rider:false,lab:true});
    lab.active=true;lab.clock.paused=true;
    const host=d.mode.host;while(host.outstandingSteps>0)await new Promise(resolve=>setTimeout(resolve,5));
    window.__qualityStopFrames=true;
    if(!d.mode.sweptBarrel?.ready)throw new Error('Missing Padang barrel');
    await Promise.race([d.mode.sweptBarrel.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Barrel library timeout')),15000))]);
    // UI overlays are outside the checkpoint image; only the normal game canvas stays visible.
    const style=document.createElement('style');style.textContent='#ui,#touch-controls,#loading{display:none!important}';document.head.append(style);
    if(innerWidth!==1708||innerHeight!==926||devicePixelRatio!==2)throw new Error('Native viewport/DPR differs');
    if(d.canvas.width!==2989||d.canvas.height!==1620)throw new Error('Native buffer differs');
    if(!window.__qualityLatestStart?.contact||window.__qualityLatestStart.rider!==false||window.__qualityLatestStart.renderSpacing!==1||window.__qualityLatestStart.barrelCaseCount<1)throw new Error('Missing1m worker contact');
    if(d.water.vertexNormals||d.mode.particleLevel!=='high')throw new Error('Normals/particles changed');
    d.setWaterLook('rich');d.setTimeOfDay('midday');
    d.mode.camera.setView('front');d.mode.camera.update(host,d.mode.focus,0);
    const c=d.mode.camera.camera.clone();
    ${cameraPose ? `c.position.fromArray(${JSON.stringify(cameraPose.position)});c.quaternion.fromArray(${JSON.stringify(cameraPose.quaternion)});c.fov=${cameraPose.fov};c.aspect=${cameraPose.aspect};c.updateProjectionMatrix();c.updateMatrixWorld(true);` : ""}
    window.__qualityCamera=c;
    return {status:host.snapshot.status,config:d.mode.config,grid:host.init.grid,focus:d.mode.focus,windowXMin:host.init.windowXMin,dx:host.init.dx,
      observed:{viewport:innerWidth+' × '+innerHeight,dpr:devicePixelRatio,canvas:d.canvas.width+' × '+d.canvas.height,vertexNormals:d.water.vertexNormals,particles:d.mode.particleLevel,waterLook:d.water.drawnLook,graphics:JSON.parse(localStorage.getItem('breakline.settings.v1')).graphics,workerStart:window.__qualityLatestStart},
      camera:{position:c.position.toArray(),quaternion:c.quaternion.toArray(),fov:c.fov,aspect:c.aspect}};
  })()`), Number(args.startTimeoutSeconds ?? 180), "GPU warm initialization");
	assertNoFailures();
	if (initial.status.compute !== "gpu" || initial.status.ride) throw new Error("Expected riderless GPU run");
	const resolved = { ...initial.config };
	for (const [key, expected] of Object.entries({
		"preset": "high",
		"renderScale": 1,
		"nativePixelDensity": true,
		"frameLimit": 60,
		"waterSimulation": "auto",
		"seaDetail": "rich",
		"caustics": true,
		"sprayMist": true,
		"oceanView": "far",
		"foam": "detailed",
		"waterLook": "rich",
		"particles": "high"
	})) if (initial.observed.graphics[key] !== expected) throw new Error("Native graphics setting differs: " + key);
	for (const [key, expected] of Object.entries({
		...shared,
		dx: spec.dx,
		componentCount: 64
	})) if (initial.observed.workerStart.config[key] !== expected) throw new Error("Actual worker start differs: " + key);
	for (const [key, expected] of Object.entries({
		...shared,
		dx: spec.dx,
		significantHeight: 3.8,
		peakPeriod: 18,
		spreading: 150,
		componentCount: 64
	})) if (resolved[key] !== expected) throw new Error(`Resolved config differs: ${key}=${resolved[key]} expected ${expected}`);
	if (initial.grid.spacing !== 1) throw new Error("Render spacing must stay 1 m in both physics variants");
	const grid = geometry(resolved);
	if (!commonProbe) {
		commonProbe = {
			xMin: initial.focus.x - 40,
			xStep: 4,
			transects: 21,
			zMin: initial.focus.z - 100,
			zStep: .5,
			samples: 401,
			focus: { ...initial.focus }
		};
		cameraPose = initial.camera;
	}
	await page.eval(helperSource);
	const collect = async (at, shot = true) => {
		const data = await page.eval(`(async()=>{const d=window.breaklineDiagnostics,h=window.__qualityHelpers;
      d.render(0,window.__qualityCamera);if(d.water.barrelMaskGrid.spacing!==1)throw new Error('Independent mask is not1m');
      if(d.canvas.width!==2989||d.canvas.height!==1620||d.water.vertexNormals||d.mode.particleLevel!=='high'||d.water.drawnLook!=='rich')throw new Error('Checkpoint quality changed');const status=h.selectedStatus();
      const physical=await h.aggregate(${JSON.stringify(grid)},${JSON.stringify(commonProbe.focus)},${baselineSolverTime ?? -1});
      return {status,physical,profiles:h.profiles(${JSON.stringify(commonProbe)}),tubeGeometry:h.tubeGeometry(),maskGrid:d.water.barrelMaskGrid};})()`);
		assertNoFailures();
		const expected = initial.status.seaTime + at;
		if (Math.abs(data.status.seaTime - expected) > 1e-7 || Math.abs(data.physical.clock.seaTime - expected) > 1e-7) throw new Error("Checkpoint sea clock drift");
		let screenshot;
		if (shot) {
			const png = await page.send("Page.captureScreenshot", { format: "png" });
			screenshot = join(out, `${spec.label}-${at}s.png`);
			writeFileSync(screenshot, Buffer.from(png.data, "base64"));
		}
		return {
			at,
			fixedSteps: Math.round(at * 60),
			...data,
			screenshot
		};
	};
	const start = await collect(0);
	if (Math.abs(start.status.seaTime - shared.startSeaTime) > 1e-7) throw new Error("Warm sea clock differs from requested startSeaTime");
	if (baselineSolverTime === void 0) baselineSolverTime = start.physical.clock.solverTime;
	if (Math.abs(start.physical.clock.solverTime - baselineSolverTime) > 1e-7) throw new Error("Warm solver clocks differ");
	start.physical.onset = {
		newColumns: 0,
		newWidthM: 0,
		firstSolverTime: null,
		lastSolverTime: null
	};
	start.physical.front.newJoinedPoints = 0;
	start.physical.front.newThrownPoints = 0;
	start.physical.front.firstNewJoinedSolverTime = null;
	start.physical.front.firstNewThrownSolverTime = null;
	const run = {
		label: spec.label,
		url: urls[index],
		bundle,
		initial: {
			...initial,
			status: start.status,
			clock: start.physical.clock
		},
		start,
		timeline: [],
		checkpoints: [],
		elapsedWallSeconds: 0
	};
	report.runs.push(run);
	writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
	const wall = Date.now();
	let done = 0;
	const event = {
		firstFrontAfterStartSeconds: start.status.frontCount ? 0 : null,
		firstNewLipLaunchSeconds: null,
		firstFrontThrowClockAdvanceSeconds: start.physical.front.thrownColumnWidthM > 0 ? 0 : null
	};
	while (done < plan.steps) {
		const count = Math.min(60, plan.steps - done, ...checkpoints.map((t) => Math.round(t * 60) - done).filter((n) => n > 0));
		const progress = await page.eval(`(async()=>{
      const d=window.breaklineDiagnostics,host=d.mode.host,h=window.__qualityHelpers,out=[];
      for(let i=0;i<${count};i++){
        if(host.outstandingSteps!==0)throw new Error('Unexpected pending advances');const time=host.snapshot.status.seaTime;
        d.step({paddle:false,popUp:false,steer:0});const began=performance.now();
        while(host.snapshot.status.seaTime<=time||host.outstandingSteps>0){if(performance.now()-began>15000)throw new Error('Fixed GPU step timeout');await new Promise(resolve=>setTimeout(resolve,2));}
        const s=h.selectedStatus(),delta=s.seaTime-time;if(Math.abs(delta-1/60)>1e-7)throw new Error('Automatic/missing steps: '+delta);
        const front=host.snapshot.front;let thrownClock=false;for(let p=0;p<host.snapshot.frontCount;p++)if(front[p*9+4]>0)thrownClock=true;
        out.push({seaTime:s.seaTime,frontCount:s.frontCount,lipLaunches:s.lipLaunches,thrownClock});
      }
      return {steps:out,status:h.selectedStatus()};
    })()`);
		assertNoFailures();
		for (let i = 0; i < progress.steps.length; i++) {
			const s = progress.steps[i], elapsed = (done + i + 1) / 60;
			if (event.firstFrontAfterStartSeconds === null && s.frontCount > 0) event.firstFrontAfterStartSeconds = elapsed;
			if (event.firstNewLipLaunchSeconds === null && s.lipLaunches > initial.status.lipLaunches) event.firstNewLipLaunchSeconds = elapsed;
			if (event.firstFrontThrowClockAdvanceSeconds === null && s.thrownClock) event.firstFrontThrowClockAdvanceSeconds = elapsed;
		}
		done += count;
		const delta = progress.status.seaTime - initial.status.seaTime;
		if (Math.abs(delta - done / 60) > 1e-7) throw new Error("Run cumulative clock drift");
		run.timeline.push({
			at: done / 60,
			...progress.status
		});
		if (checkpoints.includes(done / 60)) {
			const checkpoint = await collect(done / 60);
			run.checkpoints.push(checkpoint);
			console.log(JSON.stringify({
				run: spec.label,
				at: checkpoint.at,
				seaTime: checkpoint.status.seaTime,
				cells: checkpoint.status.cells,
				crestMax: Math.max(...checkpoint.profiles.height),
				fronts: checkpoint.status.frontCount,
				foamArea: checkpoint.physical.nearBreak.totalFoamAreaM2,
				air: checkpoint.physical.nearBreak.airVolumeM3
			}));
			writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
		}
		if (Date.now() - wall > Number(args.timeoutSeconds ?? 240) * 1e3) throw new Error("Bounded quality run wall timeout");
	}
	run.contactProof = {
		start: initial.observed.workerStart,
		activeTimedTimelineSamples: run.timeline.filter((s) => s.frontCount > 0 && s.contactBuildMs > 0).length,
		nonemptyGeometryCheckpoints: run.checkpoints.filter((s) => s.tubeGeometry.sliceCount > 0 && s.tubeGeometry.vertexCount > 0).map((s) => s.at)
	};
	if (!run.contactProof.activeTimedTimelineSamples || !run.contactProof.nonemptyGeometryCheckpoints.length) throw new Error("No active worker contact/renderer geometry proof");
	run.elapsedWallSeconds = (Date.now() - wall) / 1e3;
	run.events = event;
	return run;
}
function stats(values) {
	const sorted = [...values].sort((a, b) => a - b);
	return {
		count: values.length,
		rms: values.length ? Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length) : null,
		p95: sorted[Math.floor((sorted.length - 1) * .95)] ?? null,
		max: sorted.at(-1) ?? null
	};
}
function compare(a, b) {
	const p = a.profiles, q = b.profiles;
	if (p.height.length !== q.height.length || JSON.stringify(p.x) !== JSON.stringify(q.x) || JSON.stringify(p.z) !== JSON.stringify(q.z)) throw new Error("Profile coordinates differ");
	const dh = [], slopes = [], nearCrests = [], crest = [];
	const hAt = (profile, i, z) => {
		const n = (z - profile.z[0]) / (profile.z[1] - profile.z[0]), k = Math.floor(n), f = n - k;
		if (k < 0 || k + 1 >= profile.z.length) return null;
		return profile.height[i * profile.z.length + k] * (1 - f) + profile.height[i * profile.z.length + k + 1] * f;
	};
	for (let n = 0; n < p.height.length; n++) {
		dh.push(Math.abs(q.height[n] - p.height[n]));
		slopes.push(Math.hypot(q.slopeX[n] - p.slopeX[n], q.slopeZ[n] - p.slopeZ[n]));
	}
	for (let i = 0; i < p.x.length; i++) for (const peak of p.peaks[i]) {
		const coarse = q.peaks[i].filter((c) => Math.abs(c.z - peak.z) <= 20).sort((a, b) => Math.abs(a.z - peak.z) - Math.abs(b.z - peak.z))[0];
		const aligned = [];
		for (let offset = -8; offset <= 8; offset += .5) {
			const a = hAt(p, i, peak.z + offset), b = coarse ? hAt(q, i, coarse.z + offset) : null;
			if (a !== null && b !== null) aligned.push(Math.abs(a - b));
		}
		crest.push({
			x: peak.x,
			fine: peak,
			coarse: coarse ?? null,
			heightDifferenceM: coarse ? coarse.height - peak.height : null,
			positionDifferenceM: coarse ? coarse.z - peak.z : null,
			alignedShapeHeightM: stats(aligned)
		});
		for (let k = 0; k < p.z.length; k++) if (Math.abs(p.z[k] - peak.z) <= 8) nearCrests.push(Math.abs(q.height[i * p.z.length + k] - p.height[i * p.z.length + k]));
	}
	const scalarDiff = (x, y) => Object.fromEntries(Object.entries(x).filter(([, v]) => typeof v === "number").map(([k, v]) => [k, {
		fine: v,
		coarse: y[k],
		difference: y[k] - v,
		relative: v ? y[k] / v - 1 : null
	}]));
	return {
		at: a.at,
		sameSeaTime: Math.abs(a.status.seaTime - b.status.seaTime) <= 1e-7,
		sameSolverTime: Math.abs(a.physical.clock.solverTime - b.physical.clock.solverTime) <= 1e-7,
		sameSeaTimeOffset: Math.abs(a.physical.clock.seaTimeOffset - b.physical.clock.seaTimeOffset) <= 1e-7,
		breakBandHeightM: stats(dh),
		breakBandSlope: stats(slopes),
		fineCrestNeighborhoodHeightM: stats(nearCrests),
		crestPeaks: {
			matched: crest.filter((c) => c.coarse).length,
			unmatched: crest.filter((c) => !c.coarse).length,
			heightDifferenceM: stats(crest.filter((c) => c.coarse).map((c) => Math.abs(c.heightDifferenceM))),
			positionDifferenceM: stats(crest.filter((c) => c.coarse).map((c) => Math.abs(c.positionDifferenceM))),
			samples: crest
		},
		nearBreakPhysical: scalarDiff(a.physical.nearBreak, b.physical.nearBreak),
		domainPhysical: scalarDiff(a.physical.domain, b.physical.domain),
		launches: {
			dx2: {
				count: a.status.lipLaunches,
				volumeM3: a.status.lipVolume,
				jets: a.status.lipJets,
				rollers: a.status.lipRollers,
				columnWidthProxyM: a.status.lipLaunches * 2
			},
			dx4: {
				count: b.status.lipLaunches,
				volumeM3: b.status.lipVolume,
				jets: b.status.lipJets,
				rollers: b.status.lipRollers,
				columnWidthProxyM: b.status.lipLaunches * 4
			}
		},
		onset: {
			fine: a.physical.onset,
			coarse: b.physical.onset
		},
		front: {
			fine: a.physical.front,
			coarse: b.physical.front
		},
		tubeGeometry: {
			fine: a.tubeGeometry,
			coarse: b.tubeGeometry
		},
		screenshots: [a.screenshot, b.screenshot]
	};
}
try {
	await page.send("Page.addScriptToEvaluateOnNewDocument", { source: instrument });
	const [a, b] = await bounded((async () => [await capture(specs[0], 0), await capture(specs[1], 1)])(), 600, "Paired GPU quality trial");
	if (a.bundle.sha256 && b.bundle.sha256 && a.bundle.sha256 !== b.bundle.sha256 && args.allowBuildDifference !== "true") throw new Error("Physics isolation requires the same immutable build; use --allowBuildDifference=true only for an explicitly labeled combined change");
	report.commonProbe = commonProbe;
	report.camera = cameraPose;
	report.comparisons = [compare(a.start, b.start), ...a.checkpoints.map((frame, i) => compare(frame, b.checkpoints[i]))];
	report.valid = report.comparisons.every((c) => c.sameSeaTime && c.sameSolverTime && c.sameSeaTimeOffset) && !failures.length;
	report.qualityDecision = "Review required: compare crest phase/height, breaking/foam/air changes and paired images; valid means clocks and finite-data checks passed, not that coarser physics was accepted.";
	if (!report.valid) process.exitCode = 1;
} catch (error) {
	report.valid = false;
	report.failure = String(error?.stack ?? error);
	process.exitCode = 1;
	console.error(report.failure);
} finally {
	report.consoleMessages = consoleMessages;
	report.failures = failures;
	writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
	await page.close();
}
console.log(JSON.stringify({
	valid: report.valid,
	report: join(out, "report.json"),
	runs: report.runs.map((run) => ({
		label: run.label,
		wallSeconds: run.elapsedWallSeconds,
		initialSeaTime: run.start.status.seaTime,
		finalSeaTime: run.checkpoints.at(-1)?.status.seaTime
	})),
	comparisons: report.comparisons.map((c) => ({
		at: c.at,
		height: c.fineCrestNeighborhoodHeightM,
		peakHeight: c.crestPeaks.heightDifferenceM,
		peakShift: c.crestPeaks.positionDifferenceM,
		air: c.nearBreakPhysical.airVolumeM3
	}))
}));
//#endregion
export {};
