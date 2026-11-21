#!/usr/bin/env python3
"""Compares `four-numbers.ts`'s take-off summaries against **#429's own committed ones**, value by value.

    python3 -I docs/research/new-rider/take-off/four-numbers-cross.py <mine.jsonl> <429-summaries.jsonl>

**Why this exists.** #429's numbers were produced on `claude/ride-all-three` (which carries `?trunk=mass`,
`?bodyBank=hip` and `?armCarry=on`); this round runs on `claude/the-record`, whose `src/` is `main`'s. The shipped
arm should therefore be the same rider on the same sea, **and the whole take-off comparison is anchored to the
published population only if it is.** A difference is news in itself.

⚠️ Two known, intended differences, excluded by name and counted:
  * `TRIAL` is 20 here and was 16 there, which only ever ADDS frames after t = 16 s. It changes `frames`,
    `liveFrames` and — for a stand that #429 censored — `fell`/`fellAfterStand`/`cause`, because the rider that was
    dropped on its standing frame is now followed. Those rows are reported separately rather than mixed in.
  * the column set: this file emits columns #429 did not, and reorganised its first-second block, so only the
    columns present in BOTH are compared, and the count is printed.
"""
import json
import sys
from collections import defaultdict

# The columns both builds emit with the same meaning. `frames`/`liveFrames` are excluded: TRIAL moved.
SHARED = ['cue', 'popBy', 'pop', 'stand', 'fell', 'cause', 'fellAfterStand', 'standAfterPop', 'stood', 'popped',
          'face', 'popOutcome', 'popRefusal']
# ⚠️ `face` is a RUNNING MAXIMUM over the rider's whole life (`rider.face = max(rider.face, frame.faceHeight)`), so a
# rider that never pops and is therefore retired by `TRIAL` keeps raising it for every extra second TRIAL gives.
# It is reported apart rather than excluded, because a difference in it on a rider that DID stand would be news.
TRIAL_DEPENDENT = {'face'}


# #429's seed-1 run was made by an earlier build whose three scripts were named `hold`/`turnL`/`turnR` and popped at
# the CUE by default — which is exactly what `cue`/`cueL`/`cueR` do in the published file and here. Its own README
# says so. The names are aliased so the two runs align; the seed-2 file already uses the current names.
ALIAS = {'hold': 'cue', 'turnL': 'cueL', 'turnR': 'cueR'}


def load(path, arm='ships'):
    out = {}
    with open(path) as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            d = json.loads(line)
            if not (d.get('summary') or d.get('kind') == 'summary'):
                continue
            if d.get('arm') != arm or d.get('mode') not in (None, 'takeoff'):
                continue
            script = ALIAS.get(d.get('script'), d.get('script'))
            out[(script, d.get('wave'))] = d
    return out


def close(a, b):
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(a - b) < 5e-5
    return a == b


def main():
    mine, theirs = load(sys.argv[1]), load(sys.argv[2])
    # #429's published seed-1 run used the script names `cue`, `cueL`, `cueR`; seed 2 the same. Align on them.
    shared_runs = sorted(set(mine) & set(theirs), key=lambda k: (str(k[0]), k[1]))
    print(f'# cross-build: {len(mine)} runs here, {len(theirs)} there, {len(shared_runs)} aligned on (script, wave)')
    compared = diff = 0
    late = []
    notes = defaultdict(list)
    trial_notes = []
    for k in shared_runs:
        a, b = mine[k], theirs[k]
        # A stand #429 censored at TRIAL = 16 s is followed here, so its fall columns cannot agree by construction.
        censored_there = b.get('stand') is not None and b.get('fell') is None and 16 - b['stand'] < 3
        for key in SHARED:
            if key not in a or key not in b:
                continue
            if censored_there and key in ('fell', 'fellAfterStand', 'cause'):
                continue
            if key in TRIAL_DEPENDENT and not close(a.get(key), b.get(key)):
                stood = a.get('stood') == 1
                trial_notes.append(f'{k}: {key} {a.get(key)} vs {b.get(key)}'
                                   f'{"  ⚠️ ON A RIDER THAT STOOD — not explained by TRIAL" if stood else " (never stood; TRIAL)"}')
                continue
            compared += 1
            if not close(a.get(key), b.get(key)):
                diff += 1
                notes[key].append(f'{k}: {a.get(key)} vs {b.get(key)}')
        if censored_there:
            late.append((k, b.get('stand'), a.get('fell'), a.get('fellAfterStand'), a.get('cause')))
    print(f'# {compared} shared summary values compared, {diff} differ')
    for key, vals in notes.items():
        print(f'   {key}: {len(vals)} differ — {vals[:6]}')
    if not notes:
        print('   (a difference here would mean the two builds are not the same rider on the same sea)')
    print(f'# {len(trial_notes)} differences in TRIAL-dependent running maxima, reported apart:')
    for t in trial_notes:
        print(f'   {t}')
    print(f'# {len(late)} stands were CENSORED at TRIAL = 16 s in #429 and are followed here:')
    for k, stand, fell, after, cause in late:
        print(f'   {k}: stood at {stand} s → fell at {fell} s, {after} s after the stand, cause {cause}')


if __name__ == '__main__':
    main()
