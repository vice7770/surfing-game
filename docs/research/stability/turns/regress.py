#!/usr/bin/env python3
"""3.6b: one ride, switch off against an arm, from the benchmark's own frame rows: the fall, the limit on the last standing
frame, the reserve's least and where, the yaw rate's ringing over the steer (std, deg/s, world) and its largest |value|,
and the course toward the steer at +0.5 / +1.0 s (raw, world).

    python3 regress.py <off raw dir> <arm raw dir> <file stem> [<file stem> ...]     (e.g. tw-catch_crouch_right)
"""
import json, statistics, sys
off, arm = sys.argv[1], sys.argv[2]
wrap = lambda d: ((d + 180) % 360 + 360) % 360 - 180
for name in sys.argv[3:]:
    s = 1 if name.endswith('left') else -1 if name.endswith('right') else 0
    for tag, d in (('off', off), ('arm', arm)):
        F = [json.loads(l) for l in open(f'{d}/{name}.jsonl') if '"kind":"f"' in l]
        st = [f for f in F if 'res' in f]
        y = [f['yaw'] for f in st if 1.0 <= f['tS'] <= 2.0]
        low = min(st, key=lambda f: f['res'])
        c0 = next(f for f in st if f['tS'] >= 1.0 - 1e-6)
        c = lambda t: next((round(wrap(f['crs'] - c0['crs']) * s, 1) for f in st if abs(f['tS'] - t) < 1 / 60), None)
        fell = F[-1]['tS'] if F[-1].get('at') == 0 else None
        print(f"{name:28} {tag:3} fell {fell} | last limit {st[-1].get('lim')} | least reserve {low['res']:.3f} at +{low['tS']:.2f} s | yaw ring {statistics.pstdev(y) if len(y) > 2 else 0:.0f}, max |yaw| {max(map(abs, y)) if y else 0:.0f} deg/s | course +0.5 {c(1.5)} / +1.0 {c(2.0)}")
