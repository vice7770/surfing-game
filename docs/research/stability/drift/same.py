#!/usr/bin/env python3
"""3.6h's switch-off control (README §0.7): a run's ride lines against a baseline's, every field, as sorted-key JSON.

    python3 -I same.py <rides.jsonl> <baseline.json> [--groups tw-catch,tw-ride]
"""
import argparse, json

ap = argparse.ArgumentParser()
ap.add_argument('rides'); ap.add_argument('baseline'); ap.add_argument('--groups')
a = ap.parse_args()
groups = set(a.groups.split(',')) if a.groups else None
now = {}
for line in open(a.rides):
    if line.strip():
        r = json.loads(line)
        if groups is None or r['group'] in groups:
            now[r['id']] = r
base = {r['id']: r for r in json.load(open(a.baseline))['rides'] if groups is None or r['group'] in groups}
same = sum(1 for i, b in base.items() if i in now and json.dumps(now[i], sort_keys=True) == json.dumps(b, sort_keys=True))
diff = [i for i in base if i not in now or json.dumps(now[i], sort_keys=True) != json.dumps(base[i], sort_keys=True)]
extra = [i for i in now if i not in base]
print(f'{same} of {len(base)} ride lines identical; differing or missing {diff[:10]}; only in the run {extra[:10]}')
