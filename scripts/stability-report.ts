/**
 * **The stability benchmark** (`docs/research/stability/README.md`): `npm run report:stability [-- --mode full]`.
 *
 * Runs every ride of the mode, one process per ride (`scripts/stability-ride.ts`; on the Canyon one per sea and seed,
 * every script of it riding that sea), at most 4 at once from one queue; reads the game's `balanceReserve` on every frame; labels each fall's cause;
 * prints a Markdown table per group and a JSON line per ride; compares the run against the committed baseline and exits
 * 1 on a regression (2 on a refused build or a failed ride). Read only: nothing here reaches the physics.
 *
 *   --mode quick|full   (default quick)        --extra '&cueLater=on&plantFloor=6' (the ride build, the default)
 *   --jobs <1-4>        (default 4)             --out <dir> (default dist/stability/<mode>-<time>)
 *   --baseline <file>   (default docs/research/stability/baseline-<mode>.json)
 *   --update-baseline   write this run as the baseline (and its .md)      --only <id prefix>  a subset (no comparison)
 *   --reuse             read the rides already in --out instead of running them (re-read a run)
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------------------------------------------
// Fixed definitions (README §3–§5). Changing any of these changes the benchmark.
// ---------------------------------------------------------------------------------------------------------------
const STEP = 1 / 60;
const HOLD = 5;
const TAKE_OFF_WINDOW = 3;
const RED = 0.3;
const BRIDGE = 0.05;
const TURN_AT = 1.0;
const TURN_FOR = 1.0;
const YAW_WINDOW = 2.0;
const TWIN_AT = 0.7;
const TWIN_LINE = 3.6;
const FROTH_LINE = -0.1;
const RESERVE_DROP = 0.1;
const LATER = 0.25;
const STANCES = ['none', 'crouch', 'compress', 'snap'] as const;
const STEERS = ['straight', 'left', 'right'] as const;

const argv = process.argv.slice(2);
const option = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const flag = (name: string): boolean => argv.includes(`--${name}`);
const MODE = (option('mode') ?? 'quick') as 'quick' | 'full';
if (MODE !== 'quick' && MODE !== 'full') throw new Error(`--mode quick|full, not ${MODE}`);
const EXTRA = option('extra') ?? '&cueLater=on&plantFloor=6';
const JOBS = Math.max(1, Math.min(4, Number(option('jobs') ?? 4)));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = option('out') ?? join('dist', 'stability', `${MODE}-${stamp}`);
const BASELINE = option('baseline') ?? join('docs', 'research', 'stability', `baseline-${MODE}.json`);
const UPDATE = flag('update-baseline');
const ONLY = option('only');
const REUSE = flag('reuse');
const here = dirname(fileURLToPath(import.meta.url));
const RIDE_BUNDLE = option('ride-bundle') ?? join(here, 'stability-ride.mjs');

// ---------------------------------------------------------------------------------------------------------------
// The jobs.
// ---------------------------------------------------------------------------------------------------------------
interface Job { id: string; group: string; env: Record<string, string>; file: string; weight: number }
function jobs(): Job[] {
  const list: Job[] = [];
  const add = (id: string, group: string, env: Record<string, string>, weight: number) => list.push({ id, group, env, file: join(OUT, `${id.replace(/:/g, '_')}.jsonl`), weight });
  const scripts = [...STANCES.flatMap((s) => STEERS.map((w) => `${s}:${w}`)), 'hisway'];
  if (MODE === 'full') {
    // One process per sea and seed, every script of it riding that one sea (riders read the water and never push it).
    const big = ['hisway', ...STANCES.flatMap((st) => [`${st}:left`, `${st}:right`]), 'twin'];
    const med = ['hisway', 'none:left', 'none:right', 'twin'];
    for (const seed of [1, 2, 3]) add(`big:s${seed}`, 'big', { MODE: 'organic', SWELL: 'big', SEED: String(seed), PERIODS: '12', SCRIPTS: big.join(',') }, 3);
    for (const seed of [1, 2, 3]) add(`med:s${seed}`, 'med', { MODE: 'organic', SWELL: 'medium', SEED: String(seed), PERIODS: '12', SCRIPTS: med.join(',') }, 2);
  }
  for (const tw of ['catch', 'ride']) {
    for (const s of scripts) add(`tw-${tw}:${s}`, `tw-${tw}`, { MODE: 'tw', TW: tw, SCRIPT: s }, 1);
    if (tw === 'catch') add(`tw-${tw}:twin`, `tw-${tw}`, { MODE: 'tw', TW: tw, SCRIPT: 'twin' }, 1);
  }
  return ONLY ? list.filter((j) => j.id.startsWith(ONLY)) : list;
}

async function runAll(list: Job[]): Promise<Map<string, { seconds: number; code: number | null }>> {
  const result = new Map<string, { seconds: number; code: number | null }>();
  const queue = [...list].sort((a, b) => b.weight - a.weight);
  let running = 0;
  await new Promise<void>((resolve) => {
    const next = (): void => {
      if (queue.length === 0 && running === 0) { resolve(); return; }
      while (running < JOBS && queue.length > 0) {
        const job = queue.shift()!;
        running += 1;
        const started = Date.now();
        const log = openSync(job.file.replace(/\.jsonl$/, '.log'), 'w');
        const child = spawn(process.execPath, ['--max-old-space-size=3200', RIDE_BUNDLE], {
          env: { ...process.env, ...job.env, EXTRA, HOLD: String(HOLD), TURN_AT: String(TURN_AT), TURN_FOR: String(TURN_FOR), OUT: job.file },
          stdio: ['ignore', log, log],
        });
        child.on('exit', (code) => {
          result.set(job.id, { seconds: (Date.now() - started) / 1000, code });
          process.stderr.write(`  ${job.id}: ${code === 0 ? 'done' : `exit ${code}`} in ${((Date.now() - started) / 1000).toFixed(0)} s\n`);
          running -= 1;
          next();
        });
      }
    };
    next();
  });
  return result;
}

// ---------------------------------------------------------------------------------------------------------------
// The metrics.
// ---------------------------------------------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
export interface Ride {
  id: string; group: string; script: string; seed?: number; wave?: number;
  stood: boolean; standSea: number | null; standVW: number | null; exposure: number | null; cut: boolean;
  fell: boolean; fellAt: number | null; fellWithin3: boolean | null; separation: string | null;
  cause: 'wave' | 'whitewater' | 'balance' | null; twinVW: number | null; frothMin: number | null; escapeAt: number | null;
  lowest: number | null; red: number | null; warning: number | null;
  recovery: number | null; recoveryFell: boolean | null; recoveryCensored: number | null;
  course05: number | null; course10: number | null; course05World: number | null; course10World: number | null; yawPeak: number | null; yawPeakWorld: number | null;
}
const round = (x: number | null | undefined, n = 3): number | null => (typeof x === 'number' && Number.isFinite(x) ? Number(x.toFixed(n)) : null);
const read = (file: string): Row[] => (existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Row) : []);
const wrap = (d: number): number => ((((d + 180) % 360) + 360) % 360) - 180;
/** The onset of the last run of `hit` frames (gaps ≤ BRIDGE bridged) whose last frame is the last of `frames` within BRIDGE; else null. */
function lastRun(frames: Row[], hit: (f: Row) => boolean): number | null {
  if (frames.length === 0) return null;
  const end = frames[frames.length - 1].tS as number;
  let last = -1;
  for (let i = frames.length - 1; i >= 0; i -= 1) if (hit(frames[i])) { last = i; break; }
  if (last < 0 || end - frames[last].tS > BRIDGE + 1e-9) return null;
  let onset = frames[last].tS as number;
  let prevHit = onset;
  for (let i = last - 1; i >= 0; i -= 1) {
    if (!hit(frames[i])) continue;
    if (prevHit - frames[i].tS > BRIDGE + STEP + 1e-9) break;
    onset = frames[i].tS;
    prevHit = onset;
  }
  return onset;
}
const at = (frames: Row[], t: number): Row | undefined => frames.find((f) => f.tS >= t - 1e-6);

