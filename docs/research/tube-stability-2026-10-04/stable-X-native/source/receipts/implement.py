from pathlib import Path as _FreezePath
import json as _FreezeJson
_freeze_record=_FreezePath('/private/tmp/tube-bounded-c-stable-x-sampling-20261005/readiness.json')
if _freeze_record.exists() and _FreezeJson.loads(_freeze_record.read_text()).get('frozen'):
 raise SystemExit('Frozen candidate: generation/test scripts must not rewrite its inputs or evidence; use verify.py only.')
from pathlib import Path
S=Path(__file__).resolve().parent/'source/src/wave/barrel';p=S/'sweptLoft.ts';s=p.read_text()
s=s.replace('interface Front {','interface Front {\n  /** C-only stored shoulder endpoints; raw sigma remains a separate parameter. */\n  fromX?: number;\n  toX?: number;')
s=s.replace('export interface LoftResult {', '''export interface LoftResult {
  /** Present only on the C stored-column path; RAW result keys/arithmetic are unchanged. */
  cSampling?: {
    policy: 'fixed-origin-stored-F32-X-and-raw-knots/v1'; mandatoryRawKnots: number; plannedStations: number;
    omittedPrecisionStations: number; collapsedShoulders: number; budgetTruncated: boolean;
    firstOmittedPlannedX: number | null; omittedFronts: number; minimumStoredDeltaX: number; minimumStoredDeltaSigma: number;
  };''')
s=s.replace('const E = LOFT.extensionSamples;', "// Explicit supported C survey domain; unsupported imported spans fail before scratch allocation.\nconst MAX_C_SURVEY_STATIONS = 65_536;\nconst E = LOFT.extensionSamples;")
s=s.replace('  private readonly sample: Sample', '''  private cBaseX = new Float64Array(2 * MAX_SLICES + 8);
  private cBaseKind = new Uint8Array(2 * MAX_SLICES + 8);
  private cX = new Float64Array(2 * MAX_SLICES + 8);
  private cKind = new Uint8Array(2 * MAX_SLICES + 8);
  private readonly sample: Sample''')
s=s.replace('    const fronts = this.fronts(records, count);', '''    const boundedC = this.library.options.geometry === 'bounded-C';
    if (boundedC) r.cSampling = { policy: 'fixed-origin-stored-F32-X-and-raw-knots/v1', mandatoryRawKnots: 0, plannedStations: 0,
      omittedPrecisionStations: 0, collapsedShoulders: 0, budgetTruncated: false, firstOmittedPlannedX: null,
      omittedFronts: 0, minimumStoredDeltaX: Infinity, minimumStoredDeltaSigma: Infinity };
    const fronts = this.fronts(records, count);
    if (r.cSampling) r.cSampling.mandatoryRawKnots = fronts.reduce((n, f) => n + f.end - f.start, 0);''')
s=s.replace('for (const f of fronts) samples = Math.max(samples, Math.ceil((f.last - f.first + 2 * LOFT.extension) / LOFT.spacing) + 1);', '''for (const f of fronts) samples = Math.max(samples, boundedC ? this.cStationBound(f, LOFT.spacing)
      : Math.ceil((f.last - f.first + 2 * LOFT.extension) / LOFT.spacing) + 1);
    if (boundedC) this.cScratch(samples);''')
s=s.replace('    for (const f of fronts) {\n      if (r.sliceCount >= MAX_SLICES) break;\n      const n = budgeted ? this.baseSlices(f, spacing, this.sigmas) : this.refinements(records, f, spacing);', '''    for (let frontIndex = 0; frontIndex < fronts.length; frontIndex += 1) {
      const f = fronts[frontIndex];
      if (r.sliceCount >= MAX_SLICES) {
        if (r.cSampling) { r.cSampling.budgetTruncated = true; r.cSampling.omittedFronts = fronts.length - frontIndex; }
        break;
      }
      const n = boundedC ? this.cRefinements(records, f, spacing, !budgeted)
        : budgeted ? this.baseSlices(f, spacing, this.sigmas) : this.refinements(records, f, spacing);
      if (r.cSampling) r.cSampling.plannedStations += n;''')
