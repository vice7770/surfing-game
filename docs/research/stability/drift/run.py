#!/usr/bin/env python3
"""3.6h's probe runner (README §0.3): runs drift-probe.mjs over configurations, at most 8 game processes machine-wide.

    python3 -I run.py --bundle <drift-probe.mjs> --root <dir> --set screen|wide CONFIG [CONFIG ...]

A CONFIG is `name=<switches>` (`ankle05=&pushAnkle=0.5`), `name=` (off) or `name=knobs:<KNOBS>` (R: `R=knobs:designDelay=4,captureDelay=4`).
Each writes <root>/<name>/big_s<seed>.jsonl, as the benchmark's report names them, so that
`stability-report.mjs --mode full --only big --reuse --out <root>/<name>` measures every ride.
"""
import argparse, os, subprocess, sys, time

BASE = '&cueLater=on&plantFloor=6'
STANCES = ['none', 'crouch', 'compress', 'snap']
BENCH_BIG = ['hisway'] + [f'{s}:{w}' for s in STANCES for w in ('left', 'right')] + ['twin']
SCREEN = BENCH_BIG + ['compress:straight', 'crouch:straight']
# Amendment 1 (README §0.10): the deep turns and the straight deep rides only, with the twin for the cause labels.
DEEPSET = ['compress:left', 'compress:right', 'crouch:left', 'crouch:right', 'compress:straight', 'crouch:straight', 'twin']
RELEASE = ['release0', 'release0.2', 'release0.4', 'release0.6']
WIDE = SCREEN + ['none:straight', 'snap:straight', 'hisway:left', 'hisway:right'] + [f'{r}:{w}' for r in RELEASE for w in ('left', 'right')] + RELEASE
CAP = 8


def running():
    out = subprocess.run(['pgrep', '-f', 'node --max-old-space-size=3200'], capture_output=True, text=True).stdout.split()
    return len(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--bundle', required=True)
    ap.add_argument('--root', required=True)
    ap.add_argument('--set', default='screen')
    ap.add_argument('--cap', type=int, default=CAP)
    ap.add_argument('--seeds', default='1,2,3')
    ap.add_argument('configs', nargs='+')
    a = ap.parse_args()
    queue = []
    for c in a.configs:
        name, _, spec = c.partition('=')
        knobs = ''
        extra = BASE
        if spec.startswith('knobs:'):
            knobs = spec[len('knobs:'):]
        else:
            extra = BASE + spec
        scripts = WIDE if (a.set == 'wide' or spec.startswith('knobs:') or name == 'off') else DEEPSET if a.set == 'deep' else SCREEN
        os.makedirs(os.path.join(a.root, name), exist_ok=True)
        for seed in [int(x) for x in a.seeds.split(',')]:
            env = {'MODE': 'organic', 'SWELL': 'big', 'SEED': str(seed), 'PERIODS': '12', 'SCRIPTS': ','.join(scripts),
                   'EXTRA': extra, 'HOLD': '5', 'TURN_AT': '1', 'TURN_FOR': '1',
                   'OUT': os.path.join(a.root, name, f'big_s{seed}.jsonl')}
            if knobs:
                env['KNOBS'] = knobs
            queue.append((len(scripts), name, seed, env))
    queue.sort(key=lambda j: -j[0])
    live = []
    while queue or live:
        live = [(p, n, s, t) for (p, n, s, t) in live if p.poll() is None or not report(p, n, s, t)]
        while queue and running() < a.cap:
            _, name, seed, env = queue.pop(0)
            log = open(env['OUT'].replace('.jsonl', '.log'), 'w')
            p = subprocess.Popen(['node', '--max-old-space-size=3200', a.bundle], env={**os.environ, **env}, stdout=log, stderr=log)
            print(f'{time.strftime("%H:%M:%S", time.gmtime())} start {name} s{seed} ({len(queue)} queued)', flush=True)
            live.append((p, name, seed, time.time()))
            time.sleep(2)
        time.sleep(5)


def report(p, name, seed, t0):
    print(f'{time.strftime("%H:%M:%S", time.gmtime())} done {name} s{seed} exit {p.returncode} in {time.time() - t0:.0f} s', flush=True)
    return True


if __name__ == '__main__':
    main()
