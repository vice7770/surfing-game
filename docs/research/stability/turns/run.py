#!/usr/bin/env python3
"""3.6b's probe runner (README §0.3, §0.6): runs turn-probe.mjs over a set of rides, at most 4 processes at once.

    python3 run.py --bundle <turn-probe.mjs> --out <dir> [--extra '&cueLater=on&plantFloor=6'] [--set onset|hisway] [--jobs 4]

Sets:
  onset   the benchmark's full matrix plus the straight twins and the his-way turns (the switch-off diagnosis run)
  hisway  the his-way turn drives only (hisway, hisway:left, hisway:right; the Canyon processes carry the twin) — per arm

File names follow the benchmark's (`tw-catch_compress_left.jsonl`, `big_s1.jsonl`), so the benchmark's report can re-read
a filtered copy with --reuse (inert.py).
"""
import argparse, os, subprocess, sys, time

STANCES = ['none', 'crouch', 'compress', 'snap']
STEERS = ['straight', 'left', 'right']
HIS = ['hisway', 'hisway:left', 'hisway:right']


def jobs(which):
    out = []
    if which == 'onset':
        big = HIS + [f'{s}:{w}' for s in STANCES for w in STEERS] + ['twin']
        med = HIS + ['none:straight', 'none:left', 'none:right', 'twin']
        tw = [f'{s}:{w}' for s in STANCES for w in STEERS] + HIS
    else:
        big = HIS + ['twin']
        med = HIS + ['twin']
        tw = ['hisway:left', 'hisway:right']
    for seed in (1, 2, 3):
        out.append((f'big:s{seed}', {'MODE': 'organic', 'SWELL': 'big', 'SEED': str(seed), 'PERIODS': '12', 'SCRIPTS': ','.join(big)}, 3))
    for seed in (1, 2, 3):
        out.append((f'med:s{seed}', {'MODE': 'organic', 'SWELL': 'medium', 'SEED': str(seed), 'PERIODS': '12', 'SCRIPTS': ','.join(med)}, 2))
    for t in ('catch', 'ride'):
        for s in tw:
            out.append((f'tw-{t}:{s}', {'MODE': 'tw', 'TW': t, 'SCRIPT': s}, 1))
        if t == 'catch' and which == 'onset':
            out.append((f'tw-{t}:twin', {'MODE': 'tw', 'TW': t, 'SCRIPT': 'twin'}, 1))
    return sorted(out, key=lambda j: -j[2])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--bundle', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--extra', default='&cueLater=on&plantFloor=6')
    ap.add_argument('--set', default='onset')
    ap.add_argument('--jobs', type=int, default=4)
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    queue = [j for j in jobs(a.set) if j[0].startswith(a.only)]
    running = []
    t0 = time.time()
    while queue or running:
        while queue and len(running) < min(4, a.jobs):
            jid, env, _ = queue.pop(0)
            f = os.path.join(a.out, jid.replace(':', '_') + '.jsonl')
            if os.path.exists(f) and any('"kind":"done"' in l for l in open(f)):
                continue
            e = dict(os.environ, **env, EXTRA=a.extra, HOLD='5', TURN_AT='1', TURN_FOR='1', OUT=f)
            log = open(f.replace('.jsonl', '.log'), 'w')
            p = subprocess.Popen(['node', '--max-old-space-size=3200', a.bundle], env=e, stdout=log, stderr=log)
            running.append((jid, p, time.time()))
        time.sleep(2)
        for r in running[:]:
            if r[1].poll() is not None:
                running.remove(r)
                print(f'  {r[0]}: exit {r[1].returncode} in {time.time() - r[2]:.0f} s (wall {time.time() - t0:.0f} s)', flush=True)
    print(f'all done in {time.time() - t0:.0f} s', flush=True)


if __name__ == '__main__':
    main()
