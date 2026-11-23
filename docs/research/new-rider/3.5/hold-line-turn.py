"""Step 3.5s, hold-line.md section 1: the turn the game gives on the face, against the coordinated turn of the body's bank.

Reads thin frame rows (3.5r's grid-*-frames-thin.jsonl.gz, or any straight-fall.ts output) and, per frame from FROM s,
sets the board's yaw rate beside the coordinated turn of the body's bank, r_c = g tan(bank) / v (v through the water),
binned by the face's tilt across the heading. Game signs: bank + toward the face, yaw + up the face (the board's left).
    python3 docs/research/new-rider/3.5/hold-line-turn.py <frames.jsonl.gz> [FROM]
"""
import gzip, json, math, statistics as st, sys
path = sys.argv[1]
lo = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
op = gzip.open if path.endswith('.gz') else open
bins = {}
allres = []
for line in op(path, 'rt'):
    f = json.loads(line)
    if f.get('kind') != 'frame' or not f.get('attached') or f['t'] < lo or f['speedThrough'] < 4.5:
        continue
    rc = math.degrees(9.81 * math.tan(math.radians(f['bank'])) / f['speedThrough'])
    res = f['yawRate'] - rc
    allres.append(res)
    b = int(round(-f['faceTilt'] / 4.0)) * 4
    bins.setdefault(b, []).append((f['yawRate'], rc, res, f['bank'], f['rail'], f['slip']))
print(json.dumps({'file': path.split('/')[-1], 'from': lo, 'frames': len(allres), 'residualMedianDegS': round(st.median(allres), 2),
                  'byTiltDeg': {k: {'n': len(v), 'yaw': round(st.median(x[0] for x in v), 1), 'coordinated': round(st.median(x[1] for x in v), 1),
                                    'residual': round(st.median(x[2] for x in v), 1), 'bank': round(st.median(x[3] for x in v), 1),
                                    'rail': round(st.median(x[4] for x in v), 1), 'slip': round(st.median(x[5] for x in v), 1)} for k, v in sorted(bins.items())}}))
