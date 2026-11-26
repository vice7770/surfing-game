#!/usr/bin/env python3
"""3.6c's probe runner (README §0.3, §0.7): runs wobble-probe.mjs over a set of rides, at most --jobs processes at once.

    python3 -I run.py --bundle <wobble-probe.mjs> --out <dir> --set base|knobs [--jobs 8] [--only <prefix>]

Sets:
  base   knobs off. The benchmark's full Canyon matrix and test-wave rides (the inertness control, README §0.6 item 1),
         plus the straight rides of every stance on Big, his way's turns, and the release drives (M7) on every sea; the
         bare boards (M1) on Big.
  knobs  the straight rides (none, crouch, compress, snap, hisway) on Big seeds 1-3, one process per knob setting and
         seed (M4, M5): out/<setting>/big_s<seed>.jsonl.

File names follow the benchmark's (`tw-catch_compress_left.jsonl`, `big_s1.jsonl`), so the benchmark's report can re-read
a filtered copy with --reuse.
"""
import argparse, os, subprocess, time

STANCES = ['none', 'crouch', 'compress', 'snap']
STEERS = ['straight', 'left', 'right']
RELEASE = ['release0', 'release0.2', 'release0.4', 'release0.6']
SETTINGS = {
    'knee0.7': 'knee=0.7', 'knee1.3': 'knee=1.3',
    'twist0.7': 'twistGain=0.7', 'twist1.3': 'twistGain=1.3',
    'ankle0.7': 'ankleGain=0.7', 'ankle1.3': 'ankleGain=1.3',
    'sense-2': 'senseShift=-2', 'sense+2': 'senseShift=2',
    'fins0.7': 'fins=0.7', 'fins1.3': 'fins=1.3',
    'design0': 'designDepth=0', 'split0': 'splitDepth=0', 'both0': 'designDepth=0,splitDepth=0',
}


def jobs(which):
    out = []
    if which == 'base':
        bench_big = ['hisway'] + [f'{s}:{w}' for s in STANCES for w in ('left', 'right')] + ['twin']
        big = bench_big + [f'{s}:straight' for s in STANCES] + ['hisway:left', 'hisway:right'] \
            + [f'{r}:{w}' for r in RELEASE for w in ('left', 'right')] + RELEASE
        med = ['hisway', 'none:left', 'none:right', 'twin', 'none:straight', 'hisway:left', 'hisway:right'] \
            + [f'{r}:{w}' for r in RELEASE for w in ('left', 'right')]
        tw = [f'{s}:{w}' for s in STANCES for w in STEERS] + ['hisway', 'hisway:left', 'hisway:right'] \
            + [f'{r}:{w}' for r in RELEASE for w in ('left', 'right')]
        for seed in (1, 2, 3):
            out.append((f'big:s{seed}', '', {'MODE': 'organic', 'SWELL': 'big', 'SEED': str(seed), 'PERIODS': '12', 'SCRIPTS': ','.join(big), 'BARE': 'on'}, 5))
        for seed in (1, 2, 3):
            out.append((f'med:s{seed}', '', {'MODE': 'organic', 'SWELL': 'medium', 'SEED': str(seed), 'PERIODS': '12', 'SCRIPTS': ','.join(med)}, 4))
        for t in ('catch', 'ride'):
            for s in tw:
                out.append((f'tw-{t}:{s}', '', {'MODE': 'tw', 'TW': t, 'SCRIPT': s}, 1))
            if t == 'catch':
                out.append((f'tw-{t}:twin', '', {'MODE': 'tw', 'TW': t, 'SCRIPT': 'twin'}, 1))
    elif which == 'knobs':
        scripts = [f'{s}:straight' for s in STANCES] + ['hisway']
        for name, knobs in SETTINGS.items():
            for seed in (1, 2, 3):
                out.append((f'{name}/big:s{seed}', knobs, {'MODE': 'organic', 'SWELL': 'big', 'SEED': str(seed), 'PERIODS': '12', 'SCRIPTS': ','.join(scripts)}, 2))
    return sorted(out, key=lambda j: -j[3])


def probes(bundle):
    """How many node processes run this bundle now, machine-wide (any runner's)."""
    out = subprocess.run(['pgrep', '-f', 'node --max-old-space-size=3200 ' + bundle], capture_output=True, text=True).stdout.split()
    return len(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--bundle', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--extra', default='&cueLater=on&plantFloor=6')
    ap.add_argument('--set', default='base')
    ap.add_argument('--jobs', type=int, default=8)
    ap.add_argument('--only', default='')
    ap.add_argument('--reverse', action='store_true', help='take the queue from its end')
    ap.add_argument('--fresh', action='store_true', help='start only jobs whose file does not exist yet (a runner taking over from another)')
    ap.add_argument('--total', type=int, default=0, help='also keep the machine-wide count of this bundle\'s processes below this')
    a = ap.parse_args()
    queue = [j for j in jobs(a.set) if j[0].startswith(a.only)]
    if a.reverse:
        queue.reverse()
    running = []
    t0 = time.time()
    while queue or running:
        while queue and len(running) < min(8, a.jobs) and (a.total <= 0 or probes(a.bundle) < a.total):
            jid, knobs, env, _ = queue.pop(0)
            sub, _, rid = jid.rpartition('/')
            d = os.path.join(a.out, sub)
            os.makedirs(d, exist_ok=True)
            f = os.path.join(d, rid.replace(':', '_') + '.jsonl')
            # Done already (or, with --fresh, started by an earlier runner of the same set, done or not): skip.
            if os.path.exists(f) and (a.fresh or any('"kind":"done"' in l for l in open(f))):
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
