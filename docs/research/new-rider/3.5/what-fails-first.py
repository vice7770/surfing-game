"""Step 3.5x reader (what-fails-first.md). Reads `what-fails-first.ts` organic runs, one file per process, named
`o-s<seed>-<arm>.jsonl[.gz]`, arm in A (cueLater=on&plantFloor=6) | B (cueLater=on&plantSpeed=taper) | R (cueLater=on)
| Y (cueLater=on&plantSpeed=taper6, step 3.5y, return-taper.md) | S0 (cueLater off, the 3.5o reproduction) | S0-off (the
same with every instrument off).

    python3 what-fails-first.py <run dir> checks          # builds printed back, reproduction, inertness
    python3 what-fails-first.py <run dir> classify        # the first failure of every rider (section 0.4)
    python3 what-fails-first.py <run dir> climb           # the climb after a turn (section 0.6)
    python3 what-fails-first.py <run dir> compact <out>   # the committed compact copy: summaries, builds, x35-light rows
    python3 what-fails-first.py <run dir> twins           # 3.5y: the turn-twin split (3.5x's turn-twins.md), every arm
    python3 what-fails-first.py <run dir> lines           # 3.5y: return-taper.md section 0.5's lines, Y against A and B

Angles in degrees, + toward the board's +x (its left rail) unless named; `rollS` is 3.5o's roll (+ with the +x rail down);
times are seconds after the stand; vW is the horizontal |v_board - flow| (m/s, world); `sched` the controller's speed.
"""
import gzip
import importlib.util
import json
import math
import os
import re
import statistics as st
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location('sf', os.path.join(HERE, 'sideways-falls.py'))
sf = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sf)
load = sf.load

ARMS = {'A': ('on', 6, None), 'B': ('on', None, 'taper'), 'R': ('on', None, None), 'Y': ('on', None, 'taper6'), 'S0': (None, None, None), 'S0-off': (None, None, None)}
TURN = {'cueL': 1, 'cueR': -1, 'cueCL': 1, 'cueCR': -1}
G = 9.81


def runs(directory):
    out = {}
    for name in sorted(os.listdir(directory)):
        m = re.match(r'o-s(\d)-(A|B|R|Y|S0-off|S0)\.jsonl(\.gz)?$', name)
        if m:
            out[(int(m.group(1)), m.group(2))] = os.path.join(directory, name)
    return out


def riders(rows):
    summ = [x for x in rows if x.get('kind') == 'summary']
    frames = {}
    for x in rows:
        if x.get('kind') == 'f':
            frames.setdefault((x['script'], x['wave']), []).append(x)
    stands = {(x['script'], x['wave']): x for x in rows if x.get('kind') == 'stand'}
    return summ, frames, stands


def design_speed(arm, v):
    if v is None:
        return None
    if arm == 'A':
        return max(v, 6.0)
    if arm == 'B':
        return max(v, min(1.68 * v, 7.8))
    if arm == 'Y':
        return max(v, min(1.68 * v, 6.0))
    return v


