#!/usr/bin/env python3
"""Reads `stand.ts`'s dumps and prints the four comparisons, each with its population and its frame.

    python3 -I docs/research/new-rider/take-off/stand-read.py <out.jsonl> [more.jsonl ...] [--labels a,b]
    python3 -I docs/research/new-rider/take-off/stand-read.py a.jsonl --control b.jsonl   # the probe's inertness

⚠️ **Every median here is a PLAIN median** — the mean of the two middle values at even length — in this file and in
`stand.ts` alike. No `qt(0.5)`, no mean of medians. Every share carries the count it is a share of, so an empty
filter prints as `0 of 0` and never as a clean-looking 0.00.

☠️ **The three pin readings are kept apart and named on every line**: `pinNow` is `limit === 'tip'`, ONE substep of
32; `pinned` is `limitTime.tip > 0`, the step's decaying memory (the published quantity); `outAny` is the geometry
itself — the raw demand outside the support box — which is what `tip` means before `limit` can mask it with
`'impact'`.
"""
import json
import sys
from collections import defaultdict

STEP = 1.0 / 60.0
LAGS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 16, 24]


def med(xs):
    """A PLAIN median: the mean of the two middle elements at even length."""
    s = sorted(x for x in xs if x is not None and x == x)
    if not s:
        return float('nan')
    m = len(s) // 2
    return s[m] if len(s) % 2 else (s[m - 1] + s[m]) / 2


def f(x, n=4):
    return '-' if x is None or x != x else f'{x:.{n}f}'


def load(path):
    control, rows, summaries, done = [], [], [], []
    with open(path) as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            d = json.loads(line)
            if d.get('control'):
                control.append(d)
            elif d.get('kind') == 'row':
                rows.append(d)
            elif d.get('kind') == 'summary':
                summaries.append(d)
            elif d.get('kind') == 'done':
                done.append(d)
    return control, rows, summaries, done


def run_key(d):
    if d.get('mode') == 'placed':
        return (d.get('arm'), d.get('trial'), d.get('entry'), d.get('stance'))
    return (d.get('arm'), d.get('script'), d.get('wave'))


def num(d, k):
    v = d.get(k)
    return v if isinstance(v, (int, float)) else float('nan')


class Pop:
    """One file: its summaries, its per-run standing frames, and the controls that say the read is not vacuous."""

    def __init__(self, label, path):
        self.label = label
        self.control, rows, self.summaries, self.done = load(path)
        self.mode = self.summaries[0].get('mode') if self.summaries else '?'
        # Standing, attached frames, kept per run and in order. A run's rows stop at its first `attached == 0`
        # because `stand.ts` stops emitting there; the guard is belt and braces.
        self.stand_rows = defaultdict(list)
        self.all_rows = defaultdict(list)
        for r in rows:
            k = run_key(r)
            self.all_rows[k].append(r)
            if r.get('attached') == 1 and r.get('phase') == 'standing' and r.get('tStand') is not None:
                self.stand_rows[k].append(r)
        self.stood = [s for s in self.summaries if s.get('stood') == 1]
        self.fell = [s for s in self.stood if s.get('fellAfterStand') is not None]


