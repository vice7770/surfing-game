"""Step 3.5s, hold-line.md section 3: the model gate's table from hold-line-model.ts PART=gate rows.
For each speed and stance, the least damping with the true delay one frame off each way (min of 0.083 and 0.117 s),
for the arms in the file; and the worst over 5-12 m/s and over 4-4.5 m/s, three stances, and the tuck apart.
    python3 docs/research/new-rider/3.5/hold-line-gate.py <gate.jsonl> [...]
"""
import json, sys
for path in sys.argv[1:]:
    rows = [json.loads(l) for l in open(path) if '"v"' in l]
    arms = [a for a in ('none', 'A', 'B') if a in rows[0]]
    r0 = rows[0]
    print(f"## {path.split('/')[-1]}  hold time {r0['holdTime']} s, integral {r0['integralTime']}, face per heading {r0['couple']}")
    print('speed ' + ' '.join(f"{st[:5]:>5}:" + ''.join(f"{a:>8}" for a in arms) for st in ('tall', 'crouch', 'compress', 'tuck')))
    for v in sorted({r['v'] for r in rows}):
        cells = []
        for st in ('tall', 'crouch', 'compress', 'tuck'):
            r = next((x for x in rows if x['v'] == v and x['stance'] == st), None)
            if not r: continue
            vals = []
            for a in arms:
                d = r[a]; w = min(d['d083'][0], d['d117'][0]); rad = max(d['d083'][2] or 0, d['d117'][2] or 0)
                vals.append(f"{w:+.3f}" + ('*' if rad > 1 + 1e-6 else ' '))
            cells.append(f"{'':>6}" + ''.join(f"{x:>8}" for x in vals))
        print(f"{v:>5} " + ' '.join(cells))
    for lo, hi in ((5, 12), (4, 4.5)):
        for stl, lab in ((('tall', 'crouch', 'compress'), 'three stances'), (('tuck',), 'tuck')):
            out = []
            for a in arms:
                sel = [(min(r[a]['d083'][0], r[a]['d117'][0]), r['v'], r['stance']) for r in rows if lo <= r['v'] <= hi and r['stance'] in stl]
                w = min(sel)
                out.append(f"{a} {w[0]:+.3f} ({w[1]} m/s {w[2]})")
            print(f"worst {lo}-{hi} m/s, {lab}: " + '; '.join(out))
    print("(* a real eigenvalue outside the unit circle: a slow divergence; the damping then reads -1)\n")
