"""Step 3.5v reader: the sideways falls (sideways-falls.md). Reads the probe's rows (`sideways-falls.ts`), one file per
process, named `o-s<seed>-<on|off>-<arm>.jsonl[.gz]` (organic, both scripts) and `c-<script>-<on|off>-<arm>-<run>.jsonl[.gz]`
(catch), arm in base | pf (plantFloor=4.5) | ft (faceTrim=on) | both.

    python3 sideways-falls.py <data dir> [stands|pairs|ledger|diverge|all]

Every angle is in degrees and in the board's frame (+ toward the board's +x, its left rail) unless named otherwise;
times are seconds after the stand (the first `standing` frame); speeds are horizontal |v_board - flow| (m/s, world).
"""
import gzip
import json
import math
import os
import re
import statistics as st
import sys

DT = 1 / 60
HOLD = 3.0


def load(path):
    op = gzip.open if path.endswith('.gz') else open
    with op(path, 'rt') as fh:
        return [json.loads(line) for line in fh if line.strip()]


def stands_of(directory):
    """Every rider that popped, keyed (mode, cueLater, arm, seedOrRun, script, wave)."""
    out = {}
    for name in sorted(os.listdir(directory)):
        m = re.match(r'o-s(\d)-(on|off)-(\w+)\.jsonl', name)
        c = re.match(r'c-(cueC|cue)-(on|off)-(\w+)-(\d)\.jsonl', name)
        if not (m or c):
            continue
        rows = load(os.path.join(directory, name))
        if m:
            seed, cl, arm = int(m.group(1)), m.group(2), m.group(3)
            for s in (x for x in rows if x.get('kind') == 'summary'):
                if s.get('pop') is None:
                    continue
                key = ('o', cl, arm, seed, s['script'], s['wave'])
                frames = [x for x in rows if x.get('kind') == 'f' and x.get('script') == s['script'] and x.get('wave') == s['wave']]
                out[key] = {'summary': s, 'frames': frames}
        else:
            script, cl, arm, run = c.group(1), c.group(2), c.group(3), int(c.group(4))
            s = next((x for x in rows if x.get('kind') == 'summary'), None)
            if s is None or s.get('pop') is None:
                continue
            frames = [x for x in rows if x.get('kind') == 'f']
            out[('c', cl, arm, run, script, 0)] = {'summary': s, 'frames': frames}
    return out


def label(key):
    mode, cl, arm, a, script, wave = key
    return f"{'s%dw%d' % (a, wave) if mode == 'o' else 'run%d' % a} {script}"


def standing_time(s):
    """Time standing, censored at HOLD (None if it never stood)."""
    if s.get('stand') is None:
        return None
    if s.get('fellAfterStand') is None:
        return HOLD
    return min(HOLD, s['fellAfterStand'])


def first(frames, pred):
    for x in frames:
        if pred(x):
            return x
    return None


def escape(frames):
    """The first sideways escape (sideways-falls.md 0.3): the earliest of M1 headX <= 0, M2 infeasible, M3 beyond."""
    st_frames = [x for x in frames if x.get('tS') is not None and x['tS'] >= 0 and x.get('ph') in ('standing', 'landing')]
    marks = {}
    for x in st_frames:
        if 'M1' not in marks and x.get('headX') is not None and x['headX'] <= 0:
            marks['M1'] = x
        if 'M2' not in marks and (x.get('cps') or {}).get('inf', 0) > 0:
            marks['M2'] = x
        if 'M3' not in marks and x.get('beyond') == 1:
            marks['M3'] = x
        if 'M4' not in marks and (x.get('ctl') or {}).get('over', -1) > 0:
            marks['M4'] = x
    esc = [(v['tS'], k) for k, v in marks.items() if k != 'M4']
    if not esc:
        return None, marks, st_frames
    t, k = min(esc)
    return marks[k], marks, st_frames


def axis(frames):
    """The engine's capture state at the last attached standing frame: across (pastX > 0), along (pastZ > 0), or none."""
    sf = [x for x in frames if x.get('ph') == 'standing']
    if not sf:
        return 'pop-up'
    last = sf[-1]
    px, pz = last.get('pastX') or 0, last.get('pastZ') or 0
    if px <= 0 and pz <= 0:
        return 'inside'
    return 'across' if px >= pz else 'along'


