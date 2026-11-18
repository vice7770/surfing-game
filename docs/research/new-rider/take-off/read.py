"""Read `bench.ts`'s JSONL: the arm table, the fall-against-the-stand distribution, and the first second.

    python3 -I docs/research/new-rider/take-off/read.py <out.jsonl> [--frames <arm> <script> <wave>]
                                                                   [--diff <armA> <armB>]

`--diff` aligns two arms frame by frame on the same (script, wave, frame) — the same sea, the same wave, the same
stick — and counts the values that differ, as `merge-bench.ts` did: a switch that moves nothing moves 0 of N. It also
gives the first frame at which anything differs in each run, so "inert until the fall" and "different from the first
step" are different answers instead of the same word.

Medians are PLAIN (the mean of the two middle elements at even length), as the bench's own are. Every count carries
its population. `pinned` is `limitTime.tip > 0` (the published quantity); `pinNow` is `limit == 'tip'`, one substep of
32 and about a third of it.
"""
import json
import sys
from collections import defaultdict


def median(values):
    s = sorted(v for v in values if v is not None)
    if not s:
        return float("nan")
    m = len(s) // 2
    return s[m] if len(s) % 2 else (s[m - 1] + s[m]) / 2


def diff(path, arm_a, arm_b):
    """Values that differ between two arms on the same (script, wave, frame)."""
    rows = {}
    for line in open(path, encoding="utf-8"):
        row = json.loads(line)
        if row.get("arm") in (arm_a, arm_b) and "frame" in row and not row.get("summary"):
            rows.setdefault((row["script"], row["wave"], row["frame"]), {})[row["arm"]] = row
    pairs = [(k, p[arm_a], p[arm_b]) for k, p in rows.items() if arm_a in p and arm_b in p]
    total = 0
    moved = 0
    per_key = defaultdict(int)
    first = {}
    for (script, wave, frame), a, b in sorted(pairs):
        for key in sorted(set(a) | set(b)):
            if key in ("arm",):
                continue
            x, y = a.get(key), b.get(key)
            if isinstance(x, (int, float)) or isinstance(y, (int, float)) or isinstance(x, str) or x is None:
                total += 1
                if x != y:
                    moved += 1
                    per_key[key] += 1
                    run = (script, wave)
                    if run not in first or frame < first[run]:
                        first[run] = frame
    print(f"\n{arm_a} vs {arm_b}: {len(pairs)} aligned frames over {len(set((s, w) for (s, w, f) in rows))} runs; "
          f"{moved} of {total} values differ")
    print("  columns that moved most: " + ", ".join(f"{k} ({n})" for k, n in sorted(per_key.items(), key=lambda kv: -kv[1])[:14]))
    print(f"  first differing frame per run: {sorted(first.items())[:8]}{' …' if len(first) > 8 else ''}")
    return moved, total


PAIRED = ["speed", "steer", "leanPlaning", "leanCap", "leanAsk", "bankA", "bankRaw", "roll", "load", "legLoad",
          "legExt", "front", "inContact", "margin", "limit", "tTip", "wetted", "ahead", "faceFrac", "slope", "drift",
          "foot5", "foot6", "trunkFold", "copNm"]


