"""Step 3.5z reader (take-off-stall.md). Reads organic runs of `what-fails-first.ts` (the saved A baseline) and of
`take-off-stall.ts` (the trim arms), one file per process, `o-s<seed>-<tag>.jsonl`.

    python3 take-off-stall.py repro <new dir> <tag> <baseline dir>...   # cue/cueC rows against the saved A rows
    python3 take-off-stall.py inert <new dir> <tag on> <tag off>         # Z35=off against on, every script
    python3 take-off-stall.py table <tag> <dir>...                       # the fall table, classes, lasting medians
    python3 take-off-stall.py sep <tag> <dir>...                         # the separators at matched stand speed
    python3 take-off-stall.py chain <tag> <dir>...                       # the chain's order, the ledger, authority
    python3 take-off-stall.py pairs <tag> <dir>...                       # trim arms and Compress, paired by stand
    python3 take-off-stall.py nose <tag> <dir>...                        # the falls over the nose
    python3 take-off-stall.py never <tag> <dir>...                       # the paddle twin on the fall's waves
    python3 take-off-stall.py dump <tag> <dir> <seed> <script> <wave> [t0 t1 step]

Times are seconds after the first standing frame; the frame is the board's (+ toward the nose, `pitch` + nose up, deg,
world); vW is the horizontal |v_board - flow| (m/s); sched the controller's schedule speed; W the pair's weight.
`<tag>` picks files `o-s<seed>-<tag>.jsonl` in each `<dir>` (A for the saved baseline).
"""
import gzip
import json
import math
import os
import re
import statistics as st
import sys

DT = 1 / 60
W_PAIR = 741.0  # the pair's weight, N (3.5t)
FORE = ('cue', 'cueC', 'cueT', 'cueCT', 'cueTx', 'cueCTx', 'cueTB')
WATER = ('pressure', 'buoyancy', 'suction', 'friction', 'fins', 'rails', 'froth', 'addedMass', 'radiation')


def load(path):
    op = gzip.open if path.endswith('.gz') else open
    with op(path, 'rt') as fh:
        return [json.loads(line) for line in fh if line.strip()]


def files(tag, dirs):
    out = {}
    for d in dirs:
        for name in sorted(os.listdir(d)):
            m = re.match(r'o-s(\d+)-' + re.escape(tag) + r'\.jsonl(\.gz)?$', name)
            if m:
                out[int(m.group(1))] = os.path.join(d, name)
    return dict(sorted(out.items()))


def med(xs, n=2):
    xs = [x for x in xs if x is not None]
    return None if not xs else round(st.median(xs), n)


def fmt(v, n=2):
    if v is None:
        return '—'
    if isinstance(v, float):
        return f'{v:.{n}f}'
    return str(v)


# ------------------------------------------------------------------------------------------------------------------
class Stand:
    """One rider that stood: its frames from the cue, its stand row and summary."""

    def __init__(self, seed, s, frames, stand):
        self.seed, self.script, self.wave = seed, s['script'], s['wave']
        self.summary, self.standrow = s, stand
        self.fell = s.get('fellAfterStand')
        self.fall3 = self.fell is not None and self.fell <= 3.0 + 1e-9
        self.all = sorted(frames, key=lambda x: x['t'])
        self.fr = [x for x in self.all if x.get('tS') is not None and x['tS'] >= -1e-9 and x.get('ph') in ('standing', 'landing')]
        self.st = [x for x in self.fr if x.get('ph') == 'standing']
        self.f0 = self.st[0] if self.st else None
        self.cuef = next((x for x in self.all if x.get('cue') == 1), None)
        self.key = (seed, self.script, self.wave)

    def at(self, t):
        best = None
        for x in self.st:
            if x['tS'] <= t + 1e-9:
                best = x
            else:
                break
        if best is None or t - best['tS'] > 0.05:
            return None
        return best

    def fall_time(self, hold=3.0):
        return hold if self.fell is None or self.fell > hold else self.fell


def stands_of(path, scripts=FORE):
    rows = load(path)
    seed = next(x for x in rows if x.get('kind') == 'control')['seed']
    frames, standrows = {}, {}
    for x in rows:
        k = x.get('kind')
        if k == 'f' and x.get('script') in scripts:
            frames.setdefault((x['script'], x['wave']), []).append(x)
        elif k == 'stand':
            standrows[(x['script'], x['wave'])] = x
    out = []
    for s in rows:
        if s.get('kind') != 'summary' or s.get('script') not in scripts or s.get('stand') is None:
            continue
        out.append(Stand(seed, s, frames.get((s['script'], s['wave']), []), standrows.get((s['script'], s['wave']))))
    return out, rows


def all_stands(tag, dirs, scripts=FORE):
    out = []
    for seed, path in files(tag, dirs).items():
        ss, _ = stands_of(path, scripts)
        out.extend(ss)
    return out


# ------------------------------------------------------------------------------------------------------------------
def lost(x):
    return (x.get('headX') is not None and x['headX'] <= 0) or (x.get('cps') or {}).get('inf', 0) > 0 or x.get('beyond') == 1 or (x.get('pastZ') or 0) > 0


def kind_of(x):
    if (x.get('headX') is not None and x['headX'] <= 0) or (x.get('cps') or {}).get('inf', 0) > 0 or x.get('beyond') == 1:
        return 'lateral'
    if (x.get('pastZ') or 0) > 0:
        return 'F-nose' if (x.get('capZ') or 0) > 0 else 'F-tail'
    return 'none'