def header(p):
    print(f'## {p.label} — {p.mode}')
    for c in p.control:
        print(f"   address {c.get('address')}  arms {c.get('arms')}  scripts {c.get('scripts')}  seed {c.get('seed')}  "
              f"size {c.get('size')}  probe {c.get('probe')}")
        print(f"   grid {c.get('grid')} = {c.get('cells')} cells, spun up in {f(c.get('spunUp'), 1)} s to sea time "
              f"{f(c.get('seaTime'), 2)} s; start ({f(c.get('startX'), 1)}, {f(c.get('startZ'), 1)}), "
              f"Hs {f(c.get('significantHeight'), 2)} m, Tp {f(c.get('peakPeriod'), 1)} s")
        print(f"   switches {json.dumps(c.get('switches'))}")
        print(f"   seaDiffs {c.get('seaDiffs')}  (empty is the only passing value)")
        if p.mode == 'placed':
            print(f"   SINK {c.get('sink')}  stick {c.get('stick')}  entries {c.get('entries')}  "
                  f"stances {c.get('stances')}  trials {c.get('trials')}  followed {c.get('placedFor')} s")
    for d in p.done:
        print(f"   runs {d.get('runs')}  waves {d.get('waves', '-')}  wall {f(d.get('seconds'), 1)} s")
    n_rows = sum(len(v) for v in p.all_rows.values())
    n_stand = sum(len(v) for v in p.stand_rows.values())
    print(f'   rows emitted {n_rows}; standing+attached rows {n_stand} in {len(p.stand_rows)} runs')
    # ⭐ The headroom recomputation's own control: our min(across, along, grip) against the engine's `rawMargin`.
    ok = sum(s['whole']['rawOk'] + s['first']['rawOk'] for s in p.summaries if s.get('whole'))
    seen = sum(s['whole']['rawSeen'] + s['first']['rawSeen'] for s in p.summaries if s.get('whole'))
    print(f'   CONTROL the three headrooms reproduce the engine\'s own rawMargin in {ok} of {seen} window frames'
          f'{" — a MISMATCH means the recomputation is not the engine\'s arithmetic" if ok != seen else ""}')
    cens = sum(1 for s in p.stood if s.get('censored') == 1)
    print(f'   stands {len(p.stood)} of {len(p.summaries)} runs; observed falls {len(p.fell)}; '
          f'no-fall rows {len(p.stood) - len(p.fell)} of which CENSORED {cens}')
    if p.stood and p.stood[0].get('standExposure') is not None:
        print(f"   post-stand exposure allowed, median {f(med([num(s, 'standExposure') for s in p.stood]), 4)} s; "
              f"first second available in {sum(1 for s in p.stood if s.get('firstFull') == 1)} of {len(p.stood)}")
    if p.fell:
        vals = sorted(num(s, 'fellAfterStand') for s in p.fell)
        print(f'   fell after the stand: median {f(med(vals), 4)} s, range {f(vals[0], 4)}–{f(vals[-1], 4)}, '
              f'within 1 s in {sum(1 for v in vals if v <= 1)} of {len(vals)}')
        causes = defaultdict(int)
        for s in p.fell:
            causes[s.get('cause')] += 1
        print(f'   causes {dict(causes)}')
    refusals = defaultdict(int)
    for s in p.stood:
        refusals[s.get('popRefusal')] += 1
    if p.mode == 'takeoff':
        print(f'   the stand\'s own refusal {dict(refusals)}')
    print()


def regime(p):
    """The claim the four numbers are conditional ON: is the rider on the plane, and may it ask for a lean?"""
    print(f'### {p.label} — the regime (#429\'s premise, re-measured)')
    first = [num(s['first'], 'planingFirst') for s in p.stood if s.get('first')]
    on = sum(s['first']['planingOn'] for s in p.stood if s.get('first'))
    n = sum(s['first']['n'] for s in p.stood if s.get('first'))
    capon = sum(s['first']['capOn'] for s in p.stood if s.get('first'))
    askon = sum(s['first']['askOn'] for s in p.stood if s.get('first'))
    print(f'   planing at the first standing frame: 1 in {sum(1 for v in first if v == 1)} of {len(first)} stands; '
          f'median {f(med(first), 3)}')
    print(f'   planing through the first second: {on} of {n} frames ({100 * on / n if n else 0:.1f} %)')
    print(f'   a non-zero lean CAP: {capon} of {n} frames; a non-zero lean ASK: {askon} of {n} frames')
    print(f"   median leanCap over the first second {f(med([num(s['first'], 'capMed') for s in p.stood]), 4)} rad")
    # ⭐ Per wave, because "a take-off is off the plane" may be a fact about a SEA rather than about take-offs. If the
    # share swings wave by wave, the regime is not placement-versus-take-off; it is which wave was caught.
    if p.mode == 'takeoff':
        print('   per wave (the no-stick script where there is one), so a pooled share cannot hide the spread:')
        print('      wave  script  planing@stand  planing share  capMed, rad  fell after stand, s  exposure  refusal')
        for s in sorted(p.stood, key=lambda s: (s.get('wave'), str(s.get('script')))):
            w = s['first']
            share = f"{w['planingOn']}/{w['n']}" if w['n'] else '0/0'
            print(f"      {str(s.get('wave')):>4}  {str(s.get('script')):>6}  {f(num(w, 'planingFirst'), 0):>13}  "
                  f"{share:>13}  {f(num(w, 'capMed'), 4):>11}  "
                  f"{(f(num(s, 'fellAfterStand'), 4) if s.get('fellAfterStand') is not None else 'no fall'):>19}  "
                  f"{f(num(s, 'standExposure'), 2):>8}  {s.get('popRefusal')}")
    print()