# ------------------------------------------------------------------------------------------------------------------
def checks(directory):
    rs = runs(directory)
    print('## Builds printed back')
    for (seed, arm), path in rs.items():
        rows = load(path)
        ctl = next(x for x in rows if x.get('kind') == 'control')
        want = ARMS[arm]
        st_rows = [x for x in rows if x.get('kind') == 'stand']
        got = {(x.get('plantFloor'), x.get('plantSpeed')) for x in st_rows}
        ok = ctl.get('cueLater') == want[0] and got <= {(want[1], want[2])}
        print(f"- s{seed} {arm}: cueLater {ctl.get('cueLater')}, (plantFloor, plantSpeed) {sorted(got, key=str)}, scripts {ctl['scripts']}, standHold {ctl.get('standHold')}, lat {ctl.get('lat')} x35 {ctl.get('x35')} ledger {ctl.get('ledger')} -> {'OK' if ok else 'MISMATCH'}")
    # (a) the take-off rows against 3.5v's (R -> on-base, A -> on-pf6), and B's summaries against 3.5w's.
    print('\n## Reproduction (a): cue/cueC take-off rows over the first 3 s')
    ref = {'R': ('35v/data', 'on-base'), 'A': ('35v/data', 'on-pf6'), 'B': ('35w/data-taper', 'on-tp')}
    base = os.path.join(HERE, 'results')
    for (seed, arm), path in rs.items():
        if arm not in ref:
            continue
        old_path = os.path.join(base, ref[arm][0], f'o-s{seed}-{ref[arm][1]}.jsonl.gz')
        if not os.path.exists(old_path):
            print(f'- s{seed} {arm}: no committed file {old_path}')
            continue
        old = load(old_path)
        new = load(path)
        so = {(x['script'], x['wave']): x for x in old if x.get('kind') == 'summary'}
        sn = {(x['script'], x['wave']): x for x in new if x.get('kind') == 'summary' and x['script'] in ('cue', 'cueC')}
        same = diff = 0
        bad = []
        for k, a in so.items():
            b = sn.get(k)
            if b is None:
                bad.append((k, 'missing'))
                continue
            fa = a.get('fellAfterStand')
            fb = b.get('fellAfterStand')
            fb3 = fb if fb is not None and fb <= 3.0 + 1e-9 else None
            fa3 = fa if fa is not None and fa <= 3.0 + 1e-9 else None
            if a.get('stand') == b.get('stand') and a.get('pop') == b.get('pop') and fa3 == fb3:
                same += 1
            else:
                diff += 1
                bad.append((k, a.get('stand'), b.get('stand'), fa, fb))
        # frame rows (only where the committed file has frames)
        fo = {(x['script'], x['wave'], x['t']): x for x in old if x.get('kind') == 'f'}
        fn = {(x['script'], x['wave'], x['t']): x for x in new if x.get('kind') == 'f'}
        fsame = fdiff = 0
        first_bad = None
        for k, a in fo.items():
            b = fn.get(k)
            if b is None:
                fdiff += 1
                first_bad = first_bad or (k, 'missing')
                continue
            # a committed file slimmed to a subset of a dict's keys (3.5v's arm files) is compared on those keys
            d = [f for f in a if f not in ('x35',) and (({k: b.get(f, {}).get(k) for k in a[f]} != a[f]) if isinstance(a[f], dict) and isinstance(b.get(f), dict) else a[f] != b.get(f))]
            if d:
                fdiff += 1
                first_bad = first_bad or (k, d[:5])
            else:
                fsame += 1
        print(f'- s{seed} {arm} vs {os.path.basename(old_path)}: riders {same} same / {diff} differ; frame rows {fsame} identical / {fdiff} differ (every common field){"; first: " + str(first_bad) if first_bad else ""}{"; " + str(bad[:4]) if bad else ""}')
    # (b) S0 against 3.5o's population, (c) inertness.
    print("\n## Reproduction (b): cueLater off, seed 2, against 3.5o's population (shipped, steer only)")
    pop = [x for x in load(os.path.join(base, '35o/population-summaries.jsonl.gz')) if x.get('kind') == 'summary']
    for (seed, arm), path in rs.items():
        if arm not in ('S0', 'S0-off'):
            continue
        p = {(x['script'], x['wave']): x for x in pop if x['run'] == f's{seed}-c0-ships'}
        n = {(x['script'], x['wave']): x for x in load(path) if x.get('kind') == 'summary'}
        eq = lambda u, v: (u is None and v is None) or (u is not None and v is not None and abs(u - v) < 1.5e-4)
        same = [k for k in p if k in n and eq(p[k].get('fellAfterStand'), n[k].get('fellAfterStand')) and eq(p[k].get('stand'), n[k].get('stand'))]
        diffs = [(k, p[k].get('fellAfterStand'), n.get(k, {}).get('fellAfterStand')) for k in p if k not in same]
        print(f'- s{seed} {arm}: {len(same)} of {len(p)} riders with the identical stand and fall time (within 1.5e-4 s: 3.5o rounds to 5 decimals, this probe to 4){"; differ: " + str(diffs[:6]) if diffs else ""}')


# ------------------------------------------------------------------------------------------------------------------
def tick_frames(frames):
    return [x for x in frames if x.get('ctl') is not None]


def raw_windows(st_frames, t_esc):
    out = []
    for lo in (t_esc - 0.3, t_esc - 0.2, t_esc - 0.1):
        w = [abs(x['ctl']['raw']) for x in st_frames if x.get('ctl') and lo - 1e-9 <= x['tS'] < lo + 0.1 - 1e-9]
        out.append(max(w) if w else None)
    return out