function measure(base: Omit<Ride, keyof Metrics | 'exposure' | 'cut'>, frames: Row[], steer: number, takeOff: boolean, twinVW: number | null): Ride {
  const standing = frames.filter((f) => typeof f.res === 'number');
  const fell = base.fell;
  const m: Metrics = {
    cause: null, twinVW, frothMin: null, escapeAt: null, lowest: null, red: null, warning: null, recovery: null, recoveryFell: null, recoveryCensored: null,
    course05: null, course10: null, course05World: null, course10World: null, yawPeak: null, yawPeakWorld: null,
  };
  if (!base.stood) return { ...base, ...m, twinVW: null, exposure: null, cut: false };
  // How long the ride was followed: to the fall, else to its last standing frame. A ride that neither fell nor reached
  // its hold was cut short (it is not a lasting ride).
  const exposure = fell ? base.fellAt! : standing.length ? standing[standing.length - 1].tS : 0;
  const cut = !fell && exposure < HOLD - 1e-6;
  m.lowest = round(Math.min(...standing.map((f) => f.res)), 4);
  m.red = round(standing.filter((f) => f.res < RED).length * STEP, 3);
  if (fell) {
    const fellAt = base.fellAt!;
    const redOnset = lastRun(standing, (f) => f.res < RED);
    m.warning = redOnset === null ? 0 : round(fellAt - redOnset, 3);
    const escape = lastRun(standing, (f) => f.m1 || f.m2 || f.m3 || f.mf);
    m.escapeAt = round(escape ?? fellAt, 4);
    const before = standing.filter((f) => f.tS >= 0 && f.tS <= (m.escapeAt as number) + 1e-9);
    m.frothMin = round(Math.min(0, ...before.map((f) => f.fr)), 4);
    const wave = takeOff && (twinVW === null || twinVW < TWIN_LINE);
    m.cause = wave ? 'wave' : (m.frothMin as number) <= FROTH_LINE ? 'whitewater' : 'balance';
  }
  if (steer !== 0) {
    const release = TURN_AT + TURN_FOR;
    const last = standing.length ? standing[standing.length - 1].tS : 0;
    if (fell && base.fellAt! < release) { m.recoveryFell = true; }
    else {
      const after = standing.filter((f) => f.tS >= release - 1e-6);
      const back = after.find((f) => f.res > RED);
      if (back) m.recovery = round(back.tS - release, 3);
      else if (fell) m.recoveryFell = true;
      else m.recoveryCensored = round(last - release, 3);
      m.recoveryFell ??= false;
    }
    const c0 = at(standing, TURN_AT), c05 = at(standing, TURN_AT + 0.5), c10 = at(standing, TURN_AT + 1.0);
    const c05ok = c0 && c05 && Math.abs(c05.tS - (TURN_AT + 0.5)) < STEP;
    const c10ok = c0 && c10 && Math.abs(c10.tS - (TURN_AT + 1.0)) < STEP;
    if (c0 && c05ok) { m.course05World = round(wrap(c05!.crs - c0.crs), 2); m.course05 = round((m.course05World as number) * steer, 2); }
    if (c0 && c10ok) { m.course10World = round(wrap(c10!.crs - c0.crs), 2); m.course10 = round((m.course10World as number) * steer, 2); }
    const win = frames.filter((f) => f.at && f.tS >= TURN_AT - 1e-6 && f.tS <= TURN_AT + YAW_WINDOW + 1e-6);
    if (win.length) {
      m.yawPeak = round(Math.max(...win.map((f) => f.yaw * steer)), 2);
      const big = win.reduce((a, f) => (Math.abs(f.yaw) > Math.abs(a.yaw) ? f : a));
      m.yawPeakWorld = round(big.yaw, 2);
    }
  }
  return { ...base, ...m, exposure: round(exposure, 4), cut };
}
type Metrics = Pick<Ride, 'cause' | 'twinVW' | 'frothMin' | 'escapeAt' | 'lowest' | 'red' | 'warning' | 'recovery' | 'recoveryFell' | 'recoveryCensored' | 'course05' | 'course10' | 'course05World' | 'course10World' | 'yawPeak' | 'yawPeakWorld'>;

