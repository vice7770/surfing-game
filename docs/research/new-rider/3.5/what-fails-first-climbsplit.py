"""Step 3.5x: the frozen-state split (what-fails-first-split.ts, bundled to <split.mjs>) over every climber of the
given arms (what-fails-first.md section 0.6), from +1.2 s to its final escape (section 0.10); one summary row per rider.

    python3 what-fails-first-climbsplit.py <run dir> <split.mjs> A B
"""
import json, subprocess, sys, statistics as st, importlib.util, os
import os.path
S = sys.argv[1]
SPLIT = sys.argv[2]
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'what-fails-first.py')
spec = importlib.util.spec_from_file_location('wff', R); w = importlib.util.module_from_spec(spec); spec.loader.exec_module(w)
import io, contextlib
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    climbers = w.climb(S)
    table = w.classify(S, quiet=True)
arms = sys.argv[3:] or ['A', 'B']
print('| arm | rider | ticks | lean asked, median abs (deg) | ref bank, median abs | coord. bank at vW, median abs | logged raw, median abs | ref swap: median abs change | gain swap: median abs change | check max (deg) |')
print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
allr, allg = [], []
for c in climbers:
    if c['arm'] not in arms:
        continue
    k = (c['arm'], c['seed'], c['script'], c['wave'])
    cl = table.get(k, {})
    t1 = (cl.get('final') or {}).get('t') or c['fell'] or 5
    out = subprocess.run(['node', SPLIT, w.runs(S)[(c['seed'], c['arm'])], c['script'], str(c['wave']), '1.2', str(t1)], capture_output=True, text=True).stdout
    rows = [json.loads(l) for l in out.strip().split('\n')[1:] if l.strip()]
    if not rows:
        continue
    import math
    lean = [abs(r['lean']) for r in rows]
    rb = [abs(r['refA']['bank']) for r in rows]
    cb = [abs(math.degrees(math.atan(r['vW'] * math.radians(r['yawRate']) / 9.81))) for r in rows if r['vW'] is not None and r['yawRate'] is not None]
    ref = [abs(r['AR'] - r['AA']) for r in rows]
    gain = [abs(r['RA'] - r['AA']) for r in rows]
    allr += ref; allg += gain
    print(f"| {c['arm']} | s{c['seed']}w{c['wave']} {c['script']} (+1.2 to +{t1:.2f} s) | {len(rows)} | {st.median(lean):.1f} | {st.median(rb):.1f} | {st.median(cb):.1f} | {st.median(abs(r['logged']) for r in rows):.1f} | {st.median(ref):.2f} | {st.median(gain):.2f} | {max(abs(r['check']) for r in rows):.2f} |")
if allr:
    print(f"\nall ticks ({len(allr)}): reference swap median {st.median(allr):.2f} deg, gain swap median {st.median(allg):.2f} deg; gain swap larger on {sum(g > r for r, g in zip(allr, allg))} of {len(allr)} ticks")
