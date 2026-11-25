"""3.6a part 2, README §0.10: the balance-fall hazard per cell against A's least damping on the identified plant.

    python3 hazard.py <check.json> <baseline-full.json> <id dir> <tw dir> <hold dir> > hazard.md

Seeds 1-3 and the test wave take the full baseline's own labels (`cause`, `escapeAt`), joined to this round's tick rows
of the same rides. Seeds 4-9 are labelled here by the benchmark's own definitions (README §4.1 of the stability note:
the twin below 3.6 m/s at +0.7 s is the wave, froth at or below -0.10 W before the escape is the whitewater, else
balance; the escape is the onset of the last run of margin loss ending at the separation, gaps <= 0.05 s bridged).
Exposure is every standing tick (1/60 s) of the benchmark's own scripts (no dither, no twin), by the cell of its
schedule speed and depth; a balance fall counts in the cell of the tick at its escape.
"""
import json
import math
import os
import sys

BINS = [(1.5, 2), (2, 2.5), (2.5, 3), (3, 3.5), (3.5, 4), (4, 4.5), (4.5, 5), (5, 5.5), (5.5, 6), (6, 7)]
GROUPS = [('tall', -1, 0.1), ('crouch', 0.1, 0.25), ('compress', 0.25, 0.375), ('tuck', 0.375, 9)]
STEP = 1 / 60
BRIDGE = 0.05


def cell_of(v, d):
    b = next((i for i, (lo, hi) in enumerate(BINS) if lo <= v < hi), None)
    g = next((i for i, (_, lo, hi) in enumerate(GROUPS) if lo <= d < hi), None)
    if b is None or g is None:
        return None
    return f'{BINS[b][0]}-{BINS[b][1]}|{GROUPS[g][0]}'


def rows_of(path):
    with open(path) as fh:
        for line in fh:
            yield json.loads(line)


def last_run(frames, hit):
    if not frames:
        return None
    end = frames[-1]['tS']
    last = next((i for i in range(len(frames) - 1, -1, -1) if hit(frames[i])), -1)
    if last < 0 or end - frames[last]['tS'] > BRIDGE + 1e-9:
        return None
    onset = prev = frames[last]['tS']
    for i in range(last - 1, -1, -1):
        if not hit(frames[i]):
            continue
        if prev - frames[i]['tS'] > BRIDGE + STEP + 1e-9:
            break
        onset = prev = frames[i]['tS']
    return onset


def bench_script(s):
    return s is not None and s != 'twin' and not s.endswith(':dither')


def ticks_by_ride(path, key_of):
    out = {}
    for r in rows_of(path):
        if r.get('kind') != 'k' or not bench_script(r.get('script')):
            continue
        out.setdefault(key_of(r), []).append(r)
    return out


def own_labels(path, group, seed):
    """Seeds 4-9: (ride id) -> (fellAt, escapeAt, cause) by the benchmark's definitions."""
    rows = list(rows_of(path))
    twin = [r for r in rows if r.get('kind') == 'tw']
    out = {}
    for s in rows:
        if s.get('kind') != 'summary' or not bench_script(s.get('script')) or s.get('stand') is None:
            continue
        rid = f"{group}:s{seed}:w{s['wave']}:{s['script']}"
        fell = s.get('fellAfterStand')
        if fell is None:
            out[rid] = (None, None, None)
            continue
        frames = [r for r in rows if r.get('kind') == 'f' and r.get('wave') == s['wave'] and r.get('script') == s['script'] and isinstance(r.get('res'), (int, float))]
        esc = last_run(frames, lambda f: f.get('m1') or f.get('m2') or f.get('m3') or f.get('mf'))
        esc = fell if esc is None else esc
        froth = min([0] + [f['fr'] for f in frames if 0 <= f['tS'] <= esc + 1e-9])
        tv = next((w['vW'] for w in twin if w['wave'] == s['wave'] and abs(w['t'] - (s['stand'] + 0.7)) <= STEP / 2 + 1e-6), None)
        cause = 'wave' if (tv is None or tv < 3.6) else ('whitewater' if froth <= -0.10 else 'balance')
        out[rid] = (fell, esc, cause)
    return out


def spearman(xs, ys):
    def ranks(a):
        order = sorted(range(len(a)), key=lambda i: a[i])
        r = [0.0] * len(a)
        i = 0
        while i < len(a):
            j = i
            while j + 1 < len(a) and a[order[j + 1]] == a[order[i]]:
                j += 1
            for q in range(i, j + 1):
                r[order[q]] = (i + j) / 2
            i = j + 1
        return r
    rx, ry = ranks(xs), ranks(ys)
    mx, my = sum(rx) / len(rx), sum(ry) / len(ry)
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    den = math.sqrt(sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry))
    return num / den if den > 0 else float('nan')


