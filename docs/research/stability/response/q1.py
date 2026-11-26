#!/usr/bin/env python3
"""3.6d question 1 (README §0.3): the matched, mismatched and second-line shifts from 3.6c's freq.py table, unchanged.

    python3 -I q1.py <freq.py --md output> <out.md> <out q1.json>

Reads the pooled peaks, their 90 % intervals, the paired zero-crossing shifts and the paired amplitude ratios that
freq.py printed for `off`, `design4`/`design8`, `sense-2`/`sense+2` and `capture4`/`capture8`, and applies 3.6c's rule
(§0.3 M4) to each pair with e = ln(f8 / f4) / ln(8 / 4): carries if |e| >= 0.25, the two shifts on opposite sides of off
and both intervals clear of the off peak; does not carry if |e| < 0.10 and both peaks within +-0.15 Hz of off; else partly.
"""
import json, math, re, sys

src, out_md, out_json = sys.argv[1:4]
cells = {}
for line in open(src):
    m = re.match(r'\| (\S+) \| ([^|]+) \| (\d+) \| ([\d.]+) \[([\d.]+), ([\d.]+)\] \| ([\d.]+) \|(.*)\|\s*$', line)
    if not m:
        continue
    setting, stance = m.group(1), m.group(2).strip()
    rest = [x.strip() for x in m.group(8).split('|')]
    cells[(setting, stance)] = {
        'rides': int(m.group(3)), 'peak': float(m.group(4)), 'lo': float(m.group(5)), 'hi': float(m.group(6)), 'amp': float(m.group(7)),
        'paired': rest[0] if len(rest) > 0 else '', 'dz': rest[1] if len(rest) > 1 else '', 'ratio': rest[2] if len(rest) > 2 else '',
    }
STANCES = ['tall', 'tuck', 'Compress', 'Snap', 'his way']
SCRIPT = {'tall': 'none:straight', 'tuck': 'crouch:straight', 'Compress': 'compress:straight'}
PAIRS = [('matched (designDelay)', 'design4', 'design8'), ('mismatched (senseShift, 3.6c)', 'sense-2', 'sense+2'), ('the second line (captureDelay)', 'capture4', 'capture8')]
L = ['# 3.6d question 1: the matched delay beside the mismatched shift and the second line', '',
     "From 3.6c's freq.py (window as given in its title line), unchanged; e = ln(f8 / f4) / ln(8 / 4); 3.6c's rule (§0.3 M4).", '',
     '| knob | stance | peak Hz at 4 / off / 8 ticks [90 %] | e | shifts vs off (Hz) | verdict | paired size ratio at 4 ; at 8 (rides up/down) | rides at 4 / off / 8 |',
     '| --- | --- | --- | --- | --- | --- | --- | --- |']
q1 = {}
for name, lo_s, hi_s in PAIRS:
    for st in STANCES:
        a, o, b = cells.get((lo_s, st)), cells.get(('off', st)), cells.get((hi_s, st))
        if not (a and o and b):
            continue
        e = math.log(b['peak'] / a['peak']) / math.log(8 / 4)
        dl, dh = a['peak'] - o['peak'], b['peak'] - o['peak']
        excl = (a['hi'] < o['peak'] or a['lo'] > o['peak']) and (b['hi'] < o['peak'] or b['lo'] > o['peak'])
        opposite = (dl < 0 < dh) or (dh < 0 < dl)
        verdict = 'carries' if abs(e) >= 0.25 and opposite and excl else 'does not carry' if abs(e) < 0.10 and abs(dl) <= 0.15 and abs(dh) <= 0.15 else 'partly'
        L.append(f"| {name} | {st} | {a['peak']:.2f} [{a['lo']:.2f}, {a['hi']:.2f}] / {o['peak']:.2f} / {b['peak']:.2f} [{b['lo']:.2f}, {b['hi']:.2f}] | {e:+.2f} | {dl:+.2f} / {dh:+.2f} | {verdict} | {a['ratio']} ; {b['ratio']} | {a['rides']} / {o['rides']} / {b['rides']} |")
        if st in SCRIPT:
            key = {'design4': 'designDelay 4', 'design8': 'designDelay 8', 'sense-2': 'senseShift -2', 'sense+2': 'senseShift +2'}
            q1.setdefault(SCRIPT[st], {})
            if lo_s in key:
                q1[SCRIPT[st]][key[lo_s]] = a['peak']
                q1[SCRIPT[st]][key[hi_s]] = b['peak']
            q1[SCRIPT[st]]['off'] = o['peak']
open(out_md, 'w').write('\n'.join(L) + '\n')
json.dump(q1, open(out_json, 'w'), indent=1)
print('\n'.join(L))
