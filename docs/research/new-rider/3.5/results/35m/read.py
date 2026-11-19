"""Read step 3.5m's rows: the controls, the rig comparison, and the across/along decompositions."""
import json
import sys

import os
S = os.path.dirname(os.path.abspath(__file__))
A = [json.loads(l) for l in open(f'{S}/A-control.jsonl')]
B = [json.loads(l) for l in open(f'{S}/B-rigs.jsonl')]
C = [json.loads(l) for l in open(f'{S}/C-owner.jsonl')]
D = [json.loads(l) for l in open(f'{S}/D-inert.jsonl')]
ALL = A + B + C
key = lambda d: (d['arm'], d['rig'], d['stance'], d['tow'], d['steer'])
idx = {key(d): d for d in ALL}


def rng(vals, fmt='%.4f'):
    v = [x for x in vals if x is not None]
    return '—' if not v else (fmt % min(v)) + '–' + (fmt % max(v))


def section(t):
    print('\n' + '=' * 110 + '\n' + t + '\n' + '=' * 110)


section('0. CONTROLS (all rows of all arms)')
for name, col, fmt in [
    ("feetMiss, m (probe's feet point vs the engine's captureFeet)", 'feetMissPeak', '%.10f'),
    ("offsetMiss, m (probe's offset.x vs engine offsetAcross, UNFROZEN)", 'offsetMissPeak', '%.10f'),
    ("vxMiss, m/s (test's vx redone on engine inputs vs speedAcross, UNFROZEN)", 'vxMissPeak', '%.10f'),
    ("relMiss, m/s (probe's relative velocity vs engine captureVelocity.x)", 'relMissPeak', '%.12f'),
    ('across identity |cLevel+cUp+cAlong − relAcrossDeck|, m/s', 'termMissPeak', '%.12f'),
    ('along identity |dLevel+dUp+dAlong − relAlongDeck|, m/s', 'alongTermMissPeak', '%.12f'),
    ('relMiss at the SEPARATING substep, m/s', 'fallRelMiss', '%.12f'),
    ('across identity at the SEPARATING substep, m/s', 'fallTermMiss', '%.12f'),
    ('share of live substeps the capture test was FROZEN', 'frozenShare', '%.4f'),
]:
    print('  %-70s peak %s' % (name, rng([d[col] for d in ALL], fmt)))
am = {key(d): d for d in A}
mis = [key(d) for d in D if am[key(d)]['fellAtFrameS'] != d['fellAtFrameS']]
print('  %-70s %d of %d' % ('INERTNESS: INERT=1 vs INERT=0 fall-time mismatches', len(mis), len(D)))

section('1. THE 24-ROW POSITIVE CONTROL against 33q results/33q/C3-steer.jsonl')
old = {}
for l in sys.stdin:
    d = json.loads(l)
    old[(d['stance'], d['tow'], d['steer'])] = d['fellAtS']
ok = 0
print('  %-9s %-4s %-6s %-10s %-10s %-10s %s' % ('stance', 'tow', 'steer', '33q (3dp)', 'mine (3dp)', 'mine (4dp)', 'separation'))
for d in A:
    o = old[(d['stance'], d['tow'], d['steer'])]
    m = d['fellAtFrameS']
    same = (o is None and m is None) or (o is not None and m is not None and abs(o - round(m, 3)) < 1e-9)
    ok += same
    print('  %-9s %-4s %-6s %-10s %-10s %-10s %-10s%s' % (
        d['stance'], d['tow'], d['steer'], o, None if m is None else round(m, 3), m,
        d['separation'], '' if same else '   <-- MISMATCH'))
print('\n  REPRODUCED %d of %d at 33q\'s own printed precision.' % (ok, len(A)))

section('2. THE RIG: fall time, s (frame resolution). "—" = stood the whole 4 s run.')
print('  %-9s %-4s %-6s | %-9s %-9s %-9s | %-9s %-9s %-9s' % (
    'stance', 'tow', 'steer', 'probe tow', 'probe alng', 'probe none', 'owner tow', 'owner alng', 'owner none'))
for st in ('tall', 'compress'):
    for tow in (5, 7, 9):
        for steer in (0, 0.25, 0.5, 1):
            cs = [idx.get((a, rg, st, tow, steer)) for a in ('probe', 'owner') for rg in ('tow', 'along', 'none')]
            v = ['—' if (c is None or c['fellAtFrameS'] is None) else '%.4f' % c['fellAtFrameS'] for c in cs]
            mark = '  <- zero stick' if steer == 0 else ''
            print('  %-9s %-4s %-6s | %-9s %-9s %-9s | %-9s %-9s %-9s%s' % (st, tow, steer, *v, mark))
print()
for arm in ('probe', 'owner'):
    for rg in ('tow', 'along', 'none'):
        g = [d for d in ALL if d['arm'] == arm and d['rig'] == rg]
        if not g:
            continue
        fell = [d for d in g if d['fellAtFrameS'] is not None]
        z = [d for d in g if d['steer'] == 0]
        zf = [d for d in z if d['fellAtFrameS'] is not None]
        print('  %-6s %-6s falls %2d of %2d (zero-stick %d of %d) at %s s' % (
            arm, rg, len(fell), len(g), len(zf), len(z), rng([d['fellAtFrameS'] for d in fell])))

