#!/usr/bin/env python3
"""3.6b: a report run's ride lines against a committed baseline, every field (README §0.6).

    python3 same.py <report out dir>/rides.jsonl <baseline-quick.json|baseline-full.json> [--prefix tw-]
"""
import json, sys
rides = [json.loads(l) for l in open(sys.argv[1]) if l.strip()]
base = {r['id']: r for r in json.load(open(sys.argv[2]))['rides']}
prefix = sys.argv[sys.argv.index('--prefix') + 1] if '--prefix' in sys.argv else ''
rides = [r for r in rides if r['id'].startswith(prefix)]
same = [r['id'] for r in rides if base.get(r['id']) == r]
diff = [r['id'] for r in rides if r['id'] in base and base[r['id']] != r]
only = [r['id'] for r in rides if r['id'] not in base]
missing = [k for k in base if k.startswith(prefix) and k not in {r['id'] for r in rides}]
print(f'{len(same)} of {len(base)} baseline ride lines identical; {len(diff)} differ; {len(only)} only in the run; {len(missing)} missing')
for k in diff[:20]:
    a, b = base[k], next(r for r in rides if r['id'] == k)
    print('  differs:', k, {f: (a.get(f), b.get(f)) for f in set(a) | set(b) if a.get(f) != b.get(f)})
