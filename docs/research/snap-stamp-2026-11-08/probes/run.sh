#!/bin/zsh
# usage: run.sh NAME CASE S OPTS (D=<out dir>; copy zz-stamp.test.ts and ../../snap-stance-2026-11-03/probes/round2/zz-r2Lab.ts into src/physics/ first)
D=${D:-/tmp/snap-stamp}
cd "$(git rev-parse --show-toplevel)"
OUT=$D/$1.json CASE=$2 S=$3 OPTS=$4 STAMP=$5 npx vitest run src/physics/zz-stamp.test.ts >/dev/null 2>$D/$1.err || tail -5 $D/$1.err
python3 -c "
import json,sys
for o in json.load(open('$D/$1.json')):
  print('$1', o['case'].ljust(16), 'top',o.get('top'),o.get('high'),'at1',o['at1'],'pk',o['peak'],'t90',o['t90'],'t150',o['t150'],'v0',o['v0'],'kept',o['kept'],'least',o['least'],'fin',o['fin'],'past',o['past18'],'fins',o['fins'],'fell',o['fell'],o['fellIn'],o['cause'])
"