def geometry(x):
    lat = x.get('lat') or {}
    face = lat.get('faceX')
    roll = x.get('roll')
    return {
        'vW': x.get('vW'), 'face': x.get('faceFrac'), 'roll': roll, 'bank': lat.get('bank'), 'faceX': face,
        'rollRel': None if roll is None or face is None else round(roll - face, 2), 'hdg': lat.get('hdgFall'),
        'spd': (x.get('ctl') or {}).get('speed'),
    }


def fmt(g):
    f = lambda v, n=2: '—' if v is None else f'{v:.{n}f}'
    return (f"vW {f(g['vW'])} sched {f(g['spd'])} face {f(g['face'])} roll {f(g['roll'], 1)} bank {f(g['bank'], 1)} "
            f"faceX {f(g['faceX'], 1)} roll-face {f(g['rollRel'], 1)} hdg {f(g['hdg'], 0)}")


def side_of(esc_frame):
    """The fall side on the board's x: the demanded CoP's side at M1, else the capture point's."""
    if esc_frame is None:
        return 0
    v = esc_frame.get('copX')
    if v is None or abs(v) < 1e-6:
        v = esc_frame.get('capX') or 0
    return 1 if v > 0 else -1


def ledger(st_frames, t_end, side, window=None):
    """Sum of each source's body-lean acceleration x dt (rad/s), signed toward the fall side, stand -> t_end
    (or the last `window` s); the capture-point channels likewise (m); the worst closure."""
    own, cps, closure, split, mres = {}, {}, 0.0, 0.0, 0.0
    t0 = 0 if window is None else t_end - window
    for x in st_frames:
        if x['tS'] < t0 - 1e-9 or x['tS'] > t_end + 1e-9:
            continue
        bl = x.get('bl') or {}
        for k, v in (bl.get('own') or {}).items():
            own[k] = own.get(k, 0) + side * v * DT
        closure = max(closure, bl.get('closure') or 0)
        split = max(split, bl.get('split') or 0)
        mres = max(mres, bl.get('mres') or 0)
        c = x.get('cps') or {}
        for k in ('boardT', 'boardR', 'frame', 'rider', 'felt', 'pos', 'omega', 'dcp'):
            if c.get(k) is not None:
                cps[k] = cps.get(k, 0) + side * c[k]
    return own, cps, closure, split, mres


def auc(a, b):
    """P(a > b) + 0.5 P(tie)."""
    if not a or not b:
        return None
    s = 0.0
    for x in a:
        for y in b:
            s += 1 if x > y else 0.5 if x == y else 0
    return s / (len(a) * len(b))


def at(st_frames, t):
    best = None
    for x in st_frames:
        if x['tS'] <= t + 1e-9:
            best = x
    return best


def main():
    directory = sys.argv[1]
    what = sys.argv[2] if len(sys.argv) > 2 else 'all'
    if what == 'report':
        report(directory)
        return
    S = stands_of(directory)
    base = {k: v for k, v in S.items() if k[2] == 'base'}
    # ---- stands
    if what in ('stands', 'all'):
        print('## Stands (base arm): stand -> escape\n')
        for key in sorted(base):
            v = base[key]
            s = v['summary']
            ts = standing_time(s)
            frames = v['frames']
            esc, marks, sf = escape(frames)
            stand = first(sf, lambda x: True)
            tag = 'never stood' if ts is None else ('carried' if ts >= HOLD else f'fell {ts:.2f}')
            print(f"{key[0]} {key[1]} {label(key)}: {tag}, cause {s.get('cause')}, axis {axis(frames)}")
            if stand:
                print(f"   stand  {fmt(geometry(stand))}")
            if esc:
                mk = ' '.join(f"{k}@{m['tS']:.3f}" for k, m in sorted(marks.items(), key=lambda kv: kv[1]['tS']))
                print(f"   escape {fmt(geometry(esc))}  [{mk}] side {side_of(esc):+d}")
    # ---- pairs
    if what in ('pairs', 'all'):
        print('\n## Paired arms (time standing, s; carried = 3.00)\n')
        arms = ['base', 'pf', 'ft', 'both']
        for key in sorted(base):
            row = []
            st0 = base[key]['summary']
            for arm in arms:
                k2 = (key[0], key[1], arm) + key[3:]
                v = S.get(k2)
                if v is None:
                    row.append('  n/a')
                    continue
                s = v['summary']
                same = s.get('stand') == st0.get('stand')
                t = standing_time(s)
                row.append(('never' if t is None else f'{t:5.2f}') + ('' if same else '*'))
            print(f"{key[0]} {key[1]} {label(key):14s} " + ' | '.join(row))
        print('\n(* the stand itself moved: unpaired)')