def tips(p):
    """NUMBER 1 — does the CoM line still leave the support on every ride, and at what fraction of the first second?"""
    print(f'### {p.label} — NUMBER 1: `tip`')
    n_st = len(p.stood)
    for key, what in (('tipNow', "limit === 'tip' (ONE substep of 32)"),
                      ('tipMem', 'limitTime.tip > 0 (the decaying memory, the published quantity)'),
                      ('outAny', 'the raw demand outside the support box (the geometry itself)')):
        ever = [s for s in p.stood if s.get('firstAt', {}).get(key) is not None]
        firsts = [s['firstAt'][key] * STEP for s in ever]
        inside = [v for v in firsts if v <= 1]
        print(f'   {what}')
        print(f'      fired on {len(ever)} of {n_st} stands; first at a median {f(med(firsts), 4)} s after the stand '
              f'({f(med(firsts), 4)} of the first second), inside the first second on {len(inside)} of {len(ever)}')
    pn = sum(s['first']['pinNow'] for s in p.stood if s.get('first'))
    pm = sum(s['first']['pinned'] for s in p.stood if s.get('first'))
    oa = sum(s['first']['outAny'] for s in p.stood if s.get('first'))
    n = sum(s['first']['n'] for s in p.stood if s.get('first'))
    print(f'   the first second, pooled over {n} frames in {n_st} stands:')
    print(f"      pinNow (limit==='tip')      {pn} = {100 * pn / n if n else 0:.1f} %")
    print(f'      pinned (limitTime.tip > 0)  {pm} = {100 * pm / n if n else 0:.1f} %   '
          f'ratio memory/now {f(pm / pn if pn else float("nan"), 2)}')
    print(f'      outAny (the geometry)       {oa} = {100 * oa / n if n else 0:.1f} %')
    # Masking: `limit` is set to 'impact' BEFORE 'tip' is tested, so a frame can be geometrically tipped and not say so.
    masked = both = tipped = 0
    for rows in p.stand_rows.values():
        for r in rows:
            if num(r, 'tStand') > 1:
                continue
            out = num(r, 'outX') > 0 or num(r, 'outZ') > 0
            now = r.get('limit') == 'tip'
            tipped += 1 if out else 0
            both += 1 if (out and now) else 0
            masked += 1 if (out and not now) else 0
    print(f'      MASKING: of {tipped} first-second frames whose demand is outside the box, {both} report '
          f"limit==='tip' and {masked} do not (limit is 'impact'/'slip'/'flight' instead)")
    # ☠️ IS THE PUBLISHED PINNED SHARE A MEASURE OF PINNING AT ALL? `limitTime.tip` only ever adds `h` when tip binds
    # and otherwise decays by exp(−h/0.2), so under the published `> 0` test it can only clear by underflowing a
    # double. If that is so, the share is "frames at or after the FIRST tip substep" — monotone, and guaranteed high
    # by an early flip. Tested here rather than argued: after the first positive frame, is it ever 0 again?
    once = back = after = 0
    runs_latched = 0
    for rows in p.stand_rows.values():
        seen = False
        for r in rows:
            pos = r.get('tipPos') == 1
            if pos and not seen:
                seen = True
                once += 1
                runs_latched += 1
            elif seen:
                after += 1
                if not pos:
                    back += 1
    print(f'   LATCH TEST on `limitTime.tip > 0`: it goes positive in {runs_latched} runs and, over the '
          f'{after} standing frames that follow, returns to 0 on {back} of them'
          f'{"  → it is a LATCH, not a share of pinned frames" if back == 0 and after > 0 else ""}')
    lat = [s for s in p.stood if s.get('tipLatchAt') is not None]
    if lat:
        before = sum(1 for s in lat if s.get('tipLatchBeforeStand') == 1)
        phases = defaultdict(int)
        for s in lat:
            phases[s.get('tipLatchPhase')] += 1
        print(f'   and it flips BEFORE the stand on {before} of {len(lat)} stands — in phase {dict(phases)} — '
              f'so on those the first second\'s "pinned" share is a memory of the POP-UP, not of the stand')
    # Per-stand share, so the pooled share cannot hide one run carrying it.
    shares = [s['first']['pinNow'] / s['first']['n'] for s in p.stood if s.get('first') and s['first']['n']]
    print(f'   per-stand pinNow share: median {f(med(shares), 4)}, zero in '
          f'{sum(1 for v in shares if v == 0)} of {len(shares)}')
    # The reviewer's lead, on this population: the instantaneous pin against whether the window was carried.
    carried = [s for s in p.stood if s.get('firstFull') == 1 and (s.get('fellAfterStand') is None or num(s, 'fellAfterStand') > 1)]
    lost = [s for s in p.stood if s.get('fellAfterStand') is not None and num(s, 'fellAfterStand') <= 1]
    cz = sum(1 for s in carried if s['first']['pinNow'] == 0)
    lz = sum(1 for s in lost if s['first']['pinNow'] > 0)
    print(f'   LEAD (not a result): pinNow == 0 in {cz} of {len(carried)} stands that carried the first second; '
          f'pinNow > 0 in {lz} of {len(lost)} that did not')
    print()


