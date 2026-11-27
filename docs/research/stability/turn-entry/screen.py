#!/usr/bin/env python3
"""3.6i's screening reader (README §0.5). Written and committed before any screening number was read.

    python3 -I screen.py --base <baseline-full.json> --off-big <dir> --off-tw <dir> NAME=BIGDIR[,TWDIR] ...

Each dir holds the benchmark report's rides.jsonl (`--reuse` measurement). The bench is the 80 Compress and Crouch steer
rides (Big seeds 1-3 and the test wave); `hisway` and `release0` are Big's `hisway:left|right` and `release0:left|right`.
Balance falls are over the whole ride (the benchmark's cause rule); during the steer = fell in [1.0, 2.0) s, after >= 2.0.
Turns: course05 / course10 paired against switch off over the 80, rides with the value both ways. Regressions: the
benchmark's rule (scripts/stability-report.ts `compare`) against the baseline over the bench rides the run carries,
counted per ride. The swing: 3.6h's measure (std of the board's world yaw rate about its centred 15-frame mean over tS
0.5-3.0 s) on compress:straight and crouch:straight rides standing through +3.0 s both ways; the paired median ratio.
"""
import argparse, glob, json, os, statistics as st

ap = argparse.ArgumentParser()
ap.add_argument('--base', required=True)
ap.add_argument('--off-big', required=True)
ap.add_argument('--off-tw', required=True)
ap.add_argument('--json')
ap.add_argument('configs', nargs='+')
a = ap.parse_args()
DEEP = ['compress:left', 'compress:right', 'crouch:left', 'crouch:right']
LATER, DROP = 0.25, 0.10


def load(big, tw):
    out = {}
    for d in (big, tw):
        if d and os.path.exists(os.path.join(d, 'rides.jsonl')):
            for line in open(os.path.join(d, 'rides.jsonl')):
                r = json.loads(line)
                if (d == big and r['group'] == 'big') or (d == tw and r['group'] in ('tw-catch', 'tw-ride')):
                    out[r['id']] = r
    return out


def place(r):
    if r['script'] in DEEP and r['group'] in ('big', 'tw-catch', 'tw-ride'): return 'bench'
    if r['group'] == 'big' and r['script'] in ('hisway:left', 'hisway:right'): return 'hisway'
    if r['group'] == 'big' and r['script'] in ('release0:left', 'release0:right'): return 'release0'
    return None


def bal(r):
    return bool(r and r['stood'] and r['fell'] and r['cause'] == 'balance')


def counts(rides, which):
    sel = [r for r in rides.values() if place(r) == which]
    falls = [r for r in sel if bal(r)]
    return {'n': len(sel), 'falls': len(falls), 'during': sum(1 for r in falls if 1.0 <= r['fellAt'] < 2.0),
            'after': sum(1 for r in falls if r['fellAt'] >= 2.0), 'before': sum(1 for r in falls if r['fellAt'] < 1.0),
            'noStand': sum(1 for r in sel if not r['stood'])}


def regressions(now, base):
    out = []
    for b in base:
        if place(b) != 'bench' or b['id'] not in now: continue
        c = now[b['id']]
        why = []
        lasted = b['stood'] and not b['fell'] and not b['cut']
        if lasted and (not c['stood'] or c['fell']): why.append('lasted')
        if b['lowest'] is not None and c['lowest'] is not None and c['lowest'] < b['lowest'] - DROP: why.append(f"reserve {b['lowest']:.3f}->{c['lowest']:.3f}")
        if b['fell'] and c['fell'] and c['fellAt'] < b['fellAt'] - LATER and c['cause'] == 'balance': why.append(f"sooner {b['fellAt']:.2f}->{c['fellAt']:.2f}")
        if why: out.append((b['id'], why))
    return out


def paired(now, off, key):
    d = [now[i][key] - off[i][key] for i in off if place(off[i]) == 'bench' and i in now and off[i][key] is not None and now[i][key] is not None]
    only_on = sum(1 for i in off if place(off[i]) == 'bench' and i in now and off[i][key] is None and now[i][key] is not None)
    only_off = sum(1 for i in off if place(off[i]) == 'bench' and i in now and off[i][key] is not None and now[i][key] is None)
    return {'mean': st.mean(d) if d else None, 'median': st.median(d) if d else None, 'n': len(d), 'up': sum(1 for x in d if x > 0),
            'down': sum(1 for x in d if x < 0), 'onlyOn': only_on, 'onlyOff': only_off}


