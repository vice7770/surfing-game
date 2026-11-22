"""Step 3.5n: is |px|'s pin at the support's half-width a clamp, the freeze, or the stopping rule?

Reads PR #454's own saved runs. Every number below is from them; nothing is re-run.

  for f in A-control.jsonl B-rigs.jsonl C-owner.jsonl; do
    git show claude/across-velocity:docs/research/new-rider/3.5/results/35m/$f > <dir>/$f
  done
  python3 -I pxpin.py <dir>
"""
import json, sys, statistics as st, collections

D = (sys.argv[1] if len(sys.argv) > 1 else '.').rstrip('/')
HALF, ALONGF, H = 0.13, 0.375, 1 / 3840   # m, m, s (SUBSTEPS=64 at 1/60 s a frame)

ALL = []
for f in ('A-control.jsonl', 'B-rigs.jsonl', 'C-owner.jsonl'):
    for ln in open(D + '/' + f):
        o = json.loads(ln)
        if o.get('kind') == 'run':
            ALL.append(o)
fell = [d for d in ALL if d['fellAtFrameS'] is not None]
# The capture test's own population: the runs that separated BY `beyond && weightPast`.
cap = [d for d in fell if d['humanFallen']]
steer = [d for d in cap if d['steer']]


def leg(d):
    b, w = d['endBeyond'], d['endWeightPast']     # at the LAST ATTACHED substep, one substep (1/3840 s) earlier
    return ('weightPast last' if (b and not w) else 'beyond last' if (w and not b)
            else 'both together' if not (b or w) else 'both already true')


def head(s):
    print('\n' + '=' * 108 + '\n' + s + '\n' + '=' * 108)


head('0. POSITIVE CONTROLS against PR #454 (Part 3 §7 and results/35m/35m-tables.txt §8)')
c = collections.Counter(leg(d) for d in fell)
print('  §8 which half flips last, over all %d falls: weightPast %d / beyond %d / both %d   (published 87 / 38 / 17)'
      % (len(fell), c['weightPast last'], c['beyond last'], c['both together']))
print('  §8 of which zero-stick: %d / %d / %d   (published 16 / 6 / 14)' % tuple(
    sum(1 for d in fell if leg(d) == k and d['steer'] == 0) for k in ('weightPast last', 'beyond last', 'both together')))
print('  steered falls that fired the capture test: %d   (published "100 steered falls")' % len(steer))
print('  of them |px| >= halfAcross: %d, median |px| %.4f m   (published 67, median 0.1301 m)'
      % (sum(1 for d in steer if abs(d['fallEPx']) >= HALF), st.median(abs(d['fallEPx']) for d in steer)))
print('  median |vx/omega| over the same: %.4f m   (published 0.3635 m)'
      % st.median(abs(d['fallEVx'] / d['fallOmega']) for d in steer if d['fallOmega']))
ex = lambda g, a, b: sum(1 for d in g if a(d) and b(d))
A = lambda d: abs(d['fallEPx']) >= HALF
Z = lambda d: abs(d['fallEPz']) >= ALONGF
print('  weightPast legs over %d falls, exclusive: across-only %d / along-only %d / both %d / neither %d'
      '   (published 63 / 63 / 9 / 7)' % (len(fell), ex(fell, A, lambda d: not Z(d)), ex(fell, Z, lambda d: not A(d)),
                                          ex(fell, A, Z), ex(fell, lambda d: not A(d), lambda d: not Z(d))))
print('  ⚠ scope note: 17 of the 142 falls did NOT separate by the capture test (5 "lost board", 12 a posture/sway')
print('     backstop). Over the %d that did: weightPast %d / beyond %d / both %d.' % (
    len(cap), *[sum(1 for d in cap if leg(d) == k) for k in ('weightPast last', 'beyond last', 'both together')]))

pin = [d for d in steer if 0.1295 <= abs(d['fallEPx']) <= 0.1310]
past = [d for d in steer if abs(d['fallEPx']) > 0.1310]
inside = [d for d in steer if abs(d['fallEPx']) < 0.1295]

head('1. CAN |px| EXCEED THE SUPPORT BOX? Measured, on the same runs')
v = sorted(abs(d['fallEPx']) for d in steer)
print('  |px| at the separating substep, m, board +x, over %d steered capture-test falls:' % len(steer))
print('    min %.4f  median %.4f  max %.4f = %.2f x halfAcross' % (v[0], st.median(v), v[-1], v[-1] / HALF))
print('    inside the box (<0.1295) %d | within one substep of the edge (0.1295-0.1310) %d | further past %d'
      % (len(inside), len(pin), len(past)))
print('    of the 67 at or past the edge: %d are in the 0.1300-0.1305 band and %d are further out, to %.4f m'
      % (len(pin), len(past), max(abs(d['fallEPx']) for d in past)))
print('    4dp histogram inside the band: %s' % sorted(collections.Counter(
    round(abs(d['fallEPx']), 4) for d in pin).items()))
print('    over all %d separating substeps in the set (capture test or not): max |px| %.4f m = %.2f x halfAcross'
      % (len(fell), max(abs(d['fallEPx']) for d in fell), max(abs(d['fallEPx']) for d in fell) / HALF))
