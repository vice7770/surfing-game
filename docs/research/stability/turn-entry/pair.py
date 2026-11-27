#!/usr/bin/env python3
"""3.6i stage 1's named pair (README §0.2): the bench fall during the steer nearest the median fall time (Big first; the
lower seed and wave on a tie) and its survivor (same stance and steer, same seed, standing through the steer, nearest in
stand speed), step by step at 0.05 s from the steer's onset. Signs toward the turn's inside (amendment 2's convention).

    python3 -I pair.py <side.json> <big run dir>
"""
import json, sys, statistics as st
side = json.load(open(sys.argv[1]))
D = sys.argv[2]
rides = {r['id']: r for r in map(json.loads, open(f'{D}/rides.jsonl'))}
falls = [x for x in side['falls'] if x['place'] == 'bench' and x['when'] == 'during']
m = st.median(x['fellAt'] for x in falls)
big = [x for x in falls if x['group'] == 'big']
key = lambda x: (abs(x['fellAt'] - m), int(x['id'].split(':')[1][1:]), int(x['id'].split(':')[2][1:]))
fall = min(big, key=key)
_, sd, _, stance, way = fall['id'].split(':')
r0 = rides[fall['id']]
cands = [r for r in rides.values() if r['group'] == 'big' and r['seed'] == int(sd[1:]) and r['script'] == f'{stance}:{way}' and r['stood']
         and not (r['fell'] and r['fellAt'] < 2.0) and r['id'] != fall['id']]
surv = min(cands, key=lambda r: abs(r['standVW'] - r0['standVW']))
print(f'median bench fall time during the steer {m:.3f} s; the fall {fall["id"]} (falls +{r0["fellAt"]} s, stand {r0["standVW"]} m/s); '
      f'the survivor {surv["id"]} (stand {surv["standVW"]} m/s, {"falls +" + str(surv["fellAt"]) + " s, " + str(surv["cause"]) if surv["fell"] else "lasts 5 s"})')
s = 1 if way == 'left' else -1
for rid in (fall['id'], surv['id']):
    w = int(rid.split(':')[2][1:])
    rows = {'f': {}, 'o': {}, 'w': {}}
    for line in open(f'{D}/big_{sd}.jsonl'):
        if line[9:10] in 'fow' and line[10] == '"' and f'"script":"{stance}:{way}"' in line and f'"wave":{w},' in line:
            o = json.loads(line)
            rows[o['kind']][round(o['tS'], 3)] = o
    on = min(t for t, o in rows['f'].items() if o.get('st', 0) != 0)
    c0 = rows['f'][on]['crs']
    print(f'\n{rid}: t from the onset (s) | ask, bank, roll, rail (deg) | yaw (deg/s), course (deg) | cSA (m/s), cA, headroom (m), lim, res | ankle aRaw (rad), twist (N m)')
    t = on
    end = r0['fellAt'] if rid == fall['id'] else on + 1.0
    while t <= end + 1e-6:
        k = min(rows['f'], key=lambda x: abs(x - t))
        f, o, ww = rows['f'].get(k), rows['o'].get(k), rows['w'].get(k)
        if f and o and ww:
            head = (ww.get('cHalf') or 0) + (ww.get('cR') or 0) - abs(ww['cA'])
            print(f"  +{k - on:4.2f} | {o['ask'] * s:5.1f} {o['bank'] * s:5.1f} {o['roll'] * s:5.1f} {o['rail'] * s:5.1f} | {f['yaw'] * s:7.1f} {((f['crs'] - c0 + 180) % 360 - 180) * s:6.1f} | "
                  f"{ww['cSA'] * s:+.2f} {ww['cA'] * s:+.3f} {head:+.3f} {f.get('lim')} {f.get('res')} | {o['aRaw'] * s:+.3f} {o['tw'] * s:+6.1f}")
        t += 0.05
