#!/usr/bin/env python3
"""3.6h's screening reader (README §0.4, §0.6). Reads the benchmark report's own measures (`rides.jsonl`, written by
`stability-report.mjs --mode full --only big --reuse --out <dir>`) and the probe's raw frame rows (`big_s<seed>.jsonl`).

    python3 -I screen.py --base baseline-full.json --off <off dir> <name>=<dir> [...] [--md out.md] [--json out.json]

Deep turns: the 72 Big rides crouch|compress:left|right. Regressions: the benchmark's rule on the 162 Big benchmark rides
against the baseline. The swing: std of the yaw rate about its centred 15-frame mean, tS 0.5-3.0 s, rides standing
through +3.0 s on and off, paired by id. The release and his-way turns: against the off probe, by the same measures.
"""
import argparse, json, math, os, statistics as st

DEEP = ('crouch:left', 'crouch:right', 'compress:left', 'compress:right')
BENCH = {'hisway'} | {f'{s}:{w}' for s in ('none', 'crouch', 'compress', 'snap') for w in ('left', 'right')}
LATER, DROP = 0.25, 0.10


def rides(d):
    out = {}
    with open(os.path.join(d, 'rides.jsonl')) as f:
        for line in f:
            if line.strip():
                r = json.loads(line)
                out[r['id']] = r
    return out


def regressions(now, base):
    """The benchmark's `compare` (scripts/stability-report.ts), its failing lines only, on the rides of `base`."""
    fail = []
    for b in base.values():
        c = now.get(b['id'])
        lasted = b['stood'] and not b['fell'] and not b['cut']
        if lasted and (c is None or not c['stood'] or c['fell']):
            fail.append((b['id'], 'lasted', b, c)); continue
        if c is None:
            continue
        if b['lowest'] is not None and c['lowest'] is not None and c['lowest'] < b['lowest'] - DROP:
            fail.append((b['id'], 'reserve', b, c))
        if b['fell'] and c['fell'] and c['fellAt'] < b['fellAt'] - LATER and c['cause'] == 'balance':
            fail.append((b['id'], 'sooner', b, c))
    return fail


def bal(r):
    return r is not None and r['stood'] and r['fell'] and r['cause'] == 'balance'


def paired(now, off, ids, key):
    d = [now[i][key] - off[i][key] for i in ids if i in now and i in off and now[i][key] is not None and off[i][key] is not None]
    only_on = sum(1 for i in ids if i in now and i in off and now[i][key] is not None and off[i][key] is None)
    only_off = sum(1 for i in ids if i in now and i in off and now[i][key] is None and off[i][key] is not None)
    if not d:
        return {'n': 0, 'mean': None, 'median': None, 'up': 0, 'down': 0, 'onlyOn': only_on, 'onlyOff': only_off}
    return {'n': len(d), 'mean': round(st.mean(d), 3), 'median': round(st.median(d), 3), 'up': sum(x > 0 for x in d),
            'down': sum(x < 0 for x in d), 'onlyOn': only_on, 'onlyOff': only_off}


def frames(d):
    """{ride id: [(tS, yaw)] standing frames} from the probe's raw files."""
    out = {}
    for seed in (1, 2, 3):
        p = os.path.join(d, f'big_s{seed}.jsonl')
        if not os.path.exists(p):
            continue
        with open(p) as f:
            for line in f:
                if '"kind":"f"' not in line:
                    continue
                r = json.loads(line)
                if not isinstance(r.get('res'), (int, float)):
                    continue
                out.setdefault(f"big:s{seed}:w{r['wave']}:{r['script']}", []).append((r['tS'], r['yaw']))
    return out


def ring(fr, t0=0.5, t1=3.0, half=7):
    """The swing: std of yaw minus its centred (2*half+1)-frame mean over t0..t1; None unless standing through t1."""
    if not fr or fr[-1][0] < t1 - 1e-6:
        return None
    ys = [y for _, y in fr]
    res = []
    for i, (t, y) in enumerate(fr):
        if t < t0 - 1e-6 or t > t1 + 1e-6 or i < half or i + half >= len(fr):
            continue
        res.append(y - sum(ys[i - half:i + half + 1]) / (2 * half + 1))
    return st.pstdev(res) if len(res) > 2 else None


def swing(on_fr, off_fr, scripts):
    out = {}
    for s in scripts:
        ratios, a, b = [], [], []
        for i, fr in off_fr.items():
            if not i.endswith(':' + s) or i.count(':') != (3 if ':' not in s else 4):
                continue
            x, y = ring(on_fr.get(i)), ring(fr)
            if x is None or y is None or y == 0:
                continue
            ratios.append(x / y); a.append(x); b.append(y)
        out[s] = {'n': len(ratios), 'ratio': round(st.median(ratios), 3) if ratios else None, 'down': sum(r < 1 for r in ratios),
                  'up': sum(r > 1 for r in ratios), 'on': round(st.median(a), 2) if a else None, 'off': round(st.median(b), 2) if b else None}
    return out


