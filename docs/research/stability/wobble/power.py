#!/usr/bin/env python3
"""3.6c M2, M3, M8: who feeds the swing. Power into the board's alternating yaw and roll by source, and the rider's joint
work per half-cycle, on the straight rides (or on steered rides over +1.0 s to the escape with --steer).

    python3 -I power.py <run dir> [--md out.md] [--steer] [--rows out.jsonl]

Frames and signs (README §0.1): Ω the board's yaw rate about the world's up (`w.om`, rad/s), p its roll rate about its own
long axis (`w.p`); torques from the closed yaw ledger (`y*`) and the roll ledger (`q*`), N·m, mean over the step. The
twist's reaction on the board about the world's up is `jTw / sH` (the `finish` wrapper's sum); the rest of the rider's
coupling is `yRid` less it. "Alternating" is the signal less its centred 15-frame mean. P_s = mean(τ_s,alt × Ω_alt), Ω at
the step's mean (the frame and the one before averaged), W; + feeds the swing.

The joints (M3), per ride over the window:
- twist, exact: Σ `wAct` (−τ_a θ̇_t h over the substeps), J; its alternating part −Σ τ_a,alt θ̇_t,alt / 60 (frame level);
- twist, Codex's half-cycle estimate: half-cycles between zero crossings of Ω_alt; W = −mean(τ_a) × Δθ_t and the
  alternating −mean(τ_a,alt) × Δθ_t,alt (`twAct`, `twA`), summed over the window's whole half-cycles, J;
- the knees' active power F_spring × ṙest (F_spring = −k(`le` − `lr`), ṙest `lrr`), alternating parts, J;
- the ankle's active power −K(θ − φ − rest) × d(rest)/dt (K 800 N·m/rad; θ `ank`, φ the board roll `o.roll`, rest `aRest`),
  alternating parts, J.
"""
import json, math, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wob import load, centred, median, stood_through

args = sys.argv[1:]
d = args[0]
md = args[args.index('--md') + 1] if '--md' in args else None
rows_out = args[args.index('--rows') + 1] if '--rows' in args else None
STEER = '--steer' in args
A, B = 30, 179
YS = ['yFin', 'yRail', 'yP', 'yB', 'yAm', 'yRad', 'yFr', 'yFro', 'yBed', 'yGy', 'ySuc', 'twist', 'riderRest']
QS = ['qFin', 'qRail', 'qP', 'qB', 'qAm', 'qRad', 'qFr', 'qFro', 'qBed', 'qGy', 'qSuc', 'qRid']
W_KEYS = ['om', 'p', 'yFin', 'yRail', 'yP', 'yB', 'yAm', 'yRad', 'yFr', 'yFro', 'yBed', 'yGy', 'ySuc', 'yRid', 'yTot', 'jTw', 'sH',
          'qFin', 'qRail', 'qP', 'qB', 'qAm', 'qRad', 'qFr', 'qFro', 'qBed', 'qGy', 'qSuc', 'qRid', 'qTot',
          'twAct', 'twA', 'twR', 'wAct', 'wK', 'wC', 'le', 'lr', 'lrr', 'lk', 'ank', 'aRest']
SCRIPTS = ['none:straight', 'crouch:straight', 'compress:straight', 'snap:straight', 'hisway'] if not STEER else None
rides, _ = load(d, w_keys=W_KEYS, o_keys=('roll',), scripts=set(SCRIPTS) if SCRIPTS else None, groups={'big'})


def get(ride, i, k):
    r = ride['w'].get(i)
    if r is None:
        return None
    if k == 'twist':
        return r['jTw'] / r['sH'] if r.get('sH') else 0.0
    if k == 'riderRest':
        tw = r['jTw'] / r['sH'] if r.get('sH') else 0.0
        return r['yRid'] - tw
    return r.get(k)


def alt(ride, k, a, b):
    xs = [get(ride, i, k) for i in range(a - 7, b + 8)]
    if None in xs:
        return None
    return centred(xs)[7:-7]


