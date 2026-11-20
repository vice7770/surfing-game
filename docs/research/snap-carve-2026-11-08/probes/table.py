import sys,json
for r in json.load(open(sys.argv[1])):
  cells=[]
  for k in ['flat7','flat9','climb150_6.7','climb150_8','climb120_6.7','climb120_8']:
    c=r[k]; cells.append(f"{c['at1']}/{c['peak']} k{c['kept']} {c['rest']}{' F'+str(c['fell']) if c['fell'] else ''}")
  print('lean' if r['lean'] else 'def ', r['depth'], ' | '.join(cells), '| falls', r['falls'])
