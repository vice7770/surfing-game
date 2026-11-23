"""Step 3.5u: read `?cueLater` off against on, from 3.5t's probe rows (`slow-take-off.ts`).

    python3 docs/research/new-rider/3.5/cue-later.py organic <dir>   # o-s<seed>-<off|on>.jsonl[.gz]
    python3 docs/research/new-rider/3.5/cue-later.py catch <dir>     # c-<script>-<off|on>-<run>.jsonl[.gz]

Stand speed: `vW` (horizontal |v - flow| at the board, the planing latch's measure) on the first standing frame. Time
standing: seconds from the first `standing` frame to the separation, censored at 3 s (`>=`). A crest stall (3.5t's
kind a): a stand under 3.6 m/s through the water, the slope ahead of the nose (`fall`) at or below 0 within 0.5 s of
the stand, and a fall within 3 s.
"""
import glob
import gzip
import json
import os
import statistics as st
import sys

MODE, D = sys.argv[1], sys.argv[2]


def load(path):
    rows, meta = [], {}
    for line in (gzip.open(path, 'rt') if path.endswith('.gz') else open(path)):
        x = json.loads(line)
        (rows if x.get('kind') == 'f' else meta.setdefault(x.get('kind'), [])).append(x)
    return rows, meta


def med(v):
    v = [x for x in v if x is not None]
    return st.median(v) if v else None


def f2(x):
    return '—' if x is None else f'{x:.2f}'


def stand_facts(s, rows):
    if s.get('stand') is None:
        return None
    standing = [r for r in rows if r.get('tS') is not None]
    first = standing[0] if standing else {}
    life = s['fellAfterStand'] if s['fellAfterStand'] is not None else 3.0
    cens = s['fellAfterStand'] is None
    early = [r for r in standing if r['tS'] <= 0.5]
    stall = (first.get('vW') is not None and first['vW'] < 3.6 and not cens and any((r.get('fall') or 0) <= 0 for r in early))
    return dict(vW=first.get('vW'), life=life, cens=cens, stall=stall)


def table(label, facts):
    stood = [x for x in facts if x]
    lives = [x['life'] for x in stood]
    n3 = sum(1 for x in stood if x['cens'])
    vws = [x['vW'] for x in stood if x['vW'] is not None]
    return (f"| {label} | {len(facts)} | {len(stood)} | {f2(med(vws))} ({f2(min(vws)) if vws else '—'}–{f2(max(vws)) if vws else '—'}) | "
            f"{sum(1 for v in vws if v >= 4.4)} | {f2(med(lives))} | {n3} | {sum(1 for x in stood if x['stall'])} |")


HEAD = ('| arm | trials | stood | vW at the stand, m/s, median (range) | stands >= 4.4 | time standing, s, median (censored 3) '
        '| >= 3 s | crest stalls (kind a) |\n|---|---|---|---|---|---|---|---|')

if MODE == 'catch':
    print(HEAD)
    for script in ('cue', 'cueC'):
        for arm in ('off', 'on'):
            facts, lead = [], []
            for p in sorted(glob.glob(os.path.join(D, f'c-{script}-{arm}-[0-9]*.jsonl*'))):
                rows, meta = load(p)
                s = meta['summary'][0]
                facts.append(stand_facts(s, rows))
            if facts:
                print(table(f'`{script}` {arm}', facts))
    print('\n| arm | run | player cue at, s | today\'s cue at, s | vW at the player cue | first vW >= 4.4 after the player cue, s | crest passed after the player cue, s |\n|---|---|---|---|---|---|---|')
    for arm in ('off', 'on'):
        for p in sorted(glob.glob(os.path.join(D, f'c-paddle-{arm}-[0-9]*.jsonl*'))):
            rows, meta = load(p)
            s = meta['summary'][0]
            cue = s['cue']
            today = next((r['t'] for r in rows if r.get('cueT', r['cue']) == 1), None)
            after = [r for r in rows if cue is not None and r['t'] >= cue - 1e-6]
            c0 = after[0] if after else {}
            f44 = next((r['t'] - cue for r in after if r['vW'] >= 4.4), None)
            print(f"| {arm} | {s['run']} | {f2(cue)} | {f2(today)} | {f2(c0.get('vW'))} | {f2(f44)} | {f2(None if s.get('passed') is None or cue is None else s['passed'] - cue)} |")
