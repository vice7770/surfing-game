"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANYON = exports.PADANG = exports.REEF = exports.POINT_OUTER = exports.BEACH_OUTER = exports.POINT_HEADLAND = exports.BEACH_BAR = void 0;
exports.smoothstep = smoothstep;
exports.deanDepth = deanDepth;
exports.reefCrestZ = reefCrestZ;
exports.reefLedgeAt = reefLedgeAt;
exports.reefSeaward = reefSeaward;
exports.padangBaseZ = padangBaseZ;
exports.padangKneeZ = padangKneeZ;
exports.padangForeFootZ = padangForeFootZ;
exports.padangCrestZ = padangCrestZ;
exports.padangSeaward = padangSeaward;
exports.padangReefAt = padangReefAt;
exports.padangFocusShape = padangFocusShape;
exports.createSpot = createSpot;
const pool_1 = require("./pool");
const random_1 = require("./random");
function smoothstep(edge0, edge1, value) {
    const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}
/** Dean (1991) equilibrium profile h = A s^(2/3) at offshore distance s, capped, with a planar foreshore on land. */
function deanDepth(offshore, a = 0.12, maxDepth = 12, landSlope = 0.06) {
    if (offshore <= 0)
        return offshore * landSlope;
    return Math.min(maxDepth, a * Math.pow(offshore, 2 / 3));
}
exports.BEACH_BAR = { offshore: 90, height: 0.9, width: 18, ripSpacing: 110, ripWidth: 22, ripJitter: 25 };
exports.POINT_HEADLAND = { center: 0, halfWidth: 150, protrusion: 120, slope: 0.04, maxDepth: 12 };
/**
 * The Beach's outer bar and shelf (the wave-sizes spec; docs/research/outer-profiles.md): a Gaussian bar 2 m
 * high 450 m out (crest 5 m deep, inside Duck's 300–600 m and 3–8 m), 80 m long so its tail leaves the inner
 * bed alone, on Dean's profile continued to 30 m.
 */
exports.BEACH_OUTER = { barOffshore: 450, barHeight: 2, barWidth: 80, maxDepth: 30 };
/** The Point's shelf past its 12 m: a gentler 1:67 slope to 30 m (an assumption; see the research doc). */
exports.POINT_OUTER = { slope: 0.015, maxDepth: 30 };
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
exports.REEF = {
    deep: 30, foreSlope: 1 / 2.29, shelfEdge: -150, shelfDepth: 10,
    ledgeSlope: 1 / 2.29, crestDepth: 1.5, crestX: -80, crestZ: -120, angle: 45,
    passX: 80, passHalfWidth: 25, passDepth: 12, takeOffX: -50,
    // Shoreward of the crest (Part C): a reef flat, a lagoon, and the Teahupo'o model's 1:9.64 inland slope
    // (zenodo 11392175). The flat's width and the lagoon's depth are provisional until its profile is read.
    flatWidth: 20, lagoonDepth: 2.5, inlandSlope: 1 / 9.64,
};
/** Where the Reef's crest line (the top of its ledge) crosses along-shore position x. */
function reefCrestZ(x) {
    return exports.REEF.crestZ + (x - exports.REEF.crestX) * Math.tan((exports.REEF.angle * Math.PI) / 180);
}
/**
 * Whether the Reef's ledge is ridden at along-shore position x: out of the pass (beyond two of its
 * half-widths from its axis) and where the crest still lies seaward of the inland slope's crest depth.
 * Past it, waves break on the beach face in the pass and the lagoon: not the Reef's wave.
 */