s=s.replace('    this.triangulate();\n    return r;', '''    this.triangulate();
    if (r.cSampling) {
      if (r.cSampling.minimumStoredDeltaX === Infinity) r.cSampling.minimumStoredDeltaX = 0;
      if (r.cSampling.minimumStoredDeltaSigma === Infinity) r.cSampling.minimumStoredDeltaSigma = 0;
    }
    return r;''')
s=s.replace('    const fronts: Front[] = [];\n    let start = 0;', '''    const fronts: Front[] = [];
    const boundedC = this.library.options.geometry === 'bounded-C';
    if (boundedC && (!Number.isSafeInteger(count) || count < 0 || count > MAX_C_SURVEY_STATIONS || count * FRONT_STRIDE > records.length)) throw new RangeError('Unsupported C packet count');
    let start = 0;''')
s=s.replace('      if (end - start >= 2 && last - first > 1e-6) fronts.push({ id, start, end, first, last });', '''      if (boundedC) {
        if (!Number.isFinite(id)) throw new RangeError('Non-finite C front identity');
        for (let k = start; k < end; k += 1) {
          const o = k * FRONT_STRIDE;
          for (const key of ['x', 'z', 'sigma', 'tau', 'footHeight', 'footDepth'] as const) if (!Number.isFinite(records[o + FRONT_FIELD[key]])) throw new RangeError('Non-finite C packet control: ' + key);
          if (!(records[o + FRONT_FIELD.footHeight] > 0 && records[o + FRONT_FIELD.footDepth] > 0)) throw new RangeError('Non-positive C packet scale');
          const pace = records[o + FRONT_FIELD.pace];
          if (!Number.isFinite(pace) && !Number.isNaN(pace)) throw new RangeError('Unsupported C packet pace');
          if (k > start && (!(records[o + FRONT_FIELD.x] > records[o - FRONT_STRIDE + FRONT_FIELD.x]) || !(records[o + FRONT_FIELD.sigma] > records[o - FRONT_STRIDE + FRONT_FIELD.sigma]))) throw new RangeError('C packet X/sigma must be strictly increasing stored words');
        }
        if (end - start >= 2) {
          const a = start * FRONT_STRIDE, b = (end - 1) * FRONT_STRIDE;
          const dx0 = records[a + FRONT_STRIDE + FRONT_FIELD.x] - records[a + FRONT_FIELD.x], dz0 = records[a + FRONT_STRIDE + FRONT_FIELD.z] - records[a + FRONT_FIELD.z];
          const dx1 = records[b + FRONT_FIELD.x] - records[b - FRONT_STRIDE + FRONT_FIELD.x], dz1 = records[b + FRONT_FIELD.z] - records[b - FRONT_STRIDE + FRONT_FIELD.z];
          const x0 = records[a + FRONT_FIELD.x], x1 = records[b + FRONT_FIELD.x];
          const fromX = Math.fround(x0 - LOFT.extension * dx0 / Math.hypot(dx0, dz0)), toX = Math.fround(x1 + LOFT.extension * dx1 / Math.hypot(dx1, dz1));
          if (![fromX, toX].every(Number.isFinite)) throw new RangeError('Unsupported C shoulder coordinates');
          if (this.result.cSampling) this.result.cSampling.collapsedShoulders += Number(fromX === x0) + Number(toX === x1);
          fronts.push({ id, start, end, first, last, fromX, toX });
        }
      } else if (end - start >= 2 && last - first > 1e-6) fronts.push({ id, start, end, first, last });''')