def classify_rider(arm, script, s, frames, hold):
    """Section 0.4's rule. Returns a dict."""
    res = {'script': script, 'wave': s['wave'], 'stand': s.get('stand'), 'fell': s.get('fellAfterStand'), 'cause': s.get('cause')}
    if s.get('stand') is None:
        res['cls'] = None
        return res
    fa = s.get('fellAfterStand')
    if fa is None or fa > hold + 1e-9:
        res['cls'] = 'held'
        return res
    sframes = [x for x in frames if x.get('tS') is not None and x['tS'] >= 0]
    standing = [x for x in sframes if x.get('ph') == 'standing']
    if not standing or fa <= 0.1 + 1e-9:
        res['cls'] = 'P'
        return res
    st_frames = [x for x in sframes if x.get('ph') in ('standing', 'landing') and x['tS'] > 0]
    marks = {}
    for x in st_frames:
        if 'M1' not in marks and x.get('headX') is not None and x['headX'] <= 0:
            marks['M1'] = x
        if 'M2' not in marks and (x.get('cps') or {}).get('inf', 0) > 0:
            marks['M2'] = x
        if 'M3' not in marks and x.get('beyond') == 1:
            marks['M3'] = x
        if 'F' not in marks and (x.get('pastZ') or 0) > 0:
            marks['F'] = x
        if 'M4' not in marks and (x.get('ctl') or {}).get('over', -1) > 0:
            marks['M4'] = x
    turn = TURN.get(script, 0)
    if turn:
        for x in st_frames:
            if x['tS'] >= 1.2 and (x.get('x35') or {}).get('rollS') is not None and x['x35']['rollS'] * turn <= -20:
                marks['O'] = x
                break
    esc = sorted((v['tS'], k) for k, v in marks.items() if k in ('M1', 'M2', 'M3', 'F'))
    last = standing[-1]
    res['marks'] = {k: v['tS'] for k, v in marks.items()}
    res['axis'] = sf.axis(frames)
    if not esc:
        e = last
        res['esc'] = None
    else:
        e = marks[esc[0][1]]
        res['esc'] = esc[0][1]
    res['tEsc'] = e['tS']
    res['vW'] = e.get('vW')
    sched = (e.get('ctl') or {}).get('speed')
    if sched is None:
        prev = [x for x in st_frames if x.get('ctl') and x['tS'] <= e['tS']]
        sched = prev[-1]['ctl']['speed'] if prev else None
    res['sched'] = sched
    res['design'] = design_speed(arm, sched)
    res['ahead'] = e.get('ahead')
    # leading channel: capture-point split over the last 0.15 s, signed toward the escape
    side = sf.side_of(e)
    ch = {}
    for x in st_frames:
        if e['tS'] - 0.15 - 1e-9 <= x['tS'] <= e['tS'] + 1e-9 and x.get('cps'):
            for k in ('pos', 'rider', 'boardT', 'boardR', 'frame', 'felt', 'omega'):
                ch[k] = ch.get(k, 0) + (x['cps'].get(k) or 0) * side
    # 3.5v section 5's reading: the channel with the largest |change|, its sign toward the fall side kept
    res['lead'] = max(ch, key=lambda k: abs(ch[k])) if ch else None
    res['leadShare'] = {k: round(v, 3) for k, v in sorted(ch.items(), key=lambda kv: -abs(kv[1]))[:3]}
    # controller term at the first M4
    m4 = marks.get('M4')
    if m4 is not None and m4['tS'] <= e['tS'] + 1e-9:
        tm = m4['ctl']['tm']
        res['m4term'] = max(tm, key=lambda k: abs(tm[k]))
        res['m4'] = m4['tS']
        x35 = m4.get('x35') or {}
        xr = x35.get('xr')
        res['refSlip'] = None if not xr else xr[5]
    # saturated toward recovery over the last 0.1 s?
    lastw = [x for x in st_frames if x.get('ctl') and e['tS'] - 0.1 - 1e-9 <= x['tS'] <= e['tS'] + 1e-9]
    # raw in the model's sign is -(board-frame); toward recovery = away from the fall side, so board-frame raw * side < 0
    res['satRecover'] = bool(lastw) and all(x['ctl']['over'] > 0 and -x['ctl']['raw'] * side < 0 for x in lastw)
    res['unsatOrAway'] = bool(lastw) and any(x['ctl']['over'] <= 0 or -x['ctl']['raw'] * side > 0 for x in lastw)
    # 0.10 (dated addition): the final escape, the onset of the last run of margin loss ending in the separation
    lost = lambda x: (x.get('headX') is not None and x['headX'] <= 0) or (x.get('cps') or {}).get('inf', 0) > 0 or x.get('beyond') == 1 or (x.get('pastZ') or 0) > 0
    onset = None
    gap_from = None
    for x in reversed(st_frames):
        if lost(x):
            onset = x
            gap_from = None
        else:
            if onset is None:
                continue
            if gap_from is None:
                gap_from = x['tS']
            if onset['tS'] - x['tS'] > 0.05 + 1e-9:
                break
    if onset is not None:
        fside = sf.side_of(onset)
        lw = [x for x in st_frames if x.get('ctl') and onset['tS'] - 0.1 - 1e-9 <= x['tS'] <= onset['tS'] + 1e-9]
        res['finalSat'] = bool(lw) and all(x['ctl']['over'] > 0 and -x['ctl']['raw'] * fside < 0 for x in lw)
        res['finalMaxRaw'] = max((abs(x['ctl']['raw']) for x in lw), default=None)
        prevc = [x for x in st_frames if x.get('ctl') and x['tS'] <= onset['tS']]
        res['final'] = {'t': onset['tS'], 'vW': onset.get('vW'), 'sched': prevc[-1]['ctl']['speed'] if prevc else None,
                        'lean': (onset.get('x35') or {}).get('lean'), 'rollS': (onset.get('x35') or {}).get('rollS')}
    rw = raw_windows(st_frames, e['tS'])
    res['rawWin'] = [None if v is None else round(v, 1) for v in rw]
    grows = all(v is not None for v in rw) and rw[0] < rw[1] < rw[2]
    # the rule
    if e.get('vW') is not None and e['vW'] < 3.0 and (e.get('ahead') is not None and e['ahead'] <= 0.5):
        cls = 'S'
    elif res['axis'] == 'along':
        cls = 'F'
    elif turn and e['tS'] > 1.2 and 'O' in marks and marks['O']['tS'] <= e['tS'] + 1e-9:
        cls = 'O'
    elif m4 is not None and m4['tS'] <= e['tS'] + 1e-9 and grows:
        cls = 'L-ref' if res.get('refSlip') is not None and abs(res['refSlip']) > 15 else 'L-gain'
        if turn and 0.3 <= e['tS'] <= 1.5:
            cls += ' (turn)'
    elif m4 is None or m4['tS'] > e['tS'] + 1e-9:
        cls = 'U'
    else:
        cls = 'N'
    res['cls'] = cls
    return res


