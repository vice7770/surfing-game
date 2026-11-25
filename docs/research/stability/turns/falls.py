#!/usr/bin/env python3
"""3.6b: a report run's falls per group and drive against another run's (rides.jsonl), by cause and by when.

    python3 falls.py <baseline.json or rides.jsonl> <arm rides.jsonl> [--md out.md]
"""
import json, sys
def rides(p):
    if p.endswith('.json'):
        return {r['id']: r for r in json.load(open(p))['rides']}
    return {r['id']: r for r in (json.loads(l) for l in open(p) if l.strip())}
A, B = rides(sys.argv[1]), rides(sys.argv[2])
drive = lambda r: r['script'] if r['script'] in ('hisway',) else r['script'].split(':')[0] + (' straight' if r['script'].endswith('straight') else ' steer')
lines = ['| group | drive | rides | lasted 5 s: off → on | balance falls: off → on | wave / whitewater: off → on | falls before +2.0 s: off → on | lowest reserve, median of lasting rides: off → on |', '| --- | --- | --- | --- | --- | --- | --- | --- |']
cells = sorted({(r['group'], drive(r)) for r in A.values()}, key=lambda x: (['tw-catch', 'tw-ride', 'med', 'big'].index(x[0]), x[1]))
for g, d in cells:
    ids = [k for k, r in A.items() if r['group'] == g and drive(r) == d and k in B]
    def stats(R):
        rs = [R[k] for k in ids]
        last = [r for r in rs if r['stood'] and not r['fell'] and not r.get('cut')]
        low = sorted(r['lowest'] for r in last if r['lowest'] is not None)
        return (len(last), sum(1 for r in rs if r['cause'] == 'balance'), sum(1 for r in rs if r['cause'] == 'wave'), sum(1 for r in rs if r['cause'] == 'whitewater'),
                sum(1 for r in rs if r['fell'] and r['fellAt'] < 2.0), f'{low[len(low) // 2]:.2f}' if low else '—')
    a, b = stats(A), stats(B)
    lines.append(f'| {g} | {d} | {len(ids)} | {a[0]} → {b[0]} | {a[1]} → {b[1]} | {a[2]} / {a[3]} → {b[2]} / {b[3]} | {a[4]} → {b[4]} | {a[5]} → {b[5]} |')
t = '\n'.join(lines)
if '--md' in sys.argv:
    open(sys.argv[sys.argv.index('--md') + 1], 'w').write(t + '\n')
print(t)