def drive(now, off, prefix_scripts):
    """Balance falls before +2.0 s and in all, paired fall time and course, for drives not in the baseline."""
    ids = [i for i in off if off[i]['script'] in prefix_scripts]
    rel = lambda rs: sum(1 for i in ids if bal(rs.get(i)) and rs[i]['fellAt'] < 2.0)
    tot = lambda rs: sum(1 for i in ids if bal(rs.get(i)))
    dt = [now[i]['fellAt'] - off[i]['fellAt'] for i in ids if i in now and now[i]['fell'] and off[i]['fell']]
    return {'rides': len(ids), 'balBefore2': [rel(off), rel(now)], 'balAll': [tot(off), tot(now)],
            'fellLaterSooner': [sum(x > 0.0 for x in dt), sum(x < 0.0 for x in dt)], 'medianDt': round(st.median(dt), 3) if dt else None,
            'course05': paired(now, off, ids, 'course05'), 'course10': paired(now, off, ids, 'course10')}


def summarise(name, d, base, off_rides, off_fr):
    now = rides(d)
    bb = {i: r for i, r in base.items() if r['group'] == 'big'}
    deep = [i for i, r in bb.items() if r['script'] in DEEP]
    falls0 = [i for i in deep if bal(bb[i])]
    still = [i for i in falls0 if (i not in now) or (not now[i]['stood']) or bal(now[i])]
    new = [i for i in deep if i not in falls0 and bal(now.get(i))]
    # Amendment 1: regressions over the Big benchmark rides this run carries (its scripts).
    carried = {r['script'] for r in now.values()}
    reg = regressions(now, {i: r for i, r in bb.items() if r['script'] in carried})
    regs = {}
    for i, kind, b, c in reg:
        regs.setdefault(i, kind)
    out = {
        'name': name, 'deepRides': len(deep), 'baseBalance': len(falls0), 'stillFalling': len(still), 'newBalance': len(new),
        'deepBalanceNow': sum(1 for i in deep if bal(now.get(i))),
        'course05': paired(now, bb, deep, 'course05'), 'course10': paired(now, bb, deep, 'course10'), 'yawPeak': paired(now, bb, deep, 'yawPeak'),
        'regressions': len(regs), 'regList': sorted(f'{i} ({k})' for i, k in regs.items()),
        'regByScript': {}, 'balanceByScript': {},
    }
    for i, k in regs.items():
        s = bb[i]['script'].split(':')[0]
        out['regByScript'][s] = out['regByScript'].get(s, 0) + 1
    for s in ('none', 'crouch', 'compress', 'snap', 'hisway'):
        ids = [i for i, r in bb.items() if r['script'].split(':')[0] == s and r['script'] in carried]
        if not ids:
            continue
        out['balanceByScript'][s] = [sum(1 for i in ids if bal(bb[i])), sum(1 for i in ids if bal(now.get(i)))]
    fr = frames(d)
    out['swing'] = swing(fr, off_fr, ['compress:straight', 'crouch:straight', 'hisway'])
    if any(r['script'].startswith('release') for r in now.values()):
        out['release'] = {x: drive(now, off_rides, {f'release{x}:left', f'release{x}:right'}) for x in ('0', '0.2', '0.4', '0.6')}
        out['hiswaySteer'] = drive(now, off_rides, {'hisway:left', 'hisway:right'})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', required=True)
    ap.add_argument('--off', required=True)
    ap.add_argument('--json')
    ap.add_argument('configs', nargs='+')
    a = ap.parse_args()
    base = {r['id']: r for r in json.load(open(a.base))['rides']}
    off_rides, off_fr = rides(a.off), frames(a.off)
    res = [summarise(n, d, base, off_rides, off_fr) for n, d in (c.split('=', 1) for c in a.configs)]
    for r in res:
        sw = r['swing']
        print(f"{r['name']}: still {r['stillFalling']}/{r['baseBalance']} (deep balance now {r['deepBalanceNow']}/{r['deepRides']}, new {r['newBalance']}); "
              f"c05 mean {r['course05']['mean']} (n {r['course05']['n']}, +{r['course05']['up']}/-{r['course05']['down']}, only on/off {r['course05']['onlyOn']}/{r['course05']['onlyOff']}); "
              f"c10 mean {r['course10']['mean']} (n {r['course10']['n']}, +{r['course10']['up']}/-{r['course10']['down']}, only on/off {r['course10']['onlyOn']}/{r['course10']['onlyOff']}); "
              f"yawPeak {r['yawPeak']['mean']}; regressions {r['regressions']} {r['regByScript']}; balance by drive (base/now) {r['balanceByScript']}; "
              f"swing ratio C {sw['compress:straight']['ratio']} ({sw['compress:straight']['down']}/{sw['compress:straight']['n']} down), T {sw['crouch:straight']['ratio']} ({sw['crouch:straight']['down']}/{sw['crouch:straight']['n']}), his {sw['hisway']['ratio']} ({sw['hisway']['down']}/{sw['hisway']['n']})")
        if 'release' in r:
            for x, v in r['release'].items():
                print(f"   release{x}: bal<2.0 off/on {v['balBefore2']}, all {v['balAll']}, later/sooner {v['fellLaterSooner']}, c05 {v['course05']['mean']} c10 {v['course10']['mean']}")
            v = r['hiswaySteer']
            print(f"   hisway steer: bal<2.0 off/on {v['balBefore2']}, all {v['balAll']}, later/sooner {v['fellLaterSooner']}, c05 {v['course05']['mean']} c10 {v['course10']['mean']}")
    if a.json:
        json.dump(res, open(a.json, 'w'), indent=1)


if __name__ == '__main__':
    main()
