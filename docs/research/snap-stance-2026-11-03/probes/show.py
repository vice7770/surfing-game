import json,sys
rows=json.load(open(sys.argv[1]))
keys=list(rows[0].keys())
print(' | '.join(keys))
for r in rows: print(' | '.join(str(r.get(k)) for k in keys))
