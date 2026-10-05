import { readFileSync } from "node:fs";
//#region src/wave/barrel/barrelLibraryIndex.ts
const BARREL_CASES = [
	{
		"id": "pad19-a20-l12",
		"spot": "padang",
		"slope": .0526316,
		"nonlinearity": .2,
		"flatDepth": .1785714,
		"asset": "barrels/pad19-a20-l12.bin"
	},
	{
		"id": "pad19-a30-l12",
		"spot": "padang",
		"slope": .0526316,
		"nonlinearity": .3,
		"flatDepth": .1785714,
		"asset": "barrels/pad19-a30-l12.bin"
	},
	{
		"id": "pad19-a45-l12",
		"spot": "padang",
		"slope": .0526316,
		"nonlinearity": .45,
		"flatDepth": .1785714,
		"asset": "barrels/pad19-a45-l12.bin"
	},
	{
		"id": "periodic-padang19s-l12",
		"spot": "padang",
		"slope": .0526316,
		"nonlinearity": .1414,
		"flatDepth": .1785714,
		"asset": "barrels/periodic-padang19s-l12.bin"
	},
	{
		"id": "periodic-reef42-l12",
		"spot": "reef",
		"slope": .238095,
		"nonlinearity": .2127,
		"flatDepth": .15,
		"asset": "barrels/periodic-reef42-l12.bin"
	},
	{
		"id": "periodic-point21-a15-l12",
		"spot": "point",
		"slope": .0465116,
		"nonlinearity": .1498,
		"flatDepth": .05,
		"asset": "barrels/periodic-point21-a15-l12.bin"
	},
	{
		"id": "periodic-point21-a23-l12",
		"spot": "point",
		"slope": .0465116,
		"nonlinearity": .2304,
		"flatDepth": .05,
		"asset": "barrels/periodic-point21-a23-l12.bin"
	},
	{
		"id": "periodic-point21-a30-l12",
		"spot": "point",
		"slope": .0465116,
		"nonlinearity": .2999,
		"flatDepth": .05,
		"asset": "barrels/periodic-point21-a30-l12.bin"
	}
];
//#endregion
//#region src/wave/barrel/boundedCProfile.ts
const KAPPA = 4 / 3 * Math.tan(Math.PI / 8);
/** Fractions of the actual crest-to-toe height, not the input foot crest height. */
const LIP_OPEN_HEIGHT = .6;
const LIP_FALL_HEIGHT = .8;
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub$1 = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, b) => [a[0] * b, a[1] * b];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const norm = (a) => Math.hypot(...a);
const unit = (a) => {
	const n = norm(a);
	if (!n) throw Error("zero tangent");
	return mul(a, 1 / n);
};
const mix = (a, b, t) => add(mul(a, 1 - t), mul(b, t));
const round = (a) => [Math.fround(a[0]), Math.fround(a[1])];
const smooth = (x) => {
	x = Math.min(1, Math.max(0, x));
	return x * x * (3 - 2 * x);
};
function bezier(c, t) {
	const s = 1 - t;
	return add(add(mul(c[0], s * s * s), mul(c[1], 3 * s * s * t)), add(mul(c[2], 3 * s * t * t), mul(c[3], t * t * t)));
}
function derivative(c, t) {
	const s = 1 - t;
	return mul(add(add(mul(sub$1(c[1], c[0]), s * s), mul(sub$1(c[2], c[1]), 2 * s * t)), mul(sub$1(c[3], c[2]), t * t)), 3);
}
const at = (p, i) => [p[2 * i], p[2 * i + 1]];
function boundedCParameters(profile, authoredTD, tau) {
	return {
		crest: at(profile, 32),
		toe: at(profile, 112),
		incoming: sub$1(at(profile, 32), at(profile, 31)),
		outgoing: sub$1(at(profile, 113), at(profile, 112)),
		authoredTD,
		tau
	};
}
function blendBoundedCParameters(a, b, w) {
	return {
		crest: round(mix(a.crest, b.crest, w)),
		toe: round(mix(a.toe, b.toe, w)),
		incoming: round(mix(a.incoming, b.incoming, w)),
		outgoing: round(mix(a.outgoing, b.outgoing, w)),
		authoredTD: a.authoredTD + w * (b.authoredTD - a.authoredTD),
		tau: a.tau + w * (b.tau - a.tau),
		leafWidthDelta: (a.leafWidthDelta ?? 0) + w * ((b.leafWidthDelta ?? 0) - (a.leafWidthDelta ?? 0))
	};
}
/** Identity core with a C1 shoulder in the requested correction; the bound is the available leaf-reach room. */
function boundedLeafWidthDelta(delta, budget) {
	if (!Number.isFinite(delta) || !Number.isFinite(budget) || !(budget > 0)) throw Error("invalid leaf reach correction");
	const magnitude = Math.abs(delta), core = .6 * budget;
	if (magnitude <= core) return delta;
	const shoulder = .4 * budget, excess = magnitude - core;
	return Math.sign(delta) * Math.min(budget, core + shoulder * (excess / (shoulder + excess)));
}
function ordinary(z) {
	const A = z.crest, Toe = z.toe, ct = unit(z.incoming), tt = unit(z.outgoing), W = Toe[0] - A[0], H = A[1] - Toe[1];
	if (W <= 0 || H <= 0 || ct[0] <= 0 || tt[0] <= 0 || z.authoredTD <= 0) throw Error("invalid crest/toe domain");
	const chord = norm(sub$1(Toe, A)), ha = Math.min(chord / 3, W / (3 * ct[0])), ht = Math.min(chord / 3, W / (3 * tt[0]));
	const base = [
		A,
		add(A, mul(ct, ha)),
		sub$1(Toe, mul(tt, ht)),
		Toe
	], K0 = bezier(base, .5), d0 = unit(derivative(base, .5));
	const minimumLeafHeight = .4 * H;
	const B = Math.min(.06 * H, W / 16, .1 * Math.min((.85 * W) ** 2 / H, minimumLeafHeight ** 2 / (.85 * W)));
	const reachBudget = Math.min(B, .13 * W - 2 * B), leafWidthDelta = boundedLeafWidthDelta(z.leafWidthDelta ?? 0, reachBudget);
	return {
		A,
		Toe,
		ct,
		tt,
		W,
		H,
		base,
		K0,
		d0,
		ha0: ha / 2,
		he0: norm(derivative(base, .5)) / 6,
		ht0: ht / 2,
		B,
		leafWidthDelta
	};
}
function roof(o, g, s, T, post, remaining = 1) {
	const { A, Toe, W, H } = o, angle0 = Math.atan2(o.d0[1], o.d0[0]), angle = post ? -Math.PI / 2 * remaining : (1 - g) * angle0 - g * Math.PI / 2, v = [Math.cos(angle), Math.sin(angle)];
	const L = [Toe[0] - 2 * o.B - .02 * W + o.leafWidthDelta, Toe[1] + LIP_OPEN_HEIGHT * H - LIP_FALL_HEIGHT * H * s];
	let K = mix(o.K0, L, g);
	function controls(K) {
		const width = K[0] - A[0], height = A[1] - K[1];
		if (width <= 0 || height <= 0) throw Error("nonpositive leaf domain");
		let hs = (1 - g) * o.ha0 + g * KAPPA * width, he = (1 - g) * o.he0 + g * KAPPA * height;
		const advance = hs * o.ct[0] + he * Math.max(0, v[0]);
		if (advance > .85 * width) {
			hs *= .85 * width / advance;
			he *= .85 * width / advance;
		}
		return [
			A,
			add(A, mul(o.ct, hs)),
			sub$1(K, mul(v, he)),
			K
		];
	}
	if (post) {
		K = add(post, [T / 2, T / 2]);
		for (let i = 0; i < 16; i++) {
			const c = controls(K), prev = round(bezier(c, 27 / 28)), last = unit(sub$1(K, prev)), n = [-last[1], last[0]];
			K = add(add(post, [0, T / 2]), mul(n, T / 2));
		}
	}
	const c = controls(K), P = [A];
	for (let i = 1; i < 28; i++) P.push(round(bezier(c, i / 28)));
	P.push(K);
	const last = unit(sub$1(P[28], P[27]));
	return {
		P,
		c,
		last,
		n: [-last[1], last[0]]
	};
}
const eventCache = /* @__PURE__ */ new Map();
function event(o) {
	const key = [
		...o.A,
		...o.Toe,
		...o.ct,
		...o.tt,
		o.leafWidthDelta
	].join(",");
	const cached = eventCache.get(key);
	if (cached) return cached;
	const gap = (s) => {
		const { P, n } = roof(o, 1, s, o.B);
		return P[28][1] - o.B / 2 * (1 + n[1]) - o.Toe[1];
	};
	if (gap(0) <= 0 || gap(1) >= 0) throw Error("impact not bracketed");
	let lo = 0, hi = 1;
	for (let i = 0; i < 32; i++) {
		const m = (lo + hi) / 2;
		if (gap(m) > 0) lo = m;
		else hi = m;
	}
	const seal = (lo + hi) / 2, { P, n } = roof(o, 1, seal, o.B), cap = round([P[28][0] - o.B / 2 * n[0], o.Toe[1]]);
	lo = 0;
	hi = 1;
	for (let i = 0; i < 32; i++) {
		const m = (lo + hi) / 2;
		if (smooth(m) < seal) lo = m;
		else hi = m;
	}
	const result = {
		seal,
		cap,
		fraction: (lo + hi) / 2
	};
	if (eventCache.size >= 128) eventCache.delete(eventCache.keys().next().value);
	eventCache.set(key, result);
	return result;
}
function tail(A, B, u, v, h0 = norm(sub$1(B, A)) / 3, h1 = norm(sub$1(B, A)) / 3) {
	const dx = B[0] - A[0];
	if (dx < 0) throw Error("backward tail");
	if (u[0] > 0) h0 = Math.min(h0, dx / (3 * u[0]));
	if (v[0] > 0) h1 = Math.min(h1, dx / (3 * v[0]));
	return [
		A,
		add(A, mul(u, h0)),
		sub$1(B, mul(v, h1)),
		B
	];
}
function arcSample(points, count) {
	const lengths = [0];
	for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + norm(sub$1(points[i], points[i - 1])));
	const total = lengths.at(-1);
	const out = [];
	let j = 0;
	for (let i = 0; i <= count; i++) {
		const d = total * i / count;
		while (j + 1 < lengths.length - 1 && lengths[j + 1] < d) j++;
		const span = lengths[j + 1] - lengths[j];
		out.push(span ? mix(points[j], points[j + 1], (d - lengths[j]) / span) : points[j]);
	}
	return out;
}
function raySegment(O, d, P, Q) {
	const e = sub$1(Q, P), den = cross(d, e);
	if (Math.abs(den) < 1e-18) return Infinity;
	const a = sub$1(P, O), r = cross(a, e) / den, t = cross(a, d) / den;
	return r > 0 && t >= 0 && t <= 1 ? r : Infinity;
}
function roots(a, b, c) {
	if (Math.abs(a) < 1e-18) return Math.abs(b) > 1e-18 && -c / b > 0 ? [-c / b] : [];
	const disc = b * b - 4 * a * c;
	if (disc < 0) return [];
	const d = Math.sqrt(disc);
	return [(-b - d) / (2 * a), (-b + d) / (2 * a)].filter((r) => r > 0);
}
function rotate(a, t) {
	return [a[0] * Math.cos(t) - a[1] * Math.sin(t), a[0] * Math.sin(t) + a[1] * Math.cos(t)];
}
function angleWithin(rad, r0, span) {
	let a = Math.atan2(cross(r0, rad), dot(r0, rad));
	if (a < 0) a += 2 * Math.PI;
	return a <= span + 1e-12 || Math.abs(a - 2 * Math.PI) < 1e-12;
}
function arcBound(O, c, r0, span, P, Q) {
	if (!span) return Infinity;
	const candidates = [], e = sub$1(Q, P), ee = dot(e, e);
	for (const X of [P, Q]) {
		const x = sub$1(X, O);
		for (const R of roots(dot(c, c) - 1, -2 * dot(c, x), dot(x, x))) if (angleWithin(sub$1(mul(x, 1 / R), c), r0, span)) candidates.push(R);
	}
	if (ee > 0) {
		const n = mul([-e[1], e[0]], 1 / Math.sqrt(ee)), d = dot(n, sub$1(O, P)), nc = dot(n, c);
		for (const sign of [-1, 1]) {
			const den = nc - sign;
			if (Math.abs(den) > 1e-18) {
				const R = -d / den;
				if (R > 0) {
					const centre = add(O, mul(c, R)), X = sub$1(centre, mul(n, sign * R)), t = dot(sub$1(X, P), e) / ee;
					if (t >= 0 && t <= 1 && angleWithin(mul(sub$1(X, centre), 1 / R), r0, span)) candidates.push(R);
				}
			}
		}
	}
	for (const rad of [r0, rotate(r0, span)]) candidates.push(raySegment(O, add(c, rad), P, Q));
	return Math.min(Infinity, ...candidates);
}
function faceBound(J, O, dU, cV, P, Q) {
	const candidates = [raySegment(J, dU, P, Q), raySegment(O, cV, P, Q)];
	if (Math.abs(dU[0]) > 1e-18) for (const X of [P, Q]) {
		const R = (X[0] - J[0]) / dU[0];
		if (R > 0) {
			const U = add(J, mul(dU, R));
			if (add(O, mul(cV, R))[1] <= X[1] && X[1] <= U[1]) candidates.push(R);
		}
	}
	return Math.min(...candidates);
}
function root(J, vr, angle, qC, yC, T, P, V, bulk, sharedCrest, preservedCarrierStart = 0) {
	const slope = Math.tan(angle), u = mul(vr, -1);
	let beta = Math.atan2(u[1], u[0]);
	if (beta < 0) beta += 2 * Math.PI;
	const spanU = 3 * Math.PI / 2 - beta, spanL = Math.PI / 2 + angle;
	if (spanU < 0 || spanL < 0) throw Error("root turn domain");
	const dU = [Math.sin(3 * Math.PI / 2) - Math.sin(beta), -Math.cos(3 * Math.PI / 2) + Math.cos(beta)], dL = [Math.sin(2 * Math.PI + angle) + 1, -Math.cos(2 * Math.PI + angle)], N = J[1] - yC - slope * (J[0] - qC), coef = dU[1] + dL[1] - slope * (dU[0] + dL[0]), O = add(J, [0, -N]), cU = [-u[1], u[0]], cV = add(dU, [0, -coef]), cL = add(cV, [1, 0]);
	if (N <= 0) throw Error("nonpositive root depth");
	let R = Math.min(4 * T, coef < 0 ? N / -coef : Infinity);
	const domainReach = 1 + Math.sin(beta), domainRadius = sharedCrest !== void 0 && domainReach > 0 ? (J[0] - sharedCrest) / domainReach : Infinity;
	R = Math.min(R, domainRadius);
	const guards = [];
	for (let i = 0; i < 28; i++) {
		const n = [-V[i][1], V[i][0]];
		guards.push([sub$1(P[i], mul(n, T / 2)), sub$1(P[i + 1], mul(n, T / 2))]);
	}
	for (let i = preservedCarrierStart; i < 32; i++) guards.push([add(at(bulk, i), [0, -T / 2]), add(at(bulk, i + 1), [0, -T / 2])]);
	for (const [a, b] of guards) R = Math.min(R, arcBound(J, cU, mul(cU, -1), spanU, a, b), arcBound(O, cL, [-1, 0], spanL, a, b), faceBound(J, O, dU, cV, a, b));
	if (!Number.isFinite(R) || R < T / 2) throw Error("root thickness domain");
	const D = N + R * coef;
	if (D < -1e-12) throw Error("negative root face");
	const U = add(J, mul(dU, R));
	if (sharedCrest !== void 0 && R === domainRadius) U[0] = sharedCrest;
	const V0 = add(U, [0, -D]), E = add(V0, mul(dL, R)), points = [J];
	for (let i = 1; i <= 8; i++) points.push(i === 8 && sharedCrest !== void 0 ? U : add(J, mul([Math.sin(beta + spanU * i / 8) - Math.sin(beta), -Math.cos(beta + spanU * i / 8) + Math.cos(beta)], R)));
	for (let i = 1; i <= 4; i++) points.push(mix(U, V0, i / 4));
	for (let i = 1; i <= 4; i++) {
		const a = 3 * Math.PI / 2 + spanL * i / 4;
		points.push(add(V0, mul([Math.sin(a) + 1, -Math.cos(a)], R)));
	}
	return {
		points,
		E,
		R,
		D,
		domainRadius
	};
}
function ulp32(v) {
	const f = new Float32Array([v]), u = new Uint32Array(f.buffer);
	u[0]++;
	return f[0] - Math.fround(v);
}
/** Exact event arithmetic only: clocks do not require the inner sheet, bounded root or floor contour. */
function boundedCLifecycle(z) {
	const ev = event(ordinary(z)), TD = z.authoredTD, impact = TD + .3 * TD * ev.fraction;
	return {
		impactEvent: ev,
		impactTau: impact,
		retiredTau: impact + .3 * TD,
		fullyFormedTau: .4 * TD
	};
}
/** The same F32 cap64 as the full contour, without constructing its unrelated inner root/floor. */
function boundedCCap(z, lifecycle) {
	const o = ordinary(z), ev = lifecycle ?? event(o), TD = z.authoredTD, impact = TD + .3 * TD * ev.fraction, post = z.tau >= impact;
	const g = smooth(z.tau / (.4 * TD)), remaining = post ? 1 - smooth((z.tau - impact) / (.3 * TD)) : 1, s = post ? ev.seal : smooth((z.tau - TD) / (.3 * TD));
	const ulp = ulp32(Math.max(...z.crest.map(Math.abs), ...z.toe.map(Math.abs))), requested = o.B * (post ? remaining ** 2 : g * g), loopScale = post ? Math.min(remaining * o.W, remaining ** 2 * o.H) : Math.min(g * o.W, g * o.H), collapsed = requested < 8 * ulp || loopScale <= 64 * ulp, T = collapsed ? 0 : Math.max(requested, 8 * ulp);
	const { P, last } = roof(o, post ? 1 : g, s, T, post ? ev.cap : void 0, remaining);
	if (collapsed) return round(P[28]);
	const n = [-last[1], last[0]], centre = sub$1(P[28], mul(n, T / 2));
	let phi = Math.atan2(-last[1], -n[1]);
	if (phi < 0) phi += 2 * Math.PI;
	if (!(phi > 0 && phi <= Math.PI)) throw Error("cap minimum domain");
	const a = phi * 4 / 4, cap = add(centre, mul(add(mul(n, Math.cos(a)), mul(last, Math.sin(a))), T / 2));
	return round(post ? ev.cap : cap);
}
/** Writes only owned33..111. Domain failures throw; caller may explicitly choose raw library mode, never silently fall back. */
function sampleBoundedC(z, profile, velocity = true, lifecycle, sharedRootDomain = false, preservedCarrierStart = 0) {
	const o = ordinary(z), ev = lifecycle ?? event(o), TD = z.authoredTD, impact = TD + .3 * TD * ev.fraction, retired = impact + .3 * TD, post = z.tau >= impact;
	const g = smooth(z.tau / (.4 * TD)), remaining = post ? 1 - smooth((z.tau - impact) / (.3 * TD)) : 1, s = post ? ev.seal : smooth((z.tau - TD) / (.3 * TD));
	const ulp = ulp32(Math.max(...z.crest.map(Math.abs), ...z.toe.map(Math.abs))), requested = o.B * (post ? remaining ** 2 : g * g), loopScale = post ? Math.min(remaining * o.W, remaining ** 2 * o.H) : Math.min(g * o.W, g * o.H), collapsed = requested < 8 * ulp || loopScale <= 64 * ulp, activeG = g, activeRemain = remaining, T = collapsed ? 0 : Math.max(requested, 8 * ulp);
	const { P, c: currentRoof, last } = roof(o, post ? 1 : activeG, s, T, post ? ev.cap : void 0, activeRemain), target = Array.from({ length: 113 }, () => [0, 0]);
	for (let i = 0; i <= 28; i++) target[32 + i] = P[i];
	let R = 0, D = 0, envelopeBound = 0, connectorLength = 0, domainRadius;
	const envelopeBudget = .001 * Math.max(o.W, o.H);
	if (collapsed) {
		const K = P[28], angle = post ? 0 : (1 - g) * Math.atan2(o.d0[1], o.d0[0]), pv = [Math.cos(angle), Math.sin(angle)], slope = Math.tan(angle), yC = post ? o.Toe[1] : (1 - g) * o.K0[1] + g * o.Toe[1], C = [K[0], yC];
		if (C[1] > K[1]) throw Error("zero sheet connector not descending");
		const chord = norm(sub$1(o.Toe, C)), h0 = (1 - g) * o.he0 + g * chord / 3, h1 = (1 - g) * o.ht0 + g * chord / 3, fc = tail(C, o.Toe, pv, o.tt, h0, h1);
		connectorLength = K[1] - C[1];
		for (let i = 61; i <= 68; i++) target[i] = K;
		for (let i = 69; i <= 106; i++) target[i] = [K[0], K[1] + (C[1] - K[1]) * (i - 68) / 38];
		for (let i = 107; i <= 112; i++) target[i] = bezier(fc, (i - 106) / 6);
		const referenceT = Math.max(requested, 8 * ulp), reference = post ? roof(o, 1, s, referenceT, ev.cap, remaining) : {
			P,
			c: currentRoof
		}, F1 = [reference.P[28][0] - referenceT / 2 + referenceT, yC + slope * referenceT], refChord = norm(sub$1(o.Toe, F1)), refFloor = tail(F1, o.Toe, pv, o.tt, (1 - g) * o.he0 + g * refChord / 3, (1 - g) * o.ht0 + g * refChord / 3);
		envelopeBound = Math.max(...currentRoof.map((p, i) => norm(sub$1(p, reference.c[i]))), ...fc.map((p, i) => norm(sub$1(p, refFloor[i]))));
		if (requested > 0 && envelopeBound > envelopeBudget) throw Error("precision collapse spatial budget");
	} else {
		const V = P.slice(1).map((b, i) => unit(sub$1(b, P[i]))), N = V.map((v) => [-v[1], v[0]]), offset = [mul(N[0], -1)];
		for (let i = 1; i < 28; i++) {
			const den = 1 + dot(N[i - 1], N[i]);
			if (den <= 0) throw Error("opposite normals");
			offset.push(mul(add(N[i - 1], N[i]), -1 / den));
		}
		offset.push(mul(N[27], -1));
		const Q = P.map((p, i) => add(p, mul(offset[i], T)));
		for (let i = 0; i < 28; i++) {
			if (norm(sub$1(Q[i + 1], Q[i])) / norm(sub$1(P[i + 1], P[i])) < .75) throw Error("offset curvature budget");
			if (Q[i + 1][0] <= Q[i][0]) throw Error("backward offset sheet");
		}
		const factor = post ? activeRemain : activeG, qJ = (1 - factor) * Q[28][0] + factor * (o.A[0] + .28 * o.W);
		if (!(Q[0][0] <= qJ && qJ < Q[28][0])) throw Error("root cut outside sheet");
		let e = 0;
		while (!(Q[e][0] <= qJ && qJ <= Q[e + 1][0])) e++;
		const J = mix(Q[e], Q[e + 1], (qJ - Q[e][0]) / (Q[e + 1][0] - Q[e][0])), chain = [Q[28]];
		for (let i = 27; i > e; i--) chain.push(Q[i]);
		chain.push(J);
		const inner = arcSample(chain, 12), centre = sub$1(P[28], mul(N[27], T / 2));
		let phi = Math.atan2(-V[27][1], -N[27][1]);
		if (phi < 0) phi += 2 * Math.PI;
		if (!(phi > 0 && phi <= Math.PI)) throw Error("cap minimum domain");
		for (let i = 61; i <= 68; i++) {
			const a = i <= 64 ? phi * (i - 60) / 4 : phi + (Math.PI - phi) * (i - 64) / 4;
			target[i] = add(centre, mul(add(mul(N[27], Math.cos(a)), mul(V[27], Math.sin(a))), T / 2));
		}
		target[68] = Q[28];
		if (post) target[64] = ev.cap;
		for (let i = 69; i <= 80; i++) target[i] = inner[i - 68];
		const angle = post ? 0 : (1 - activeG) * Math.atan2(o.d0[1], o.d0[0]), pv = [Math.cos(angle), Math.sin(angle)], slope = pv[1] / pv[0], qC = P[28][0] - T / 2, yC = post ? o.Toe[1] : (1 - activeG) * o.K0[1] + activeG * o.Toe[1], rr = root(J, V[e], angle, qC, yC, T, P, V, profile, sharedRootDomain ? o.A[0] : void 0, preservedCarrierStart);
		R = rr.R;
		D = rr.D;
		if (sharedRootDomain) domainRadius = rr.domainRadius;
		for (let i = 0; i <= 16; i++) target[80 + i] = rr.points[i];
		const F0 = [qC - T, yC - slope * T], F1 = [qC + T, yC + slope * T];
		if (!(rr.E[0] <= F0[0] && F0[0] < F1[0] && F1[0] < o.Toe[0])) throw Error("floor plateau domain");
		const chord = norm(sub$1(o.Toe, F1)), h0 = (1 - activeG) * o.he0 + activeG * chord / 3, h1 = (1 - activeG) * o.ht0 + activeG * chord / 3, fc = tail(F1, o.Toe, pv, o.tt, h0, h1);
		for (let i = 97; i <= 102; i++) target[i] = mix(rr.E, F0, (i - 96) / 6);
		for (let i = 103; i <= 106; i++) target[i] = mix(F0, F1, (i - 102) / 4);
		for (let i = 107; i <= 112; i++) target[i] = bezier(fc, (i - 106) / 6);
	}
	for (let i = 33; i < 112; i++) {
		profile[2 * i] = target[i][0];
		profile[2 * i + 1] = target[i][1];
		if (!Number.isFinite(profile[2 * i] + profile[2 * i + 1])) throw Error("nonfinite profile");
	}
	const cap = at(profile, 64), flow = Math.sqrt(2 * o.H), meta = {
		model: "bounded-analytic-C/v4",
		impactEvent: ev,
		lengthScale: 1,
		timeScale: 1,
		formation: g,
		remaining,
		seal: s,
		authoredSealTau: TD,
		impactTau: impact,
		retiredTau: retired,
		fullyFormedTau: .4 * TD,
		sheetExists: !collapsed,
		precisionCollapsed: collapsed && requested > 0,
		thickness: T,
		requestedThickness: requested,
		cap,
		impactCap: ev.cap,
		rootRadius: R,
		rootVerticalLeg: D,
		precisionEnvelopeBound: envelopeBound,
		precisionEnvelopeBudget: envelopeBudget,
		collapsedConnectorLength: connectorLength,
		capBoundaryVelocity: [0, 0],
		fluidAlong: post ? 0 : last[0] * flow,
		fluidUp: post ? -flow : last[1] * flow,
		partRanges: {
			outer: [32, 60],
			cap: [60, 68],
			inner: [68, 80],
			upperRoot: [80, 88],
			face: [88, 92],
			lowerRoot: [92, 96],
			floor: [96, 112]
		}
	};
	meta.rootRadiusMaximumFromSheetDomain = domainRadius;
	if (velocity) {
		const dt = 1e-5 * TD, a = profile.slice(), b = profile.slice();
		sampleBoundedC({
			...z,
			tau: z.tau - dt
		}, a, false, lifecycle, sharedRootDomain, preservedCarrierStart);
		sampleBoundedC({
			...z,
			tau: z.tau + dt
		}, b, false, lifecycle, sharedRootDomain, preservedCarrierStart);
		meta.capBoundaryVelocity = [(b[128] - a[128]) / (2 * dt), (b[129] - a[129]) / (2 * dt)];
	}
	return meta;
}
//#endregion
//#region src/wave/barrel/sharedUpperRoot.ts
/** Height of the original forward polygon, explicitly completing a quantized vertical facet with its highest endpoint. */
function roofHeight(profile, x) {
	let y = -Infinity;
	for (let i = 32; i < 60; i += 1) {
		const a = profile[2 * i], b = profile[2 * (i + 1)];
		if (b < a) throw new Error("shared upper-root backward roof domain");
		if (x < a || x > b) continue;
		const ay = profile[2 * i + 1], by = profile[2 * (i + 1) + 1];
		y = Math.max(y, a === b ? Math.max(ay, by) : ay + (by - ay) * ((x - a) / (b - a)));
	}
	if (!Number.isFinite(y)) throw new Error("shared upper-root missing roof crossing");
	return y;
}
/** Exact vertical graph difference on the overlapping domain, at the union of both polygons' breakpoints. */
function roofEnvelopeDifference(a, b) {
	const left = Math.max(a[64], b[64]), right = Math.min(a[120], b[120]);
	if (left > right) throw new Error("roof envelope lacks common domain");
	let maximum = 0;
	const xs = [left, right];
	for (const p of [a, b]) for (let i = 32; i <= 60; i += 1) if (p[2 * i] >= left && p[2 * i] <= right) xs.push(p[2 * i]);
	for (const x of xs) maximum = Math.max(maximum, Math.abs(roofHeight(a, x) - roofHeight(b, x)));
	return maximum;
}
/**
* New sampling authority for the complete inner-sheet seam, not a change to v4's controls.
* Unsupported actual domains fail explicitly. Only outer33..59 is resampled, in both resolved and collapsed states so the precision gate cannot switch sampling authorities.
*/
function pairInnerSheet(profile, _meta) {
	const original = profile.slice();
	const left = original[176], right = original[136];
	const a = original[64], k = original[120];
	if (!(a <= left && left <= right && right <= k)) throw new Error("shared upper-root lacks complete outer roof domain");
	for (let i = 68; i < 88; i += 1) if (original[2 * i] < original[2 * (i + 1)]) throw new Error("shared upper-root backward return domain");
	const sample = (i, x) => {
		profile[2 * i] = x;
		profile[2 * i + 1] = roofHeight(original, profile[2 * i]);
	};
	for (let i = 33; i < 38; i += 1) sample(i, a + (left - a) * ((i - 32) / 6));
	let coalescedStations = 0;
	for (let i = 38; i <= 58; i += 1) {
		const j = 126 - i;
		sample(i, original[2 * j]);
		if (profile[2 * i + 1] < original[2 * j + 1]) throw new Error("shared upper-root negative paired separation");
		if (i > 38 && profile[2 * i] === profile[2 * (i - 1)]) coalescedStations += 1;
	}
	sample(59, right + (k - right) / 2);
	return {
		top: [38, 58],
		underside: [68, 88],
		maximumRoofEnvelopeChange: roofEnvelopeDifference(original, profile),
		coalescedStations
	};
}
//#endregion
//#region src/wave/dispersion.ts
/** Linear (Airy) water-wave dispersion, ω² = g k tanh(kh), in SI units. */
const GRAVITY = 9.81;
//#endregion
//#region src/wave/barrel/ProfileLibrary.ts
let carrierRounding;
function carrierNextUp(value) {
	if (!Number.isFinite(value) || value < 0) throw new Error("Invalid positive carrier bound");
	carrierRounding ??= /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8));
	carrierRounding.setFloat64(0, value);
	const low = carrierRounding.getUint32(4);
	carrierRounding.setUint32(4, low === 4294967295 ? 0 : low + 1);
	if (low === 4294967295) carrierRounding.setUint32(0, carrierRounding.getUint32(0) + 1);
	return carrierRounding.getFloat64(0);
}
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
const FLOATS = 256;
const ease = (value) => {
	const t = Math.max(0, Math.min(1, value));
	return t * t * (3 - 2 * t);
};
/**
* Carrier-width adjustment, h0. A centered continuous mean spans one authored frame on each side.
* We do not extend or asymmetrically truncate a case: its first/last interval stays raw, with a zero-slope
* activation over the next interval. Constant and linear frame-width sequences therefore stay unchanged,
* including boundaries. In the fully enabled interior the averaged width is C1 at raw frame knots.
* This changes neither the raw case words nor the actual crest/toe coordinates.
*/
function carrierWidthDelta(c, tau) {
	const count = c.frames.length / FLOATS;
	if (count < 3) return 0;
	const position = Math.max(0, Math.min(count - 1, (tau - c.tauStart) / c.tauStep));
	const enabled = ease(position - 1) * ease(count - 2 - position);
	if (enabled === 0) return 0;
	const width = (frame) => c.frames[frame * FLOATS + 2 * LANDMARK.toe] - c.frames[frame * FLOATS + 2 * LANDMARK.crest];
	const frame = Math.floor(position), share = position - frame;
	const raw = width(frame) + share * (width(frame + 1) - width(frame));
	const high = position + 1;
	let low = position - 1, interval = Math.floor(low), area = 0;
	while (low < high) {
		const end = Math.min(high, interval + 1), a = width(interval), slope = width(interval + 1) - a;
		area += (end - low) * (2 * a + slope * (low + end - 2 * interval)) / 2;
		low = end;
		interval += 1;
	}
	return enabled * (area / 2 - raw);
}
/** A slice whose slope is this far (relative) from every case's is outside the library. */
const SLOPE_TOLERANCE = .2;
/**
* The highest point of frame f's lower surface (the face and on, from the throat to the front end) under (x, y), h0;
* NaN where none lies under it.
*/
function surfaceBeneath(frames, f, x, y) {
	const o = f * FLOATS;
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
	const o = f * FLOATS;
	let height = 0;
	for (let i = LANDMARK.lip; i <= LANDMARK.throat; i += 1) {
		const y = frames[o + 2 * i + 1];
		const gap = y - surfaceBeneath(frames, f, frames[o + 2 * i], y);
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
	const count = c.frames.length / FLOATS;
	const last = Math.min(count - 1, Math.floor((c.touchdown - c.tauStart) / c.tauStep + 1e-6) - 1);
	for (let f = last; f >= 0; f -= 1) {
		const o = f * FLOATS;
		const tipX = c.frames[o + 2 * LANDMARK.lip];
		const tipY = c.frames[o + 2 * LANDMARK.lip + 1];
		if (tipX - c.frames[o + 2 * LANDMARK.throat] < CLEAR.gap) continue;
		if (!(tipY - surfaceBeneath(c.frames, f, tipX, tipY) >= CLEAR.gap)) continue;
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
var ProfileLibrary = class {
	cases;
	options;
	bySlope;
	held = /* @__PURE__ */ new Map();
	scratch = new Float32Array(FLOATS);
	tipLower = /* @__PURE__ */ new Float64Array(2);
	tipUpper = /* @__PURE__ */ new Float64Array(2);
	times = /* @__PURE__ */ new Float64Array(4);
	analyticPoint = new Float32Array(FLOATS);
	analyticOther = new Float32Array(FLOATS);
	analyticEarlier = new Float32Array(FLOATS);
	analyticLater = new Float32Array(FLOATS);
	analyticQueries = /* @__PURE__ */ new Map();
	analyticClocks = /* @__PURE__ */ new Map();
	constructor(cases, options = {}) {
		this.cases = cases;
		this.options = options;
		const groups = /* @__PURE__ */ new Map();
		for (const c of cases) groups.set(c.slope, [...groups.get(c.slope) ?? [], c]);
		this.bySlope = [...groups.values()].map((group) => [...group].sort((a, b) => a.nonlinearity - b.nonlinearity));
		for (const c of cases) this.held.set(c, heldFrame(c));
	}
	/** The profile for a slice, in metres, into `out` (PROFILE_POINTS (x, y) pairs). */
	profileAt(query, out) {
		const b = this.bracket(query);
		if (this.options.geometry === "bounded-C") return this.analyticAt(query, b, out);
		const tau = query.seconds / b.unit;
		const times = this.caseTimes(b, tau, query.hold);
		this.frameAt(b.lower, times[0], out);
		if (b.upper !== b.lower) {
			this.frameAt(b.upper, times[1], this.scratch);
			for (let i = 0; i < FLOATS; i += 1) out[i] += b.weight * (this.scratch[i] - out[i]);
		}
		for (let i = 0; i < FLOATS; i += 1) out[i] *= b.scale;
		const tip = this.tipLower;
		this.tipAt(b.lower, times[2], tip);
		if (b.upper !== b.lower) {
			this.tipAt(b.upper, times[3], this.tipUpper);
			tip[0] += b.weight * (this.tipUpper[0] - tip[0]);
			tip[1] += b.weight * (this.tipUpper[1] - tip[1]);
		}
		const speed = b.scale / b.unit;
		const phase = tau < 0 ? "pre" : tau <= b.touchdown ? "open" : "post";
		return {
			caseId: b.weight < .5 ? b.lower.id : b.upper.id,
			clamped: b.clamped,
			scale: b.scale,
			phase,
			touchdownSeconds: b.touchdown * b.unit,
			frameSeconds: b.frameStep * b.unit,
			tipAlong: tip[0] * speed,
			tipUp: tip[1] * speed,
			clearSeconds: b.clear * b.unit,
			collapseSeconds: b.collapse
		};
	}
	/** One profile point's place in a slice's profile, m (along, up), into `out`: as `profileAt` would place it. */
	pointAt(query, point, out) {
		const b = this.bracket(query);
		if (this.options.geometry === "bounded-C") {
			if (point === LANDMARK.lip) {
				const cap = this.analyticCap(query, b, this.analyticPoint, this.analyticClock(query, b).event);
				out[0] = cap[0];
				out[1] = cap[1];
				return;
			}
			if (point <= LANDMARK.crest || point >= LANDMARK.toe) {
				const carrier = Math.min(query.seconds / b.unit, b.touchdown);
				this.landmarkAt(b.lower, carrier, point, out);
				const x = Math.fround(out[0]), y = Math.fround(out[1]);
				if (b.upper !== b.lower) {
					this.landmarkAt(b.upper, carrier, point, out);
					out[0] = Math.fround(x + b.weight * (Math.fround(out[0]) - x));
					out[1] = Math.fround(y + b.weight * (Math.fround(out[1]) - y));
				} else {
					out[0] = x;
					out[1] = y;
				}
				out[0] = Math.fround(out[0] * b.scale);
				out[1] = Math.fround(out[1] * b.scale);
				return;
			}
			this.analyticAt(query, b, this.analyticPoint);
			out[0] = this.analyticPoint[2 * point];
			out[1] = this.analyticPoint[2 * point + 1];
			return;
		}
		const times = this.caseTimes(b, query.seconds / b.unit, query.hold);
		this.landmarkAt(b.lower, times[0], point, out);
		const x = out[0];
		const y = out[1];
		if (b.upper !== b.lower) {
			this.landmarkAt(b.upper, times[1], point, out);
			out[0] = x + b.weight * (out[0] - x);
			out[1] = y + b.weight * (out[1] - y);
		}
		out[0] *= b.scale;
		out[1] *= b.scale;
	}
	/** How `profileAt` would blend a slice's profile from its cases' frames (`FrameBlend`), into `into`. */
	frameBlend(query, into) {
		const b = this.bracket(query);
		const times = this.caseTimes(b, query.seconds / b.unit, query.hold);
		into.lower = b.lower;
		into.upper = b.upper;
		into.weight = b.weight;
		into.scale = b.scale;
		let position = this.framePosition(b.lower, times[0]);
		into.lowerFrame = Math.floor(position);
		into.lowerNext = Math.min(b.lower.frames.length / FLOATS - 1, into.lowerFrame + 1);
		into.lowerShare = position - into.lowerFrame;
		position = this.framePosition(b.upper, times[1]);
		into.upperFrame = Math.floor(position);
		into.upperNext = Math.min(b.upper.frames.length / FLOATS - 1, into.upperFrame + 1);
		into.upperShare = position - into.upperFrame;
		if (this.options.geometry === "bounded-C") {
			into.analyticProfile ??= new Float32Array(FLOATS);
			into.analytic = this.analyticAt(query, b, into.analyticProfile).analytic;
		} else {
			into.analyticProfile = void 0;
			into.analytic = void 0;
		}
		return into;
	}
	/** Where τ (√(h0/g)) falls among a case's frames, as `frameAt` places it: clamped to its first and last. */
	framePosition(c, tau) {
		return Math.min(c.frames.length / FLOATS - 1, Math.max(0, (tau - c.tauStart) / c.tauStep));
	}
	/** A slice's scale and times, s, as `profileAt` finds them, without building its profile (the loft's refinement and budget). */
	profileTimes(query) {
		const b = this.bracket(query);
		if (this.options.geometry === "bounded-C") {
			const clock = this.analyticClock(query, b);
			return {
				scale: b.scale,
				clamped: b.clamped,
				touchdownSeconds: clock.impact * b.unit,
				frameSeconds: b.frameStep * b.unit,
				clearSeconds: clock.clear * b.unit,
				collapseSeconds: (clock.retired - clock.impact) * b.unit
			};
		}
		return {
			scale: b.scale,
			clamped: b.clamped,
			touchdownSeconds: b.touchdown * b.unit,
			frameSeconds: b.frameStep * b.unit,
			clearSeconds: b.clear * b.unit,
			collapseSeconds: b.collapse
		};
	}
	/** Raw authored case evidence only. Analytic query lifecycle/void comes from profileAt, not this per-case helper. */
	heldFrameOf(c) {
		return this.held.get(c) ?? heldFrame(c);
	}
	/** The cases a slice blends and by how much, and its scale, as `profileAt` blends and scales them (the crash's held overturn, PR 5). */
	caseBlend(query) {
		const b = this.bracket(query);
		return {
			lower: b.lower,
			upper: b.upper,
			weight: b.weight,
			scale: b.scale,
			clamped: b.clamped
		};
	}
	/** C incident-interpolation support only; it never changes an individual pocket's physical lifetime. */
	carrierRetirementBound(slope, a, b) {
		if (this.options.geometry !== "bounded-C") throw new Error("Carrier support requires the bounded C provider");
		const h0 = Math.fround(a.footHeight), h1 = Math.fround(b.footHeight);
		const d0 = Math.fround(a.footDepth), d1 = Math.fround(b.footDepth);
		if (![
			h0,
			h1,
			d0,
			d1
		].every((v) => Number.isFinite(v) && v > 0)) throw new Error("Invalid carrier support foot domain");
		let group = this.bySlope[0];
		for (const candidate of this.bySlope) if (Math.abs(candidate[0].slope - slope) < Math.abs(group[0].slope - slope)) group = candidate;
		const stops = [0, 1];
		for (const c of group) {
			const denominator = h1 - h0 - c.nonlinearity * (d1 - d0);
			if (denominator === 0) continue;
			const t = (c.nonlinearity * d0 - h0) / denominator;
			if (t > 0 && t < 1) stops.push(t);
		}
		stops.sort((x, y) => x - y);
		const probes = [...stops];
		for (let k = 0; k + 1 < stops.length; k += 1) probes.push((stops[k] + stops[k + 1]) / 2);
		let maxScale = 0, maxAuthoredTD = 0;
		for (const t of probes) {
			const q = this.bracket({
				slope,
				footHeight: h0 + t * (h1 - h0),
				footDepth: d0 + t * (d1 - d0)
			});
			maxScale = Math.max(maxScale, q.scale);
			maxAuthoredTD = Math.max(maxAuthoredTD, q.lower.touchdown, q.upper.touchdown);
		}
		const unit = carrierNextUp(Math.sqrt(carrierNextUp(carrierNextUp(maxScale) / GRAVITY)));
		const seconds = carrierNextUp(carrierNextUp(1.6 * carrierNextUp(maxAuthoredTD)) * unit);
		if (!Number.isFinite(seconds) || !(seconds > 0)) throw new Error("Nonfinite carrier support bound");
		return {
			seconds,
			maxScale,
			maxAuthoredTD,
			partitions: stops.length - 1
		};
	}
	/** The cases a slice blends (the nearest slope's two bracketing its A0), its scale (h0, m) and τ's unit, s. */
	bracket(query) {
		let group = this.bySlope[0];
		for (const candidate of this.bySlope) if (Math.abs(candidate[0].slope - query.slope) < Math.abs(group[0].slope - query.slope)) group = candidate;
		let clamped = Math.abs(group[0].slope - query.slope) > SLOPE_TOLERANCE * query.slope;
		const a0 = query.footHeight / query.footDepth;
		let lower = group[0];
		let upper = group[group.length - 1];
		let weight = 0;
		if (a0 <= lower.nonlinearity) {
			clamped ||= a0 < lower.nonlinearity;
			upper = lower;
		} else if (a0 >= upper.nonlinearity) {
			clamped ||= a0 > upper.nonlinearity;
			lower = upper;
		} else for (let k = 0; k + 1 < group.length; k += 1) if (group[k].nonlinearity <= a0 && a0 <= group[k + 1].nonlinearity) {
			lower = group[k];
			upper = group[k + 1];
			weight = (a0 - lower.nonlinearity) / (upper.nonlinearity - lower.nonlinearity);
			break;
		}
		const scale = lower === upper ? query.footHeight / lower.nonlinearity : query.footDepth;
		const heldLower = this.heldFrameOf(lower);
		const heldUpper = this.heldFrameOf(upper);
		const voidHeight = (heldLower.voidHeight + weight * (heldUpper.voidHeight - heldLower.voidHeight)) * scale;
		const touchdown = lower.touchdown + weight * (upper.touchdown - lower.touchdown);
		return {
			lower,
			upper,
			weight,
			clamped,
			scale,
			unit: Math.sqrt(scale / GRAVITY),
			touchdown,
			frameStep: lower.tauStep + weight * (upper.tauStep - lower.tauStep),
			heldLower: heldLower.tau,
			heldUpper: heldUpper.tau,
			clear: Math.min(touchdown, Math.max(heldLower.tau, heldUpper.tau)),
			collapse: Math.sqrt(2 * voidHeight / GRAVITY)
		};
	}
	/** Phase-independent crest-relative reach, including analytic turns/cap and F32 parameter-blend rounding. */
	crestReachBounds(slope) {
		let group = this.bySlope[0];
		for (const candidate of this.bySlope) if (Math.abs(candidate[0].slope - slope) < Math.abs(group[0].slope - slope)) group = candidate;
		let low = 0, high = 0;
		for (const c of group) for (let offset = 0; offset < c.frames.length; offset += FLOATS) {
			const crest = c.frames[offset + 2 * LANDMARK.crest];
			for (let i = 0; i < 128; i++) {
				const x = c.frames[offset + 2 * i] - crest;
				low = Math.min(low, x);
				high = Math.max(high, x);
			}
			if (this.options.geometry === "bounded-C") {
				const W = c.frames[offset + 2 * LANDMARK.toe] - crest;
				const ulp = ulp32(Math.max(Math.abs(crest), Math.abs(c.frames[offset + 2 * LANDMARK.toe]), Math.abs(c.frames[offset + 2 * LANDMARK.crest + 1]), Math.abs(c.frames[offset + 2 * LANDMARK.toe + 1])));
				low = Math.min(low, -W - 76 * ulp);
				high = Math.max(high, 1.125 * W + 20 * ulp);
			}
		}
		return new Float64Array([low, high]);
	}
	/** Parameters blend before construction; all analytic hold modes share the same evolving geometry. */
	analyticParameters(query, b, out) {
		const tau = query.seconds / b.unit;
		const carrier = Math.min(tau, b.touchdown);
		const leafEnable = ease((b.touchdown - carrier) / b.frameStep);
		this.frameAt(b.lower, carrier, out);
		const lower = boundedCParameters(out, b.lower.touchdown, tau);
		lower.leafWidthDelta = leafEnable * carrierWidthDelta(b.lower, carrier);
		let parameters = lower;
		if (b.upper !== b.lower) {
			this.frameAt(b.upper, carrier, this.analyticOther);
			const upper = boundedCParameters(this.analyticOther, b.upper.touchdown, tau);
			upper.leafWidthDelta = leafEnable * carrierWidthDelta(b.upper, carrier);
			parameters = blendBoundedCParameters(lower, upper, b.weight);
			for (let i = 0; i < FLOATS; i++) out[i] += b.weight * (this.analyticOther[i] - out[i]);
		}
		return parameters;
	}
	analyticShape(query, b, out) {
		const parameters = this.analyticParameters(query, b, out);
		const clockKey = [
			query.slope,
			query.footHeight,
			query.footDepth
		].join(",");
		const meta = sampleBoundedC(parameters, out, false, this.analyticClocks.get(clockKey)?.event, true);
		meta.sharedSheet = pairInnerSheet(out, meta);
		meta.lengthScale = b.scale;
		meta.timeScale = b.unit;
		for (let i = 0; i < FLOATS; i++) out[i] *= b.scale;
		return meta;
	}
	/** Lifecycle uses the identical final carrier/parameter blend; it does not construct a full contour. */
	analyticClock(query, b) {
		const key = [
			query.slope,
			query.footHeight,
			query.footDepth
		].join(",");
		let clock = this.analyticClocks.get(key);
		if (!clock) {
			const final = boundedCLifecycle(this.analyticParameters({
				...query,
				seconds: b.touchdown * b.unit
			}, b, this.scratch));
			clock = {
				impact: final.impactTau,
				retired: final.retiredTau,
				clear: final.fullyFormedTau,
				event: final.impactEvent
			};
			if (this.analyticClocks.size >= 64) this.analyticClocks.delete(this.analyticClocks.keys().next().value);
			this.analyticClocks.set(key, clock);
		}
		return clock;
	}
	/** F32 stage order matches analyticShape: raw carrier, parameters, ND cap, then metric cap. */
	analyticCap(query, b, raw, event) {
		const cap = boundedCCap(this.analyticParameters(query, b, raw), event);
		return [Math.fround(cap[0] * b.scale), Math.fround(cap[1] * b.scale)];
	}
	analyticAt(query, b, out) {
		const key = [
			query.slope,
			query.footHeight,
			query.footDepth,
			query.seconds
		].join(",");
		const cached = this.analyticQueries.get(key);
		if (cached) {
			out.set(cached.profile);
			return cached.lookup;
		}
		const clock = this.analyticClock(query, b);
		const meta = this.analyticShape(query, b, out);
		meta.impactTau = clock.impact;
		meta.retiredTau = clock.retired;
		const dt = Math.max(1e-8, 1e-5 * b.touchdown * b.unit);
		const earlier = this.analyticCap({
			...query,
			seconds: query.seconds - dt
		}, b, this.analyticEarlier, clock.event);
		const later = this.analyticCap({
			...query,
			seconds: query.seconds + dt
		}, b, this.analyticLater, clock.event);
		const tipAlong = (later[0] - earlier[0]) / (2 * dt);
		const tipUp = (later[1] - earlier[1]) / (2 * dt);
		meta.capBoundaryVelocity = [tipAlong * b.unit / b.scale, tipUp * b.unit / b.scale];
		const phase = query.seconds < 0 ? "pre" : query.seconds <= meta.impactTau * b.unit ? "open" : "post";
		const lookup = {
			caseId: b.weight < .5 ? b.lower.id : b.upper.id,
			clamped: b.clamped,
			scale: b.scale,
			phase,
			touchdownSeconds: meta.impactTau * b.unit,
			frameSeconds: b.frameStep * b.unit,
			tipAlong,
			tipUp,
			clearSeconds: meta.fullyFormedTau * b.unit,
			collapseSeconds: (meta.retiredTau - meta.impactTau) * b.unit,
			analytic: meta
		};
		if (this.analyticQueries.size >= 64) this.analyticQueries.delete(this.analyticQueries.keys().next().value);
		this.analyticQueries.set(key, {
			profile: out.slice(),
			lookup
		});
		return lookup;
	}
	/**
	* Each blended case's τ for the slice's geometry and for its tip's velocity (lower, upper; then their tips), at the
	* slice's τ and hold (`ProfileQuery.hold`).
	*/
	caseTimes(b, tau, hold) {
		const times = this.times;
		const after = tau > b.touchdown;
		const shape = hold !== void 0 && after ? b.touchdown : tau;
		const contact = hold === "contact";
		times[0] = contact ? Math.min(shape, b.heldLower) : shape;
		times[1] = contact ? Math.min(shape, b.heldUpper) : shape;
		times[2] = after && hold !== void 0 ? times[0] : tau;
		times[3] = after && hold !== void 0 ? times[1] : tau;
		return times;
	}
	/** One case's profile point at τ (√(h0/g)), h0, into `out`, linear between frames as `frameAt`. */
	landmarkAt(c, tau, point, out) {
		const count = c.frames.length / FLOATS;
		const position = Math.min(count - 1, Math.max(0, (tau - c.tauStart) / c.tauStep));
		const f = Math.floor(position);
		const next = Math.min(count - 1, f + 1);
		const t = position - f;
		for (let k = 0; k < 2; k += 1) {
			const a = c.frames[f * FLOATS + 2 * point + k];
			out[k] = a + t * (c.frames[next * FLOATS + 2 * point + k] - a);
		}
	}
	/** One case's profile at τ (√(h0/g)), linear between its two nearest frames, clamped to its first and last. */
	frameAt(c, tau, out) {
		const count = c.frames.length / FLOATS;
		const position = Math.min(count - 1, Math.max(0, (tau - c.tauStart) / c.tauStep));
		const f = Math.floor(position);
		const next = Math.min(count - 1, f + 1);
		const t = position - f;
		for (let i = 0; i < FLOATS; i += 1) {
			const a = c.frames[f * FLOATS + i];
			out[i] = a + t * (c.frames[next * FLOATS + i] - a);
		}
	}
	/** One case's tip velocity at τ, √(g h0), linear between frames as `frameAt` (zero for a BRL1 case). */
	tipAt(c, tau, into) {
		into[0] = 0;
		into[1] = 0;
		if (!c.tipVelocity) return;
		const count = c.tipVelocity.length / 2;
		const position = Math.min(count - 1, Math.max(0, (tau - c.tauStart) / c.tauStep));
		const f = Math.floor(position);
		const next = Math.min(count - 1, f + 1);
		const t = position - f;
		into[0] = c.tipVelocity[2 * f] + t * (c.tipVelocity[2 * next] - c.tipVelocity[2 * f]);
		into[1] = c.tipVelocity[2 * f + 1] + t * (c.tipVelocity[2 * next + 1] - c.tipVelocity[2 * f + 1]);
	}
};
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
//#region src/wave/barrel/barrelLibrary.ts
/** The index's cases for one spot (Part B, PR 7): a spot loads only its own transect's cases. */
function barrelCasesFor(spot, cases = BARREL_CASES) {
	return cases.filter((entry) => entry.spot === spot);
}
//#endregion
//#region src/wave/barrel/nodeBarrelCases.ts
/** The index's case files from public/, for node tests and probes (the page fetches them): one spot's, or all. */
function readBarrelCases(spot) {
	return (spot ? barrelCasesFor(spot) : BARREL_CASES).map((entry) => new Uint8Array(readFileSync(`public/${entry.asset}`)));
}
//#endregion
//#region src/wave/barrel/frontRecords.ts
const FRONT_FIELD = {
	x: 0,
	z: 1,
	front: 2,
	sigma: 3,
	tau: 4,
	footHeight: 5,
	footDepth: 6,
	throwZ: 7,
	pace: 8
};
//#endregion
//#region src/wave/Bathymetry.ts
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
//#region src/wave/barrel/crestRays.ts
/**
* Base slices divide a span of at least 2*extension into ceil(span/spacing) intervals; refinement halves them.
* Since ceil(a)<a+1, this lower bound also covers very short fronts and nonintegral spans.
*/
function minimumCrestRaySpacing(extension, spacing) {
	return .5 * spacing * (2 * extension) / (2 * extension + spacing);
}
/** Immutable provider bounds are shared by the drawing, contact and crash plans. */
const envelopes = /* @__PURE__ */ new WeakMap();
/**
* One phase/tessellation-independent ray authority over a complete front and its shoulder extensions. Both input
* paths capture the same float32 transport controls. The raw vector V=C(sigma+2)-C(sigma-2) is piecewise linear;
* shifted control knots bound its length and nearby source derivative pairs bound its normalized derivative at every
* sigma, including between drawn rows. The nearby-pair bound stays continuous when shifted knots coincide.
* For any pair separated by dSigma, BOTH endpoint tangent advances are at least
* dSigma*(B-U*D-R*(1-lambda)*Omega/L): B=min C'·Tref, U=max|C'|, R=profile reach,
* D=max|n-nref|, Omega=max|nRaw'| and L=min|blend|. Own-profile offsets cancel at their own endpoints.
*/
var CrestRayPlan = class {
	library;
	slope;
	extension;
	minSpacing;
	diagnostics = {
		blend: 0,
		minimumAdvancePerSigma: 0,
		invalidIntervals: 0
	};
	envelope;
	lowCase;
	highCase;
	count = 0;
	x = /* @__PURE__ */ new Float64Array(0);
	z = /* @__PURE__ */ new Float64Array(0);
	sigma = /* @__PURE__ */ new Float64Array(0);
	height = /* @__PURE__ */ new Float64Array(0);
	depth = /* @__PURE__ */ new Float64Array(0);
	knots = /* @__PURE__ */ new Float64Array(0);
	derivativeX = /* @__PURE__ */ new Float64Array(0);
	derivativeZ = /* @__PURE__ */ new Float64Array(0);
	a = /* @__PURE__ */ new Float64Array(2);
	b = /* @__PURE__ */ new Float64Array(2);
	v = /* @__PURE__ */ new Float64Array(2);
	referenceX = 0;
	referenceZ = 1;
	constructor(library, slope, extension = 1.5, minSpacing = minimumCrestRaySpacing(extension, .5)) {
		this.library = library;
		this.slope = slope;
		this.extension = extension;
		this.minSpacing = minSpacing;
		let bySlope = envelopes.get(library);
		if (!bySlope) {
			bySlope = /* @__PURE__ */ new Map();
			envelopes.set(library, bySlope);
		}
		let envelope = bySlope.get(slope);
		if (!envelope) {
			envelope = library.crestReachBounds(slope);
			bySlope.set(slope, envelope);
		}
		this.envelope = envelope;
		let closest = library.cases[0]?.slope ?? slope;
		for (const c of library.cases) if (Math.abs(c.slope - slope) < Math.abs(closest - slope)) closest = c.slope;
		let low = Infinity;
		let high = -Infinity;
		for (const c of library.cases) if (c.slope === closest) {
			low = Math.min(low, c.nonlinearity);
			high = Math.max(high, c.nonlinearity);
		}
		this.lowCase = low;
		this.highCase = high;
	}
	prepare(controls, start = 0, end = controls.length) {
		this.load(end - start, (i, key) => controls[start + i][key]);
	}
	prepareRecords(records, start, end) {
		this.load(end - start, (i, key) => records[(start + i) * 9 + FRONT_FIELD[key]]);
	}
	/** C loft only: chosen X is already F32, and the actual stored sigma words are checked pair by pair. */
	prepareStoredColumns(records, start, end, xs, sigmas, count) {
		if (this.library.options.geometry !== "bounded-C") throw new RangeError("Stored column proof is C-only");
		this.load(end - start, (i, key) => records[(start + i) * 9 + FRONT_FIELD[key]], true);
		this.diagnostics.blend = 1;
		let dxMin = Infinity, dsMin = Infinity, progress = Infinity;
		if (!Number.isSafeInteger(count) || count < 2 || count > xs.length || count > sigmas.length) {
			this.diagnostics.invalidIntervals += 1;
			return;
		}
		for (let k = 0; k < count; k += 1) {
			const x = xs[k], sigma = Math.fround(sigmas[k]);
			if (!Number.isFinite(x) || x !== Math.fround(x) || !Number.isFinite(sigma)) {
				this.diagnostics.invalidIntervals += 1;
				continue;
			}
			if (k === 0) continue;
			const dx = x - xs[k - 1], ds = sigma - Math.fround(sigmas[k - 1]);
			if (!(dx > 0 && ds > 0)) {
				this.diagnostics.invalidIntervals += 1;
				continue;
			}
			dxMin = Math.min(dxMin, dx);
			dsMin = Math.min(dsMin, ds);
			progress = Math.min(progress, dx / ds);
		}
		this.diagnostics.minimumStoredDeltaX = dxMin === Infinity ? 0 : dxMin;
		this.diagnostics.minimumStoredDeltaSigma = dsMin === Infinity ? 0 : dsMin;
		if (this.diagnostics.invalidIntervals === 0) this.diagnostics.minimumAdvancePerSigma = progress;
	}
	load(count, read, storedColumns = false) {
		if (this.x.length < count) {
			const capacity = Math.max(count, 2 * this.x.length);
			this.x = new Float64Array(capacity);
			this.z = new Float64Array(capacity);
			this.sigma = new Float64Array(capacity);
			this.height = new Float64Array(capacity);
			this.depth = new Float64Array(capacity);
			this.knots = new Float64Array(2 * capacity + 4);
			this.derivativeX = new Float64Array(capacity + 1);
			this.derivativeZ = new Float64Array(capacity + 1);
		}
		this.count = count;
		this.diagnostics.blend = 0;
		this.diagnostics.minimumAdvancePerSigma = 0;
		this.diagnostics.invalidIntervals = 0;
		delete this.diagnostics.minimumStoredDeltaX;
		delete this.diagnostics.minimumStoredDeltaSigma;
		for (let k = 0; k < count; k += 1) {
			this.x[k] = Math.fround(read(k, "x"));
			this.z[k] = Math.fround(read(k, "z"));
			this.sigma[k] = Math.fround(read(k, "sigma"));
			this.height[k] = Math.fround(read(k, "footHeight"));
			this.depth[k] = Math.fround(read(k, "footDepth"));
			if (!Number.isFinite(this.x[k]) || !Number.isFinite(this.z[k]) || !Number.isFinite(this.sigma[k]) || !Number.isFinite(this.height[k]) || !Number.isFinite(this.depth[k])) throw new RangeError("Non-finite front ray control");
			if (k > 0 && (!(this.x[k] > this.x[k - 1]) || !(this.sigma[k] > this.sigma[k - 1]))) this.diagnostics.invalidIntervals += 1;
		}
		if (count < 2 || this.diagnostics.invalidIntervals > 0) return;
		if (!storedColumns) this.prepareBound();
	}
	prepareBound() {
		if (this.library.options.geometry === "bounded-C") {
			const last = this.count - 1;
			let progress = Infinity;
			let maximumX = 0;
			for (let k = 0; k <= last; k += 1) {
				maximumX = Math.max(maximumX, Math.abs(this.x[k]));
				if (k === last) continue;
				const dx = this.x[k + 1] - this.x[k];
				const dz = this.z[k + 1] - this.z[k];
				progress = Math.min(progress, dx / (this.sigma[k + 1] - this.sigma[k]));
				if (k === 0 || k + 1 === last) progress = Math.min(progress, dx / Math.hypot(dx, dz));
			}
			const ulp = 2 ** (Math.floor(Math.log2(Math.max(1, maximumX + this.extension))) - 23);
			const stored = progress - 2 * ulp / this.minSpacing;
			this.diagnostics.blend = 1;
			if (!(stored > 0)) {
				this.diagnostics.invalidIntervals += 1;
				return;
			}
			this.diagnostics.minimumAdvancePerSigma = stored;
			return;
		}
		const last = this.count - 1;
		let lowSlope = -Infinity;
		let highSlope = Infinity;
		let maximumCoordinate = 0;
		let maximumScale = 0;
		for (let k = 0; k <= last; k += 1) {
			maximumCoordinate = Math.max(maximumCoordinate, Math.abs(this.x[k]), Math.abs(this.z[k]));
			maximumScale = Math.max(maximumScale, this.library.caseBlend({
				slope: this.slope,
				footHeight: this.height[k],
				footDepth: this.depth[k]
			}).scale);
			if (k === last) continue;
			const dx = this.x[k + 1] - this.x[k];
			const dz = this.z[k + 1] - this.z[k];
			if (dz > 0) lowSlope = Math.max(lowSlope, -dx / dz);
			if (dz < 0) highSlope = Math.min(highSlope, -dx / dz);
			for (let side = 0; side < 2; side += 1) {
				const edge = side === 0 ? this.lowCase : this.highCase;
				const a = this.height[k] - edge * this.depth[k];
				const b = this.height[k + 1] - edge * this.depth[k + 1];
				if (a < 0 && b > 0 || a > 0 && b < 0) {
					const share = a / (a - b);
					maximumScale = Math.max(maximumScale, this.depth[k] + share * (this.depth[k + 1] - this.depth[k]));
				}
			}
		}
		let slope = (this.z[last] - this.z[0]) / (this.x[last] - this.x[0]);
		if (lowSlope !== -Infinity) slope = Math.max(slope, .9 * lowSlope);
		if (highSlope !== Infinity) slope = Math.min(slope, .9 * highSlope);
		const norm = Math.sqrt(1 + slope * slope);
		const tx = 1 / norm;
		const tz = slope / norm;
		this.referenceX = -tz;
		this.referenceZ = tx;
		let speed = 1;
		let progress = Infinity;
		for (let k = 0; k < last; k += 1) {
			const dx = this.x[k + 1] - this.x[k];
			const dz = this.z[k + 1] - this.z[k];
			const length = Math.sqrt(dx * dx + dz * dz);
			const ds = this.sigma[k + 1] - this.sigma[k];
			this.derivativeX[k + 1] = dx / ds;
			this.derivativeZ[k + 1] = dz / ds;
			if (k === 0) {
				this.derivativeX[0] = dx / length;
				this.derivativeZ[0] = dz / length;
			}
			if (k + 1 === last) {
				this.derivativeX[this.count] = dx / length;
				this.derivativeZ[this.count] = dz / length;
			}
			speed = Math.max(speed, length / ds);
			progress = Math.min(progress, (dx * tx + dz * tz) / ds);
			if (k === 0 || k + 1 === last) progress = Math.min(progress, (dx * tx + dz * tz) / length);
		}
		const reach = Math.max(Math.abs(this.envelope[0]), Math.abs(this.envelope[1])) * maximumScale + this.extension;
		const from = this.sigma[0] - this.extension;
		const to = this.sigma[last] + this.extension;
		let used = 0;
		this.knots[used++] = from;
		this.knots[used++] = to;
		for (let k = 0; k <= last; k += 1) {
			const left = this.sigma[k] - 2;
			const right = this.sigma[k] + 2;
			if (left > from && left < to) this.knots[used++] = left;
			if (right > from && right < to) this.knots[used++] = right;
		}
		this.knots.subarray(0, used).sort();
		let minimumVectorLength = Infinity;
		let cosine = 1;
		this.rawVector(this.knots[0], this.a);
		for (let k = 1; k < used; k += 1) {
			if (!(this.knots[k] - this.knots[k - 1] > 0)) continue;
			this.rawVector(this.knots[k], this.b);
			const dx = this.b[0] - this.a[0];
			const dz = this.b[1] - this.a[1];
			const squared = dx * dx + dz * dz;
			const share = squared > 0 ? Math.max(0, Math.min(1, -(this.a[0] * dx + this.a[1] * dz) / squared)) : 0;
			const mx = this.a[0] + share * dx;
			const mz = this.a[1] + share * dz;
			const minimumLength = Math.sqrt(mx * mx + mz * mz);
			if (!(minimumLength > 1e-9)) {
				this.diagnostics.invalidIntervals += 1;
				return;
			}
			minimumVectorLength = Math.min(minimumVectorLength, minimumLength);
			const la = Math.sqrt(this.a[0] * this.a[0] + this.a[1] * this.a[1]);
			const lb = Math.sqrt(this.b[0] * this.b[0] + this.b[1] * this.b[1]);
			cosine = Math.min(cosine, (this.a[0] * tx + this.a[1] * tz) / la, (this.b[0] * tx + this.b[1] * tz) / lb);
			this.a[0] = this.b[0];
			this.a[1] = this.b[1];
		}
		let derivativeDifference = 0;
		for (let i = 0; i <= this.count; i += 1) {
			const end = i < this.count ? this.sigma[i] : to + 2;
			for (let j = i + 1; j <= this.count; j += 1) {
				const start = this.sigma[j - 1];
				const gap = Math.max(0, start - end);
				if (gap >= 5) break;
				const weight = Math.min(1, 5 - gap);
				const dx = this.derivativeX[j] - this.derivativeX[i];
				const dz = this.derivativeZ[j] - this.derivativeZ[i];
				derivativeDifference = Math.max(derivativeDifference, weight * Math.sqrt(dx * dx + dz * dz));
			}
		}
		const omega = derivativeDifference / minimumVectorLength;
		cosine = Math.max(0, Math.min(1, cosine));
		const distance = Math.sqrt(2 - 2 * cosine);
		const rounding = (4 * (maximumCoordinate + reach + this.extension) + 1) / (1048576 * this.minSpacing);
		const target = .05 * progress + rounding;
		const bound = (weight) => {
			const u = 1 - weight;
			const length = Math.sqrt(1 - 2 * u * weight * (1 - cosine));
			return progress - u / length * (2 * speed * distance + reach * omega);
		};
		if (target >= progress) {
			this.diagnostics.invalidIntervals += 1;
			this.diagnostics.blend = 1;
			return;
		}
		if (bound(0) >= target) {
			this.diagnostics.minimumAdvancePerSigma = bound(0);
			return;
		}
		let lower = 0;
		let upper = 1;
		for (let k = 0; k < 24; k += 1) {
			const middle = (lower + upper) / 2;
			if (bound(middle) >= target) upper = middle;
			else lower = middle;
		}
		this.diagnostics.blend = upper;
		this.diagnostics.minimumAdvancePerSigma = bound(upper);
	}
	/** Evaluate the original polyline/extrapolation arithmetic over captured transport controls. */
	pointAt(at, into) {
		const last = this.count - 1;
		if (at <= this.sigma[0] || at >= this.sigma[last]) {
			const k = at <= this.sigma[0] ? 0 : last;
			const neighbor = k === 0 ? 1 : last - 1;
			const dx = this.x[k] - this.x[neighbor];
			const dz = this.z[k] - this.z[neighbor];
			const length = Math.sqrt(dx * dx + dz * dz);
			const beyond = k === 0 ? this.sigma[0] - at : at - this.sigma[last];
			into[0] = this.x[k];
			into[1] = this.z[k];
			if (length > 1e-9) {
				into[0] += beyond * dx / length;
				into[1] += beyond * dz / length;
			}
			return;
		}
		let low = 1;
		let high = last;
		while (low < high) {
			const mid = low + high >>> 1;
			if (this.sigma[mid] < at) low = mid + 1;
			else high = mid;
		}
		const k = low - 1;
		const ds = this.sigma[k + 1] - this.sigma[k];
		const share = ds > 1e-12 ? (at - this.sigma[k]) / ds : 0;
		into[0] = this.x[k] + share * (this.x[k + 1] - this.x[k]);
		into[1] = this.z[k] + share * (this.z[k + 1] - this.z[k]);
	}
	rawVector(at, into) {
		this.pointAt(at + 2, this.v);
		const x = this.v[0];
		const z = this.v[1];
		this.pointAt(at - 2, this.v);
		into[0] = x - this.v[0];
		into[1] = z - this.v[1];
	}
	rayAt(sigma, into) {
		if (this.library.options.geometry === "bounded-C") {
			into[0] = 0;
			into[1] = 1;
			return into;
		}
		if (this.count < 2) {
			into[0] = 0;
			into[1] = 1;
			return into;
		}
		this.rawVector(sigma, into);
		const length = Math.sqrt(into[0] * into[0] + into[1] * into[1]);
		if (length > 1e-9) {
			into[0] /= length;
			into[1] /= length;
		} else {
			into[0] = 1;
			into[1] = 0;
		}
		const nx = -into[1];
		const nz = into[0];
		const weight = this.diagnostics.blend;
		if (weight === 0) {
			into[0] = nx;
			into[1] = nz;
			return into;
		}
		into[0] = nx + weight * (this.referenceX - nx);
		into[1] = nz + weight * (this.referenceZ - nz);
		const n = Math.sqrt(into[0] * into[0] + into[1] * into[1]);
		into[0] /= n;
		into[1] /= n;
		return into;
	}
};
//#endregion
//#region src/wave/barrel/lipSheet.ts
/**
* The lip as a thin sheet and the tube's inside, per profile (the Padang Padang spec, item 16; tube-colour-fix.md; the
* advisor's rulings, 2026-10-01): the lip's thickness across, what its far side sees, and what the inner face sees.
* Exact per profile (`sheetAcross`, `throatViews`), and kept per library frame so a slice only blends them
* (`sheetTablesLookup`). Only + − × ÷ √.
*/
const LAST$2 = 127;
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
/**
* The tube's inside as its inner face sees it (the Padang Padang spec, item 16's dark throat; the advisor's rulings,
* 2026-10-01), per profile point from the tip back under the lip to the throat and down the face to the toe (64–112),
* into `out` (4 a point): the sky through the opening (`tubeSkyView`); the lip's underside, from the face only (the arc
* from the tip up to the throat, `arcView`); and 1. Elsewhere the open sky, no lip, 0. The normals are the profile's,
* out of the water.
*/
function throatViews(profile, out) {
	const { lip, throat, toe } = LANDMARK;
	const tipX = profile[2 * lip];
	const tipY = profile[2 * lip + 1];
	const throatX = profile[2 * throat];
	const throatY = profile[2 * throat + 1];
	for (let i = 0; i < 128; i += 1) {
		const o = 4 * i;
		if (i < lip || i > toe) {
			out[o] = 1;
			out[o + 1] = 0;
			out[o + 2] = 0;
			continue;
		}
		const a = i > 0 ? i - 1 : i;
		const b = i < LAST$2 ? i + 1 : i;
		const dx = profile[2 * b] - profile[2 * a];
		const dy = profile[2 * b + 1] - profile[2 * a + 1];
		const length = Math.sqrt(dx * dx + dy * dy);
		const x = profile[2 * i];
		const y = profile[2 * i + 1];
		const nx = length > 0 ? -dy / length : 0;
		const ny = length > 0 ? dx / length : 1;
		out[o] = tubeSkyView(x, y, nx, ny, tipX, tipY);
		const ux = tipX - x;
		const uy = tipY - y;
		const vx = throatX - x;
		const vy = throatY - y;
		out[o + 1] = i > throat && ux * vy - uy * vx > 0 ? arcView(nx, ny, ux, uy, vx, vy) : 0;
		out[o + 2] = 1;
	}
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
const tablesOf = /* @__PURE__ */ new WeakMap();
/** A case's tables, built at its first use: `sheetAcross` on each frame in h0 (scale 1). */
function caseTables(c) {
	let tables = tablesOf.get(c);
	if (tables) return tables;
	const floats = 256;
	const count = c.frames.length / floats;
	tables = {
		across: new Float32Array(count * 128),
		back: new Float32Array(count * 128),
		formed: new Float32Array(count)
	};
	const profile = new Float32Array(floats);
	const across = /* @__PURE__ */ new Float32Array(128);
	const back = /* @__PURE__ */ new Float32Array(128);
	for (let f = 0; f < count; f += 1) {
		profile.set(c.frames.subarray(f * floats, (f + 1) * floats));
		across.fill(0);
		back.fill(0);
		tables.formed[f] = sheetAcross(profile, 1, across, back);
		tables.across.set(across, f * 128);
		tables.back.set(back, f * 128);
	}
	tablesOf.set(c, tables);
	return tables;
}
/** One table's value at point i, blended: each case's frames lerped, then the cases by weight. */
function blended(lower, upper, blend, i) {
	const lf = blend.lowerFrame * 128 + i;
	const ln = blend.lowerNext * 128 + i;
	const uf = blend.upperFrame * 128 + i;
	const un = blend.upperNext * 128 + i;
	const a = lower[lf] + blend.lowerShare * (lower[ln] - lower[lf]);
	const b = upper[uf] + blend.upperShare * (upper[un] - upper[uf]);
	return a + blend.weight * (b - a);
}
/**
* A slice's lip thickness (m) and far side's view, blended from its cases' frames as its profile is
* (`ProfileLibrary.frameBlend`), into `out`; returns how far its underside has formed. A blend's sheet is not exactly
* the blended profile's, but at these shapes it is close (the advisor, 2026-10-01): over 321 blends of the library's
* open frames, the red channel's transmission through the sheet differs by 1.2 % at the 99th percentile and 1.9 % at
* most, the far side's view by 0.04 and 0.12 (a test holds them). Thickness scales with h0; the view is scale-free.
* The inner face's views move faster with the shape (0.26 at worst blended), and cost little, so the loft takes them
* exactly (`throatViews`).
*/
function sheetTablesLookup(blend, out) {
	if (blend.analyticProfile) {
		out.across.fill(0);
		out.back.fill(0);
		return blend.analytic?.sheetExists ? sheetAcross(blend.analyticProfile, blend.scale, out.across, out.back) : 0;
	}
	const lower = caseTables(blend.lower);
	const upper = caseTables(blend.upper);
	for (let i = 0; i < 128; i += 1) {
		out.across[i] = blend.scale * blended(lower.across, upper.across, blend, i);
		out.back[i] = blended(lower.back, upper.back, blend, i);
	}
	const formedLower = lower.formed[blend.lowerFrame] + blend.lowerShare * (lower.formed[blend.lowerNext] - lower.formed[blend.lowerFrame]);
	const formedUpper = upper.formed[blend.upperFrame] + blend.upperShare * (upper.formed[blend.upperNext] - upper.formed[blend.upperFrame]);
	return formedLower + blend.weight * (formedUpper - formedLower);
}
//#endregion
//#region src/wave/barrel/sweptLoft.before.ts
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
const LOFT$1 = {
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
const LOFT_SAMPLES$1 = 128 + 2 * LOFT$1.extensionSamples;
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
const REST$1 = {
	behind: .1,
	ramp: .5,
	near: .1,
	ahead: 3,
	step: .5
};
/** H for `REST`, m: the crest's height over the lower of the water at the toe and at the profile's front end. */
function restHeight$1(crestY, toeY, frontY) {
	return Math.max(1e-6, crestY - (toeY < frontY ? toeY : frontY));
}
Object.fromEntries(Object.entries(BARREL_SPOTS).flatMap(([spot, barrel]) => barrel ? [[spot, barrel.slope]] : []));
const MAX_SLICES$1 = Math.floor(LOFT$1.budget / LOFT_SAMPLES$1);
const MAX_C_SURVEY_STATIONS$1 = 65536;
const C_CAP_REFINEMENT$1 = {
	levels: 3,
	minimumSpan: .0625,
	maximumSagitta: .015
};
const E$1 = LOFT$1.extensionSamples;
const EXTENSION_STEP$1 = LOFT$1.extension / E$1;
const LAST$1 = 127;
const PHASE$1 = {
	pre: 0,
	open: 1,
	post: 2
};
/**
* A slice's fade after touchdown: 1 until then, falling to 0 over its tube's collapse, √(2W/g) (the advisor,
* 2026-09-30: neither the drawing nor the contact may outlast the pocket); a tube without a void goes at touchdown.
*/
function collapseFade$1(tau, touchdown, collapse) {
	if (tau <= touchdown) return 1;
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
var SweptLoft$1 = class SweptLoft$1 {
	library;
	slope;
	result;
	normalDemand = false;
	/** Exact double initial recipes; only the private ordinary query backend defers Y. */
	initialX = /* @__PURE__ */ new Float64Array(0);
	initialZ = /* @__PURE__ */ new Float64Array(0);
	targetY = /* @__PURE__ */ new Float64Array(0);
	initialBlend = /* @__PURE__ */ new Float64Array(0);
	sharedSheetRows = new Uint8Array(MAX_SLICES$1);
	sharedSheetX = /* @__PURE__ */ new Float64Array(21);
	sharedSheetZ = /* @__PURE__ */ new Float64Array(21);
	sharedSheetWater = /* @__PURE__ */ new Float64Array(21);
	sealBlend = /* @__PURE__ */ new Float64Array(0);
	sealApplies = /* @__PURE__ */ new Uint8Array(0);
	heightReady = /* @__PURE__ */ new Uint8Array(0);
	rowHeightAt;
	normalReady = /* @__PURE__ */ new Uint8Array(0);
	normalFirst = /* @__PURE__ */ new Int32Array(0);
	normalLast = /* @__PURE__ */ new Int32Array(0);
	profile = /* @__PURE__ */ new Float32Array(256);
	/** Per front, its slices' σ, before and after refinement. */
	base = new Float64Array(2 * MAX_SLICES$1 + 8);
	sigmas = new Float64Array(2 * MAX_SLICES$1 + 8);
	cBaseX = new Float64Array(2 * MAX_SLICES$1 + 8);
	cBaseKind = new Uint8Array(2 * MAX_SLICES$1 + 8);
	cX = new Float64Array(2 * MAX_SLICES$1 + 8);
	cKind = new Uint8Array(2 * MAX_SLICES$1 + 8);
	/** Three (world Z, metric Y) cap probes per bounded subdivision level. C rays are exactly [0,1]. */
	cCapPoints = new Float64Array(6 * C_CAP_REFINEMENT$1.levels);
	sample = {
		x: 0,
		z: 0,
		tau: 0,
		footHeight: 0,
		footDepth: 0,
		pace: 0
	};
	probe = {
		x: 0,
		z: 0,
		tau: 0,
		footHeight: 0,
		footDepth: 0,
		pace: 0
	};
	query;
	point = /* @__PURE__ */ new Float64Array(2);
	velocity = /* @__PURE__ */ new Float64Array(2);
	/** A slice's forward rest (`forwardRest`): its hold and end, m past the toe, and the climbs where it eases and at the toe. */
	rest = /* @__PURE__ */ new Float64Array(4);
	/** Per slice, its anchor (x, z) and its drawn profile's reach along its ray past its extensions, m: its footprint. */
	anchorX = new Float64Array(MAX_SLICES$1 + 1);
	anchorZ = new Float64Array(MAX_SLICES$1 + 1);
	reachBack = new Float64Array(MAX_SLICES$1 + 1);
	reachFront = new Float64Array(MAX_SLICES$1 + 1);
	/** Reusable planned sigma samples: x, z, tau, foot height, foot depth, pace (double precision). */
	planned = /* @__PURE__ */ new Float64Array(0);
	/** Planned C states: 0 omitted, 1 live, 2 intrinsically retired ordinary-water support. RAW uses 0/1. */
	plannedLive = /* @__PURE__ */ new Uint8Array(0);
	retirementRow = new Uint8Array(MAX_SLICES$1 + 1);
	plannedRayX = /* @__PURE__ */ new Float64Array(0);
	plannedRayZ = /* @__PURE__ */ new Float64Array(0);
	rayPlan;
	plannedRay = /* @__PURE__ */ new Float64Array(2);
	/** Per strip, its footprint's corners (x, z × 4: its slices' back and front reach) and box (x0, x1, z0, z1). */
	corners = new Float64Array(8 * (MAX_SLICES$1 + 1));
	boxes = new Float64Array(4 * (MAX_SLICES$1 + 1));
	contact;
	measureSheet;
	holdClearDrawing;
	/** A slice's lip thickness per profile point, m, and its far side's view of the sky (`sheetAcross`). */
	sheets = {
		across: /* @__PURE__ */ new Float32Array(128),
		back: /* @__PURE__ */ new Float32Array(128)
	};
	/** A slice's throat views per profile point (`throatViews`). */
	inside = /* @__PURE__ */ new Float32Array(512);
	/** How the drawing's profile blends its cases' frames, for the sheet's tables (`ProfileLibrary.frameBlend`). */
	blend = {
		weight: 0,
		scale: 0,
		lowerFrame: 0,
		lowerNext: 0,
		lowerShare: 0,
		upperFrame: 0,
		upperNext: 0,
		upperShare: 0
	};
	constructor(library, slope, options = {}) {
		this.library = library;
		this.slope = slope;
		this.contact = options.contact ?? false;
		this.measureSheet = options.sheet ?? !this.contact;
		this.holdClearDrawing = !this.contact && (options.holdClearDrawing ?? false);
		this.rayPlan = new CrestRayPlan(library, slope, LOFT$1.extension, minimumCrestRaySpacing(LOFT$1.extension, LOFT$1.spacing));
		this.query = {
			slope,
			footHeight: 0,
			footDepth: 0,
			seconds: 0
		};
		const vertices = (MAX_SLICES$1 + 1) * LOFT_SAMPLES$1;
		const slices = MAX_SLICES$1 + 1;
		this.result = {
			positions: new Float32Array(3 * vertices),
			normals: new Float32Array(3 * vertices),
			mask: new Float32Array(vertices),
			lift: new Float32Array(vertices),
			sheet: new Float32Array(vertices),
			sheetWeight: new Float32Array(vertices),
			sheetBack: new Float32Array(vertices),
			throat: new Float32Array(4 * vertices),
			indices: new Uint32Array(6 * (LOFT_SAMPLES$1 - 1) * slices),
			vertexCount: 0,
			indexCount: 0,
			sliceCount: 0,
			sliceFront: new Int32Array(slices),
			sliceSigma: new Float32Array(slices),
			sliceTau: new Float32Array(slices),
			slicePhase: new Uint8Array(slices),
			sliceLife: new Float32Array(slices),
			sliceCollapse: new Float32Array(slices),
			sliceFade: new Float32Array(slices),
			sliceTipGap: new Float32Array(slices),
			tipGap: 0,
			sliceRestHold: new Float32Array(slices),
			sliceRestEnd: new Float32Array(slices),
			sliceRestClimb: new Float32Array(slices),
			sliceToeClimb: new Float32Array(slices),
			restSamples: 0,
			clamps: 0,
			clampedLookups: 0,
			overlaps: 0,
			overlapsOpen: 0,
			overlapOpenWeight: 0,
			rayCorrections: 0,
			rayMaxBlend: 0,
			rayMinAdvance: 0,
			rayInvalidIntervals: 0,
			sliceJoined: new Uint8Array(slices),
			sliceRayX: new Float32Array(slices),
			sliceRayZ: new Float32Array(slices),
			sliceWeight: new Float32Array(slices),
			sliceOverturned: new Uint8Array(slices),
			sliceTipAlong: new Float32Array(slices),
			sliceTipUp: new Float32Array(slices),
			sliceAnchorVX: new Float32Array(slices),
			sliceAnchorVZ: new Float32Array(slices),
			sliceTipTransportAlong: new Float32Array(slices),
			sliceTipTransportUp: new Float32Array(slices),
			sliceFormed: new Float32Array(slices),
			sliceTipX: new Float32Array(slices),
			sliceTipY: new Float32Array(slices),
			sliceTipZ: new Float32Array(slices),
			sliceMouth: new Float32Array(slices)
		};
	}
	/** Internal query backend only: no mutable LoftResult escapes the worker owner. */
	static forContactQueries(library, slope) {
		const loft = new SweptLoft$1(library, slope, { contact: true });
		loft.normalDemand = true;
		const vertices = loft.result.positions.length / 3;
		loft.initialX = new Float64Array(vertices);
		loft.initialZ = new Float64Array(vertices);
		loft.targetY = new Float64Array(vertices);
		loft.initialBlend = new Float64Array(vertices);
		loft.sealBlend = new Float64Array(MAX_SLICES$1 + 1);
		loft.sealApplies = new Uint8Array(vertices);
		loft.heightReady = new Uint8Array(MAX_SLICES$1 + 1);
		loft.normalReady = new Uint8Array(loft.result.positions.length / 3);
		loft.normalFirst = new Int32Array(MAX_SLICES$1 + 1);
		loft.normalLast = new Int32Array(MAX_SLICES$1 + 1);
		return {
			build: loft.build.bind(loft),
			prepareRow: loft.prepareRow.bind(loft),
			prepareNormal: loft.prepareNormal.bind(loft)
		};
	}
	/** Loft the records' fronts over the water (`heightAt`). */
	build(records, count, stillLevel, heightAt) {
		const r = this.result;
		if (this.normalDemand) {
			this.heightReady.fill(0);
			this.sealBlend.fill(1);
			this.sealApplies.fill(0);
			this.rowHeightAt = count > 0 ? heightAt : void 0;
			this.normalReady.fill(0);
			this.normalFirst.fill(-1);
			this.normalLast.fill(-1);
		}
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
		const boundedC = this.library.options.geometry === "bounded-C";
		if (boundedC) this.retirementRow.fill(0);
		if (boundedC) r.cSampling = {
			policy: "fixed-origin-stored-F32-X-and-raw-knots/v1",
			mandatoryRawKnots: 0,
			plannedStations: 0,
			omittedPrecisionStations: 0,
			collapsedShoulders: 0,
			budgetTruncated: false,
			firstOmittedPlannedX: null,
			omittedFronts: 0,
			minimumStoredDeltaX: Infinity,
			minimumStoredDeltaSigma: Infinity,
			retirement: {
				policy: "one-adjacent-intrinsic-dead-water-row/v1",
				plannedSupports: 0,
				retainedSupports: 0,
				omittedDeadStations: 0,
				budgetOmittedSupports: 0,
				budgetClampedDeadStations: 0,
				detachedSupports: 0
			}
		};
		const fronts = this.fronts(records, count);
		if (r.cSampling) r.cSampling.mandatoryRawKnots = fronts.reduce((n, f) => n + f.end - f.start, 0);
		let samples = 0;
		for (const f of fronts) samples = Math.max(samples, boundedC ? this.cStationBound(f, LOFT$1.spacing) : Math.ceil((f.last - f.first + 2 * LOFT$1.extension) / LOFT$1.spacing) + 1);
		if (boundedC) this.cScratch(samples);
		if (this.base.length < samples) this.base = new Float64Array(Math.max(samples, 2 * this.base.length));
		if (this.sigmas.length < 2 * samples) this.sigmas = new Float64Array(Math.max(2 * samples, 2 * this.sigmas.length));
		let live = 0;
		let extra = 0;
		for (const f of fronts) {
			const survey = this.survey(records, f);
			live += survey.live;
			extra += survey.extra;
		}
		let spacing = LOFT$1.spacing;
		let budgeted = live + extra > MAX_SLICES$1;
		if (live > MAX_SLICES$1) spacing = LOFT$1.spacing * live / Math.max(1, MAX_SLICES$1 - 2 * fronts.length);
		for (let frontIndex = 0; frontIndex < fronts.length; frontIndex += 1) {
			const f = fronts[frontIndex];
			if (r.sliceCount >= MAX_SLICES$1) {
				if (r.cSampling) {
					r.cSampling.budgetTruncated = true;
					r.cSampling.omittedFronts = fronts.length - frontIndex;
				}
				break;
			}
			const n = boundedC ? this.cRefinements(records, f, spacing, !budgeted) : budgeted ? this.baseSlices(f, spacing, this.sigmas) : this.refinements(records, f, spacing);
			if (r.cSampling) r.cSampling.plannedStations += n;
			this.loftFront(records, f, n, budgeted, stillLevel, heightAt);
			if (boundedC && r.cSampling.budgetTruncated) {
				r.cSampling.omittedFronts = fronts.length - frontIndex - 1;
				break;
			}
		}
		this.measureRayAdvance();
		this.dropOverlaps();
		this.sealRuns(heightAt);
		this.triangulate();
		if (r.cSampling) {
			for (let s = 0; s < r.sliceCount; s += 1) if (this.retirementRow[s] === 1 && r.sliceJoined[s] !== 1 && !(s > 0 && r.sliceJoined[s - 1] === 1)) r.cSampling.retirement.detachedSupports += 1;
			if (r.cSampling.minimumStoredDeltaX === Infinity) r.cSampling.minimumStoredDeltaX = 0;
			if (r.cSampling.minimumStoredDeltaSigma === Infinity) r.cSampling.minimumStoredDeltaSigma = 0;
		}
		return r;
	}
	/** The records' fronts, in order; one of fewer than two points, or all at one σ, has no tangent and is left out. */
	fronts(records, count) {
		const fronts = [];
		const boundedC = this.library.options.geometry === "bounded-C";
		if (boundedC && (!Number.isSafeInteger(count) || count < 0 || count > MAX_C_SURVEY_STATIONS$1 || count * 9 > records.length)) throw new RangeError("Unsupported C packet count");
		let start = 0;
		while (start < count) {
			const id = records[start * 9 + FRONT_FIELD.front];
			let end = start + 1;
			while (end < count && records[end * 9 + FRONT_FIELD.front] === id) end += 1;
			const first = records[start * 9 + FRONT_FIELD.sigma];
			const last = records[(end - 1) * 9 + FRONT_FIELD.sigma];
			if (boundedC) {
				if (!Number.isFinite(id)) throw new RangeError("Non-finite C front identity");
				for (let k = start; k < end; k += 1) {
					const o = k * 9;
					for (const key of [
						"x",
						"z",
						"sigma",
						"tau",
						"footHeight",
						"footDepth"
					]) if (!Number.isFinite(records[o + FRONT_FIELD[key]])) throw new RangeError("Non-finite C packet control: " + key);
					if (!(records[o + FRONT_FIELD.footHeight] > 0 && records[o + FRONT_FIELD.footDepth] > 0)) throw new RangeError("Non-positive C packet scale");
					const pace = records[o + FRONT_FIELD.pace];
					if (!Number.isFinite(pace) && !Number.isNaN(pace)) throw new RangeError("Unsupported C packet pace");
					if (k > start && (!(records[o + FRONT_FIELD.x] > records[o - 9 + FRONT_FIELD.x]) || !(records[o + FRONT_FIELD.sigma] > records[o - 9 + FRONT_FIELD.sigma]))) throw new RangeError("C packet X/sigma must be strictly increasing stored words");
				}
				if (end - start >= 2) {
					const a = start * 9, b = (end - 1) * 9;
					const dx0 = records[a + 9 + FRONT_FIELD.x] - records[a + FRONT_FIELD.x], dz0 = records[a + 9 + FRONT_FIELD.z] - records[a + FRONT_FIELD.z];
					const dx1 = records[b + FRONT_FIELD.x] - records[b - 9 + FRONT_FIELD.x], dz1 = records[b + FRONT_FIELD.z] - records[b - 9 + FRONT_FIELD.z];
					const x0 = records[a + FRONT_FIELD.x], x1 = records[b + FRONT_FIELD.x];
					const fromX = Math.fround(x0 - LOFT$1.extension * dx0 / Math.hypot(dx0, dz0)), toX = Math.fround(x1 + LOFT$1.extension * dx1 / Math.hypot(dx1, dz1));
					if (![fromX, toX].every(Number.isFinite)) throw new RangeError("Unsupported C shoulder coordinates");
					if (this.result.cSampling) this.result.cSampling.collapsedShoulders += Number(fromX === x0) + Number(toX === x1);
					fronts.push({
						id,
						start,
						end,
						first,
						last,
						fromX,
						toX
					});
				}
			} else if (end - start >= 2 && last - first > 1e-6) fronts.push({
				id,
				start,
				end,
				first,
				last
			});
			start = end;
		}
		return fronts;
	}
	/** Upper bound before allocation: zero-origin integer lattice plus EVERY raw knot and both shoulders. */
	cStationBound(f, spacing) {
		const low = Math.ceil(f.fromX / spacing), high = Math.floor(f.toX / spacing);
		const count = Math.max(0, high - low + 1) + f.end - f.start + 2;
		if (!(spacing > 0) || !Number.isFinite(spacing) || !Number.isSafeInteger(low) || !Number.isSafeInteger(high) || !Number.isSafeInteger(count) || count > MAX_C_SURVEY_STATIONS$1) throw new RangeError("Unsupported C stored-X lattice/survey domain");
		return count;
	}
	cScratch(count) {
		if (this.cBaseX.length < count) {
			const n = Math.max(count, 2 * this.cBaseX.length);
			this.cBaseX = new Float64Array(n);
			this.cBaseKind = new Uint8Array(n);
		}
		if (this.cX.length < 8 * count) {
			const n = Math.max(8 * count, 2 * this.cX.length);
			this.cX = new Float64Array(n);
			this.cKind = new Uint8Array(n);
			if (this.sigmas.length < n) this.sigmas = new Float64Array(n);
		}
	}
	/** Direct X parameter sampling. Raw knots copy exact packet words; sigma never locates the sample. */
	atX(records, f, x, into) {
		const field = (k, key) => records[k * 9 + FRONT_FIELD[key]];
		const copy = (k) => {
			into.x = x;
			into.z = field(k, "z");
			into.tau = field(k, "tau");
			into.footHeight = field(k, "footHeight");
			into.footDepth = field(k, "footDepth");
			into.pace = field(k, "pace");
		};
		const firstX = field(f.start, "x"), lastX = field(f.end - 1, "x");
		if (x <= firstX || x >= lastX) {
			const k = x <= firstX ? f.start : f.end - 1, other = k === f.start ? k + 1 : k - 1;
			copy(k);
			if (x === field(k, "x")) return field(k, "sigma");
			const dx = field(k, "x") - field(other, "x"), dz = field(k, "z") - field(other, "z"), length = Math.hypot(dx, dz);
			if (x === f.fromX || x === f.toX) {
				const beyond = k === f.start ? -LOFT$1.extension : LOFT$1.extension;
				into.z += Math.abs(beyond) * dz / length;
				return field(k, "sigma") + beyond;
			}
			const share = (x - field(k, "x")) / dx;
			into.z += share * dz;
			return field(k, "sigma") + (k === f.start ? -1 : 1) * share * length;
		}
		let low = f.start + 1, high = f.end - 1;
		while (low < high) {
			const mid = low + high >>> 1;
			if (field(mid, "x") < x) low = mid + 1;
			else high = mid;
		}
		if (x === field(low, "x")) {
			copy(low);
			return field(low, "sigma");
		}
		const k = low - 1, t = (x - field(k, "x")) / (field(low, "x") - field(k, "x"));
		const lerp = (key) => field(k, key) + t * (field(low, key) - field(k, key));
		into.x = x;
		into.z = lerp("z");
		into.tau = lerp("tau");
		into.footHeight = lerp("footHeight");
		into.footDepth = lerp("footDepth");
		const a = field(k, "pace"), b = field(low, "pace");
		into.pace = a === a ? b === b ? a + t * (b - a) : a : b;
		return lerp("sigma");
	}
	/** Merge priority raw=2, shoulder=1, regular/refinement=0; no epsilon merges a distinct raw knot. */
	cAppend(records, f, x, kind, xs, sigmas, kinds, count) {
		const sigma = this.atX(records, f, x, this.probe), stored = Math.fround(sigma);
		if (!Number.isFinite(x) || x !== Math.fround(x) || !Number.isFinite(stored)) throw new RangeError("Unsupported C stored station precision");
		while (count > 0) {
			const previousX = xs[count - 1], previousSigma = Math.fround(sigmas[count - 1]);
			if (x > previousX && stored > previousSigma) break;
			if (x < previousX || stored < previousSigma) throw new RangeError("C stored station order reversed");
			if (kind === 2 && kinds[count - 1] === 2) throw new RangeError("Distinct C raw knot collapsed in stored X/sigma");
			if (this.result.cSampling) this.result.cSampling.omittedPrecisionStations += 1;
			if (kind <= kinds[count - 1]) return count;
			count -= 1;
		}
		xs[count] = x;
		sigmas[count] = sigma;
		kinds[count] = kind;
		return count + 1;
	}
	cBaseSlices(records, f, spacing) {
		this.cScratch(this.cStationBound(f, spacing));
		let out = this.cAppend(records, f, f.fromX, 1, this.cBaseX, this.base, this.cBaseKind, 0);
		let raw = f.start, j = Math.ceil(f.fromX / spacing);
		const high = Math.floor(f.toX / spacing);
		while (raw < f.end || j <= high) {
			const rawX = raw < f.end ? records[raw * 9 + FRONT_FIELD.x] : Infinity;
			const regularX = j <= high ? Math.fround(j * spacing) : Infinity;
			const x = Math.min(rawX, regularX), kind = rawX <= regularX ? 2 : 0;
			if (rawX === x) raw += 1;
			if (regularX === x) j += 1;
			if (x >= f.fromX && x <= f.toX) out = this.cAppend(records, f, x, kind, this.cBaseX, this.base, this.cBaseKind, out);
		}
		return this.cAppend(records, f, f.toX, 1, this.cBaseX, this.base, this.cBaseKind, out);
	}
	cRefinements(records, f, spacing, refine) {
		const n = this.cBaseSlices(records, f, spacing);
		let out = 0, previousTau = 0, previousFrame = 0;
		for (let k = 0; k < n; k += 1) {
			this.atX(records, f, this.cBaseX[k], this.sample);
			const tau = this.sample.tau, frame = this.library.profileTimes({
				slope: this.slope,
				footHeight: this.sample.footHeight,
				footDepth: this.sample.footDepth
			}).frameSeconds;
			if (refine && k > 0) {
				const clockMidpoint = Math.abs(tau - previousTau) > LOFT$1.frames * Math.min(frame, previousFrame);
				out = this.cRefineCap(records, f, this.cBaseX[k - 1], this.cBaseX[k], clockMidpoint, 0, out);
			}
			out = this.cAppend(records, f, this.cBaseX[k], this.cBaseKind[k], this.cX, this.sigmas, this.cKind, out);
			previousTau = tau;
			previousFrame = frame;
		}
		return out;
	}
	/** Actual fully formed pre-impact cap, before world-water/end projection. Artificial seams keep their old plan. */
	cCapAt(records, f, x, offset) {
		const s = this.probe, sigma = this.atX(records, f, x, s);
		if (Math.min(sigma - f.first, f.last - sigma) < LOFT$1.endBlend) return false;
		const query = this.query;
		query.footHeight = s.footHeight;
		query.footDepth = s.footDepth;
		query.seconds = s.tau;
		query.hold = "drawing";
		const times = this.library.profileTimes(query);
		if (s.tau < times.clearSeconds || s.tau > times.touchdownSeconds) return false;
		this.library.pointAt(query, LANDMARK.lip, this.point);
		const along = this.point[0], y = this.point[1];
		this.library.pointAt(query, LANDMARK.crest, this.point);
		this.cCapPoints[offset] = Math.fround(s.z - this.point[0] + along);
		this.cCapPoints[offset + 1] = y;
		return true;
	}
	/** Bounded local additions; raw knots and every original clock midpoint retain cAppend's existing priority. */
	cRefineCap(records, f, left, right, clockMidpoint, level, out) {
		if (level >= C_CAP_REFINEMENT$1.levels) return out;
		const middle = Math.fround((left + right) / 2);
		if (!(middle > left && middle < right)) {
			if (clockMidpoint && this.result.cSampling) this.result.cSampling.omittedPrecisionStations += 1;
			return out;
		}
		const o = 6 * level;
		let bent = false;
		if (right - left > C_CAP_REFINEMENT$1.minimumSpan && this.cCapAt(records, f, left, o) && this.cCapAt(records, f, right, o + 2)) {
			const cap = this.cCapPoints;
			for (let quarter = 1; quarter <= 3; quarter++) {
				const x = quarter === 2 ? middle : Math.fround(left + (right - left) * quarter / 4);
				if (!this.cCapAt(records, f, x, o + 4)) {
					bent = false;
					break;
				}
				const share = (x - left) / (right - left);
				const dz = cap[o + 4] - (cap[o] + share * (cap[o + 2] - cap[o]));
				const dy = cap[o + 5] - (cap[o + 1] + share * (cap[o + 3] - cap[o + 1]));
				if (Math.hypot(dz, dy) > C_CAP_REFINEMENT$1.maximumSagitta) bent = true;
			}
		}
		if (!clockMidpoint && !bent) return out;
		const leftSigma = Math.fround(this.atX(records, f, left, this.probe));
		const rightSigma = Math.fround(this.atX(records, f, right, this.probe));
		const middleSigma = Math.fround(this.atX(records, f, middle, this.probe));
		if (!(middleSigma > leftSigma && middleSigma < rightSigma)) {
			if (clockMidpoint) return this.cAppend(records, f, middle, 0, this.cX, this.sigmas, this.cKind, out);
			if (this.result.cSampling) this.result.cSampling.omittedPrecisionStations += 1;
			return out;
		}
		out = this.cRefineCap(records, f, left, middle, false, level + 1, out);
		out = this.cAppend(records, f, middle, 0, this.cX, this.sigmas, this.cKind, out);
		return this.cRefineCap(records, f, middle, right, false, level + 1, out);
	}
	/** A front's slices every `spacing` or less, evenly from one extension's end to the other's, into `out`; how many. */
	baseSlices(f, spacing, out) {
		const from = f.first - LOFT$1.extension;
		const span = f.last - f.first + 2 * LOFT$1.extension;
		const n = Math.ceil(span / spacing) + 1;
		const step = span / (n - 1);
		for (let k = 0; k < n; k += 1) out[k] = from + k * step;
		return n;
	}
	/**
	* A front's base slices at `spacing` that have not faded after touchdown (the rest are dropped), and the midpoints
	* the live ones need (neighbouring clocks more than `frames` frames apart).
	*/
	survey(records, f) {
		const boundedC = this.library.options.geometry === "bounded-C";
		const n = boundedC ? this.cBaseSlices(records, f, LOFT$1.spacing) : this.baseSlices(f, LOFT$1.spacing, this.base);
		let live = 0;
		let extra = 0;
		let previous = NaN;
		let previousFrame = 0;
		for (let k = 0; k < n; k += 1) {
			const s = boundedC ? (this.atX(records, f, this.cBaseX[k], this.probe), this.probe) : this.at(records, f, this.base[k], this.probe);
			const times = this.library.profileTimes({
				slope: this.slope,
				footHeight: s.footHeight,
				footDepth: s.footDepth
			});
			if (collapseFade$1(s.tau, times.touchdownSeconds, times.collapseSeconds) === 0) {
				previous = NaN;
				continue;
			}
			live += 1;
			if (Math.abs(s.tau - previous) > LOFT$1.frames * Math.min(times.frameSeconds, previousFrame)) extra += 1;
			previous = s.tau;
			previousFrame = times.frameSeconds;
		}
		return {
			live,
			extra
		};
	}
	/** A front's base slices, with the midpoints where neighbouring clocks differ by more than `frames` frames, into `sigmas`; how many. */
	refinements(records, f, spacing) {
		const n = this.baseSlices(f, spacing, this.base);
		let out = 0;
		let previousTau = 0;
		let previousFrame = 0;
		for (let k = 0; k < n; k += 1) {
			const s = this.at(records, f, this.base[k], this.probe);
			const frame = this.library.profileTimes({
				slope: this.slope,
				footHeight: s.footHeight,
				footDepth: s.footDepth
			}).frameSeconds;
			if (k > 0 && Math.abs(s.tau - previousTau) > LOFT$1.frames * Math.min(frame, previousFrame)) this.sigmas[out++] = (this.base[k - 1] + this.base[k]) / 2;
			this.sigmas[out++] = this.base[k];
			previousTau = s.tau;
			previousFrame = frame;
		}
		return out;
	}
	/** Front f's values at σ (see `Sample`), into `into`. */
	at(records, f, sigma, into) {
		const field = (k, name) => records[k * 9 + FRONT_FIELD[name]];
		const copy = (k) => {
			into.x = field(k, "x");
			into.z = field(k, "z");
			into.tau = field(k, "tau");
			into.footHeight = field(k, "footHeight");
			into.footDepth = field(k, "footDepth");
			into.pace = field(k, "pace");
		};
		const runOn = (from, to, beyond) => {
			const dx = field(to, "x") - field(from, "x");
			const dz = field(to, "z") - field(from, "z");
			const length = Math.sqrt(dx * dx + dz * dz);
			if (length > 1e-9) {
				into.x += beyond * dx / length;
				into.z += beyond * dz / length;
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
		let low = f.start + 1;
		let high = f.end - 1;
		while (low < high) {
			const middle = low + high >>> 1;
			if (field(middle, "sigma") < sigma) low = middle + 1;
			else high = middle;
		}
		const k = low - 1;
		const s0 = field(k, "sigma");
		const s1 = field(k + 1, "sigma");
		const t = s1 - s0 > 1e-12 ? (sigma - s0) / (s1 - s0) : 0;
		const lerp = (name) => field(k, name) + t * (field(k + 1, name) - field(k, name));
		into.x = lerp("x");
		into.z = lerp("z");
		into.tau = lerp("tau");
		into.footHeight = lerp("footHeight");
		into.footDepth = lerp("footDepth");
		const pace0 = field(k, "pace");
		const pace1 = field(k + 1, "pace");
		into.pace = pace0 === pace0 ? pace1 === pace1 ? pace0 + t * (pace1 - pace0) : pace0 : pace1;
		return into;
	}
	/** Sample the planned crest/ray/scale once, preserving the original live-run and budget-clock decisions. */
	/** C-only closure rows: keep intrinsic clocks; a dead sample never participates in budget clock lowering. */
	planCColumns(records, f, n, budgeted) {
		const r = this.result, diagnostics = r.cSampling.retirement;
		let inRun = false, previousTau = 0;
		for (let k = 0; k < n; k += 1) {
			const s = this.sample, sigma = this.sigmas[k];
			this.atX(records, f, this.cX[k], s);
			const times = this.library.profileTimes({
				slope: this.slope,
				footHeight: s.footHeight,
				footDepth: s.footDepth
			});
			let tau = s.tau;
			const intrinsicDead = collapseFade$1(tau, times.touchdownSeconds, times.collapseSeconds) === 0;
			if (intrinsicDead) inRun = false;
			else if (budgeted && inRun) {
				const bound = times.touchdownSeconds / 4;
				const clamped = Math.min(previousTau + bound, Math.max(previousTau - bound, tau));
				if (clamped !== tau) r.clamps += 1;
				tau = clamped;
			}
			const live = !intrinsicDead && collapseFade$1(tau, times.touchdownSeconds, times.collapseSeconds) > 0;
			this.plannedLive[k] = intrinsicDead ? 2 : live ? 1 : 0;
			if (!intrinsicDead && !live) diagnostics.budgetClampedDeadStations += 1;
			inRun = live;
			if (live) previousTau = tau;
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
		}
		for (let k = 0; k < n; k += 1) if (this.plannedLive[k] === 2) {
			if (k > 0 && this.plannedLive[k - 1] === 1 || k + 1 < n && this.plannedLive[k + 1] === 1) diagnostics.plannedSupports += 1;
			else {
				this.plannedLive[k] = 0;
				diagnostics.omittedDeadStations += 1;
			}
		}
		let retained = 0, limit = n, lastSelected = -1;
		for (let k = 0; k < n; k += 1) {
			if (this.plannedLive[k] === 0) continue;
			if (r.sliceCount + retained >= MAX_SLICES$1) {
				r.cSampling.budgetTruncated = true;
				limit = k;
				if (lastSelected >= 0 && this.plannedLive[lastSelected] === 2 && !(lastSelected > 0 && this.plannedLive[lastSelected - 1] === 1)) limit = lastSelected;
				r.cSampling.firstOmittedPlannedX ??= this.cX[limit];
				break;
			}
			retained += 1;
			lastSelected = k;
		}
		for (let k = 0; k < n; k += 1) if (this.plannedLive[k] === 2) {
			if (k < limit) diagnostics.retainedSupports += 1;
			else diagnostics.budgetOmittedSupports += 1;
		}
		if (this.rayPlan.diagnostics.blend > 0) {
			for (let k = 0; k < limit; k += 1) if (this.plannedLive[k] !== 0) r.rayCorrections += 1;
		}
		return limit;
	}
	planRays(records, f, n, budgeted) {
		if (this.plannedLive.length < n) {
			const capacity = Math.max(n, 2 * this.plannedLive.length);
			this.planned = new Float64Array(6 * capacity);
			this.plannedLive = new Uint8Array(capacity);
			this.plannedRayX = new Float64Array(capacity);
			this.plannedRayZ = new Float64Array(capacity);
		}
		this.plannedLive.fill(0, 0, n);
		const boundedC = this.library.options.geometry === "bounded-C";
		if (boundedC) this.rayPlan.prepareStoredColumns(records, f.start, f.end, this.cX, this.sigmas, n);
		else this.rayPlan.prepareRecords(records, f.start, f.end);
		if (boundedC && this.rayPlan.diagnostics.invalidIntervals) throw new RangeError("Unsupported C actual stored column proof");
		if (this.result.cSampling) {
			this.result.cSampling.minimumStoredDeltaX = Math.min(this.result.cSampling.minimumStoredDeltaX, this.rayPlan.diagnostics.minimumStoredDeltaX);
			this.result.cSampling.minimumStoredDeltaSigma = Math.min(this.result.cSampling.minimumStoredDeltaSigma, this.rayPlan.diagnostics.minimumStoredDeltaSigma);
		}
		const r = this.result;
		r.rayMaxBlend = Math.max(r.rayMaxBlend, this.rayPlan.diagnostics.blend);
		r.rayInvalidIntervals += this.rayPlan.diagnostics.invalidIntervals;
		if (boundedC) return this.planCColumns(records, f, n, budgeted);
		let live = 0;
		let inRun = false;
		let previousTau = 0;
		let limit = n;
		for (let k = 0; k < n; k += 1) {
			const sigma = this.sigmas[k];
			const s = boundedC ? (this.atX(records, f, this.cX[k], this.sample), this.sample) : this.at(records, f, sigma, this.sample);
			const times = this.library.profileTimes({
				slope: this.slope,
				footHeight: s.footHeight,
				footDepth: s.footDepth
			});
			let tau = s.tau;
			if (budgeted && inRun) {
				const bound = times.touchdownSeconds / 4;
				const clamped = Math.min(previousTau + bound, Math.max(previousTau - bound, tau));
				if (clamped !== tau) r.clamps += 1;
				tau = clamped;
			}
			if (collapseFade$1(tau, times.touchdownSeconds, times.collapseSeconds) === 0) {
				inRun = false;
				continue;
			}
			if (r.sliceCount + live >= MAX_SLICES$1) {
				if (r.cSampling) {
					r.cSampling.budgetTruncated = true;
					r.cSampling.firstOmittedPlannedX ??= this.cX[k];
				}
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
			if (this.rayPlan.diagnostics.blend > 0) r.rayCorrections += 1;
		}
		return limit;
	}
	loftFront(records, f, n, budgeted, stillLevel, heightAt) {
		const r = this.result;
		const { profile } = this;
		let runStart = -1;
		const closeRun = () => {
			if (runStart >= 0) this.joinRun(runStart, r.sliceCount - 1);
			runStart = -1;
		};
		const plannedCount = this.planRays(records, f, n, budgeted);
		for (let k = 0; k < plannedCount; k += 1) {
			if (this.plannedLive[k] === 0) {
				closeRun();
				continue;
			}
			const retirementSupport = this.library.options.geometry === "bounded-C" && this.plannedLive[k] === 2;
			if (retirementSupport && k > 0 && this.plannedLive[k - 1] === 2) closeRun();
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
			const query = this.query;
			query.footHeight = s.footHeight;
			query.footDepth = s.footDepth;
			query.seconds = tau;
			query.hold = this.contact || this.holdClearDrawing ? "contact" : "drawing";
			const lookup = this.library.profileAt(query, profile);
			const touchdown = lookup.touchdownSeconds;
			const wFade = collapseFade$1(tau, touchdown, lookup.collapseSeconds);
			const wFormation = lookup.analytic?.formation ?? 1;
			if (retirementSupport && wFade !== 0) throw new Error("C retirement closure clocks disagree with its profile lookup");
			if (wFade === 0 && !retirementSupport) {
				closeRun();
				continue;
			}
			let tipGap = 0;
			let drawnCrestX = profile[2 * LANDMARK.crest];
			let crestY = profile[2 * LANDMARK.crest + 1];
			let drawnToeX = profile[2 * LANDMARK.toe];
			let toeY = profile[2 * LANDMARK.toe + 1];
			let frontY = profile[255];
			let drawnFrontX = profile[254];
			if (this.contact) {
				query.hold = "drawing";
				this.library.pointAt(query, LANDMARK.lip, this.point);
				const dx = this.point[0] - profile[2 * LANDMARK.lip];
				const dy = this.point[1] - profile[2 * LANDMARK.lip + 1];
				tipGap = Math.sqrt(dx * dx + dy * dy);
				this.library.pointAt(query, LANDMARK.crest, this.point);
				[drawnCrestX, crestY] = [this.point[0], this.point[1]];
				this.library.pointAt(query, LANDMARK.toe, this.point);
				[drawnToeX, toeY] = [this.point[0], this.point[1]];
				this.library.pointAt(query, LANDMARK.front, this.point);
				[drawnFrontX, frontY] = [this.point[0], this.point[1]];
			}
			const drawnHeight = restHeight$1(crestY, toeY, frontY);
			const reachBack = drawnCrestX - (REST$1.behind + REST$1.ramp) * drawnHeight;
			const d = Math.min(sigma - f.first, f.last - sigma);
			const r0 = Math.min(1, d / LOFT$1.endBlend);
			const w = (d <= 0 ? 0 : r0 * r0 * (3 - 2 * r0)) * wFade * wFormation;
			let overturned = 0;
			for (let i = LOFT$1.pinned; i < LAST$1 - LOFT$1.pinned; i += 1) if (profile[2 * (i + 1)] < profile[2 * i]) {
				overturned = 1;
				break;
			}
			if (r.sliceCount >= MAX_SLICES$1) break;
			if (runStart < 0) runStart = r.sliceCount;
			if (lookup.clamped) r.clampedLookups += 1;
			const crest = profile[2 * LANDMARK.crest];
			const ax = s.x - crest * nx;
			const az = s.z - crest * nz;
			let life = NaN;
			let anchorVX = 0;
			let anchorVZ = 0;
			if (tau >= 0) {
				life = tau / touchdown;
				if (this.contact) {
					const follow = this.crestPointVelocity(s, tau, lookup.frameSeconds, nx, nz);
					anchorVX = follow[0];
					anchorVZ = follow[1];
				}
			}
			const maskBand = Math.min(1, Math.max(0, 1 + d / LOFT$1.band));
			const maskSlice = this.library.options.geometry === "bounded-C" ? wFade * maskBand * wFormation : wFade > 0 ? maskBand : 0;
			const forward = this.rest;
			if (w > 0) this.forwardRest(ax, az, nx, nz, drawnToeX, stillLevel + frontY, drawnHeight, drawnFrontX + LOFT$1.extension - LOFT$1.band - drawnToeX, heightAt);
			else {
				forward[0] = 0;
				forward[1] = REST$1.ramp * drawnHeight;
				forward[2] = NaN;
				forward[3] = NaN;
			}
			const [restHold, restEnd] = [forward[0], forward[1]];
			const reachFront = drawnToeX + restEnd;
			let formed = 0;
			let lipThickness = 0;
			if (this.measureSheet && w > 0) {
				query.hold = this.holdClearDrawing ? "contact" : "drawing";
				formed = sheetTablesLookup(this.library.frameBlend(query, this.blend), this.sheets);
				if (formed > 0) {
					throatViews(profile, this.inside);
					for (let i = THROAT.thicknessFrom; i <= THROAT.thicknessTo; i += 1) lipThickness += this.sheets.across[i];
					lipThickness /= THROAT.thicknessTo - THROAT.thicknessFrom + 1;
				}
			}
			const slice = r.sliceCount;
			if (this.library.options.geometry === "bounded-C") this.retirementRow[slice] = retirementSupport ? 1 : 0;
			r.sliceFormed[slice] = formed;
			r.sliceFront[slice] = f.id;
			r.sliceSigma[slice] = sigma;
			r.sliceTau[slice] = tau;
			r.slicePhase[slice] = tau > touchdown ? PHASE$1.post : PHASE$1[lookup.phase];
			r.sliceLife[slice] = life;
			r.sliceCollapse[slice] = lookup.collapseSeconds;
			r.sliceFade[slice] = wFade;
			r.sliceTipGap[slice] = tipGap;
			if (tipGap > r.tipGap) r.tipGap = tipGap;
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
			const fluidScale = lookup.analytic ? lookup.analytic.lengthScale / lookup.analytic.timeScale : 1;
			r.sliceTipAlong[slice] = lookup.analytic ? lookup.analytic.fluidAlong * fluidScale : lookup.tipAlong;
			r.sliceTipUp[slice] = lookup.analytic ? lookup.analytic.fluidUp * fluidScale : lookup.tipUp;
			if (this.contact) {
				if (lookup.analytic) {
					r.sliceTipTransportAlong[slice] = lookup.tipAlong;
					r.sliceTipTransportUp[slice] = lookup.tipUp;
				} else {
					const transport = this.landmarkVelocity(s, tau, lookup.frameSeconds, LANDMARK.lip);
					r.sliceTipTransportAlong[slice] = transport[0];
					r.sliceTipTransportUp[slice] = transport[1];
				}
			} else {
				r.sliceTipTransportAlong[slice] = 0;
				r.sliceTipTransportUp[slice] = 0;
			}
			r.sliceAnchorVX[slice] = anchorVX;
			r.sliceAnchorVZ[slice] = anchorVZ;
			const profileCrestX = profile[2 * LANDMARK.crest];
			const toeX = profile[2 * LANDMARK.toe];
			const height = restHeight$1(profile[2 * LANDMARK.crest + 1], profile[2 * LANDMARK.toe + 1], profile[255]);
			const rampLength = REST$1.ramp * height;
			const restSpan = restEnd - restHold;
			const sharedSheet = lookup.analytic?.sharedSheet !== void 0;
			this.sharedSheetRows[slice] = sharedSheet ? 1 : 0;
			for (let j = 0; j < LOFT_SAMPLES$1; j += 1) {
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
				if (j < E$1) along = profile[0] - (E$1 - j) * EXTENSION_STEP$1;
				else if (j < E$1 + 128) {
					const i = j - E$1;
					along = profile[2 * i];
					above = profile[2 * i + 1];
					if (i < LANDMARK.crest) {
						const past = profileCrestX - along - REST$1.behind * height;
						const u = past > 0 ? Math.min(1, past / rampLength) : 0;
						pin = Math.max(u * u * (3 - 2 * u), i < LOFT$1.pinned ? (LOFT$1.pinned - i) / LOFT$1.pinned : 0);
						maskAlong = Math.min(1, Math.max(0, 1 - (past - rampLength) / LOFT$1.band));
					} else if (i > LANDMARK.toe) {
						const past = along - toeX;
						const u = past > restHold ? Math.min(1, (past - restHold) / restSpan) : 0;
						pin = u * u * (3 - 2 * u);
						maskAlong = Math.min(1, Math.max(0, 1 - (past - restEnd) / LOFT$1.band));
					} else {
						pin = 0;
						maskAlong = 1;
					}
					if (formed > 0 && i > LANDMARK.crest && i < LANDMARK.throat) {
						sheet = this.sheets.across[i];
						sheetBack = this.sheets.back[i];
						sheetShare = formed * Math.min(1, Math.min(i - LANDMARK.crest, LANDMARK.throat - i) / (SHEET.ramp + 1));
					}
					if (formed > 0) {
						sky = this.inside[4 * i];
						underLip = this.inside[4 * i + 1];
						inner = formed * this.inside[4 * i + 2];
					}
				} else {
					along = profile[254] + (j - E$1 - LAST$1) * EXTENSION_STEP$1;
					above = profile[255];
					const past = along - toeX;
					const u = past > restHold ? Math.min(1, (past - restHold) / restSpan) : 0;
					pin = u * u * (3 - 2 * u);
					maskAlong = Math.min(1, Math.max(0, 1 - (past - restEnd) / LOFT$1.band));
				}
				if (lookup.analytic?.sheetExists && j === E$1 + 104 && profile[207] === profile[209] && profile[209] === profile[211] && profile[2 * LANDMARK.lip] >= profile[206] && profile[2 * LANDMARK.lip] <= profile[210]) along = profile[2 * LANDMARK.lip];
				const v = slice * LOFT_SAMPLES$1 + j;
				const profileIndex = j - E$1;
				const sharedTop = sharedSheet && profileIndex >= 38 && profileIndex <= 58 ? profileIndex - 38 : -1;
				const sharedUnder = sharedSheet && profileIndex >= 68 && profileIndex <= 88 ? 88 - profileIndex : -1;
				const px = sharedUnder >= 0 ? this.sharedSheetX[sharedUnder] : ax + along * nx;
				const pz = sharedUnder >= 0 ? this.sharedSheetZ[sharedUnder] : az + along * nz;
				if (sharedTop >= 0) {
					this.sharedSheetX[sharedTop] = px;
					this.sharedSheetZ[sharedTop] = pz;
				}
				const e = w * (1 - pin);
				r.positions[3 * v] = px;
				if (this.normalDemand) {
					this.initialX[v] = px;
					this.initialZ[v] = pz;
					this.targetY[v] = stillLevel + above;
					this.initialBlend[v] = e;
				} else if (e === 1) r.positions[3 * v + 1] = stillLevel + above;
				else {
					const h = sharedUnder >= 0 ? this.sharedSheetWater[sharedUnder] : heightAt(px, pz);
					if (sharedTop >= 0) this.sharedSheetWater[sharedTop] = h;
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
			const tip = 3 * (slice * LOFT_SAMPLES$1 + E$1 + LANDMARK.lip);
			r.sliceTipX[slice] = r.positions[tip];
			r.sliceTipY[slice] = this.normalDemand ? NaN : r.positions[tip + 1];
			r.sliceTipZ[slice] = r.positions[tip + 2];
			r.sliceCount += 1;
		}
		closeRun();
		r.vertexCount = r.sliceCount * LOFT_SAMPLES$1;
	}
	/** Verify the float32 geometry using the exact rays the contact reads. */
	measureRayAdvance() {
		const r = this.result;
		let minimum = Infinity;
		for (let s = 0; s + 1 < r.sliceCount; s += 1) {
			if (r.sliceJoined[s] !== 1) continue;
			for (let j = 0; j < LOFT_SAMPLES$1; j += 1) {
				const a = 3 * (s * LOFT_SAMPLES$1 + j);
				const b = a + 3 * LOFT_SAMPLES$1;
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
		const ramp = REST$1.ramp * height;
		const near = REST$1.near * height;
		const cap = Math.max(0, Math.min(REST$1.ahead * height, room));
		const latest = Math.max(0, cap - ramp);
		let hold = latest;
		let climb = NaN;
		let previous = 0;
		let previousGap = 0;
		for (let k = 0;; k += 1) {
			const at = Math.min(k * REST$1.step, latest);
			const gap = heightAt(ax + (toeX + at) * nx, az + (toeX + at) * nz) - level;
			this.result.restSamples += 1;
			if (k === 0) out[3] = gap;
			if (gap <= near) {
				hold = k === 0 ? 0 : previous + (at - previous) * (previousGap - near) / (previousGap - gap);
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
		out[1] = hold + Math.max(Math.min(ramp, cap - hold), .001);
		out[2] = climb;
	}
	/** A run of consecutive slices: its normals, and its strips joined. */
	finishRun(firstSlice, lastSlice) {
		const r = this.result;
		if (this.normalDemand) {
			this.normalFirst.fill(firstSlice, firstSlice, lastSlice + 1);
			this.normalLast.fill(lastSlice, firstSlice, lastSlice + 1);
		} else this.normals(firstSlice, lastSlice);
		let open = r.sliceSigma[firstSlice];
		for (let s = firstSlice; s <= lastSlice; s += 1) {
			if (!(r.sliceFormed[s] > 0)) open = r.sliceSigma[s];
			r.sliceMouth[s] = r.sliceFormed[s] > 0 ? r.sliceSigma[s] - open : 0;
		}
		open = r.sliceSigma[lastSlice];
		for (let s = lastSlice; s >= firstSlice; s -= 1) {
			if (!(r.sliceFormed[s] > 0)) open = r.sliceSigma[s];
			if (r.sliceFormed[s] > 0) r.sliceMouth[s] = Math.min(r.sliceMouth[s], open - r.sliceSigma[s]);
		}
		this.joinRun(firstSlice, lastSlice);
	}
	/** Join before overlap decisions; normals and mouth are calculated once on the final surviving runs. */
	joinRun(firstSlice, lastSlice) {
		for (let s = firstSlice; s < lastSlice; s += 1) this.result.sliceJoined[s] = 1;
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
			while (last + 1 < r.sliceCount && r.sliceJoined[last] === 1) last += 1;
			const cutFirst = r.sliceWeight[first] > 0;
			const cutLast = r.sliceWeight[last] > 0;
			if (cutFirst || cutLast) for (let s = first; s <= last; s += 1) {
				const distance = Math.min(cutFirst ? r.sliceSigma[s] - r.sliceSigma[first] : Infinity, cutLast ? r.sliceSigma[last] - r.sliceSigma[s] : Infinity);
				const u = Math.min(1, Math.max(0, distance / LOFT$1.endBlend));
				const weight = u * u * (3 - 2 * u);
				const mask = Math.min(1, Math.max(0, distance / LOFT$1.band));
				r.sliceWeight[s] *= weight;
				if (this.normalDemand) this.sealBlend[s] = weight;
				for (let j = 0; j < LOFT_SAMPLES$1; j += 1) {
					const v = s * LOFT_SAMPLES$1 + j;
					if (weight < 1 && r.lift[v] > 0) {
						if (this.normalDemand) this.sealApplies[v] = 1;
						else {
							const water = heightAt(r.positions[3 * v], r.positions[3 * v + 2]);
							r.positions[3 * v + 1] = water + weight * (r.positions[3 * v + 1] - water);
						}
						r.lift[v] *= weight;
						r.sheetWeight[v] *= weight;
						r.throat[4 * v + 3] *= weight;
					}
					r.mask[v] *= mask;
				}
				if (!this.normalDemand) r.sliceTipY[s] = r.positions[3 * (s * LOFT_SAMPLES$1 + E$1 + LANDMARK.lip) + 1];
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
		const out = this.landmarkVelocity(s, tau, frameSeconds, LANDMARK.crest);
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
		query.hold = "contact";
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
			if (r.sliceJoined[s] !== 1) continue;
			const analytic = this.library.options.geometry === "bounded-C";
			for (let j = 0; j < LOFT_SAMPLES$1 - 1; j += 1) {
				const v00 = s * LOFT_SAMPLES$1 + j;
				const v10 = v00 + LOFT_SAMPLES$1;
				const i = r.indexCount;
				const a = 3 * v00, b = 3 * v10, p = r.positions;
				const reverse = analytic && (p[a + 3] - p[a]) * r.sliceRayX[s] + (p[a + 5] - p[a + 2]) * r.sliceRayZ[s] + (p[b + 3] - p[b]) * r.sliceRayX[s + 1] + (p[b + 5] - p[b + 2]) * r.sliceRayZ[s + 1] < 0;
				r.indices[i] = v00;
				r.indices[i + 1] = v10;
				r.indices[i + 2] = reverse ? v10 + 1 : v00 + 1;
				r.indices[i + 3] = reverse ? v00 : v00 + 1;
				r.indices[i + 4] = reverse ? v10 + 1 : v10;
				r.indices[i + 5] = reverse ? v00 + 1 : v10 + 1;
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
		const starts = [];
		const resting = (s) => !(r.sliceWeight[s] > 0) && !(r.sliceWeight[s + 1] > 0);
		for (let s = 0; s < r.sliceCount; s += 1) {
			if (s === 0 || r.sliceFront[s] !== r.sliceFront[s - 1]) starts.push(s);
			if (r.sliceJoined[s] !== 1) continue;
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
		if (starts.length < 2) return;
		starts.push(r.sliceCount);
		const frontBox = (f) => {
			const box = [
				Infinity,
				-Infinity,
				Infinity,
				-Infinity
			];
			for (let s = starts[f]; s < starts[f + 1]; s += 1) {
				if (r.sliceJoined[s] !== 1) continue;
				box[0] = Math.min(box[0], boxes[4 * s]);
				box[1] = Math.max(box[1], boxes[4 * s + 1]);
				box[2] = Math.min(box[2], boxes[4 * s + 2]);
				box[3] = Math.max(box[3], boxes[4 * s + 3]);
			}
			return box;
		};
		const apart = (a, i, b, j) => a[i + 1] < b[j] || b[j + 1] < a[i] || a[i + 3] < b[j + 2] || b[j + 3] < a[i + 2];
		for (let later = 1; later + 1 < starts.length; later += 1) for (let earlier = 0; earlier < later; earlier += 1) {
			if (apart(frontBox(later), 0, frontBox(earlier), 0)) continue;
			for (let s = starts[later]; s < starts[later + 1]; s += 1) {
				if (r.sliceJoined[s] !== 1) continue;
				for (let t = starts[earlier]; t < starts[earlier + 1]; t += 1) {
					if (r.sliceJoined[t] !== 1 || apart(boxes, 4 * s, boxes, 4 * t) || !this.hullsOverlap(8 * s, 8 * t)) continue;
					if (!resting(s) && resting(t)) {
						r.sliceJoined[t] = 0;
						continue;
					}
					r.sliceJoined[s] = 0;
					if (resting(s)) break;
					r.overlaps += 1;
					const weight = Math.max(r.sliceWeight[s], r.sliceWeight[s + 1]);
					if ((r.slicePhase[s] === 1 && r.sliceOverturned[s] === 1 || r.slicePhase[s + 1] === 1 && r.sliceOverturned[s + 1] === 1) && weight > 0) {
						r.overlapsOpen += 1;
						r.overlapOpenWeight = Math.max(r.overlapOpenWeight, weight);
					}
					break;
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
			for (let i = 0; i < 4; i += 1) for (let j = i + 1; j < 4; j += 1) {
				const ax = c[base + 2 * i + 1] - c[base + 2 * j + 1];
				const az = c[base + 2 * j] - c[base + 2 * i];
				if (ax === 0 && az === 0) continue;
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
				if (maxA <= minB || maxB <= minA) return false;
			}
		}
		return true;
	}
	/** Materialize the original initial F32 Y store, then its separate cut-seal F32 store, once for this row. */
	prepareRow(row) {
		if (this.heightReady[row] === 1) return;
		const r = this.result;
		const heightAt = this.rowHeightAt;
		if (!(row >= 0 && row < r.sliceCount) || !heightAt) throw new Error("Contact height row is outside its captured generation");
		const weight = this.sealBlend[row];
		const sharedSheet = this.sharedSheetRows[row] === 1;
		for (let j = 0; j < LOFT_SAMPLES$1; j += 1) {
			const v = row * LOFT_SAMPLES$1 + j;
			const o = 3 * v;
			const e = this.initialBlend[v];
			if (e === 1) r.positions[o + 1] = this.targetY[v];
			else {
				const profileIndex = j - E$1;
				const sharedTop = sharedSheet && profileIndex >= 38 && profileIndex <= 58 ? profileIndex - 38 : -1;
				const sharedUnder = sharedSheet && profileIndex >= 68 && profileIndex <= 88 ? 88 - profileIndex : -1;
				const h = sharedUnder >= 0 ? this.sharedSheetWater[sharedUnder] : heightAt(this.initialX[v], this.initialZ[v]);
				if (sharedTop >= 0) this.sharedSheetWater[sharedTop] = h;
				r.positions[o + 1] = e === 0 ? h : h + e * (this.targetY[v] - h);
			}
			if (this.sealApplies[v] === 1) {
				const water = heightAt(r.positions[o], r.positions[o + 2]);
				r.positions[o + 1] = water + weight * (r.positions[o + 1] - water);
			}
		}
		r.sliceTipY[row] = r.positions[3 * (row * LOFT_SAMPLES$1 + E$1 + LANDMARK.lip) + 1];
		this.heightReady[row] = 1;
	}
	/** Each vertex's normal: across the profile × along the front, by central differences (one-sided at the edges). */
	prepareNormal(vertex) {
		if (this.normalReady[vertex] === 1) return;
		const s = Math.floor(vertex / LOFT_SAMPLES$1);
		const j = vertex % LOFT_SAMPLES$1;
		const firstSlice = this.normalFirst[s];
		const lastSlice = this.normalLast[s];
		if (!(vertex >= 0 && vertex < this.result.vertexCount && firstSlice >= 0 && lastSlice >= firstSlice)) throw new Error("A selected contact normal is outside its captured final run");
		const { positions: p, normals } = this.result;
		const sBack = Math.max(firstSlice, s - 1);
		const sAhead = Math.min(lastSlice, s + 1);
		this.prepareRow(s);
		this.prepareRow(sBack);
		this.prepareRow(sAhead);
		const jBack = Math.max(0, j - 1);
		const jAhead = Math.min(LOFT_SAMPLES$1 - 1, j + 1);
		const a0 = 3 * (s * LOFT_SAMPLES$1 + jBack);
		const a1 = 3 * (s * LOFT_SAMPLES$1 + jAhead);
		const b0 = 3 * (sBack * LOFT_SAMPLES$1 + j);
		const b1 = 3 * (sAhead * LOFT_SAMPLES$1 + j);
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
		} else {
			cx = 0;
			cy = 1;
			cz = 0;
		}
		const o = 3 * vertex;
		normals[o] = cx;
		normals[o + 1] = cy;
		normals[o + 2] = cz;
		this.normalReady[vertex] = 1;
	}
	normals(firstSlice, lastSlice) {
		const { positions: p, normals } = this.result;
		for (let s = firstSlice; s <= lastSlice; s += 1) {
			const sBack = Math.max(firstSlice, s - 1);
			const sAhead = Math.min(lastSlice, s + 1);
			for (let j = 0; j < LOFT_SAMPLES$1; j += 1) {
				const jBack = Math.max(0, j - 1);
				const jAhead = Math.min(LOFT_SAMPLES$1 - 1, j + 1);
				const a0 = 3 * (s * LOFT_SAMPLES$1 + jBack);
				const a1 = 3 * (s * LOFT_SAMPLES$1 + jAhead);
				const b0 = 3 * (sBack * LOFT_SAMPLES$1 + j);
				const b1 = 3 * (sAhead * LOFT_SAMPLES$1 + j);
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
				} else {
					cx = 0;
					cy = 1;
					cz = 0;
				}
				const o = 3 * (s * LOFT_SAMPLES$1 + j);
				normals[o] = cx;
				normals[o + 1] = cy;
				normals[o + 2] = cz;
			}
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
const REST = {
	behind: .1,
	ramp: .5,
	near: .1,
	ahead: 3,
	step: .5
};
/** H for `REST`, m: the crest's height over the lower of the water at the toe and at the profile's front end. */
function restHeight(crestY, toeY, frontY) {
	return Math.max(1e-6, crestY - (toeY < frontY ? toeY : frontY));
}
Object.fromEntries(Object.entries(BARREL_SPOTS).flatMap(([spot, barrel]) => barrel ? [[spot, barrel.slope]] : []));
const MAX_SLICES = Math.floor(LOFT.budget / LOFT_SAMPLES);
const MAX_C_SURVEY_STATIONS = 65536;
const C_CAP_REFINEMENT = {
	levels: 3,
	minimumSpan: .0625,
	maximumSagitta: .015,
	maximumTurnDegrees: 8
};
/**
* Largest turn between four already-probed quarter chords in (storedX, metricY, storedZ).
* Slots are left/right/quarter/half/three-quarter, two words (Z,Y) each. Null means the
* direction cannot be resolved, including repeated F32 X or near-zero subtraction; it is not a zero turn.
*/
function sampledCapQuarterTurn(left, right, cap, offset = 0) {
	let x0 = left, z0 = cap[offset], y0 = cap[offset + 1];
	let ux0 = 0, uy0 = 0, uz0 = 0, maximum = 0;
	for (let quarter = 1; quarter <= 4; quarter++) {
		const x = quarter === 4 ? right : quarter === 2 ? Math.fround((left + right) / 2) : Math.fround(left + (right - left) * quarter / 4);
		const slot = quarter === 4 ? offset + 2 : offset + 2 * (quarter + 1);
		const z = cap[slot], y = cap[slot + 1], dx = x - x0, dy = y - y0, dz = z - z0;
		const length = Math.hypot(dx, dy, dz);
		const subtractionFloor = 64 * Number.EPSILON * Math.max(1, Math.abs(x), Math.abs(x0), Math.abs(y), Math.abs(y0), Math.abs(z), Math.abs(z0));
		if (!(x > x0) || !Number.isFinite(length) || !(length > subtractionFloor)) return null;
		const ux = dx / length, uy = dy / length, uz = dz / length;
		if (quarter > 1) {
			const cross = Math.hypot(uy0 * uz - uz0 * uy, uz0 * ux - ux0 * uz, ux0 * uy - uy0 * ux);
			const dot = Math.max(-1, Math.min(1, ux0 * ux + uy0 * uy + uz0 * uz));
			maximum = Math.max(maximum, Math.atan2(cross, dot) * 180 / Math.PI);
		}
		x0 = x;
		y0 = y;
		z0 = z;
		ux0 = ux;
		uy0 = uy;
		uz0 = uz;
	}
	return maximum;
}
const E = LOFT.extensionSamples;
const EXTENSION_STEP = LOFT.extension / E;
const LAST = 127;
const PHASE = {
	pre: 0,
	open: 1,
	post: 2
};
/**
* A slice's fade after touchdown: 1 until then, falling to 0 over its tube's collapse, √(2W/g) (the advisor,
* 2026-09-30: neither the drawing nor the contact may outlast the pocket); a tube without a void goes at touchdown.
*/
function collapseFade(tau, touchdown, collapse) {
	if (tau <= touchdown) return 1;
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
var SweptLoft = class SweptLoft {
	library;
	slope;
	result;
	normalDemand = false;
	/** Exact double initial recipes; only the private ordinary query backend defers Y. */
	initialX = /* @__PURE__ */ new Float64Array(0);
	initialZ = /* @__PURE__ */ new Float64Array(0);
	targetY = /* @__PURE__ */ new Float64Array(0);
	initialBlend = /* @__PURE__ */ new Float64Array(0);
	sharedSheetRows = new Uint8Array(MAX_SLICES);
	sharedSheetX = /* @__PURE__ */ new Float64Array(21);
	sharedSheetZ = /* @__PURE__ */ new Float64Array(21);
	sharedSheetWater = /* @__PURE__ */ new Float64Array(21);
	sealBlend = /* @__PURE__ */ new Float64Array(0);
	sealApplies = /* @__PURE__ */ new Uint8Array(0);
	heightReady = /* @__PURE__ */ new Uint8Array(0);
	rowHeightAt;
	normalReady = /* @__PURE__ */ new Uint8Array(0);
	normalFirst = /* @__PURE__ */ new Int32Array(0);
	normalLast = /* @__PURE__ */ new Int32Array(0);
	profile = /* @__PURE__ */ new Float32Array(256);
	/** Per front, its slices' σ, before and after refinement. */
	base = new Float64Array(2 * MAX_SLICES + 8);
	sigmas = new Float64Array(2 * MAX_SLICES + 8);
	cBaseX = new Float64Array(2 * MAX_SLICES + 8);
	cBaseKind = new Uint8Array(2 * MAX_SLICES + 8);
	cX = new Float64Array(2 * MAX_SLICES + 8);
	cKind = new Uint8Array(2 * MAX_SLICES + 8);
	/** Existing five (world Z, metric Y) cap probes per level, retained to reuse their chord directions. */
	cCapPoints = new Float64Array(10 * C_CAP_REFINEMENT.levels);
	sample = {
		x: 0,
		z: 0,
		tau: 0,
		footHeight: 0,
		footDepth: 0,
		pace: 0
	};
	probe = {
		x: 0,
		z: 0,
		tau: 0,
		footHeight: 0,
		footDepth: 0,
		pace: 0
	};
	query;
	point = /* @__PURE__ */ new Float64Array(2);
	velocity = /* @__PURE__ */ new Float64Array(2);
	/** A slice's forward rest (`forwardRest`): its hold and end, m past the toe, and the climbs where it eases and at the toe. */
	rest = /* @__PURE__ */ new Float64Array(4);
	/** Per slice, its anchor (x, z) and its drawn profile's reach along its ray past its extensions, m: its footprint. */
	anchorX = new Float64Array(MAX_SLICES + 1);
	anchorZ = new Float64Array(MAX_SLICES + 1);
	reachBack = new Float64Array(MAX_SLICES + 1);
	reachFront = new Float64Array(MAX_SLICES + 1);
	/** Reusable planned sigma samples: x, z, tau, foot height, foot depth, pace (double precision). */
	planned = /* @__PURE__ */ new Float64Array(0);
	/** Planned C states: 0 omitted, 1 live, 2 intrinsically retired ordinary-water support. RAW uses 0/1. */
	plannedLive = /* @__PURE__ */ new Uint8Array(0);
	retirementRow = new Uint8Array(MAX_SLICES + 1);
	plannedRayX = /* @__PURE__ */ new Float64Array(0);
	plannedRayZ = /* @__PURE__ */ new Float64Array(0);
	rayPlan;
	plannedRay = /* @__PURE__ */ new Float64Array(2);
	/** Per strip, its footprint's corners (x, z × 4: its slices' back and front reach) and box (x0, x1, z0, z1). */
	corners = new Float64Array(8 * (MAX_SLICES + 1));
	boxes = new Float64Array(4 * (MAX_SLICES + 1));
	contact;
	measureSheet;
	holdClearDrawing;
	/** A slice's lip thickness per profile point, m, and its far side's view of the sky (`sheetAcross`). */
	sheets = {
		across: /* @__PURE__ */ new Float32Array(128),
		back: /* @__PURE__ */ new Float32Array(128)
	};
	/** A slice's throat views per profile point (`throatViews`). */
	inside = /* @__PURE__ */ new Float32Array(512);
	/** How the drawing's profile blends its cases' frames, for the sheet's tables (`ProfileLibrary.frameBlend`). */
	blend = {
		weight: 0,
		scale: 0,
		lowerFrame: 0,
		lowerNext: 0,
		lowerShare: 0,
		upperFrame: 0,
		upperNext: 0,
		upperShare: 0
	};
	constructor(library, slope, options = {}) {
		this.library = library;
		this.slope = slope;
		this.contact = options.contact ?? false;
		this.measureSheet = options.sheet ?? !this.contact;
		this.holdClearDrawing = !this.contact && (options.holdClearDrawing ?? false);
		this.rayPlan = new CrestRayPlan(library, slope, LOFT.extension, minimumCrestRaySpacing(LOFT.extension, LOFT.spacing));
		this.query = {
			slope,
			footHeight: 0,
			footDepth: 0,
			seconds: 0
		};
		const vertices = (MAX_SLICES + 1) * LOFT_SAMPLES;
		const slices = MAX_SLICES + 1;
		this.result = {
			positions: new Float32Array(3 * vertices),
			normals: new Float32Array(3 * vertices),
			mask: new Float32Array(vertices),
			lift: new Float32Array(vertices),
			sheet: new Float32Array(vertices),
			sheetWeight: new Float32Array(vertices),
			sheetBack: new Float32Array(vertices),
			throat: new Float32Array(4 * vertices),
			indices: new Uint32Array(6 * (LOFT_SAMPLES - 1) * slices),
			vertexCount: 0,
			indexCount: 0,
			sliceCount: 0,
			sliceFront: new Int32Array(slices),
			sliceSigma: new Float32Array(slices),
			sliceTau: new Float32Array(slices),
			slicePhase: new Uint8Array(slices),
			sliceLife: new Float32Array(slices),
			sliceCollapse: new Float32Array(slices),
			sliceFade: new Float32Array(slices),
			sliceTipGap: new Float32Array(slices),
			tipGap: 0,
			sliceRestHold: new Float32Array(slices),
			sliceRestEnd: new Float32Array(slices),
			sliceRestClimb: new Float32Array(slices),
			sliceToeClimb: new Float32Array(slices),
			restSamples: 0,
			clamps: 0,
			clampedLookups: 0,
			overlaps: 0,
			overlapsOpen: 0,
			overlapOpenWeight: 0,
			rayCorrections: 0,
			rayMaxBlend: 0,
			rayMinAdvance: 0,
			rayInvalidIntervals: 0,
			sliceJoined: new Uint8Array(slices),
			sliceRayX: new Float32Array(slices),
			sliceRayZ: new Float32Array(slices),
			sliceWeight: new Float32Array(slices),
			sliceOverturned: new Uint8Array(slices),
			sliceTipAlong: new Float32Array(slices),
			sliceTipUp: new Float32Array(slices),
			sliceAnchorVX: new Float32Array(slices),
			sliceAnchorVZ: new Float32Array(slices),
			sliceTipTransportAlong: new Float32Array(slices),
			sliceTipTransportUp: new Float32Array(slices),
			sliceFormed: new Float32Array(slices),
			sliceTipX: new Float32Array(slices),
			sliceTipY: new Float32Array(slices),
			sliceTipZ: new Float32Array(slices),
			sliceMouth: new Float32Array(slices)
		};
	}
	/** Internal query backend only: no mutable LoftResult escapes the worker owner. */
	static forContactQueries(library, slope) {
		const loft = new SweptLoft(library, slope, { contact: true });
		loft.normalDemand = true;
		const vertices = loft.result.positions.length / 3;
		loft.initialX = new Float64Array(vertices);
		loft.initialZ = new Float64Array(vertices);
		loft.targetY = new Float64Array(vertices);
		loft.initialBlend = new Float64Array(vertices);
		loft.sealBlend = new Float64Array(MAX_SLICES + 1);
		loft.sealApplies = new Uint8Array(vertices);
		loft.heightReady = new Uint8Array(MAX_SLICES + 1);
		loft.normalReady = new Uint8Array(loft.result.positions.length / 3);
		loft.normalFirst = new Int32Array(MAX_SLICES + 1);
		loft.normalLast = new Int32Array(MAX_SLICES + 1);
		return {
			build: loft.build.bind(loft),
			prepareRow: loft.prepareRow.bind(loft),
			prepareNormal: loft.prepareNormal.bind(loft)
		};
	}
	/** Loft the records' fronts over the water (`heightAt`). */
	build(records, count, stillLevel, heightAt) {
		const r = this.result;
		if (this.normalDemand) {
			this.heightReady.fill(0);
			this.sealBlend.fill(1);
			this.sealApplies.fill(0);
			this.rowHeightAt = count > 0 ? heightAt : void 0;
			this.normalReady.fill(0);
			this.normalFirst.fill(-1);
			this.normalLast.fill(-1);
		}
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
		const boundedC = this.library.options.geometry === "bounded-C";
		if (boundedC) this.retirementRow.fill(0);
		if (boundedC) r.cSampling = {
			policy: "fixed-origin-stored-F32-X-and-raw-knots/v1",
			mandatoryRawKnots: 0,
			plannedStations: 0,
			omittedPrecisionStations: 0,
			collapsedShoulders: 0,
			budgetTruncated: false,
			firstOmittedPlannedX: null,
			omittedFronts: 0,
			minimumStoredDeltaX: Infinity,
			minimumStoredDeltaSigma: Infinity,
			capRefinement: {
				policy: "sampled-quarter-chord-turn-trial/v1",
				maximumTurnDegrees: C_CAP_REFINEMENT.maximumTurnDegrees,
				measuredIntervals: 0,
				maximumMeasuredTurnDegrees: 0,
				angularSplitRequests: 0,
				indeterminateProbeIntervals: 0,
				unverifiedDepthLeaves: 0,
				unverifiedSmallSpanLeaves: 0,
				blockedStoredStations: 0,
				skippedBudgetFronts: 0
			},
			retirement: {
				policy: "one-adjacent-intrinsic-dead-water-row/v1",
				plannedSupports: 0,
				retainedSupports: 0,
				omittedDeadStations: 0,
				budgetOmittedSupports: 0,
				budgetClampedDeadStations: 0,
				detachedSupports: 0
			}
		};
		const fronts = this.fronts(records, count);
		if (r.cSampling) r.cSampling.mandatoryRawKnots = fronts.reduce((n, f) => n + f.end - f.start, 0);
		let samples = 0;
		for (const f of fronts) samples = Math.max(samples, boundedC ? this.cStationBound(f, LOFT.spacing) : Math.ceil((f.last - f.first + 2 * LOFT.extension) / LOFT.spacing) + 1);
		if (boundedC) this.cScratch(samples);
		if (this.base.length < samples) this.base = new Float64Array(Math.max(samples, 2 * this.base.length));
		if (this.sigmas.length < 2 * samples) this.sigmas = new Float64Array(Math.max(2 * samples, 2 * this.sigmas.length));
		let live = 0;
		let extra = 0;
		for (const f of fronts) {
			const survey = this.survey(records, f);
			live += survey.live;
			extra += survey.extra;
		}
		let spacing = LOFT.spacing;
		let budgeted = live + extra > MAX_SLICES;
		if (live > MAX_SLICES) spacing = LOFT.spacing * live / Math.max(1, MAX_SLICES - 2 * fronts.length);
		for (let frontIndex = 0; frontIndex < fronts.length; frontIndex += 1) {
			const f = fronts[frontIndex];
			if (r.sliceCount >= MAX_SLICES) {
				if (r.cSampling) {
					r.cSampling.budgetTruncated = true;
					r.cSampling.omittedFronts = fronts.length - frontIndex;
				}
				break;
			}
			const n = boundedC ? this.cRefinements(records, f, spacing, !budgeted) : budgeted ? this.baseSlices(f, spacing, this.sigmas) : this.refinements(records, f, spacing);
			if (r.cSampling) r.cSampling.plannedStations += n;
			this.loftFront(records, f, n, budgeted, stillLevel, heightAt);
			if (boundedC && r.cSampling.budgetTruncated) {
				r.cSampling.omittedFronts = fronts.length - frontIndex - 1;
				break;
			}
		}
		this.measureRayAdvance();
		this.dropOverlaps();
		this.sealRuns(heightAt);
		this.triangulate();
		if (r.cSampling) {
			for (let s = 0; s < r.sliceCount; s += 1) if (this.retirementRow[s] === 1 && r.sliceJoined[s] !== 1 && !(s > 0 && r.sliceJoined[s - 1] === 1)) r.cSampling.retirement.detachedSupports += 1;
			if (r.cSampling.minimumStoredDeltaX === Infinity) r.cSampling.minimumStoredDeltaX = 0;
			if (r.cSampling.minimumStoredDeltaSigma === Infinity) r.cSampling.minimumStoredDeltaSigma = 0;
		}
		return r;
	}
	/** The records' fronts, in order; one of fewer than two points, or all at one σ, has no tangent and is left out. */
	fronts(records, count) {
		const fronts = [];
		const boundedC = this.library.options.geometry === "bounded-C";
		if (boundedC && (!Number.isSafeInteger(count) || count < 0 || count > MAX_C_SURVEY_STATIONS || count * 9 > records.length)) throw new RangeError("Unsupported C packet count");
		let start = 0;
		while (start < count) {
			const id = records[start * 9 + FRONT_FIELD.front];
			let end = start + 1;
			while (end < count && records[end * 9 + FRONT_FIELD.front] === id) end += 1;
			const first = records[start * 9 + FRONT_FIELD.sigma];
			const last = records[(end - 1) * 9 + FRONT_FIELD.sigma];
			if (boundedC) {
				if (!Number.isFinite(id)) throw new RangeError("Non-finite C front identity");
				for (let k = start; k < end; k += 1) {
					const o = k * 9;
					for (const key of [
						"x",
						"z",
						"sigma",
						"tau",
						"footHeight",
						"footDepth"
					]) if (!Number.isFinite(records[o + FRONT_FIELD[key]])) throw new RangeError("Non-finite C packet control: " + key);
					if (!(records[o + FRONT_FIELD.footHeight] > 0 && records[o + FRONT_FIELD.footDepth] > 0)) throw new RangeError("Non-positive C packet scale");
					const pace = records[o + FRONT_FIELD.pace];
					if (!Number.isFinite(pace) && !Number.isNaN(pace)) throw new RangeError("Unsupported C packet pace");
					if (k > start && (!(records[o + FRONT_FIELD.x] > records[o - 9 + FRONT_FIELD.x]) || !(records[o + FRONT_FIELD.sigma] > records[o - 9 + FRONT_FIELD.sigma]))) throw new RangeError("C packet X/sigma must be strictly increasing stored words");
				}
				if (end - start >= 2) {
					const a = start * 9, b = (end - 1) * 9;
					const dx0 = records[a + 9 + FRONT_FIELD.x] - records[a + FRONT_FIELD.x], dz0 = records[a + 9 + FRONT_FIELD.z] - records[a + FRONT_FIELD.z];
					const dx1 = records[b + FRONT_FIELD.x] - records[b - 9 + FRONT_FIELD.x], dz1 = records[b + FRONT_FIELD.z] - records[b - 9 + FRONT_FIELD.z];
					const x0 = records[a + FRONT_FIELD.x], x1 = records[b + FRONT_FIELD.x];
					const fromX = Math.fround(x0 - LOFT.extension * dx0 / Math.hypot(dx0, dz0)), toX = Math.fround(x1 + LOFT.extension * dx1 / Math.hypot(dx1, dz1));
					if (![fromX, toX].every(Number.isFinite)) throw new RangeError("Unsupported C shoulder coordinates");
					if (this.result.cSampling) this.result.cSampling.collapsedShoulders += Number(fromX === x0) + Number(toX === x1);
					fronts.push({
						id,
						start,
						end,
						first,
						last,
						fromX,
						toX
					});
				}
			} else if (end - start >= 2 && last - first > 1e-6) fronts.push({
				id,
				start,
				end,
				first,
				last
			});
			start = end;
		}
		return fronts;
	}
	/** Upper bound before allocation: zero-origin integer lattice plus EVERY raw knot and both shoulders. */
	cStationBound(f, spacing) {
		const low = Math.ceil(f.fromX / spacing), high = Math.floor(f.toX / spacing);
		const count = Math.max(0, high - low + 1) + f.end - f.start + 2;
		if (!(spacing > 0) || !Number.isFinite(spacing) || !Number.isSafeInteger(low) || !Number.isSafeInteger(high) || !Number.isSafeInteger(count) || count > MAX_C_SURVEY_STATIONS) throw new RangeError("Unsupported C stored-X lattice/survey domain");
		return count;
	}
	cScratch(count) {
		if (this.cBaseX.length < count) {
			const n = Math.max(count, 2 * this.cBaseX.length);
			this.cBaseX = new Float64Array(n);
			this.cBaseKind = new Uint8Array(n);
		}
		if (this.cX.length < 8 * count) {
			const n = Math.max(8 * count, 2 * this.cX.length);
			this.cX = new Float64Array(n);
			this.cKind = new Uint8Array(n);
			if (this.sigmas.length < n) this.sigmas = new Float64Array(n);
		}
	}
	/** Direct X parameter sampling. Raw knots copy exact packet words; sigma never locates the sample. */
	atX(records, f, x, into) {
		const field = (k, key) => records[k * 9 + FRONT_FIELD[key]];
		const copy = (k) => {
			into.x = x;
			into.z = field(k, "z");
			into.tau = field(k, "tau");
			into.footHeight = field(k, "footHeight");
			into.footDepth = field(k, "footDepth");
			into.pace = field(k, "pace");
		};
		const firstX = field(f.start, "x"), lastX = field(f.end - 1, "x");
		if (x <= firstX || x >= lastX) {
			const k = x <= firstX ? f.start : f.end - 1, other = k === f.start ? k + 1 : k - 1;
			copy(k);
			if (x === field(k, "x")) return field(k, "sigma");
			const dx = field(k, "x") - field(other, "x"), dz = field(k, "z") - field(other, "z"), length = Math.hypot(dx, dz);
			if (x === f.fromX || x === f.toX) {
				const beyond = k === f.start ? -LOFT.extension : LOFT.extension;
				into.z += Math.abs(beyond) * dz / length;
				return field(k, "sigma") + beyond;
			}
			const share = (x - field(k, "x")) / dx;
			into.z += share * dz;
			return field(k, "sigma") + (k === f.start ? -1 : 1) * share * length;
		}
		let low = f.start + 1, high = f.end - 1;
		while (low < high) {
			const mid = low + high >>> 1;
			if (field(mid, "x") < x) low = mid + 1;
			else high = mid;
		}
		if (x === field(low, "x")) {
			copy(low);
			return field(low, "sigma");
		}
		const k = low - 1, t = (x - field(k, "x")) / (field(low, "x") - field(k, "x"));
		const lerp = (key) => field(k, key) + t * (field(low, key) - field(k, key));
		into.x = x;
		into.z = lerp("z");
		into.tau = lerp("tau");
		into.footHeight = lerp("footHeight");
		into.footDepth = lerp("footDepth");
		const a = field(k, "pace"), b = field(low, "pace");
		into.pace = a === a ? b === b ? a + t * (b - a) : a : b;
		return lerp("sigma");
	}
	/** Merge priority raw=2, shoulder=1, regular/refinement=0; no epsilon merges a distinct raw knot. */
	cAppend(records, f, x, kind, xs, sigmas, kinds, count) {
		const sigma = this.atX(records, f, x, this.probe), stored = Math.fround(sigma);
		if (!Number.isFinite(x) || x !== Math.fround(x) || !Number.isFinite(stored)) throw new RangeError("Unsupported C stored station precision");
		while (count > 0) {
			const previousX = xs[count - 1], previousSigma = Math.fround(sigmas[count - 1]);
			if (x > previousX && stored > previousSigma) break;
			if (x < previousX || stored < previousSigma) throw new RangeError("C stored station order reversed");
			if (kind === 2 && kinds[count - 1] === 2) throw new RangeError("Distinct C raw knot collapsed in stored X/sigma");
			if (this.result.cSampling) this.result.cSampling.omittedPrecisionStations += 1;
			if (kind <= kinds[count - 1]) return count;
			count -= 1;
		}
		xs[count] = x;
		sigmas[count] = sigma;
		kinds[count] = kind;
		return count + 1;
	}
	cBaseSlices(records, f, spacing) {
		this.cScratch(this.cStationBound(f, spacing));
		let out = this.cAppend(records, f, f.fromX, 1, this.cBaseX, this.base, this.cBaseKind, 0);
		let raw = f.start, j = Math.ceil(f.fromX / spacing);
		const high = Math.floor(f.toX / spacing);
		while (raw < f.end || j <= high) {
			const rawX = raw < f.end ? records[raw * 9 + FRONT_FIELD.x] : Infinity;
			const regularX = j <= high ? Math.fround(j * spacing) : Infinity;
			const x = Math.min(rawX, regularX), kind = rawX <= regularX ? 2 : 0;
			if (rawX === x) raw += 1;
			if (regularX === x) j += 1;
			if (x >= f.fromX && x <= f.toX) out = this.cAppend(records, f, x, kind, this.cBaseX, this.base, this.cBaseKind, out);
		}
		return this.cAppend(records, f, f.toX, 1, this.cBaseX, this.base, this.cBaseKind, out);
	}
	cRefinements(records, f, spacing, refine) {
		const n = this.cBaseSlices(records, f, spacing);
		let out = 0, previousTau = 0, previousFrame = 0;
		if (!refine && this.result.cSampling) this.result.cSampling.capRefinement.skippedBudgetFronts += 1;
		for (let k = 0; k < n; k += 1) {
			this.atX(records, f, this.cBaseX[k], this.sample);
			const tau = this.sample.tau, frame = this.library.profileTimes({
				slope: this.slope,
				footHeight: this.sample.footHeight,
				footDepth: this.sample.footDepth
			}).frameSeconds;
			if (refine && k > 0) {
				const clockMidpoint = Math.abs(tau - previousTau) > LOFT.frames * Math.min(frame, previousFrame);
				out = this.cRefineCap(records, f, this.cBaseX[k - 1], this.cBaseX[k], clockMidpoint, 0, out);
			}
			out = this.cAppend(records, f, this.cBaseX[k], this.cBaseKind[k], this.cX, this.sigmas, this.cKind, out);
			previousTau = tau;
			previousFrame = frame;
		}
		return out;
	}
	/** Actual fully formed pre-impact cap, before world-water/end projection. Artificial seams keep their old plan. */
	cCapAt(records, f, x, offset) {
		const s = this.probe, sigma = this.atX(records, f, x, s);
		if (Math.min(sigma - f.first, f.last - sigma) < LOFT.endBlend) return false;
		const query = this.query;
		query.footHeight = s.footHeight;
		query.footDepth = s.footDepth;
		query.seconds = s.tau;
		query.hold = "drawing";
		const times = this.library.profileTimes(query);
		if (s.tau < times.clearSeconds || s.tau > times.touchdownSeconds) return false;
		this.library.pointAt(query, LANDMARK.lip, this.point);
		const along = this.point[0], y = this.point[1];
		this.library.pointAt(query, LANDMARK.crest, this.point);
		this.cCapPoints[offset] = Math.fround(s.z - this.point[0] + along);
		this.cCapPoints[offset + 1] = y;
		return true;
	}
	/** Bounded local additions; raw knots and every original clock midpoint retain cAppend's existing priority. */
	cRefineCap(records, f, left, right, clockMidpoint, level, out) {
		const diagnostics = this.result.cSampling?.capRefinement;
		if (level >= C_CAP_REFINEMENT.levels) {
			if (diagnostics) diagnostics.unverifiedDepthLeaves += 1;
			return out;
		}
		const middle = Math.fround((left + right) / 2);
		if (!(middle > left && middle < right)) {
			if (diagnostics) diagnostics.blockedStoredStations += 1;
			if (clockMidpoint && this.result.cSampling) this.result.cSampling.omittedPrecisionStations += 1;
			return out;
		}
		const o = 10 * level;
		let bent = false;
		if (right - left <= C_CAP_REFINEMENT.minimumSpan && diagnostics) diagnostics.unverifiedSmallSpanLeaves += 1;
		if (right - left > C_CAP_REFINEMENT.minimumSpan && this.cCapAt(records, f, left, o) && this.cCapAt(records, f, right, o + 2)) {
			const cap = this.cCapPoints;
			let eligible = true;
			for (let quarter = 1; quarter <= 3; quarter++) {
				const x = quarter === 2 ? middle : Math.fround(left + (right - left) * quarter / 4);
				const probe = o + 2 * (quarter + 1);
				if (!this.cCapAt(records, f, x, probe)) {
					bent = false;
					eligible = false;
					break;
				}
				const share = (x - left) / (right - left);
				const dz = cap[probe] - (cap[o] + share * (cap[o + 2] - cap[o]));
				const dy = cap[probe + 1] - (cap[o + 1] + share * (cap[o + 3] - cap[o + 1]));
				if (Math.hypot(dz, dy) > C_CAP_REFINEMENT.maximumSagitta) bent = true;
			}
			if (eligible) {
				const turn = sampledCapQuarterTurn(left, right, cap, o);
				if (turn === null) {
					bent = true;
					if (diagnostics) diagnostics.indeterminateProbeIntervals += 1;
				} else {
					if (diagnostics) {
						diagnostics.measuredIntervals += 1;
						diagnostics.maximumMeasuredTurnDegrees = Math.max(diagnostics.maximumMeasuredTurnDegrees, turn);
						if (turn > C_CAP_REFINEMENT.maximumTurnDegrees) diagnostics.angularSplitRequests += 1;
					}
					if (turn > C_CAP_REFINEMENT.maximumTurnDegrees) bent = true;
				}
			}
		}
		if (!clockMidpoint && !bent) return out;
		const leftSigma = Math.fround(this.atX(records, f, left, this.probe));
		const rightSigma = Math.fround(this.atX(records, f, right, this.probe));
		const middleSigma = Math.fround(this.atX(records, f, middle, this.probe));
		if (!(middleSigma > leftSigma && middleSigma < rightSigma)) {
			if (diagnostics) diagnostics.blockedStoredStations += 1;
			if (clockMidpoint) return this.cAppend(records, f, middle, 0, this.cX, this.sigmas, this.cKind, out);
			if (this.result.cSampling) this.result.cSampling.omittedPrecisionStations += 1;
			return out;
		}
		out = this.cRefineCap(records, f, left, middle, false, level + 1, out);
		out = this.cAppend(records, f, middle, 0, this.cX, this.sigmas, this.cKind, out);
		return this.cRefineCap(records, f, middle, right, false, level + 1, out);
	}
	/** A front's slices every `spacing` or less, evenly from one extension's end to the other's, into `out`; how many. */
	baseSlices(f, spacing, out) {
		const from = f.first - LOFT.extension;
		const span = f.last - f.first + 2 * LOFT.extension;
		const n = Math.ceil(span / spacing) + 1;
		const step = span / (n - 1);
		for (let k = 0; k < n; k += 1) out[k] = from + k * step;
		return n;
	}
	/**
	* A front's base slices at `spacing` that have not faded after touchdown (the rest are dropped), and the midpoints
	* the live ones need (neighbouring clocks more than `frames` frames apart).
	*/
	survey(records, f) {
		const boundedC = this.library.options.geometry === "bounded-C";
		const n = boundedC ? this.cBaseSlices(records, f, LOFT.spacing) : this.baseSlices(f, LOFT.spacing, this.base);
		let live = 0;
		let extra = 0;
		let previous = NaN;
		let previousFrame = 0;
		for (let k = 0; k < n; k += 1) {
			const s = boundedC ? (this.atX(records, f, this.cBaseX[k], this.probe), this.probe) : this.at(records, f, this.base[k], this.probe);
			const times = this.library.profileTimes({
				slope: this.slope,
				footHeight: s.footHeight,
				footDepth: s.footDepth
			});
			if (collapseFade(s.tau, times.touchdownSeconds, times.collapseSeconds) === 0) {
				previous = NaN;
				continue;
			}
			live += 1;
			if (Math.abs(s.tau - previous) > LOFT.frames * Math.min(times.frameSeconds, previousFrame)) extra += 1;
			previous = s.tau;
			previousFrame = times.frameSeconds;
		}
		return {
			live,
			extra
		};
	}
	/** A front's base slices, with the midpoints where neighbouring clocks differ by more than `frames` frames, into `sigmas`; how many. */
	refinements(records, f, spacing) {
		const n = this.baseSlices(f, spacing, this.base);
		let out = 0;
		let previousTau = 0;
		let previousFrame = 0;
		for (let k = 0; k < n; k += 1) {
			const s = this.at(records, f, this.base[k], this.probe);
			const frame = this.library.profileTimes({
				slope: this.slope,
				footHeight: s.footHeight,
				footDepth: s.footDepth
			}).frameSeconds;
			if (k > 0 && Math.abs(s.tau - previousTau) > LOFT.frames * Math.min(frame, previousFrame)) this.sigmas[out++] = (this.base[k - 1] + this.base[k]) / 2;
			this.sigmas[out++] = this.base[k];
			previousTau = s.tau;
			previousFrame = frame;
		}
		return out;
	}
	/** Front f's values at σ (see `Sample`), into `into`. */
	at(records, f, sigma, into) {
		const field = (k, name) => records[k * 9 + FRONT_FIELD[name]];
		const copy = (k) => {
			into.x = field(k, "x");
			into.z = field(k, "z");
			into.tau = field(k, "tau");
			into.footHeight = field(k, "footHeight");
			into.footDepth = field(k, "footDepth");
			into.pace = field(k, "pace");
		};
		const runOn = (from, to, beyond) => {
			const dx = field(to, "x") - field(from, "x");
			const dz = field(to, "z") - field(from, "z");
			const length = Math.sqrt(dx * dx + dz * dz);
			if (length > 1e-9) {
				into.x += beyond * dx / length;
				into.z += beyond * dz / length;
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
		let low = f.start + 1;
		let high = f.end - 1;
		while (low < high) {
			const middle = low + high >>> 1;
			if (field(middle, "sigma") < sigma) low = middle + 1;
			else high = middle;
		}
		const k = low - 1;
		const s0 = field(k, "sigma");
		const s1 = field(k + 1, "sigma");
		const t = s1 - s0 > 1e-12 ? (sigma - s0) / (s1 - s0) : 0;
		const lerp = (name) => field(k, name) + t * (field(k + 1, name) - field(k, name));
		into.x = lerp("x");
		into.z = lerp("z");
		into.tau = lerp("tau");
		into.footHeight = lerp("footHeight");
		into.footDepth = lerp("footDepth");
		const pace0 = field(k, "pace");
		const pace1 = field(k + 1, "pace");
		into.pace = pace0 === pace0 ? pace1 === pace1 ? pace0 + t * (pace1 - pace0) : pace0 : pace1;
		return into;
	}
	/** Sample the planned crest/ray/scale once, preserving the original live-run and budget-clock decisions. */
	/** C-only closure rows: keep intrinsic clocks; a dead sample never participates in budget clock lowering. */
	planCColumns(records, f, n, budgeted) {
		const r = this.result, diagnostics = r.cSampling.retirement;
		let inRun = false, previousTau = 0;
		for (let k = 0; k < n; k += 1) {
			const s = this.sample, sigma = this.sigmas[k];
			this.atX(records, f, this.cX[k], s);
			const times = this.library.profileTimes({
				slope: this.slope,
				footHeight: s.footHeight,
				footDepth: s.footDepth
			});
			let tau = s.tau;
			const intrinsicDead = collapseFade(tau, times.touchdownSeconds, times.collapseSeconds) === 0;
			if (intrinsicDead) inRun = false;
			else if (budgeted && inRun) {
				const bound = times.touchdownSeconds / 4;
				const clamped = Math.min(previousTau + bound, Math.max(previousTau - bound, tau));
				if (clamped !== tau) r.clamps += 1;
				tau = clamped;
			}
			const live = !intrinsicDead && collapseFade(tau, times.touchdownSeconds, times.collapseSeconds) > 0;
			this.plannedLive[k] = intrinsicDead ? 2 : live ? 1 : 0;
			if (!intrinsicDead && !live) diagnostics.budgetClampedDeadStations += 1;
			inRun = live;
			if (live) previousTau = tau;
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
		}
		for (let k = 0; k < n; k += 1) if (this.plannedLive[k] === 2) {
			if (k > 0 && this.plannedLive[k - 1] === 1 || k + 1 < n && this.plannedLive[k + 1] === 1) diagnostics.plannedSupports += 1;
			else {
				this.plannedLive[k] = 0;
				diagnostics.omittedDeadStations += 1;
			}
		}
		let retained = 0, limit = n, lastSelected = -1;
		for (let k = 0; k < n; k += 1) {
			if (this.plannedLive[k] === 0) continue;
			if (r.sliceCount + retained >= MAX_SLICES) {
				r.cSampling.budgetTruncated = true;
				limit = k;
				if (lastSelected >= 0 && this.plannedLive[lastSelected] === 2 && !(lastSelected > 0 && this.plannedLive[lastSelected - 1] === 1)) limit = lastSelected;
				r.cSampling.firstOmittedPlannedX ??= this.cX[limit];
				break;
			}
			retained += 1;
			lastSelected = k;
		}
		for (let k = 0; k < n; k += 1) if (this.plannedLive[k] === 2) {
			if (k < limit) diagnostics.retainedSupports += 1;
			else diagnostics.budgetOmittedSupports += 1;
		}
		if (this.rayPlan.diagnostics.blend > 0) {
			for (let k = 0; k < limit; k += 1) if (this.plannedLive[k] !== 0) r.rayCorrections += 1;
		}
		return limit;
	}
	planRays(records, f, n, budgeted) {
		if (this.plannedLive.length < n) {
			const capacity = Math.max(n, 2 * this.plannedLive.length);
			this.planned = new Float64Array(6 * capacity);
			this.plannedLive = new Uint8Array(capacity);
			this.plannedRayX = new Float64Array(capacity);
			this.plannedRayZ = new Float64Array(capacity);
		}
		this.plannedLive.fill(0, 0, n);
		const boundedC = this.library.options.geometry === "bounded-C";
		if (boundedC) this.rayPlan.prepareStoredColumns(records, f.start, f.end, this.cX, this.sigmas, n);
		else this.rayPlan.prepareRecords(records, f.start, f.end);
		if (boundedC && this.rayPlan.diagnostics.invalidIntervals) throw new RangeError("Unsupported C actual stored column proof");
		if (this.result.cSampling) {
			this.result.cSampling.minimumStoredDeltaX = Math.min(this.result.cSampling.minimumStoredDeltaX, this.rayPlan.diagnostics.minimumStoredDeltaX);
			this.result.cSampling.minimumStoredDeltaSigma = Math.min(this.result.cSampling.minimumStoredDeltaSigma, this.rayPlan.diagnostics.minimumStoredDeltaSigma);
		}
		const r = this.result;
		r.rayMaxBlend = Math.max(r.rayMaxBlend, this.rayPlan.diagnostics.blend);
		r.rayInvalidIntervals += this.rayPlan.diagnostics.invalidIntervals;
		if (boundedC) return this.planCColumns(records, f, n, budgeted);
		let live = 0;
		let inRun = false;
		let previousTau = 0;
		let limit = n;
		for (let k = 0; k < n; k += 1) {
			const sigma = this.sigmas[k];
			const s = boundedC ? (this.atX(records, f, this.cX[k], this.sample), this.sample) : this.at(records, f, sigma, this.sample);
			const times = this.library.profileTimes({
				slope: this.slope,
				footHeight: s.footHeight,
				footDepth: s.footDepth
			});
			let tau = s.tau;
			if (budgeted && inRun) {
				const bound = times.touchdownSeconds / 4;
				const clamped = Math.min(previousTau + bound, Math.max(previousTau - bound, tau));
				if (clamped !== tau) r.clamps += 1;
				tau = clamped;
			}
			if (collapseFade(tau, times.touchdownSeconds, times.collapseSeconds) === 0) {
				inRun = false;
				continue;
			}
			if (r.sliceCount + live >= MAX_SLICES) {
				if (r.cSampling) {
					r.cSampling.budgetTruncated = true;
					r.cSampling.firstOmittedPlannedX ??= this.cX[k];
				}
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
			if (this.rayPlan.diagnostics.blend > 0) r.rayCorrections += 1;
		}
		return limit;
	}
	loftFront(records, f, n, budgeted, stillLevel, heightAt) {
		const r = this.result;
		const { profile } = this;
		let runStart = -1;
		const closeRun = () => {
			if (runStart >= 0) this.joinRun(runStart, r.sliceCount - 1);
			runStart = -1;
		};
		const plannedCount = this.planRays(records, f, n, budgeted);
		for (let k = 0; k < plannedCount; k += 1) {
			if (this.plannedLive[k] === 0) {
				closeRun();
				continue;
			}
			const retirementSupport = this.library.options.geometry === "bounded-C" && this.plannedLive[k] === 2;
			if (retirementSupport && k > 0 && this.plannedLive[k - 1] === 2) closeRun();
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
			const query = this.query;
			query.footHeight = s.footHeight;
			query.footDepth = s.footDepth;
			query.seconds = tau;
			query.hold = this.contact || this.holdClearDrawing ? "contact" : "drawing";
			const lookup = this.library.profileAt(query, profile);
			const touchdown = lookup.touchdownSeconds;
			const wFade = collapseFade(tau, touchdown, lookup.collapseSeconds);
			const wFormation = lookup.analytic?.formation ?? 1;
			if (retirementSupport && wFade !== 0) throw new Error("C retirement closure clocks disagree with its profile lookup");
			if (wFade === 0 && !retirementSupport) {
				closeRun();
				continue;
			}
			let tipGap = 0;
			let drawnCrestX = profile[2 * LANDMARK.crest];
			let crestY = profile[2 * LANDMARK.crest + 1];
			let drawnToeX = profile[2 * LANDMARK.toe];
			let toeY = profile[2 * LANDMARK.toe + 1];
			let frontY = profile[255];
			let drawnFrontX = profile[254];
			if (this.contact) {
				query.hold = "drawing";
				this.library.pointAt(query, LANDMARK.lip, this.point);
				const dx = this.point[0] - profile[2 * LANDMARK.lip];
				const dy = this.point[1] - profile[2 * LANDMARK.lip + 1];
				tipGap = Math.sqrt(dx * dx + dy * dy);
				this.library.pointAt(query, LANDMARK.crest, this.point);
				[drawnCrestX, crestY] = [this.point[0], this.point[1]];
				this.library.pointAt(query, LANDMARK.toe, this.point);
				[drawnToeX, toeY] = [this.point[0], this.point[1]];
				this.library.pointAt(query, LANDMARK.front, this.point);
				[drawnFrontX, frontY] = [this.point[0], this.point[1]];
			}
			const drawnHeight = restHeight(crestY, toeY, frontY);
			const reachBack = drawnCrestX - (REST.behind + REST.ramp) * drawnHeight;
			const d = Math.min(sigma - f.first, f.last - sigma);
			const r0 = Math.min(1, d / LOFT.endBlend);
			const w = (d <= 0 ? 0 : r0 * r0 * (3 - 2 * r0)) * wFade * wFormation;
			let overturned = 0;
			for (let i = LOFT.pinned; i < LAST - LOFT.pinned; i += 1) if (profile[2 * (i + 1)] < profile[2 * i]) {
				overturned = 1;
				break;
			}
			if (r.sliceCount >= MAX_SLICES) break;
			if (runStart < 0) runStart = r.sliceCount;
			if (lookup.clamped) r.clampedLookups += 1;
			const crest = profile[2 * LANDMARK.crest];
			const ax = s.x - crest * nx;
			const az = s.z - crest * nz;
			let life = NaN;
			let anchorVX = 0;
			let anchorVZ = 0;
			if (tau >= 0) {
				life = tau / touchdown;
				if (this.contact) {
					const follow = this.crestPointVelocity(s, tau, lookup.frameSeconds, nx, nz);
					anchorVX = follow[0];
					anchorVZ = follow[1];
				}
			}
			const maskBand = Math.min(1, Math.max(0, 1 + d / LOFT.band));
			const maskSlice = this.library.options.geometry === "bounded-C" ? wFade * maskBand * wFormation : wFade > 0 ? maskBand : 0;
			const forward = this.rest;
			if (w > 0) this.forwardRest(ax, az, nx, nz, drawnToeX, stillLevel + frontY, drawnHeight, drawnFrontX + LOFT.extension - LOFT.band - drawnToeX, heightAt);
			else {
				forward[0] = 0;
				forward[1] = REST.ramp * drawnHeight;
				forward[2] = NaN;
				forward[3] = NaN;
			}
			const [restHold, restEnd] = [forward[0], forward[1]];
			const reachFront = drawnToeX + restEnd;
			let formed = 0;
			let lipThickness = 0;
			if (this.measureSheet && w > 0) {
				query.hold = this.holdClearDrawing ? "contact" : "drawing";
				formed = sheetTablesLookup(this.library.frameBlend(query, this.blend), this.sheets);
				if (formed > 0) {
					throatViews(profile, this.inside);
					for (let i = THROAT.thicknessFrom; i <= THROAT.thicknessTo; i += 1) lipThickness += this.sheets.across[i];
					lipThickness /= THROAT.thicknessTo - THROAT.thicknessFrom + 1;
				}
			}
			const slice = r.sliceCount;
			if (this.library.options.geometry === "bounded-C") this.retirementRow[slice] = retirementSupport ? 1 : 0;
			r.sliceFormed[slice] = formed;
			r.sliceFront[slice] = f.id;
			r.sliceSigma[slice] = sigma;
			r.sliceTau[slice] = tau;
			r.slicePhase[slice] = tau > touchdown ? PHASE.post : PHASE[lookup.phase];
			r.sliceLife[slice] = life;
			r.sliceCollapse[slice] = lookup.collapseSeconds;
			r.sliceFade[slice] = wFade;
			r.sliceTipGap[slice] = tipGap;
			if (tipGap > r.tipGap) r.tipGap = tipGap;
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
			const fluidScale = lookup.analytic ? lookup.analytic.lengthScale / lookup.analytic.timeScale : 1;
			r.sliceTipAlong[slice] = lookup.analytic ? lookup.analytic.fluidAlong * fluidScale : lookup.tipAlong;
			r.sliceTipUp[slice] = lookup.analytic ? lookup.analytic.fluidUp * fluidScale : lookup.tipUp;
			if (this.contact) {
				if (lookup.analytic) {
					r.sliceTipTransportAlong[slice] = lookup.tipAlong;
					r.sliceTipTransportUp[slice] = lookup.tipUp;
				} else {
					const transport = this.landmarkVelocity(s, tau, lookup.frameSeconds, LANDMARK.lip);
					r.sliceTipTransportAlong[slice] = transport[0];
					r.sliceTipTransportUp[slice] = transport[1];
				}
			} else {
				r.sliceTipTransportAlong[slice] = 0;
				r.sliceTipTransportUp[slice] = 0;
			}
			r.sliceAnchorVX[slice] = anchorVX;
			r.sliceAnchorVZ[slice] = anchorVZ;
			const profileCrestX = profile[2 * LANDMARK.crest];
			const toeX = profile[2 * LANDMARK.toe];
			const height = restHeight(profile[2 * LANDMARK.crest + 1], profile[2 * LANDMARK.toe + 1], profile[255]);
			const rampLength = REST.ramp * height;
			const restSpan = restEnd - restHold;
			const sharedSheet = lookup.analytic?.sharedSheet !== void 0;
			this.sharedSheetRows[slice] = sharedSheet ? 1 : 0;
			for (let j = 0; j < LOFT_SAMPLES; j += 1) {
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
				if (j < E) along = profile[0] - (E - j) * EXTENSION_STEP;
				else if (j < E + 128) {
					const i = j - E;
					along = profile[2 * i];
					above = profile[2 * i + 1];
					if (i < LANDMARK.crest) {
						const past = profileCrestX - along - REST.behind * height;
						const u = past > 0 ? Math.min(1, past / rampLength) : 0;
						pin = Math.max(u * u * (3 - 2 * u), i < LOFT.pinned ? (LOFT.pinned - i) / LOFT.pinned : 0);
						maskAlong = Math.min(1, Math.max(0, 1 - (past - rampLength) / LOFT.band));
					} else if (i > LANDMARK.toe) {
						const past = along - toeX;
						const u = past > restHold ? Math.min(1, (past - restHold) / restSpan) : 0;
						pin = u * u * (3 - 2 * u);
						maskAlong = Math.min(1, Math.max(0, 1 - (past - restEnd) / LOFT.band));
					} else {
						pin = 0;
						maskAlong = 1;
					}
					if (formed > 0 && i > LANDMARK.crest && i < LANDMARK.throat) {
						sheet = this.sheets.across[i];
						sheetBack = this.sheets.back[i];
						sheetShare = formed * Math.min(1, Math.min(i - LANDMARK.crest, LANDMARK.throat - i) / (SHEET.ramp + 1));
					}
					if (formed > 0) {
						sky = this.inside[4 * i];
						underLip = this.inside[4 * i + 1];
						inner = formed * this.inside[4 * i + 2];
					}
				} else {
					along = profile[254] + (j - E - LAST) * EXTENSION_STEP;
					above = profile[255];
					const past = along - toeX;
					const u = past > restHold ? Math.min(1, (past - restHold) / restSpan) : 0;
					pin = u * u * (3 - 2 * u);
					maskAlong = Math.min(1, Math.max(0, 1 - (past - restEnd) / LOFT.band));
				}
				if (lookup.analytic?.sheetExists && j === E + 104 && profile[207] === profile[209] && profile[209] === profile[211] && profile[2 * LANDMARK.lip] >= profile[206] && profile[2 * LANDMARK.lip] <= profile[210]) along = profile[2 * LANDMARK.lip];
				const v = slice * LOFT_SAMPLES + j;
				const profileIndex = j - E;
				const sharedTop = sharedSheet && profileIndex >= 38 && profileIndex <= 58 ? profileIndex - 38 : -1;
				const sharedUnder = sharedSheet && profileIndex >= 68 && profileIndex <= 88 ? 88 - profileIndex : -1;
				const px = sharedUnder >= 0 ? this.sharedSheetX[sharedUnder] : ax + along * nx;
				const pz = sharedUnder >= 0 ? this.sharedSheetZ[sharedUnder] : az + along * nz;
				if (sharedTop >= 0) {
					this.sharedSheetX[sharedTop] = px;
					this.sharedSheetZ[sharedTop] = pz;
				}
				const e = w * (1 - pin);
				r.positions[3 * v] = px;
				if (this.normalDemand) {
					this.initialX[v] = px;
					this.initialZ[v] = pz;
					this.targetY[v] = stillLevel + above;
					this.initialBlend[v] = e;
				} else if (e === 1) r.positions[3 * v + 1] = stillLevel + above;
				else {
					const h = sharedUnder >= 0 ? this.sharedSheetWater[sharedUnder] : heightAt(px, pz);
					if (sharedTop >= 0) this.sharedSheetWater[sharedTop] = h;
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
			const tip = 3 * (slice * LOFT_SAMPLES + E + LANDMARK.lip);
			r.sliceTipX[slice] = r.positions[tip];
			r.sliceTipY[slice] = this.normalDemand ? NaN : r.positions[tip + 1];
			r.sliceTipZ[slice] = r.positions[tip + 2];
			r.sliceCount += 1;
		}
		closeRun();
		r.vertexCount = r.sliceCount * LOFT_SAMPLES;
	}
	/** Verify the float32 geometry using the exact rays the contact reads. */
	measureRayAdvance() {
		const r = this.result;
		let minimum = Infinity;
		for (let s = 0; s + 1 < r.sliceCount; s += 1) {
			if (r.sliceJoined[s] !== 1) continue;
			for (let j = 0; j < LOFT_SAMPLES; j += 1) {
				const a = 3 * (s * LOFT_SAMPLES + j);
				const b = a + 3 * LOFT_SAMPLES;
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
		const ramp = REST.ramp * height;
		const near = REST.near * height;
		const cap = Math.max(0, Math.min(REST.ahead * height, room));
		const latest = Math.max(0, cap - ramp);
		let hold = latest;
		let climb = NaN;
		let previous = 0;
		let previousGap = 0;
		for (let k = 0;; k += 1) {
			const at = Math.min(k * REST.step, latest);
			const gap = heightAt(ax + (toeX + at) * nx, az + (toeX + at) * nz) - level;
			this.result.restSamples += 1;
			if (k === 0) out[3] = gap;
			if (gap <= near) {
				hold = k === 0 ? 0 : previous + (at - previous) * (previousGap - near) / (previousGap - gap);
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
		out[1] = hold + Math.max(Math.min(ramp, cap - hold), .001);
		out[2] = climb;
	}
	/** A run of consecutive slices: its normals, and its strips joined. */
	finishRun(firstSlice, lastSlice) {
		const r = this.result;
		if (this.normalDemand) {
			this.normalFirst.fill(firstSlice, firstSlice, lastSlice + 1);
			this.normalLast.fill(lastSlice, firstSlice, lastSlice + 1);
		} else this.normals(firstSlice, lastSlice);
		let open = r.sliceSigma[firstSlice];
		for (let s = firstSlice; s <= lastSlice; s += 1) {
			if (!(r.sliceFormed[s] > 0)) open = r.sliceSigma[s];
			r.sliceMouth[s] = r.sliceFormed[s] > 0 ? r.sliceSigma[s] - open : 0;
		}
		open = r.sliceSigma[lastSlice];
		for (let s = lastSlice; s >= firstSlice; s -= 1) {
			if (!(r.sliceFormed[s] > 0)) open = r.sliceSigma[s];
			if (r.sliceFormed[s] > 0) r.sliceMouth[s] = Math.min(r.sliceMouth[s], open - r.sliceSigma[s]);
		}
		this.joinRun(firstSlice, lastSlice);
	}
	/** Join before overlap decisions; normals and mouth are calculated once on the final surviving runs. */
	joinRun(firstSlice, lastSlice) {
		for (let s = firstSlice; s < lastSlice; s += 1) this.result.sliceJoined[s] = 1;
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
			while (last + 1 < r.sliceCount && r.sliceJoined[last] === 1) last += 1;
			const cutFirst = r.sliceWeight[first] > 0;
			const cutLast = r.sliceWeight[last] > 0;
			if (cutFirst || cutLast) for (let s = first; s <= last; s += 1) {
				const distance = Math.min(cutFirst ? r.sliceSigma[s] - r.sliceSigma[first] : Infinity, cutLast ? r.sliceSigma[last] - r.sliceSigma[s] : Infinity);
				const u = Math.min(1, Math.max(0, distance / LOFT.endBlend));
				const weight = u * u * (3 - 2 * u);
				const mask = Math.min(1, Math.max(0, distance / LOFT.band));
				r.sliceWeight[s] *= weight;
				if (this.normalDemand) this.sealBlend[s] = weight;
				for (let j = 0; j < LOFT_SAMPLES; j += 1) {
					const v = s * LOFT_SAMPLES + j;
					if (weight < 1 && r.lift[v] > 0) {
						if (this.normalDemand) this.sealApplies[v] = 1;
						else {
							const water = heightAt(r.positions[3 * v], r.positions[3 * v + 2]);
							r.positions[3 * v + 1] = water + weight * (r.positions[3 * v + 1] - water);
						}
						r.lift[v] *= weight;
						r.sheetWeight[v] *= weight;
						r.throat[4 * v + 3] *= weight;
					}
					r.mask[v] *= mask;
				}
				if (!this.normalDemand) r.sliceTipY[s] = r.positions[3 * (s * LOFT_SAMPLES + E + LANDMARK.lip) + 1];
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
		const out = this.landmarkVelocity(s, tau, frameSeconds, LANDMARK.crest);
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
		query.hold = "contact";
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
			if (r.sliceJoined[s] !== 1) continue;
			const analytic = this.library.options.geometry === "bounded-C";
			for (let j = 0; j < LOFT_SAMPLES - 1; j += 1) {
				const v00 = s * LOFT_SAMPLES + j;
				const v10 = v00 + LOFT_SAMPLES;
				const i = r.indexCount;
				const a = 3 * v00, b = 3 * v10, p = r.positions;
				const reverse = analytic && (p[a + 3] - p[a]) * r.sliceRayX[s] + (p[a + 5] - p[a + 2]) * r.sliceRayZ[s] + (p[b + 3] - p[b]) * r.sliceRayX[s + 1] + (p[b + 5] - p[b + 2]) * r.sliceRayZ[s + 1] < 0;
				r.indices[i] = v00;
				r.indices[i + 1] = v10;
				r.indices[i + 2] = reverse ? v10 + 1 : v00 + 1;
				r.indices[i + 3] = reverse ? v00 : v00 + 1;
				r.indices[i + 4] = reverse ? v10 + 1 : v10;
				r.indices[i + 5] = reverse ? v00 + 1 : v10 + 1;
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
		const starts = [];
		const resting = (s) => !(r.sliceWeight[s] > 0) && !(r.sliceWeight[s + 1] > 0);
		for (let s = 0; s < r.sliceCount; s += 1) {
			if (s === 0 || r.sliceFront[s] !== r.sliceFront[s - 1]) starts.push(s);
			if (r.sliceJoined[s] !== 1) continue;
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
		if (starts.length < 2) return;
		starts.push(r.sliceCount);
		const frontBox = (f) => {
			const box = [
				Infinity,
				-Infinity,
				Infinity,
				-Infinity
			];
			for (let s = starts[f]; s < starts[f + 1]; s += 1) {
				if (r.sliceJoined[s] !== 1) continue;
				box[0] = Math.min(box[0], boxes[4 * s]);
				box[1] = Math.max(box[1], boxes[4 * s + 1]);
				box[2] = Math.min(box[2], boxes[4 * s + 2]);
				box[3] = Math.max(box[3], boxes[4 * s + 3]);
			}
			return box;
		};
		const apart = (a, i, b, j) => a[i + 1] < b[j] || b[j + 1] < a[i] || a[i + 3] < b[j + 2] || b[j + 3] < a[i + 2];
		for (let later = 1; later + 1 < starts.length; later += 1) for (let earlier = 0; earlier < later; earlier += 1) {
			if (apart(frontBox(later), 0, frontBox(earlier), 0)) continue;
			for (let s = starts[later]; s < starts[later + 1]; s += 1) {
				if (r.sliceJoined[s] !== 1) continue;
				for (let t = starts[earlier]; t < starts[earlier + 1]; t += 1) {
					if (r.sliceJoined[t] !== 1 || apart(boxes, 4 * s, boxes, 4 * t) || !this.hullsOverlap(8 * s, 8 * t)) continue;
					if (!resting(s) && resting(t)) {
						r.sliceJoined[t] = 0;
						continue;
					}
					r.sliceJoined[s] = 0;
					if (resting(s)) break;
					r.overlaps += 1;
					const weight = Math.max(r.sliceWeight[s], r.sliceWeight[s + 1]);
					if ((r.slicePhase[s] === 1 && r.sliceOverturned[s] === 1 || r.slicePhase[s + 1] === 1 && r.sliceOverturned[s + 1] === 1) && weight > 0) {
						r.overlapsOpen += 1;
						r.overlapOpenWeight = Math.max(r.overlapOpenWeight, weight);
					}
					break;
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
			for (let i = 0; i < 4; i += 1) for (let j = i + 1; j < 4; j += 1) {
				const ax = c[base + 2 * i + 1] - c[base + 2 * j + 1];
				const az = c[base + 2 * j] - c[base + 2 * i];
				if (ax === 0 && az === 0) continue;
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
				if (maxA <= minB || maxB <= minA) return false;
			}
		}
		return true;
	}
	/** Materialize the original initial F32 Y store, then its separate cut-seal F32 store, once for this row. */
	prepareRow(row) {
		if (this.heightReady[row] === 1) return;
		const r = this.result;
		const heightAt = this.rowHeightAt;
		if (!(row >= 0 && row < r.sliceCount) || !heightAt) throw new Error("Contact height row is outside its captured generation");
		const weight = this.sealBlend[row];
		const sharedSheet = this.sharedSheetRows[row] === 1;
		for (let j = 0; j < LOFT_SAMPLES; j += 1) {
			const v = row * LOFT_SAMPLES + j;
			const o = 3 * v;
			const e = this.initialBlend[v];
			if (e === 1) r.positions[o + 1] = this.targetY[v];
			else {
				const profileIndex = j - E;
				const sharedTop = sharedSheet && profileIndex >= 38 && profileIndex <= 58 ? profileIndex - 38 : -1;
				const sharedUnder = sharedSheet && profileIndex >= 68 && profileIndex <= 88 ? 88 - profileIndex : -1;
				const h = sharedUnder >= 0 ? this.sharedSheetWater[sharedUnder] : heightAt(this.initialX[v], this.initialZ[v]);
				if (sharedTop >= 0) this.sharedSheetWater[sharedTop] = h;
				r.positions[o + 1] = e === 0 ? h : h + e * (this.targetY[v] - h);
			}
			if (this.sealApplies[v] === 1) {
				const water = heightAt(r.positions[o], r.positions[o + 2]);
				r.positions[o + 1] = water + weight * (r.positions[o + 1] - water);
			}
		}
		r.sliceTipY[row] = r.positions[3 * (row * LOFT_SAMPLES + E + LANDMARK.lip) + 1];
		this.heightReady[row] = 1;
	}
	/** Each vertex's normal: across the profile × along the front, by central differences (one-sided at the edges). */
	prepareNormal(vertex) {
		if (this.normalReady[vertex] === 1) return;
		const s = Math.floor(vertex / LOFT_SAMPLES);
		const j = vertex % LOFT_SAMPLES;
		const firstSlice = this.normalFirst[s];
		const lastSlice = this.normalLast[s];
		if (!(vertex >= 0 && vertex < this.result.vertexCount && firstSlice >= 0 && lastSlice >= firstSlice)) throw new Error("A selected contact normal is outside its captured final run");
		const { positions: p, normals } = this.result;
		const sBack = Math.max(firstSlice, s - 1);
		const sAhead = Math.min(lastSlice, s + 1);
		this.prepareRow(s);
		this.prepareRow(sBack);
		this.prepareRow(sAhead);
		const jBack = Math.max(0, j - 1);
		const jAhead = Math.min(LOFT_SAMPLES - 1, j + 1);
		const a0 = 3 * (s * LOFT_SAMPLES + jBack);
		const a1 = 3 * (s * LOFT_SAMPLES + jAhead);
		const b0 = 3 * (sBack * LOFT_SAMPLES + j);
		const b1 = 3 * (sAhead * LOFT_SAMPLES + j);
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
		} else {
			cx = 0;
			cy = 1;
			cz = 0;
		}
		const o = 3 * vertex;
		normals[o] = cx;
		normals[o + 1] = cy;
		normals[o + 2] = cz;
		this.normalReady[vertex] = 1;
	}
	normals(firstSlice, lastSlice) {
		const { positions: p, normals } = this.result;
		for (let s = firstSlice; s <= lastSlice; s += 1) {
			const sBack = Math.max(firstSlice, s - 1);
			const sAhead = Math.min(lastSlice, s + 1);
			for (let j = 0; j < LOFT_SAMPLES; j += 1) {
				const jBack = Math.max(0, j - 1);
				const jAhead = Math.min(LOFT_SAMPLES - 1, j + 1);
				const a0 = 3 * (s * LOFT_SAMPLES + jBack);
				const a1 = 3 * (s * LOFT_SAMPLES + jAhead);
				const b0 = 3 * (sBack * LOFT_SAMPLES + j);
				const b1 = 3 * (sAhead * LOFT_SAMPLES + j);
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
				} else {
					cx = 0;
					cy = 1;
					cz = 0;
				}
				const o = 3 * (s * LOFT_SAMPLES + j);
				normals[o] = cx;
				normals[o + 1] = cy;
				normals[o + 2] = cz;
			}
		}
	}
};
//#endregion
//#region inspect-fixture.ts
const cases = readBarrelCases().map(decodeCase);
const library = new ProfileLibrary(cases, { geometry: "bounded-C" });
const c = cases.find((v) => v.id === "pad19-a30-l12");
const p = /* @__PURE__ */ new Float32Array(256);
const q0 = {
	slope: c.slope,
	footHeight: c.nonlinearity * 7,
	footDepth: 7
};
library.profileAt({
	...q0,
	seconds: library.profileTimes(q0).clearSeconds
}, p);
const scale = 3 / (p[2 * LANDMARK.crest + 1] - p[2 * LANDMARK.toe + 1]);
const query = {
	slope: q0.slope,
	footHeight: q0.footHeight * scale,
	footDepth: q0.footDepth * scale
};
const times = library.profileTimes(query);
const authored = times.clearSeconds / .4;
const records = /* @__PURE__ */ new Float32Array(81);
for (let k = 0; k < 9; k++) {
	const x = k + .5;
	records.set([
		x,
		-100,
		1,
		k,
		authored + (4.9 - x) * (.3 * authored / 1.5),
		query.footHeight,
		query.footDepth,
		-100,
		0
	], k * 9);
}
const tauAt = (x) => records[FRONT_FIELD.tau] + (x - records[FRONT_FIELD.x]) * (records[9 + FRONT_FIELD.tau] - records[FRONT_FIELD.tau]);
const eligible = (x) => tauAt(x) >= times.clearSeconds && tauAt(x) <= times.touchdownSeconds;
const vertex = (row, point) => row * LOFT_SAMPLES$1 + LOFT$1.extensionSamples + point;
const sub = (a, b) => a.map((v, k) => v - b[k]);
function turn(a, b, c) {
	const u = sub(b, a), v = sub(c, b);
	return Math.acos(Math.max(-1, Math.min(1, u.reduce((s, x, k) => s + x * v[k], 0) / (Math.hypot(...u) * Math.hypot(...v))))) * 180 / Math.PI;
}
function inspect(draw) {
	const rows = [];
	for (let row = 0; row < draw.sliceCount; row++) {
		const x = draw.positions[3 * vertex(row, LANDMARK.crest)];
		if (x < 3.5 || x > 5.5 || draw.sliceWeight[row] !== 1 || draw.slicePhase[row] !== 1 || !eligible(x)) continue;
		rows.push({
			row,
			x,
			tau: draw.sliceTau[row],
			cap: Array.from(draw.positions.subarray(3 * vertex(row, LANDMARK.lip), 3 * vertex(row, LANDMARK.lip) + 3)),
			bend: null
		});
	}
	for (let k = 1; k + 1 < rows.length; k++) rows[k].bend = turn(rows[k - 1].cap, rows[k].cap, rows[k + 1].cap);
	return {
		counts: {
			slices: draw.sliceCount,
			vertices: draw.vertexCount,
			indices: draw.indexCount
		},
		cSampling: draw.cSampling,
		rows,
		maximum: Math.max(...rows.flatMap((v) => v.bend === null ? [] : [v.bend]))
	};
}
const mandatory = Array.from({ length: 9 }, (_, k) => 3.5 + k / 4).filter(eligible).map((x) => {
	let k = 0;
	while (k + 1 < 8 && records[(k + 1) * 9] < x) k++;
	const a = k * 9, b = (k + 1) * 9, s = (x - records[a]) / (records[b] - records[a]);
	const field = (offset) => records[a + offset] + s * (records[b + offset] - records[a + offset]);
	library.profileAt({
		...query,
		footHeight: field(FRONT_FIELD.footHeight),
		footDepth: field(FRONT_FIELD.footDepth),
		seconds: field(FRONT_FIELD.tau)
	}, p);
	return {
		x,
		cap: [
			x,
			.5 + p[2 * LANDMARK.lip + 1],
			field(FRONT_FIELD.z) - p[2 * LANDMARK.crest] + p[2 * LANDMARK.lip]
		],
		bend: null
	};
});
for (let k = 1; k + 1 < mandatory.length; k++) mandatory[k].bend = turn(mandatory[k - 1].cap, mandatory[k].cap, mandatory[k + 1].cap);
const before = inspect(new SweptLoft$1(library, query.slope, { sheet: false }).build(records, 9, .5, () => .5));
const trial = inspect(new SweptLoft(library, query.slope, { sheet: false }).build(records, 9, .5, () => .5));
console.log(JSON.stringify({
	schema: "root-angular-fixture-decomposition/v1",
	fixture: "Existing cap test provider fixture; no native seed, camera or riding evidence",
	rawFrontPacket: Array.from(records),
	query,
	times,
	mandatory,
	before,
	trial,
	productionChanged: false
}, null, 2));
//#endregion
export {};