def final_escape(s):
    """3.5x section 0.10: the onset of the last run of margin loss that ends in the separation (gaps <= 0.05 s)."""
    fr = [x for x in s.fr if x['tS'] > 0]
    onset = None
    for x in reversed(fr):
        if lost(x):
            onset = x
        elif onset is not None and onset['tS'] - x['tS'] > 0.05 + 1e-9:
            break
    return onset


def first_escape(s):
    return next((x for x in s.fr if x['tS'] > 0 and lost(x)), None)


def marks(s, p_t=15.0, v_t=3.0):
    """tW, tT and the final escape (onset frame, kind)."""
    fr = [x for x in s.st if x['tS'] > 0]
    tW = None
    run = 0
    for i, x in enumerate(fr):
        if x.get('ahead') is not None and x['ahead'] <= 0.5:
            tW = x['tS']
            break
        if x.get('fall') is not None and x['fall'] <= 0:
            run += 1
            if run >= 6:
                tW = fr[i - 5]['tS']
                break
        else:
            run = 0
    tT = next((x['tS'] for x in fr if (x.get('pitch') or -99) >= p_t and (x.get('vW') or 99) < v_t and (x.get('ahead') is None or x['ahead'] > 0.5)), None)
    e = final_escape(s)
    if e is None:
        tE, kind = (s.fell if s.fell is not None else None), 'none'
    else:
        tE, kind = e['tS'], kind_of(e)
    return tW, tT, tE, kind, e


def classify(s, p_t=15.0, v_t=3.0):
    if not s.fall3:
        return 'held', {}
    if not s.st or s.fell <= 0.1 + 1e-9:
        return 'P', {}
    tW, tT, tE, kind, e = marks(s, p_t, v_t)
    inf = 99.0
    info = {'tW': tW, 'tT': tT, 'tE': tE, 'kind': kind, 'e': e}
    if tW is not None and tW <= min(tT if tT is not None else inf, tE if tE is not None else inf) + 1e-9:
        return 'W', info
    if tT is not None and tE is not None and tT <= tE + 1e-9:
        return 'T', info
    if kind == 'F-nose':
        return 'N', info
    if kind == 'lateral':
        return 'L', info
    return 'X', info


def wff_class(s):
    """3.5x's registered class (section 0.4) via its reader, for the table."""
    try:
        import importlib.util
        here = os.path.dirname(os.path.abspath(__file__))
        spec = importlib.util.spec_from_file_location('wff', os.path.join(here, 'what-fails-first.py'))
        wff = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(wff)
        frames = [x for x in s.all]
        c = wff.classify_rider('A', s.script, s.summary, frames, 3.0)
        return c.get('cls'), c.get('tEsc'), (c.get('final') or {}).get('t')
    except Exception as exc:  # noqa
        return f'? {exc}', None, None


# ------------------------------------------------------------------------------------------------------------------
def sched_at(s, t):
    prev = [x for x in s.fr if x.get('ctl') and x['tS'] <= t + 1e-9]
    return prev[-1]['ctl']['speed'] if prev else None


def table(tag, dirs):
    ss = all_stands(tag, dirs, ('cue', 'cueC'))
    rows = []
    for s in ss:
        cls, info = classify(s)
        rows.append((s, cls, info))
    print(f'## The fall table: A take-offs that separate within 3 s (tag {tag}, seeds {sorted({s.seed for s in ss})})\n')
    print('Stand columns at tS = 0: vW / sched (m/s), pitch (deg, + nose up), tail immersion (m), copZ, capZ (m, + nose), feltDev (deg, + forward), frontShare (stand row).')
    print('Escapes: first and final (tS, kind). At +0.35 and +0.7 s: vW, pitch, Fp (W). Wave at the stand: faceFrac, ahead (m), fall (deg, slope ahead).\n')
    print('| rider | fell (s) | class (3.5x) | stand vW / sched | pitch | tail | copZ | capZ | feltDev | frontShare | first esc | final esc | tW / tT | +0.35 vW, pitch, Fp | +0.7 vW, pitch, Fp | wave: face, ahead, fall |')
    print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    for s, cls, info in sorted(rows, key=lambda r: (r[0].script, r[0].seed, r[0].wave)):
        if cls == 'held':
            continue
        f0 = s.f0 or {}
        fe = first_escape(s)
        w = wff_class(s)
        a35, a70 = s.at(0.35), s.at(0.7)
        g = lambda x: '—' if x is None else f"{fmt(x.get('vW'))}, {fmt(x.get('pitch'), 1)}, {fmt(x.get('Fp'))}"
        fs = (s.standrow or {}).get('report', {}).get('frontShare')
        print(f"| s{s.seed}w{s.wave} {s.script} | {fmt(s.fell, 3)} | **{cls}** ({w[0]}) | {fmt(f0.get('vW'))} / {fmt(sched_at(s, 0.1))} | {fmt(f0.get('pitch'), 1)} | {fmt(f0.get('tail'))} | {fmt(f0.get('copZ'), 3)} | {fmt(f0.get('capZ'), 3)} | {fmt(f0.get('feltDev'), 1)} | {fmt(fs)} | "
              f"{'—' if fe is None else fmt(fe['tS']) + ' ' + kind_of(fe)} | {fmt(info.get('tE'))} {info.get('kind', '')} | {fmt(info.get('tW'))} / {fmt(info.get('tT'))} | {g(a35)} | {g(a70)} | {fmt(f0.get('faceFrac'))}, {fmt(f0.get('ahead'))}, {fmt(f0.get('fall'), 1)} |")
    # lasting medians
    print('\n### Medians: falls against lasting stands (per drive)\n')
    print('| drive | group | n | stand vW | sched | pitch | tail | copZ | capZ | feltDev | frontShare | +0.35 vW / pitch / Fp | +0.7 vW / pitch / Fp |')
    print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    for drive in ('cue', 'cueC'):
        for grp in ('fall', 'lasting'):
            g = [s for s, c, i in rows if s.script == drive and ((c != 'held') == (grp == 'fall'))]
            f0 = [s.f0 or {} for s in g]
            m = lambda k, xs=f0, n=2: med([x.get(k) for x in xs], n)
            a35 = [s.at(0.35) or {} for s in g]
            a70 = [s.at(0.7) or {} for s in g]
            fs = med([(s.standrow or {}).get('report', {}).get('frontShare') for s in g])
            print(f"| {drive} | {grp} | {len(g)} | {m('vW')} | {med([sched_at(s, 0.1) for s in g])} | {m('pitch', f0, 1)} | {m('tail')} | {m('copZ', f0, 3)} | {m('capZ', f0, 3)} | {m('feltDev', f0, 1)} | {fs} | {m('vW', a35)} / {m('pitch', a35, 1)} / {m('Fp', a35)} | {m('vW', a70)} / {m('pitch', a70, 1)} / {m('Fp', a70)} |")
    print('\n### Class counts (registered thresholds, and the two sensitivity pairs)\n')
    print('| thresholds | drive | stood | fell <= 3 s | P | W | T | N | L | X |')
    print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    for p_t, v_t in ((15, 3.0), (10, 3.3), (20, 2.5)):
        for drive in ('cue', 'cueC'):
            g = [s for s in ss if s.script == drive]
            cs = [classify(s, p_t, v_t)[0] for s in g]
            n = lambda c: sum(1 for x in cs if x == c)
            print(f"| +{p_t} deg, {v_t} m/s | {drive} | {len(g)} | {len(g) - n('held')} | {n('P')} | {n('W')} | {n('T')} | {n('N')} | {n('L')} | {n('X')} |")
    return rows


