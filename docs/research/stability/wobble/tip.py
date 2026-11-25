#!/usr/bin/env python3
"""3.6c M6 (question 2): how the swing becomes the sideways tip. The balance falls inside the steer (escape in
+1.0..+2.0 s, cause balance by the benchmark's rule) on a sea, from the steer's start (frame 60) to the escape's frame.

    python3 -I tip.py <run dir> [--group big] [--scripts compress:left,...] [--md out.md] [--rows out.jsonl]

The capture point across (board frame x, + the +x rail, m): across = offsetAcross − height·feltAcross + speedAcross/omega
(`w.cA` = `cOA` − `cH`·`cFA` + `cSA`/`cW`). Each part's change from +1.0 s to the escape is given in the direction the
point crossed (× sign(across at the escape)), and its share of the change of `across`.
The felt vertical's across part comes from the pair's specific force across the deck (`w.pfX`, m/s²); beside it the
board's V·dχ/dt (`f.vG` × the course's rate, χ = `f.crs`), m/s², and their correlation over the window (alternating parts).
The swing per half-cycle: the largest |Ω_alt| (deg/s) between successive zero crossings of the yaw's swing.
The side: inside the turn if sign(across at the escape) = the steer's sign (+1 left = the +x rail).
Controls: the same wave's tall steer (`none:<side>`) and the same stance's straight ride, the swing's std over the same frames.
"""
import json, math, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wob import load, centred, median

args = sys.argv[1:]
d = args[0]
group = args[args.index('--group') + 1] if '--group' in args else 'big'
md = args[args.index('--md') + 1] if '--md' in args else None
rows_out = args[args.index('--rows') + 1] if '--rows' in args else None
default = [f'{s}:{w}' for s in ('compress', 'crouch', 'snap', 'hisway', 'release0', 'release0.2', 'release0.4', 'release0.6', 'none') for w in ('left', 'right')]
scripts = args[args.index('--scripts') + 1].split(',') if '--scripts' in args else default
W_KEYS = ['om', 'cA', 'cOA', 'cH', 'cFA', 'cSA', 'cW', 'pfX', 'bey', 'cHalf', 'cR', 'cM']
want = set(scripts) | {'none:left', 'none:right'} | {f"{s.split(':')[0]}:straight" for s in scripts} | {'hisway', 'release0', 'release0.2', 'release0.4', 'release0.6'}
rides, _ = load(d, w_keys=W_KEYS, scripts=want, groups={group})


def sw_std(ride, a, b):
    xs = [ride['w'].get(i, {}).get('om') for i in range(a - 7, b + 8)]
    if None in xs:
        return None
    alt = centred(xs)[7:-7]
    return math.degrees(math.sqrt(sum(x * x for x in alt) / len(alt)))


out = []
for rid, ride in sorted(rides.items()):
    sc = ride['script']
    if sc not in scripts or ride['cause'] != 'balance' or ride['escape'] is None or not (1.0 < ride['escape'] < 2.0):
        continue
    steer = 1 if sc.endswith('left') else -1
    a, e = 60, round(ride['escape'] * 60)
    w = ride['w']
    if a not in w or e not in w:
        continue
    def parts(i):
        r = w[i]
        return r['cA'], r['cOA'], -r['cH'] * r['cFA'], r['cSA'] / r['cW']
    p0, p1 = parts(a), parts(e)
    side = 1 if p1[0] >= 0 else -1
    d_all = (p1[0] - p0[0]) * side
    d_off, d_felt, d_vel = [(p1[k] - p0[k]) * side for k in (1, 2, 3)]
    # the first beyond frame at or after the escape: sideways?
    f = {round(x['tS'] * 60): x for x in ride['standing']}
    first = next((i for i in sorted(f) if i >= e and f[i].get('m3')), None)
    sideways = None if first is None else (f[first].get('mf') == 0)
    # felt across against V·dχ/dt (alternating parts), frames a..e
    span = range(a - 7, e + 8)
    pf = [w.get(i, {}).get('pfX') for i in span]
    vg = [f.get(i, {}).get('vG') for i in span]
    cr = [f.get(i, {}).get('crs') for i in span]
    corr = None
    if None not in pf and None not in vg and None not in cr and e - a > 10:
        chi = [math.radians(c) for c in cr]
        rate = [None] + [((chi[k] - chi[k - 1] + math.pi) % (2 * math.pi) - math.pi) * 60 for k in range(1, len(chi))]
        lat = [None] + [vg[k] * rate[k] for k in range(1, len(chi))]
        pa, la = centred(pf), centred(lat[1:])
        pa = pa[1:]
        pairs = [(x, y) for x, y in zip(pa, la) if x is not None and y is not None]
        if len(pairs) > 8:
            mx = sum(x for x, _ in pairs) / len(pairs); my = sum(y for _, y in pairs) / len(pairs)
            sxy = sum((x - mx) * (y - my) for x, y in pairs); sxx = sum((x - mx) ** 2 for x, _ in pairs); syy = sum((y - my) ** 2 for _, y in pairs)
            corr = sxy / math.sqrt(sxx * syy) if sxx > 0 and syy > 0 else None
    # the swing per half-cycle
    om = [w.get(i, {}).get('om') for i in range(a - 7, e + 1)]
    hcs = []
    if None not in om:
        alt = [x for x in centred(om + [om[-1]] * 7)[7:-7]] if len(om) > 15 else []
        alt = [x for x in alt if x is not None]
        cur = 0.0
        for k in range(1, len(alt)):
            cur = max(cur, abs(alt[k]))
            if (alt[k - 1] < 0 <= alt[k]) or (alt[k - 1] >= 0 > alt[k]):
                hcs.append(round(math.degrees(cur), 1))
                cur = 0.0
        hcs.append(round(math.degrees(cur), 1))
    tall = rides.get(rid.rsplit(':', 2)[0] + f":none:{'left' if steer > 0 else 'right'}")
    straight = rides.get(rid.rsplit(':', 2)[0] + f":{sc.split(':')[0]}:straight") if sc.split(':')[0] not in ('hisway',) and not sc.startswith('release') else rides.get(rid.rsplit(':', 2)[0] + ':hisway')
    out.append({
        'id': rid, 'script': sc, 'escape': ride['escape'], 'fell': ride['fell'], 'side': 'inside' if side == steer else 'outside', 'sideways': sideways,
        'd_across': round(d_all, 4), 'd_offset': round(d_off, 4), 'd_felt': round(d_felt, 4), 'd_speed': round(d_vel, 4),
        'felt_vs_VdChi': None if corr is None else round(corr, 3), 'halfcycles': hcs,
        'sw': sw_std(ride, a, e), 'sw_tall': sw_std(tall, a, e) if tall and (tall['fell'] is None or tall['fell'] * 60 > e + 8) else None,
        'sw_straight': sw_std(straight, a, e) if straight and (straight['fell'] is None or straight['fell'] * 60 > e + 8) else None,
    })