def tolerance(p):
    """NUMBER 2 — the stance's tolerance, recomputed from the MEASURED CoM height and support."""
    print(f'### {p.label} — NUMBER 2: the stance\'s tolerance')
    at = [s['atStand'] for s in p.stood if s.get('atStand')]
    if at:
        halfs = [(num(r, 'supXMax') - num(r, 'supXMin')) / 2 for r in at]
        print(f'   AT THE STAND ({len(at)} stands): support half-width across median {f(med(halfs), 5)} m '
              f'(values {sorted(set(round(h, 5) for h in halfs))})')
        print(f"      CoM above the DECK (project's own `height`) median {f(med([num(r, 'comH') for r in at]), 5)} m "
              f"→ tolerance {f(med([num(r, 'tolH') for r in at]), 3)}°")
        print(f"      CoM as raw local y (3.5/bank.ts's `height`)      median {f(med([num(r, 'comY') for r in at]), 5)} m "
              f"→ tolerance {f(med([num(r, 'tolY') for r in at]), 3)}°")
        print(f"      load {f(med([num(r, 'load') for r in at]), 3)} bw, front SHARE OF LOAD "
              f"{f(med([num(r, 'front') for r in at]), 4)} (not a position), roll {f(med([num(r, 'roll') for r in at]), 3)}°, "
              f"mismatch {f(med([num(r, 'mismatch') for r in at]), 3)}°")
    comh, tol, mis, past = [], [], [], 0
    nfr = 0
    for rows in p.stand_rows.values():
        for r in rows:
            if num(r, 'tStand') > 1:
                continue
            nfr += 1
            comh.append(num(r, 'comH'))
            tol.append(num(r, 'tolH'))
            mis.append(abs(num(r, 'mismatch')))
            if abs(num(r, 'mismatch')) > num(r, 'tolH'):
                past += 1
    print(f'   THROUGH THE FIRST SECOND ({nfr} frames): CoM above the deck median {f(med(comh), 5)} m '
          f'(range {f(min(comh) if comh else float("nan"), 5)}–{f(max(comh) if comh else float("nan"), 5)}), '
          f'tolerance median {f(med(tol), 3)}° '
          f'(range {f(min(tol) if tol else float("nan"), 3)}–{f(max(tol) if tol else float("nan"), 3)}), '
          f'|mismatch| median {f(med(mis), 3)}°, |mismatch| past the tolerance on {past} of {nfr} frames')
    ever = [s for s in p.stood if s.get('firstAt', {}).get('misPastTol') is not None]
    print(f'   the mismatch passes the tolerance at all on {len(ever)} of {len(p.stood)} stands')
    # By phase, so the pop-up's own support change is visible rather than inferred.
    byphase = defaultdict(lambda: ([], [], set()))
    for rows in p.all_rows.values():
        for r in rows:
            if r.get('attached') != 1 or r.get('comH') is None:
                continue
            a, b, c = byphase[r.get('phase')]
            a.append(num(r, 'comH'))
            b.append(num(r, 'tolH'))
            c.add(round((num(r, 'supXMax') - num(r, 'supXMin')) / 2, 5))
    if len(byphase) > 1:
        print('   by phase (every attached frame emitted), so the pop-up\'s own support is measured and not inferred:')
        for phase in ('prone', 'push', 'landing', 'standing'):
            if phase not in byphase:
                continue
            a, b, c = byphase[phase]
            print(f'      {phase:<9} {len(a):>6} frames   half-width {sorted(c)}   CoM above deck median '
                  f'{f(med(a), 5)} m   tolerance median {f(med(b), 3)}°')
    print()