def classify(directory, quiet=False):
    rs = runs(directory)
    table = {}
    for (seed, arm), path in sorted(rs.items()):
        if arm.startswith('S0'):
            continue
        rows = load(path)
        summ, frames, stands = riders(rows)
        hold = next(x for x in rows if x.get('kind') == 'control').get('standHold', 3)
        for s in summ:
            if s.get('pop') is None:
                continue
            h = 3.0 if s['script'] in ('cue', 'cueC') else hold
            c = classify_rider(arm, s['script'], s, frames.get((s['script'], s['wave']), []), h)
            c['seed'] = seed
            table[(arm, seed, s['script'], s['wave'])] = c
    if not quiet:
        fmt = lambda v, n=2: '—' if v is None else (f'{v:.{n}f}' if isinstance(v, (int, float)) else str(v))
        for script_set, title in ((('cue', 'cueC'), 'Take-offs (3 s hold)'), (('cueL', 'cueR'), 'Turns, steer only (5 s hold)'), (('cueCL', 'cueCR'), 'Turns, his way (5 s hold)')):
            print(f'\n## {title}\n')
            print('| arm | rider | stand at (s) | fell after (s) | class | first escape (s) | margins | vW / sched / design (m/s) | lead (last 0.15 s) | first M4 term | raw windows (deg) | sat. to recovery |')
            print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
            for key in sorted(table, key=lambda k: (k[0], k[1], k[3], k[2])):
                arm, seed, script, wave = key
                if script not in script_set:
                    continue
                c = table[key]
                if c['cls'] in (None, 'held'):
                    continue
                marks = ', '.join(f'{k} {v:.2f}' for k, v in sorted((c.get('marks') or {}).items(), key=lambda kv: kv[1]))
                fe = c.get('final') or {}
                fin = '' if not fe or c.get('tEsc') is None or abs(fe['t'] - c['tEsc']) <= 0.3 else f" (final {fe['t']:.2f}: {fmt(fe.get('vW'))} / {fmt(fe.get('sched'))} m/s, lean {fmt(fe.get('lean'), 0)}, roll {fmt(fe.get('rollS'), 0)})"
                print(f"| {arm} | s{seed}w{wave} {script} | {fmt(c['stand'])} | {fmt(c['fell'], 3)} | {c['cls']} | {fmt(c.get('tEsc'), 3)}{fin} | {marks} | {fmt(c.get('vW'))} / {fmt(c.get('sched'))} / {fmt(c.get('design'))} | {c.get('lead')} {c.get('leadShare')} | {c.get('m4term')} | {c.get('rawWin')} | {c.get('satRecover')} |")
        print('\n## Counts (riders that stood; held = lasted the hold)\n')
        print('| arm | drive | stood | held | P | S | F | O | L-gain | L-ref | U | N |')
        print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
        for arm in ('A', 'B', 'R', 'Y'):
            for script_set, title in ((('cue',), 'take-off, centred'), (('cueC',), 'take-off, his way'), (('cueL', 'cueR'), 'turn, steer only'), (('cueCL', 'cueCR'), 'turn, his way')):
                cs = [c for k, c in table.items() if k[0] == arm and k[2] in script_set and c['cls'] is not None]
                if not cs:
                    continue
                n = lambda p: sum(1 for c in cs if c['cls'].startswith(p))
                print(f"| {arm} | {title} | {len(cs)} | {n('held')} | {n('P')} | {n('S')} | {n('F')} | {n('O')} | {n('L-gain')} | {n('L-ref')} | {n('U')} | {n('N')} |")
    return table


# ------------------------------------------------------------------------------------------------------------------
def climb(directory):
    rs = runs(directory)
    print('| arm | rider | fell (s) | bottom (s, m, vW) | 0.50 m at (s, vW, sched, course) | 0.90 m at | peak (m, at s) | O at (s, vW) |')
    print('| --- | --- | --- | --- | --- | --- | --- | --- |')
    out = []
    for (seed, arm), path in sorted(rs.items()):
        rows = load(path)
        summ, frames, stands = riders(rows)
        for s in summ:
            sc = s['script']
            if sc not in TURN or s.get('stand') is None:
                continue
            fr = [x for x in frames.get((sc, s['wave']), []) if x.get('tS') is not None and x['tS'] >= 0 and x.get('ph') == 'standing']
            if not fr:
                continue
            cl = lambda x: None if x.get('faceH') is None or x.get('faceFrac') is None else x['faceH'] * x['faceFrac']
            at12 = [x for x in fr if abs(x['tS'] - 1.2) < 0.009]
            win = [cl(x) for x in fr if 0.3 <= x['tS'] <= 1.2 and cl(x) is not None]
            if not at12 or not win:
                continue
            lo = min(win)
            later = [x for x in fr if x['tS'] > 1.2 and cl(x) is not None]
            climber = any(cl(x) >= lo + 0.2 for x in later)
            if not climber:
                continue
            turn = TURN[sc]
            pk = max(later, key=lambda x: cl(x))
            # 3.5o's lines are crossed on the way up the face: after the bottom (the least climb from +0.3 s to the peak)
            before = [x for x in fr if 0.3 <= x['tS'] <= pk['tS'] and cl(x) is not None]
            bottom = min(before, key=lambda x: cl(x))
            def first_at(h):
                x = next((x for x in fr if x['tS'] >= bottom['tS'] and cl(x) is not None and cl(x) >= h), None)
                if x is None:
                    return None
                pc = [y for y in fr if y.get('ctl') and y['tS'] <= x['tS']]
                return (round(x['tS'], 3), x.get('vW'), pc[-1]['ctl']['speed'] if pc else None, (x.get('x35') or {}).get('course'))
            o = next((x for x in fr if x['tS'] >= 1.2 and (x.get('x35') or {}).get('rollS') is not None and x['x35']['rollS'] * turn <= -20), None)
            r = {'arm': arm, 'seed': seed, 'script': sc, 'wave': s['wave'], 'fell': s.get('fellAfterStand'), 'bottom': (round(bottom['tS'], 3), round(cl(bottom), 2), bottom.get('vW')), 'h50': first_at(0.5), 'h90': first_at(0.9),
                 'peak': (round(cl(pk), 3), round(pk['tS'], 3)), 'O': None if o is None else (round(o['tS'], 3), o.get('vW'))}
            out.append(r)
            print(f"| {arm} | s{seed}w{s['wave']} {sc} | {r['fell']} | {r['bottom']} | {r['h50']} | {r['h90']} | {r['peak']} | {r['O']} |")
    return out


