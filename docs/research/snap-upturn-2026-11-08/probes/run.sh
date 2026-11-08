#!/bin/zsh
# usage: run.sh NAME OPTS [MOVE]
# copy zz-upturn.test.ts and ../../snap-stance-2026-11-03/probes/round2/zz-r2Lab.ts into src/physics/ first; env HD, START, HOLD, T, AMT
D=${D:-/tmp/snap-upturn}
cd "$(git rev-parse --show-toplevel)"
OUT=$D/$1.json OPTS=$2 MOVE=${3:-snap} npx vitest run src/physics/zz-upturn.test.ts >/dev/null 2>$D/$1.err || tail -5 $D/$1.err
python3 -c "
import json
for o in json.load(open('$D/$1.json')):
  print('$1', o['case'].ljust(24), 'turn',str(o['turned']).rjust(5),'fell',str(o['fell']).rjust(5),o['cause'][:14].ljust(14),'tw',o['twist'],'ok',o['twistRight'],'wrong',o['twistWrong'],'stamp',o['stampAt'],'bank',o['bank'],'minV',o['minV'],'ff',o['fromFall'],o['maxFF'])
"
