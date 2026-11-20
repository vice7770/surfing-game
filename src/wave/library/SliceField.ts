import { HandoverTracker, LANE, type FittedHandover, type HandoverTrackerState, type LaneField, type SeaLevel } from './Handover';
import { MeanLevel, type MeanLevelState } from './meanLevel';
import type { HandoverState, Slice, WaveLibrary } from './WaveLibrary';

/**
 * C2 step 3 (docs/research/wave-strategy-alternatives/c2-plan.md §1): the field of library slices over a spot's lanes.
 * Each lane (`Handover.ts`) hands each wave over once (`HandoverTracker`); its slice is a pure function of time from
 * then on (`WaveLibrary.slice`): σ (its lane), its origin (its crest's place along the lane at t_h), its ray (the
 * lane's), t_h, its cases' τ_h, keys and h0 (the match), and the local mean level it stands on (`MeanLevel`).
 *
 * **Its life** (`SLICE_LIFE`):
 * - from t_h it runs hidden; from `blendFrom` its shape comes in over `blend` s in the crest's own frame (`zoneSurface`);
 * - it is whole until its touchdown + `hold` s, then goes back to the sea's over `blend` s, the same way;
 * - then it is dropped. (Step 5 hands the bore back to the sea; until then the sea's own bore shows from there.)
 *
 * Its records, the tracker's and the mean level's ride in the sea's state (`exportState`): a slice is rebuilt from its
 * hand-over state, so a late joiner's field is the donor's.
 */
export const SLICE_LIFE = {
  /** After t_h the shape starts to come in this late, s: past the fit's wait, so it never starts already part-blended. */
  delay: 0.6,
  /**
   * The blend's course in the crest's own frame, s, in and out. The plan's 1.2 s is too short for this reef: its
   * hand-over line sweeps along the crest at about 3.7 m/s in the middle, so over 1.2 s the share would step 0.34 a metre
   * along it (ruling 17's J5: under 0.2 a metre); 2.4 s gives about 0.17 (c2-step3.md, round 2).
   */
  blend: 2.4,
  /** Whole until its touchdown and this long after, s (the plan's hand-back band starts at touchdown + 3 s). */
  hold: 3,
} as const;

export interface FieldSlice {
  id: number;
  /** Its wave: neighbouring lanes' slices of one wave share it (the loft's runs). */
  wave: number;
  lane: number;
  /** t_h, s; its crest's place along its lane then, m; the sea's trough-to-crest height and crest over still water, m. */
  tH: number;
  s: number;
  H: number;
  height: number;
  /** The mean level it stands on, m over still water (its lane's at t_h). */
  mean: number;
  /** Its library slice (the match and the clock), rebuilt from `state`. */
  slice: Slice;
  state: HandoverState;
  /** Its lane's static end weight times nothing else yet (0–1). */
  end: number;
  /** When its shape starts coming in; when it is thrown; its touchdown, s after the throw; when it starts going; when it ends. */
  blendFrom: number;
  throwAt: number;
  touchdown: number;
  goFrom: number;
  goneAt: number;
  /** Where the sea's crest was along its lane at its last reading, m, and when (NaN: not yet followed). */
  seaS: number;
  seaT: number;
  /** Its lip tip's last place along its lane and up, m, and when (for the lip's speed; NaN: none yet). */
  tipS: number;
  tipY: number;
  tipT: number;
  tipAlong: number;
  tipUp: number;
  /** Diagnostics of its fit. */
  toeShare: number;
  own: boolean;
}

export interface SliceFieldState {
  nextId: number;
  nextWave: number;
  lastTrack: number | null;
  tracker: HandoverTrackerState;
  mean: MeanLevelState;
  slices: Array<Omit<FieldSlice, 'slice'>>;
}

export class SliceField {
  readonly tracker: HandoverTracker;
  readonly mean: MeanLevel;
  /** Per lane, its live slices (one per wave; two while one goes and the next comes). */
  readonly byLane: FieldSlice[][];
  private nextId = 0;
  private nextWave = 0;
  /** Slices made, and of them how their keys clamped (a diagnostic). */
  readonly stats = { made: 0, slopeOut: 0, a0Out: 0, tauOut: 0, toeHandovers: 0 };
  /** Every slice made since the last `drainMade` (a probe's). */
  made: FieldSlice[] = [];
  private readonly trackEvery: number;
  private lastTrack = Number.NaN;

  constructor(readonly library: WaveLibrary, readonly lanes: LaneField, readonly period: number, trackEvery = 1 / 30) {
    this.tracker = new HandoverTracker(lanes, period);
    this.mean = new MeanLevel(lanes.count, period);
    this.byLane = Array.from({ length: lanes.count }, () => []);
    this.trackEvery = trackEvery;
  }

