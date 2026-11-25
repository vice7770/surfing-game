#!/usr/bin/env python3
"""3.6b amendment 0.11: the steer's shape. Each shaped ride (`~ramp`, `~in`, `~out`) against the step ride of the same id.

    python3 shape.py <shape run dir> <step run dir (the onset run)> [--md out.md]

Per (group, drive, shape): the rides paired; falls before +2.0 s (inside the steer) and in +2.0 to +3.5 s (after the
release), each split balance / other by the benchmark's rule (README of the benchmark §4.1: wave if the take-off's prone
twin is below 3.6 m/s at the stand's sea time + 0.7 s; whitewater if the froth term reaches -0.10 W on a standing frame
from the stand to the fall — the fall stands in for the escape here, an approximation stated in README §2; else
balance); lasting rides; the paired fall time (a lasting ride counts as 5.0 s); the lowest reserve; and the onset's
twin-subtracted course at +0.5 and +1.0 s.
"""
import glob, json, os, statistics as st, sys
from onset import load, metrics, stance_of

shape_dir, step_dir = sys.argv[1], sys.argv[2]
S = load(shape_dir)
P = load(step_dir)
twins = P
ms = metrics(S, twins)
mp = metrics(P, twins)


def prone(d):
    """{group seed wave or tw-catch: twin vW rows by sea time} for the wave label."""
    out = {}
    for path in glob.glob(os.path.join(d, '*.jsonl')):
        name = os.path.basename(path)[:-6]
        if name.startswith('tw-ride'):
            continue
        if name.startswith('tw-catch') and not name.endswith('twin'):
            continue
        for l in open(path):
            r = json.loads(l)
            if r['kind'] == 'tw':
                key = 'tw-catch' if name.startswith('tw') else f"{name.replace('_', ':')}:w{r['wave']}"
                out.setdefault(key, []).append(r)
    return out


TW = prone(step_dir)
stands = {}
for d in (shape_dir, step_dir):
    for path in glob.glob(os.path.join(d, '*.jsonl')):
        name = os.path.basename(path)[:-6]
        for l in open(path):
            r = json.loads(l)
            if r['kind'] == 'summary' and r.get('stand') is not None and r.get('script') != 'twin':
                if name.startswith('tw-'):
                    g, sc = name.split('_', 1)
                    stands[f"{g}:{sc.replace('_', ':')}"] = r
                else:
                    stands[f"{name.replace('_', ':')}:w{r['wave']}:{r['script']}"] = r


def cause(rid, ride):
    if ride['fell'] is None:
        return None
    g = ride['group']
    s = stands.get(rid)
    if g != 'tw-ride' and s is not None:
        key = 'tw-catch' if g == 'tw-catch' else ':'.join(rid.split(':')[:3])
        rows = TW.get(key, [])
        t = s['stand'] + 0.7
        v = next((w['vW'] for w in rows if abs(w['t'] - t) <= 1 / 120 + 1e-6), None)
        if v is None or v < 3.6:
            return 'wave'
    froth = min([f.get('fr', 0) for k, f in ride['f'].items() if 'res' in f and 0 <= k <= ride['fell'] + 1e-9] + [0])
    return 'whitewater' if froth <= -0.10 else 'balance'


def summary(rides, ids):
    rs = [(i, rides[i]) for i in ids]
    inside = [cause(i, r) for i, r in rs if r['fell'] is not None and r['fell'] < 2.0]
    after = [cause(i, r) for i, r in rs if r['fell'] is not None and 2.0 <= r['fell'] < 3.5]
    lasted = sum(1 for _, r in rs if r['fell'] is None)
    low = [min(f['res'] for f in r['f'].values() if 'res' in f) for _, r in rs]
    return inside, after, lasted, low


def fmt(cs):
    b = sum(1 for c in cs if c == 'balance')
    return f'{len(cs)} ({b} bal)'


lines = ['| group | drive | shape | pairs | falls < +2.0 s: step → shape | falls +2.0–3.5 s: step → shape | lasted 5 s: step → shape | fall time, median shape − step (s); later / sooner | lowest reserve, median step → shape | course +0.5 / +1.0 (twin-sub), step → shape |',
         '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |']
for g in ('tw-catch', 'tw-ride', 'med', 'big'):
    for drive in ('crouch', 'compress', 'hisway'):
        for shape in ('ramp', 'in', 'out'):
            ids = sorted(k for k, r in S.items() if r['group'] == g and stance_of(r['script']) == drive and r['script'].endswith('~' + shape))
            pairs = [(k, k.split('~')[0]) for k in ids if k.split('~')[0] in P]
            if not pairs:
                continue
            a = summary(P, [b for _, b in pairs])
            b = summary(S, [k for k, _ in pairs])
            dt = [(S[k]['fell'] if S[k]['fell'] is not None else 5.0) - (P[p]['fell'] if P[p]['fell'] is not None else 5.0) for k, p in pairs]
            later, sooner = sum(1 for x in dt if x > 1e-9), sum(1 for x in dt if x < -1e-9)
            c5 = lambda m, k, key: m.get(k, {}).get(key)
            cs05 = [c5(mp, p, 'sub0.5') for _, p in pairs]; ch05 = [c5(ms, k, 'sub0.5') for k, _ in pairs]
            cs10 = [c5(mp, p, 'sub1.0') for _, p in pairs]; ch10 = [c5(ms, k, 'sub1.0') for k, _ in pairs]
            md = lambda xs: f'{st.median([x for x in xs if x is not None]):.1f}' if any(x is not None for x in xs) else '—'
            lines.append(f'| {g} | {drive} | {shape} | {len(pairs)} | {fmt(a[0])} → {fmt(b[0])} | {fmt(a[1])} → {fmt(b[1])} | {a[2]} → {b[2]} | {st.median(dt):+.2f}; {later} / {sooner} | {st.median(a[3]):.2f} → {st.median(b[3]):.2f} | {md(cs05)} / {md(cs10)} → {md(ch05)} / {md(ch10)} |')
text = '\n'.join(lines)
if '--md' in sys.argv:
    open(sys.argv[sys.argv.index('--md') + 1], 'w').write(text + '\n')
print(text)
