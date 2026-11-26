"""3.6f's accounting tables (README §0.4 C1-C3, §0.5 Q2-Q3) from the probe's `m`, `mprone` and `bare` rows.

    python3 -I accounting.py <glide dir> <big dir> <out .md> <out .json>

Every number is read from the rows as the probe wrote them (full precision); nothing is fitted here.
"""
import json, math, sys, statistics as st

glide, big, out_md, out_json = sys.argv[1:5]
STANCES = [('compress', 'Compress'), ('none', 'tall'), ('crouch', 'tuck')]
M, XF = 73.0, -0.244


def rows(path, kind):
    out = []
    try:
        fh = open(path)
    except FileNotFoundError:
        return out
    with fh:
        for line in fh:
            if line.startswith('{"kind":"%s"' % kind):
                out.append(json.loads(line))
    return out


def q(xs, p):
    xs = sorted(x for x in xs if x is not None and math.isfinite(x))
    if not xs:
        return float('nan')
    k = (len(xs) - 1) * p
    lo = int(math.floor(k)); hi = min(lo + 1, len(xs) - 1)
    return xs[lo] + (xs[hi] - xs[lo]) * (k - lo)


def rms(xs):
    xs = [x for x in xs if x is not None and math.isfinite(x)]
    return math.sqrt(sum(x * x for x in xs) / len(xs)) if xs else float('nan')


def g(x, n=3):
    if x is None or not math.isfinite(x):
        return '—'
    if x != 0 and (abs(x) < 1e-3 or abs(x) >= 1e5):
        return '%.2e' % x
    return ('%.' + str(n) + 'f') % x