def analyse(rid, ride, a, b):
    om = [get(ride, i, 'om') for i in range(a - 8, b + 8)]
    if None in om:
        return None
    mid = [(om[i] + om[i - 1]) / 2 for i in range(1, len(om))]  # frames a-7 .. b+7
    om_alt = centred(mid)[7:-7]
    pp = [get(ride, i, 'p') for i in range(a - 8, b + 8)]
    pmid = [(pp[i] + pp[i - 1]) / 2 for i in range(1, len(pp))]
    p_alt = centred(pmid)[7:-7]
    n = b - a + 1
    out = {'id': rid, 'script': ride['script'], 'n': n}
    for k in YS + ['yTot']:
        t = alt(ride, k, a, b)
        out['P_' + k] = None if t is None else sum(x * y for x, y in zip(t, om_alt)) / n
    for k in QS + ['qTot']:
        t = alt(ride, k, a, b)
        out['Q_' + k] = None if t is None else sum(x * y for x, y in zip(t, p_alt)) / n
    # the twist joint
    out['W_twist_exact'] = sum(ride['w'][i]['wAct'] for i in range(a, b + 1))
    out['W_twist_spring'] = sum(ride['w'][i]['wK'] for i in range(a, b + 1))
    out['W_twist_damper'] = sum(ride['w'][i]['wC'] for i in range(a, b + 1))
    ta, tr = alt(ride, 'twAct', a, b), alt(ride, 'twR', a, b)
    out['W_twist_alt'] = -sum(x * y for x, y in zip(ta, tr)) / 60
    # half-cycles between zero crossings of Ω_alt
    zs = [i for i in range(1, n) if (om_alt[i - 1] < 0 <= om_alt[i]) or (om_alt[i - 1] >= 0 > om_alt[i])]
    th = [get(ride, i, 'twA') for i in range(a, b + 1)]
    tau = [get(ride, i, 'twAct') for i in range(a, b + 1)]
    th_alt = alt(ride, 'twA', a, b)
    hc, hca = [], []
    for z0, z1 in zip(zs, zs[1:]):
        m = sum(tau[z0:z1 + 1]) / (z1 - z0 + 1)
        ma = sum(ta[z0:z1 + 1]) / (z1 - z0 + 1)
        hc.append(-m * (th[z1] - th[z0]))
        hca.append(-ma * (th_alt[z1] - th_alt[z0]))
    out['hc'] = len(hc)
    out['W_hc'] = sum(hc)
    out['W_hc_alt'] = sum(hca)
    out['hc_pos'] = sum(1 for x in hca if x > 0)
    out['hc_series'] = [round(x, 4) for x in hca]
    # the knees: F_spring × ṙest
    fs = [-ride['w'][i]['lk'] * (ride['w'][i]['le'] - ride['w'][i]['lr']) for i in range(a - 7, b + 8)]
    rr = [ride['w'][i]['lrr'] for i in range(a - 7, b + 8)]
    fa, ra = centred(fs)[7:-7], centred(rr)[7:-7]
    out['W_knee'] = sum(f * r for f, r in zip(fs[7:-7], rr[7:-7])) / 60
    out['W_knee_alt'] = sum(f * r for f, r in zip(fa, ra)) / 60
    # the ankle: −K(θ − φ − rest) × d(rest)/dt
    def ank(i):
        o = ride['o'].get(i)
        w = ride['w'].get(i)
        return 800 * (w['ank'] - math.radians(o['roll']) - w['aRest']), w['aRest']
    vals = [ank(i) for i in range(a - 8, b + 8)]
    spring = [-v[0] for v in vals[1:]]
    rest_rate = [(vals[i][1] - vals[i - 1][1]) * 60 for i in range(1, len(vals))]
    sa, rra = centred(spring)[7:-7], centred(rest_rate)[7:-7]
    out['W_ankle'] = sum(f * r for f, r in zip(spring[7:-7], rest_rate[7:-7])) / 60
    out['W_ankle_alt'] = sum(f * r for f, r in zip(sa, rra)) / 60
    # the swing's own size
    out['amp'] = math.degrees(math.sqrt(sum(x * x for x in om_alt) / n))
    out['amp_roll'] = math.degrees(math.sqrt(sum(x * x for x in p_alt) / n))
    return out


res = []
for rid, ride in sorted(rides.items()):
    if STEER:
        if ride['script'].endswith('straight') or ride['script'] in ('hisway', 'twin') or ride['fell'] is None or ride['cause'] != 'balance':
            continue
        if not (1.0 < ride['escape'] < 2.0):
            continue
        a, b = 60, round(ride['escape'] * 60) - 8
        if b - a < 12:
            continue
    else:
        if not stood_through(ride, (B + 1) / 60):
            continue
        a, b = A, B
    try:
        r = analyse(rid, ride, a, b)
    except (KeyError, TypeError):
        r = None
    if r:
        res.append(r)

if rows_out:
    with open(rows_out, 'w') as f:
        for r in res:
            f.write(json.dumps(r) + '\n')
groups = {}
for r in res:
    groups.setdefault(r['script'] if not STEER else r['script'].split(':')[0], []).append(r)
lines = [f"# 3.6c power into the swing by source ({'steered balance falls, +1.0 s to the escape' if STEER else 'straight rides, tS 0.5-3.0 s'}), Canyon Big", '',
         'Medians over rides (rides with the term > 0 / all). P (yaw) and Q (roll) in W; + feeds the swing. Works in J over the window.', '']
order = ['none:straight', 'crouch:straight', 'compress:straight', 'snap:straight', 'hisway'] if not STEER else sorted(groups)
head = '| term | ' + ' | '.join(f'{g} ({len(groups.get(g, []))})' for g in order) + ' |'
lines += [head, '| --- |' + ' --- |' * len(order)]


def row(name, key):
    cells = []
    for g in order:
        v = [r[key] for r in groups.get(g, []) if r.get(key) is not None]
        cells.append('—' if not v else f'{median(v):+.3f} ({sum(1 for x in v if x > 0)}/{len(v)})')
    lines.append(f'| {name} | ' + ' | '.join(cells) + ' |')


row('swing amplitude, yaw (deg/s)', 'amp')
row('swing amplitude, roll (deg/s)', 'amp_roll')
for k in YS + ['yTot']:
    row(f'P yaw {k}', 'P_' + k)
for k in QS + ['qTot']:
    row(f'Q roll {k}', 'Q_' + k)
for k in ['W_twist_exact', 'W_twist_spring', 'W_twist_damper', 'W_twist_alt', 'W_hc', 'W_hc_alt', 'hc', 'hc_pos', 'W_knee', 'W_knee_alt', 'W_ankle', 'W_ankle_alt']:
    row(k, k)
out = '\n'.join(lines) + '\n'
print(out)
if md:
    open(md, 'w').write(out)
