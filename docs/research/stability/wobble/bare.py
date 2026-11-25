#!/usr/bin/env python3
"""3.6c M1: the riderless yaw budget on Canyon water. The probe's `bare` rows (BARE=on): a bare board copied from the
`none:straight` ride's board at tS 0.5 s and stepped 120 steps on the same water, no rider.

    python3 -I bare.py <run dir> [--md out.md]

Per board (seed, wave): the largest |residual| over its steps, closed (`rider`) and shipped (`rider − duplicate +
suction`, the yaw ledger as it ships), N·m; the largest |total| and |fins|, |pressure| beside them, for scale; and the
roll ledger's residual (closed since 3.3h) for comparison.
"""
import glob, json, os, sys

d = sys.argv[1]
md = sys.argv[sys.argv.index('--md') + 1] if '--md' in sys.argv else None
boards = {}
for path in sorted(glob.glob(os.path.join(d, 'big_s*.jsonl'))):
    seed = os.path.basename(path)[5:-6]
    for line in open(path):
        if not line.startswith('{"kind":"bare"'):
            continue
        r = json.loads(line)
        boards.setdefault((seed, r['wave']), []).append(r)
lines = ['# 3.6c M1: bare boards on Canyon Big water (no rider), the yaw ledger closed against as shipped', '',
         '| board | steps | max \\|residual\\| closed (N·m) | max \\|residual\\| shipped (N·m) | max \\|total\\| | max \\|fins\\| | max \\|pressure\\| | max \\|roll residual\\| | speed first / last (m/s) |',
         '| --- | --- | --- | --- | --- | --- | --- | --- | --- |']
worst = 0.0
worst_shipped = []
for (seed, wave), rs in sorted(boards.items()):
    mc = max(abs(r['rider']) for r in rs)
    ms = max(abs(r['shipped']) for r in rs)
    worst = max(worst, mc)
    worst_shipped.append(ms)
    lines.append(f"| s{seed} w{wave} | {len(rs)} | {mc:.2e} | {ms:.2f} | {max(abs(r['total']) for r in rs):.2f} | {max(abs(r['fins']) for r in rs):.2f} | {max(abs(r['pressure']) for r in rs):.2f} | {max(abs(r['rollRider']) for r in rs):.2e} | {rs[0]['vG']:.2f} / {rs[-1]['vG']:.2f} |")
lines.append('')
lines.append(f'{len(boards)} boards, {sum(len(v) for v in boards.values())} steps: the closed residual at most {worst:.2e} N·m; the shipped residual\'s per-board maximum {min(worst_shipped) if worst_shipped else float("nan"):.2f}–{max(worst_shipped) if worst_shipped else float("nan"):.2f} N·m.')
text = '\n'.join(lines) + '\n'
print(text)
if md:
    open(md, 'w').write(text)