L, J = [], {}
L.append('# 3.6f accounting (the probe\'s `m`, `mprone` and `bare` rows)\n')
# ---------------------------------------------------------------- Q2 and the controls, per ride set and stance
L.append('## The momentum accounting per standing substep and frame (game signs: world up, + nose left; N·m per frame mean, N·m·s per substep)\n')
L.append('| ride | stance | standing frames (substeps) | R_s per substep, largest abs / largest rel | R_s per frame, RMS | linear residual per substep, largest abs (rel) | R_O per frame: RMS, largest | jumps between substeps, largest | RMS lever lev (levL, levF) | RMS rotors (lower, upper) | RMS m V x_f r | infeasible / apart / bed / rotor re-sets / agile / drives (substeps) |')
L.append('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for where, d in (('glide', glide), ('Big s1', big)):
    for key, name in STANCES:
        ms = [r for r in rows('%s/%s.jsonl' % (d, key), 'm') if r['nSt'] > 0]
        if not ms:
            continue
        sub = sum(r['n'] for r in ms)
        ent = {
            'frames': len(ms), 'substeps': sub,
            'rsMax': max(r['rsMax'] for r in ms), 'rsRel': max(r['rsRel'] for r in ms), 'rsRMS': rms([r['rs'] for r in ms]),
            'lin': max(r['lin'] for r in ms), 'linRel': max(r['linRel'] for r in ms),
            'roRMS': rms([r['ro'] for r in ms]), 'roMaxFrame': max(abs(r['ro']) for r in ms), 'roMaxSub': max(r['roMax'] for r in ms),
            'jump': max(r['jump'] for r in ms),
            'lev': rms([r['lev'] for r in ms]), 'levL': rms([r['levL'] for r in ms]), 'levF': rms([r['levF'] for r in ms]),
            'rotL': rms([r['rotL'] for r in ms]), 'rotU': rms([r['rotU'] for r in ms]),
            'mVxr': rms([M * r['vf'] * XF * r['om'] for r in ms]),
            'inf': sum(r['inf'] for r in ms), 'apart': sum(r['apart'] for r in ms), 'bed': sum(r['bed'] for r in ms), 'rst': sum(r['rst'] for r in ms),
            'agile': sum(r['agile'] for r in ms), 'drives': sum(r['drives'] for r in ms),
            'aF': st.median([r['aF'] for r in ms]), 'aF5': q([r['aF'] for r in ms], 0.05), 'aF95': q([r['aF'] for r in ms], 0.95),
            'aS': st.median([r['aS'] for r in ms]), 'aU': st.median([r['aU'] for r in ms]),
            'lower': st.median([r['lower'] for r in ms]), 'beta': st.median([r['beta'] for r in ms]),
        }
        J['%s|%s' % (where, name)] = ent
        L.append('| %s | %s | %d (%d) | %s / %s | %s | %s (%s) | %s, %s | %s | %s (%s, %s) | %s, %s | %s | %d / %d / %d / %d / %d / %d |' % (
            where, name, len(ms), sub, g(ent['rsMax']), g(ent['rsRel']), g(ent['rsRMS']), g(ent['lin']), g(ent['linRel']), g(ent['roRMS']), g(ent['roMaxFrame']),
            g(ent['jump']), g(ent['lev']), g(ent['levL']), g(ent['levF']), g(ent['rotL']), g(ent['rotU']), g(ent['mVxr']),
            ent['inf'], ent['apart'], ent['bed'], ent['rst'], ent['agile'], ent['drives']))
L.append('')
# Amendment 1: R_O's split (only rows written by the amended probe carry it).
L.append('**R_O split (amendment 1)**, per ride and stance, N·m per frame: RMS over frames with no apart substep of roF − axis; over frames with apart substeps, RMS of roA and of roA − hipA − (axis on those frames); the stand\'s frame; flight substeps\n')
L.append('| ride | stance | frames all feasible: RMS roF, RMS axis, RMS (roF − axis), largest abs (roF − axis) | frames with apart substeps: n, RMS roA, RMS hipA, RMS (roA − hipA), largest abs (roA − hipA) | the stand\'s frame: stand | flight substeps |')
L.append('| --- | --- | --- | --- | --- | --- |')
for where, d in (('glide', glide), ('Big s1', big)):
    for key, name in STANCES:
        ms = [r for r in rows('%s/%s.jsonl' % (d, key), 'm') if r['nSt'] > 0 and 'roF' in r]
        if not ms:
            continue
        fe = [r for r in ms if r['apart'] == 0 and r['stand'] == 0]
        ap = [r for r in ms if r['apart'] > 0 and r['stand'] == 0]
        sd = [r['stand'] for r in ms if r['stand'] != 0]
        e = {'feasFrames': len(fe), 'roF': rms([r['roF'] for r in fe]), 'axis': rms([r['axis'] for r in fe]), 'roFx': rms([r['roF'] - r['axis'] for r in fe]),
             'roFxMax': max([abs(r['roF'] - r['axis']) for r in fe] or [float('nan')]),
             'apartFrames': len(ap), 'roA': rms([r['roA'] for r in ap]), 'hipA': rms([r['hipA'] for r in ap]), 'roAx': rms([r['roA'] - r['hipA'] for r in ap]),
             'roAxMax': max([abs(r['roA'] - r['hipA']) for r in ap] or [float('nan')]), 'stand': sd, 'flight': sum(r['flight'] for r in ms)}
        J['split|%s|%s' % (where, name)] = e
        L.append('| %s | %s | %s, %s, %s, %s | %d, %s, %s, %s, %s | %s | %d |' % (where, name, g(e['roF']), g(e['axis']), g(e['roFx']), g(e['roFxMax']), e['apartFrames'], g(e['roA']), g(e['hipA']), g(e['roAx']), g(e['roAxMax']), ', '.join(g(x) for x in sd) or '—', e['flight']))
L.append('')
L.append('**The arm** (the body\'s centre from the board\'s, heading frame, median over standing frames [5 %, 95 %] along): ' + '; '.join(
    '%s %s: along %s [%s, %s] m, across %s m, up %s m; lower %s kg·m², twist β %s' % (k.split('|')[0], k.split('|')[1], g(v['aF']), g(v['aF5']), g(v['aF95']), g(v['aS']), g(v['aU']), g(v['lower']), g(v['beta'], 4))
    for k, v in J.items() if 'aF' in v) + '\n')
# ---------------------------------------------------------------- the prone control (C2)
L.append('## C2, the rider prone (carried rigidly, `couple`), all prone substeps before the stand\n')
L.append('| ride | stance | prone substeps (feasible) | R_s largest abs (N·m·s) / largest rel | linear residual largest abs (rel) | R_O largest per substep |')
L.append('| --- | --- | --- | --- | --- | --- |')
for where, d in (('glide', glide), ('Big s1', big)):
    for key, name in STANCES:
        ps = [r for r in rows('%s/%s.jsonl' % (d, key), 'mprone') if r.get('n')]
        if not ps:
            continue
        n = sum(r['n'] for r in ps); fe = sum(r['feas'] for r in ps)
        e = {'n': n, 'feas': fe, 'rsMax': max(r['rsMax'] for r in ps), 'rsRel': max(r['rsRelMax'] for r in ps), 'lin': max(r['linMax'] for r in ps), 'linRel': max(r['linRelMax'] for r in ps), 'ro': max(r['roMax'] for r in ps)}
        J['prone|%s|%s' % (where, name)] = e
        L.append('| %s | %s | %d (%d) | %s / %s | %s (%s) | %s |' % (where, name, n, fe, g(e['rsMax']), g(e['rsRel']), g(e['lin']), g(e['linRel']), g(e['ro'])))
L.append('')
# ---------------------------------------------------------------- the bare board (C1)
bs = rows('%s/none.jsonl' % big, 'bare')
if bs:
    e = {'frames': len(bs), 'boards': len(set(r['wave'] for r in bs)), 'rider': max(abs(r['rider']) for r in bs), 'led': max(abs(r['led']) for r in bs),
         'rsMax': max(r['rsMax'] for r in bs), 'lin': max(r['lin'] for r in bs), 'linRel': max(r['linRel'] for r in bs), 'ro': rms([r['ro'] for r in bs]), 'roMax': max(abs(r['ro']) for r in bs),
         'wet': st.median([r['wetted'] for r in bs]), 'vG': st.median([r['vG'] for r in bs]), 'sum': rms([r['sum'] for r in bs]), 'dup': rms([r['dup'] for r in bs])}
    J['bare'] = e
    L.append('## C1, the bare board on the Canyon face (3.6c\'s copy of the tall ride\'s board at tS 0.5 s, 120 steps each)\n')
    L.append('- %d frames on %d boards (median ground speed %s m/s, wetted area %s m²): the closed ledger\'s residual |rider| per frame, largest **%s N·m** (RMS of the water\'s yaw sum %s N·m; the shipped ledger\'s duplicate RMS %s N·m); the linear residual per substep, largest %s N·s (rel %s); R_O per frame RMS %s N·m, largest %s N·m\n' % (
        e['frames'], e['boards'], g(e['vG']), g(e['wet']), g(e['rider']), g(e['sum']), g(e['dup']), g(e['lin']), g(e['linRel']), g(e['ro']), g(e['roMax'])))
# ---------------------------------------------------------------- Q3, the unit reads
L.append('## Q3, the unit reads on the substep\'s own system (inertias, kg·m²: 1 / the board\'s yaw-rate answer to a unit yaw impulse about the body\'s up; medians over frames)\n')
L.append('| ride, frames | stance | (A) board + water | (B) + the yaw rotors | (C) the full standing system | (D) the body rigid | (K) the known answer | C3: (D) − (B) against (K) − (B) | (C) against `bankLedger.yawPer` (largest rel) | I_board + legs + m x_f² | side impulse at the feet: yaw-rate answer (C) / (D), rad/s per N·s | sway (C) / (D), m/s per N·s |')
L.append('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')


def kick_frames(r):
    t = r['tS'] * 60
    return any(k * 60 <= t < k * 60 + 60 for k in (1.0, 1.5, 2.0, 2.5))


for where, d, sel in (('glide, 60–299', glide, lambda r: 60 <= round(r['tS'] * 60) <= 299), ('Big s1, the kick windows', big, kick_frames)):
    for key, name in STANCES:
        ms = [r for r in rows('%s/%s.jsonl' % (d, key), 'm') if r['nSt'] > 0 and r['nu'] > 0 and sel(r)]
        if not ms:
            continue
        med = lambda k: st.median([r[k] for r in ms if r[k] is not None])
        c3 = max(abs((r['ID'] - r['IB']) - (r['IK'] - r['IB'])) / abs(r['IK'] - r['IB']) for r in ms)
        bank = [abs(r['cC'] - r['bankYaw']) / abs(r['bankYaw']) for r in ms if r.get('bankYaw')]
        e = {k: med(k) for k in ('IA', 'IB', 'IC', 'ID', 'IK', 'sC', 'sD', 'wC', 'wD', 'lower', 'beta')}
        e.update({'frames': len(ms), 'c3': c3, 'bank': max(bank) if bank else None, 'IA_plus': med('IA') + med('lower') + M * XF * XF})
        J['units|%s|%s' % (where, name)] = e
        L.append('| %s (%d) | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s / %s | %s / %s |' % (
            where, len(ms), name, g(e['IA']), g(e['IB']), g(e['IC']), g(e['ID']), g(e['IK']), g(c3), g(e['bank']) if e['bank'] is not None else '—',
            g(e['IA_plus']), g(e['sC'], 4), g(e['sD'], 4), g(e['wC'], 4), g(e['wD'], 4)))
L.append('')
open(out_md, 'w').write('\n'.join(L) + '\n')
json.dump(J, open(out_json, 'w'), indent=1)
print('\n'.join(L))