needle="  /** A front's slices every `spacing` or less, evenly from one extension's end to the other's, into `out`; how many. */"
new='''  /** Upper bound before allocation: zero-origin integer lattice plus EVERY raw knot and both shoulders. */
  private cStationBound(f: Front, spacing: number): number {
    const low = Math.ceil(f.fromX! / spacing), high = Math.floor(f.toX! / spacing);
    const lattice = Math.max(0, high - low + 1), count = lattice + f.end - f.start + 2;
    if (!(spacing > 0) || !Number.isFinite(spacing) || !Number.isSafeInteger(low) || !Number.isSafeInteger(high)
      || !Number.isSafeInteger(count) || count > MAX_C_SURVEY_STATIONS) throw new RangeError('Unsupported C stored-X lattice/survey domain');
    return count;
  }

  private cScratch(count: number): void {
    if (this.cBaseX.length < count) {
      const n = Math.max(count, 2 * this.cBaseX.length);
      this.cBaseX = new Float64Array(n); this.cBaseKind = new Uint8Array(n);
    }
    if (this.cX.length < 2 * count) {
      const n = Math.max(2 * count, 2 * this.cX.length);
      this.cX = new Float64Array(n); this.cKind = new Uint8Array(n);
      if (this.sigmas.length < n) this.sigmas = new Float64Array(n);
    }
  }

  /** Direct X parameter sampling. Raw knots copy exact packet words; sigma never locates the sample. */
  private atX(records: Float32Array, f: Front, x: number, into: Sample): number {
    const field = (k: number, key: keyof typeof FRONT_FIELD) => records[k * FRONT_STRIDE + FRONT_FIELD[key]];
    const copy = (k: number) => { into.x = x; into.z = field(k, 'z'); into.tau = field(k, 'tau');
      into.footHeight = field(k, 'footHeight'); into.footDepth = field(k, 'footDepth'); into.pace = field(k, 'pace'); };
    const firstX = field(f.start, 'x'), lastX = field(f.end - 1, 'x');
    if (x <= firstX || x >= lastX) {
      const k = x <= firstX ? f.start : f.end - 1, other = k === f.start ? k + 1 : k - 1;
      copy(k); if (x === field(k, 'x')) return field(k, 'sigma');
      const dx = field(k, 'x') - field(other, 'x'), dz = field(k, 'z') - field(other, 'z'), length = Math.hypot(dx, dz);
      if (x === f.fromX || x === f.toX) {
        const beyond = k === f.start ? -LOFT.extension : LOFT.extension;
        into.z += Math.abs(beyond) * dz / length;
        return field(k, 'sigma') + beyond;
      }
      const share = (x - field(k, 'x')) / dx;
      into.z += share * dz;
      return field(k, 'sigma') + (k === f.start ? -1 : 1) * share * length;
    }
    let low = f.start + 1, high = f.end - 1;
    while (low < high) { const mid = (low + high) >>> 1; if (field(mid, 'x') < x) low = mid + 1; else high = mid; }
    if (x === field(low, 'x')) { copy(low); return field(low, 'sigma'); }
    const k = low - 1, t = (x - field(k, 'x')) / (field(low, 'x') - field(k, 'x'));
    const lerp = (key: keyof typeof FRONT_FIELD) => field(k, key) + t * (field(low, key) - field(k, key));
    into.x = x; into.z = lerp('z'); into.tau = lerp('tau'); into.footHeight = lerp('footHeight'); into.footDepth = lerp('footDepth');
    const a = field(k, 'pace'), b = field(low, 'pace'); into.pace = a === a ? b === b ? a + t * (b - a) : a : b;
    return lerp('sigma');
  }

  /** Merge priority raw=2, shoulder=1, regular/refinement=0; no epsilon merges a distinct raw knot. */
  private cAppend(records: Float32Array, f: Front, x: number, kind: number, xs: Float64Array, sigmas: Float64Array, kinds: Uint8Array, count: number): number {
    const sigma = this.atX(records, f, x, this.probe), stored = Math.fround(sigma);
    if (!Number.isFinite(x) || x !== Math.fround(x) || !Number.isFinite(stored)) throw new RangeError('Unsupported C stored station precision');
    while (count > 0) {
      const previousX = xs[count - 1], previousSigma = Math.fround(sigmas[count - 1]);
      if (x > previousX && stored > previousSigma) break;
      if (x < previousX || stored < previousSigma) throw new RangeError('C stored station order reversed');
      if (kind === 2 && kinds[count - 1] === 2) throw new RangeError('Distinct C raw knot collapsed in stored X/sigma');
      if (this.result.cSampling) this.result.cSampling.omittedPrecisionStations += 1;
      if (kind <= kinds[count - 1]) return count;
      count -= 1;
    }
    xs[count] = x; sigmas[count] = sigma; kinds[count] = kind; return count + 1;
  }

  private cBaseSlices(records: Float32Array, f: Front, spacing: number): number {
    this.cScratch(this.cStationBound(f, spacing));
    // base stores independently interpolated sigma alongside baseX; neither span nor a dead upstream arc rephases X.
    let out = this.cAppend(records, f, f.fromX!, 1, this.cBaseX, this.base, this.cBaseKind, 0);
    let raw = f.start, j = Math.ceil(f.fromX! / spacing); const high = Math.floor(f.toX! / spacing);
    while (raw < f.end || j <= high) {
      const rawX = raw < f.end ? records[raw * FRONT_STRIDE + FRONT_FIELD.x] : Infinity;
      const regularX = j <= high ? Math.fround(j * spacing) : Infinity;
      const x = Math.min(rawX, regularX), kind = rawX <= regularX ? 2 : 0;
      if (rawX === x) raw += 1;
      if (regularX === x) j += 1;
      if (x >= f.fromX! && x <= f.toX!) out = this.cAppend(records, f, x, kind, this.cBaseX, this.base, this.cBaseKind, out);
    }
    return this.cAppend(records, f, f.toX!, 1, this.cBaseX, this.base, this.cBaseKind, out);
  }

  private cRefinements(records: Float32Array, f: Front, spacing: number, refine: boolean): number {
    const n = this.cBaseSlices(records, f, spacing); let out = 0, previousTau = 0, previousFrame = 0;
    for (let k = 0; k < n; k += 1) {
      this.atX(records, f, this.cBaseX[k], this.sample);
      const tau = this.sample.tau, frame = this.library.profileTimes({ slope: this.slope, footHeight: this.sample.footHeight, footDepth: this.sample.footDepth }).frameSeconds;
      if (refine && k > 0 && Math.abs(tau - previousTau) > LOFT.frames * Math.min(frame, previousFrame)) {
        const x = Math.fround((this.cBaseX[k - 1] + this.cBaseX[k]) / 2);
        if (x > this.cBaseX[k - 1] && x < this.cBaseX[k]) out = this.cAppend(records, f, x, 0, this.cX, this.sigmas, this.cKind, out);
        else if (this.result.cSampling) this.result.cSampling.omittedPrecisionStations += 1;
      }
      out = this.cAppend(records, f, this.cBaseX[k], this.cBaseKind[k], this.cX, this.sigmas, this.cKind, out);
      previousTau = tau; previousFrame = frame;
    }
    return out;
  }

'''
assert needle in s;s=s.replace(needle,new+needle)
s=s.replace('    const n = this.baseSlices(f, LOFT.spacing, this.base);\n    let live = 0;', "    const boundedC = this.library.options.geometry === 'bounded-C';\n    const n = boundedC ? this.cBaseSlices(records, f, LOFT.spacing) : this.baseSlices(f, LOFT.spacing, this.base);\n    let live = 0;")
s=s.replace('      const s = this.at(records, f, this.base[k], this.probe);\n      const times', "      const s = boundedC ? (this.atX(records, f, this.cBaseX[k], this.probe), this.probe) : this.at(records, f, this.base[k], this.probe);\n      const times")
s=s.replace('    this.rayPlan.prepareRecords(records, f.start, f.end);', '''    const boundedC = this.library.options.geometry === 'bounded-C';
    if (boundedC) this.rayPlan.prepareStoredColumns(records, f.start, f.end, this.cX, this.sigmas, n);
    else this.rayPlan.prepareRecords(records, f.start, f.end);
    if (boundedC && this.rayPlan.diagnostics.invalidIntervals) throw new RangeError('Unsupported C actual stored column proof');
    if (this.result.cSampling) {
      this.result.cSampling.minimumStoredDeltaX = Math.min(this.result.cSampling.minimumStoredDeltaX, this.rayPlan.diagnostics.minimumStoredDeltaX!);
      this.result.cSampling.minimumStoredDeltaSigma = Math.min(this.result.cSampling.minimumStoredDeltaSigma, this.rayPlan.diagnostics.minimumStoredDeltaSigma!);
    }''')