print('  and the capture point itself: peak |s.across| - halfAcross over a whole live run (pastXPeak), all %d falls:'
      ' max %.4f m' % (len(fell), max(d['pastXPeak'] for d in fell)))
print('  which half flipped last, by band: %s'
      % {n: dict(collections.Counter(leg(d) for d in g)) for n, g in (('pinned', pin), ('past', past), ('inside', inside))})

head('2. THE DISCRIMINATING CHECK: |px| one substep (1/3840 s) BEFORE the separating substep')
for name, g in (('pinned', pin), ('further past', past), ('inside', inside)):
    r = [(abs(d['endEPx']), abs(d['fallEPx'])) for d in g]
    inc = [b - a for a, b in r]
    print('  %-12s n=%-3d |px| one substep earlier <= halfAcross in %d of %d ; median %.4f -> %.4f m'
          % (name, len(g), sum(1 for a, _ in r if a <= HALF), len(r), st.median(a for a, _ in r), st.median(b for _, b in r)))
    print('               step in |px| over that one substep: median %+.6f m, range %+.6f..%+.6f m  (= |dpx/dt| median %.2f m/s)'
          % (st.median(inc), min(inc), max(inc), st.median(abs(x) for x in inc) / H))

head('3. THE SAME PIN ON THE OTHER LEG, AT ITS OWN DIFFERENT EDGE (0.375 m, not 0.130 m)')
az = [d for d in cap if Z(d) and not A(d) and leg(d) == 'weightPast last']
w = sorted(abs(d['fallEPz']) for d in az)
print('  along-only falls whose weightPast flipped last: n=%d' % len(az))
print('    |pz| min %.4f  median %.4f  max %.4f ; within 0.0010 m past 0.375 in %d of %d'
      % (w[0], st.median(w), w[-1], sum(1 for x in w if 0 <= x - ALONGF <= 0.0010), len(w)))
print('    4dp histogram: %s' % sorted(collections.Counter(round(x, 4) for x in w).items()))

head('4. THE FREEZE (CAPTURE_LOAD = 0.2 bw), on the pinning falls specifically')
for name, g in (('pinned', pin), ('further past', past), ('inside', inside)):
    fs = [d['frozenShare'] for d in g]
    print('  %-12s n=%-3d frozen AT the separating substep: %d ; frozenShare median %.4f, max %.4f, >0 in %d'
          % (name, len(g), sum(1 for d in g if d['fallFrozen']), st.median(fs), max(fs), sum(1 for x in fs if x > 0)))
r = [(d['endPosTerm'], d['endEPx'], d['endFrozen']) for d in steer]
bad = [(a, b, f) for a, b, f in r if abs(a - b) > 5e-4]
print('  the published column against the live reconstruction at the last attached substep:')
print('    |s.pointAcross - ePx| > 0.0005 m in %d of %d, and the state was frozen in %d of those %d'
      % (len(bad), len(r), sum(1 for _, _, f in bad if f), len(bad)))

head('5. WHICH LEG OF weightPast, on the pinning falls')
for name, g in (('pinned', pin), ('further past', past), ('inside', inside)):
    print('  %-12s n=%-3d across (|px|>=0.130) %d ; along (|pz|>=0.375) %d ; both %d'
          % (name, len(g), sum(1 for d in g if A(d)), sum(1 for d in g if Z(d)), ex(g, A, Z)))

head("6. THE OWNER'S ADDRESS (feltFrame deck, riderBody two, stanceReach keep, deepen on)")
for arm in ('probe', 'owner'):
    g = [d for d in steer if d['arm'] == arm]
    p = [d for d in g if 0.1295 <= abs(d['fallEPx']) <= 0.1310]
    print('  %-6s steered capture-test falls %d ; |px|>=0.130 in %d ; pinned band %d ; median |px| %.4f m'
          % (arm, len(g), sum(1 for d in g if A(d)), len(p), st.median(abs(d['fallEPx']) for d in g)))
    print('         of the pinned, |px| one substep earlier <= halfAcross in %d of %d ; median step %+.6f m'
          % (sum(1 for d in p if abs(d['endEPx']) <= HALF), len(p), st.median(abs(d['fallEPx']) - abs(d['endEPx']) for d in p)))
    print('         which half flips last: %s' % dict(collections.Counter(leg(d) for d in g)))

head('7. THE TWO FLOORS IN THE px CHAIN (humanBalance.ts:468-469) — do they bind?')
h = [d['fallEHeight'] for d in steer]
print('  height = max(0.2, offset.n): min %.4f m, floor binds in %d of %d steered falls, and in %d of the %d pinned'
      % (min(h), sum(1 for x in h if x <= 0.2001), len(h), sum(1 for d in pin if d['fallEHeight'] <= 0.2001), len(pin)))
g = [d['endFeltMag'] for d in steer if d.get('endFeltMag') is not None]
print('  omega = sqrt(max(0.5, g)/height): |felt| min %.4f m/s^2, floor binds in %d of %d' % (min(g), sum(1 for x in g if x <= 0.5001), len(g)))