if rows_out:
    with open(rows_out, 'w') as fh:
        for r in out:
            fh.write(json.dumps(r) + '\n')
by = {}
for r in out:
    by.setdefault(r['script'].split(':')[0], []).append(r)
lines = [f'# 3.6c M6: the sideways tip in the held turn ({group}), balance falls with the escape inside the steer', '',
         'Changes from +1.0 s to the escape, m, in the direction the capture point crossed. Felt: −height·feltAcross. Medians; counts in brackets.', '',
         '| drive | falls | sideways at the first beyond frame | inside / outside | Δ across | Δ offset | Δ felt | Δ speed | felt term the largest | corr(felt, V·dχ/dt) | last 2 half-cycles > first 2 | swing std: fall / tall same wave / straight same wave (deg/s) |',
         '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |']
for g in sorted(by):
    rs = by[g]
    sw = [r['sideways'] for r in rs if r['sideways'] is not None]
    big = sum(1 for r in rs if r['d_felt'] >= max(r['d_offset'], r['d_speed']))
    grow = [r for r in rs if len(r['halfcycles']) >= 4]
    grown = sum(1 for r in grow if sum(r['halfcycles'][-2:]) > sum(r['halfcycles'][:2]))
    cs = [r['felt_vs_VdChi'] for r in rs if r['felt_vs_VdChi'] is not None]
    lines.append(f"| {g} | {len(rs)} | {sum(sw)} of {len(sw)} | {sum(1 for r in rs if r['side'] == 'inside')} / {sum(1 for r in rs if r['side'] == 'outside')} | "
                 f"{median([r['d_across'] for r in rs]):+.3f} | {median([r['d_offset'] for r in rs]):+.3f} | {median([r['d_felt'] for r in rs]):+.3f} | {median([r['d_speed'] for r in rs]):+.3f} | "
                 f"{big} of {len(rs)} | {median(cs) if cs else float('nan'):+.2f} ({len(cs)}) | {grown} of {len(grow)} | "
                 f"{median([r['sw'] for r in rs]) or float('nan'):.1f} / {median([r['sw_tall'] for r in rs]) or float('nan'):.1f} ({sum(1 for r in rs if r['sw_tall'])}) / {median([r['sw_straight'] for r in rs]) or float('nan'):.1f} ({sum(1 for r in rs if r['sw_straight'])}) |")
lines.append('')
lines.append('Per fall:')
lines.append('')
lines.append('| ride | escape | side | Δ across / offset / felt / speed | corr | half-cycles (peak |Ω_alt|, deg/s) |')
lines.append('| --- | --- | --- | --- | --- | --- |')
for r in out:
    lines.append(f"| {r['id']} | {r['escape']:.3f} | {r['side']}{'' if r['sideways'] else ' (fore-aft)' if r['sideways'] is False else ''} | {r['d_across']:+.3f} / {r['d_offset']:+.3f} / {r['d_felt']:+.3f} / {r['d_speed']:+.3f} | {r['felt_vs_VdChi']} | {r['halfcycles']} |")
text = '\n'.join(lines) + '\n'
print(text)
if md:
    open(md, 'w').write(text)
