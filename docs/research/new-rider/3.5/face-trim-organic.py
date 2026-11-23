"""3.5r: organic rides on the owner's address (3.5o's drive, steer only, seeds 1-3), in 3.5o's buckets (fixed on the
shipped arm, as 3.5q listed them), per arm; the wave-2 survivor's turn; the reproduction check."""
import gzip, json, statistics as st, sys

R = '/Users/vicentealmeida/Documents/Codex/surfing-game/.claude/worktrees/balance/docs/research/new-rider/3.5/results/'
RUNS = sys.argv[1]
SCRIPT = {'cue': 'N', 'cueL': 'L', 'cueR': 'R'}
BUCKETS = {
    'sharp-steer collapse': '2.1L 2.1R 3.9R 3.12L 3.12R',
    'turn window, neutral falls too': '1.8L 1.8R 1.10L 1.10R 1.11L 1.11R 1.12L 1.12R 2.5L 2.5R 2.8L 2.8R 2.10L 2.10R 3.2L 3.2R 3.6L 3.6R 3.7L 3.7R 3.9L 3.10L 3.10R',
    'outside the turn window (incl. the post-turn 2.2L/2.2R)': '1.6L 1.7L 1.7R 2.2L 2.2R 2.6L 2.6R 2.11L 2.11R',
    'censored on shipped': '1.6R 3.5L 3.5R',
    'neutral': '1.6N 1.7N 1.8N 1.10N 1.11N 1.12N 2.1N 2.2N 2.5N 2.6N 2.8N 2.10N 2.11N 3.2N 3.5N 3.6N 3.7N 3.9N 3.10N 3.12N',
}

def riders_from(lines, seed, out, built=None):
    for line in lines:
        d = json.loads(line)
        if d.get('kind') == 'summary' and d.get('stood'):
            key = f"{seed}.{d['wave']}{SCRIPT[d['script']]}"
            out[key] = (d['fellAfterStand'], d['censored'], d.get('standExposure'))
        elif d.get('kind') == 'built' and built is not None:
            built.add((d.get('plantFloor'), d.get('waterHeel'), d.get('faceTrim'), d.get('riderBody')))

def arm_files(prefix):
    out, built = {}, set()
    for s in (1, 2, 3):
        riders_from(open(f"{RUNS}/{prefix}-s{s}.jsonl"), s, out, built)
    return out, built

arms = {}
A, bA = {}, set()
for s in (1, 2, 3):
    riders_from(open(f"{R}35q/organic-A-s{s}-summaries.jsonl"), s, A, bA)
arms['A shipped'] = (A, bA)
# B: 3.5o's own floor population (steer only, seeds 1-3), as 3.5q used it.
B, bB, seed, isB = {}, set(), None, False
for line in gzip.open(f"{R}35o/population-summaries.jsonl.gz", 'rt'):
    d = json.loads(line)
    if d.get('control'):
        seed = d['seed']
        isB = d.get('turnCompress') == 0 and seed in (1, 2, 3) and (d.get('extra') or {}).get('plantFloor') == '4.5'
        continue
    if isB:
        riders_from([line], seed, B, bB)
arms['B floor'] = (B, bB)
import os
for name, prefix in (('E on', 'o-on'), ('F on+floor', 'o-onf'), ('G model', 'o-model'), ('H model+floor', 'o-modelf')):
    if all(os.path.exists(f"{RUNS}/{prefix}-s{s}.jsonl") and os.path.exists(f"{RUNS}/done.txt") and f"{prefix}-s{s} exit" in open(f"{RUNS}/done.txt").read() for s in (1, 2, 3)):
        arms[name] = arm_files(prefix)

def t(r): return r[2] if r[1] else r[0]

def summ(rs, keys):
    vals = [rs[k] for k in keys if k in rs]
    fell = sum(1 for v in vals if not v[1])
    ts = [t(v) for v in vals]
    m = st.median(ts)
    cens = [t(v) for v in vals if v[1]]
    lab = '~' if cens else ''
    return f"{fell} of {len(vals)}{f' ({len(cens)} cens.)' if cens else ''}, {lab}{m:.3f} ({min(ts):.3f}-{'>=' if cens and max(ts) == max(cens) else ''}{max(ts):.3f})"

