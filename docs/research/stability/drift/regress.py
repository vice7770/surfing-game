#!/usr/bin/env python3
"""3.6h: every regression of a full report, ride by ride, from the frame rows of both runs (README §3).

    python3 -I regress.py --base-run <baseline raw dir> --run <report dir> --base baseline-full.json

Per regressing ride: the test it fails; the fall (time, cause) and lowest reserve both ways, with the time and the
limiting term (`lim`) of the lowest; the swing over the steer (std of the yaw rate about its centred 0.25 s mean,
+1.0 s to the release or the end of standing, world deg/s) both ways; the course at +0.5 / +1.0 s.
"""
import argparse, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from screen import regressions  # noqa: E402


def load(d, ride):
    g = ride['group']
    if g in ('big', 'med'):
        p = os.path.join(d, f"{g}_s{ride['seed']}.jsonl")
        key = lambda r: r.get('wave') == ride['wave'] and r.get('script') == ride['script']
    else:
        p = os.path.join(d, f"{g}_{ride['script'].replace(':', '_')}.jsonl")
        key = lambda r: True
    out = []
    with open(p) as f:
        for line in f:
            if '"kind":"f"' in line:
                r = json.loads(line)
                if key(r) and isinstance(r.get('res'), (int, float)):
                    out.append(r)
    return out


def ring(fr, t0, t1, half=7):
    ys = [r['yaw'] for r in fr]
    res = []
    for i, r in enumerate(fr):
        if r['tS'] < t0 or r['tS'] > t1 or i < half or i + half >= len(fr):
            continue
        res.append(ys[i] - sum(ys[i - half:i + half + 1]) / (2 * half + 1))
    if len(res) < 3:
        return None
    m = sum(res) / len(res)
    return (sum((x - m) ** 2 for x in res) / len(res)) ** 0.5


def low(fr):
    if not fr:
        return None
    r = min(fr, key=lambda r: r['res'])
    return {'at': r['tS'], 'lim': r.get('lim')}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base-run', required=True)
    ap.add_argument('--run', required=True)
    ap.add_argument('--base', required=True)
    ap.add_argument('--json')
    a = ap.parse_args()
    base = {r['id']: r for r in json.load(open(a.base))['rides']}
    now = {}
    for line in open(os.path.join(a.run, 'rides.jsonl')):
        if line.strip():
            r = json.loads(line); now[r['id']] = r
    first = {}
    for i, k, b, c in sorted(regressions(now, base), key=lambda x: {'lasted': 0, 'sooner': 1, 'reserve': 2}[x[1]]):
        first.setdefault(i, (k, b, c))
    rows = []
    for i, (k, b, c) in sorted(first.items()):
        fb, fc = load(a.base_run, b), (load(a.run, c) if c else [])
        steer = b['script'].endswith(':left') or b['script'].endswith(':right')
        t1 = lambda fr: min(2.0, fr[-1]['tS']) if fr else 2.0
        row = {'id': i, 'test': k,
               'base': {'fellAt': b['fellAt'], 'cause': b['cause'], 'lowest': b['lowest'], 'low': low(fb), 'escape': b['escapeAt'],
                        'swing': round(ring(fb, 1.0 if steer else 0.5, t1(fb) if steer else 3.0) or 0, 1), 'c05': b['course05'], 'c10': b['course10']},
               'now': None if c is None else {'fellAt': c['fellAt'], 'cause': c['cause'], 'lowest': c['lowest'], 'low': low(fc), 'escape': c['escapeAt'],
                                               'swing': round(ring(fc, 1.0 if steer else 0.5, t1(fc) if steer else 3.0) or 0, 1), 'c05': c['course05'], 'c10': c['course10']}}
        rows.append(row)
        print(json.dumps(row))
    if a.json:
        json.dump(rows, open(a.json, 'w'), indent=1)


if __name__ == '__main__':
    main()
