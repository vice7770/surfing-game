"""pool-barrel (2026-11-01): a frame-probe run's JSON summarised for the notes, per arm, leaving out the wave already white
at the record's start: the start's phase in the period and its place (sd), the white's arrival at u 40, 55 (the take-off),
75 and 103 (the barrel section's end) from the start (median, sd, how many), the peel along the arm over u 55–75 and
75–103 (median), and the jets by |x| (share of the onsets, X, the void W).
  python3 docs/research/pool-barrel-2026-11-01/summary.py <run.json> [settle=50]"""
import json, statistics as st, sys
d = json.load(open(sys.argv[1]))
settle = float(sys.argv[2]) if len(sys.argv) > 2 else 50.0
med = lambda v: st.median(v) if v else float('nan')
sd = lambda v: st.stdev(v) if len(v) > 1 else float('nan')
for side, sign in (('right', 1), ('left', -1)):
    waves = [w for w in d[side] if w['start'] > settle + 1 and len(w['track']) >= 2]
    at = lambda w, u: next((t - w['start'] for t, v in w['track'] if v >= u), None)
    cells = []
    for u in (40, 55, 75, 103):
        v = [a for a in (at(w, u) for w in waves) if a is not None]
        cells.append(f"u {u}: {len(v)}/{len(waves)}, +{med(v):.1f} s (sd {sd(v):.2f})")
    def speed(u0, u1):
        out = []
        for w in waves:
            a, b = at(w, u0), at(w, u1)
            if a is not None and b is not None and b > a: out.append((u1 - u0) / (b - a))
        return med(out)
    print(f"{side}: {len(waves)} waves; start at {med([w['start'] % 10 for w in waves]):.2f} s in the period (sd {sd([w['start'] % 10 for w in waves]):.2f}), "
          f"x {med([w['x'] for w in waves]):.0f} (sd {sd([w['x'] for w in waves]):.1f}), {med([w['d'] for w in waves]):.2f} m deep; " + '; '.join(cells)
          + f"; peel u 55–75 {speed(55, 75):.1f} m/s, 75–103 {speed(75, 103):.1f} m/s, 55–103 {speed(55, 103):.1f} m/s")
    on = [o for o in d['onsets'] if sign * o['x'] >= 0 and o['t'] > settle + 1]
    jets = [j for j in d['jets'] if sign * j['x'] >= 0 and j['t'] > settle + 1]
    row = []
    for lo in range(0, 50, 5):
        o = [v for v in on if lo <= sign * v['x'] < lo + 5]
        j = [v for v in jets if lo <= sign * v['x'] < lo + 5]
        X = [v['X'] for v in j if v['X'] is not None and v['X'] == v['X']]
        row.append(f"x {lo}: d {med([v['depth'] for v in o]):.2f}, face {med([v['face'] for v in o]):.0f}°, jets {100 * len(j) / max(1, len(o)):.0f} %, X {med(X):.1f}, W {med([v['W'] for v in j]):.2f}")
    print('  jets: ' + '; '.join(row))