def climb_ticks(directory, arm, seed, script, wave, t0=1.0):
    """Per tick through the climb: roll, bank, lean, the reference's bank/roll/yaw rate, the coordinated banks, terms."""
    path = runs(directory)[(seed, arm)]
    rows = load(path)
    fr = [x for x in rows if x.get('kind') == 'f' and x['script'] == script and x['wave'] == wave and x.get('tS') is not None and x['tS'] >= t0 and x.get('ctl')]
    print(f'### {arm} s{seed}w{wave} {script}: per tick from +{t0} s (model signs for xr/terms: phi = -roll, bank = -bank)')
    print('| t (s) | vW | sched | design | climb (m) | course | yaw rate (deg/s) | rollS | bank | lean asked | x_ref roll / bank / yaw rate / slip | coord. bank at vW / at design (deg) | raw | terms (largest 3) |')
    print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    prev = None
    for x in fr:
        x35 = x.get('x35') or {}
        if prev is not None and x35.get('tick') == prev:
            continue
        prev = x35.get('tick')
        sched = x['ctl']['speed']
        des = design_speed(arm, sched)
        r = x35.get('yawRate')
        vW = x.get('vW')
        cb = lambda v: None if v is None or r is None else round(math.degrees(math.atan(v * math.radians(r) / G)), 1)
        xr = x35.get('xr') or [None] * 6
        tm = x['ctl']['tm']
        top = sorted(tm.items(), key=lambda kv: -abs(kv[1]))[:3]
        cl = None if x.get('faceH') is None else round(x['faceH'] * x['faceFrac'], 2)
        print(f"| {x['tS']:.3f} | {vW} | {sched} | {des:.2f} | {cl} | {x35.get('course')} | {r} | {x35.get('rollS')} | {(x.get('lat') or {}).get('bank')} | {x35.get('lean')} | {xr[0]} / {xr[2]} / {xr[4]} / {xr[5]} | {cb(vW)} / {cb(des)} | {x['ctl']['raw']} | {', '.join(f'{k} {v:+.1f}' for k, v in top)} |")


def summary(directory):
    """The per arm x drive picture (registered classes and the final escape), and the paired fall times."""
    table = classify(directory, quiet=True)
    med = lambda xs: None if not xs else round(st.median(xs), 2)
    print('| arm | drive | stood | fell in hold | median fall (s) | final escape: median t (s) | median vW / sched (m/s) | sched < 4.5 at the final escape | rolled >= 20 deg inside / outside | command unsaturated or away, last 0.1 s |')
    print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    for arm in ('R', 'A', 'B', 'Y'):
        for script_set, title in ((('cue',), 'take-off, centred'), (('cueC',), 'take-off, his way'), (('cueL', 'cueR'), 'turn, steer only'), (('cueCL', 'cueCR'), 'turn, his way')):
            cs = [c for k, c in table.items() if k[0] == arm and k[2] in script_set and c['cls'] is not None]
            if not cs:
                continue
            fell = [c for c in cs if c['cls'] != 'held']
            fin = [c['final'] for c in fell if c.get('final')]
            ins = sum(1 for c in fell if c.get('final') and c['final'].get('rollS') is not None and TURN.get(c['script'], 0) and c['final']['rollS'] * TURN[c['script']] >= 20)
            out = sum(1 for c in fell if c.get('final') and c['final'].get('rollS') is not None and TURN.get(c['script'], 0) and c['final']['rollS'] * TURN[c['script']] <= -20)
            slow = sum(1 for f in fin if f.get('sched') is not None and f['sched'] < 4.5)
            unsat = sum(1 for c in fell if c.get('final') and not c.get('finalSat'))
            print(f"| {arm} | {title} | {len(cs)} | {len(fell)} | {med([c['fell'] for c in fell])} | {med([f['t'] for f in fin])} | {med([f['vW'] for f in fin if f.get('vW') is not None])} / {med([f['sched'] for f in fin if f.get('sched') is not None])} | {slow} of {len(fin)} | {ins} / {out} | {unsat} of {len(fell)} |")
    print('\n### Paired fall times (same stand on every arm; censored at the hold)\n')
    print('| pair | drive | n | later / sooner / same (0.25 s) | median diff (s) |')
    print('| --- | --- | --- | --- | --- |')
    def ft(c, hold):
        return hold if c['cls'] == 'held' or c.get('fell') is None else min(hold, c['fell'])
    for a, b in (('A', 'R'), ('B', 'R'), ('A', 'B'), ('Y', 'A'), ('Y', 'B'), ('Y', 'R')):
        for script_set, title, hold in ((('cue',), 'take-off, centred', 3), (('cueC',), 'take-off, his way', 3), (('cueL', 'cueR'), 'turn, steer only', 5), (('cueCL', 'cueCR'), 'turn, his way', 5)):
            ds = []
            for k, c in table.items():
                if k[0] != a or k[2] not in script_set or c['cls'] is None:
                    continue
                o = table.get((b,) + k[1:])
                if o is None or o['cls'] is None or o['stand'] != c['stand']:
                    continue
                ds.append(ft(c, hold) - ft(o, hold))
            if ds:
                print(f"| {a} - {b} | {title} | {len(ds)} | {sum(d >= 0.25 for d in ds)} / {sum(d <= -0.25 for d in ds)} / {sum(abs(d) < 0.25 for d in ds)} | {med(ds):+.2f} |")
    return table


