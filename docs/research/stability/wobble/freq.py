#!/usr/bin/env python3
"""3.6c M4, M5, M8: the swing's frequency and amplitude on the straight rides, per stance and knob setting.

    python3 -I freq.py <base run dir> <knobs run dir> [--md out.md] [--window 1|2]

The yaw rate is the `f` rows' `yaw` (board.angularVelocity.y, world up, deg/s), 60 Hz. Window 1: tS 0.5-3.0 s (frames
30-179), rides standing through 3.0 s; window 2: tS 0.5-4.5 s (frames 30-269), rides standing through 4.5 s.
- The pooled peak: each ride's yaw linearly detrended and Hann-windowed, its spectrum zero-padded to 0.05 Hz, summed over
  the cell's rides; the peak in 1.5-5 Hz refined by a parabola; a 90 % interval from 1,000 bootstrap resamples of the
  rides (seed 36).
- The amplitude: the std of the swing (yaw less its centred 15-frame mean) over the window, per ride; the cell's median.
- Per ride, the swing's zero-crossing frequency; against knobs off, paired by ride id (median difference, rides up / down).
- The elasticity e = ln(f+ / f-) / ln(k+ / k-) from the two settings' pooled peaks (senseShift: 8 / 4 ticks).
"""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wob import load, centred, std, median, zero_freq, stood_through