function reefLedgeAt(x) {
    return x < exports.REEF.passX - 2 * exports.REEF.passHalfWidth && reefCrestZ(x) < -exports.REEF.crestDepth / exports.REEF.inlandSlope;
}
/** Distance seaward of the Reef's crest line, m, measured across it (negative shoreward of it). */
function reefSeaward(x, z) {
    return (reefCrestZ(x) - z) * Math.cos((exports.REEF.angle * Math.PI) / 180);
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
exports.PADANG = {
    deep: 25, foreSlope: 1 / 20, foreRounding: 10, kneeDepth: 12, rampSlope: 1 / 80,
    /**
     * The wedge's slope across its crest line: 1:19 along the swell's path, which crosses the 40° line obliquely (1:14.6
     * as the swell arrives square, about 1:15.8 once refraction turns it toward the wedge's normal). At 1:19 across the line
     * the swell climbed 1:24.8: in Basilisk (level 11) the peak's face went vertical 16 m before the flat and threw a tube
     * of 0.125 H²; at 1:19 along the path, 3.6 m before it, the lip landing on the flat and the tube 0.208 H², 1.7 × larger.
     */
    wedgeSlope: 1 / 15,
    baseDepth: 7, crestDepth: 1.25, peakX: -60, peakZ: -170, angle: 40, endWidth: 20,
    alongShore: 320, channelX: 160, channelHalfWidth: 45, shoreSlope: 0.2, takeOffX: -50,
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
    focusRelief: 2, focusLength: 150, focusInset: 80, focusHalfWidth: 70,
};
/** Where Padang Padang's wedge rises from the ramp at its peak: `baseDepth` deep, (baseDepth − crestDepth) / wedgeSlope across the crest line. */
function padangBaseZ() {
    const { peakZ, baseDepth, crestDepth, wedgeSlope, angle } = exports.PADANG;
    return peakZ - (baseDepth - crestDepth) / wedgeSlope / Math.cos((angle * Math.PI) / 180);
}
/** Where Padang Padang's forereef meets its ramp (the knee's centre): the ramp climbs from kneeDepth there to baseDepth at the peak's base. */
function padangKneeZ() {
    return padangBaseZ() - (exports.PADANG.kneeDepth - exports.PADANG.baseDepth) / exports.PADANG.rampSlope;
}
/** Where Padang Padang's forereef rises from deep water (its foot's centre). */
function padangForeFootZ() {
    return padangKneeZ() - (exports.PADANG.deep - exports.PADANG.kneeDepth) / exports.PADANG.foreSlope;
}
/** Where Padang Padang's crest line (the top of its wedge) crosses along-shore position x. */
function padangCrestZ(x) {
    return exports.PADANG.peakZ + (x - exports.PADANG.peakX) * Math.tan((exports.PADANG.angle * Math.PI) / 180);
}
/** Distance seaward of Padang Padang's crest line, m, measured across it (negative shoreward of it). */
function padangSeaward(x, z) {
    return (padangCrestZ(x) - z) * Math.cos((exports.PADANG.angle * Math.PI) / 180);
}
/** max(0, d), rounded quadratically (C¹) over ±r: a ramp's knee without a slope break. */
function rounded(d, r) {
    if (d <= -r)
        return 0;
    if (d >= r)
        return d;
    return ((d + r) * (d + r)) / (4 * r);
}
/** Whether Padang Padang's reef is ridden at along-shore position x: from its peak to where the channel begins (two half-widths from its axis). */
function padangReefAt(x) {
    return x >= exports.PADANG.peakX && x < exports.PADANG.channelX - 2 * exports.PADANG.channelHalfWidth;
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
exports.CANYON = { axisX: 80, halfWidth: 30, depth: 14, head: 60, fullAt: 160, fadeStart: 200, fadeEnd: 250 };
function beach(seed) {
    const random = (0, random_1.seededRandom)(seed, 0xbeac4);
    const rips = [];
    for (let k = -8; k <= 8; k += 1)
        rips.push(k * exports.BEACH_BAR.ripSpacing + (random() * 2 - 1) * exports.BEACH_BAR.ripJitter);
    return {
        name: 'beach',
        depthAt(x, z) {
            const offshore = -z;
            let gap = 0;
            for (const rip of rips)
                gap = Math.max(gap, Math.exp(-(((x - rip) / exports.BEACH_BAR.ripWidth) ** 2)));
            const bar = exports.BEACH_BAR.height * Math.exp(-(((offshore - exports.BEACH_BAR.offshore) / exports.BEACH_BAR.width) ** 2)) * (1 - gap);
            const outerBar = exports.BEACH_OUTER.barHeight * Math.exp(-(((offshore - exports.BEACH_OUTER.barOffshore) / exports.BEACH_OUTER.barWidth) ** 2));
            return deanDepth(offshore, 0.12, exports.BEACH_OUTER.maxDepth) - bar - outerBar;
        },
    };
}
function point() {
    const { center, halfWidth, protrusion, slope, maxDepth } = exports.POINT_HEADLAND;
    return {
        name: 'point',
        depthAt(x, z) {
            // The shoreline steps offshore across the headland; its flank sets the contour angle.
            const shoreline = -protrusion * smoothstep(center + halfWidth, center - halfWidth, x);
            const offshore = shoreline - z;
            if (offshore <= 0)
                return offshore * 0.06;
            const shelf = maxDepth / slope;
            return offshore <= shelf ? slope * offshore : Math.min(exports.POINT_OUTER.maxDepth, maxDepth + exports.POINT_OUTER.slope * (offshore - shelf));
        },
    };
}
/** The Reef's bed in its parts: the pass's weight, the reef's own depth, how far inside its crest, and the shore's. */
function reefTerms(x, z) {
    const r = exports.REEF;
    // The shore-parallel forereef up to the shelf; on the shelf, the ledge rising from it to the crest.
    // The crest line keeps the ledge's foot shoreward of the shelf's edge (at the peak they meet), so the bed has no cliff.
    const fore = z >= r.shelfEdge ? r.shelfDepth : Math.min(r.deep, r.shelfDepth + (r.shelfEdge - z) * r.foreSlope);
    const seaward = reefSeaward(x, z);
    const ledge = r.crestDepth + Math.max(0, seaward) * r.ledgeSlope;
    // Shoreward of the crest: the reef flat at the crest's depth, then its inner edge falling to the lagoon, no steeper than the ledge.
    const inside = Math.max(0, -seaward);
    const lagoon = Math.min(r.lagoonDepth, r.crestDepth + Math.max(0, inside - r.flatWidth) * r.ledgeSlope);
    const onReef = z >= r.shelfEdge ? Math.min(r.shelfDepth, seaward >= 0 ? ledge : lagoon) : fore;
    // The pass: no reef, the shelf deepened to passDepth; flat across its axis at the window's edge.
    const pass = Math.exp(-(((x - r.passX) / r.passHalfWidth) ** 2));
    // The inland slope up to the shore, and dry land shoreward of z = 0. It rises from the shelf, not under the forereef:
    // at the shelf's edge the plane is still deeper than the shelf, so it ends there without a step.
    const beachFace = z >= 0 ? -z * 0.06 : z >= r.shelfEdge ? -z * r.inlandSlope : Infinity;
    return { pass, onReef, fore, inside, beachFace };
}
function reef() {
    return {
        name: 'reef',
        depthAt(x, z) {
            const { pass, onReef, fore, beachFace } = reefTerms(x, z);
            const depth = onReef + (Math.max(fore, exports.REEF.passDepth) - onReef) * pass;
            return Math.min(depth, beachFace);
        },
        // Rock where the reef builds the bed (Part C): out of the pass, seaward of the shore, down to the lagoon's floor.
        materialAt(x, z) {
            const r = exports.REEF;
            const { pass, onReef, inside, beachFace } = reefTerms(x, z);
            const reefWall = r.flatWidth + (r.lagoonDepth - r.crestDepth) / r.ledgeSlope;
            return pass < 0.5 && onReef < beachFace && inside < reefWall ? 'reef' : 'sand';
        },
    };
}
/** cos²(π/2 · d/reach) inside ±reach, 0 beyond: a bump's profile, C¹ at its centre and its edge. */
function bump(d, reach) {
    return Math.abs(d) >= reach ? 0 : Math.cos((Math.PI / 2) * (d / reach)) ** 2;
}
/** Padang Padang's focus, 0–1: 1 on the swell's line through the peak where it crosses the wedge's base. */
function padangFocusShape(x, z) {
    const p = exports.PADANG;
    const seaward = padangBaseZ() - z;
    return bump(x - p.peakX, p.focusHalfWidth) * bump(seaward, seaward >= 0 ? p.focusLength : p.focusInset);
}
/** Padang Padang's bed in its parts: the channel's weight, the depth beneath the beach face, and the beach face's. */
function padangTerms(x, z) {
    const p = exports.PADANG;
    const knee = padangKneeZ();
    const r = p.foreRounding;
    // Shore-parallel: the forereef from deep water up to the knee, rounded (C¹) at its foot and at the knee so its slope breaks
    // scatter no spurious harmonics; the channel keeps the knee's depth shoreward, the reef has Mead's ramp.
    const fore = p.kneeDepth + (rounded(knee - z, r) - rounded(padangForeFootZ() - z, r)) * p.foreSlope;
    const ramp = fore - rounded(z - knee, r) * p.rampSlope;
    // The wedge, where it is shallower than the ramp, faded out upcoast of the peak.
    const wedge = p.crestDepth + Math.max(0, padangSeaward(x, z)) * p.wedgeSlope;
    const bare = ramp - Math.max(0, ramp - wedge) * smoothstep(p.peakX - p.endWidth, p.peakX, x);
    const reef = bare - p.focusRelief * padangFocusShape(x, z);
    // The channel: no reef, level across its axis at the window's edge, over the ramp deepened toward the knee's depth by
    // `channelDeepening` (1: the knee's depth to the shore; 0: the bare ramp), shoreward of `channelFrom` (rounded over
    // twice the forereef's rounding, so its seaward end is no cliff; −Infinity: from the knee).
    const channel = Math.exp(-(((x - p.channelX) / p.channelHalfWidth) ** 2));
    const inshore = p.channelFrom === -Infinity ? 1 : smoothstep(p.channelFrom - 2 * r, p.channelFrom + 2 * r, z);
    const floor = ramp + (fore - ramp) * p.channelDeepening * inshore;
    // A beach face, and dry land shoreward of z = 0.
    return { channel, depth: reef + (floor - reef) * channel, beachFace: z < 0 ? -z * p.shoreSlope : -z * 0.06 };
}
function padang() {
    return {
        name: 'padang',
        depthAt(x, z) {
            const { depth, beachFace } = padangTerms(x, z);
            return Math.min(depth, beachFace);
        },
        // Coral where the reef builds the bed, as the Reef's rock: out of the channel (unmapped by the coral atlas) and off the sand beach.
        materialAt(x, z) {
            const { channel, depth, beachFace } = padangTerms(x, z);
            return channel < 0.5 && depth < beachFace ? 'reef' : 'sand';
        },
    };
}
function canyon() {
    return {
        name: 'canyon',
        depthAt(x, z) {
            const offshore = -z;
            const along = smoothstep(exports.CANYON.head, exports.CANYON.fullAt, offshore) * (1 - smoothstep(exports.CANYON.fadeStart, exports.CANYON.fadeEnd, offshore));
            return deanDepth(offshore) + exports.CANYON.depth * Math.exp(-(((x - exports.CANYON.axisX) / exports.CANYON.halfWidth) ** 2)) * along;
        },
    };
}
function createSpot(name, seed) {
    switch (name) {
        case 'beach': return beach(seed);
        case 'point': return point();
        case 'reef': return reef();
        case 'canyon': return canyon();
        case 'padang': return padang();
        case 'pool': return (0, pool_1.poolSpot)();
    }
}
