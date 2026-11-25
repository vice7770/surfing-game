#!/usr/bin/env python3
"""3.6b's onset reader (README §0.3): per-ride onset metrics from a turn-probe run directory.

    python3 onset.py <run dir> [--json out.jsonl] [--md out.md]   # per-ride metrics and the per-stance table
    python3 onset.py <run dir> --twins                             # the twin control (§0.6 item 2)

Frames: course = atan2(vx, vz) of the board's ground velocity (world x-z, deg); yaw = angularVelocity.y (world, deg/s);
roll, rail, bank, lean asked as the probe's `o` rows (deg, + with the +x rail down). Everything "toward the steer" is
multiplied by the steer's sign (+1 left). Times are tS, s after the stand; the steer is on from +1.0 to +2.0 s.
"""
import glob, json, os, statistics as st, sys

STEP = 1 / 60
T0, T1 = 1.0, 2.0


def wrap(d):
    return ((d + 180) % 360 + 360) % 360 - 180


def steer_of(script):
    script = script.split('~')[0]
    return 1 if script.endswith(':left') else -1 if script.endswith(':right') else 0


def twin_of(script):
    script = script.split('~')[0]
    if script.startswith('hisway:'):
        return 'hisway'
    return script.rsplit(':', 1)[0] + ':straight'


def load(d):
    """{ride id: {'script', 'group', 'f': {tS: row}, 'o': {tS: row}, 'fell': tS|None, 'stood': bool}}"""
    rides = {}
    for path in sorted(glob.glob(os.path.join(d, '*.jsonl'))):
        name = os.path.basename(path)[:-6]
        if '_' not in name:
            continue  # rides.jsonl and other summaries
        rows = [json.loads(l) for l in open(path) if l.strip()]
        if not any(r['kind'] == 'done' for r in rows):
            continue
        if name.startswith('tw-'):
            group, script = name.split('_', 1)
            script = script.replace('_', ':')
            if script == 'twin':
                continue
            key = lambda r: f'{group}:{script}'
        else:
            group = name.split('_')[0]
            seed = name.split('_')[1]
            key = lambda r, g=group, s=seed: f"{g}:{s}:w{r['wave']}:{r['script']}"
        for r in rows:
            if r['kind'] not in ('f', 'o', 'summary'):
                continue
            if r['kind'] == 'summary' and (r.get('script') == 'twin' or r.get('stand') is None):
                continue
            if name.startswith('tw-'):
                k = key(r)
                sc = script
            else:
                k = key(r)
                sc = r['script']
            if sc == 'twin':
                continue
            ride = rides.setdefault(k, {'script': sc, 'group': group, 'f': {}, 'o': {}, 'fell': None, 'stood': False})
            if r['kind'] == 'summary':
                ride['stood'] = True
                ride['fell'] = r.get('fellAfterStand')
            else:
                ride[r['kind']][round(r['tS'], 4)] = r
    return {k: v for k, v in rides.items() if v['stood']}


def at(rows, t):
    for k in sorted(rows):
        if k >= t - 1e-6:
            return rows[k] if abs(k - t) < STEP else None
    return None


def first(rows, t):
    for k in sorted(rows):
        if k >= t - 1e-6:
            return rows[k]
    return None


def med(xs):
    xs = [x for x in xs if x is not None]
    return round(st.median(xs), 2) if xs else None


