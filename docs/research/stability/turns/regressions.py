#!/usr/bin/env python3
"""3.6b: every regression of an arm's report run against the baseline, by the benchmark's rule (README of the benchmark
§5: a lasting ride now falls or no longer stands; a balance fall 0.25 s or more sooner; a lowest reserve 0.10 lower), each
with what its frame rows show: the fall time and cause off → on, the lowest reserve, the yaw rate's ringing over the steer
(std over +1.0 to +2.0 s or to the fall, deg/s, world), off → on, and whether the fall came inside the steer.

    python3 regressions.py <baseline.json> <arm report dir> <off raw dir> [--md out.md]
"""
import json, os, statistics, sys
base = {r['id']: r for r in json.load(open(sys.argv[1]))['rides']}
arm_dir, off_dir = sys.argv[2], sys.argv[3]
arm = {r['id']: r for r in (json.loads(l) for l in open(os.path.join(arm_dir, 'rides.jsonl')) if l.strip())}
cache = {}
def frames(d, rid):
    g = rid.split(':')[0]
    if g.startswith('tw'):
        path, key = os.path.join(d, rid.replace(':', '_') + '.jsonl'), None
    else:
        parts = rid.split(':')
        path, key = os.path.join(d, f'{parts[0]}_{parts[1]}.jsonl'), (int(parts[2][1:]), ':'.join(parts[3:]))
    if path not in cache:
        cache[path] = [json.loads(l) for l in open(path) if '"kind":"f"' in l]
    return [f for f in cache[path] if key is None or (f.get('wave') == key[0] and f.get('script') == key[1])]
def ring(d, rid):
    y = [f['yaw'] for f in frames(d, rid) if 'res' in f and 1.0 <= f['tS'] <= 2.0]
    return statistics.pstdev(y) if len(y) > 2 else None
out = []
for k, b in base.items():
    a = arm.get(k)
    if a is None:
        continue
    why = None
    if not b['fell'] and b['stood'] and not b.get('cut') and (a['fell'] or not a['stood']):
        why = 'lasted, now falls' if a['stood'] else 'lasted, no stand'
    elif b['fell'] and a['fell'] and a['cause'] == 'balance' and b['fellAt'] - a['fellAt'] > 0.25:
        why = 'falls sooner'
    elif b['lowest'] is not None and a['lowest'] is not None and b['lowest'] - a['lowest'] > 0.10:
        why = 'lowest reserve'
    if why:
        r0, r1 = ring(off_dir, k), ring(arm_dir, k)
        f = lambda r: f"+{r['fellAt']:.2f} s ({r['cause']})" if r['fell'] else 'lasts'
        rg = lambda x: f'{x:.0f}' if x is not None else '—'
        inside = a['fell'] and a['fellAt'] < 2.0
        out.append((k, why, f(b), f(a), f"{b['lowest']:.3f} → {a['lowest']:.3f}", f'{rg(r0)} → {rg(r1)}', 'yes' if inside else 'no'))
lines = ['| ride | rule | off | on | lowest reserve | yaw ring over the steer (deg/s) | on falls inside the steer |', '| --- | --- | --- | --- | --- | --- | --- |']
lines += [f'| `{x[0]}` | {x[1]} | {x[2]} | {x[3]} | {x[4]} | {x[5]} | {x[6]} |' for x in out]
grew = sum(1 for x in out if x[5] != '— → —' and '—' not in x[5] and float(x[5].split(' → ')[1]) > float(x[5].split(' → ')[0]))
lines.append(f'\n{len(out)} regressions; the ringing grew on {grew}; {sum(1 for x in out if x[6] == "yes")} fall inside the steer.')
t = '\n'.join(lines)
if '--md' in sys.argv:
    open(sys.argv[sys.argv.index('--md') + 1], 'w').write(t + '\n')
print(t)