def divergence(directory, a='A', b='B', tol=2.0):
    """Where two arms' rides of the same rider first part: the first frame |rollS_a - rollS_b| > tol deg, with the
    schedule speed there and each arm's design speed."""
    rs = runs(directory)
    print(f'| rider | parts at (s) | vW | sched | design {a} / {b} | fell {a} / {b} |')
    print('| --- | --- | --- | --- | --- | --- |')
    speeds = []
    for seed in range(1, 10):
        if (seed, a) not in rs or (seed, b) not in rs:
            continue
        ra, rb = load(rs[(seed, a)]), load(rs[(seed, b)])
        sa, fa, _ = riders(ra)
        sb, fb, _ = riders(rb)
        sbk = {(x['script'], x['wave']): x for x in sb}
        for x in sa:
            if x.get('stand') is None:
                continue
            k = (x['script'], x['wave'])
            y = sbk.get(k)
            A = {f['t']: f for f in fa.get(k, []) if f.get('tS') is not None and f['tS'] >= 0}
            B = {f['t']: f for f in fb.get(k, []) if f.get('tS') is not None and f['tS'] >= 0}
            part = None
            for t in sorted(set(A) & set(B)):
                ua, ub = A[t].get('roll'), B[t].get('roll')
                if ua is not None and ub is not None and abs(ua - ub) > tol:
                    part = A[t]
                    break
            if part is None:
                continue
            prevc = [f for f in sorted(A.values(), key=lambda f: f['t']) if f.get('ctl') and f['t'] <= part['t']]
            sc = prevc[-1]['ctl']['speed'] if prevc else None
            speeds.append(sc)
            print(f"| s{seed}w{k[1]} {k[0]} | {part['tS']:.2f} | {part.get('vW')} | {sc} | {design_speed(a, sc):.2f} / {design_speed(b, sc):.2f} | {x.get('fellAfterStand')} / {y.get('fellAfterStand') if y else None} |")
    sp = [v for v in speeds if v is not None]
    if sp:
        print(f"\n{len(sp)} riders part; schedule speed where they part: median {st.median(sp):.2f} m/s, {sum(4.6 <= v <= 7.8 for v in sp)} of {len(sp)} at 4.6-7.8 m/s, {sum(v < 4.6 for v in sp)} below 4.6")


def compact(directory, out_dir):
    """Committed copy: summaries, controls, stands (weights), and for falling/climbing riders a light frame row."""
    os.makedirs(out_dir, exist_ok=True)
    keep_f = ('script', 'wave', 't', 'tS', 'ph', 'vW', 'vG', 'roll', 'bank', 'headX', 'pastX', 'pastZ', 'beyond', 'capX', 'capZ', 'faceH', 'faceFrac', 'ahead', 'copX', 'compress', 'ask', 'cap', 'legRest')
    for (seed, arm), path in runs(directory).items():
        rows = load(path)
        o = []
        for x in rows:
            k = x.get('kind')
            if k in ('control', 'summary', 'done', 'stand'):
                o.append(x)
            elif k == 'f' and x.get('tS') is not None and x['tS'] >= 0:
                y = {f: x[f] for f in keep_f if f in x}
                y['kind'] = 'f'
                if x.get('ctl'):
                    y['ctl'] = {f: x['ctl'][f] for f in ('speed', 'raw', 'over', 'range') if f in x['ctl']}
                    y['ctl']['tm'] = x['ctl'].get('tm')
                if x.get('cps'):
                    y['cps'] = x['cps']
                if x.get('x35'):
                    y['x35'] = {f: x['x35'][f] for f in ('course', 'yawRate', 'rollS', 'lean', 'steerIn', 'compIn', 'xr', 'args', 'tick') if f in x['x35']}
                o.append(y)
        with gzip.open(os.path.join(out_dir, os.path.basename(path).replace('.jsonl', '') + '.jsonl.gz'), 'wt') as fh:
            for x in o:
                fh.write(json.dumps(x, separators=(',', ':')) + '\n')