args = sys.argv[1:]
md = args[args.index('--md') + 1] if '--md' in args else None
win = int(args[args.index('--window') + 1]) if '--window' in args else 1
base_dir, knob_dir = args[0], args[1]
A, B = (30, 179) if win == 1 else (30, 269)
T_END = (B + 1) / 60
SCRIPTS = ['none:straight', 'crouch:straight', 'compress:straight', 'snap:straight', 'hisway']
LABEL = {'none:straight': 'tall', 'crouch:straight': 'tuck', 'compress:straight': 'Compress', 'snap:straight': 'Snap', 'hisway': 'his way'}
PAD = 0.05
NFFT = int(round(60 / PAD))
KS = [k for k in range(NFFT // 2 + 1) if 1.0 <= k * 60 / NFFT <= 6.0]
COS = {k: [math.cos(2 * math.pi * k * i / NFFT) for i in range(B - A + 1)] for k in KS}
SIN = {k: [math.sin(2 * math.pi * k * i / NFFT) for i in range(B - A + 1)] for k in KS}


def prep(xs):
    n = len(xs)
    mt = (n - 1) / 2
    mx = sum(xs) / n
    sxx = sum((i - mt) ** 2 for i in range(n))
    b = sum((i - mt) * (x - mx) for i, x in enumerate(xs)) / sxx
    return [(x - mx - b * (i - mt)) * (0.5 - 0.5 * math.cos(2 * math.pi * i / (n - 1))) for i, x in enumerate(xs)]


def ride_spec(xs):
    ys = prep(xs)
    out = {}
    for k in KS:
        c, s = COS[k], SIN[k]
        re = sum(y * c[i] for i, y in enumerate(ys))
        im = sum(y * s[i] for i, y in enumerate(ys))
        out[k] = re * re + im * im
    return out


def peak(specs):
    if not specs:
        return None
    tot = {k: sum(s[k] for s in specs) for k in KS}
    inner = [k for k in KS if 1.5 <= k * 60 / NFFT <= 5.0]
    kp = max(inner, key=lambda k: tot[k])
    a, b, c = tot.get(kp - 1, 0), tot[kp], tot.get(kp + 1, 0)
    den = a - 2 * b + c
    off = 0.5 * (a - c) / den if den != 0 else 0
    return (kp + off) * 60 / NFFT


def boot(specs, n=1000):
    rng = random.Random(36)
    vals = []
    for _ in range(n):
        pick = [specs[rng.randrange(len(specs))] for _ in specs]
        vals.append(peak(pick))
    vals.sort()
    return vals[int(0.05 * n)], vals[int(0.95 * n) - 1]


def cells(d):
    rides, knobs = load(d, w_keys=(), scripts=set(SCRIPTS), groups={'big'})
    out = {}
    for rid, ride in rides.items():
        if not stood_through(ride, T_END):
            continue
        ys = {round(f['tS'] * 60): f['yaw'] for f in ride['standing']}
        xs = [ys.get(i) for i in range(A, B + 1)]
        if None in xs:
            continue
        full = [ys.get(i) for i in range(A - 7, B + 8)]
        sw = centred(full)[7:-7] if None not in full else centred(xs)
        out.setdefault(ride['script'], {})[rid] = {'spec': ride_spec(xs), 'amp': std(sw), 'zf': zero_freq(sw)}
    return out


base = cells(base_dir)
settings = sorted(x for x in os.listdir(knob_dir) if os.path.isdir(os.path.join(knob_dir, x))) if os.path.isdir(knob_dir) else []
runs = {'off': base}
for s in settings:
    runs[s] = cells(os.path.join(knob_dir, s))

lines = [f'# 3.6c frequency tracking, window {win} (tS {A / 60:.1f}-{T_END:.1f} s), Canyon Big seeds 1-3, straight rides', '',
         'Peak: pooled spectrum, Hz, [90 % bootstrap]. Amp: median std of the swing, deg/s. Paired: against knobs off by ride id, '
         'median Δ zero-crossing Hz (up/down), median amplitude ratio (up/down).', '']
lines.append('| setting | stance | rides | peak Hz [90 %] | amp deg/s | paired rides | Δf zero-cross Hz (up/down) | amp ratio (up/down) |')
lines.append('| --- | --- | --- | --- | --- | --- | --- | --- |')
peaks = {}
for s, cs in runs.items():
    for sc in SCRIPTS:
        c = cs.get(sc, {})
        specs = [v['spec'] for v in c.values()]
        if len(specs) < 3:
            lines.append(f'| {s} | {LABEL[sc]} | {len(specs)} | — | — | | | |')
            continue
        pk = peak(specs)
        lo, hi = boot(specs)
        peaks[(s, sc)] = (pk, lo, hi)
        amp = median([v['amp'] for v in c.values()])
        pair = ''
        if s != 'off':
            ids = [i for i in c if i in base.get(sc, {})]
            dz = [c[i]['zf'] - base[sc][i]['zf'] for i in ids if c[i]['zf'] is not None and base[sc][i]['zf'] is not None]
            ar = [c[i]['amp'] / base[sc][i]['amp'] for i in ids if base[sc][i]['amp']]
            pair = f"{len(ids)} | {median(dz):+.2f} ({sum(1 for x in dz if x > 0)}/{sum(1 for x in dz if x < 0)}) | {median(ar):.2f} ({sum(1 for x in ar if x > 1)}/{sum(1 for x in ar if x < 1)})" if ids else ' | |'
        else:
            pair = ' | |'
        lines.append(f'| {s} | {LABEL[sc]} | {len(specs)} | {pk:.2f} [{lo:.2f}, {hi:.2f}] | {amp:.2f} | {pair} |')
lines.append('')
lines.append('**Elasticities** e = ln(f+ / f-) / ln(k+ / k-), pooled peaks (a stiffness carrying a spring-mass mode: +0.5; a delay-set mode: near -1).')
lines.append('')
lines.append('| knob | stance | f- / off / f+ (Hz) | e | shifts vs off (Hz) | verdict (README §0.3 M4) |')
lines.append('| --- | --- | --- | --- | --- | --- |')
pairs = [('knee', 'knee0.7', 'knee1.3', 1.3 / 0.7), ('twistGain', 'twist0.7', 'twist1.3', 1.3 / 0.7), ('ankleGain', 'ankle0.7', 'ankle1.3', 1.3 / 0.7),
         ('senseShift', 'sense-2', 'sense+2', 8 / 4), ('fins', 'fins0.7', 'fins1.3', 1.3 / 0.7)]
for name, lo_s, hi_s, ratio in pairs:
    for sc in SCRIPTS:
        if (lo_s, sc) not in peaks or (hi_s, sc) not in peaks or ('off', sc) not in peaks:
            continue
        fl, fo, fh = peaks[(lo_s, sc)][0], peaks[('off', sc)][0], peaks[(hi_s, sc)][0]
        e = math.log(fh / fl) / math.log(ratio)
        dl, dh = fl - fo, fh - fo
        excl = (peaks[(lo_s, sc)][2] < fo or peaks[(lo_s, sc)][1] > fo) and (peaks[(hi_s, sc)][2] < fo or peaks[(hi_s, sc)][1] > fo)
        same = (dl < 0 < dh) or (dh < 0 < dl)
        verdict = 'carries' if abs(e) >= 0.25 and same and excl else 'does not carry' if abs(e) < 0.10 and abs(dl) <= 0.15 and abs(dh) <= 0.15 else 'partly'
        lines.append(f'| {name} | {LABEL[sc]} | {fl:.2f} / {fo:.2f} / {fh:.2f} | {e:+.2f} | {dl:+.2f} / {dh:+.2f} | {verdict} |')
# M8: matched waves (knobs off), every stance standing through the window on the same wave
lines.append('')
lines.append('**M8, matched waves (knobs off).** Waves where tall, Compress and the tuck all stand through the window (same wave, start and inputs): per-wave amplitude ratio against tall, and the zero-crossing frequency.')
lines.append('')
waves = {}
for sc in SCRIPTS:
    for rid, v in base.get(sc, {}).items():
        waves.setdefault(rid.rsplit(':', 2)[0] if sc != 'hisway' else rid.rsplit(':', 1)[0], {})[sc] = v
full = {w: v for w, v in waves.items() if all(k in v for k in ('none:straight', 'compress:straight', 'crouch:straight'))}
lines.append(f'{len(full)} waves.')
lines.append('')
lines.append('| stance | amp ratio to tall, median (waves above / below) | zero-crossing Hz, median |')
lines.append('| --- | --- | --- |')
for sc in SCRIPTS:
    rs = [v[sc]['amp'] / v['none:straight']['amp'] for v in full.values() if sc in v and v['none:straight']['amp']]
    zf = [v[sc]['zf'] for v in full.values() if sc in v]
    if rs:
        lines.append(f'| {LABEL[sc]} | {median(rs):.2f} ({sum(1 for x in rs if x > 1)} / {sum(1 for x in rs if x < 1)}) | {median(zf):.2f} |')
# M5: the share of the deep stance's amplitude excess over tall that a swap removes, per matched wave
lines.append('')
lines.append('**M5, the depth swaps.** Per wave where the deep ride (knobs off and swapped) and the tall ride (knobs off) all stand through the window: the share of the excess removed, 1 − (amp_swap − amp_tall) / (amp_off − amp_tall), over waves with an excess (amp_off > amp_tall); median, and waves where at least half is removed.')
lines.append('')
lines.append('| swap | stance | waves | share removed, median | waves ≥ 0.5 |')
lines.append('| --- | --- | --- | --- | --- |')
for sw in ('design0', 'split0', 'both0'):
    if sw not in runs:
        continue
    for sc in ('compress:straight', 'crouch:straight', 'snap:straight', 'hisway'):
        sh = []
        for rid, v in base.get(sc, {}).items():
            w = rid.rsplit(':', 2)[0] if sc != 'hisway' else rid.rsplit(':', 1)[0]
            tall = base.get('none:straight', {}).get(w + ':none:straight')
            swp = runs[sw].get(sc, {}).get(rid)
            if not tall or not swp or v['amp'] <= tall['amp']:
                continue
            sh.append(1 - (swp['amp'] - tall['amp']) / (v['amp'] - tall['amp']))
        if sh:
            lines.append(f'| {sw} | {LABEL[sc]} | {len(sh)} | {median(sh):+.2f} | {sum(1 for x in sh if x >= 0.5)} |')
out = '\n'.join(lines) + '\n'
print(out)
if md:
    open(md, 'w').write(out)