s=s.replace('      const s = this.at(records, f, sigma, this.sample);\n      const times', "      const s = boundedC ? (this.atX(records, f, this.cX[k], this.sample), this.sample) : this.at(records, f, sigma, this.sample);\n      const times")
s=s.replace('      if (r.sliceCount + live >= MAX_SLICES) { limit = k; break; }', '''      if (r.sliceCount + live >= MAX_SLICES) {
        if (r.cSampling) { r.cSampling.budgetTruncated = true; r.cSampling.firstOmittedPlannedX ??= this.cX[k]; }
        limit = k; break;
      }''')
p.write_text(s)
p=S/'crestRays.ts';s=p.read_text();s=s.replace('readonly diagnostics = { blend: 0, minimumAdvancePerSigma: 0, invalidIntervals: 0 };', 'readonly diagnostics: { blend: number; minimumAdvancePerSigma: number; invalidIntervals: number; minimumStoredDeltaX?: number; minimumStoredDeltaSigma?: number } = { blend: 0, minimumAdvancePerSigma: 0, invalidIntervals: 0 };')
s=s.replace('  private load(count: number, read: (i: number, key: keyof FrontRayControl) => number): void {', '''  /** C loft only: chosen X is already F32, and the actual stored sigma words are checked pair by pair. */
  prepareStoredColumns(records: Float32Array, start: number, end: number, xs: Float64Array, sigmas: Float64Array, count: number): void {
    if (this.library.options.geometry !== 'bounded-C') throw new RangeError('Stored column proof is C-only');
    this.load(end - start, (i, key) => records[(start + i) * FRONT_STRIDE + FRONT_FIELD[key]], true);
    this.diagnostics.blend = 1;
    let dxMin = Infinity, dsMin = Infinity, progress = Infinity;
    if (!Number.isSafeInteger(count) || count < 2 || count > xs.length || count > sigmas.length) { this.diagnostics.invalidIntervals += 1; return; }
    for (let k = 0; k < count; k += 1) {
      const x = xs[k], sigma = Math.fround(sigmas[k]);
      if (!Number.isFinite(x) || x !== Math.fround(x) || !Number.isFinite(sigma)) { this.diagnostics.invalidIntervals += 1; continue; }
      if (k === 0) continue;
      const dx = x - xs[k - 1], ds = sigma - Math.fround(sigmas[k - 1]);
      if (!(dx > 0 && ds > 0)) { this.diagnostics.invalidIntervals += 1; continue; }
      dxMin = Math.min(dxMin, dx); dsMin = Math.min(dsMin, ds); progress = Math.min(progress, dx / ds);
    }
    this.diagnostics.minimumStoredDeltaX = dxMin === Infinity ? 0 : dxMin;
    this.diagnostics.minimumStoredDeltaSigma = dsMin === Infinity ? 0 : dsMin;
    if (this.diagnostics.invalidIntervals === 0) this.diagnostics.minimumAdvancePerSigma = progress;
    // [0,1] rays add no X offset: BOTH final F32 endpoint half-plane advances equal this positive stored delta-X.
    // No nominal sigma-spacing or two-ULP subtraction is used on this explicit sampled-column path.
  }

  private load(count: number, read: (i: number, key: keyof FrontRayControl) => number, storedColumns = false): void {''')
s=s.replace('    this.diagnostics.invalidIntervals = 0;','    this.diagnostics.invalidIntervals = 0;\n    delete this.diagnostics.minimumStoredDeltaX; delete this.diagnostics.minimumStoredDeltaSigma;')
s=s.replace('    this.prepareBound();','    if (!storedColumns) this.prepareBound();')
p.write_text(s)
