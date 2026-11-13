import { PATH, PATH_COLUMNS, WAVE_POINTS, type WaveCase, type WaveCaseHeader } from './caseFormat';

/** One frame of c2_library.py's file (`format: "c2-case 1"`), as far as BRL3 keeps it. */
interface C2Frame {
  t: number;
  tau: number;
  use: 'own' | 'refill';
  crest: [number, number];
  trough: number;
  H: number;
  d: number;
  H_over_d: number | null;
  speed: number | null;
  face_deg: number;
  profile: Array<[number, number]> | null;
  u: Array<Array<number | null>> | null;
  v: Array<Array<number | null>> | null;
}

interface C2Columns { t: number; h: number[]; q: number[]; top: Array<number | null>; air: number[] }
interface C2Bore { t: number; front: number; x: number[]; top: Array<number | null>; air: number[] }

export interface C2File {
  format: string;
  run: string;
  level: number;
  dx_h0: number;
  h0_m: number;
  time_scale_s: number;
  A0: number;
  params: Record<string, unknown>;
  t_vertical: number;
  t_touchdown: number | null;
  n_points: number;
  arc: { lip_share: number; throat_share: number };
  velocity_depths: Array<string | number>;
  uses: { own: number; refill: number };
  path_checks: unknown;
  stats: unknown;
  frames: C2Frame[];
  qout: { x: number[]; dx: number; every: number; frames: C2Columns[]; bore: C2Bore[]; bore_speed: number | null; mass: unknown } | null;
}

const num = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? Number.NaN : v);

/**
 * c2_library.py's file as a BRL3 case (`scripts/barrel-library.ts --format brl3`). The frames are kept as stored (the
 * reader respaces them by arc and rebuilds the refill frames); x is re-origined on the crest at τ = 0 (the path's, linear
 * between the two frames either side, as BRL2's `caseFromLibrary` does with the frame's crest), every other value as the
 * run wrote it. Lengths in h0, times in √(h0/g).
 */