section('3. ZERO-STICK (the headline population): the ACROSS channel, at the separating substep')
print('  arm/rig | stance tow | eVelX | eVx(speedAcross) | ePx(pos term) | nx | roll° | rollRate | peak|Fx| N | tow inj ACROSS cum')
for d in ALL:
    if d['steer'] or d['fellAtFrameS'] is None:
        continue
    print('  %-6s/%-5s | %-8s %-3s | %-6s %-16s %-13s %-8s %-7s %-9s %-11s %s' % (
        d['arm'], d['rig'], d['stance'], d['tow'], d['fallEVelX'], d['fallEVx'], d['fallEPx'], d['fallNx'],
        d['fallRollDeg'], d['fallRollRate'], d['FxPeak'], d['towInjLevelCum']))

section('4. ZERO-STICK: the ALONG channel, which is where the fall actually is')
print('  arm/rig | stance tow | fell | pastX | pastZ | reach | s.along | ePz(pos) | eVz(spd) | velTerm | beyond/wtPast one substep EARLIER')
for d in ALL:
    if d['steer'] or d['fellAtFrameS'] is None:
        continue
    vt = None if d['fallEVz'] is None or not d['fallOmega'] else round(d['fallEVz'] / d['fallOmega'], 4)
    print('  %-6s/%-5s | %-8s %-3s | %-7s %-6s %-7s %-7s %-8s %-9s %-9s %-9s %s / %s' % (
        d['arm'], d['rig'], d['stance'], d['tow'], d['fellAtFrameS'], d['fallPastX'], d['fallPastZ'], d['fallReach'],
        d['fallSAlong'], d['fallEPz'], d['fallEVz'], vt, d['endBeyond'], d['endWeightPast']))

section('5. ZERO-STICK: whose ALONG motion it is, m/s, world-horizontal along the heading, last live substep')
print('  arm/rig | stance tow | relAlong | rider | feet | board CM | lever@feet | body lags CM | tow inj ALONG cum')
for d in ALL:
    if d['steer'] or d['fellAtFrameS'] is None:
        continue
    print('  %-6s/%-5s | %-8s %-3s | %-9s %-8s %-8s %-9s %-11s %-13s %s' % (
        d['arm'], d['rig'], d['stance'], d['tow'], d['endRelAlong'], d['endRiderAlong'], d['endFeetAlong'],
        d['endBoardCmAlong'], d['endLeverAlongFeet'], d['endBodyLagsCentre'], d['towInjAlongCum']))

section('6. STEERED cells: the ACROSS decomposition at the separating substep (relAcross = cLevel + cUp + cAlong)')
print('  arm/rig | stance tow steer | relAcross | cLevel | cUp | cAlong | rider lvl | feet lvl | leverFeet | leverHgt(−φ̇h) | φ̇ | pastX | pastZ | posTerm | velTerm')
for d in ALL:
    if not d['steer'] or d['fellAtFrameS'] is None:
        continue
    vt = None if d['fallEVx'] is None or not d['fallOmega'] else round(d['fallEVx'] / d['fallOmega'], 4)
    print('  %-6s/%-5s | %-8s %-3s %-5s | %-9s %-8s %-8s %-8s %-9s %-8s %-9s %-14s %-8s %-6s %-6s %-8s %s' % (
        d['arm'], d['rig'], d['stance'], d['tow'], d['steer'], d['fallRelAcrossDeck'], d['fallCLevel'], d['fallCUp'],
        d['fallCAlong'], d['fallRiderLevel'], d['fallFeetLevel'], d['fallLeverFeet'], d['fallLeverHeight'],
        d['fallRollRate'], d['fallPastX'], d['fallPastZ'], d['fallEPx'], vt))

section('7. Does the rig inject the across velocity? tow against along (zero across injection by construction)')
print('  arm | stance tow steer | peak|relAcross| tow / along / none | tow inj ACROSS cum (tow arm)')
for arm in ('probe', 'owner'):
    for st in ('tall', 'compress'):
        for tow in (5, 7, 9):
            for steer in (0.25, 0.5, 1):
                t = idx.get((arm, 'tow', st, tow, steer))
                a = idx.get((arm, 'along', st, tow, steer))
                nn = idx.get((arm, 'none', st, tow, steer))
                if not (t and a and nn):
                    continue
                print('  %-6s| %-8s %-3s %-5s | %-8s %-8s %-8s | %s' % (
                    arm, st, tow, steer, t['relAcrossDeckPeak'], a['relAcrossDeckPeak'], nn['relAcrossDeckPeak'],
                    t['towInjLevelCum']))

section('8. WHICH HALF OF THE CONJUNCTION FLIPS LAST, all runs that fell')
cnt = {}
for d in ALL:
    if d['fellAtFrameS'] is None:
        continue
    b, w = d['endBeyond'], d['endWeightPast']
    k = ('weightPast last' if (b and not w) else 'beyond last' if (w and not b) else 'both together' if not (b or w) else 'both already true')
    cnt.setdefault(k, []).append((d['arm'], d['rig'], d['steer']))
for k, v in sorted(cnt.items()):
    z = sum(1 for x in v if x[2] == 0)
    print('  %-20s %3d runs  (of which zero-stick: %d)' % (k, len(v), z))