const steerOf = (script: string): number => (script.endsWith(':left') ? 1 : script.endsWith(':right') ? -1 : 0);
const twinAt = (rows: Row[], t: number): number | null => {
  let best: Row | undefined;
  for (const w of rows) if (Math.abs(w.t - t) <= STEP / 2 + 1e-6) { best = w; break; }
  return best ? best.vW : null;
};

interface Check { refused: string[]; failed: string[]; weights: unknown }
function collect(list: Job[]): { rides: Ride[]; check: Check } {
  const rides: Ride[] = [];
  const check: Check = { refused: [], failed: [], weights: null };
  const asked = new URLSearchParams(EXTRA);
  const byFile = new Map<string, Row[]>();
  for (const job of list) {
    const rows = read(job.file);
    byFile.set(job.id, rows);
    if (!rows.some((r) => r.kind === 'done')) { check.failed.push(job.id); continue; }
    const built = rows.find((r) => r.kind === 'built');
    const bad = Object.entries((built?.switches ?? {}) as Record<string, { asked: string; built: string | null }>).filter(([, v]) => v.asked !== v.built);
    if (!built || bad.length) check.refused.push(`${job.id}: ${bad.map(([k, v]) => `${k} asked ${v.asked}, built ${v.built}`).join('; ') || 'no build row'}`);
    for (const w of rows.filter((r) => r.kind === 'weights')) {
      const pf = asked.get('plantFloor');
      if ((pf === null && w.plantFloor !== null) || (pf !== null && w.plantFloor !== Number(pf))) check.refused.push(`${job.id}: predictor plantFloor ${w.plantFloor}, asked ${pf}`);
      const ps = asked.get('plantSpeed');
      if ((ps ?? null) !== (w.plantSpeed ?? null)) check.refused.push(`${job.id}: predictor plantSpeed ${w.plantSpeed}, asked ${ps}`);
      check.weights ??= w.weights;
    }
  }
  for (const job of list) {
    const rows = byFile.get(job.id) ?? [];
    if (check.failed.includes(job.id)) continue;
    const takeOff = job.group !== 'tw-ride';
    if (job.env.MODE === 'tw') {
      const script = job.env.SCRIPT;
      if (script === 'twin') continue;
      const s = rows.find((r) => r.kind === 'summary');
      const frames = rows.filter((r) => r.kind === 'f');
      const twinRows = job.group === 'tw-catch' ? (byFile.get(`tw-catch:twin`) ?? []).filter((r) => r.kind === 'tw') : [];
      const stood = s?.stand !== null && s?.stand !== undefined;
      const twinVW = stood && takeOff ? twinAt(twinRows, s.stand + TWIN_AT) : null;
      const fellAt = s?.fellAfterStand ?? null;
      rides.push(measure({
        id: job.id, group: job.group, script, stood, standSea: s?.standSea ?? null, standVW: frames[0]?.vW ?? null,
        fell: fellAt !== null, fellAt, fellWithin3: takeOff && stood ? fellAt !== null && fellAt <= TAKE_OFF_WINDOW : null, separation: s?.cause ?? null,
      }, frames, steerOf(script), takeOff, twinVW));
    } else {
      const twinRows = rows.filter((r) => r.kind === 'tw');
      for (const s of rows.filter((r) => r.kind === 'summary' && r.script !== 'twin')) {
        const script = s.script as string;
        const stood = s.stand !== null;
        if (!stood) continue; // a wave this script did not stand on is not a ride
        const frames = rows.filter((r) => r.kind === 'f' && r.wave === s.wave && r.script === script);
        const twinVW = twinAt(twinRows.filter((w) => w.wave === s.wave), s.stand + TWIN_AT);
        const fellAt = s.fellAfterStand ?? null;
        rides.push(measure({
          id: `${job.group}:s${s.seed}:w${s.wave}:${script}`, group: job.group, script, seed: s.seed, wave: s.wave, stood, standSea: s.standSea, standVW: frames[0]?.vW ?? null,
          fell: fellAt !== null, fellAt, fellWithin3: fellAt !== null && fellAt <= TAKE_OFF_WINDOW, separation: s.cause ?? null,
        }, frames, steerOf(script), takeOff, twinVW));
      }
    }
  }
  return { rides, check };
}

