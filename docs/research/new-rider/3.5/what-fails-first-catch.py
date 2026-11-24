"""Step 3.5x: the catch start with cueLater on, A and B against 3.5v's R (what-fails-first.md section 9.2).

    python3 what-fails-first-catch.py <scratch dir> <results/35v/data>
"""
import json, glob, gzip, os, re, sys
S = sys.argv[1]  # the directory holding catch/c-<script>-on-<pf6|tp>-<run>.jsonl
V = sys.argv[2]  # results/35v/data
def summ(path):
    op = gzip.open if path.endswith('.gz') else open
    s = b = None
    for l in op(path, 'rt'):
        if '"summary"' in l: s = json.loads(l)
        if '"built"' in l: b = json.loads(l)
    return s, b
print('| run | script | R (3.5v c-*-on-base): stand / fell after (s) / cause | A (`plantFloor=6`) | B (`taper`) | builds A, B |')
print('| --- | --- | --- | --- | --- | --- |')
for run in range(10):
    for sc in ('cue', 'cueC'):
        r, _ = summ(f'{V}/c-{sc}-on-base-{run}.jsonl.gz')
        cells = []
        blt = []
        for tag in ('pf6', 'tp'):
            p = f'{S}/catch/c-{sc}-on-{tag}-{run}.jsonl'
            if not os.path.exists(p): cells.append('—'); blt.append('—'); continue
            s, b = summ(p)
            if s is None: cells.append('running'); blt.append('—'); continue
            same = 'same stand' if s.get('stand') == r.get('stand') else f"stand {s.get('stand')}"
            cells.append(f"{same} / {s.get('fellAfterStand') if s.get('fellAfterStand') is not None else ('>= 3' if s.get('stand') else '—')} / {s.get('cause')}")
            blt.append('—' if b is None else f"{b.get('cueLater')}/{b.get('plantFloor')}/{b.get('plantSpeed')}")
        rf = r.get('fellAfterStand')
        print(f"| {run} | {sc} | {r.get('stand')} / {rf if rf is not None else ('>= 3' if r.get('stand') else '—')} / {r.get('cause')} | {cells[0]} | {cells[1]} | {', '.join(blt)} |")