def follow(p):
    """NUMBER 3 — the follow gain and the lag, by the same arithmetic #421/#424 used, and split by the plane."""
    print(f'### {p.label} — NUMBER 3: the body against the deck')

    def gain(pred, name):
        """`pred(row_at_t, row_at_t_minus_lag)`: BOTH ends of the pair must satisfy it, so a filter on the regime
        cannot quietly pair a planing response with an off-plane predictor."""
        rolls = []
        slopes = []
        for lag in LAGS:
            sxy = sxx = 0.0
            n = 0
            mis = []
            for rows in p.stand_rows.values():
                for i in range(lag, len(rows)):
                    if not pred(rows[i], rows[i - lag]):
                        continue
                    x = num(rows[i - lag], 'roll')
                    y = num(rows[i], 'bank')
                    if x != x or y != y:
                        continue
                    sxy += x * y
                    sxx += x * x
                    n += 1
                    mis.append(abs(y - x))
                    if lag == 0:
                        rolls.append(abs(x))
            slopes.append((lag, sxy / sxx if sxx > 0 else float('nan'), n, med(mis)))
        if slopes[0][2] == 0:
            print(f'   {name}: 0 frames at lag 0 — THE POPULATION IS EMPTY, and nothing is reported off it')
            return float('nan'), float('nan')
        cross = float('nan')
        for i in range(1, len(slopes)):
            a, b = slopes[i - 1], slopes[i]
            if a[1] == a[1] and b[1] == b[1] and (a[1] - 1) * (b[1] - 1) <= 0 and a[1] != b[1]:
                cross = a[0] + ((1 - a[1]) * (b[0] - a[0])) / (b[1] - a[1])
                break
        print(f'   {name}')
        print('      lag(fr)  lag(s)   frames   slope    median |mismatch|, °')
        for lag, sl, n, m in slopes:
            print(f'      {lag:>7}  {lag / 60:>6.4f}   {n:>6}   {f(sl, 4):>7}   {f(m, 3)}')
        # ⭐ When the gain never reaches 1 there is no crossing to interpolate, and reporting a blank would hide the
        # shape. The PEAK is the honest lag estimate in that case, and whether it reaches 1 is the finding.
        best = max((s for s in slopes if s[1] == s[1]), key=lambda s: s[1], default=None)
        print(f'      → the follow gain crosses 1.000 at {f(cross, 2)} frames = {f(cross / 60, 4)} s'
              f'   [lag 0 slope {f(slopes[0][1], 4)}]')
        if best is not None:
            print(f'      → it PEAKS at {f(best[1], 4)} at lag {best[0]} frames = {f(best[0] / 60, 4)} s'
                  f'{" — so it NEVER reaches 1 and there is no crossing" if cross != cross else ""}')
        # ⭐ The leverage: a through-origin regression is dominated by its largest |x|. A population whose deck
        # barely banks cannot support a gain estimate however many frames it has, so the spread is printed with it.
        if rolls:
            srt = sorted(rolls)
            print(f'      leverage: |deck roll| median {f(med(rolls), 3)}°, 90th {f(srt[int(0.9 * (len(srt) - 1))], 3)}°, '
                  f'max {f(srt[-1], 3)}°; frames past 2° {sum(1 for v in rolls if v > 2)} of {len(rolls)}')
        return slopes[0][1], cross

    gain(lambda a, b: True, 'every standing frame')
    gain(lambda a, b: num(a, 'planing') == 0 and num(b, 'planing') == 0, 'OFF the plane at BOTH ends (planing == 0)')
    gain(lambda a, b: num(a, 'planing') == 1 and num(b, 'planing') == 1, 'ON the plane at BOTH ends (planing == 1)')
    # ⭐ A regression through the origin is dominated by its largest |x|. The published 0.8748 was taken where the
    # deck banks 28–66°; a take-off with the stick at zero barely banks at all, so the same number restricted to the
    # frames that carry the leverage is the comparable one, and it is printed beside the full population.
    gain(lambda a, b: abs(num(b, 'roll')) > 2, 'deck past 2° at the predictor end')
    gain(lambda a, b: abs(num(b, 'roll')) > 5, 'deck past 5° at the predictor end')
    # #421's other published form of the same claim: `|mismatch| = lag × |deck roll rate|`, as BAND MEDIANS
    # (73–104 ms on the analytic face, 40–80 ms on the sea). ⚠️ #424 showed the per-frame law carries nothing
    # (R² = −0.053), so the per-frame fit is printed BESIDE the bands here and neither is quoted without the other.
    bands = [(0, 20), (20, 50), (50, 100), (100, 200), (200, 1e9)]
    pairs = []
    sxy = sxx = 0.0
    ys = []
    for runrows in p.stand_rows.values():
        prev = None
        for r in runrows:
            roll = num(r, 'roll')
            # Only a CONSECUTIVE pair of frames is a rate: a gap would be differencing across missing rows.
            if prev is not None and r.get('frame') == prev[1] + 1:
                rate = abs((roll - prev[0]) / STEP)
                mis = abs(num(r, 'mismatch'))
                pairs.append((rate, mis))
                sxy += rate * mis
                sxx += rate * rate
                ys.append(mis)
            prev = (roll, r.get('frame'))
    print('   |mismatch| against |deck roll rate| (#421\'s own form), BAND MEDIANS:')
    for lo, hi in bands:
        sel = [m / rate * 1000 for rate, m in pairs if lo < rate <= hi and rate > 0]
        print(f'      rate {lo:>4}–{hi if hi < 1e9 else "inf":<4} °/s   {len(sel):>6} frames   '
              f'median mismatch/rate {f(med(sel), 1)} ms')
    if pairs and sxx > 0:
        b = sxy / sxx
        mean = sum(ys) / len(ys)
        ss_res = sum((m - b * rate) ** 2 for rate, m in pairs)
        ss_tot = sum((m - mean) ** 2 for m in ys)
        print(f'      the PER-FRAME law |mismatch| = B|rate| through the origin: B = {f(1000 * b, 1)} ms, '
              f'R2 = {f(1 - ss_res / ss_tot if ss_tot else float("nan"), 3)} over {len(pairs)} frames '
              f'(negative means worse than the mean, which is #424\'s finding)')
    # The sign agreement #421 published beside the gain: does the body bank the same way as the deck?
    same = seen = 0
    for rows in p.stand_rows.values():
        for r in rows:
            if abs(num(r, 'roll')) <= 2:
                continue
            seen += 1
            if num(r, 'roll') * num(r, 'bank') > 0:
                same += 1
    print(f'   the body banks the SAME WAY as the deck, deck past 2°: {same} of {seen} frames '
          f'({f(same / seen if seen else float("nan"), 3)})')
    print()


