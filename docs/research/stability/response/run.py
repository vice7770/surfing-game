#!/usr/bin/env python3
"""3.6d's probe runner (README §0.3, §0.4, §0.9): 3.6c's run.py with this round's sets; at most --jobs processes at once.

    python3 -I run.py --bundle <response-probe.mjs> --out <dir> --set ident|q1|twins [--jobs 8] [--only <prefix>]

Sets:
  ident  every knob off, no twins: the five straight scripts of 3.6c's knob runs on Big seed 1 (README §0.3's identity).
  q1     the same five scripts on Big seeds 1-3, one process per setting and seed: out/<setting>/big_s<seed>.jsonl
         (design4, design8: the matched delay; capture4, capture8: the second line).
  twins  compress:straight, none:straight and crouch:straight on Big seeds 1-3, each with its 50 twins, knobs off:
         out/big_s<seed>.jsonl.
"""
import argparse, os, subprocess, time

STRAIGHT = ['none:straight', 'crouch:straight', 'compress:straight', 'snap:straight', 'hisway']
SETTINGS = {'design4': 'designDelay=4', 'design8': 'designDelay=8', 'capture4': 'captureDelay=4', 'capture8': 'captureDelay=8'}
TWINS = ['compress:straight', 'none:straight', 'crouch:straight']


def jobs(which):
    out = []
    big = {'MODE': 'organic', 'SWELL': 'big', 'PERIODS': '12'}
    if which == 'ident':
        out.append(('big:s1', '', dict(big, SEED='1', SCRIPTS=','.join(STRAIGHT)), 1))
    elif which == 'q1':
        for name, knobs in SETTINGS.items():
            for seed in (1, 2, 3):
                out.append((f'{name}/big:s{seed}', knobs, dict(big, SEED=str(seed), SCRIPTS=','.join(STRAIGHT)), 1))
    elif which == 'twins':
        for seed in (1, 2, 3):
            out.append((f'big:s{seed}', '', dict(big, SEED=str(seed), SCRIPTS=','.join(TWINS), TWINS=','.join(TWINS)), 2))
    return sorted(out, key=lambda j: -j[3])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--bundle', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--extra', default='&cueLater=on&plantFloor=6')
    ap.add_argument('--set', default='q1')
    ap.add_argument('--jobs', type=int, default=8)
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    queue = [j for j in jobs(a.set) if j[0].startswith(a.only)]
    running = []
    t0 = time.time()
    while queue or running:
        while queue and len(running) < min(8, a.jobs):
            jid, knobs, env, _ = queue.pop(0)
            sub, _, rid = jid.rpartition('/')
            d = os.path.join(a.out, sub)
            os.makedirs(d, exist_ok=True)
            f = os.path.join(d, rid.replace(':', '_') + '.jsonl')
            if os.path.exists(f) and any('"kind":"done"' in l for l in open(f)):
                continue
            e = dict(os.environ, **env, EXTRA=a.extra, HOLD='5', TURN_AT='1', TURN_FOR='1', OUT=f, KNOBS=knobs)
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
