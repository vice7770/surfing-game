#!/usr/bin/env python3
"""Step 3.5h, part 2: which forces ADD energy to the board's roll, and which OPPOSE it.

Reads `3.5/weave-split.ts`'s rows. Computes nothing about the physics: every column is the game's own ledger.

THE TWO SIGNS, STATED ONCE (copied from `3.5/roll.ts`, whose conventions this round was told to use):

  * `rl_*` -- `BoardBody.roll`, N.m about the board's own long axis (board frame +z in the world), + in the
    right-hand sense, which LIFTS the board's +x rail. `rl_total` is the board's own (I.dw).zhat and `rl_rider`
    is the RESIDUAL -- total less every water entry and the gyroscopic term -- so it is everything the rider's
    coupling carries: the feet's push on the deck AND the pair's own inertia resisting the roll, together. It is a
    residual and is reported as one, never as a measured contact torque.
  * `dk_*` -- `bankLedger.deck`, rad/s^2 about `AttachedRider.rollAxis`, + rolling the +x rail DOWN.
  => OPPOSITE senses. A positive `rl_*` and a negative `dk_*` are the same physical direction. Never pooled here.
  * `rollEng`/`railEng`/`tiltEng` -- degrees, + with the +x rail DOWN (the same sense as `dk_*`).

THE ENERGY, AND ITS ONE HONEST LIMIT. Power from source s is `rl_s * rlOmega` watts, in the `rl` frame's own sign:
POSITIVE adds energy to the board's roll, NEGATIVE removes it. `rl_s` is a step mean of 16 per-substep bookings and
`rlOmega` is read once at the frame's end, so `rl_s * rlOmega * dt` is the step's work only up to the within-step
covariance of that source's moment with the roll rate, WHICH THIS INSTRUMENT DOES NOT SEPARATE. The mid-step rate
(the mean of this frame's and the previous frame's) is used instead of the frame-end one and both are printed, and
what the round reads is the SIGN summed over an oscillation (33 frames at 1.82 Hz), never one step.

THE TRAP, NAMED. The YAW ledger's `rider` residual cannot close -- it books `waterT` beside its settle entries and
so counts the surface-normal push twice [R, `BoardBody.ts:1496-1503`]. The ROLL ledger leaves `waterT` out and its
own positive control reads `rider` = 0.0000 N.m on a bare board heeled 20 deg in still water. Only the roll
ledger is read here, and nothing in a yaw residual is attributed to anything.

  python3 -I docs/research/new-rider/3.5/weave-read.py <s>/cue.jsonl --waves 1,2,6,11 --script cue
"""
import argparse
import json
import math
import sys

STEP = 1 / 60

# The `rl_*` entries, grouped. Every name is a key of `BoardBody.roll` and the groups partition them exactly.
GROUPS = {
    "hull": ["buoyancy", "pressure", "suction", "friction"],
    "water": ["addedMass", "radiation", "froth"],
    "foils": ["fins", "rails"],
    "bed": ["bed"],
    "gyro": ["gyro"],
}
RL_ALL = [k for g in GROUPS.values() for k in g]


def load(path):
    rows, summaries = [], []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            if len(line) < 3:
                continue
            d = json.loads(line)
            if d.get("kind") == "row":
                rows.append(d)
            elif d.get("kind") == "summary":
                summaries.append(d)
    return rows, summaries


def num(r, k):
    v = r.get(k)
    return float(v) if isinstance(v, (int, float)) else float("nan")


def span(xs):
    xs = [x for x in xs if not math.isnan(x)]
    return (max(xs) - min(xs)) if xs else float("nan")