# ------------------------------------------------------------------------------------------------------------------
def auc(pos, neg):
    pos = [x for x in pos if x is not None]
    neg = [x for x in neg if x is not None]
    if not pos or not neg:
        return None, 0
    s = 0.0
    for a in pos:
        for b in neg:
            s += 1.0 if a > b else 0.5 if a == b else 0.0
    return s / (len(pos) * len(neg)), len(pos) * len(neg)


def matched_auc(pairs):
    s, n = 0.0, 0
    for a, b in pairs:
        if a is None or b is None:
            continue
        s += 1.0 if a > b else 0.5 if a == b else 0.0
        n += 1
    return (s / n if n else None), n


def feature(s, name):
    f0 = s.f0 or {}
    lat = f0.get('lat') or {}
    rep = (s.standrow or {}).get('report', {})
    a2 = s.at(0.2) or {}
    if name in ('frontShare', 'landingPeak'):
        return rep.get(name)
    if name == 'sched':
        return sched_at(s, 0.1)
    if name in ('slopeDeg', 'hdgFall'):
        return lat.get(name)
    if name == 'dPitch0.2':
        return None if a2.get('pitch') is None or f0.get('pitch') is None else a2['pitch'] - f0['pitch']
    if name == 'dvW0.2':
        return None if a2.get('vW') is None or f0.get('vW') is None else a2['vW'] - f0['vW']
    if name == 'dFeltDev0.2':
        return None if a2.get('feltDev') is None or f0.get('feltDev') is None else a2['feltDev'] - f0['feltDev']
    if name == 'dCopZ0.2':
        return None if a2.get('copZ') is None or f0.get('copZ') is None else a2['copZ'] - f0['copZ']
    if name == 'trkT0.2':
        xs = [(x.get('z35') or {}).get('trkT') for x in s.st if 0 <= x['tS'] <= 0.2]
        xs = [x for x in xs if x is not None]
        return None if not xs else sum(xs) / len(xs) / W_PAIR
    if name.startswith('cue.'):
        c = s.cuef or {}
        return c.get(name[4:])
    if name.startswith('pop.') or name.startswith('land.'):
        ph = 'push' if name.startswith('pop.') else 'landing'
        c = next((x for x in s.all if x.get('ph') == ph), None) or {}
        return c.get(name.split('.', 1)[1])
    if name in ('dPitchLand', 'dTailLand', 'dvWLand'):
        c = next((x for x in s.all if x.get('ph') == 'landing'), None)
        k = {'dPitchLand': 'pitch', 'dTailLand': 'tail', 'dvWLand': 'vW'}[name]
        return None if c is None or c.get(k) is None or f0.get(k) is None else f0[k] - c[k]
    if name == 'pitchRate0':
        a = s.at(0.05) or {}
        return None if a.get('pitch') is None or f0.get('pitch') is None else (a['pitch'] - f0['pitch']) / max(1e-6, a['tS'])
    return f0.get(name)


FEATURES = ['vW', 'sched', 'pitch', 'tail', 'nose', 'footR', 'copZ', 'capZ', 'feltDev', 'ref', 'ank', 'rest', 'hip', 'legBw', 'Fp', 'Fb',
            'faceFrac', 'ahead', 'fall', 'slopeDeg', 'hdgFall', 'frontShare', 'landingPeak', 'dPitch0.2', 'dvW0.2', 'dFeltDev0.2', 'dCopZ0.2', 'trkT0.2',
            'cue.vW', 'cue.pitch', 'cue.faceFrac', 'cue.ahead', 'cue.fall']
