import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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
const FLOATS$1 = 256;
/**
* The highest point of frame f's lower surface (the face and on, from the throat to the front end) under (x, y), h0;
* NaN where none lies under it.
*/
function surfaceBeneath(frames, f, x, y) {
	const o = f * FLOATS$1;
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
	const o = f * FLOATS$1;
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
	const count = c.frames.length / FLOATS$1;
	const last = Math.min(count - 1, Math.floor((c.touchdown - c.tauStart) / c.tauStep + 1e-6) - 1);
	for (let f = last; f >= 0; f -= 1) {
		const o = f * FLOATS$1;
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
//#region ../../../../../private/tmp/tube-thinner-roof-20261004/load-cases.ts
const ROOT = "/Users/regina/Desktop/Projects/surfing-game";
const WORK = "/private/tmp/tube-thinner-roof-20261004";
const FLOATS = 256;
const sha = (b) => createHash("sha256").update(b).digest("hex");
assert(!existsSync(join(WORK, "eligible-cases.json")));
function beneath(c, f, x, y) {
	const o = f * FLOATS;
	let best = NaN;
	for (let i = LANDMARK.throat; i < LANDMARK.front; i++) {
		const x0 = c.frames[o + 2 * i], x1 = c.frames[o + 2 * i + 2];
		if (x0 === x1 || (x0 - x) * (x1 - x) > 0) continue;
		const y0 = c.frames[o + 2 * i + 1];
		const under = y0 + (x - x0) / (x1 - x0) * (c.frames[o + 2 * i + 3] - y0);
		if (under < y && !(under <= best)) best = under;
	}
	return best;
}
const ownerPath = "/private/tmp/tube-lip-attribution-20261004/native-first-owner.json";
const owner = JSON.parse(readFileSync(ownerPath, "utf8"));
const files = readdirSync(join(ROOT, "public/barrels")).filter((p) => p.endsWith(".bin")).sort();
assert.equal(files.length, 8);
const cases = files.map((file) => {
	const path = join(ROOT, "public/barrels", file), b = new Uint8Array(readFileSync(path));
	const hash = sha(b), runtime = owner.served["barrels/" + file];
	if (runtime) {
		assert.equal(runtime.sha256, hash);
		assert.equal(runtime.bytes, b.length);
	}
	const c = decodeCase(b);
	assert(c.frames.every(Number.isFinite));
	const count = c.frames.length / FLOATS;
	assert(Number.isInteger(count));
	const last = Math.min(count - 1, Math.floor((c.touchdown - c.tauStart) / c.tauStep + 1e-6) - 1);
	const eligible = [];
	for (let f = 0; f <= last; f++) {
		const o = f * FLOATS, x = c.frames[o + 2 * LANDMARK.lip], y = c.frames[o + 2 * LANDMARK.lip + 1];
		const reach = x - c.frames[o + 2 * LANDMARK.throat], clear = y - beneath(c, f, x, y);
		if (!(reach >= CLEAR.gap && clear >= CLEAR.gap)) continue;
		const raw = c.frames.slice(o, o + FLOATS);
		eligible.push({
			frame: f,
			tau: c.tauStart + f * c.tauStep,
			lipThroatReach: reach,
			lipFloorClearance: clear,
			profile: Array.from(raw)
		});
	}
	const held = heldFrame(c);
	assert(held.clear);
	assert.equal(eligible.at(-1)?.tau, held.tau);
	return {
		id: c.id,
		asset: {
			file: path,
			bytes: b.length,
			sha256: hash,
			matchedNativeReceipt: !!runtime
		},
		source: {
			slope: c.slope,
			nonlinearity: c.nonlinearity,
			tauStart: c.tauStart,
			tauStep: c.tauStep,
			touchdown: c.touchdown,
			frameCount: count,
			lastSearchFrame: last,
			clearThreshold: CLEAR.gap
		},
		held,
		eligible
	};
});
const sourceFiles = ["src/wave/barrel/ProfileLibrary.ts", "src/wave/barrel/profileFormat.ts"].map((file) => {
	const path = join(ROOT, file), b = readFileSync(path);
	return {
		file: path,
		bytes: b.length,
		sha256: sha(b)
	};
});
writeFileSync(join(WORK, "eligible-cases.json"), JSON.stringify({
	schema: "thin-roof-eligible/v1",
	complete: true,
	sourceFiles,
	sourceOwner: ownerPath,
	eligibility: "Exact heldFrame bounds, lip-throat reach and lip-floor clearance; all passing frames before touchdown",
	cases
}));
console.log(JSON.stringify({
	complete: true,
	cases: cases.map((c) => ({
		id: c.id,
		eligible: c.eligible.length,
		heldTau: c.held.tau
	})),
	source: join(WORK, "eligible-cases.json")
}));
//#endregion
export {};