def features(v):
    """Per stand: the landing and the first corrections (sideways-falls.md section 3)."""
    esc, marks, sf = escape(v['frames'])
    if not sf:
        return None
    s0 = sf[0]
    out = {
        'vW0': s0.get('vW'), 'face0': s0.get('faceFrac'), 'hdg0': (s0.get('lat') or {}).get('hdgFall'),
        'roll0': abs(s0.get('roll') or 0), 'rollRel0': abs((s0.get('roll') or 0) - ((s0.get('lat') or {}).get('faceX') or 0)),
        'bank0': abs((s0.get('lat') or {}).get('bank') or 0), 'head0': s0.get('headX'),
        'inf0': (s0.get('cps') or {}).get('inf', 0), 'dcp0': abs((s0.get('cps') or {}).get('dcp', 0)),
        'sched0': next(((x.get('ctl') or {}).get('speed') for x in sf if (x.get('ctl') or {}).get('speed') is not None), None),
    }
    # The landing: the board's roll rate into the stand (deg/s, the two frames before it) and its roll swing over the
    # 0.3 s before it (the pop-up's push and landing phases, unloaded and loaded).
    allf = v['frames']
    i0 = next((i for i, x in enumerate(allf) if x is s0), None)
    if i0 is not None and i0 >= 2:
        out['rollRate0'] = abs(allf[i0]['roll'] - allf[i0 - 2]['roll']) / (allf[i0]['t'] - allf[i0 - 2]['t'])
        pre = [x['roll'] for x in allf if s0['t'] - 0.3 - 1e-9 <= x['t'] < s0['t']]
        out['swingPre'] = (max(pre) - min(pre)) if pre else None
        out['pitch0'] = s0.get('pitch')
    for lo, hi in ((0.1, 0.2), (0.2, 0.3), (0.3, 0.4)):
        w = [x for x in sf if lo - 1e-9 <= x['tS'] < hi - 1e-9]
        out[f'raw{lo:.1f}'] = max((abs((x.get('ctl') or {}).get('raw', 0)) for x in w), default=None)
        out[f'bank{lo:.1f}'] = max((abs((x.get('lat') or {}).get('bank') or 0) for x in w), default=None)
        out[f'roll{lo:.1f}'] = max((abs(x.get('roll') or 0) for x in w), default=None)
        out[f'sched{lo:.1f}'] = min(((x.get('ctl') or {}).get('speed', 99) for x in w), default=None)
        terms = {}
        for x in w:
            for k, t in ((x.get('ctl') or {}).get('tm') or {}).items():
                terms[k] = max(terms.get(k, 0), abs(t))
        out[f'top{lo:.1f}'] = max(terms, key=terms.get) if terms else None
    out['over_t'] = marks['M4']['tS'] if 'M4' in marks else None
    out['esc_t'] = esc['tS'] if esc else None
    return out


def diverge(S, group_fall, group_hold, title):
    print(f'\n## First divergence: {title}\n')
    F = [features(S[k]) for k in group_fall]
    H = [features(S[k]) for k in group_hold]
    F = [f for f in F if f]
    H = [h for h in H if h]
    keys = [k for k in F[0] if not k.startswith('top')] if F else []
    print(f'falls n={len(F)}, lasting n={len(H)}; AUC = P(fall > lasting)')
    for k in keys:
        a = [f[k] for f in F if f.get(k) is not None]
        b = [h[k] for h in H if h.get(k) is not None]
        if not a or not b:
            continue
        print(f"  {k:10s} fall median {st.median(a):7.2f} ({min(a):.2f}-{max(a):.2f})  lasting {st.median(b):7.2f} ({min(b):.2f}-{max(b):.2f})  AUC {auc(a, b):.2f}")
    for k in ('top0.1', 'top0.2', 'top0.3'):
        print(f"  {k}: falls {[f[k] for f in F]}  lasting {[h[k] for h in H]}")