def med(xs):
    xs = sorted(x for x in xs if not math.isnan(x))
    return xs[len(xs) // 2] if xs else float("nan")


def cycles(xs):
    """FULL cycles, not crossings. Two zero crossings of the rate make one back-and-forth.

    Today's file already published `3.6 swaps a second` and then called it `nearly 4 Hz`, which was half wrong by
    exactly this factor, so the count and the derived frequency are both printed from the SAME number here.
    """
    xs = [x for x in xs if not math.isnan(x)]
    cr = 0
    for a, b in zip(xs, xs[1:]):
        if (a > 0 and b <= 0) or (a < 0 and b >= 0):
            cr += 1
    return cr, cr / 2


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--waves", default="1,2,6,11")
    ap.add_argument("--script", default="cue")
    ap.add_argument("--from", dest="lo", type=float, default=0.0, help="window start, s after the stand")
    ap.add_argument("--to", dest="hi", type=float, default=99.0)
    a = ap.parse_args()
    waves = [int(x) for x in a.waves.split(",")]
    rows, summaries = load(a.path)
    out = sys.stdout.write

    byw = {}
    for r in rows:
        if r.get("script") != a.script or r.get("wave") not in waves:
            continue
        ts = r.get("tStand")
        if ts is None or r.get("phase") != "standing" or r.get("attached") != 1:
            continue
        if not (a.lo <= float(ts) <= a.hi):
            continue
        byw.setdefault(r["wave"], []).append(r)
    for v in byw.values():
        v.sort(key=lambda r: float(r["tStand"]))

    sm = {s["wave"]: s for s in summaries if s.get("script") == a.script}

    out("\n=== A. THE ACCEPTANCE CONDITION, SCORED. 'With the steering centred after standing, an incidental roll\n")
    out("===    should SETTLE -- without repeated rail-to-rail or course reversals that need countersteering to\n")
    out("===    stop -- while a deliberate rail input still starts a turn.' Half two needs a steer and is NOT\n")
    out("===    measured here: every row below is the `cue` script, zero steer and zero asked lean.\n\n")
    head = ["wave", "n", "rode s", "fell", "rollP2P", "railP2P", "tiltP2P", "cyc", "Hz", "p2p last .5s", "course span", "crsRev", "ask deg"]
    widths = [5, 5, 7, 7, 8, 8, 8, 5, 6, 13, 12, 7, 8]
    out(" ".join(s.rjust(w) for s, w in zip(head, widths)) + "\n")
    for w in sorted(byw):
        rs = byw[w]
        rollE = [num(r, "rollEng") for r in rs]
        railE = [num(r, "railEng") for r in rs]
        tiltE = [num(r, "tiltEng") for r in rs]
        om = [num(r, "rlOmegaDeg") for r in rs]
        cr, cy = cycles(om)
        dur = float(rs[-1]["tStand"]) - float(rs[0]["tStand"])
        last = [num(r, "rollEng") for r in rs if float(r["tStand"]) >= float(rs[-1]["tStand"]) - 0.5]
        fell = sm.get(w, {}).get("fellAfterStand")
        asks = [abs(num(r, "askDeg")) for r in rs]
        # `crsRev` = REVERSALS of the direction travelled: zero crossings of the course's own RATE, halved, so it
        # counts the back-and-forths the acceptance condition names and not the crossings. `course` is the world
        # bearing of the board's velocity, degrees; the rate is differenced between consecutive logged frames and
        # wrapped, because a bearing that passes +-180 would otherwise read as a 360 deg reversal.
        crs = [num(r, "course") for r in rs]
        rate = []
        for i in range(1, len(crs)):
            d = crs[i] - crs[i - 1]
            while d > 180:
                d -= 360
            while d < -180:
                d += 360
            rate.append(d)
        rcr, _ = cycles(rate)
        row = [str(w), str(len(rs)), f"{dur:.3f}", "-" if fell is None else f"{float(fell):.3f}",
               f"{span(rollE):.2f}", f"{span(railE):.2f}", f"{span(tiltE):.2f}",
               str(cr), f"{(cy/dur if dur else float('nan')):.2f}", f"{span(last):.2f}",
               f"{span(crs):.2f}", f"{rcr / 2:.1f}", f"{max(asks) if asks else float('nan'):.4f}"]
        out(" ".join(s.rjust(w2) for s, w2 in zip(row, widths)) + "\n")
    out("\n  `cyc` counts zero crossings of the roll RATE and `Hz` is cyc/2 per second: a full back-and-forth takes\n")
    out("  TWO crossings. `rollP2P` is world-frame deck roll, `railP2P` the SAME deck against the water's own\n")
    out("  surface under it, `tiltP2P` the water's cross-face tilt alone. `ask deg` is the lean actually asked.\n")

    out("\n=== B. THE SIGNED ROLL-MOMENT SPLIT, N.m about the board's long axis, + LIFTING the +x rail.\n")
    out("===    `rider` is the roll ledger's RESIDUAL (everything the rider's coupling carries), never a measured\n")
    out("===    contact torque. Median and span per source over the whole stand.\n\n")
    keys = RL_ALL + ["rider", "total"]
    out("wave  " + " ".join(k[:9].rjust(10) for k in keys) + "\n")
    for w in sorted(byw):
        rs = byw[w]
        out(f"{w:<5} " + " ".join(f"{med([num(r, 'rl_' + k) for r in rs]):10.3f}" for k in keys) + "   median\n")
        out("      " + " ".join(f"{span([num(r, 'rl_' + k) for r in rs]):10.3f}" for k in keys) + "   span\n")

    out("\n=== C. THE ENERGY. Work over the stand, JOULES, from `rl_s * rlOmegaMid * dt`. POSITIVE ADDS energy to\n")
    out("===    the board's roll; NEGATIVE opposes it. Grouped, then the residual.\n\n")
    out("===    *** AND THE SAMPLING CONTROL, because the limit in the header is the only soft thing here ***\n")
    out("===    The same work with the roll rate taken at the step's START, its MIDDLE and its END. If the sign of a\n")
    out("===    group flips between the three, that group's sign is an artefact of the sampling and not a finding.\n\n")
    gnames = list(GROUPS) + ["rider", "total"]
    out("wave  rate  " + " ".join(g[:9].rjust(10) for g in gnames) + "\n")
    for w in sorted(byw):
        rs = byw[w]
        oms = [num(r, "rlOmega") for r in rs]
        for choice in ("start", "mid", "end"):
            if choice == "end":
                ws = oms
            elif choice == "start":
                ws = [oms[0]] + oms[:-1]
            else:
                ws = [(oms[i] + oms[i - 1]) / 2 if i else oms[0] for i in range(len(oms))]
            work = {}
            for g, ks in GROUPS.items():
                work[g] = sum(sum(num(r, "rl_" + k) for k in ks) * ws[i] * STEP for i, r in enumerate(rs))
            for k in ("rider", "total"):
                work[k] = sum(num(r, "rl_" + k) * ws[i] * STEP for i, r in enumerate(rs))
            out(f"{w:<5} {choice:<5} " + " ".join(f"{work[g]:10.4f}" for g in gnames) + "\n")
            if choice == "mid":
                chk = sum(work[g] for g in list(GROUPS) + ["rider"])
                out(f"      sum of parts {chk:+.4f} against total {work['total']:+.4f}   gap {chk - work['total']:+.2e}\n")

    out("\n=== D. THE SAME SPLIT, but only over the frames where the board is ROLLING AWAY from level (|roll| rising):\n")
    out("===    the half-cycle in which a source that drives the weave must be pushing. Watts, mean.\n\n")
    out("wave  " + " ".join(g[:9].rjust(10) for g in gnames) + "        n\n")
    for w in sorted(byw):
        rs = byw[w]
        oms = [num(r, "rlOmega") for r in rs]
        rolls = [num(r, "rollEng") for r in rs]
        pick = [i for i in range(1, len(rs)) if abs(rolls[i]) > abs(rolls[i - 1])]
        if not pick:
            continue
        mid = [(oms[i] + oms[i - 1]) / 2 for i in range(len(oms))]
        pw = {}
        for g, ks in GROUPS.items():
            pw[g] = sum(sum(num(rs[i], "rl_" + k) for k in ks) * mid[i] for i in pick) / len(pick)
        for k in ("rider", "total"):
            pw[k] = sum(num(rs[i], "rl_" + k) * mid[i] for i in pick) / len(pick)
        out(f"{w:<5} " + " ".join(f"{pw[g]:10.4f}" for g in gnames) + f" {len(pick):8d}\n")

    out("\n=== E. THE BANK LEDGER'S DECK COLUMN, rad/s^2, + rolling the +x rail DOWN (OPPOSITE sense from B/C/D).\n")
    out("===    Its own positive controls are printed: `split`, `closure` and `residual` are exact partitions of\n")
    out("===    the standing solve's right-hand side, and `apart` is the substeps the standing solve did NOT decide\n")
    out("===    (where the attribution describes nothing). Median over the frames with apart == 0.\n\n")
    src = sorted({k[3:] for r in rows for k in r if k.startswith("dk_")})
    big = [s for s in src if any(abs(num(r, "dk_" + s)) > 1e-9 for rs in byw.values() for r in rs)]
    out("wave  nAp  " + " ".join(s[:8].rjust(9) for s in big) + "      split   closure  residual\n")
    for w in sorted(byw):
        rs = [r for r in byw[w] if r.get("bkApart") == 0]
        if not rs:
            out(f"{w:<5} ALL FRAMES HAVE apart > 0 -- the deck attribution describes none of them\n")
            continue
        napart = len(byw[w]) - len(rs)
        out(f"{w:<5} {napart:<4} " + " ".join(f"{med([num(r, 'dk_' + s) for r in rs]):9.4f}" for s in big)
            + f" {max(num(r,'bkSplit') for r in rs):10.2e} {max(num(r,'bkClosure') for r in rs):9.2e} {max(num(r,'bkResidual') for r in rs):9.2e}\n")

    out("\n=== G. NAMING THE RESIDUAL'S WORK. The roll ledger's `rider` is a residual and cannot say WHICH of the\n")
    out("===    rider's channels does the work. The bank ledger can, because its partition of the standing solve's\n")
    out("===    right-hand side is exact. Moment on the deck's roll is `dk_s / rollDeckPer` (N.m: rad/s^2 divided by\n")
    out("===    rad/s per N.m.s), and power is that times the deck's roll rate in the SAME sense, which is -rlOmega.\n")
    out("===    WATTS; positive adds energy to the roll. Only frames with apart == 0.\n")
    out("===    *** TWO CAVEATS, BOTH LOAD-BEARING ***\n")
    out("===    (1) AXIS, and it is done TWICE because one way of doing it is not enough. `dk_*` is about\n")
    out("===        `AttachedRider.rollAxis` (the heading's, yaw only) and `rlOmega` is about the board's own +z, so a\n")
    out("===        `dk_s * rlOmega` product is a projection of one axis onto the other's rate. The `+z` column below\n")
    out("===        is that product; the `head` column instead uses the SIGNED rate on the dk axis ITSELF, taken as\n")
    out("===        d(rollEng)/dt -- `rollEng` IS the deck's roll about the heading's axis in the dk sense, rebuilt on\n")
    out("===        the engine's own expression, so differencing it gives that axis's own rate directly.\n")
    out("===        ** An earlier version of this file printed `axisDeg` and described it as an axis separation. It\n")
    out("===        was `max|rollEng|` and was NOT one; the label was wrong and it is removed. It never entered any\n")
    out("===        arithmetic -- the work was always `dk_s / rollDeckPer * rate` -- but the honest fix is the second\n")
    out("===        rate, not a better caption, so both are computed and the ratio is printed. **\n")
    out("===        `head` is the one to quote; `+z` is kept so the two can be compared. A finite difference of a\n")
    out("===        frame-end angle is not an instantaneous rate, and the heading itself yaws, so neither is exact.\n")
    out("===    (2) These are the DRIVE's own terms (the explicit right-hand side), not the response: the water's\n")
    out("===        added mass, its radiation damping and the ankle's implicit spring are in `A`, the denominator,\n")
    out("===        and are NOT entries [R, `bankLedger.ts` 'What is a source and what is not'].\n\n")
    out("wave  axis " + " ".join(s[:8].rjust(9) for s in big) + "     total\n")
    for w in sorted(byw):
        rs = [r for r in byw[w] if r.get("bkApart") == 0]
        if not rs:
            continue
        per = [num(r, "bkRollDeckPer") for r in rs]
        # Rate 1: the board's own +z, as the roll ledger books it, flipped into the dk sense.
        oms = [num(r, "rlOmega") for r in rs]
        rateZ = [-((oms[i] + oms[i - 1]) / 2 if i else oms[0]) for i in range(len(oms))]
        # Rate 2: the dk axis's OWN rate, d(rollEng)/dt in rad/s, already in the dk sense (+ rail down).
        re_ = [num(r, "rollEng") / (180 / math.pi) for r in rs]
        rateH = [0.0] + [(re_[i] - re_[i - 1]) / STEP for i in range(1, len(re_))]
        rows = []
        for label, rate in (("head", rateH), ("+z", rateZ)):
            def pw(key, rate=rate):
                return sum((num(rs[i], key) / per[i]) * rate[i] * STEP
                           for i in range(len(rs)) if per[i] and not math.isnan(per[i]) and not math.isnan(rate[i]))
            vals = [pw("dk_" + s) for s in big]
            rows.append((label, vals, pw("bkDeckTotal")))
        for label, vals, tot in rows:
            out(f"{w:<5} {label:<4} " + " ".join(f"{v:9.4f}" for v in vals) + f" {tot:9.4f}\n")
        a = rows[0][1][big.index("ankle")]
        b = rows[1][1][big.index("ankle")]
        agree = "SAME SIGN" if (a > 0) == (b > 0) else "*** SIGN DIFFERS ***"
        out(f"      ankle: head {a:+.4f} J vs +z {b:+.4f} J -- ratio {(a / b if b else float('nan')):.3f}, {agree}\n")
    out("  (joules over the window, not watts -- the dt is in)\n")

    out("\n=== F. WHAT ELSE DIFFERS. The coordinator's question: something other than the speed change, since the\n")
    out("===    speed change is now the LARGER on the wave that stays flat.\n\n")
    cols = ["speedThrough", "wetted", "submerged", "tiltEng", "railEng", "load", "legLoad", "planing", "faceFrac", "bkSubsteps"]
    out("wave  " + " ".join(c[:10].rjust(11) for c in cols) + "\n")
    for w in sorted(byw):
        rs = byw[w]
        out(f"{w:<5} " + " ".join(f"{med([num(r, c) for r in rs]):11.4f}" for c in cols) + "   median\n")
        out("      " + " ".join(f"{span([num(r, c) for r in rs]):11.4f}" for c in cols) + "   span\n")


    out("\n=== J. THE SCHEDULING VARIABLE ITSELF. The replay finds the command's one-tick jump comes from the GAIN\n")
    out("===    being re-solved at a speed that moves, so this is that speed's own behaviour. It is `capSpeed` --\n")
    out("===    the probe's term-by-term rebuild of the engine's own expression at `AttachedRider.ts:3714`, checked\n")
    out("===    against the engine's value by `capExactOk`:\n")
    out("===      capSpeed = capFwd - capFlow = (boardVelocity . forward) - (waterFlow . forward_xz)\n")
    out("===    One control tick is one frame (CONTROL_STEP = 1/60 = the frame), so a frame-to-frame difference IS a\n")
    out("===    one-tick move. m/s, and m/s^2 for the implied rate. The two terms are separated because a board\n")
    out("===    cannot accelerate at 37 m/s^2 and a sampled flow can change that fast.\n\n")
    # `speedThroughRaw` is the ENGINE's own stored value of that expression (`leanProbe.speedThrough`, full width);
    # `capSpeed` is the probe's rebuild of it from frame-end private fields, and the two are read at different
    # instants within the frame (the bank step runs once per substep), so both are printed and neither is dropped.
    cols2 = [("speedThroughRaw", "engine v"), ("capSpeed", "probe rebuild"), ("capFwd", "board term"), ("capFlow", "flow term")]
    out("wave  " + " ".join(lbl.rjust(13) for _, lbl in cols2) + "   worst m/s^2   capExactOk\n")
    for w in sorted(byw):
        rs = byw[w]
        line = f"{w:<5} "
        worst = 0.0
        for key, _ in cols2:
            xs = [num(r, key) for r in rs]
            d = [abs(xs[i] - xs[i - 1]) for i in range(1, len(xs)) if not math.isnan(xs[i]) and not math.isnan(xs[i - 1])]
            mx = max(d) if d else float("nan")
            if key == "speedThroughRaw":
                worst = mx
            line += f"{mx:13.3f} "
        oks = [r.get("capExactOk") for r in rs]
        good = sum(1 for o in oks if o == 1)
        out(line + f"{worst * 60:14.1f}   {good}/{len(oks)}\n")
    out("  Each column is the LARGEST one-tick move of that term, m/s. `capExactOk` is the engine's own identity\n")
    out("  check on the rebuild (the formula on the engine's own `speedThrough`), as frames passing / frames seen.\n")

    out("\n=== I. AND INSIDE THE ANKLE: is it the COMMAND or the ankle's own passive spring and damper?\n")
    out("===    `dk_ankle` is `ankleDeck x (-tau_ankle)` and is LINEAR in that torque, so the ankle's work splits\n")
    out("===    linearly over the three terms `setAnkle` is built from [R, `AttachedRider.ts:3736`]:\n")
    out("===      tau = K*(theta - phi - rest) + (K*h + C)*relative\n")
    out("===          = [K*(theta-phi)]  +  [-K*rest]  +  [(K*h + C)*relative]\n")
    out("===            termJoint           termRest      termRate\n")
    out("===    termRest is THE COMMAND (the rest angle the predictor asks for); termJoint is the ankle's own spring\n")
    out("===    on the body-minus-deck angle and termRate its damper on the BODY's across rate. JOULES, `rl` sense:\n")
    out("===    positive adds energy to the board's roll. `close` is the terms' own sum against the ledger's demand,\n")
    out("===    which is this split's positive control (they are both step means of the same torque).\n")
    out("===    The rate used here is the dk axis's OWN signed rate, d(rollEng)/dt -- section G's caveat 1.\n\n")
    out("wave  " + "ankle J".rjust(10) + "termJoint".rjust(11) + "termRest".rjust(11) + "termRate".rjust(11)
        + "close".rjust(10) + "n".rjust(6) + "\n")
    for w in sorted(byw):
        rs = [r for r in byw[w] if r.get("bkApart") == 0]
        if not rs:
            continue
        # The dk axis's OWN signed rate (see section G's caveat 1): d(rollEng)/dt, rad/s, + rail down.
        re_ = [num(r, "rollEng") / (180 / math.pi) for r in rs]
        rate = [0.0] + [(re_[i] - re_[i - 1]) / STEP for i in range(1, len(re_))]
        tot = {"termJoint": 0.0, "termRest": 0.0, "termRate": 0.0}
        ank = 0.0
        worst = 0.0
        used = 0
        for i, r in enumerate(rs):
            per = num(r, "bkRollDeckPer")
            dem = num(r, "akDemand")
            parts = {k: num(r, k) for k in tot}
            if math.isnan(per) or per == 0 or math.isnan(dem) or dem == 0 or math.isnan(rate[i]) or any(math.isnan(x) for x in parts.values()):
                continue
            used += 1
            worst = max(worst, abs(sum(parts.values()) - dem) / max(1e-9, abs(dem)))
            wk = (num(r, "dk_ankle") / per) * rate[i] * STEP
            ank += wk
            for k in tot:
                tot[k] += wk * parts[k] / dem
        out(f"{w:<5} {ank:10.4f}" + "".join(f"{tot[k]:11.4f}" for k in ("termJoint", "termRest", "termRate"))
            + f"{worst:10.2e}{used:6d}\n")
    out("  `close` is a RELATIVE worst-case over the frames: |sum of terms - akDemand| / |akDemand|.\n")

    out("\n=== H. THE ONSET, in 0.25 s bins: when does the roll start growing, and which group is pushing then?\n")
    out("===    Power in WATTS (mean over the bin), `rl` sense: + adds energy to the board's roll.\n\n")
    for w in sorted(byw):
        rs = byw[w]
        out(f"  wave {w}\n")
        out("    " + "t+s".rjust(7) + "roll p2p".rjust(10) + "|roll|max".rjust(11) + "om deg/s".rjust(10)
            + "".join(g[:7].rjust(9) for g in gnames) + "wetted".rjust(9) + "vThrough".rjust(10) + "\n")
        oms = [num(r, "rlOmega") for r in rs]
        mid = [(oms[i] + oms[i - 1]) / 2 if i else oms[0] for i in range(len(oms))]
        b = 0.25
        n = int(math.ceil((float(rs[-1]["tStand"]) + 1e-9) / b))
        for k in range(n):
            idx = [i for i, r in enumerate(rs) if k * b <= float(r["tStand"]) < (k + 1) * b]
            if not idx:
                continue
            rolls = [num(rs[i], "rollEng") for i in idx]
            line = f"    {(k * b):7.2f}{span(rolls):10.2f}{max(abs(x) for x in rolls):11.2f}{max(abs(num(rs[i],'rlOmegaDeg')) for i in idx):10.1f}"
            for g in gnames:
                ks = GROUPS.get(g, [g])
                line += f"{sum(sum(num(rs[i], 'rl_' + kk) for kk in ks) * mid[i] for i in idx) / len(idx):9.2f}"
            line += f"{med([num(rs[i],'wetted') for i in idx]):9.3f}{med([num(rs[i],'speedThrough') for i in idx]):10.3f}"
            out(line + "\n")


if __name__ == "__main__":
    main()
