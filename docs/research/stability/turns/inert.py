#!/usr/bin/env python3
"""3.6b's inertness control (README §0.6 item 1).

    python3 inert.py <probe run dir> <baseline raw dir (f2)> <filtered out dir>

1. For every file of the baseline's raw run, the probe's file of the same name, its rows filtered to the benchmark's own
   scripts and kinds: every `stand`, `f`, `tw` and `summary` row must equal the baseline's, in order (key order ignored).
2. Writes the filtered files (plus their `control`, `built`, `weights` and `done` rows) to <filtered out dir>, so the
   benchmark's report can re-read them with --reuse and compare them with baseline-full.json.
"""
import glob, json, os, sys

probe, base, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
KEEP = ('stand', 'f', 'tw', 'summary')
same = diff = 0
for bf in sorted(glob.glob(os.path.join(base, '*.jsonl'))):
    name = os.path.basename(bf)
    if name == 'rides.jsonl':
        continue
    pf = os.path.join(probe, name)
    brows = [json.loads(l) for l in open(bf) if l.strip()]
    scripts = {r['script'] for r in brows if r['kind'] in ('stand', 'summary', 'f') and 'script' in r}
    prows = [json.loads(l) for l in open(pf) if l.strip()] if os.path.exists(pf) else []
    keep = [r for r in prows if r['kind'] != 'o' and (('script' not in r) or r['kind'] == 'control' or r['script'] in scripts)]
    a = [json.dumps(r, sort_keys=True) for r in brows if r['kind'] in KEEP]
    b = [json.dumps(r, sort_keys=True) for r in keep if r['kind'] in KEEP]
    ok = a == b
    same += ok
    diff += not ok
    if not ok:
        n = next((i for i, (x, y) in enumerate(zip(a, b)) if x != y), min(len(a), len(b)))
        print(f'DIFFERS {name}: {len(a)} baseline rows, {len(b)} probe rows, first difference at row {n}')
    with open(os.path.join(out, name), 'w') as fh:
        for r in keep:
            fh.write(json.dumps(r) + '\n')
print(f'{same} files identical in their benchmark rows, {diff} differ')