// ---------------------------------------------------------------------------------------------------------------
// The tables and the comparison.
// ---------------------------------------------------------------------------------------------------------------
const f = (x: number | null | undefined, n = 2): string => (typeof x === 'number' ? x.toFixed(n) : '—');
const GROUP_TITLE: Record<string, string> = {
  'tw-catch': 'The test wave, lying down (`testWave=catch`)', 'tw-ride': 'The test wave, standing (`testWave=ride`)',
  med: 'Canyon B Medium, organic seeds 1–3', big: 'Canyon B at the Big swell (Hs 2.4 m, Tp 14 s), organic seeds 1–3',
};
function tables(rides: Ride[]): string {
  const out: string[] = [];
  for (const group of ['tw-catch', 'tw-ride', 'med', 'big']) {
    const g = rides.filter((r) => r.group === group);
    if (!g.length) continue;
    const falls = g.filter((r) => r.fell);
    const n = (c: string) => falls.filter((r) => r.cause === c).length;
    out.push(`### ${GROUP_TITLE[group]}\n`);
    const cut = g.filter((r) => r.cut).length;
    out.push(`${g.length} rides; ${g.length - falls.length - cut} lasted 5 s;${cut ? ` ${cut} cut short;` : ''} ${falls.length} fell (balance ${n('balance')}, wave ${n('wave')}, whitewater ${n('whitewater')})${group === 'tw-ride' ? '' : `, ${falls.filter((r) => r.fellWithin3).length} within 3 s`}.\n`);
    out.push('| ride | stand vW (m/s) | fell at (s) | cause | twin vW +0.7 (m/s) | froth min (W) | lowest reserve | red (s) | warning (s) | recovery (s) | course +0.5 / +1.0 (deg, toward the steer) | peak yaw (deg/s, toward) |');
    out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const r of g) {
      const rec = steerOf(r.script) === 0 ? '' : r.recovery !== null ? f(r.recovery) : r.recoveryFell ? 'fell' : r.recoveryCensored !== null ? `> ${f(r.recoveryCensored)}` : '—';
      const turn = steerOf(r.script) === 0 ? '' : `${f(r.course05, 1)} / ${f(r.course10, 1)}`;
      out.push(`| ${r.id} | ${f(r.standVW)} | ${r.fell ? f(r.fellAt) : r.cut ? `cut at ${f(r.exposure)}` : '> 5'} | ${r.cause ?? ''} | ${f(r.twinVW)} | ${r.fell ? f(r.frothMin) : ''} | ${f(r.lowest, 3)} | ${f(r.red)} | ${r.fell ? f(r.warning) : ''} | ${rec} | ${turn} | ${steerOf(r.script) === 0 ? '' : f(r.yawPeak, 1)} |`);
    }
    out.push('');
  }
  return out.join('\n');
}