def paired(path):
    """At the stand and at the fall, every signal the brief asks to be paired, per arm. No single-signal reads."""
    stands = defaultdict(list)
    first = defaultdict(list)
    for line in open(path, encoding="utf-8"):
        row = json.loads(line)
        if row.get("summary"):
            stands[row["arm"]].append(row)
            continue
        if row.get("tStand") == 0:
            stands[("@stand", row["arm"])].append(row)
        if row.get("tStand") is not None and 0 <= row["tStand"] <= 1 and row.get("attached") == 1:
            first[row["arm"]].append(row)
    print("\nthe first second after the stand, frame by frame (population = frames):")
    for arm, rows in sorted(first.items()):
        on = sum(1 for r in rows if r.get("leanPlaning") == 1)
        ask = sum(1 for r in rows if (r.get("leanAsk") or 0) != 0)
        fold = sum(1 for r in rows if (r.get("trunkFold") or 0) != 0)
        print(f"  {arm:8s} [{len(rows)} frames] planing in {on} ({100 * on / len(rows):.1f} %), a non-zero lean ask in "
              f"{ask}, a non-zero trunk fold in {fold}; " + "  ".join(
                  f"{name} {median([r.get(name) for r in rows if isinstance(r.get(name), (int, float))]):.3f}"
                  for name in ["speed", "leanCap", "load", "legLoad", "legExt", "roll", "wetted", "faceFrac"]))
    print("\nat the stand (the frame 'Getting up…' clears), medians per arm; population in brackets:")
    for key in sorted(k for k in stands if isinstance(k, tuple)):
        rows = stands[key]
        print(f"  {key[1]:8s} [{len(rows)}] " + "  ".join(
            f"{name} {median([r.get(name) for r in rows if isinstance(r.get(name), (int, float))]):.3f}"
            for name in ["speed", "leanPlaning", "load", "legLoad", "legExt", "roll", "bankA", "wetted", "ahead", "faceFrac", "slope"]))
    print("\nat the fall (the last frame still attached), medians per arm over the runs that stood and then fell:")
    for arm in sorted(k for k in stands if isinstance(k, str)):
        rows = [r["atFall"] for r in stands[arm] if r.get("atFall") and r.get("stood") and (r.get("fellAfterStand") or -1) >= 0]
        if not rows:
            print(f"  {arm:8s} [0]")
            continue
        limits = defaultdict(int)
        for r in rows:
            limits[r.get("limit")] += 1
        print(f"  {arm:8s} [{len(rows)}] " + "  ".join(
            f"{name} {median([r.get(name) for r in rows if isinstance(r.get(name), (int, float))]):.3f}"
            for name in ["speed", "steer", "leanPlaning", "leanCap", "leanAsk", "load", "legLoad", "roll", "bankA",
                         "front", "inContact", "margin", "tTip", "wetted", "ahead", "faceFrac", "slope", "drift",
                         "foot5", "foot6"]) + f"  limit {dict(limits)}")


def control(path_a, path_b):
    """`PROBE=on` against `PROBE=off`: the run summaries must agree value for value, or the probe is not a probe."""
    def load(path):
        out = {}
        for line in open(path, encoding="utf-8"):
            row = json.loads(line)
            if row.get("summary"):
                out[(row["arm"], row["script"], row["wave"])] = row
        return out
    a, b = load(path_a), load(path_b)
    keys = sorted(set(a) & set(b))
    total = 0
    bad = []
    for key in keys:
        for name in sorted(set(a[key]) | set(b[key])):
            if name == "atFall":  # built by the probe itself; null when the probe is off, by construction
                continue
            total += 1
            if a[key].get(name) != b[key].get(name):
                bad.append((key, name, a[key].get(name), b[key].get(name)))
    print(f"PROBE=on vs PROBE=off: {len(keys)} runs aligned ({len(a)} and {len(b)} summaries), "
          f"{total} values compared, {len(bad)} differ")
    for row in bad[:10]:
        print("   ", row)