# Descriptive, added after the baseline read (not in section 0.6): the pop-up's push and landing.
FEATURES_POP = ['pop.vW', 'pop.pitch', 'pop.tail', 'pop.ahead', 'pop.fall', 'pop.faceFrac', 'land.vW', 'land.pitch', 'land.tail', 'land.ahead', 'land.fall',
                'land.faceFrac', 'land.Fb', 'land.Fp', 'dPitchLand', 'dTailLand', 'dvWLand', 'pitchRate0']


def separators(tag, dirs, tol=0.25, feats=None):
    ss = all_stands(tag, dirs, ('cue', 'cueC'))
    print(f'## Separators: falls (<= 3 s) against lasting stands, at the stand (tS = 0), the cue, and over 0-0.2 s; matched pairs |dvW| <= {tol} m/s at the stand\n')
    print('| feature | cue: fall / lasting median | cue AUC (n) | cue matched AUC (pairs) | cueC AUC | cueC matched AUC (pairs) | beats speed |')
    print('| --- | --- | --- | --- | --- | --- | --- |')
    for name in feats or FEATURES:
        cells = []
        beats = True
        for drive in ('cue', 'cueC'):
            g = [s for s in ss if s.script == drive]
            fa = [s for s in g if s.fall3]
            la = [s for s in g if not s.fall3]
            a, n = auc([feature(s, name) for s in fa], [feature(s, name) for s in la])
            pairs = [(feature(x, name), feature(y, name)) for x in fa for y in la
                     if x.f0 and y.f0 and abs(x.f0['vW'] - y.f0['vW']) <= tol]
            ma, mn = matched_auc(pairs)
            if drive == 'cue':
                cells.append(f"{fmt(med([feature(s, name) for s in fa], 3), 3)} / {fmt(med([feature(s, name) for s in la], 3), 3)}")
            cells.append(f'{fmt(a)} ({len(fa)}/{len(la)})')
            cells.append(f'{fmt(ma)} ({mn})')
            beats = beats and ma is not None and mn >= 10 and (ma >= 0.8 or ma <= 0.2)
        print(f"| {name} | {' | '.join(cells)} | {'**yes**' if beats else ''} |")


# ------------------------------------------------------------------------------------------------------------------
def events(s):
    """Section 0.8's chain events: first tS of each (None if never within 3 s)."""
    f0 = s.f0
    if f0 is None:
        return {}
    ev = {}
    for x in s.st:
        t = x['tS']
        if t <= 0 or t > 3.0:
            continue
        if 'dev' not in ev and x.get('feltDev') is not None and f0.get('feltDev') is not None and x['feltDev'] <= f0['feltDev'] - 3:
            ev['dev'] = t
        if 'ref' not in ev and x.get('ref') is not None and f0.get('ref') is not None and x['ref'] <= f0['ref'] - 3:
            ev['ref'] = t
        if 'copAft' not in ev and x.get('copZ') is not None and (x['copZ'] - (x.get('copT') or 0)) <= -0.02:
            ev['copAft'] = t
        if 'nose' not in ev and x.get('pitch') is not None and x['pitch'] >= f0['pitch'] + 3:
            ev['nose'] = t
        if 'slow' not in ev and x.get('vW') is not None and x['vW'] <= f0['vW'] - 0.3:
            ev['slow'] = t
        hr = (x.get('z35') or {}).get('hipR')
        if hr is None and x.get('legRest') is not None:
            hr = math.degrees(hip_range(-x['legRest']))
        if 'hip' not in ev and x.get('hip') is not None and hr is not None and abs(x['hip']) >= hr - 0.5:
            ev['hip'] = t
        tk = (x.get('z35') or {}).get('trkT')
        if 'brake' not in ev and tk is not None and tk / W_PAIR <= -0.1:
            ev['brake'] = t
    return ev


def hip_range(depth):
    d = max(0.0, depth)
    if d <= 0.195:
        return 1.2 - (0.4 * d) / 0.195
    if d <= 0.3:
        return 0.8 - (0.4 * (d - 0.195)) / 0.105
    return max(0.3, 0.4 - (0.1 * (d - 0.3)) / 0.15)


def window_sum(s, t0, t1, field):
    out = {}
    for x in s.fr:
        if t0 - 1e-9 <= x['tS'] <= t1 + 1e-9:
            for k, v in ((x.get('led') or {}).get(field) or {}).items():
                out[k] = out.get(k, 0) + v
    return out


def authority(s, cls, info):
    tT, tE = info.get('tT'), info.get('tE')
    if tE is None:
        return None
    rec = -1 if cls == 'N' else 1
    on0, on1 = (tT - 0.2, tT) if tT is not None else (tE - 0.3, tE - 0.1)
    def sat(x):
        hr = (x.get('z35') or {}).get('hipR')
        if hr is None and x.get('legRest') is not None:
            hr = math.degrees(hip_range(-x['legRest']))
        edge = x.get('headZ') is not None and x['headZ'] <= 0 and (x.get('copZ') or 0) * rec > 0
        ank = abs(x.get('ank') or 0) >= 44.5 or abs(x.get('rest') or 0) >= 44.5
        hip = x.get('hip') is not None and hr is not None and abs(x['hip']) >= hr - 0.5
        return edge or ank or hip, {'edge': edge, 'ank': ank, 'hip': hip}
    last = [x for x in s.st if tE - 0.1 - 1e-9 <= x['tS'] <= tE + 1e-9]
    onset = [x for x in s.st if on0 - 1e-9 <= x['tS'] <= on1 + 1e-9]
    sat_last = bool(last) and all(sat(x)[0] for x in last)
    which = {k: sum(1 for x in last if sat(x)[1][k]) for k in ('edge', 'ank', 'hip')}
    away = sum(1 for x in onset if x.get('copZ') is not None and (x['copZ'] - (x.get('copT') or 0)) * rec < -0.01)
    led = window_sum(s, max(0, on0), on1, 'pitchDn')
    noseup = sorted(((k, v) for k, v in led.items() if v < 0), key=lambda kv: kv[1])
    lead = noseup[0][0] if noseup else None
    if cls == 'W':
        verdict = 'outside'
    elif not sat_last or (onset and away > len(onset) / 2):
        verdict = 'within'
    elif lead in WATER:
        verdict = 'outside'
    else:
        verdict = 'edge'
    return {'satLast': sat_last, 'which': which, 'nLast': len(last), 'away': away, 'nOnset': len(onset), 'lead': lead, 'noseup': noseup[:3], 'verdict': verdict}


