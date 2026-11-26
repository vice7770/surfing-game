#!/usr/bin/env python3
"""3.6h: the screening table (README §2) from screen.py's JSON files.  python3 -I table.py <screen.json> [...]"""
import json, sys

rows = []
for p in sys.argv[1:]:
    rows += json.load(open(p))
print('| configuration | deep turns still falling for balance (of 39) | all deep-turn balance falls (of 72) / new | course +0.5 s, mean on − off (n; up/down) | course +1.0 s, mean (n; up/down; reach only on/off) | peak yaw, mean | regressions on the carried Big rides | swing on / off, Compress straight (down of n) | the tuck straight |')
print('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for r in rows:
    c5, c10, sw = r['course05'], r['course10'], r['swing']
    f = lambda v: '—' if v is None else f'{v:+.2f}'
    s = lambda k: '—' if sw[k]['ratio'] is None else f"{sw[k]['ratio']:.2f} ({sw[k]['down']} of {sw[k]['n']})"
    print(f"| {r['name']} | {r['stillFalling']} | {r['deepBalanceNow']} / {r['newBalance']} | {f(c5['mean'])}° ({c5['n']}; {c5['up']}/{c5['down']}) | {f(c10['mean'])}° ({c10['n']}; {c10['up']}/{c10['down']}; {c10['onlyOn']}/{c10['onlyOff']}) | {f(r['yawPeak']['mean'])} | {r['regressions']} | {s('compress:straight')} | {s('crouch:straight')} |")