def main():
    path = sys.argv[1]
    if "--control" in sys.argv:
        at = sys.argv.index("--control")
        control(path, sys.argv[at + 1])
        return
    if "--paired" in sys.argv:
        paired(path)
        return
    if "--diff" in sys.argv:
        at = sys.argv.index("--diff")
        diff(path, sys.argv[at + 1], sys.argv[at + 2])
        return
    control = None
    done = None
    summaries = []
    placements = []
    frames = []
    want = None
    if "--frames" in sys.argv:
        at = sys.argv.index("--frames")
        want = (sys.argv[at + 1], sys.argv[at + 2], int(sys.argv[at + 3]))
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            row = json.loads(line)
            if row.get("control"):
                control = row
            elif row.get("done"):
                done = row
            elif row.get("summary"):
                summaries.append(row)
            elif row.get("placement"):
                placements.append(row)
            elif row.get("fatal"):
                print("FATAL:", row)
            elif want and (row.get("arm"), row.get("script"), row.get("wave")) == want:
                frames.append(row)

    if control:
        print(f"address {control['address']}  grid {control['grid']} = {control['cells']} cells  "
              f"spun up in {control['spunUp']:.0f} s  start ({control['startX']:.1f}, {control['startZ']:.1f}), "
              f"{control['lineupOut']} m out  Hs {control['significantHeight']:.2f} m  Tp {control['peakPeriod']:.1f} s")
        for arm, switches in control["switches"].items():
            print(f"  {arm:9s} {switches}")
        print(f"  sea differences between arms: {control['seaDiffs'] or 'none'}")
    if done:
        print(f"{done['waves']} waves, {done['runs']} runs, {done['seconds']:.0f} s wall\n")

    by_arm = defaultdict(list)
    for row in summaries:
        by_arm[(row["arm"], row["script"])].append(row)

    print("arm/script       runs  popped  stood  fell  fell<1s  |  fell after the stand, s (median of those that fell "
          "after standing)  stand after pop  first second: load  legLoad  wetted  roll peak  pinned%")
    for (arm, script), rows in sorted(by_arm.items()):
        stood = [r for r in rows if r["stood"]]
        fell_after = [r["fellAfterStand"] for r in stood if r["fellAfterStand"] is not None]
        quick = [x for x in fell_after if x <= 1.0]
        first = [r for r in stood if r["fsN"]]
        pinned = sum(r["fsPinned"] for r in first)
        n_first = sum(r["fsN"] for r in first)
        print(f"{arm}/{script:7s} {len(rows):5d} {sum(r['popped'] for r in rows):6d} {len(stood):6d} "
              f"{sum(1 for r in rows if r['fell'] is not None):5d} {len(quick):7d}  |  "
              f"{median(fell_after):16.3f} ({len(fell_after)} of {len(stood)})   "
              f"{median([r['standAfterPop'] for r in stood]):6.3f}   "
              f"{median([r['fsLoadMed'] for r in first]):8.1f} {median([r['fsLegLoadMed'] for r in first]):7.3f} "
              f"{median([r['fsWetMed'] for r in first]):7.3f} {median([r['fsRollPeak'] for r in first]):8.1f} "
              f"{100 * pinned / n_first if n_first else float('nan'):7.1f}")

    print("\ncauses, over the runs that fell (population per arm/script above):")
    for (arm, script), rows in sorted(by_arm.items()):
        causes = defaultdict(int)
        for row in rows:
            if row["fell"] is not None:
                when = "before standing" if row["stand"] is None else ("<=1 s after the stand" if (row["fellAfterStand"] or 9) <= 1 else ">1 s")
                causes[f"{row['cause']} / {when}"] += 1
        print(f"  {arm}/{script}: {dict(causes)}")

    print("\nthe stand itself, over the runs that stood:")
    for (arm, script), rows in sorted(by_arm.items()):
        stood = [r for r in rows if r["stood"]]
        if not stood:
            continue
        print(f"  {arm}/{script}: pop {median([r['pop'] for r in stood]):.2f} s after placing, stand "
              f"{median([r['standAfterPop'] for r in stood]):.3f} s after the pop, landing peak "
              f"{median([r['landingPeak'] for r in stood]):.2f} body weights, front share "
              f"{median([r['landingFront'] for r in stood]):.2f}, face under the board {median([r['popSlope'] for r in stood]):.0f} deg, "
              f"{median([r['popFraction'] for r in stood]):.2f} up, refusals "
              f"{sum(1 for r in stood if r['popRefusal'])} of {len(stood)}")

    if placements:
        print("\nthe flush placement on the same sea (first second, 1 s of frames each):")
        by_place = defaultdict(list)
        for row in placements:
            by_place[(row["arm"], row["sink"])].append(row)
        for (arm, sink), rows in sorted(by_place.items()):
            print(f"  {arm:9s} SINK={sink:<5} {len(rows):3d} runs: dry at frame 1 in {sum(r['dryFirst'] for r in rows)}, "
                  f"fell within 1 s {sum(1 for r in rows if r['fellAt'] is not None)}, "
                  f"load {median([r['fsLoadMed'] for r in rows]):8.1f}  legLoad {median([r['fsLegLoadMed'] for r in rows]):6.3f}  "
                  f"wetted {median([r['fsWetMed'] for r in rows]):6.3f}  roll peak {median([r['fsRollPeak'] for r in rows]):6.1f}")

    if want:
        print(f"\nframes for {want}: {len(frames)}")
        keys = ["t", "tStand", "phase", "steer", "speed", "roll", "bankA", "load", "legLoad", "legExt", "front",
                "margin", "limit", "tTip", "leanCap", "leanAsk", "leanPlaning", "wetted", "ahead", "faceFrac",
                "slope", "drift", "foot5", "foot6", "trunkFold", "inContact", "sep"]
        print(" ".join(f"{k:>9s}" for k in keys))
        for row in frames:
            cells = []
            for k in keys:
                x = row.get(k)
                if isinstance(x, float):
                    cells.append(f"{x:9.3f}")
                elif x is None:
                    cells.append(f"{'-':>9s}")
                else:
                    cells.append(f"{str(x)[:9]:>9s}")
            print(" ".join(cells))


main()