export function caseFromC2(c2: C2File, id: string): WaveCase {
  if (c2.format !== 'c2-case 1') throw new Error(`${id}: not a c2_library.py file (${c2.format})`);
  if (c2.n_points !== WAVE_POINTS) throw new Error(`${id}: ${c2.n_points} profile points, not ${WAVE_POINTS}`);
  const frames = c2.frames;
  const count = frames.length;
  if (count < 2) throw new Error(`${id}: fewer than two frames`);
  const step = frames[1].tau - frames[0].tau;
  frames.forEach((frame, i) => {
    if (Math.abs(frame.tau - frames[0].tau - i * step) > 0.01 * step) throw new Error(`${id}: frame ${i} breaks the τ step ${step}`);
  });
  const tauStart = frames[0].tau;
  // The crest at τ = 0, linear between the two frames either side.
  const position = Math.min(count - 1, Math.max(0, -tauStart / step));
  const f = Math.floor(position);
  const next = Math.min(count - 1, f + 1);
  const origin = frames[f].crest[0] + (position - f) * (frames[next].crest[0] - frames[f].crest[0]);

  const depthLabels = c2.velocity_depths.map(String);
  const depths = c2.velocity_depths.map((d) => (typeof d === 'number' ? d : d === '1.5 cells' ? 1.5 * c2.dx_h0 : Number(d)));
  if (depths.some((d) => !Number.isFinite(d))) throw new Error(`${id}: unknown velocity depths ${depthLabels.join(', ')}`);
  const nd = depths.length;
  const profile = new Float32Array(count * WAVE_POINTS * 2);
  const use = new Uint8Array(count);
  const path = new Float32Array(count * PATH_COLUMNS);
  const velocity = new Float32Array(count * WAVE_POINTS * nd * 2).fill(Number.NaN);
  frames.forEach((frame, k) => {
    use[k] = frame.use === 'own' && frame.profile !== null ? 1 : 0;
    const p = frame.profile;
    for (let i = 0; i < WAVE_POINTS; i += 1) {
      profile[(k * WAVE_POINTS + i) * 2] = p ? p[i][0] - origin : Number.NaN;
      profile[(k * WAVE_POINTS + i) * 2 + 1] = p ? p[i][1] : Number.NaN;
    }
    const row = k * PATH_COLUMNS;
    path[row + PATH.tau] = frame.tau;
    path[row + PATH.crestX] = frame.crest[0] - origin;
    path[row + PATH.crestY] = frame.crest[1];
    path[row + PATH.trough] = num(frame.trough);
    path[row + PATH.H] = num(frame.H);
    path[row + PATH.d] = num(frame.d);
    path[row + PATH.Hd] = num(frame.H_over_d);
    path[row + PATH.speed] = num(frame.speed);
    path[row + PATH.face] = num(frame.face_deg);
    if (frame.u && frame.v) {
      for (let i = 0; i < WAVE_POINTS; i += 1) {
        for (let j = 0; j < nd; j += 1) {
          const at = ((k * WAVE_POINTS + i) * nd + j) * 2;
          velocity[at] = num(frame.u[i]?.[j]);
          velocity[at + 1] = num(frame.v[i]?.[j]);
        }
      }
    }
  });

  const q = c2.qout;
  let qBlock: WaveCaseHeader['q'] = null;
  let qTime = new Float32Array(0), qFlow = new Float32Array(0), qTop = new Float32Array(0), qAir = new Float32Array(0);
  let bore = new Float32Array(0), boreTop = new Float32Array(0), boreAir = new Float32Array(0);
  if (q && q.frames.length > 0) {
    const nx = q.x.length;
    const nq = q.frames.length;
    qTime = new Float32Array(nq);
    qFlow = new Float32Array(nq * nx * 2);
    qTop = new Float32Array(nq * nx);
    qAir = new Float32Array(nq * nx);
    q.frames.forEach((col, k) => {
      qTime[k] = col.t - c2.t_vertical;
      for (let i = 0; i < nx; i += 1) {
        qFlow[(k * nx + i) * 2] = num(col.h[i]);
        qFlow[(k * nx + i) * 2 + 1] = num(col.q[i]);
        qTop[k * nx + i] = num(col.top[i]);
        qAir[k * nx + i] = num(col.air[i]);
      }
    });
    const bins = q.bore.reduce((sum, b) => sum + b.x.length, 0);
    bore = new Float32Array(q.bore.length * 4);
    boreTop = new Float32Array(bins);
    boreAir = new Float32Array(bins);
    let at = 0;
    q.bore.forEach((b, k) => {
      const first = b.x.length > 0 ? Math.round((b.x[0] - q.x[0]) / q.dx) : 0;
      bore[4 * k] = b.t - c2.t_vertical;
      bore[4 * k + 1] = b.front - origin;
      bore[4 * k + 2] = first;
      bore[4 * k + 3] = b.x.length;
      for (let i = 0; i < b.x.length; i += 1) {
        boreTop[at] = num(b.top[i]);
        boreAir[at] = num(b.air[i]);
        at += 1;
      }
    });
    qBlock = { x0: q.x[0] - origin, dx: q.dx, nx, frames: nq, every: q.every, boreFrames: q.bore.length, boreBins: bins, boreSpeed: q.bore_speed, mass: q.mass };
  }

  const params = c2.params;
  const number = (key: string) => {
    const v = params[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`${id}: params.${key} is not a number`);
    return v;
  };
  const header: WaveCaseHeader = {
    format: 'brl3 1',
    id,
    run: c2.run,
    level: c2.level,
    dx: c2.dx_h0,
    h0: c2.h0_m,
    a0: c2.A0,
    slope: number('S1'),
    reefDepth: number('HS'),
    period: number('period') / c2.time_scale_s,
    tVertical: c2.t_vertical,
    touchdown: c2.t_touchdown === null ? Number.NaN : c2.t_touchdown - c2.t_vertical,
    tauStart,
    tauStep: step,
    frames: count,
    points: WAVE_POINTS,
    origin,
    velocityDepths: depths,
    velocityLabels: depthLabels,
    arc: { lip: c2.arc.lip_share, throat: c2.arc.throat_share },
    uses: c2.uses,
    pathChecks: c2.path_checks,
    stats: c2.stats,
    q: qBlock,
    sections: [],
  };
  return { header, frames: profile, use, path, velocity, qTime, qFlow, qTop, qAir, bore, boreTop, boreAir };
}