def main():
    check_path, base_path, id_dir, tw_dir, hold_dir = sys.argv[1:6]
    check = {c['cell']: c for c in json.load(open(check_path))}
    base = {r['id']: r for r in json.load(open(base_path))['rides']}
    sets = {'seeds 1-3 and the test wave (baseline labels)': [], 'seeds 4-9 (labels by this reader)': []}
    # (ticks, label) per ride
    for name in sorted(os.listdir(id_dir)):
        if not name.endswith('.jsonl'):
            continue
        group, seed = name[:-6].split('_s')
        for (script, wave), ticks in ticks_by_ride(os.path.join(id_dir, name), lambda r: (r['script'], r['wave'])).items():
            b = base.get(f'{group}:s{seed}:w{wave}:{script}')
            if b:
                sets['seeds 1-3 and the test wave (baseline labels)'].append((ticks, b['fellAt'], b['escapeAt'], b['cause']))
    for name in sorted(os.listdir(tw_dir)):
        if not name.endswith('.jsonl'):
            continue
        rid = name[:-6].replace('_', ':')
        for _, ticks in ticks_by_ride(os.path.join(tw_dir, name), lambda r: r['script']).items():
            b = base.get(rid)
            if b:
                sets['seeds 1-3 and the test wave (baseline labels)'].append((ticks, b['fellAt'], b['escapeAt'], b['cause']))
    for name in sorted(os.listdir(hold_dir)):
        if not name.endswith('.jsonl'):
            continue
        group, seed = name[:-6].split('_s')
        path = os.path.join(hold_dir, name)
        labels = own_labels(path, group, seed)
        for (script, wave), ticks in ticks_by_ride(path, lambda r: (r['script'], r['wave'])).items():
            lab = labels.get(f'{group}:s{seed}:w{wave}:{script}')
            if lab:
                sets['seeds 4-9 (labels by this reader)'].append((ticks, *lab))
    print('# The balance-fall hazard against A\'s least damping on the identified plant (README §0.10)\n')
    print('*Generated by `hazard.py`. Exposure: standing seconds of the benchmark\'s own scripts in the cell; falls: balance falls whose final escape begins in the cell; A: least damping at 6 ticks on the cell\'s identified plant (−1 a real root outside the unit circle).*\n')
    for title, rides in sets.items():
        expo, falls, allf = {}, {}, {}
        for ticks, fell_at, esc, cause in rides:
            st = [t for t in ticks if t.get('ph') == 'standing' and t.get('tS') is not None]
            for t in st:
                c = cell_of(t['v'], t['dep'])
                if c:
                    expo[c] = expo.get(c, 0) + STEP
            if fell_at is None or esc is None:
                continue
            at = next((t for t in st if t['tS'] >= esc - 1e-6), st[-1] if st else None)
            if not at:
                continue
            c = cell_of(at['v'], at['dep'])
            if c is None:
                continue
            allf[c] = allf.get(c, 0) + 1
            if cause == 'balance':
                falls[c] = falls.get(c, 0) + 1
        print(f'## {title}: {len(rides)} rides\n')
        print('| cell | exposure (s) | balance falls | all falls | hazard (balance falls / s) | A at 6 ticks | checked |')
        print('| --- | --- | --- | --- | --- | --- | --- |')
        xs, ys, neg, pos = [], [], [0, 0.0], [0, 0.0]
        for c in sorted(expo, key=lambda k: (k.split('|')[1], float(k.split('-')[0]))):
            ch = check.get(c)
            d6 = ch['A']['6'][0] if ch and ch.get('passed') else None
            hz = falls.get(c, 0) / expo[c] if expo[c] > 0 else float('nan')
            print(f"| {c} | {expo[c]:.1f} | {falls.get(c, 0)} | {allf.get(c, 0)} | {hz:.3f} | {'' if d6 is None else f'{d6:+.2f}'} | {'yes' if d6 is not None else 'no'} |")
            if d6 is not None and expo[c] >= 5:
                xs.append(d6)
                ys.append(hz)
                if d6 <= 0:
                    neg[0] += falls.get(c, 0); neg[1] += expo[c]
                elif d6 > 0.10:
                    pos[0] += falls.get(c, 0); pos[1] += expo[c]
        rho = spearman(xs, ys) if len(xs) >= 3 else float('nan')
        hn = neg[0] / neg[1] if neg[1] else float('nan')
        hp = pos[0] / pos[1] if pos[1] else float('nan')
        print(f'\nChecked cells with ≥ 5 s exposure: {len(xs)}. Spearman ρ (A\'s least damping, hazard) = {rho:+.2f}. '
              f'Hazard where A ≤ 0: {hn:.3f} /s ({neg[0]} falls in {neg[1]:.1f} s); where A > 0.10: {hp:.3f} /s ({pos[0]} falls in {pos[1]:.1f} s).\n')


if __name__ == '__main__':
    main()
