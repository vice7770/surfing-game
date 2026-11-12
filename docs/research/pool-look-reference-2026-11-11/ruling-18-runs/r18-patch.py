import sys,re
p=sys.argv[1]; R=sys.argv[2]
t=open(p).read()
t=t.replace("'../../../../src/", "'"+R+"/src/")
def rep(a,b,count=1):
    global t
    assert t.count(a)>=1, a[:60]
    t=t.replace(a,b,count)
# imports
rep("import { GRAVITY }", "import { SeaState } from '"+R+"/src/wave/SeaState';\nimport { SeaStateBoundary } from '"+R+"/src/wave/SeaStateBoundary';\nimport { GRAVITY }")
# feed2 patch after sim built
rep("const crash = sim.crash;", r'''// r18 (T3): a second wave train on the machine's zone, probe only. `--feed2 r,T,n`: amplitude r of the main's, period T s,
// n along-shore wavelengths in the wrapped window; both scaled so the energy is the one wave's.
const feed2 = option('feed2');
if (feed2) {
  const [r2, T2, n2] = feed2.split(',').map(Number);
  const main = sim.sea.components[0];
  const W = (2 * Math.PI * POOL_STRAIGHT.periodicWaves) / Math.abs(main.kx);
  const omega2 = (2 * Math.PI) / T2; const k2 = sim.sea.waveNumberAt(omega2, sim.sea.depth);
  const dir2 = Math.sign(main.kx) * Math.asin(Math.min(1, (2 * Math.PI * n2) / (W * k2)));
  const scale = 1 / Math.sqrt(1 + r2 * r2);
  const sea2 = new SeaState([{ amplitude: main.amplitude * scale, omega: main.omega, direction: main.direction, phase: main.phase }, { amplitude: main.amplitude * scale * r2, omega: omega2, direction: dir2, phase: 1.3 }], sim.sea.depth, sim.sea.waveNumberAt);
  const b = (sim as unknown as { boundary: SeaStateBoundary }).boundary;
  const nb = new SeaStateBoundary(sim.solver as never, sea2, b.weights, b.timeOffset);
  Object.assign(b, nb);
  console.log(`r18 feed2: window ${W.toFixed(1)} m; main a ${(main.amplitude * scale).toFixed(3)} m, T ${(2 * Math.PI / main.omega).toFixed(2)} s, ${(main.direction * 180 / Math.PI).toFixed(1)} deg; second a ${(main.amplitude * scale * r2).toFixed(3)} m, T ${T2} s, ${(dir2 * 180 / Math.PI).toFixed(1)} deg (n ${n2}); components in the zone now ${(b as unknown as { count: number }).count}`);
}
const crash = sim.crash;''')
# first tau per point
rep("first: number; firstS: number;", "first: number; firstS: number; firstTau: number;")
rep("f = { first: time, firstS: frame.s,", "f = { first: time, firstS: frame.s, firstTau: p.tau,")
# by-tau absolute readings
rep("      bin.rise.push(cy - seaCrest);", r'''      { const b18 = R18.tau.get(k) ?? { caseCrest: [], seaCrest: [], seaH: [], str: [], seaSlope: [], caseH: [] };
        let st = 0; for (let iz = Math.max(firstRow, row - 3); iz <= Math.min(nz - 1, row + 8); iz += 1) st = Math.max(st, strength[iz * nx + col]);
        const sw = seaWall(col, p.z - 3, p.z + 3);
        b18.caseCrest.push(cy); b18.seaCrest.push(seaCrest); b18.seaH.push(seaCrest - seaTrough); b18.str.push(st); b18.caseH.push(cy - ty); if (sw) b18.seaSlope.push(sw.slope);
        R18.tau.set(k, b18); }
      bin.rise.push(cy - seaCrest);''')