# ------------------------------------------------------------------------------------------------------------------
# Step 3.5y (return-taper.md): the turn-twin split and section 0.5's lines.
TWIN = {'cueL': 'cue', 'cueR': 'cue', 'cueCL': 'cueC', 'cueCR': 'cueC'}
DRIVES = (('cueL', 'cueR'), 'turn, steer only'), (('cueCL', 'cueCR'), 'turn, his way')


def fall5(s):
    """Seconds standing, censored at 5 s (the probe's STAND_HOLD); None if he never stood."""
    if s is None or s.get('stand') is None:
        return None
    f = s.get('fellAfterStand')
    return 5.0 if f is None or f > 5.0 + 1e-9 else f


def summaries(directory):
    out = {}
    for (seed, arm), path in runs(directory).items():
        if arm.startswith('S0'):
            continue
        for x in load(path):
            if x.get('kind') == 'summary':
                out[(arm, seed, x['script'], x['wave'])] = x
    return out


def twin_split(summ, table, arm, scripts):
    """3.5x's turn-twin split: twin = the same arm, seed and wave's stick-centred script, both ridden 5 s. A turn rider
    that fell within 5 s is 'twin too' when the twin falls no later than 0.25 s after him, 'turn-caused' when the twin
    outlives him by 0.5 s or more, else 'between'."""
    fell, too, tc, between = [], [], [], []
    for k, s in summ.items():
        if k[0] != arm or k[2] not in scripts or s.get('stand') is None:
            continue
        f = s.get('fellAfterStand')
        if f is None or f > 5.0 + 1e-9:
            continue
        fell.append(k)
        tf = fall5(summ.get((arm, k[1], TWIN[k[2]], k[3])))
        if tf is None:
            continue
        (too if tf <= f + 0.25 + 1e-9 else tc if tf - f >= 0.5 - 1e-9 else between).append(k)
    return fell, too, tc, between


