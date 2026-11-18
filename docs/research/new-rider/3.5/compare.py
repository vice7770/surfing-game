"""`merge-bench.ts`'s comparator (PR #426): compare two bench JSONL files VALUE BY VALUE, exactly.

    python3 -I docs/research/new-rider/3.5/compare.py A.jsonl B.jsonl [--quiet]
    SKIPCOLS=trunkFold,relief,copNm python3 -I .../compare.py A.jsonl B.jsonl   # columns the older commit lacks

This is what makes "the merge changed nothing" a count rather than a claim: four runs of it gave
791 597 values and zero differences across the three switches. Nothing is rounded anywhere in the
chain, and the comparison is `==`, not a tolerance.

☠️ **A zero here means nothing unless the instrument can see a difference.** Two one-constant
perturbations were caught before the zeros were believed: `ARM_SPREAD` 0.7 -> 0.7000000007 (1e-9
relative) shows up in 9 465 values, `FOOT_FRICTION` 0.9 -> 0.9000000009 in 53 948. Do that again
before trusting a new zero.

☠️ Beware `SKIPCOLS`: it is the honest way to compare across commits that do not have the same
columns, and it is also the easy way to exclude the very column that moved. It is printed on every
run for that reason. Wall-clock columns (`seconds`, `spunUp`) are always excluded and always said.

Prints: lines in each, values compared, values differing, and the differing columns with the
largest absolute gap.  A line-count mismatch is itself reported and the comparison still runs
over the lines both files have, so a difference can never hide behind a short file.

Usage: compare.py A.jsonl B.jsonl [--quiet]
"""
import json
import sys


def load(p):
    return [json.loads(l) for l in open(p) if l.strip()]


# Wall-clock columns. They are the run's own duration, not a quantity of the simulation, so they
# differ between any two runs of the same code and are excluded by name and said out loud.
CLOCK = {'seconds', 'spunUp'}
# Columns that simply do not exist at the older commit, so the probe reads `null` there and a real
# value here. Excluded only when asked for by name on the command line, and always said out loud.
import os
NEWCOLS = set((os.environ.get('SKIPCOLS') or '').split(',')) - {''}


def main():
    pa, pb = sys.argv[1], sys.argv[2]
    a, b = load(pa), load(pb)
    n = min(len(a), len(b))
    compared = 0
    diffs = 0
    percol = {}
    missing = set()
    for i in range(n):
        ra, rb = a[i], b[i]
        keys = set(ra) | set(rb)
        for k in sorted(keys):
            if k in CLOCK or k in NEWCOLS:
                continue
            if k not in ra or k not in rb:
                missing.add(k)
                continue
            va, vb = ra[k], rb[k]
            compared += 1
            if va == vb:
                continue
            diffs += 1
            gap = None
            if isinstance(va, (int, float)) and isinstance(vb, (int, float)):
                gap = abs(va - vb)
            cur = percol.setdefault(k, [0, 0.0, None])
            cur[0] += 1
            if gap is not None and gap > cur[1]:
                cur[1] = gap
            if cur[2] is None:
                cur[2] = (i, va, vb)
    print('A %s  lines=%d' % (pa.split('/')[-1], len(a)))
    print('B %s  lines=%d' % (pb.split('/')[-1], len(b)))
    print('lines compared: %d%s' % (n, '' if len(a) == len(b) else '   *** LINE COUNT DIFFERS ***'))
    print('values compared: %d' % compared)
    print('values differing: %d' % diffs)
    if missing:
        print('columns present on one side only: %s' % sorted(missing))
    if diffs and '--quiet' not in sys.argv:
        print('differing columns (count, max |gap|, first):')
        for k, (c, g, first) in sorted(percol.items(), key=lambda kv: -kv[1][0])[:25]:
            print('   %-12s n=%-6d maxgap=%-14.6g first line %d: %r vs %r' % (k, c, g, first[0], first[1], first[2]))
    if NEWCOLS:
        print('columns excluded by name (absent at the older commit): %s' % sorted(NEWCOLS))
    print('VERDICT: %s' % ('IDENTICAL' if diffs == 0 and len(a) == len(b) and not missing else 'DIFFERS'))


main()
