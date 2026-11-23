"""Step 3.5s: the test wave's 27-cell grid, the heading against the latched line (straight-fall.ts output with the 3.5s
`line`/`lineErr` columns). The fall times, the side, the rail and bank, the plumb share and the end speeds are
face-trim-grid.py's and face-trim-ends.py's, run on the same files.

Per cell, over the attached frames from the latch (the first frame `line` is set; the grid's stick is centred, so it
never clears): the mean and the worst |heading - line|, and the error at the last attached frame (game sign, + the nose
up the face, toward the board's left). Whether it rings: the yaw rate less its own 1 s running mean (the oscillation
about the drift), its RMS over 0.5-2.0 s (early) and over 2.0 s to 0.3 s before the end (late); the ratio late/early
over 1 grows. Also the error's sign changes after it first passes 5 deg (an overshoot count).
    python3 docs/research/new-rider/3.5/hold-line-grid.py name=<frames.jsonl> ...
"""
import json, math, statistics as st, sys


def med(xs, n=1):
    xs = [x for x in xs if x is not None]
    if not xs:
        return '-'
    return f"{st.median(xs):+.{n}f} ({min(xs):+.{n}f} to {max(xs):+.{n}f}, n {len(xs)})"


def load(path):
    cells = {}
    for line in open(path):
        d = json.loads(line)
        if d.get('kind') == 'frame':
            cells.setdefault(d['cell'], {'frames': []})['frames'].append(d)
        elif d.get('kind') == 'summary':
            c = cells.setdefault(d['cell'], {'frames': []})
            c['fell'] = d['fell']; c['cens'] = d['censored']
    return cells


def rms(xs):
    return math.sqrt(sum(x * x for x in xs) / len(xs)) if xs else None


for arg in sys.argv[1:]:
    name, path = arg.split('=')
    cells = load(path)
    meanErr, worstErr, endErr, ratio, early, late, latch, crossings, within5, within10 = [], [], [], [], [], [], [], [], [], []
    for c in cells.values():
        live = [f for f in c['frames'] if f['attached']]
        held = [f for f in live if f.get('line') is not None]
        if not held:
            continue
        latch.append(held[0]['t'])
        errs = [f['lineErr'] for f in held]
        meanErr.append(sum(abs(e) for e in errs) / len(errs))
        worstErr.append(max(errs, key=abs))
        endErr.append(errs[-1])
        within5.append(100 * sum(1 for e in errs if abs(e) <= 5) / len(errs))
        within10.append(100 * sum(1 for e in errs if abs(e) <= 10) / len(errs))
        # Overshoots: sign changes of the error after it first leaves +-5 deg.
        first = next((i for i, e in enumerate(errs) if abs(e) > 5), None)
        n = 0
        if first is not None:
            sgn = math.copysign(1, errs[first])
            for e in errs[first:]:
                if abs(e) > 1 and math.copysign(1, e) != sgn:
                    n += 1; sgn = -sgn
        crossings.append(n)
        # The oscillation about the drift: yaw rate less its centred 1 s running mean.
        ys = [(f['t'], f['yawRate']) for f in live]
        hp = []
        for i, (t, y) in enumerate(ys):
            win = [v for (tt, v) in ys if abs(tt - t) <= 0.5]
            hp.append((t, y - sum(win) / len(win)))
        end = live[-1]['t']
        e1 = rms([v for t, v in hp if 0.5 <= t < 2.0])
        e2 = rms([v for t, v in hp if 2.0 <= t <= end - 0.3])
        early.append(e1); late.append(e2)
        if e1 and e2 is not None:
            ratio.append(e2 / e1)
    print(f"{name}: cells {len(meanErr)}; latched at {med(latch, 3)} s")
    print(f"   heading - line over the ride (deg, game sign, + up the face): mean |error| {med(meanErr)}; worst {med(worstErr)}; at the last attached frame {med(endErr)}")
    print(f"   share of the ride within 5 deg of the line {med(within5)} %, within 10 deg {med(within10)} %; overshoots past the line {med(crossings, 0)}")
    print(f"   yaw oscillation about its 1 s mean, RMS deg/s: early (0.5-2.0 s) {med(early, 2)}, late (2.0 s to the end) {med(late, 2)}; late/early {med(ratio, 2)} (> 1 grows in {sum(1 for r in ratio if r > 1)} of {len(ratio)})")