def chain(tag, dirs):
    ss = all_stands(tag, dirs, ('cue', 'cueC'))
    names = ('dev', 'ref', 'copAft', 'nose', 'slow', 'hip', 'brake')
    print('## The chain\'s order (section 0.8): first tS of each event within 3 s\n')
    print('dev: feltDev >= 3 deg back of the stand; ref: reference >= 3 deg back; copAft: copZ - copT <= -0.02 m; nose: pitch >= 3 deg above the stand; slow: vW >= 0.3 m/s below the stand; hip: at its range; brake: trkT <= -0.1 W.\n')
    print('| drive | group | n | ' + ' | '.join(f'{k}: share reached, median t' for k in names) + ' | first (counts) |')
    print('| --- | --- | --- | ' + ' | '.join('---' for _ in names) + ' | --- |')
    for drive in ('cue', 'cueC'):
        for grp in ('T falls', 'other falls', 'lasting'):
            g = []
            for s in ss:
                if s.script != drive:
                    continue
                cls, info = classify(s)
                if (grp == 'T falls' and cls == 'T') or (grp == 'other falls' and cls not in ('T', 'held')) or (grp == 'lasting' and cls == 'held'):
                    g.append(s)
            evs = [events(s) for s in g]
            cells = []
            for k in names:
                ts = [e[k] for e in evs if k in e]
                cells.append(f'{len(ts)}/{len(g)}, {fmt(med(ts))}')
            firsts = {}
            for e in evs:
                if e:
                    k = min(e, key=e.get)
                    firsts[k] = firsts.get(k, 0) + 1
            print(f"| {drive} | {grp} | {len(g)} | {' | '.join(cells)} | {firsts} |")
    print('\n## Per fall: the chain, the pitch ledger over [0, tT or tE] (rad/s, + nose down), the along-track budget, authority\n')
    print('| rider | class | events (t) | pitch ledger: largest nose-up / nose-down | trk at tT (W): largest | ref parts at stand -> tT: face / dev / off / ref / lean | rest, hip / hipR, copZ - copT at tT | authority |')
    print('| --- | --- | --- | --- | --- | --- | --- | --- |')
    for s in sorted(ss, key=lambda s: (s.script, s.seed, s.wave)):
        cls, info = classify(s)
        if cls in ('held', 'P'):
            continue
        ev = events(s)
        t1 = info.get('tT') if info.get('tT') is not None else info.get('tE')
        led = window_sum(s, 0, t1 or 0, 'pitchDn')
        up = sorted(((k, round(v, 2)) for k, v in led.items() if v < 0), key=lambda kv: kv[1])[:3]
        dn = sorted(((k, round(v, 2)) for k, v in led.items() if v > 0), key=lambda kv: -kv[1])[:2]
        xt = s.at(t1) if t1 is not None else None
        z = (xt or {}).get('z35') or {}
        trk = z.get('trk') or {}
        trks = ', '.join(f'{k} {v / W_PAIR:+.2f}' for k, v in sorted(trk.items(), key=lambda kv: -abs(kv[1]))[:3])
        z0 = (s.f0 or {}).get('z35') or {}
        parts = lambda zz, xx: f"{fmt(zz.get('face'), 1)} / {fmt(zz.get('dev', (xx or {}).get('feltDev')), 1)} / {fmt(zz.get('off'), 1)} / {fmt(zz.get('ref', (xx or {}).get('ref')), 1)} / {fmt(zz.get('lean'), 1)}"
        au = authority(s, cls, info) or {}
        x = xt or {}
        hr = z.get('hipR') if z.get('hipR') is not None else (None if x.get('legRest') is None else round(math.degrees(hip_range(-x['legRest'])), 1))
        print(f"| s{s.seed}w{s.wave} {s.script} | {cls} | {', '.join(f'{k} {v:.2f}' for k, v in sorted(ev.items(), key=lambda kv: kv[1]))} | {up} / {dn} | {fmt((z.get('trkT') or 0) / W_PAIR) if z else '—'}: {trks} | {parts(z0, s.f0)} -> {parts(z, xt)} | {fmt(x.get('rest'), 1)}, {fmt(x.get('hip'), 1)} / {fmt(hr, 1)}, {fmt(None if x.get('copZ') is None else x['copZ'] - (x.get('copT') or 0), 3)} | {au.get('verdict')} (sat last {au.get('satLast')} {au.get('which')}/{au.get('nLast')}; away {au.get('away')}/{au.get('nOnset')}; lead {au.get('lead')}) |")


