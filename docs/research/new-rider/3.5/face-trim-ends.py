"""How each grid arm's rides end: on the fall line or across it, planing or not, at the last attached frame."""
import json, statistics as st, sys
def med(xs):
    xs=[x for x in xs if x is not None]
    return '-' if not xs else f"{st.median(xs):.2f} ({min(xs):.2f} to {max(xs):.2f}, n {len(xs)})"
for arg in sys.argv[1:]:
    name, path = arg.split('=')
    cells = {}
    for l in open(path):
        d = json.loads(l)
        if d.get('kind') == 'frame': cells.setdefault(d['cell'], []).append(d)
        elif d.get('kind') == 'summary': cells.setdefault(d['cell'], []).append(d)
    fallLine, speedEnd, slowEnd, tFall, rollover = [], [], 0, [], 0
    n = 0
    for c, rows in cells.items():
        summ = rows[-1]; fr = [r for r in rows if r.get('kind') == 'frame' and r['attached']]
        if summ['censored']: continue
        n += 1
        last = fr[-1]
        # The first time the face's tilt under the board stays under 3 degrees to the end: on the fall line.
        t3 = None
        for i, r in enumerate(fr):
            if all(abs(q['faceTilt']) < 3 for q in fr[i:]): t3 = r['t']; break
        fallLine.append(t3)
        # Speed through the water 0.25 s before the end (the last frames are the separation itself).
        pre = [r for r in fr if r['t'] <= last['t'] - 0.25]
        v = pre[-1]['speedThrough'] if pre else None
        speedEnd.append(v)
        if v is not None and v < 3: slowEnd += 1
        if t3 is None: rollover += 1
    print(f"{name}: fell {n}; on the fall line (|face tilt| < 3 deg to the end) in {sum(1 for x in fallLine if x is not None)} of {n}, from {med(fallLine)} s; "
          f"speed through 0.25 s before the end {med(speedEnd)} m/s; under 3 m/s there in {slowEnd} of {n}")
