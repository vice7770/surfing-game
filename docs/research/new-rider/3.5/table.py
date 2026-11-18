"""`merge-bench.ts`'s summariser (PR #426): the combination table, one `MODE=sea` file per arm.

    python3 -I docs/research/new-rider/3.5/table.py <arm>.jsonl [<arm>.jsonl ...]

One row an arm: live frames, `tip` of 90, the median first `tip` frame, the median ride, the board's
roll peak, the two pinned shares, cone binds and `foot slip` releases. On the owner's address it
reproduces #421's published `ships` row (90 of 90 at frame 46, 1.3333 s, 65.65 deg, 51.96 %, cone 6)
and its `?bodyBank=hip` row (66 of 90 at 38.5, 1.0833 s, 52.43 deg, 32.25 %, cone 28, 2 slips).

☠️ **`pinned%` is `limitTime.tip > 0`, the step's decaying memory — NOT `limit == 'tip'`, which reads
16.50 % on the same file.** `limit` is ONE substep of 32 and the step keeps only the last, so anyone
re-measuring the pinned share off `limit` would publish a third of #421's 52.0 % and conclude the
bench was broken. Both are printed: `pinned%` is the published quantity, `pinNow%` the stricter
instantaneous one.

☠️ And when invoking `merge-bench.ts` itself from zsh, use `env SECONDS=…`: a bare `SECONDS=0.5`
goes through zsh's own special INTEGER variable, arrives as `"0"`, ends every run at frame 1, and
still prints a tidy table here with no error anywhere. Integer horizons such as the default 4
survive, so published 4-second benches are unaffected.

Every quantity carries its population. Medians are PLAIN medians (the mean of the two middle
elements at even length), never `qt(v, 0.5)`'s upper middle.

Live frames only: the file is already cut at the first `attached == 0` by the bench, and that
frame is emitted, so the kept count is the file's own frame-row count per run.

`pinned%` is #421's own published quantity, reproduced to the decimal on the `ships` arm (52.0 %):
the share of live frames in which `limitTime.tip > 0`, i.e. the tip limit bound inside the step's
own CAUSE_MEMORY. It is deliberately NOT read off `limit`, which is one substep of 32 and only the
last one survives the step (16.50 % on `ships`).

`pinNow%` is the stricter instantaneous reading beside it: the share of live frames in which the
DEMANDED centre of pressure lies outside the foot support box right now — `wantX`/`wantZ` against
`supXMin..supXMax` / `supZMin..supZMax`, the very condition `project` clamps on.
"""
import json
import sys


def median(x):
    if not x:
        return float('nan')
    s = sorted(x)
    m = len(s) // 2
    return s[m] if len(s) % 2 else (s[m - 1] + s[m]) / 2


def one(path):
    runs = {}
    order = []
    arm = None
    for line in open(path):
        if not line.strip():
            continue
        r = json.loads(line)
        if r.get('note') == 'seatbelt':
            arm = r['arm']
            seat = r
            continue
        if r.get('done'):
            done = r
            continue
        if r.get('summary'):
            continue
        key = (r['trial'], r['entry'], r['stance'])
        if key not in runs:
            runs[key] = {'frames': 0, 'pinned': 0, 'pinNow': 0, 'tip': 0, 'firstTip': None, 'slip': 0,
                         'rollPeak': 0.0, 'fellAt': None, 'cause': None}
            order.append(key)
        e = runs[key]
        e['frames'] += 1
        out = (r['wantX'] is not None and (r['wantX'] < r['supXMin'] or r['wantX'] > r['supXMax'])) or \
              (r['wantZ'] is not None and (r['wantZ'] < r['supZMin'] or r['wantZ'] > r['supZMax']))
        if out:
            e['pinNow'] += 1
        if r['tTip'] and r['tTip'] > 0:
            e['tip'] += 1
            e['pinned'] += 1
            if e['firstTip'] is None:
                e['firstTip'] = r['frame']
        if r['tSlip'] and r['tSlip'] > 0:
            e['slip'] += 1
        if r['roll'] is not None:
            e['rollPeak'] = max(e['rollPeak'], abs(r['roll']))
        if r['off']:
            e['fellAt'] = r['frame']
            e['cause'] = r['sep']
    rs = [runs[k] for k in order]
    live = sum(e['frames'] for e in rs)
    return {
        'arm': arm, 'grid': seat['grid'], 'cells': seat['cells'],
        'runs': len(rs), 'live': live,
        'fell': sum(1 for e in rs if e['fellAt'] is not None),
        'tipRuns': sum(1 for e in rs if e['tip'] > 0),
        'firstTipMed': median([e['firstTip'] for e in rs if e['firstTip'] is not None]),
        'rideMed': median([(e['fellAt'] if e['fellAt'] is not None else 240) / 60 for e in rs]),
        'rollPeakMed': median([e['rollPeak'] for e in rs]),
        'pinnedShare': sum(e['pinned'] for e in rs) / live if live else float('nan'),
        'pinNowShare': sum(e['pinNow'] for e in rs) / live if live else float('nan'),
        'coneRuns': sum(1 for e in rs if e['slip'] > 0),
        'slipReleases': sum(1 for e in rs if e['cause'] == 'foot slip'),
        'causes': {c: sum(1 for e in rs if e['cause'] == c) for c in sorted({e['cause'] for e in rs if e['cause']})},
        'seconds': done['seconds'],
    }


print('%-18s %5s %6s %6s %7s %7s %8s %8s %8s %6s %6s' % (
    'arm', 'runs', 'live', 'tip/90', 'tipFr', 'ride s', 'rollPk', 'pinned%', 'pinNow%', 'cone', 'slip'))
for p in sys.argv[1:]:
    d = one(p)
    print('%-18s %5d %6d %6d %7.1f %7.4f %8.2f %8.2f %8.2f %6d %6d   grid=%s  %.0fs' % (
        d['arm'], d['runs'], d['live'], d['tipRuns'], d['firstTipMed'], d['rideMed'],
        d['rollPeakMed'], 100 * d['pinnedShare'], 100 * d['pinNowShare'], d['coneRuns'],
        d['slipReleases'], d['grid'], d['seconds']))
    print('      fell %d of %d, causes %s' % (d['fell'], d['runs'], d['causes']))