# ------------------------------------------------------------------------------------------------------------------
def pairs(tag, dirs):
    ss = all_stands(tag, dirs)
    by = {(s.seed, s.wave, s.script): s for s in ss}
    print('## Paired by stand (the same stand; fall time censored at 3 s, and at 5 s)\n')
    print('| pair | n | later / sooner / same (0.25 s), 3 s | median diff 3 s | later / sooner, 5 s | median diff 5 s | rescued (fell <= 3 s -> lasts) | lost (lasted -> falls <= 3 s) | vW at +0.7: median diff | pitch at +0.7: median diff | new N <= 3 s / N <= 5 s |')
    print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    for a, b in (('cueT', 'cue'), ('cueTx', 'cue'), ('cueTB', 'cue'), ('cueCT', 'cueC'), ('cueCTx', 'cueC'), ('cueC', 'cue'), ('cueCT', 'cue'), ('cueT', 'cueTx')):
        d3, d5, dv, dp, resc, lostl, newN3, newN5 = [], [], [], [], [], [], 0, 0
        n = 0
        for (seed, wave, script), x in by.items():
            if script != a:
                continue
            y = by.get((seed, wave, b))
            if y is None or y.summary.get('stand') != x.summary.get('stand'):
                continue
            n += 1
            d3.append(x.fall_time(3) - y.fall_time(3))
            d5.append(x.fall_time(5) - y.fall_time(5))
            if y.fall3 and not x.fall3:
                resc.append(f's{seed}w{wave}')
            if x.fall3 and not y.fall3:
                lostl.append(f's{seed}w{wave}')
            for t, lst, key in ((0.7, dv, 'vW'), (0.7, dp, 'pitch')):
                u, v = x.at(t), y.at(t)
                if u and v and u.get(key) is not None and v.get(key) is not None:
                    lst.append(u[key] - v[key])
            cx, ix = classify(x)
            cy, iy = classify(y)
            if cx == 'N' and cy != 'N':
                newN3 += 1
            e5x = final_escape(x)
            e5y = final_escape(y)
            if x.fell is not None and e5x is not None and kind_of(e5x) == 'F-nose' and not (y.fell is not None and e5y is not None and kind_of(e5y) == 'F-nose'):
                newN5 += 1
        if n:
            print(f"| {a} - {b} | {n} | {sum(d >= 0.25 for d in d3)} / {sum(d <= -0.25 for d in d3)} / {sum(abs(d) < 0.25 for d in d3)} | {med(d3, 3):+.3f} | {sum(d >= 0.25 for d in d5)} / {sum(d <= -0.25 for d in d5)} | {med(d5, 3):+.3f} | {len(resc)} {resc} | {len(lostl)} {lostl} | {fmt(med(dv))} | {fmt(med(dp, 1), 1)} | {newN3} / {newN5} |")
    # per fall of the base: what each arm does
    print('\n### Each base fall (<= 3 s) under the arms: fall time (s; >=3 = lasts the take-off), class\n')
    print('| rider | cue | cueT | cueTx | cueTB | cueC | cueCT | cueCTx |')
    print('| --- | --- | --- | --- | --- | --- | --- | --- |')
    keys = sorted({(s.seed, s.wave) for s in ss if s.script in ('cue', 'cueC') and s.fall3})
    for seed, wave in keys:
        cells = []
        for sc in ('cue', 'cueT', 'cueTx', 'cueTB', 'cueC', 'cueCT', 'cueCTx'):
            x = by.get((seed, wave, sc))
            if x is None:
                cells.append('—')
                continue
            c, _ = classify(x)
            cells.append(f"{fmt(x.fell, 2) if x.fell is not None else '>5'} {c if c != 'held' else ''}")
        print(f"| s{seed}w{wave} | {' | '.join(cells)} |")
    # Compress and the hip
    print('\n### Compress: the hip at its range (share of standing frames 0-3 s, and in the 0.3 s before the final escape)\n')
    print('| drive | n | frames at range, 0-3 s | falls with the hip at range in the last 0.3 s |')
    print('| --- | --- | --- | --- |')
    for sc in ('cue', 'cueC', 'cueT', 'cueCT'):
        g = [s for s in ss if s.script == sc]
        tot = at = 0
        fl = flat = 0
        for s in g:
            for x in s.st:
                if x['tS'] > 3:
                    break
                hr = (x.get('z35') or {}).get('hipR')
                if hr is None and x.get('legRest') is not None:
                    hr = math.degrees(hip_range(-x['legRest']))
                tot += 1
                if x.get('hip') is not None and hr is not None and abs(x['hip']) >= hr - 0.5:
                    at += 1
            if s.fall3:
                fl += 1
                e = final_escape(s)
                tE = e['tS'] if e else s.fell
                w = [x for x in s.st if tE - 0.3 <= x['tS'] <= tE]
                def atr(x):
                    hr = (x.get('z35') or {}).get('hipR')
                    if hr is None and x.get('legRest') is not None:
                        hr = math.degrees(hip_range(-x['legRest']))
                    return x.get('hip') is not None and hr is not None and abs(x['hip']) >= hr - 0.5
                if any(atr(x) for x in w):
                    flat += 1
        print(f'| {sc} | {len(g)} | {at}/{tot} | {flat}/{fl} |')


