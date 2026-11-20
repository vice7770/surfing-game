import json, sys
# usage: shares.py label=file.json[,file2.json] ...
for arg in sys.argv[1:]:
    label, files = arg.split('=')
    stats = {}
    for f in files.split(','):
        d = json.load(open(f))
        for start in d['starts']:
            for row in start['rows']:
                for kind in (['sets', 'all'] if row['set'] else ['all']):
                    for r in row['riders']:
                        s = stats.setdefault((r['script'], kind), {'n': 0, 'stood': 0, 'r2': 0, 'r3': 0, 'r5': 0, 'ride': []})
                        s['n'] += 1
                        if 'stand' in r: s['stood'] += 1
                        t = r['riding']
                        s['r2'] += t >= 2; s['r3'] += t >= 3; s['r5'] += t >= 5
                        if 'stand' in r: s['ride'].append(t)
    for (script, kind), s in sorted(stats.items(), key=lambda kv: (kv[0][1] != 'sets', kv[0][0])):
        rides = sorted(s['ride'])
        med = rides[len(rides)//2] if rides else float('nan')
        print(f"{label:6} {script:6} {kind:4} waves {s['n']:2} stood {s['stood']:2} | ≥2 s {s['r2']:2} ≥3 s {s['r3']:2} ≥5 s {s['r5']:2} | of stands: 3 s {s['r3']}/{s['stood']} 5 s {s['r5']}/{s['stood']} | riding median {med:.2f} s: {' '.join(f'{x:.1f}' for x in rides)}")
