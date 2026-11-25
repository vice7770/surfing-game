"""Per-group summary of a baseline (or rides.jsonl): falls by cause, lowest reserve, red time, recovery, turn, warning.
usage: python3 summary.py <baseline json | rides.jsonl>"""
import json, statistics as st, sys
p = sys.argv[1]
rides = json.load(open(p))['rides'] if p.endswith('.json') else [json.loads(l) for l in open(p) if l.strip()]
med = lambda xs: (f'{st.median(xs):.2f}' if xs else '—')
rng = lambda xs: (f'{min(xs):.2f}–{max(xs):.2f}' if xs else '—')
print('| group | drive | rides | lasted 5 s | cut | falls: balance / wave / whitewater | fell ≤ 3 s | lowest reserve, median (lasting rides) | red s, median | warning s, median (range) | recovery s, median (n back / fell first / censored) | course +0.5 / +1.0 deg toward, median | peak yaw deg/s toward, median |')
print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for g in ('tw-catch', 'tw-ride', 'med', 'big'):
    G = [r for r in rides if r['group'] == g]
    if not G:
        continue
    def drive(r):
        s = r['script']
        if s == 'hisway': return 'his way'
        st_, w = s.split(':')
        return f'{st_} straight' if w == 'straight' else f'{st_} steer'
    order = []
    for r in G:
        d = drive(r)
        if d not in order: order.append(d)
    for d in order + ['all']:
        R = G if d == 'all' else [r for r in G if drive(r) == d]
        falls = [r for r in R if r['fell']]
        last = [r for r in R if not r['fell'] and not r.get('cut')]
        c = lambda k: sum(1 for r in falls if r['cause'] == k)
        steer = [r for r in R if r['script'].endswith(('left', 'right'))]
        back = [r['recovery'] for r in steer if r['recovery'] is not None]
        nfell = sum(1 for r in steer if r['recoveryFell'])
        ncens = sum(1 for r in steer if r['recoveryCensored'] is not None)
        c05 = [r['course05'] for r in steer if r['course05'] is not None]
        c10 = [r['course10'] for r in steer if r['course10'] is not None]
        yaw = [r['yawPeak'] for r in steer if r['yawPeak'] is not None]
        w = [r['warning'] for r in falls]
        print(f"| {g} | {d} | {len(R)} | {len(last)} | {sum(1 for r in R if r.get('cut'))} | {c('balance')} / {c('wave')} / {c('whitewater')} | "
              f"{sum(1 for r in falls if r.get('fellWithin3')) if g != 'tw-ride' else '—'} | {med([r['lowest'] for r in last])} | {med([r['red'] for r in R])} | "
              f"{med(w)} ({rng(w)}) | {med(back) if steer else ''}{f' ({len(back)} / {nfell} / {ncens})' if steer else ''} | "
              f"{(med(c05) + ' / ' + med(c10)) if steer else ''} | {med(yaw) if steer else ''} |")
