#!/usr/bin/env python3
"""3.6i stage 1 (README §0.2): which way the body goes over on the falling deep turns. Written before any of its data was read.

    python3 -I side.py --big <probe run dir with big_s1..3.jsonl and rides.jsonl> --tw <dir with tw-*.jsonl and rides.jsonl> [--json out.json]

For every ride that falls for balance (the benchmark's cause rule, from the report's rides.jsonl) among
  bench   : the benchmark's 80 Compress and Crouch steer rides (big compress|crouch:left|right on seeds 1-3, tw-catch, tw-ride),
  hisway  : hisway:left|right on Big seeds 1-3,
  release0: release0:left|right on Big seeds 1-3,
it reads the capture state (the probe's `w` row, humanBalance's CaptureState) on the first beyond-recovery frame (`bey` = 1)
at or after the final escape's onset (the report's `escapeAt`), or, with none, the last `w` row before the fall ("no beyond
frame"), and classes the side:
  nose/tail : the margin's nearest edge (`cT`) is the nose or the tail;
  into      : across, on the turn's inside: sign(cA) == sign(steer) (cA board +x; steer +1 the board's left, its +x rail);
  outward   : across, on the outside.
The convention is checked, not assumed: the felt vertical leans to the inside in a turn (CaptureState.feltAcross), so the
median of sign(cFA) * steer over the rides' w rows at +0.3 to +0.5 s into the steer must be +1; if it is -1, the
labels into / outward are swapped (and the output says so).
During the steer: the fall at or after the steer's onset (the first frame with st != 0) and before onset + 1.0 s.
The rule (§0.2): the side with more of the bench falls during the steer sets the order (into: E1 first; outward: E2 first);
a tie goes to the pooled count of all three places; if more than half of the bench falls during the steer go over the
nose or tail, stop.
"""
import argparse, glob, json, os, statistics as st
from collections import Counter, defaultdict

ap = argparse.ArgumentParser()
ap.add_argument('--big', required=True)
ap.add_argument('--tw', required=True)
ap.add_argument('--json')
a = ap.parse_args()

DEEP = ['compress:left', 'compress:right', 'crouch:left', 'crouch:right']
PLACES = {'bench': DEEP, 'hisway': ['hisway:left', 'hisway:right'], 'release0': ['release0:left', 'release0:right']}


def place_of(r):
    if r['group'] in ('tw-catch', 'tw-ride'):
        return 'bench' if r['script'] in DEEP else None
    if r['group'] != 'big':
        return None
    for p, ss in PLACES.items():
        if r['script'] in ss:
            return p
    return None


rides = {}
for d in (a.big, a.tw):
    for line in open(os.path.join(d, 'rides.jsonl')):
        r = json.loads(line)
        if place_of(r):
            rides[r['id']] = r

rows = defaultdict(lambda: {'f': [], 'o': [], 'w': []})
for p in sorted(glob.glob(os.path.join(a.big, 'big_s*.jsonl'))):
    seed = os.path.basename(p)[5:-6]
    for line in open(p):
        k = line[9:10]
        if not line.startswith('{"kind":"') or k not in 'fow' or line[10] != '"':
            continue
        o = json.loads(line)
        rid = f"big:s{seed}:w{o['wave']}:{o['script']}"
        if rid in rides:
            rows[rid][k].append(o)
for p in sorted(glob.glob(os.path.join(a.tw, 'tw-*.jsonl'))):
    base = os.path.basename(p)[:-6]
    g, rest = base.split('_', 1)
    rid = f"{g}:{rest.replace('_', ':')}"
    if rid not in rides:
        continue
    for line in open(p):
        k = line[9:10]
        if not line.startswith('{"kind":"') or k not in 'fow' or line[10] != '"':
            continue
        rows[rid][k].append(json.loads(line))


def steer_of(s):
    return 1 if s.endswith(':left') else -1 if s.endswith(':right') else 0


def nearest(lst, t):
    best = None
    for o in lst:
        if best is None or abs(o['tS'] - t) < abs(best['tS'] - t):
            best = o
    return best if best is not None and abs(best['tS'] - t) < 0.02 else None


# The convention check.
checks = []
for rid, r in rides.items():
    R = rows[rid]
    on = next((o['tS'] for o in sorted(R['f'], key=lambda o: o['tS']) if o.get('st', 0) != 0), None)
    if on is None:
        continue
    s = steer_of(r['script'])
    for w in R['w']:
        if on + 0.3 <= w['tS'] <= on + 0.5 and w.get('cFA') is not None and w['cFA'] != 0:
            checks.append((1 if w['cFA'] > 0 else -1) * s)
conv = st.median(checks) if checks else 0
flip = conv < 0

