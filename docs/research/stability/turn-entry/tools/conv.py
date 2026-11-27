# 3.6i amendment 2's convention checks (written after side.py's first output was read; see README §0.10).
import json, sys, statistics as st, collections
p = sys.argv[1]
o_rows, w_rows, f_rows = {}, {}, {}
for line in open(p):
    if line.startswith('{"kind":"o"') or line.startswith('{"kind":"w"') or line.startswith('{"kind":"f"'):
        r = json.loads(line)
        if r['script'] not in ('compress:left', 'compress:right', 'crouch:left', 'crouch:right', 'none:left', 'none:right'): continue
        k = (r['wave'], r['script'], round(r['tS'], 3))
        {'o': o_rows, 'w': w_rows, 'f': f_rows}[r['kind']][k] = r
geo, felt = collections.Counter(), collections.defaultdict(list)
for k, w in w_rows.items():
    o = o_rows.get(k); f = f_rows.get(k)
    if not o or w.get('cOA') is None: continue
    s = 1 if k[1].endswith('left') else -1
    if abs(o['bank']) > 5: geo[(1 if w['cOA'] > 0 else -1) * (1 if o['bank'] > 0 else -1)] += 1
    if f and 1.0 <= k[2] <= 2.0 and abs(f['yaw']) > 20 and w.get('cFA'):
        # the felt vertical against the board's own yaw rate (world y): a turn to the board's left is +yaw?
        felt[k[2] // 0.25 * 0.25].append((1 if w['cFA'] > 0 else -1) * (1 if f['yaw'] > 0 else -1))
print('sign(cOA) x sign(bank, rider) on frames |bank| > 5 deg:', dict(geo))
print('sign(cFA) x sign(world yaw rate) by time bin, |yaw| > 20 deg/s, in the steer:', {b: (len(v), st.mean(v)) for b, v in sorted(felt.items())})
asks = [o_rows[k]['ask'] * (1 if k[1].endswith('left') else -1) for k in o_rows if 1.3 <= k[2] <= 1.5]
print('ask x steer at +0.3-0.5 s: median', st.median(asks))
# The felt vertical against the path's own curvature: the course's rate over +-0.05 s (crs world, deg; + turning which way?)
cr = collections.Counter(); cr_all = collections.Counter()
for k, w in w_rows.items():
    a = f_rows.get((k[0], k[1], round(k[2] - 0.05, 3))); b = f_rows.get((k[0], k[1], round(k[2] + 0.05, 3)))
    if not a or not b or w.get('cFA') is None or abs(w['cFA']) < 0.05: continue
    rate = ((b['crs'] - a['crs'] + 180) % 360 - 180) / 0.1
    if abs(rate) < 20: continue
    cr[(1 if w['cFA'] > 0 else -1) * (1 if rate > 0 else -1)] += 1
print('sign(cFA) x sign(course rate), |rate| > 20 deg/s, |cFA| > 0.05:', dict(cr))
# Which way does + course (crs = atan2(vx, vz)) turn? toward +x when crs increases, i.e. toward the board's left if the board's +x is world +x at heading 0.