rep("const TAU_BINS =", r'''const R18 = { spans: [0.5, 1, 2, 4], q: new Map<string, number[]>(), tau: new Map<number, { caseCrest: number[]; seaCrest: number[]; seaH: number[]; str: number[]; seaSlope: number[]; caseH: number[] }>() };
const r18push = (key: string, v: number) => { if (v === v && Number.isFinite(v)) { const l = R18.q.get(key) ?? []; l.push(v); R18.q.set(key, l); } };
const TAU_BINS =''')
# ribs read
rep("function drawnRead(time: number): void {", r'''const R18_KEYS = ['tau', 'crest', 'crestRho', 'y1', 'y2', 's1', 's2', 'seaC', 'seaRho', 'a1'] as const;
function ribsRead(sn: Snap): void {
  const pts = new Map<number, Pt[]>();
  for (const p of sn.points.values()) { const l = pts.get(p.front) ?? []; l.push(p); pts.set(p.front, l); }
  for (const l of pts.values()) l.sort((a, b) => a.sigma - b.sigma);
  const placeAt = (id: number, sigma: number) => {
    const l = pts.get(id); if (!l || l.length < 2) return undefined;
    for (let m = 1; m < l.length; m += 1) if (sigma >= l[m - 1].sigma && sigma <= l[m].sigma && l[m].sigma > l[m - 1].sigma) { const w = (sigma - l[m - 1].sigma) / (l[m].sigma - l[m - 1].sigma); return { x: l[m - 1].x + w * (l[m].x - l[m - 1].x), z: l[m - 1].z + w * (l[m].z - l[m - 1].z), footDepth: l[m].footDepth }; }
    return undefined;
  };
  for (const [id, list] of sn.byFront) {
    const vals = list.map((k) => {
      if (sn.over[k] || !(sn.weight[k] > 0.99) || !(sn.tau[k] < 0)) return undefined;
      const P = placeAt(id, sn.sigma[k]); if (!P) return undefined;
      const o = k * LOFT_SAMPLES; let crest = -Infinity; let jc = 0;
      for (let j = 0; j < LOFT_SAMPLES; j += 1) if (sn.pos[3 * (o + j) + 1] > crest) { crest = sn.pos[3 * (o + j) + 1]; jc = j; }
      const rx = sn.rayX[k]; const rz = sn.rayZ[k];
      let seaC = -Infinity; let seaRho = 0;
      for (let rho = -4; rho <= 4; rho += 0.25) { const y = plain(P.x + rho * rx, P.z + rho * rz); if (y > seaC) { seaC = y; seaRho = rho; } }
      return { sigma: sn.sigma[k], tau: sn.tau[k], share: alphaOf(sn.tau[k], P.footDepth), crest, crestRho: (sn.pos[3 * (o + jc)] - P.x) * rx + (sn.pos[3 * (o + jc) + 2] - P.z) * rz,
        y1: onSlice(sn, k, P.x, P.z, 1, 'y'), y2: onSlice(sn, k, P.x, P.z, 2, 'y'), s1: plain(P.x + rx, P.z + rz), s2: plain(P.x + 2 * rx, P.z + 2 * rz), seaC, seaRho, a1: onSlice(sn, k, P.x, P.z, 1, 'a') };
    });
    for (let m = 0; m < list.length; m += 1) {
      const c = vals[m]; if (!c) continue;
      for (const d of R18.spans) {
        let a; let b;
        for (let i = m - 1; i >= 0; i -= 1) { const v = vals[i]; if (!v) break; if (c.sigma - v.sigma >= d - 0.3) { if (c.sigma - v.sigma <= d + 0.3) a = v; break; } }
        for (let i = m + 1; i < list.length; i += 1) { const v = vals[i]; if (!v) break; if (v.sigma - c.sigma >= d - 0.3) { if (v.sigma - c.sigma <= d + 0.3) b = v; break; } }
        if (!a || !b) continue;
        const w = (c.sigma - a.sigma) / (b.sigma - a.sigma);
        const band = c.share <= 0 ? 'none' : c.share < 0.5 ? 'low' : c.share < 1 ? 'high' : 'whole';
        for (const key of R18_KEYS) r18push(`${band}|${d}|${key}`, Math.abs(c[key] - (a[key] + w * (b[key] - a[key]))));
      }
    }
  }
}
function r18Report(): void {
  const q = (v: number[], p: number) => { if (!v.length) return Number.NaN; const s2 = [...v].sort((x, y) => x - y); return s2[Math.min(s2.length - 1, Math.floor(p * s2.length))]; };
  console.log(`\n=== r18, ribs: the middle of three slices off the line through the two at +-d along the crest (median / 90 % / 99 %), by the share at the middle slice (low: under 0.5; high: 0.5 to 1; whole: 1, before the throw) ===`);
  console.log(`keys: tau s (slice clock); crest m (drawn crest height); crestRho m (drawn crest's place along the ray from the front point); y1, y2 m (drawn height 1 and 2 m ahead of the front point); a1 (added height over the sea 1 m ahead); s1, s2 m (the sea alone there); seaC m, seaRho m (the sea's own crest within 4 m: height, place)`);
  for (const band of ['low', 'high', 'whole']) for (const d of R18.spans) {
    console.log(`  ${band} d ${d} m: ` + R18_KEYS.map((key) => { const v = R18.q.get(`${band}|${d}|${key}`) ?? []; return `${key} ${q(v, 0.5).toFixed(3)}/${q(v, 0.9).toFixed(3)}/${q(v, 0.99).toFixed(3)}`; }).join('; ') + ` (${(R18.q.get(`${band}|${d}|tau`) ?? []).length})`);
  }
  console.log(`=== r18, by the clock: the case and the sea, absolute (median, 10-90 %) ===`);
  const rg = (v: number[], dg = 2) => `${q(v, 0.5).toFixed(dg)} (${q(v, 0.1).toFixed(dg)}-${q(v, 0.9).toFixed(dg)})`;
  for (const k of [...R18.tau.keys()].sort((x, y) => x - y)) { const b = R18.tau.get(k)!; console.log(`   tau ${TAU_BINS[k]}..${TAU_BINS[k + 1]} s: case crest over rest ${rg(b.caseCrest)} m, case height ${rg(b.caseH)} m; sea crest over rest ${rg(b.seaCrest)} m, sea height ${rg(b.seaH)} m, sea steepest ${rg(b.seaSlope, 0)} deg, breaking strength at the crest ${rg(b.str)} (over 0.3 in ${(100 * b.str.filter((x) => x > 0.3).length / Math.max(1, b.str.length)).toFixed(0)} %); ${b.str.length} samples`); }
  console.log(`=== r18, T3: the clock at which thrown points were first seen (points that reached their throw 60-270 s) ===`);
  const all = [...fates.values()].filter((v) => v.reached !== undefined && v.reached >= 60 && v.reached <= 270);
  for (const [label, l] of [['all that reached the throw', all], ['those that threw a jet', all.filter((v) => v.outcome === 'jet')]] as const) {
    const ft = l.map((v) => v.firstTau);
    console.log(`   ${label}: ${l.length}; first seen at ${rg(ft)} s; later than -1 s: ${(100 * ft.filter((x) => x > -1).length / Math.max(1, ft.length)).toFixed(1)} %; later than -0.5 s: ${(100 * ft.filter((x) => x > -0.5).length / Math.max(1, ft.length)).toFixed(1)} %; at or after the throw: ${(100 * ft.filter((x) => x >= 0).length / Math.max(1, ft.length)).toFixed(1)} %`);
  }
  const bins = new Map<number, number[]>();
  for (const v of all) { const key = Math.floor(v.s / 20) * 20; const l = bins.get(key) ?? []; l.push(v.firstTau); bins.set(key, l); }
  console.log('   per 20 m of s (count, share later than -1 s): ' + [...bins.keys()].sort((x, y) => x - y).map((key) => { const l = bins.get(key)!; return `s ${key}: ${l.length}, ${(100 * l.filter((x) => x > -1).length / l.length).toFixed(0)} %`; }).join('; '));
}
function drawnRead(time: number): void {''')
rep("  S5.frames += 1;", "  S5.frames += 1;\n  ribsRead(sn);")
rep("step5Report();\n", "step5Report();\nr18Report();\n")
open(p,'w').write(t)
