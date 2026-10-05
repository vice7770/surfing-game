#!/usr/bin/env python3
"""Verify frozen bytes and five-file patch scope; no model/build/native/quality proof."""
from pathlib import Path
import argparse,hashlib,json,subprocess,tempfile
p=argparse.ArgumentParser();p.add_argument('--parent-source',default='/private/tmp/tube-bounded-c-carrier-support-20261004/source');a=p.parse_args()
w=Path(__file__).resolve().parent; parent=Path(a.parent_source)
def check(path,expected):
 b=path.read_bytes();assert len(b)==expected['bytes'] and hashlib.sha256(b).hexdigest()==expected['sha256'],str(path)
ready=json.loads((w/'readiness.json').read_text());assert ready['complete'] and ready['frozen']
source=json.loads((w/'source-pins.json').read_text());assert source['count']==len(source['pins'])==584
for q in source['pins']:check(w/'source'/q['path'],q)
for q in ready['payloadPins']:check(w/q['path'],q)
old=json.loads((w/'parent-source-pins.json').read_text());assert old['count']==len(old['pins'])==582
for q in old['pins']:check(parent/q['path'],q)
runtime=ready['runtimeChanged'];tests=ready['testsChangedOrNew'];changed=runtime+tests
with tempfile.TemporaryDirectory(prefix='stable-x-patch-verify-') as td:
 root=Path(td)
 for f in changed:
  out=root/f;out.parent.mkdir(parents=True,exist_ok=True)
  if (parent/f).exists():out.write_bytes((parent/f).read_bytes())
 for patch in ['runtime.patch','tests.patch']:
  r=subprocess.run(['patch','--batch','--forward','-p1','-d',str(root),'-i',str(w/patch)],stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  assert r.returncode==0,r.stdout.decode()
 for f in changed:assert (root/f).read_bytes()==(w/'source'/f).read_bytes(),f
print(json.dumps({'complete':True,'sourcePinsVerified':584,'payloadPinsVerified':len(ready['payloadPins']),'parentPinsVerified':582,'patchedFilesExact':len(changed),'qualityClaim':False,'buildNativeTestsRun':False}))