def demand(p):
    """NUMBER 4 — how far outside the feet the raw demand goes."""
    print(f'### {p.label} — NUMBER 4: the demand outside the feet')
    at = [s['atStand'] for s in p.stood if s.get('atStand')]
    if at:
        print(f"   AT THE STAND ({len(at)} stands): outX median {f(med([num(r, 'outX') for r in at]), 5)} m, "
              f"outZ median {f(med([num(r, 'outZ') for r in at]), 5)} m; "
              f"outside at all on {sum(1 for r in at if num(r, 'outX') > 0 or num(r, 'outZ') > 0)} of {len(at)}")
    esc_x, esc_z, firsts, peaks, esc_loaded = [], [], [], [], []
    nx = nz = n = 0
    for rows in p.stand_rows.values():
        seen_first = False
        run_peak = 0.0
        for r in rows:
            if num(r, 'tStand') > 1:
                continue
            n += 1
            ox, oz = num(r, 'outX'), num(r, 'outZ')
            if ox > 0:
                nx += 1
                esc_x.append(ox)
                # ⚠️ `freeX = local.x − height·j.x/j.y` DIVERGES as the normal impulse vanishes, so `outX`'s tail is
                # a near-zero-load tail, not a bigger lean. The load-matched figure is the comparable one, and
                # #425's own palm-down population was loaded by construction.
                if num(r, 'load') >= 0.5:
                    esc_loaded.append(ox)
            if oz > 0:
                nz += 1
                esc_z.append(oz)
            run_peak = max(run_peak, ox)
            if (ox > 0 or oz > 0) and not seen_first:
                seen_first = True
                firsts.append(ox)
        if n:
            peaks.append(run_peak)
    print(f'   THROUGH THE FIRST SECOND ({n} frames in {len(p.stand_rows)} runs):')
    print(f'      the demand is outside the feet ACROSS on {nx} of {n} frames ({100 * nx / n if n else 0:.1f} %), '
          f'ALONG on {nz} of {n} ({100 * nz / n if n else 0:.1f} %)')
    print(f'      the excursion across, over escaping frames: median {f(med(esc_x), 5)} m, '
          f'peak {f(max(esc_x) if esc_x else float("nan"), 5)} m')
    print(f'      … restricted to escaping frames the feet actually CARRY (load >= 0.5 bw): '
          f'{len(esc_loaded)} of {len(esc_x)}, median {f(med(esc_loaded), 5)} m — the load-matched figure, '
          f'since `freeX` diverges as the normal impulse vanishes')
    print(f'      the excursion along, over escaping frames: median {f(med(esc_z), 5)} m')
    print(f'      on the FIRST escaping frame of a run: median {f(med(firsts), 5)} m ({len(firsts)} runs)')
    print(f'      per-run peak excursion across: median {f(med(peaks), 5)} m')
    fl = [s['atFall'] for s in p.stood if s.get('atFall')]
    if fl:
        print(f"   AT THE FALL, the last attached frame ({len(fl)} rows): outX median {f(med([num(r, 'outX') for r in fl]), 5)} m "
              f"(peak {f(max(num(r, 'outX') for r in fl), 5)}), outZ median {f(med([num(r, 'outZ') for r in fl]), 5)} m; "
              f"outside at all on {sum(1 for r in fl if num(r, 'outX') > 0 or num(r, 'outZ') > 0)} of {len(fl)}")
        print(f"      and the CAPTURE POINT past the feet there — a DIFFERENT quantity (it carries the body's own "
              f"velocity, `across = px + vx/omega`) — median {f(med([num(r, 'bPast') for r in fl]), 5)} m")
    print(f'      what a palm could add across (#425\'s ceiling, for scale): 0.10194 m; '
          f'the board\'s half-width 0.232 m')
    # The demand is only refreshed while the feet carry the body (`loaded`, BALANCE_LOAD), so a stale `desiredCop`
    # would be read as a live one. Counted rather than assumed.
    live = seen = 0
    for rows in p.stand_rows.values():
        for r in rows:
            if num(r, 'tStand') > 1:
                continue
            seen += 1
            live += 1 if r.get('loadedNow') == 1 else 0
    print(f'      the demand was REFRESHED this frame (`loaded`) on {live} of {seen} first-second frames; '
          f'on the rest `desiredCop` is the last loaded substep\'s')
    print()


