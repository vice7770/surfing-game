#!/usr/bin/env python3
"""3.6j's probe runner (README §0.4), 3.6i's with this round's sets: first-probe.mjs over configurations, at most 8 game processes machine-wide.

    python3 -I run.py --bundle <entry-probe.mjs> --root <dir> [--set screen|extra] [--tw] CONFIG [CONFIG ...]

A CONFIG is `name=<switches>` (`e2=&turnPlan=0.25`) or `name=knobs:<KNOBS>`. Each writes <root>/<name>/big_s<seed>.jsonl
(Canyon Big, seeds 1-3, PERIODS 12) and, with --tw, <root>/<name>/tw-<catch|ride>_<stance>_<left|right>.jsonl for the
test wave's eight deep turns, named as the benchmark's report names them, so that
`stability-report.mjs --mode full --reuse --only big|tw- --out <root>/<name>` measures every ride.
"""
import argparse, os, subprocess, time

BASE = '&cueLater=on&plantFloor=6'
DEEP = ['compress:left', 'compress:right', 'crouch:left', 'crouch:right']
SCREEN = DEEP + ['hisway:left', 'hisway:right', 'release0:left', 'release0:right', 'compress:straight', 'crouch:straight', 'none:left', 'none:right', 'snap:left', 'snap:right', 'twin']
EXTRA = ['release0.2:left', 'release0.2:right', 'release0.4:left', 'release0.4:right', 'release0.6:left', 'release0.6:right', 'release0',
         'none:rev', 'compress:rev', 'crouch:rev', 'none:long', 'compress:long', 'crouch:long', 'twin']
CAP = 8


def running():
    return len(subprocess.run(['pgrep', '-f', 'node --max-old-space-size=3200'], capture_output=True, text=True).stdout.split())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--bundle', required=True)
    ap.add_argument('--root', required=True)
    ap.add_argument('--set', default='screen')
    ap.add_argument('--tw', action='store_true')
    ap.add_argument('--big', default='on')
    ap.add_argument('--cap', type=int, default=CAP)
    ap.add_argument('configs', nargs='+')
    a = ap.parse_args()
    queue = []
    scripts = SCREEN if a.set == 'screen' else EXTRA
    for c in a.configs:
        name, _, spec = c.partition('=')
        knobs, extra = '', BASE
        if spec.startswith('knobs:'):
            knobs = spec[len('knobs:'):]
        else:
            extra = BASE + spec
        d = os.path.join(a.root, name)
        os.makedirs(d, exist_ok=True)
        if a.big == 'on':
            for seed in (1, 2, 3):
                env = {'MODE': 'organic', 'SWELL': 'big', 'SEED': str(seed), 'PERIODS': '12', 'SCRIPTS': ','.join(scripts), 'EXTRA': extra,
                       'HOLD': '5', 'TURN_AT': '1', 'TURN_FOR': '1', 'OUT': os.path.join(d, f'big_s{seed}.jsonl')}
                if knobs: env['KNOBS'] = knobs
                queue.append((10, name, f'big s{seed}', env))
        if a.tw:
            for tw in ('catch', 'ride'):
                for s in DEEP:
                    env = {'MODE': 'tw', 'TW': tw, 'SCRIPT': s, 'EXTRA': extra, 'HOLD': '5', 'TURN_AT': '1', 'TURN_FOR': '1',
                           'OUT': os.path.join(d, f"tw-{tw}_{s.replace(':', '_')}.jsonl")}
                    if knobs: env['KNOBS'] = knobs
                    queue.append((1, name, f'tw-{tw} {s}', env))
    live = []
    while queue or live:
        still = []
        for (p, n, s, t) in live:
            if p.poll() is None: still.append((p, n, s, t))
            else: print(f'{time.strftime("%H:%M:%S", time.gmtime())} done {n} {s} exit {p.returncode} in {time.time() - t:.0f} s', flush=True)
        live = still
        while queue and running() < a.cap:
            _, name, label, env = queue.pop(0)
            log = open(env['OUT'].replace('.jsonl', '.log'), 'w')
            p = subprocess.Popen(['node', '--max-old-space-size=3200', a.bundle], env={**os.environ, **env}, stdout=log, stderr=log)
            print(f'{time.strftime("%H:%M:%S", time.gmtime())} start {name} {label} ({len(queue)} queued)', flush=True)
            live.append((p, name, label, time.time()))
            time.sleep(2)
        time.sleep(5)


if __name__ == '__main__':
    main()