# ------------------------------------------------------------------------------------------------------------------
def nose(tag, dirs):
    ss = all_stands(tag, dirs, FORE)
    print('## Falls whose final escape is F-nose (any script, within 5 s): the 0.3 s before the onset\n')
    print('| rider | fell | class | onset t | vW | sched | pitch: -0.3 -> 0 | nose imm. -0.3 -> 0 (m) | trkT mean (W) | along ledger, largest 3 (m/s) | ref / dev / rest change (deg) | capZ -0.3 -> 0 | labels |')
    print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    for s in sorted(ss, key=lambda s: (s.seed, s.wave, s.script)):
        if s.fell is None:
            continue
        e = final_escape(s)
        if e is None or kind_of(e) != 'F-nose':
            continue
        cls, info = classify(s)
        t1 = e['tS']
        a = s.at(t1 - 0.3) or (s.f0 or {})
        tks = [(x.get('z35') or {}).get('trkT') for x in s.st if t1 - 0.3 <= x['tS'] <= t1]
        tks = [v for v in tks if v is not None]
        tk = None if not tks else sum(tks) / len(tks) / W_PAIR
        al = window_sum(s, t1 - 0.3, t1, 'along')
        top = sorted(al.items(), key=lambda kv: -abs(kv[1]))[:3]
        d = lambda k: None if a.get(k) is None or e.get(k) is None else e[k] - a[k]
        labels = []
        if tk is not None and tk <= -0.15 and top and top[0][0] in WATER:
            labels.append('deceleration throw')
        if d('nose') is not None and d('nose') >= 0.05 and (e.get('pitch') or 0) <= -10:
            labels.append('nose dig')
        tref = next((x['tS'] for x in s.st if t1 - 0.3 <= x['tS'] <= t1 and x.get('ref') is not None and a.get('ref') is not None and x['ref'] >= a['ref'] + 3), None)
        if tref is not None:
            labels.append('pitch loop')
        print(f"| s{s.seed}w{s.wave} {s.script} | {fmt(s.fell, 3)} | {cls} | {fmt(t1)} | {fmt(e.get('vW'))} | {fmt(sched_at(s, t1))} | {fmt(a.get('pitch'), 1)} -> {fmt(e.get('pitch'), 1)} | {fmt(a.get('nose'))} -> {fmt(e.get('nose'))} | {fmt(tk)} | {', '.join(f'{k} {v:+.2f}' for k, v in top)} | {fmt(d('ref'), 1)} / {fmt(d('feltDev'), 1)} / {fmt(d('rest'), 1)} | {fmt(a.get('capZ'), 3)} -> {fmt(e.get('capZ'), 3)} | {', '.join(labels) or '—'} |")


def never(tag, dirs):
    print("## The paddle twin (`never`): its vW at the falls' sea times (trial clock), against the stand\n")
    print('| rider | class | stand trial t | stand vW / never vW at the stand | +0.35 | +0.7 | +1.0 | never: ahead at +0.7, phase |')
    print('| --- | --- | --- | --- | --- | --- | --- | --- |')
    keep = 0
    nT = 0
    for seed, path in files(tag, dirs).items():
        ss, rows = stands_of(path, ('cue', 'cueC'))
        nv = {}
        for x in rows:
            if x.get('kind') == 'f' and x.get('script') == 'never':
                nv.setdefault(x['wave'], {})[round(x['t'], 4)] = x
        for s in sorted(ss, key=lambda s: (s.script, s.wave)):
            cls, info = classify(s)
            if cls == 'held':
                continue
            t0 = s.summary['stand']
            tw = nv.get(s.wave, {})
            def nat(dt):
                tt = sorted(tw)
                best = None
                for t in tt:
                    if t <= t0 + dt + 1e-6:
                        best = tw[t]
                    else:
                        break
                return best if best is not None and t0 + dt - best['t'] < 0.05 else None
            def sv(dt):
                x = s.at(dt)
                return None if x is None else x.get('vW')
            cells = []
            for dt in (0.0, 0.35, 0.7, 1.0):
                n_ = nat(dt)
                cells.append(f"{fmt(sv(dt))} / {fmt(None if n_ is None else n_.get('vW'))}")
            n7 = nat(0.7)
            if cls == 'T':
                nT += 1
                vs = [nat(dt) for dt in (0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7)]
                if all(v is not None and v.get('vW', 0) >= 3.6 for v in vs):
                    keep += 1
            print(f"| s{seed}w{s.wave} {s.script} | {cls} | {fmt(t0, 3)} | {' | '.join(cells)} | {fmt(None if n7 is None else n7.get('ahead'))}, {None if n7 is None else n7.get('ph')} |")
    print(f'\nT falls whose paddle twin keeps vW >= 3.6 m/s from the stand through +0.7 s: {keep} of {nT}')


# ------------------------------------------------------------------------------------------------------------------
def repro(new_dir, tag, base_dirs):
    newf = files(tag, [new_dir])
    basef = files('A', base_dirs)
    for seed, path in newf.items():
        if seed not in basef:
            print(f'- s{seed}: no saved A file')
            continue
        new = load(path)
        old = load(basef[seed])
        ctl = next(x for x in new if x.get('kind') == 'control')
        sts = {(x.get('plantFloor'), x.get('plantSpeed')) for x in new if x.get('kind') == 'stand'}
        so = {(x['script'], x['wave']): x for x in old if x.get('kind') == 'summary' and x['script'] in ('cue', 'cueC')}
        sn = {(x['script'], x['wave']): x for x in new if x.get('kind') == 'summary' and x['script'] in ('cue', 'cueC')}
        ssame = sum(1 for k, a in so.items() if k in sn and all(a.get(f) == sn[k].get(f) for f in ('cue', 'pop', 'stand', 'fell', 'fellAfterStand', 'cause')))
        fo = {(x['script'], x['wave'], x['t']): x for x in old if x.get('kind') == 'f' and x['script'] in ('cue', 'cueC')}
        fn = {(x['script'], x['wave'], x['t']): x for x in new if x.get('kind') == 'f' and x['script'] in ('cue', 'cueC')}
        same = diff = 0
        first = None
        for k, a in fo.items():
            b = fn.get(k)
            if b is None:
                diff += 1
                first = first or (k, 'missing')
                continue
            d = [f for f in a if a[f] != b.get(f)]
            if d:
                diff += 1
                first = first or (k, d[:4])
            else:
                same += 1
        extra = len(set(fn) - set(fo))
        sto = {(x['script'], x['wave']): {k: v for k, v in x.items() if k != 'weights'} for x in old if x.get('kind') == 'stand' and x['script'] in ('cue', 'cueC')}
        stn = {(x['script'], x['wave']): {k: v for k, v in x.items() if k != 'weights'} for x in new if x.get('kind') == 'stand' and x['script'] in ('cue', 'cueC')}
        stsame = sum(1 for k in sto if sto[k] == stn.get(k))
        print(f"- s{seed}: build cueLater {ctl.get('cueLater')}, (plantFloor, plantSpeed) {sorted(sts, key=str)}, probe {ctl.get('probe')}, scripts {','.join(ctl.get('scripts', []))}, trimUntil {ctl.get('trimUntil')}; "
              f"summaries {ssame}/{len(so)} identical; stand rows {stsame}/{len(sto)}; frame rows {same} identical / {diff} differ of {len(fo)} (every common field){'; first: ' + str(first) if first else ''}; new-only rows {extra}")