def constraints(p):
    """The reviewer's ask: the three headrooms SEPARATELY, since the scalar cannot name which went."""
    print(f'### {p.label} — which constraint goes first (the three headrooms, read separately)')
    at = [s['atStand'] for s in p.stood if s.get('atStand')]
    fl = [s['atFall'] for s in p.stood if s.get('atFall')]
    for rows, what in ((at, 'at the stand'), (fl, 'at the fall (the LAST ATTACHED frame)')):
        if not rows:
            continue
        print(f'   {what} ({len(rows)} rows):')
        print(f"      project's own three: across {f(med([num(r, 'hAcross') for r in rows]), 4)}  "
              f"along {f(med([num(r, 'hAlong') for r in rows]), 4)}  grip {f(med([num(r, 'hGrip') for r in rows]), 4)}"
              f"   (their clamped min = rawMargin {f(med([num(r, 'rawMargin') for r in rows]), 4)}, "
              f"filtered into margin {f(med([num(r, 'margin') for r in rows]), 4)})")
        mins = defaultdict(int)
        for r in rows:
            three = {'across': num(r, 'hAcross'), 'along': num(r, 'hAlong'), 'grip': num(r, 'hGrip')}
            mins[min(three, key=three.get)] += 1
        print(f'      which of the three is LOWEST: {dict(mins)}')
        bl = defaultdict(int)
        for r in rows:
            bl[r.get('bLimit')] += 1
        print(f"      the capture test's own three (`balanceLimits`): margin "
              f"{f(med([num(r, 'bMargin') for r in rows]), 4)}  grip {f(med([num(r, 'bGrip') for r in rows]), 4)}  "
              f"knee {f(med([num(r, 'bKnee') for r in rows]), 4)}; which bound {dict(bl)}; "
              f"capture point past the feet {f(med([num(r, 'bPast') for r in rows]), 4)} m")
    print()