def pair(a, b, keys):
    later = sooner = same = 0; ds = []
    for k in keys:
        if k not in a or k not in b: continue
        d = t(b[k]) - t(a[k]); ds.append(d)
        if abs(d) < 1e-9: same += 1
        elif d > 0: later += 1
        else: sooner += 1
    return f"later {later} / sooner {sooner} / same {same}, median {st.median(ds):+.3f} ({min(ds):+.3f} to {max(ds):+.3f})"

print('arms:', {k: len(v[0]) for k, v in arms.items()})
for name, (_, b) in arms.items(): print(f"built {name}: (plantFloor, waterHeel, faceTrim, riderBody) = {b}")
for bucket, members in BUCKETS.items():
    keys = members.split()
    print(f"\n## {bucket}: n {len(keys)}  {members}")
    for name, (rs, _) in arms.items():
        line = f"   {name}: {summ(rs, keys)}"
        if name != 'A shipped': line += f" | vs A: {pair(arms['A shipped'][0], rs, keys)}"
        if name in ('F on+floor', 'H model+floor'): line += f" | vs B: {pair(arms['B floor'][0], rs, keys)}"
        print(line)
print('\n## the named riders (fell after the stand, s; >= censored)')
for k in ('2.1L', '2.1R', '2.1N', '2.2L', '2.2R'):
    print(f"   {k}: " + '  '.join(f"{n.split()[0]} {'>=' if rs[k][1] else ''}{t(rs[k]):.3f}" for n, (rs, _) in arms.items()))

# Reproduction: this build's shipped seed 2 against 3.5q's arm A.
rep = {}
riders_from(open(f"{RUNS}/o-ship-s2.jsonl"), 2, rep)
same = sum(1 for k in rep if k in A and abs(t(rep[k]) - t(A[k])) < 1e-9 and rep[k][1] == A[k][1])
print(f"\n## reproduction: this build's shipped seed 2 against 3.5q's arm A: {same} of {len(rep)} riders on the same frame "
      f"(A has {sum(1 for k in A if k.startswith('2.'))})")

# The wave-2 survivor's turn: seed 2 wave 2 cueL.
print('\n## the wave-2 survivor (seed 2 wave 2 cueL, steer alone); peak = largest |bank| 0.3-2.0 s after the stand; climb = faceH x faceFrac')
for name, path in (('ship (this build)', 'o-ship-s2'), ('E on', 'o-on-s2'), ('F on+floor', 'o-onf-s2'), ('G model', 'o-model-s2'), ('H model+floor', 'o-modelf-s2')):
    if f"{path} exit" not in open(f"{RUNS}/done.txt").read(): continue
    rows = [json.loads(l) for l in open(f"{RUNS}/{path}.jsonl")]
    rows = [r for r in rows if r.get('kind') == 'row' and r['script'] == 'cueL' and r['wave'] == 2 and r['attached']]
    win = [r for r in rows if 0.3 <= r['tStand'] <= 2.0]
    pk = max(win, key=lambda r: abs(r['bank']))
    after = [r for r in rows if r['tStand'] > pk['tStand'] and r.get('climb') is not None]
    out = f"   {name}: peak bank {abs(pk['bank']):.2f} at +{pk['tStand']:.3f} s"
    for lvl in (0.5, 0.9):
        hit = next((r for r in after if r['climb'] >= lvl), None)
        out += f"; {lvl} m: " + (f"+{hit['tStand']:.3f} s, {hit['speedThrough']:.2f} m/s, course {abs(hit['course']):.1f}" if hit else f"not reached (max {max((r['climb'] for r in after), default=0):.2f} m)")
    fell = arms.get(name, (None,))[0]
    print(out + f"; last attached +{rows[-1]['tStand']:.3f} s")
