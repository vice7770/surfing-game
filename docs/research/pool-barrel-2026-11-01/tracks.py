"""pool-barrel (2026-11-01): a frame-probe run's JSON, read wave by wave: when the white's end reached each u along the right
arm (s after the wave's start), the onsets' median depth by |x| (5 m bins), and the jets' median X and void W by |x|.
  python3 docs/research/pool-barrel-2026-11-01/tracks.py <run.json> [side]"""
import json, sys
d = json.load(open(sys.argv[1]))
side = sys.argv[2] if len(sys.argv) > 2 else 'right'
sign = 1 if side == 'right' else -1
med = lambda v: sorted(v)[len(v) // 2] if v else None
for w in d[side][1:6]:
    tr, t0 = w['track'], w['start']
    at = lambda u: next((t for t, v in tr if v >= u), None)
    print(' '.join(f"u{u}:{at(u) - t0:.1f}" if at(u) is not None else f"u{u}:—" for u in (20, 40, 55, 65, 75, 85, 95, 103, 110)))
on = [o for o in d['onsets'] if sign * o['x'] >= 0 and o['t'] > 52]
print('onset depth ' + ' '.join(f"x{lo}:{med([o['depth'] for o in on if lo <= sign * o['x'] < lo + 5]) or 0:.2f}" for lo in range(0, 60, 5)))
jets = [j for j in d['jets'] if sign * j['x'] >= 0]
cells = []
for lo in range(0, 60, 5):
    sel = [j for j in jets if lo <= sign * j['x'] < lo + 5]
    X = med([j['X'] for j in sel if j['X'] is not None and j['X'] == j['X']])
    W = med([j['W'] for j in sel])
    cells.append(f"x{lo}:X{X:.1f}/W{W:.2f}/n{len(sel)}" if X and W else f"x{lo}:n{len(sel)}")
print('jets ' + ' '.join(cells))