else:
    per = {}
    for p in sorted(glob.glob(os.path.join(D, 'o-s[0-9]-*.jsonl*'))):
        name = os.path.basename(p).split('.jsonl')[0]
        seed, arm = name[3], name.split('-')[2]
        rows, meta = load(p)
        ctl = meta['control'][0]
        for s in meta.get('summary', []):
            rr = [r for r in rows if r['script'] == s['script'] and r['wave'] == s['wave']]
            per[(arm, s['script'], seed, s['wave'])] = (s, rr, ctl)
    print(HEAD)
    for script in ('cue', 'cueC'):
        for arm in ('off', 'on'):
            facts = [stand_facts(s, rr) for (a, sc, _, _), (s, rr, _) in sorted(per.items()) if a == arm and sc == script]
            if facts:
                print(table(f'`{script}` {arm}', facts))
    print('\nNever-pop (`never`): the cue against the crest passing (ahead of the crest < -1.5 m after the arrival).\n')
    print('| arm | waves | today\'s cue lit | player cue lit | crest passed the paddler | of those, player cue lit before it passed | window on those: player cue to crest passed, s, median (range) | player cue lit for before it passed, s, median | crest not passed in the trial, cue lit | vW at the player cue, median |\n|---|---|---|---|---|---|---|---|---|---|')
    for arm in ('off', 'on'):
        items = [(k, v) for k, v in sorted(per.items()) if k[0] == arm and k[1] == 'never']
        if not items:
            continue
        today = lit = passed_n = before = carried_lit = 0
        win, littime, v0 = [], [], []
        for (_, _, seed, wave), (s, rr, _) in items:
            if s.get('cueToday') is not None:
                today += 1
            cue, passed = s['cue'], s.get('passed')
            passed_n += passed is not None
            if cue is None:
                continue
            lit += 1
            c0 = next((r for r in rr if r['t'] >= cue - 1e-6), None)
            if c0:
                v0.append(c0['vW'])
            if passed is None:
                carried_lit += 1
            elif cue < passed:
                before += 1
                win.append(passed - cue)
                littime.append(sum(1 for r in rr if r['cue'] == 1 and r['t'] < passed) / 60)
        rng = f" ({min(win):.2f}–{max(win):.2f})" if win else ''
        print(f"| {arm} | {len(items)} | {today} | {lit} | {passed_n} | {before} | {f2(med(win))}{rng} | {f2(med(littime))} | {carried_lit} | {f2(med(v0))} |")
    print('\nPer wave (`cue`, `cueC`; `never`): player cue at / passed, s after the placement; stand vW; time standing.\n')
    print('| seed-wave | never off: cue / passed | never on: cue / passed | cue off: vW, life | cue on: vW, life | cueC off: vW, life | cueC on: vW, life |\n|---|---|---|---|---|---|---|')
    waves = sorted({(k[2], k[3]) for k in per})
    for seed, wave in waves:
        cells = []
        for arm in ('off', 'on'):
            s = per.get((arm, 'never', seed, wave), (None,))[0]
            cells.append('—' if s is None else f"{f2(s['cue'])} / {f2(s.get('passed'))}")
        for script in ('cue', 'cueC'):
            for arm in ('off', 'on'):
                v = per.get((arm, script, seed, wave))
                if v is None:
                    cells.append('—'); continue
                x = stand_facts(v[0], v[1])
                cells.append(('no cue' if v[0]['cue'] is None else f"popped, no stand ({v[0]['cause']})") if x is None else f"{f2(x['vW'])}, {'>=' if x['cens'] else ''}{x['life']:.2f}{' stall' if x['stall'] else ''}")
        print(f"| s{seed}w{wave} | " + ' | '.join(cells) + ' |')