def metrics(rides, extra_twins=None):
    out = {}
    for rid, ride in rides.items():
        s = steer_of(ride['script'])
        if s == 0:
            continue
        prefix = rid[: -len(ride['script'])]
        twin = rides.get(prefix + twin_of(ride['script'])) or (extra_twins or {}).get(prefix + twin_of(ride['script']))
        f, o = ride['f'], ride['o']
        c0 = first({k: v for k, v in f.items() if 'res' in v}, T0)
        m = {'id': rid, 'group': ride['group'], 'script': ride['script'], 'steer': s, 'fell': ride['fell'], 'twin': twin is not None}
        if c0 is None:
            out[rid] = m
            continue
        tw0 = first({k: v for k, v in twin['f'].items() if 'res' in v}, T0) if twin else None

        def dc(rows, base, t):
            r = at({k: v for k, v in rows.items() if 'res' in v}, t)
            return None if r is None or base is None else wrap(r['crs'] - base['crs']) * s

        for h in (0.25, 0.5, 1.0):
            raw = dc(f, c0, T0 + h)
            tw = dc(twin['f'], tw0, T0 + h) if twin else None
            m[f'raw{h}'] = None if raw is None else round(raw, 2)
            m[f'sub{h}'] = None if raw is None or tw is None else round(raw - tw, 2)
            m[f'twin{h}'] = None if tw is None else round(tw, 2)
        win = [v for k, v in f.items() if T0 - 1e-6 <= k <= T1 + 1e-6 and v.get('at')]
        m['yawPeak'] = round(max(v['yaw'] * s for v in win), 1) if win else None
        win3 = [v for k, v in f.items() if T0 - 1e-6 <= k <= T0 + 2.0 + 1e-6 and v.get('at')]
        m['yawPeak3'] = round(max(v['yaw'] * s for v in win3), 1) if win3 else None
        # twin-subtracted course series, t5, the wrong-way phase
        series = []
        for k in sorted(f):
            if k < T0 - 1e-6 or k > T1 + 1e-6 or 'res' not in f[k]:
                continue
            tr = twin['f'].get(k) if twin else None
            if tr is None or 'res' not in tr or tw0 is None:
                continue
            series.append((k, wrap(f[k]['crs'] - c0['crs']) * s - wrap(tr['crs'] - tw0['crs']) * s))
        m['t5'] = next((round(k - T0, 3) for k, v in series if v >= 5), None)
        early = [(k, v) for k, v in series if k <= T0 + 0.5 + 1e-6]
        m['wrongMin'] = round(min(v for _, v in early), 2) if early else None
        m['wrongFor'] = round(sum(STEP for _, v in early if v < 0), 3) if early else None
        oe = [(k, v) for k, v in sorted(o.items()) if T0 - 1e-6 <= k <= T0 + 0.5 + 1e-6]
        # The heading (the nose, world x-z), twin-subtracted, beside the course: a course that turns away while the
        # heading does not is the board pushed sideways (sway), not yawed.
        if twin and oe and twin['o']:
            k0 = oe[0][0]
            g0 = twin['o'].get(k0)
            hs = [(k, wrap(v['hdg'] - oe[0][1]['hdg']) * s - wrap(twin['o'][k]['hdg'] - g0['hdg']) * s) for k, v in oe if g0 and k in twin['o']]
            if hs:
                m['subH0.25'] = next((round(v, 2) for k, v in hs if k >= T0 + 0.25 - 1e-6), None)
                m['subH0.5'] = round(hs[-1][1], 2) if hs[-1][0] >= T0 + 0.5 - 1e-6 else None
                m['subHmin'] = round(min(v for _, v in hs), 2)
        if oe:
            rails = [(k, v['rail'] * s) for k, v in oe]
            kmin, rmin = min(rails, key=lambda x: x[1])
            m['railMin'] = round(rmin, 2)
            m['railMinAt'] = round(kmin - T0, 3)
            m['rail0'] = round(oe[0][1]['rail'] * s, 2)
            m['bank0'] = round(oe[0][1]['bank'] * s, 2)
            m['rail05'] = round(oe[-1][1]['rail'] * s, 2)
            m['bank05'] = round(oe[-1][1]['bank'] * s, 2)
            m['ask05'] = round(oe[-1][1]['ask'] * s, 2)
            m['vS0'] = oe[0][1]['vS']
            m['cap0'] = oe[0][1]['cap']
            sat = 0
            for _, v in oe:
                room, bite, raw, rail = v['aRoom'], v['aBite'], v['aRaw'], v['rail']
                hi, lo = (room, -bite) if rail > 0 else (bite, -room)
                sat += 1 if raw > hi + 1e-6 or raw < lo - 1e-6 else 0
            m['ankleSat'] = round(sat / len(oe), 3)
            m['twistSat'] = round(sum(1 for _, v in oe if abs(v['tw']) >= 99.5) / len(oe), 3)
            m['hip'] = min(v['hip'] for _, v in oe)
            m['hipSat'] = round(sum(1 for _, v in oe if abs(v['sw']) >= v['hip'] - 1e-3) / len(oe), 3)
            m['assist'] = max(max(v['asF'], v['loF'], v['cyF']) for _, v in oe)
            # H8: the twist at the steer's start (x steer: + the upper body turned toward the steer), the twist torque's
            # mean x steer over the first 0.25 s (+ yaws the board toward the steer), and the yaw ledger's sources.
            m['twA0'] = round(oe[0][1]['twA'] * s, 3)
            q = [v for k, v in oe if k <= T0 + 0.25 + 1e-6]
            m['tw025'] = round(sum(v['tw'] * s for v in q) / len(q), 1)
            for key in ('yRails', 'yFins', 'yPress', 'yRider', 'yAm', 'yTot'):
                m[key + '025'] = round(sum(v[key] * s for v in q) / len(q), 1)

            def reach(key, deg):
                return next((round(k - T0, 3) for k, v in oe if v[key] * s >= deg), None)
            m['ask20'] = reach('ask', 20)
            m['bank20'] = reach('bank', 20)
            m['rail10'] = reach('rail', 10)
        out[rid] = m
    return out