def twins(directory, quiet=False):
    summ = summaries(directory)
    table = classify(directory, quiet=True)
    med = lambda xs: None if not xs else round(st.median(xs), 2)
    if not quiet:
        print('Every rider rode 5 s; the twin is the same stand with the stick centred (cue for cueL/R, cueC for cueCL/CR).\n')
        print('| arm | drive | turn riders that stood | fell in 5 s | twin falls too (within 0.25 s, or first) | turn-caused (twin outlives by >= 0.5 s) | between | turn-caused: median fall (s); median sched at the final escape (m/s); final escape inside +0.3 to +1.5 s | turn-caused: registered classes |')
        print('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    out = {}
    for arm in ('R', 'A', 'B', 'Y'):
        for scripts, title in DRIVES:
            stood = [k for k, s in summ.items() if k[0] == arm and k[2] in scripts and s.get('stand') is not None]
            if not stood:
                continue
            fell, too, tc, between = twin_split(summ, table, arm, scripts)
            fin = [table[k].get('final') for k in tc if table.get(k) and table[k].get('final')]
            inwin = sum(1 for f in fin if 0.3 <= f['t'] <= 1.5)
            cls = {}
            for k in tc:
                c = table[k]['cls']
                cls[c] = cls.get(c, 0) + 1
            out[(arm, title)] = {'fell': fell, 'too': too, 'tc': tc, 'between': between}
            if not quiet:
                # 3.5x's 'between' column counts every stood rider in neither class, the riders that held 5 s included.
                print(f"| {arm} | {title.replace('turn, ', '')} | {len(stood)} | {len(fell)} | {len(too)} | {len(tc)} | {len(stood) - len(too) - len(tc)} | {med([summ[k]['fellAfterStand'] for k in tc])}; {med([f['sched'] for f in fin if f.get('sched') is not None])}; {inwin} of {len(tc)} | {cls} |")
    return out


def lines(directory):
    """return-taper.md section 0.5: every line, Y against A (and B), with the counts, medians and the riders that move most."""
    summ = summaries(directory)
    table = classify(directory, quiet=True)
    tw = twins(directory, quiet=True)
    med = lambda xs: None if not xs else round(st.median(xs), 3)
    seeds = sorted({k[1] for k in summ if k[0] == 'Y'})

    def paired(a, b, scripts, hold):
        ds = []
        for k, s in summ.items():
            if k[0] != a or k[2] not in scripts or s.get('stand') is None:
                continue
            o = summ.get((b,) + k[1:])
            if o is None or o.get('stand') != s.get('stand'):
                continue
            fa, fb = min(hold, fall5(s)), min(hold, fall5(o))
            ds.append((round(fa - fb, 4), k, fa, fb))
        return ds

    def report(title, ds):
        d = [x[0] for x in ds]
        if not d:
            print(f'- {title}: no pairs')
            return None
        print(f"- **{title}:** n {len(d)}; later {sum(x >= 0.25 for x in d)} / sooner {sum(x <= -0.25 for x in d)} / same {sum(abs(x) < 0.25 for x in d)}; median {med(d):+.3f} s; worse by >= 0.5 s: {sum(x <= -0.5 for x in d)}")
        mv = sorted(ds, key=lambda x: -abs(x[0]))[:6]
        print('  - most moved: ' + '; '.join(f"s{k[1]}w{k[3]} {k[2]} {fb:.2f} -> {fa:.2f} ({dd:+.2f})" for dd, k, fa, fb in mv))
        return d

    print(f'Seeds with Y: {seeds}. Paired by stand; censored at the hold; later/sooner = |diff| >= 0.25 s. "A -> Y" reads base -> Y.\n')
    print('### Main line: turns his way (cueCL, cueCR), Y - A')
    d = report('Y - A, his way', paired('Y', 'A', ('cueCL', 'cueCR'), 5.0))
    if d:
        later, sooner, worse = sum(x >= 0.25 for x in d), sum(x <= -0.25 for x in d), sum(x <= -0.5 for x in d)
        ok = med(d) >= 0.10 and later > sooner and worse <= 2
        bad = med(d) < 0 or sooner > later
        print(f"  - verdict: {'PASS' if ok else 'FAIL' if bad else 'between'} (pass: median >= +0.10, later > sooner, <= 2 worse by >= 0.5; fail: median < 0 or sooner > later)")
    print('\n### Turns his way, Y - B, and B\'s in-window turn-caused falls')
    d = report('Y - B, his way', paired('Y', 'B', ('cueCL', 'cueCR'), 5.0))
    btc = tw.get(('B', 'turn, his way'), {}).get('tc', [])
    inwin = [k for k in btc if table.get(k, {}).get('final') and 0.3 <= table[k]['final']['t'] <= 1.5]
    moved = 0
    for k in sorted(inwin, key=lambda k: (k[1], k[3], k[2])):
        y = table.get(('Y',) + k[1:])
        if y is None:
            print(f'  - s{k[1]}w{k[3]} {k[2]}: no Y rider')
            continue
        yf = y.get('final')
        out = y['cls'] == 'held' or y.get('fell') is None or y['fell'] > 5 or (yf is not None and not (0.3 <= yf['t'] <= 1.5))
        moved += out
        ytxt = 'held 5 s' if y['cls'] == 'held' else 'fell %s, final escape %s' % (y.get('fell'), ('%.2f s (sched %s)' % (yf['t'], yf['sched'])) if yf else 'none')
        print(f"  - s{k[1]}w{k[3]} {k[2]}: B final escape {table[k]['final']['t']:.2f} s (sched {table[k]['final']['sched']}), fell {table[k]['fell']}; Y: {ytxt} -> {'out of the window' if out else 'still in the window'}")
    if d is not None:
        ok = med(d) > 0 and sum(x >= 0.25 for x in d) > sum(x <= -0.25 for x in d) and moved >= 6
        bad = med(d) < 0 or sum(x <= -0.25 for x in d) > sum(x >= 0.25 for x in d) or moved <= 3
        print(f"  - {moved} of {len(inwin)} moved out; verdict: {'PASS' if ok else 'FAIL' if bad else 'between'}")
    print('\n### Turns steer only (cueL, cueR): reported, no line')
    report('Y - A, steer only', paired('Y', 'A', ('cueL', 'cueR'), 5.0))
    report('Y - B, steer only', paired('Y', 'B', ('cueL', 'cueR'), 5.0))
    report('B - A, steer only (3.5x: +0.275)', paired('B', 'A', ('cueL', 'cueR'), 5.0))
    print('\n### Take-offs (cue, cueC, 3 s hold)')
    for sc in ('cue', 'cueC'):
        report(f'Y - A, {sc}', paired('Y', 'A', (sc,), 3.0))
    both = paired('Y', 'A', ('cue', 'cueC'), 3.0)
    lost = [(k, fa) for dd, k, fa, fb in both if fb >= 3.0 - 1e-9 and fa < 3.0 - 1e-9]
    d = [x[0] for x in both]
    if d:
        print(f"  - both scripts: median {med(d):+.3f} s; stands A carries 3 s: {sum(1 for x in both if x[3] >= 3 - 1e-9)}; lost under Y: {len(lost)} {[f's{k[1]}w{k[3]} {k[2]} {fa:.2f}' for k, fa in lost]}; verdict: {'PASS' if not lost and abs(med(d)) <= 0.1 else 'FAIL'}")
    print('\n### Neutral riders (cue, cueC as the turn twins, ridden 5 s)')
    d = report('Y - A, neutral, 5 s', paired('Y', 'A', ('cue', 'cueC'), 5.0))
    if d:
        print(f"  - verdict: {'PASS' if abs(med(d)) <= 0.1 else 'FAIL'} (median within +-0.1 s)")
    print('\n### Y beside R')
    for scripts, title in DRIVES:
        report(f'Y - R, {title}', paired('Y', 'R', scripts, 5.0))


if __name__ == '__main__':
    d = sys.argv[1]
    what = sys.argv[2] if len(sys.argv) > 2 else 'classify'
    if what == 'checks':
        checks(d)
    elif what == 'classify':
        classify(d)
    elif what == 'climb':
        climb(d)
    elif what == 'ticks':
        climb_ticks(d, sys.argv[3], int(sys.argv[4]), sys.argv[5], int(sys.argv[6]), float(sys.argv[7]) if len(sys.argv) > 7 else 1.0)
    elif what == 'summary':
        summary(d)
    elif what == 'diverge':
        divergence(d, *(sys.argv[3:5] if len(sys.argv) > 4 else ('A', 'B')))
    elif what == 'compact':
        compact(d, sys.argv[3])
    elif what == 'twins':
        twins(d)
    elif what == 'lines':
        lines(d)