out = []
for rid, r in sorted(rides.items()):
    if not (r['fell'] and r['cause'] == 'balance'):
        continue
    R = rows[rid]
    f = sorted(R['f'], key=lambda o: o['tS'])
    on = next((o['tS'] for o in f if o.get('st', 0) != 0), None)
    s = steer_of(r['script'])
    fell, esc = r['fellAt'], r['escapeAt']
    w = sorted(R['w'], key=lambda o: o['tS'])
    beyond = next((o for o in w if o['tS'] >= esc - 1e-9 and o['tS'] <= fell + 1e-9 and o.get('bey') == 1), None)
    frame = beyond or next((o for o in reversed(w) if o['tS'] < fell + 1e-9), None)
    if frame is None:
        side = 'no frame'
    elif frame.get('cT') in ('nose', 'tail'):
        side = 'nose/tail'
    else:
        inside = (1 if frame['cA'] > 0 else -1) * s > 0
        if flip:
            inside = not inside
        side = 'into' if inside else 'outward'
    when = 'no steer' if on is None else 'before' if fell < on else 'during' if fell < on + 1.0 else 'after'
    rec = {'id': rid, 'place': place_of(r), 'stance': r['script'].split(':')[0], 'group': r['group'], 'fellAt': fell, 'escapeAt': esc,
           'onset': on, 'when': when, 'side': side, 'beyond': beyond is not None, 'frameAt': frame['tS'] if frame else None}
    if frame is not None:
        # Every across quantity signed toward the turn's inside (x steer; and x -1 if the convention flipped).
        g = s * (-1 if flip else 1)
        o = nearest(R['o'], frame['tS'])
        fr = nearest(f, frame['tS'])
        f0 = nearest(f, on) if on is not None else None
        half = frame.get('cHalf') or 0
        reach = frame.get('cR') or 0
        rec.update({
            'cA': frame['cA'] * g, 'cSA': frame['cSA'] * g, 'cPA': frame['cPA'] * g, 'cOA': frame['cOA'] * g, 'cFA': frame['cFA'] * g,
            'headroom': half + reach - abs(frame['cA']), 'half': half, 'reach': reach, 'cT': frame.get('cT'),
        })
        if o:
            rec.update({'ask': o['ask'] * s, 'bank': o['bank'] * s, 'roll': o['roll'] * s, 'rail': o['rail'] * s, 'aRaw': o['aRaw'] * s, 'tw': o['tw'] * s})
        if fr and f0:
            rec.update({'yaw': fr['yaw'] * s, 'course': ((fr['crs'] - f0['crs'] + 180) % 360 - 180) * s})
    out.append(rec)

print(f'convention check: median sign(feltAcross) x steer at +0.3-0.5 s into the steer = {conv:+.0f} over {len(checks)} frames'
      + (' -> labels swapped' if flip else ' (as assumed)'))
for place in PLACES:
    sel = [x for x in out if x['place'] == place]
    print(f'\n{place}: {len(sel)} balance falls')
    for stance in ('compress', 'crouch'):
        for when in ('during', 'after', 'before'):
            c = Counter(x['side'] for x in sel if x['stance'] == stance and x['when'] == when)
            if c:
                print(f'  {stance:8s} {when:6s}: {dict(c)}  (no beyond frame: {sum(1 for x in sel if x["stance"] == stance and x["when"] == when and not x["beyond"])})')
    for when in ('during', 'after'):
        c = Counter(x['side'] for x in sel if x['when'] == when)
        print(f'  all      {when:6s}: {dict(c)}')

bench = Counter(x['side'] for x in out if x['place'] == 'bench' and x['when'] == 'during')
pooled = Counter(x['side'] for x in out if x['when'] == 'during')
n = sum(bench.values())
if n and bench['nose/tail'] > n / 2:
    order = 'STOP: most go over the nose or tail'
elif bench['into'] != bench['outward']:
    order = 'E1 first (into the turn)' if bench['into'] > bench['outward'] else 'E2 first (thrown outward)'
elif pooled['into'] != pooled['outward']:
    order = ('E1 first (into the turn)' if pooled['into'] > pooled['outward'] else 'E2 first (thrown outward)') + ', by the pooled count (bench tied)'
else:
    order = 'tied in both counts: not settled by the rule'
print(f'\nthe rule: bench during the steer {dict(bench)}; pooled {dict(pooled)} -> {order}')


def med(key, sel):
    v = [x[key] for x in sel if x.get(key) is not None]
    return f'{st.median(v):+.3f}' if v else '-'


print('\nmedians on the classing frame (toward the inside of the turn +; m, m/s, deg, deg/s, rad, N m):')
for side in ('into', 'outward', 'nose/tail'):
    sel = [x for x in out if x['side'] == side and x['when'] == 'during']
    if sel:
        print(f'  {side} (during, {len(sel)}): ' + ', '.join(f'{k} {med(k, sel)}' for k in ('cA', 'cPA', 'cSA', 'headroom', 'ask', 'bank', 'roll', 'rail', 'yaw', 'course', 'aRaw', 'tw')))
if a.json:
    json.dump({'convention': conv, 'flip': flip, 'falls': out, 'order': order}, open(a.json, 'w'), indent=1)