  /** One step at `time` s: the mean level, the crests followed, slices made and dropped (`station`: `HandoverTracker.read`'s). */
  update(time: number, sea: SeaLevel, station?: (k: number, j: number) => number): void {
    const { lanes } = this;
    if (this.mean.due(time)) {
      this.mean.read(time, (k) => {
        const s = lanes.toe[k];
        const v = sea(lanes.baseX[k] + s * lanes.rayX[k], lanes.baseZ[k] + s * lanes.rayZ[k]);
        return v === v ? v : 0;
      });
    }
    if (!(this.lastTrack === this.lastTrack) || time - this.lastTrack >= this.trackEvery - 1e-9) {
      this.tracker.read(time, sea, station);
      this.lastTrack = time;
      for (const fit of this.tracker.fitted(time, this.period)) this.make(fit, time);
    }
    for (const list of this.byLane) {
      for (let i = list.length - 1; i >= 0; i -= 1) if (time > list[i].goneAt) list.splice(i, 1);
    }
  }

  private make(fit: FittedHandover, now: number): void {
    const { library } = this;
    const slice = library.slice(fit.state);
    const match = slice.match;
    // The slice's touchdown after its throw, s: its cases' touchdowns by their weights (all run at real rate past it).
    let touchdown = 0;
    for (let k = 0; k < slice.n; k += 1) {
      const c = library.cases[slice.caseIndex[k]];
      touchdown += slice.weight[k] * (c.touchdown === c.touchdown ? c.touchdown : 1);
    }
    touchdown *= slice.unit;
    const throwAt = library.throwTime(slice);
    // A lane whose fit came late (borrowed from its neighbours) starts its blend from now, never part-way through it.
    const blendFrom = Math.max(fit.time + SLICE_LIFE.delay, now);
    const goFrom = Math.max(blendFrom + SLICE_LIFE.blend, throwAt + touchdown + SLICE_LIFE.hold);
    // Its last frame: no slice outlives its cases' frames.
    let lastTau = Infinity;
    for (let k = 0; k < slice.n; k += 1) {
      const c = library.cases[slice.caseIndex[k]];
      lastTau = Math.min(lastTau, c.tauStart + (c.count - 1) * c.tauStep);
    }
    const lastTime = throwAt + lastTau * slice.unit;
    const goneAt = Math.min(goFrom, lastTime - SLICE_LIFE.blend) + SLICE_LIFE.blend;
    const wave = this.waveOf(fit.lane, fit.time);
    const made: FieldSlice = {
      id: this.nextId++, wave, lane: fit.lane, tH: fit.time, s: fit.s, H: fit.H, height: fit.height, mean: this.mean.at(fit.lane),
      slice, state: fit.state, end: this.lanes.end[fit.lane], blendFrom, throwAt, touchdown, goFrom: goneAt - SLICE_LIFE.blend, goneAt,
      seaS: Number.NaN, seaT: Number.NaN, tipS: Number.NaN, tipY: Number.NaN, tipT: Number.NaN, tipAlong: 0, tipUp: 0,
      toeShare: fit.toeShare, own: fit.own,
    };
    this.byLane[fit.lane].push(made);
    this.made.push(made);
    this.stats.made += 1;
    if (match.clamp.slope !== 'in') this.stats.slopeOut += 1;
    if (match.clamp.a0 === 'low' || match.clamp.a0 === 'high') this.stats.a0Out += 1;
    if (match.cases.some((c) => c.tauClamp !== 0)) this.stats.tauOut += 1;
    if (fit.toeShare >= 0.5) this.stats.toeHandovers += 1;
  }

  /** A new slice's wave: a neighbouring lane's slice of the same wave (within `LANE.sameWave` s), else a new one. */
  private waveOf(lane: number, time: number): number {
    for (let d = 1; d <= 8; d += 1) {
      for (const k of [lane - d, lane + d]) {
        if (k < 0 || k >= this.byLane.length) continue;
        for (const s of this.byLane[k]) if (Math.abs(s.tH - time) < LANE.sameWave) return s.wave;
      }
    }
    return this.nextWave++;
  }

  /** Every live slice, lane by lane. */
  *slices(): IterableIterator<FieldSlice> {
    for (const list of this.byLane) yield* list;
  }

  drainMade(): FieldSlice[] {
    const out = this.made;
    this.made = [];
    return out;
  }

  exportState(): SliceFieldState {
    const slices: Array<Omit<FieldSlice, 'slice'>> = [];
    for (const s of this.slices()) {
      const { slice: _slice, ...rest } = s;
      slices.push({ ...rest, state: { ...s.state, ...(s.state.toe ? { toe: { ...s.state.toe } } : {}) } });
    }
    return { nextId: this.nextId, nextWave: this.nextWave, lastTrack: this.lastTrack === this.lastTrack ? this.lastTrack : null, tracker: this.tracker.exportState(), mean: this.mean.exportState(), slices };
  }

  importState(state: SliceFieldState): void {
    this.nextId = state.nextId;
    this.nextWave = state.nextWave;
    this.tracker.importState(state.tracker);
    this.mean.importState(state.mean);
    for (const list of this.byLane) list.length = 0;
    for (const s of state.slices) {
      // NaN does not survive JSON: the followed places come back as none.
      const fix = (v: number | null) => (v === null ? Number.NaN : v);
      this.byLane[s.lane].push({
        ...s, seaS: fix(s.seaS as number | null), seaT: fix(s.seaT as number | null), tipS: fix(s.tipS as number | null), tipY: fix(s.tipY as number | null),
        tipT: fix(s.tipT as number | null), slice: this.library.slice(s.state),
      });
    }
    this.lastTrack = state.lastTrack ?? Number.NaN;
  }
}
