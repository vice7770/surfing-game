#!/usr/bin/env python3
"""3.6b, after Codex's point (consult log 27b026f5): the controller's board-roll reference against its schedule speed. Over
+0.4 to +0.6 s of every Big steer ride (lean asked 34–44° toward the steer), the reference roll per degree of lean asked
(`rRoll` / `ask`), binned by the speed the schedule is read at (`vS`, forward through the water, m/s), per stance; and the
rail per degree of lean asked in the same frames.

    python3 refroll.py <onset run dir> [group]
"""
import statistics as st, sys
from onset import load, steer_of, stance_of
R = load(sys.argv[1]); grp = sys.argv[2] if len(sys.argv) > 2 else 'big'
bins = [(5, 6.5), (6.5, 7.25), (7.25, 8), (8, 9.5), (9.5, 12)]
cells = {}
for r in R.values():
    s = steer_of(r['script'])
    if s == 0 or r['group'] != grp or r['script'].startswith('hisway'):
        continue
    for k, v in r['o'].items():
        if 1.4 <= k <= 1.6 and 34 <= v['ask'] * s <= 44:
            b = next((b for b in bins if b[0] <= v['vS'] < b[1]), None)
            if b:
                cells.setdefault((stance_of(r['script']), b), []).append((v['rRoll'] / v['ask'], v['rail'] * s / (v['ask'] * s)))
print('| schedule speed (m/s) | ' + ' | '.join(f'{s}: ref roll / ask, rail / ask (frames)' for s in ('none', 'compress', 'crouch')) + ' |')
print('| --- | --- | --- | --- |')
for b in bins:
    row = []
    for s in ('none', 'compress', 'crouch'):
        v = cells.get((s, b), [])
        row.append(f'{st.median(x[0] for x in v):.2f}, {st.median(x[1] for x in v):.2f} ({len(v)})' if len(v) >= 10 else f'— ({len(v)})')
    print(f'| {b[0]}–{b[1]} | ' + ' | '.join(row) + ' |')
