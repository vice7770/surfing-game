"""Inertness: the benchmark's fall times against the probes' saved runs, same seed, wave and drive.

usage: python3 inert.py <dir with the benchmark's organic files>
Compares every organic summary in the dir (MODE=organic files) against 3.5z (cue, cueC from o-s<seed>-T.jsonl; cueCTv
from o-s<seed>-V.jsonl) and 3.5x (cueL, cueR, cueCL, cueCR from results/35x/run-summaries.jsonl.gz, file o-s<seed>-A.jsonl).
The benchmark's drives: none:straight = cue, compress:straight = cueC, hisway = cueCTv; with TURN_AT 0.3 / TURN_FOR 0.9,
none:left = cueL (+1), none:right = cueR, compress:left = cueCL, compress:right = cueCR.
"""
import glob, gzip, json, os, sys

S = '/private/tmp/claude-501/-Users-vicentealmeida-Documents-Codex-surfing-game/7f68bd0b-0784-4918-a0d6-f8978afbced6/scratchpad'
REPO = '/Users/vicentealmeida/Documents/Codex/surfing-game/.claude/worktrees/stability'
MAP_Z = {'none:straight': 'cue', 'compress:straight': 'cueC', 'hisway': 'cueCTv'}
MAP_X = {'none:left': 'cueL', 'none:right': 'cueR', 'compress:left': 'cueCL', 'compress:right': 'cueCR'}

def summaries(path):
    out = {}
    with open(path) as fh:
        for line in fh:
            if '"summary"' not in line:
                continue
            d = json.loads(line)
            if d.get('kind') == 'summary':
                out[(d['seed'], d['wave'], d['script'])] = d
    return out

ref = {}
for seed in (1, 2, 3):
    for tag in ('T', 'V'):
        p = f'{S}/35z/runs/o-s{seed}-{tag}.jsonl'
        if os.path.exists(p):
            for k, v in summaries(p).items():
                ref[('z', tag) + k] = v
with gzip.open(f'{REPO}/docs/research/new-rider/3.5/results/35x/run-summaries.jsonl.gz', 'rt') as fh:
    for line in fh:
        d = json.loads(line)
        if d.get('kind') == 'summary' and d.get('file', '').endswith('-A.jsonl') and d['seed'] in (1, 2, 3):
            ref[('x', 'A', d['seed'], d['wave'], d['script'])] = d

rows = []
for p in sorted(glob.glob(f'{sys.argv[1]}/*.jsonl')):
    ctrl = None
    with open(p) as fh:
        first = fh.readline()
    if '"mode":"organic"' not in first:
        continue
    ctrl = json.loads(first)
    if ctrl.get('swell') != 'medium':
        continue
    turn = (ctrl['turnAt'], ctrl['turnFor'])
    for (seed, wave, script), d in summaries(p).items():
        if script in MAP_Z:
            key = ('z', 'V' if script == 'hisway' else 'T', seed, wave, MAP_Z[script])
        elif script in MAP_X and turn == (0.3, 0.9):
            key = ('x', 'A', seed, wave, MAP_X[script])
        else:
            continue
        r = ref.get(key)
        if r is None:
            rows.append((os.path.basename(p), seed, wave, script, 'no reference', d['stand'], d['fellAfterStand']))
            continue
        same = (d['stand'] == r['stand'] and d['fellAfterStand'] == r['fellAfterStand'] and d['cue'] == r['cue'] and d['pop'] == r['pop'])
        rows.append((os.path.basename(p), seed, wave, script, 'same' if same else f"DIFF ref stand {r['stand']} fell {r['fellAfterStand']}", d['stand'], d['fellAfterStand']))

by = {}
for row in rows:
    k = (row[3], 'z' if row[3] in MAP_Z else 'x')
    by.setdefault(k, [0, 0, []])
    if row[4] == 'same':
        by[k][0] += 1
    else:
        by[k][1] += 1
        by[k][2].append(row)
print('| drive (benchmark = probe) | riders compared | identical stand, cue, pop and fall time | different |')
print('| --- | --- | --- | --- |')
for (script, src), (same, diff, bad) in sorted(by.items()):
    name = MAP_Z.get(script) or MAP_X.get(script)
    print(f'| {script} = {"3.5z" if src == "z" else "3.5x"} `{name}` | {same + diff} | {same} | {diff} |')
for k, (s, d, bad) in by.items():
    for b in bad:
        print('  ', b)
