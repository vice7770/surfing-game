"""3.6f's read-only check (README §0.2): this round's Big seed 1 rows against 3.6d's `36d/twins/big_s1.jsonl`.

    python3 -I repro.py <3.6d big_s1.jsonl> <this round's .jsonl> [<more .jsonl> ...]

For each `stand`, `f`, `o`, `w` and `kbase` row of this round (by kind, script, wave and tS or kick time) the 3.6d row
of the same key must be equal field for field; for each open `kick` row (by script, wave, channel, at, size) its `d`
arrays and 3.6d's own `e` channels must be equal. 3.6f's added channels are not in 3.6d's rows and are skipped.
"""
import json, sys

ref_path, mine = sys.argv[1], sys.argv[2:]
KINDS = ('stand', 'f', 'o', 'w', 'kbase', 'kick')


def key(r):
    k = r['kind']
    if k == 'kick':
        return (k, r['script'], r['wave'], r['mode'], r['channel'], r['at'], r['size'])
    if k == 'kbase':
        return (k, r['script'], r['wave'], r['at'])
    return (k, r.get('script'), r.get('wave'), r.get('tS'))


def load(path, want=None):
    out = {}
    with open(path) as fh:
        for line in fh:
            if not any(line.startswith('{"kind":"%s"' % k) for k in KINDS):
                continue
            r = json.loads(line)
            if r['kind'] == 'kick' and r['mode'] != 'open':
                continue
            k = key(r)
            if want is None or k in want:
                out[k] = r
    return out


rows = {}
for p in mine:
    rows.update(load(p))
ref = load(ref_path, set(rows))
counts, bad = {}, []
for k, r in rows.items():
    counts.setdefault(k[0], [0, 0])
    counts[k[0]][0] += 1
    a = ref.get(k)
    if a is None:
        bad.append(('missing in 3.6d', k))
        continue
    same = True
    for f, v in a.items():
        if f in ('e',):
            for c, arr in v.items():
                if r['e'].get(c) != arr:
                    same = False
                    bad.append(('e.' + c, k))
                    break
        elif r.get(f) != v:
            same = False
            bad.append((f, k))
    if same:
        counts[k[0]][1] += 1
print('rows compared (identical / all):', {k: '%d / %d' % (v[1], v[0]) for k, v in sorted(counts.items())})
print('differences:', len(bad), 'by field:', {f: sum(1 for b in bad if b[0] == f) for f in sorted(set(b[0] for b in bad))})
# `maxDiff` is the largest twin difference over every channel the row carries, 3.6f's added channels included, so it may
# differ where every channel 3.6d had is equal; it is reported apart.
for b in bad[:20]:
    print('  ', b)
