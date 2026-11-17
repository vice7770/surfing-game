import json, sys, math, os
S = os.path.dirname(os.path.abspath(__file__))
ARMS = ['f73-l', 's16-l', 's16-g']
rows = []
for a in ARMS:
    for line in open(f'{S}/out/{a}.ticks.jsonl'):
        d = json.loads(line)
        d['arm'] = a
        rows.append(d)

def live(d):
    return d['live'] == 1

def ok(d):
    return (abs(d['yGame']) > 1e-6 and abs(d['yModel']) > 1e-6
            and math.isfinite(d['yGame']) and math.isfinite(d['yModel']))

def qt(v, q):
    v = sorted(v)
    if not v: return float('nan')
    return v[min(len(v) - 1, int(q * len(v)))]

def med(v):
    v = sorted(v)
    n = len(v)
    if n == 0: return float('nan')
    return v[n // 2] if n % 2 else 0.5 * (v[n // 2 - 1] + v[n // 2])

BANDS = {
    'LOW  clamped, speed<=1.6': lambda d: d['speedClamped'] == 1 and d['speed'] <= 1.6,
    'MID  clamped, speed>1.6': lambda d: d['speedClamped'] == 1 and d['speed'] > 1.6,
    'HON  unclamped (4-12)': lambda d: d['speedClamped'] == 0,
}

print('# CHECK 1 - the side force\'s sign share CONDITIONED ON MAGNITUDE, per stance, never pooled.')
print('# population: live ticks (t>0.2, bank not at the 70 clamp) with both |y| > 1e-6, arms f73-l + s16-l + s16-g,')
print('# RIDER=new FELT=deck BODY=two, the published 34i arms. Terciles are of |yGame| WITHIN each stance-band cell.')
print()
hdr = f"{'band':26s} {'stance':9s} {'n':>5s} {'spdMed':>7s} | {'|yGame| tercile':>16s} {'n':>5s} {'|yG| med':>9s} {'|ratio| med':>11s} {'SIGN RIGHT':>11s}"
for bname, bf in BANDS.items():
    for st in ['tall', 'crouch', 'compress']:
        cell = [d for d in rows if live(d) and ok(d) and d['stance'] == st and bf(d)]
        if not cell:
            continue
        ys = sorted(abs(d['yGame']) for d in cell)
        t1, t2 = qt(ys, 1 / 3), qt(ys, 2 / 3)
        allsign = sum(1 for d in cell if (d['yGame'] > 0) == (d['yModel'] > 0)) / len(cell)
        print(f"{bname:26s} {st:9s} {len(cell):5d} {med([d['speed'] for d in cell]):7.3f} | "
              f"{'ALL':>16s} {len(cell):5d} {med(ys):9.1f} "
              f"{med([abs(d['yModel'] / d['yGame']) for d in cell]):11.3f} {allsign:11.3f}")
        bins = [('low  <%.0f N' % t1, lambda d: abs(d['yGame']) < t1),
                ('mid  %.0f-%.0f N' % (t1, t2), lambda d: t1 <= abs(d['yGame']) < t2),
                ('high >=%.0f N' % t2, lambda d: abs(d['yGame']) >= t2)]
        for label, f in bins:
            sub = [d for d in cell if f(d)]
            if not sub:
                print(f"{'':26s} {'':9s} {'':5s} {'':7s} | {label:>16s} {0:5d}")
                continue
            sr = sum(1 for d in sub if (d['yGame'] > 0) == (d['yModel'] > 0)) / len(sub)
            print(f"{'':26s} {'':9s} {'':>5s} {'':>7s} | {label:>16s} {len(sub):5d} "
                  f"{med([abs(d['yGame']) for d in sub]):9.1f} "
                  f"{med([abs(d['yModel'] / d['yGame']) for d in sub]):11.3f} {sr:11.3f}")
        # fixed absolute gate, the one 3.4k named
        for gate in (20, 50, 100):
            sub = [d for d in cell if abs(d['yGame']) > gate]
            if not sub: continue
            sr = sum(1 for d in sub if (d['yGame'] > 0) == (d['yModel'] > 0)) / len(sub)
            print(f"{'':26s} {'':9s} {'':>5s} {'':>7s} | {'|yG| > %d N' % gate:>16s} {len(sub):5d} "
                  f"{med([abs(d['yGame']) for d in sub]):9.1f} "
                  f"{med([abs(d['yModel'] / d['yGame']) for d in sub]):11.3f} {sr:11.3f}")
        print()

print()
print('# CHECK 2 - the board\'s own trim and draft on the RIDE, same populations, per stance.')
print('# trimFace = the board\'s pitch against the water under it (nose up +); draftFace = the deepest patch under')
print('# the water\'s own surface over it. The captive lab\'s row \'4\' sits at trim 46.41 deg, draft 0.5130 m;')
print('# at 1.16-3 m/s the same rig stands the board on end (trim 90.00, draft 3.002 = the tank\'s bed).')
print()
print(f"{'band':26s} {'stance':9s} {'n':>5s} {'spdMed':>7s} {'trimFace med':>12s} {'(10-90 pct)':>17s} {'trimWorld':>10s} {'draftFace med':>13s} {'(10-90 pct)':>17s} {'wetShare':>9s}")
for bname, bf in BANDS.items():
    for st in ['tall', 'crouch', 'compress']:
        cell = [d for d in rows if live(d) and d['stance'] == st and bf(d)]
        if not cell: continue
        tf = [d['trimFace'] for d in cell]
        df = [d['draftFace'] for d in cell]
        print(f"{bname:26s} {st:9s} {len(cell):5d} {med([d['speed'] for d in cell]):7.3f} "
              f"{med(tf):12.2f} {('%.2f-%.2f' % (qt(tf,0.1), qt(tf,0.9))):>17s} {med([d['trimWorld'] for d in cell]):10.2f} "
              f"{med(df):13.4f} {('%.4f-%.4f' % (qt(df,0.1), qt(df,0.9))):>17s} {med([d['wetShare'] for d in cell]):9.3f}")
    print()

print()
print('# CHECK 2b - the same, with the last 0.25 s of every run TAKEN OUT (the capsize itself: the board pitches up')
print('# as the rider goes over, so a median over the whole live window is partly a reading of the fall). Run =')
print('# (arm, stance, entry); its fall time is its own last tick.')
print()
end = {}
for d in rows:
    k = (d['arm'], d['stance'], d['entryAsked'], d['extra'])
    end[k] = max(end.get(k, 0), d['t'])

def pre(d):
    return d['t'] <= end[(d['arm'], d['stance'], d['entryAsked'], d['extra'])] - 0.25

TABLE = [('4', 46.4, 0.513), ('4.5', 25.9, 0.293), ('5', 19.3, 0.215), ('5.5', 15.3, 0.166),
         ('6', 12.6, 0.133), ('6.5', 10.7, 0.109), ('7', 9.2, 0.091), ('7.5', 8.8, 0.085),
         ('8', 5.6, 0.056), ('8.5', 7.3, 0.07), ('9', 5.7, 0.045), ('9.5', 4.8, 0.042),
         ('10', 5.7, 0.047), ('10.5', 4.3, 0.027), ('11', 4.4, 0.034), ('11.5', 4.8, 0.03), ('12', 2.9, 0.017)]

def nearest(trim, draft):
    bt = min(TABLE, key=lambda r: abs(r[1] - trim))[0]
    bd = min(TABLE, key=lambda r: abs(r[2] - draft))[0]
    return bt, bd

print(f"{'band':26s} {'stance':9s} {'n':>5s} {'spdMed':>7s} {'trimFace':>9s} {'(10-90)':>15s} {'draftFace':>10s} {'(10-90)':>17s} {'wet':>6s} | nearest row by trim / by draft")
for bname, bf in BANDS.items():
    for st in ['tall', 'crouch', 'compress']:
        cell = [d for d in rows if live(d) and pre(d) and d['stance'] == st and bf(d)]
        if not cell: continue
        tf = [d['trimFace'] for d in cell]; df = [d['draftFace'] for d in cell]
        mt, md = med(tf), med(df)
        bt, bd = nearest(mt, md)
        # per-tick modal nearest row
        from collections import Counter
        ct = Counter(nearest(d['trimFace'], d['draftFace'])[0] for d in cell).most_common(3)
        cd = Counter(nearest(d['trimFace'], d['draftFace'])[1] for d in cell).most_common(3)
        print(f"{bname:26s} {st:9s} {len(cell):5d} {med([d['speed'] for d in cell]):7.3f} "
              f"{mt:9.2f} {('%.2f-%.2f' % (qt(tf,0.1), qt(tf,0.9))):>15s} "
              f"{md:10.4f} {('%.4f-%.4f' % (qt(df,0.1), qt(df,0.9))):>17s} {med([d['wetShare'] for d in cell]):6.3f} | "
              f"'{bt}' / '{bd}'   per-tick modes trim {ct} draft {cd}")
    print()

print('# CHECK 1b - the same sign table on the PRE-CAPSIZE window, as a control on the window.')
for bname, bf in BANDS.items():
    for st in ['tall', 'crouch', 'compress']:
        cell = [d for d in rows if live(d) and pre(d) and ok(d) and d['stance'] == st and bf(d)]
        if not cell: continue
        ys = sorted(abs(d['yGame']) for d in cell)
        t1, t2 = qt(ys, 1/3), qt(ys, 2/3)
        line = []
        for label, f in [('low', lambda d: abs(d['yGame']) < t1), ('mid', lambda d: t1 <= abs(d['yGame']) < t2), ('high', lambda d: abs(d['yGame']) >= t2)]:
            sub = [d for d in cell if f(d)]
            sr = sum(1 for d in sub if (d['yGame'] > 0) == (d['yModel'] > 0)) / len(sub) if sub else float('nan')
            line.append(f"{label} n={len(sub)} sign={sr:.3f}")
        allsign = sum(1 for d in cell if (d['yGame'] > 0) == (d['yModel'] > 0)) / len(cell)
        print(f"{bname:26s} {st:9s} n={len(cell):5d} ALL sign={allsign:.3f} | " + ' | '.join(line))
    print()