def inert(new_dir, tag_on, tag_off):
    on = files(tag_on, [new_dir])
    off = files(tag_off, [new_dir])
    for seed in sorted(set(on) & set(off)):
        a = load(on[seed])
        b = load(off[seed])
        ka = {(x['script'], x['wave'], x['t']): x for x in a if x.get('kind') == 'f'}
        kb = {(x['script'], x['wave'], x['t']): x for x in b if x.get('kind') == 'f'}
        same = diff = 0
        first = None
        for k, x in ka.items():
            y = kb.get(k)
            xx = {f: v for f, v in x.items() if f != 'z35'}
            if y is None or xx != y:
                diff += 1
                first = first or (k, None if y is None else [f for f in xx if xx[f] != y.get(f)][:4])
            else:
                same += 1
        sa = {(x['script'], x['wave']): x for x in a if x.get('kind') == 'summary'}
        sb = {(x['script'], x['wave']): x for x in b if x.get('kind') == 'summary'}
        ssame = sum(1 for k in sa if k in sb and {f: v for f, v in sa[k].items()} == sb[k])
        scripts = sorted({k[0] for k in ka})
        print(f'- s{seed}: frame rows {same} identical (all fields but z35) / {diff} differ of {len(ka)}; rows only off {len(set(kb) - set(ka))}; summaries {ssame}/{len(sa)} identical; scripts {scripts}{"; first: " + str(first) if first else ""}')


def dump(tag, d, seed, script, wave, t0=-0.5, t1=1.5, step=0.05):
    path = files(tag, [d])[seed]
    ss, rows = stands_of(path, (script,))
    s = next(x for x in ss if x.wave == wave)
    print(f's{seed}w{wave} {script}: stand {s.summary["stand"]}, fell {s.fell}, class {classify(s)[0]}, marks {dict((k, v) for k, v in classify(s)[1].items() if k != "e")}')
    print('| tS | ph | vW | pitch | deckP | nose | tail | footR | Fp | Fb | trkT (W) | face | dev | off | ref | lean | ank | rest | hip | copZ | copT | capZ | fs | legBw | ahead | fall | compress | trim |')
    print('|' + ' --- |' * 28)
    nxt = t0
    t_st = s.summary['stand']
    for x in s.all:
        ts = x['t'] - t_st
        if ts < nxt - 1e-9 or ts > t1:
            continue
        nxt = ts + step
        z = x.get('z35') or {}
        print(f"| {ts:.3f} | {x.get('ph')} | {fmt(x.get('vW'))} | {fmt(x.get('pitch'), 1)} | {fmt(x.get('deckP'), 1)} | {fmt(x.get('nose'))} | {fmt(x.get('tail'))} | {fmt(x.get('footR'))} | {fmt(x.get('Fp'))} | {fmt(x.get('Fb'))} | {fmt(None if z.get('trkT') is None else z['trkT'] / W_PAIR)} | {fmt(z.get('face'), 1)} | {fmt(x.get('feltDev'), 1)} | {fmt(z.get('off'), 1)} | {fmt(x.get('ref'), 1)} | {fmt(z.get('lean'), 1)} | {fmt(x.get('ank'), 1)} | {fmt(x.get('rest'), 1)} | {fmt(x.get('hip'), 1)} | {fmt(x.get('copZ'), 3)} | {fmt(x.get('copT'), 3)} | {fmt(x.get('capZ'), 3)} | {fmt(z.get('fs'))} | {fmt(x.get('legBw'))} | {fmt(x.get('ahead'))} | {fmt(x.get('fall'), 1)} | {fmt(x.get('compress'))} | {fmt(x.get('trim'))} |")


if __name__ == '__main__':
    what = sys.argv[1]
    if what == 'repro':
        repro(sys.argv[2], sys.argv[3], sys.argv[4:])
    elif what == 'inert':
        inert(sys.argv[2], sys.argv[3], sys.argv[4])
    elif what == 'dump':
        a = sys.argv
        dump(a[2], a[3], int(a[4]), a[5], int(a[6]), *(float(v) for v in a[7:10]))
    else:
        fn = {'table': table, 'sep': separators, 'seppop': lambda tag, dirs: separators(tag, dirs, feats=FEATURES_POP), 'chain': chain, 'pairs': pairs, 'nose': nose, 'never': never}[what]
        fn(sys.argv[2], sys.argv[3:])
