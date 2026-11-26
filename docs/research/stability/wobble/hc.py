#!/usr/bin/env python3
"""3.6c M3, the falling rides against their matched controls: Codex's half-cycle twist work before the escape.

    python3 -I hc.py <run dir> [--md out.md]

For every balance fall with the escape inside the steer (Big; Compress, the tuck; both sides), over frames 60 (+1.0 s) to
the escape's frame less 8: the half-cycles between zero crossings of Ω_alt, and in each W = −mean(τ_a,alt) × Δθ_t,alt (J;
`twAct`, `twA`, alternating parts). The same frames and rule on the same wave's straight ride of the stance and the same
wave's tall steer of the same side. Per ride: the sum, the count of positive half-cycles, the first two and the last two.
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wob import load, centred, median

d = sys.argv[1]
md = sys.argv[sys.argv.index('--md') + 1] if '--md' in sys.argv else None
scripts = {f'{s}:{w}' for s in ('compress', 'crouch', 'none') for w in ('left', 'right', 'straight')}
rides, _ = load(d, w_keys=['om', 'twAct', 'twA'], scripts=scripts, groups={'big'})


def works(r, a, b):
    w = r['w']
    need = range(a - 8, b + 8)
    if any(i not in w for i in need):
        return None
    om = [(w[i]['om'] + w[i - 1]['om']) / 2 for i in range(a - 7, b + 8)]
    oa = centred(om)[7:-7]
    ta = centred([w[i]['twAct'] for i in range(a - 7, b + 8)])[7:-7]
    th = centred([w[i]['twA'] for i in range(a - 7, b + 8)])[7:-7]
    zs = [i for i in range(1, len(oa)) if (oa[i - 1] < 0 <= oa[i]) or (oa[i - 1] >= 0 > oa[i])]
    out = []
    for z0, z1 in zip(zs, zs[1:]):
        out.append(-sum(ta[z0:z1 + 1]) / (z1 - z0 + 1) * (th[z1] - th[z0]))
    return out


rows = []
for rid, r in sorted(rides.items()):
    sc = r['script']
    st, side = sc.split(':')
    if st == 'none' or side == 'straight' or r['cause'] != 'balance' or r['escape'] is None or not (1.0 < r['escape'] < 2.0):
        continue
    a, b = 60, round(r['escape'] * 60) - 8
    if b - a < 15:
        continue
    base = rid.rsplit(':', 2)[0]
    mine = works(r, a, b)
    s = rides.get(f'{base}:{st}:straight')
    t = rides.get(f'{base}:none:{side}')
    rows.append((rid, mine, works(s, a, b) if s else None, works(t, a, b) if t else None))


def summ(v):
    if not v:
        return '—'
    return f"{sum(v):+.2f} J, {sum(1 for x in v if x > 0)}/{len(v)} +, first two {sum(v[:2]):+.2f}, last two {sum(v[-2:]):+.2f}"


lines = ['# 3.6c M3: the twist motor\'s alternating work per half-cycle before the escape, the falls against their matched controls (Big)', '',
         '| fall | the fall | the same wave\'s straight ride, same frames | the same wave\'s tall steer, same frames |', '| --- | --- | --- | --- |']
for rid, m, s, t in rows:
    lines.append(f'| {rid} | {summ(m)} | {summ(s)} | {summ(t)} |')
lines.append('')
for k, name in ((1, 'the fall'), (2, 'straight, same wave'), (3, 'tall steer, same wave')):
    v = [x[k] for x in rows if x[k]]
    lines.append(f"- {name}: {len(v)} rides; total alternating twist work median {median([sum(x) for x in v]):+.3f} J; positive in {sum(1 for x in v if sum(x) > 0)} of {len(v)}; "
                 f"last two half-cycles more than the first two in {sum(1 for x in v if len(x) >= 4 and sum(x[-2:]) > sum(x[:2]))} of {sum(1 for x in v if len(x) >= 4)}.")
text = '\n'.join(lines) + '\n'
print(text)
if md:
    open(md, 'w').write(text)