def twins(rides):
    """Every steer ride against its straight twin, frame for frame, up to tS < 1.0 (the benchmark's f rows)."""
    same = diff = missing = 0
    bad = []
    for rid, ride in rides.items():
        s = steer_of(ride['script'])
        if s == 0:
            continue
        prefix = rid[: -len(ride['script'])]
        twin = rides.get(prefix + twin_of(ride['script']))
        if not twin:
            missing += 1
            continue
        a = {k: {x: y for x, y in v.items() if x != 'script'} for k, v in ride['f'].items() if k < T0 - 1e-6}
        b = {k: {x: y for x, y in v.items() if x != 'script'} for k, v in twin['f'].items() if k < T0 - 1e-6}
        if a == b:
            same += 1
        else:
            diff += 1
            bad.append(rid)
    print(f'twin control: {same} identical up to +1.0 s, {diff} differ, {missing} without a twin')
    for b in bad[:20]:
        print('  differs:', b)


def stance_of(script):
    return 'hisway' if script.startswith('hisway') else script.split(':')[0]


def table(ms, groups=('tw-catch', 'tw-ride', 'med', 'big')):
    cols = ['raw0.5', 'subH0.25', 'subH0.5', 'subHmin', 'sub0.25', 'sub0.5', 'sub1.0', 'yawPeak', 't5', 'wrongMin', 'wrongFor', 'rail0', 'railMin', 'railMinAt',
            'bank0', 'ask05', 'bank05', 'rail05', 'ask20', 'bank20', 'rail10', 'vS0', 'cap0', 'ankleSat', 'twistSat', 'hipSat', 'twA0', 'tw025', 'yRails025', 'yFins025', 'yPress025', 'yRider025', 'yAm025', 'yTot025']
    lines = ['| group | stance | rides | fell < +2.0 s | t5 reached | ' + ' | '.join(cols) + ' |',
             '| --- | --- | --- | --- | --- | ' + ' | '.join('---' for _ in cols) + ' |']
    for g in groups:
        for stance in ('none', 'crouch', 'compress', 'snap', 'hisway'):
            rs = [m for m in ms.values() if m['group'] == g and stance_of(m['script']) == stance]
            if not rs:
                continue
            fell = sum(1 for m in rs if m['fell'] is not None and m['fell'] < T1)
            t5n = sum(1 for m in rs if m.get('t5') is not None)
            lines.append(f'| {g} | {stance} | {len(rs)} | {fell} | {t5n} | ' + ' | '.join(str(med([m.get(c) for m in rs])) for c in cols) + ' |')
    return '\n'.join(lines)


if __name__ == '__main__':
    d = sys.argv[1]
    rides = load(d)
    if '--twins' in sys.argv:
        twins(rides)
        sys.exit(0)
    ms = metrics(rides)
    if '--json' in sys.argv:
        with open(sys.argv[sys.argv.index('--json') + 1], 'w') as fh:
            for m in ms.values():
                fh.write(json.dumps(m) + '\n')
    t = table(ms)
    if '--md' in sys.argv:
        open(sys.argv[sys.argv.index('--md') + 1], 'w').write(t + '\n')
    print(t)