def pair_trace(p, wave):
    """One wave's scripts side by side, frame by frame, with **the three headrooms read separately**.

    Part 13.4 of #429's README left this as the open measurement: on seed 2's wave 1 the same stand carries the window
    when nothing is asked and goes when a turn is, and `rawMargin` — a FILTERED MINIMUM of three headrooms — cannot
    say which of the three went. These columns can.
    """
    print(f'### {p.label} — wave {wave}, the scripts side by side, with the three headrooms separate')
    keys = sorted((k for k in p.stand_rows if k[2] == wave), key=lambda k: str(k[1]))
    if not keys:
        print(f'   no standing rows on wave {wave}')
        return
    for k in keys:
        rows = p.stand_rows[k]
        print(f'   {k[1]}  ({len(rows)} standing frames)')
        print('      t+s     roll°    bank°   across    along     grip   rawMarg  limit  outX     load   planing  cap')
        for r in rows:
            t = num(r, 'tStand')
            if abs(t * 10 - round(t * 10)) > 1e-6:   # every 0.1 s, so a 3 s ride is readable
                continue
            print(f"      {t:>5.2f}  {f(num(r, 'roll'), 3):>7}  {f(num(r, 'bank'), 3):>7}  "
                  f"{f(num(r, 'hAcross'), 4):>7}  {f(num(r, 'hAlong'), 4):>7}  {f(num(r, 'hGrip'), 4):>7}  "
                  f"{f(num(r, 'rawMargin'), 4):>7}  {str(r.get('limit')):>5}  {f(num(r, 'outX'), 4):>6}  "
                  f"{f(num(r, 'load'), 3):>6}  {int(num(r, 'planing')):>7}  {f(num(r, 'cap'), 4)}")
        last = rows[-1]
        print(f"      last attached frame: t+{f(num(last, 'tStand'), 4)} s, limit {last.get('limit')}, "
              f"across {f(num(last, 'hAcross'), 4)}, along {f(num(last, 'hAlong'), 4)}, grip {f(num(last, 'hGrip'), 4)}, "
              f"capture past the feet {f(num(last, 'bPast'), 4)} m, bLimit {last.get('bLimit')}")
    print()


def control_pair(a, b):
    """`PROBE=on` against `PROBE=off`: every shared summary value compared. A difference means the probe is not one."""
    print('## CONTROL — the probe\'s inertness')
    ka = {run_key(s): s for s in a.summaries}
    kb = {run_key(s): s for s in b.summaries}
    shared = sorted(set(ka) & set(kb), key=lambda k: tuple(str(x) for x in k))
    skip = {'first', 'whole', 'firstAt', 'atStand', 'atFall', 'liveFrames'}
    compared = diff = 0
    worst = []
    for k in shared:
        for key in set(ka[k]) | set(kb[k]):
            if key in skip:
                continue
            va, vb = ka[k].get(key), kb[k].get(key)
            if not isinstance(va, (int, float, str)) or not isinstance(vb, (int, float, str)):
                continue
            compared += 1
            if va != vb:
                diff += 1
                if len(worst) < 8:
                    worst.append(f'{k}.{key}: {va} vs {vb}')
        # The window's own columns too: the measurement must be identical, not only the outcome.
        for block in ('first', 'whole'):
            wa, wb = ka[k].get(block) or {}, kb[k].get(block) or {}
            for key in set(wa) | set(wb):
                va, vb = wa.get(key), wb.get(key)
                if not isinstance(va, (int, float)) or not isinstance(vb, (int, float)):
                    continue
                compared += 1
                if va != vb:
                    diff += 1
                    if len(worst) < 8:
                        worst.append(f'{k}.{block}.{key}: {va} vs {vb}')
    print(f'   {len(shared)} runs aligned of {len(ka)} and {len(kb)}; {compared} summary values compared; '
          f'{diff} differ')
    for w in worst:
        print(f'      {w}')
    print('   A broken result here is a changed fall time or a changed window median; there is none.' if diff == 0
          else '   ⚠️ THE PROBE IS NOT INERT.')
    print()


def main():
    args = [a for a in sys.argv[1:]]
    labels = []
    control = None
    pair = None
    paths = []
    i = 0
    while i < len(args):
        if args[i] == '--labels':
            labels = args[i + 1].split(',')
            i += 2
        elif args[i] == '--control':
            control = args[i + 1]
            i += 2
        elif args[i] == '--pair':
            pair = int(args[i + 1])
            i += 2
        else:
            paths.append(args[i])
            i += 1
    pops = []
    for n, path in enumerate(paths):
        label = labels[n] if n < len(labels) else path.split('/')[-1].replace('.jsonl', '')
        pops.append(Pop(label, path))
    print('# The four numbers, through a stand and on a placement — one instrument, two populations')
    print('# Every median is a PLAIN median. Every share carries its count.')
    print()
    for p in pops:
        header(p)
    for p in pops:
        regime(p)
        tips(p)
        tolerance(p)
        follow(p)
        demand(p)
        constraints(p)
        if pair is not None:
            pair_trace(p, pair)
    if control:
        control_pair(pops[0], Pop('control', control))


if __name__ == '__main__':
    main()
