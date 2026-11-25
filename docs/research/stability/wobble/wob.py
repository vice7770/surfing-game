#!/usr/bin/env python3
"""3.6c's shared reader (README §0): loads a run directory of `wobble-probe.mjs` files and applies the benchmark's own
rules (`scripts/stability-report.ts` `measure`): the escape (the last run of m1|m2|m3|mf frames, gaps <= 0.05 s bridged,
ending within 0.05 s of the last standing frame), the cause (wave if the take-off's prone twin is below 3.6 m/s at the
stand + 0.7 s, or has no row; whitewater if the froth term reaches -0.10 W on a standing frame up to the escape; else
balance; tw-ride has no take-off, so no wave class).

Ride ids follow the benchmark's: `big:s1:w9:compress:left`, `tw-catch:compress:left`.
Run with `python3 -I`.
"""
import glob, json, math, os

STEP = 1 / 60
BRIDGE = 0.05
TWIN_AT = 0.7
TWIN_LINE = 3.6
FROTH_LINE = -0.10


def _group(name):
    if name.startswith('tw-'):
        return name.split('_', 1)[0]
    return name.split('_', 1)[0]


def load(d, w_keys=None, o_keys=(), scripts=None, groups=None):
    """{ride id: ride}. A ride: group, seed, wave, script, stand (trial time), fell (after the stand, or None),
    sep, f (list of f rows), w ({frame index: w row restricted to w_keys}, or all keys if w_keys is None),
    o ({frame index: o row restricted to o_keys}). Also returns knobs per file."""
    rides, twins, knobs = {}, {}, {}
    for path in sorted(glob.glob(os.path.join(d, '*.jsonl'))):
        name = os.path.basename(path)[:-6]
        g = _group(name)
        if groups and g not in groups:
            continue
        tw = name.startswith('tw-')
        twscript = name.split('_', 1)[1].replace('_', ':') if tw else None
        if tw and scripts and twscript not in scripts and twscript != 'twin':
            continue
        seed = None if tw else int(name.split('_s')[1])
        for line in open(path):
            k = line[9:13]
            if k.startswith('f"'):
                r = json.loads(line)
                sc = twscript if tw else r['script']
                if scripts and sc not in scripts:
                    continue
                rid = f'{g}:{sc}' if tw else f"{g}:s{seed}:w{r['wave']}:{sc}"
                rides.setdefault(rid, _new(g, seed, None if tw else r['wave'], sc))['f'].append(r)
            elif k.startswith('w"') or k.startswith('o"'):
                kind = k[0]
                if kind == 'o' and not o_keys:
                    continue
                r = json.loads(line)
                sc = twscript if tw else r['script']
                if scripts and sc not in scripts:
                    continue
                rid = f'{g}:{sc}' if tw else f"{g}:s{seed}:w{r['wave']}:{sc}"
                keys = w_keys if kind == 'w' else o_keys
                row = r if keys is None else {x: r.get(x) for x in keys}
                rides.setdefault(rid, _new(g, seed, None if tw else r['wave'], sc))[kind][round(r['tS'] * 60)] = row
            elif k.startswith('tw"'):
                r = json.loads(line)
                key = 'tw-catch' if tw else f"{g}:s{seed}:w{r['wave']}"
                twins.setdefault(key, []).append(r)
            elif k.startswith('summ'):
                r = json.loads(line)
                sc = twscript if tw else r['script']
                if sc == 'twin' or (scripts and sc not in scripts):
                    continue
                rid = f'{g}:{sc}' if tw else f"{g}:s{seed}:w{r['wave']}:{sc}"
                ride = rides.setdefault(rid, _new(g, seed, None if tw else r['wave'], sc))
                ride['stand'] = r.get('stand')
                ride['fell'] = r.get('fellAfterStand')
                ride['sep'] = r.get('cause')
                ride['summary'] = True
            elif k.startswith('cont'):
                r = json.loads(line)
                knobs[name] = r.get('knobs')
    out = {}
    for rid, ride in rides.items():
        if not ride.get('summary') or ride['stand'] is None:
            continue
        ride['f'].sort(key=lambda r: r['tS'])
        _measure(rid, ride, twins)
        out[rid] = ride
    return out, knobs


def _new(g, seed, wave, sc):
    return {'group': g, 'seed': seed, 'wave': wave, 'script': sc, 'f': [], 'w': {}, 'o': {}, 'stand': None, 'fell': None}


def _last_run(frames, hit):
    if not frames:
        return None
    end = frames[-1]['tS']
    last = -1
    for i in range(len(frames) - 1, -1, -1):
        if hit(frames[i]):
            last = i
            break
    if last < 0 or end - frames[last]['tS'] > BRIDGE + 1e-9:
        return None
    onset = frames[last]['tS']
    prev = onset
    for i in range(last - 1, -1, -1):
        if not hit(frames[i]):
            continue
        if prev - frames[i]['tS'] > BRIDGE + STEP + 1e-9:
            break
        onset = frames[i]['tS']
        prev = onset
    return onset


