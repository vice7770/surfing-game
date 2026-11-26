#!/usr/bin/env python3
"""3.6d control 1 (README §0.3, §0.7): this round's probe at identity reproduces 3.6c's knobs-off straight rides.

    python3 -I ident.py <this round's file> <3.6c's file> [scripts, comma-separated]

Every `f` row of the named scripts (default: 3.6c's five straight scripts), in order, as JSON with sorted keys, must be
identical; also the `stand` and `summary` rows of those scripts.
"""
import json, sys

mine, ref = sys.argv[1:3]
scripts = set((sys.argv[3] if len(sys.argv) > 3 else 'none:straight,crouch:straight,compress:straight,snap:straight,hisway').split(','))


def rows(path, kinds):
    out = {k: [] for k in kinds}
    for line in open(path):
        k = line[9:line.index('"', 9)]
        if k not in kinds:
            continue
        r = json.loads(line)
        if r.get('script') in scripts:
            out[k].append(json.dumps(r, sort_keys=True))
    return out


kinds = ('f', 'stand', 'summary')
a, b = rows(mine, kinds), rows(ref, kinds)
for k in kinds:
    same = a[k] == b[k]
    first = next((i for i, (x, y) in enumerate(zip(a[k], b[k])) if x != y), None)
    print(f"{k}: {len(a[k])} rows here, {len(b[k])} in the reference; identical: {same}" + ('' if same else f'; first difference at row {first}'))
