"""3.5r: the test wave's 27-cell plumb ride grid, per arm (straight-fall.ts GRID=1 FRAMES=1 output)."""
import json, sys, statistics as st

def load(path):
    cells, built = {}, set()
    for line in open(path):
        d = json.loads(line)
        k = d.get('kind')
        if k == 'built':
            built.add((d.get('plantFloor'), d.get('waterHeel'), d.get('faceTrim'), d.get('configFaceTrim')))
        elif k == 'frame':
            cells.setdefault(d['cell'], {'frames': []})['frames'].append(d)
        elif k == 'summary':
            c = cells.setdefault(d['cell'], {'frames': []})
            c['fell'] = d['fell']; c['cens'] = d['censored']; c['secs'] = d['seconds']
    return cells, built

def med(xs):
    xs = [x for x in xs if x is not None]
    if not xs: return '-'
    return f"{st.median(xs):+.1f} ({min(xs):+.1f} to {max(xs):+.1f}, n {len(xs)})"

def ftime(c):
    return c['secs'] if c['cens'] else c['fell']

def fmt_times(cells):
    ts = [ftime(c) for c in cells.values()]
    fell = sum(1 for c in cells.values() if not c['cens'])
    m = st.median(ts)
    lo, hi = min(ts), max(ts)
    cens_hi = any(c['cens'] for c in cells.values())
    mlab = ('>= ' if all(c['cens'] for c in cells.values() if ftime(c) >= m) and cens_hi and m >= 6 else '') + f"{m:.3f}"
    return f"fell {fell}/{len(ts)}, median {mlab} ({lo:.3f}-{'>= ' if cens_hi else ''}{hi:.3f})"

def paired(a, b):
    later = sooner = same = 0; diffs = []
    for k in a:
        if k not in b: continue
        da, db = ftime(a[k]), ftime(b[k])
        diffs.append(db - da)
        if abs(db - da) < 1e-9: same += 1
        elif db > da: later += 1
        else: sooner += 1
    return f"later {later} / sooner {sooner} / same {same}, median {st.median(diffs):+.3f} ({min(diffs):+.3f} to {max(diffs):+.3f})"

def detail(cells):
    side, rails, plumb, uphill, railMid, bankMid, turned, b10, b20, fracEnd = {}, [], [], [], [], [], [], [], [], []
    for c in cells.values():
        live = [f for f in c['frames'] if f['attached']]
        if not live: continue
        last = live[-1]
        if not c['cens']:
            s = 'x+ (uphill)' if last['cpX'] > 0 else 'x- (downhill)'
            side[s] = side.get(s, 0) + 1
            rails.append(last['rail'])
        plumb.append(100 * sum(1 for f in live if abs(f['bank']) <= 3) / len(live))
        late = [f for f in live if f['t'] >= 0.5]
        if late:
            uphill.append(100 * sum(1 for f in late if f['rail'] > 0 and abs(f['bank']) <= 3) / len(late))
            railMid.append(st.median([f['rail'] for f in late]))
            bankMid.append(st.median([f['bank'] for f in late]))
        turned.append(last['heading'] - live[0]['heading'])
        at = lambda tt: next((f['bank'] for f in live if abs(f['t'] - tt) < 1e-3), None)
        b10.append(at(1.0)); b20.append(at(2.0))
        fracEnd.append(last.get('faceFrac'))
    return side, rails, plumb, uphill, railMid, bankMid, turned, b10, b20, fracEnd

arms = [a.split('=') for a in sys.argv[1:]]
data = {name: load(path) for name, path in arms}
base = arms[0][0]
for name, _ in arms:
    cells, built = data[name]
    line = f"{name}: {fmt_times(cells)}"
    if name != base: line += f" | vs {base}: {paired(data[base][0], cells)}"
    print(line)
    print(f"   built (plantFloor, waterHeel, faceTrim, config faceTrim): {built}")
    side, rails, plumb, uphill, railMid, bankMid, turned, b10, b20, fracEnd = detail(cells)
    print(f"   axis at the separation (side, sign of cpX): {side}; rail at the last attached frame {med(rails)}")
    print(f"   share of live frames with |bank| <= 3 deg: {med(plumb)} %; share from 0.5 s with an uphill rail AND |bank| <= 3: {med(uphill)} %")
    print(f"   median over 0.5 s-end: rail {med(railMid)}, bank {med(bankMid)}; bank at 1.0 s {med(b10)}; at 2.0 s {med(b20)}")
    print(f"   heading turned to the last attached frame {med(turned)} (- = down the face); face fraction there {med(fracEnd)}")
print('\n# per cell')
print('cell'.ljust(14) + ''.join(n.rjust(10) for n, _ in arms))
for k in data[base][0]:
    print(k.ljust(14) + ''.join((('>=' if data[n][0][k]['cens'] else '') + f"{ftime(data[n][0][k]):.3f}").rjust(10) for n, _ in arms))