def _measure(rid, ride, twins):
    standing = [f for f in ride['f'] if isinstance(f.get('res'), (int, float))]
    ride['standing'] = standing
    ride['lowest'] = min((f['res'] for f in standing), default=None)
    ride['escape'] = None
    ride['cause'] = None
    take_off = ride['group'] != 'tw-ride'
    twin_vw = None
    if take_off:
        key = 'tw-catch' if ride['group'] == 'tw-catch' else f"{ride['group']}:s{ride['seed']}:w{ride['wave']}"
        t = ride['stand'] + TWIN_AT
        for w in twins.get(key, []):
            if abs(w['t'] - t) <= STEP / 2 + 1e-6:
                twin_vw = w['vW']
                break
    ride['twinVW'] = twin_vw
    if ride['fell'] is not None:
        esc = _last_run(standing, lambda f: f.get('m1') or f.get('m2') or f.get('m3') or f.get('mf'))
        ride['escape'] = esc if esc is not None else ride['fell']
        froth = min([0] + [f['fr'] for f in standing if 0 <= f['tS'] <= ride['escape'] + 1e-9])
        wave = take_off and (twin_vw is None or twin_vw < TWIN_LINE)
        ride['cause'] = 'wave' if wave else 'whitewater' if froth <= FROTH_LINE else 'balance'


def series(ride, key, src='f'):
    """{frame index: value} for an f-row key (standing frames) or a w-row key."""
    if src == 'f':
        return {round(f['tS'] * 60): f[key] for f in ride['standing'] if f.get(key) is not None}
    return {i: r[key] for i, r in ride[src].items() if r.get(key) is not None}


def centred(xs, half=7):
    """x less its centred 15-frame mean (the swing); None where the window is not full."""
    out = [None] * len(xs)
    for i in range(half, len(xs) - half):
        win = xs[i - half:i + half + 1]
        if None in win:
            continue
        out[i] = xs[i] - sum(win) / len(win)
    return out


def window(ride, a, b, key, src='f'):
    """Values of `key` on frames a..b (frame indices, inclusive), or None if any is missing."""
    s = series(ride, key, src)
    xs = [s.get(i) for i in range(a, b + 1)]
    return None if None in xs else xs


def stood_through(ride, t):
    if ride['fell'] is not None:
        return ride['fell'] > t
    return bool(ride['standing']) and ride['standing'][-1]['tS'] >= t - 1e-6


def spectrum_peak(sigs, lo=1.5, hi=5.0, pad=0.05):
    """Pooled spectrum over signals (each linearly detrended, Hann-windowed), zero-padded to `pad` Hz; the peak in
    lo..hi refined by a parabola through its three bins. Returns (peak Hz, power at the peak, band power 1-6 Hz)."""
    if not sigs:
        return None, None, None
    n = len(sigs[0])
    nfft = int(round(60 / pad))
    freqs = [k * 60 / nfft for k in range(nfft // 2 + 1)]
    ks = [k for k, f in enumerate(freqs) if lo - pad <= f <= hi + pad]
    band = [k for k, f in enumerate(freqs) if 1.0 <= f <= 6.0]
    want = sorted(set(ks) | set(band))
    power = {k: 0.0 for k in want}
    for xs in sigs:
        ys = _prep(xs)
        for k in want:
            re = im = 0.0
            w = 2 * math.pi * k / nfft
            for i, y in enumerate(ys):
                re += y * math.cos(w * i)
                im -= y * math.sin(w * i)
            power[k] += re * re + im * im
    inner = [k for k in ks if lo <= freqs[k] <= hi]
    kp = max(inner, key=lambda k: power[k])
    a, b, c = power.get(kp - 1, 0), power[kp], power.get(kp + 1, 0)
    den = a - 2 * b + c
    off = 0.5 * (a - c) / den if den != 0 else 0
    return freqs[kp] + off * 60 / nfft, b, sum(power[k] for k in band) * 60 / nfft


def _prep(xs):
    n = len(xs)
    mt = (n - 1) / 2
    mx = sum(xs) / n
    sxx = sum((i - mt) ** 2 for i in range(n))
    b = sum((i - mt) * (x - mx) for i, x in enumerate(xs)) / sxx
    return [(x - mx - b * (i - mt)) * (0.5 - 0.5 * math.cos(2 * math.pi * i / (n - 1))) for i, x in enumerate(xs)]


def zero_freq(xs):
    """Zero-crossing frequency of a swing (None entries skipped at the ends), Hz."""
    v = [x for x in xs if x is not None]
    if len(v) < 10:
        return None
    z = sum(1 for a, b in zip(v, v[1:]) if (a < 0 <= b) or (a >= 0 > b))
    return z / 2 / (len(v) / 60)


def std(xs):
    v = [x for x in xs if x is not None]
    if len(v) < 2:
        return None
    m = sum(v) / len(v)
    return math.sqrt(sum((x - m) ** 2 for x in v) / len(v))


def median(xs):
    v = sorted(x for x in xs if x is not None)
    if not v:
        return None
    n = len(v)
    return v[n // 2] if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2
