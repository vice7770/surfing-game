#!/usr/bin/env python3
"""3.6c M1, on ridden frames: how far the shipped yaw ledger's rider residual was from the closed one (the duplicate,
`yDup`, less the omitted suction `ySuc`), against the closed rider term and the fins' term, on the base run's Canyon Big
standing frames, per script group; and the sum check (the closed entries against `yTot`, rounding of the rows only).

    python3 -I dup.py <run dir> [--md out.md]
"""
import glob, json, math, os, sys
d = sys.argv[1]
md = sys.argv[sys.argv.index('--md') + 1] if '--md' in sys.argv else None
acc = {}
for path in sorted(glob.glob(os.path.join(d, 'big_s*.jsonl'))):
    for line in open(path):
        if not line.startswith('{"kind":"w"'):
            continue
        r = json.loads(line)
        g = r['script'].split(':')[0] if not r['script'].startswith('release') else 'release'
        a = acc.setdefault(g, {'n': 0, 'dup': [], 'rid': [], 'fin': [], 'err': 0.0})
        a['n'] += 1
        a['dup'].append(abs(r['yDup'] - r['ySuc']))
        a['rid'].append(abs(r['yRid']))
        a['fin'].append(abs(r['yFin']))
        s = sum(r[k] for k in ('yB', 'yP', 'yAm', 'yRad', 'yFr', 'yBed', 'yFin', 'yRail', 'yFro', 'ySuc', 'yGy', 'yRid'))
        a['err'] = max(a['err'], abs(s - r['yTot']))
def rms(v): return math.sqrt(sum(x * x for x in v) / len(v))
def med(v):
    v = sorted(v); n = len(v); return v[n // 2] if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2
lines = ['| script group | standing frames | \\|shipped − closed rider\\|, median / RMS (N·m) | \\|closed rider\\|, median / RMS | \\|fins\\|, median / RMS | largest \\|sum − total\\| (row rounding) |', '| --- | --- | --- | --- | --- | --- |']
for g, a in sorted(acc.items()):
    lines.append(f"| {g} | {a['n']} | {med(a['dup']):.2f} / {rms(a['dup']):.2f} | {med(a['rid']):.2f} / {rms(a['rid']):.2f} | {med(a['fin']):.2f} / {rms(a['fin']):.2f} | {a['err']:.3f} |")
out = '\n'.join(lines) + '\n'
print(out)
if md:
    open(md, 'w').write(out)
