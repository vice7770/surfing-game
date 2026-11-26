#!/usr/bin/env python3
"""3.6h's pass line (README §0.5) on a full report's rides, against `baseline-full.json`.

    python3 -I passline.py --base baseline-full.json <report dir>/rides.jsonl [--json out.json]

1. the benchmark's regressions (each ride once, first test failed: lasted, sooner, reserve), with what changed;
2. of the 47 Compress and Crouch steer rides that fall for balance in the baseline, how many still fall for balance
   (no stand counts as still falling); new balance falls among the other 33;
3. over the 80 Compress and Crouch steer rides, the paired mean of course05 and course10 (on - off) over rides having the
   value both ways (and the median, up/down, the rides reaching the time only on or only off); yawPeak beside.
"""
import argparse, json, statistics as st, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from screen import regressions, bal, paired  # noqa: E402

DEEP = ('crouch:left', 'crouch:right', 'compress:left', 'compress:right')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', required=True)
    ap.add_argument('--json')
    ap.add_argument('rides')
    a = ap.parse_args()
    base = {r['id']: r for r in json.load(open(a.base))['rides']}
    now = {}
    for line in open(a.rides):
        if line.strip():
            r = json.loads(line); now[r['id']] = r
    reg = regressions(now, base)
    first = {}
    order = {'lasted': 0, 'sooner': 1, 'reserve': 2}
    for i, k, b, c in sorted(reg, key=lambda x: order[x[1]]):
        first.setdefault(i, (k, b, c))
    deep = [i for i, r in base.items() if r['script'] in DEEP]
    falls0 = [i for i in deep if bal(base[i])]
    still = [i for i in falls0 if i not in now or not now[i]['stood'] or bal(now[i])]
    new = [i for i in deep if i not in falls0 and bal(now.get(i))]
    out = {'regressions': len(first), 'regList': [], 'baseBalance': len(falls0), 'still': len(still), 'stillByGroup': {},
           'new': new, 'course05': paired(now, base, deep, 'course05'), 'course10': paired(now, base, deep, 'course10'),
           'yawPeak': paired(now, base, deep, 'yawPeak'), 'course05World': paired(now, base, deep, 'course05World'),
           'course10World': paired(now, base, deep, 'course10World')}
    for g in ('tw-catch', 'tw-ride', 'big'):
        out['stillByGroup'][g] = [sum(1 for i in falls0 if base[i]['group'] == g), sum(1 for i in still if base[i]['group'] == g)]
    for i, (k, b, c) in sorted(first.items()):
        out['regList'].append({'id': i, 'test': k, 'base': {x: b[x] for x in ('fell', 'fellAt', 'cause', 'lowest')},
                               'now': None if c is None else {x: c[x] for x in ('stood', 'fell', 'fellAt', 'cause', 'lowest')}})
    print(f"1. regressions {out['regressions']}")
    for r in out['regList']:
        print(f"   {r['id']}: {r['test']}; base {r['base']}; now {r['now']}")
    print(f"2. still falling {out['still']} of {out['baseBalance']} (line <= 23); by group (base/still) {out['stillByGroup']}; new balance falls {len(new)} {new}")
    for k in ('course05', 'course10', 'yawPeak'):
        v = out[k]
        print(f"3. {k}: mean {v['mean']} median {v['median']} n {v['n']} up/down {v['up']}/{v['down']} only on/off {v['onlyOn']}/{v['onlyOff']}")
    print(f"   lines: 1 {'pass' if out['regressions'] == 0 else 'FAIL'}; 2 {'pass' if out['still'] <= 23 else 'FAIL'}; 3 {'pass' if (out['course05']['mean'] or 0) >= 0 and (out['course10']['mean'] or 0) >= 0 else 'FAIL'}")
    if a.json:
        json.dump(out, open(a.json, 'w'), indent=1)


if __name__ == '__main__':
    main()