interface Baseline { mode: string; extra: string; created: string; rides: Ride[] }
function compare(rides: Ride[], base: Baseline): { text: string; regressions: number } {
  const now = new Map(rides.map((r) => [r.id, r]));
  const was = new Map(base.rides.map((r) => [r.id, r]));
  const fail: string[] = [];
  const better: string[] = [];
  const notes: string[] = [];
  for (const b of base.rides) {
    const c = now.get(b.id);
    const lasted = b.stood && !b.fell && !b.cut;
    if (lasted && (!c || !c.stood || c.fell)) fail.push(`${b.id}: lasted 5 s in the baseline, now ${!c || !c.stood ? 'no stand' : `falls at +${f(c.fellAt)} s (${c.cause})`}`);
    if (!c) { if (!lasted) notes.push(`${b.id}: in the baseline only`); continue; }
    if (b.lowest !== null && c.lowest !== null && c.lowest < b.lowest - RESERVE_DROP) fail.push(`${b.id}: lowest reserve ${f(c.lowest, 3)}, baseline ${f(b.lowest, 3)} (−${f(b.lowest - c.lowest, 3)})`);
    if (b.lowest !== null && c.lowest !== null && c.lowest > b.lowest + RESERVE_DROP) better.push(`${b.id}: lowest reserve ${f(c.lowest, 3)}, baseline ${f(b.lowest, 3)}`);
    if (b.fell && c.stood && !c.fell && !c.cut) better.push(`${b.id}: fell at +${f(b.fellAt)} s in the baseline, now lasts 5 s`);
    else if (b.fell && c.fell && c.fellAt! > b.fellAt! + LATER) better.push(`${b.id}: falls later, +${f(c.fellAt)} s against +${f(b.fellAt)} s`);
    else if (b.fell && c.fell && c.fellAt! < b.fellAt! - LATER) {
      // Amended 2026-11-25: a balance fall that comes 0.25 s or more sooner is a regression; another cause stays a note.
      if (c.cause === 'balance') fail.push(`${b.id}: falls sooner, +${f(c.fellAt)} s against +${f(b.fellAt)} s (balance)`);
      else notes.push(`${b.id}: falls sooner, +${f(c.fellAt)} s against +${f(b.fellAt)} s`);
    }
    if (b.fell && b.stood && !c.stood) notes.push(`${b.id}: stood in the baseline, now no stand`);
    if (b.fell && c.fell && b.cause !== c.cause) notes.push(`${b.id}: cause ${b.cause} → ${c.cause}`);
  }
  for (const c of rides) if (!was.has(c.id)) notes.push(`${c.id}: not in the baseline (${c.fell ? `falls at +${f(c.fellAt)} s, ${c.cause}` : 'lasts 5 s'})`);
  const lines: string[] = [`## Against the baseline (${base.mode}, build \`${base.extra}\`, ${base.created})\n`];
  if (base.extra !== EXTRA) lines.push(`**This run's build is \`${EXTRA}\`, not the baseline's.**\n`);
  lines.push('| group | balance falls (now / baseline) | wave | whitewater | lasted 5 s |', '| --- | --- | --- | --- | --- |');
  for (const group of ['tw-catch', 'tw-ride', 'med', 'big']) {
    const g = rides.filter((r) => r.group === group);
    const h = base.rides.filter((r) => r.group === group);
    if (!g.length && !h.length) continue;
    const c = (rs: Ride[], k: string) => rs.filter((r) => r.fell && r.cause === k).length;
    lines.push(`| ${group} | ${c(g, 'balance')} / ${c(h, 'balance')} | ${c(g, 'wave')} / ${c(h, 'wave')} | ${c(g, 'whitewater')} / ${c(h, 'whitewater')} | ${g.filter((r) => !r.fell && !r.cut).length} / ${h.filter((r) => !r.fell && !r.cut).length} |`);
  }
  lines.push('', `**Regressions: ${fail.length}.**`, ...fail.map((s) => `- FAIL ${s}`));
  lines.push('', `**Improvements: ${better.length}** (not written into the baseline without \`--update-baseline\`).`, ...better.map((s) => `- ${s}`));
  if (notes.length) lines.push('', `**Other changes: ${notes.length}.**`, ...notes.map((s) => `- ${s}`));
  return { text: lines.join('\n'), regressions: fail.length };
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const list = jobs();
  const wall = Date.now();
  process.stderr.write(`stability ${MODE}: ${list.length} processes, ${JOBS} at once, build ${EXTRA}, into ${OUT}\n`);
  const times = REUSE ? new Map<string, { seconds: number; code: number | null }>() : await runAll(list);
  const timesFile = join(OUT, 'times.json');
  const ran = REUSE && existsSync(timesFile) ? (JSON.parse(readFileSync(timesFile, 'utf8')) as { seconds: number; jobs: number }) : undefined;
  const seconds = ran ? ran.seconds : (Date.now() - wall) / 1000;
  const { rides, check } = collect(list);
  const head = [`# Stability ${MODE}: build \`${EXTRA}\``, '', `${rides.length} rides from ${list.length} processes, ${(seconds / 60).toFixed(1)} min with ${ran ? ran.jobs : JOBS} at once${REUSE ? ' (re-read from the run\'s files)' : ''}. Times are seconds after the first standing frame; reserve is \`balanceReserve\` (red below 0.3); vW is the speed through the water, horizontal, m/s.`, ''];
  const md = [...head, tables(rides)].join('\n');
  writeFileSync(join(OUT, 'rides.jsonl'), rides.map((r) => JSON.stringify(r)).join('\n') + '\n');
  if (!REUSE) writeFileSync(timesFile, JSON.stringify({ mode: MODE, jobs: JOBS, seconds, perJob: Object.fromEntries(times) }, null, 1));
  for (const r of rides) process.stdout.write(`${JSON.stringify(r)}\n`);
  process.stdout.write(`\n${md}\n`);
  let code = 0;
  if (check.failed.length || check.refused.length) {
    process.stdout.write(`\n**Refused or failed:**\n${[...check.failed.map((s) => `- failed: ${s}`), ...check.refused.map((s) => `- refused: ${s}`)].join('\n')}\n`);
    code = 2;
  }
  let comparison = '';
  if (UPDATE && code === 0 && !ONLY) {
    const base: Baseline = { mode: MODE, extra: EXTRA, created: new Date().toISOString(), rides };
    writeFileSync(BASELINE, `${JSON.stringify({ ...base, rides: undefined, weights: check.weights })}\n`.replace(/}\n$/, `,"rides":[\n${rides.map((r) => JSON.stringify(r)).join(',\n')}\n]}\n`));
    writeFileSync(BASELINE.replace(/\.json$/, '.md'), `${md}\n`);
    process.stdout.write(`\nBaseline written: ${BASELINE}\n`);
  } else if (!ONLY && existsSync(BASELINE)) {
    const res = compare(rides, JSON.parse(readFileSync(BASELINE, 'utf8')) as Baseline);
    comparison = res.text;
    process.stdout.write(`\n${comparison}\n`);
    if (res.regressions > 0 && code === 0) code = 1;
  } else if (!ONLY) process.stdout.write(`\nNo baseline at ${BASELINE}: nothing compared.\n`);
  writeFileSync(join(OUT, 'report.md'), `${md}\n${comparison}\n`);
  process.stdout.write(`\nWall time ${(seconds / 60).toFixed(1)} min. Exit ${code}.\n`);
  process.exit(code);
}
void main();
