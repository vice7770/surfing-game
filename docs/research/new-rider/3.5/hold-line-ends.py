"""Step 3.5s: how the hold arm's rides go (straight-fall.ts frames with the 3.5s columns).
Per cell: the bank the hold asks (game sign, + toward the face: the model's holdBank turned over) against the body's
bank over 1-3 s; whether the hold sat at its rate bound; and, over the last 1 s before the fall, the speed through the
water, the heading from the line, the hold's ask, the yaw rate and the rail.
    python3 docs/research/new-rider/3.5/hold-line-ends.py <frames.jsonl>
"""
import json, statistics as st, sys
def med(xs, n=1):
    xs = [x for x in xs if x is not None]
    return '-' if not xs else f"{st.median(xs):+.{n}f} ({min(xs):+.{n}f} to {max(xs):+.{n}f}, n {len(xs)})"
cells = {}
for l in open(sys.argv[1]):
    d = json.loads(l)
    if d.get('kind') == 'frame' and d['attached']: cells.setdefault(d['cell'], []).append(d)
ask, bank, gap, endV, endErr, endAsk, endYaw, endRail, peakYawUp, tTurnBack = [], [], [], [], [], [], [], [], [], []
for c, fr in cells.items():
    mid = [f for f in fr if 1.0 <= f['t'] <= 3.0 and f.get('holdBank') is not None]
    if mid:
        a = st.mean(-f['holdBank'] for f in mid); b = st.mean(f['bank'] for f in mid)
        ask.append(a); bank.append(b); gap.append(a - b)
    end = fr[-1]['t']
    last = [f for f in fr if f['t'] >= end - 1.0]
    endV.append(st.mean(f['speedThrough'] for f in last)); endErr.append(st.mean(f['lineErr'] for f in last))
    endAsk.append(st.mean(-(f.get('holdBank') or 0) for f in last)); endYaw.append(max(f['yawRate'] for f in last)); endRail.append(max(f['rail'] for f in last))
    # When the board turns back up the face for good: the first frame from which the yaw rate stays > 20 deg/s up to the end.
    t = next((f['t'] for i, f in enumerate(fr) if all(q['yawRate'] > 0 for q in fr[i:]) and f['yawRate'] > 20), None)
    tTurnBack.append(None if t is None else end - t)
print(f"over 1-3 s: the hold's ask (bank, game sign, + toward the face) {med(ask)}; the body's bank {med(bank)}; ask - bank {med(gap)}")
print(f"last 1 s before the fall: speed through the water {med(endV, 2)} m/s; heading - line {med(endErr)}; hold's ask {med(endAsk)}; largest yaw rate {med(endYaw)} deg/s (+ up the face); largest rail {med(endRail)} (+ the uphill rail)")
print(f"a turn back up the face that lasts to the fall (yaw > 0 to the end, starting > 20 deg/s), its length before the fall: {med(tTurnBack, 3)} s, in {sum(1 for x in tTurnBack if x is not None)} of {len(tTurnBack)}")