def escape_after(frames, after=0.02):
    """The first sideways escape after the landing frame (M1-M3 with tS > `after`)."""
    st_frames = [x for x in frames if x.get('tS') is not None and x['tS'] > after and x.get('ph') in ('standing', 'landing')]
    for x in st_frames:
        if (x.get('headX') is not None and x['headX'] <= 0) or (x.get('cps') or {}).get('inf', 0) > 0 or x.get('beyond') == 1:
            return x
    return None


def ledger_report(S, keys, title):
    print(f'\n## Ledger split to the first escape after the landing frame: {title}\n')
    print('own: each source\'s body-lean acceleration x dt summed toward the fall side, rad/s (share of the positive sum);')
    print('cps: the capture point\'s change by channel toward the fall side, m. Worst closure / split / moment residual.\n')
    for key in keys:
        v = S[key]
        frames = v['frames']
        esc = escape_after(frames)
        if esc is None:
            continue
        sf = [x for x in frames if x.get('tS') is not None and x['tS'] >= 0 and x.get('ph') in ('standing', 'landing')]
        side = side_of(esc)
        for name, window in (('stand->escape', None), ('last 0.15 s', 0.15)):
            own, cps, clo, spl, mres = ledger(sf, esc['tS'], side, window)
            pos = sum(x for x in own.values() if x > 0) or 1
            top = sorted(own.items(), key=lambda kv: -kv[1])[:4]
            neg = sorted(own.items(), key=lambda kv: kv[1])[:2]
            ch = ' '.join(f"{k} {cps.get(k, 0):+.3f}" for k in ('boardT', 'boardR', 'frame', 'rider', 'felt', 'pos', 'omega', 'dcp'))
            print(f"{label(key):12s} esc {esc['tS']:.3f} side {side:+d} {name:13s} own+: " + ', '.join(f"{k} {x:+.2f} ({x / pos:.0%})" for k, x in top)
                  + ' | own-: ' + ', '.join(f"{k} {x:+.2f}" for k, x in neg) + f" | cps {ch} | closure {clo:.1e} split {spl:.1e} mres {mres:.1e}")
        c = esc.get('ctl') or {}
        last = [x for x in sf if esc['tS'] - 0.1 - 1e-9 <= x['tS'] <= esc['tS']]
        sat = all(((x.get('ctl') or {}).get('over', -1) > 0) for x in last)
        rec = all(((x.get('ctl') or {}).get('raw', 0) * side > 0) for x in last)
        print(f"{'':12s} at escape: raw {c.get('raw')} over {c.get('over')} sched {c.get('speed')} | over the last 0.1 s: saturated {sat}, raw toward recovery (raw*side>0) {rec}")


ARMS = ('pf', 'ft', 'both', 'pf6')


def effect(S, key, arm):
    """rescue / delay / none / worse / n/a for one arm against the same stand without it (sideways-falls.md 0.5)."""
    base = S[key]['summary']
    v = S.get((key[0], key[1], arm) + key[3:])
    if v is None:
        return 'n/a', None
    s = v['summary']
    t0, t1 = standing_time(base), standing_time(s)
    if t1 is None or t0 is None:
        return 'n/a', None
    tag = '' if s.get('stand') == base.get('stand') else '*'
    if t1 >= HOLD:
        return 'rescue' + tag, t1 - t0
    if t1 - t0 >= 0.25:
        return 'delay' + tag, t1 - t0
    return ('worse' if t1 - t0 <= -0.25 else 'none') + tag, t1 - t0


def classify(S, key):
    e = {arm: effect(S, key, arm)[0].rstrip('*') for arm in ARMS}
    helps = lambda a: e[a] in ('rescue', 'delay')
    if helps('pf') and not helps('ft'):
        return 'A', e
    if helps('ft') and not helps('pf'):
        return 'B', e
    if (helps('pf') and helps('ft')) or helps('both'):
        return 'A+B', e
    return 'C', e