def swing(big):
    out = {}
    for p in glob.glob(os.path.join(big, 'big_s*.jsonl')):
        seed = os.path.basename(p)[5:-6]
        yaws = {}
        for line in open(p):
            if not line.startswith('{"kind":"f"'): continue
            if '"script":"compress:straight"' not in line and '"script":"crouch:straight"' not in line: continue
            o = json.loads(line)
            if 'res' not in o: continue
            yaws.setdefault(f"big:s{seed}:w{o['wave']}:{o['script']}", []).append((o['tS'], o['yaw']))
        for k, v in yaws.items():
            v.sort()
            if not v or v[-1][0] < 3.0: continue
            ys = [y for _, y in v]
            res = []
            for i, (t, y) in enumerate(v):
                if 0.5 <= t <= 3.0 and 7 <= i < len(v) - 7:
                    res.append(y - st.mean(ys[i - 7:i + 8]))
            if len(res) > 10: out[k] = st.pstdev(res)
    return out


base = json.load(open(a.base))['rides']
off = load(a.off_big, a.off_tw)
off_swing = swing(a.off_big)
rows = []
for spec in ['off=' + a.off_big + ',' + a.off_tw] + a.configs:
    name, _, dirs = spec.partition('=')
    big, _, tw = dirs.partition(',')
    now = load(big, tw or None)
    row = {'name': name, **{p: counts(now, p) for p in ('bench', 'hisway', 'release0')}}
    basefall = {b['id'] for b in base if place(b) == 'bench' and bal(b)}
    row['benchStill'] = sum(1 for i in basefall if bal(now.get(i)))
    row['benchNew'] = sum(1 for r in now.values() if place(r) == 'bench' and bal(r) and r['id'] not in basefall)
    row['sum'] = row['bench']['falls'] + row['hisway']['falls'] + row['release0']['falls']
    row['c05'] = paired(now, off, 'course05')
    row['c10'] = paired(now, off, 'course10')
    yp = [now[i]['yawPeak'] - off[i]['yawPeak'] for i in off if place(off[i]) == 'bench' and i in now and off[i]['yawPeak'] is not None and now[i]['yawPeak'] is not None]
    row['yawPeak'] = st.mean(yp) if yp else None
    reg = regressions(now, base)
    row['regressions'] = len(reg)
    row['regList'] = reg
    row['carried'] = sum(1 for b in base if place(b) == 'bench' and b['id'] in now)
    sw = swing(big) if os.path.exists(big) else {}
    ratios = {k[-17:]: [] for k in ('compress:straight', 'crouch:straight')}
    for k, v in sw.items():
        if k in off_swing and off_swing[k] > 0:
            ratios['compress:straight' if k.endswith('compress:straight') else 'crouch:straight'].append(v / off_swing[k])
    row['swing'] = {k: (st.median(v) if v else None, sum(1 for x in v if x < 1), len(v)) for k, v in ratios.items()}
    row['helps'] = row['sum'] < 88 and (row['c05']['mean'] or 0) >= 0 and (row['c10']['mean'] or 0) >= 0
    row['finalist'] = (row['bench']['falls'] <= 23 and row['hisway']['falls'] <= 9 and row['release0']['falls'] <= 11 and
                       (row['c05']['mean'] or -1) >= 0 and (row['c10']['mean'] or -1) >= 0 and row['regressions'] <= 3)
    rows.append(row)


def f(x, n=2):
    return '-' if x is None else f'{x:+.{n}f}'


print('| configuration | bench balance falls of 80 (during / after / before; still of 47; new) | hisway of 36 (during / after) | release0 of 36 (during / after) | sum (off 88) | course +0.5 s mean (n; up/down) | course +1.0 s mean (n; up/down; only on/off) | peak yaw | regressions (bench rides carried) | swing Compress / tuck (down of n) | helps / finalist |')
print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for r in rows:
    b, h, q = r['bench'], r['hisway'], r['release0']
    sw = r['swing']
    print(f"| {r['name']} | {b['falls']} ({b['during']} / {b['after']} / {b['before']}; {r['benchStill']}; {r['benchNew']}) | {h['falls']} ({h['during']} / {h['after']}) | {q['falls']} ({q['during']} / {q['after']}) | {r['sum']} | "
          f"{f(r['c05']['mean'])}° ({r['c05']['n']}; {r['c05']['up']}/{r['c05']['down']}) | {f(r['c10']['mean'])}° ({r['c10']['n']}; {r['c10']['up']}/{r['c10']['down']}; {r['c10']['onlyOn']}/{r['c10']['onlyOff']}) | {f(r['yawPeak'], 1)} | "
          f"{r['regressions']} ({r['carried']}) | {f(sw['compress:straight'][0])} ({sw['compress:straight'][1]} of {sw['compress:straight'][2]}) / {f(sw['crouch:straight'][0])} ({sw['crouch:straight'][1]} of {sw['crouch:straight'][2]}) | {'yes' if r['helps'] else 'no'} / {'yes' if r['finalist'] else 'no'} |")
for r in rows:
    if r['regList']: print(f"{r['name']} regressions: " + '; '.join(f"{i} ({', '.join(w)})" for i, w in r['regList']))
if a.json: json.dump(rows, open(a.json, 'w'), indent=1)