def classification(S, keys, title):
    print(f'\n## Classification: {title}\n')
    print('| stand | script | vW at stand | sched | time standing | plantFloor 4.5 | faceTrim | both | plantFloor 6 | class |')
    print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    for key in keys:
        v = S[key]
        sf = [x for x in v['frames'] if x.get('ph') == 'standing']
        s0 = sf[0] if sf else {}
        c, e = classify(S, key)
        cells = []
        for arm in ARMS:
            tag, d = effect(S, key, arm)
            cells.append('n/a' if d is None else f'{tag} {d:+.2f}')
        ts = standing_time(v['summary'])
        print(f"| {label(key).split()[0]} | {key[4]} | {s0.get('vW', '—')} | {(next(((x.get('ctl') or {}).get('speed') for x in sf if x.get('ctl')), None))} | "
              f"{'never' if ts is None else f'{ts:.2f}'} | " + ' | '.join(cells) + f' | {c} |')


def matched(S, falls, holds):
    """Each fall's nearest lasting stand (same script) on z-scored (vW, face fraction, heading against the fall line)."""
    F = {k: features(S[k]) for k in falls}
    H = {k: features(S[k]) for k in holds}
    cols = ('vW0', 'face0', 'hdg0')
    allv = list(F.values()) + list(H.values())
    sd = {c: (st.pstdev([x[c] for x in allv if x and x.get(c) is not None]) or 1) for c in cols}
    print('\n| fall | vW, face, hdg at the stand | matched control | its vW, face, hdg | distance (z) |')
    print('| --- | --- | --- | --- | --- |')
    for k, f in F.items():
        if not f:
            continue
        best = min((h for h in H if h[4] == k[4] and H[h]), key=lambda h: math.sqrt(sum(((f[c] - H[h][c]) / sd[c]) ** 2 for c in cols)), default=None)
        if best is None:
            continue
        d = math.sqrt(sum(((f[c] - H[best][c]) / sd[c]) ** 2 for c in cols))
        g = lambda x: f"{x['vW0']:.2f}, {x['face0']:.2f}, {x['hdg0']:.0f}°"
        print(f"| {label(k)} | {g(f)} | {label(best)} | {g(H[best])} | {d:.2f} |")


def landing_table(S):
    print('\n## The landing against the schedule speed (cue script, base arm, every stand)\n')
    print('| population | stand | schedule speed at the first tick | roll swing in the 0.3 s before the stand, deg | |raw| max +0.1-0.2 / +0.2-0.3 / +0.3-0.4 s, deg | time standing | axis |')
    print('| --- | --- | --- | --- | --- | --- | --- |')
    rows = []
    for k, v in S.items():
        if k[2] != 'base' or k[4] != 'cue':
            continue
        f = features(v)
        if not f:
            continue
        rows.append((f['sched0'], k, f, standing_time(v['summary']), axis(v['frames'])))
    for sched, k, f, ts, ax in sorted(rows, key=lambda r: r[0]):
        print(f"| {k[0]} {k[1]} | {label(k).split()[0]} | {sched:.2f} | {f.get('swingPre') or 0:.1f} | {f['raw0.1']:.1f} / {f['raw0.2']:.1f} / {f['raw0.3']:.1f} | {ts:.2f} | {ax} |")


def report(directory):
    S = stands_of(directory)
    pops = [('o', 'on', 'organic, cueLater on'), ('o', 'off', 'organic, switch off (3.5t)'), ('c', 'on', 'catch, cueLater on'), ('c', 'off', 'catch, switch off (3.5t)')]
    for mode, cl, title in pops:
        B = {k: v for k, v in S.items() if k[0] == mode and k[1] == cl and k[2] == 'base'}
        falls = sorted((k for k, v in B.items() if standing_time(v['summary']) is not None and standing_time(v['summary']) < HOLD and axis(v['frames']) == 'across'), key=lambda k: (k[3], k[5], k[4]))
        other = sorted((k for k, v in B.items() if standing_time(v['summary']) is not None and standing_time(v['summary']) < HOLD and axis(v['frames']) != 'across'), key=lambda k: (k[3], k[5], k[4]))
        never = sorted(k for k, v in B.items() if standing_time(v['summary']) is None)
        holds = [k for k, v in B.items() if standing_time(v['summary']) == HOLD]
        print(f'\n# {title}\n')
        print(f"sideways falls {len(falls)}; other falls {[(label(k), axis(B[k]['frames'])) for k in other]}; never stood {[label(k) for k in never]}; lasting {len(holds)}")
        if not falls:
            continue
        classification(S, falls + other, title)
        matched(S, falls, holds)
        diverge(S, falls, holds, title)
        ledger_report(S, falls, title)
    landing_table(S)


if __name__ == '__main__':
    main()
