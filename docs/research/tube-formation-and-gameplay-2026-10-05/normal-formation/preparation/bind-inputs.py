#!/usr/bin/env python3
"""Root-run direct receipt binder. Preparation did not execute it; no resources/probes/builds."""
from pathlib import Path
import hashlib,json
W=Path('/private/tmp/tube-c-formation-autopilot-native-20261005')
N=Path('/private/tmp/tube-c-formation-native-20261005')
S=Path('/private/tmp/tube-c-formation-trial-20261005/source')
def pin(path):
 b=path.read_bytes();return {'file':str(path),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def verify(q):
 assert pin(Path(q['file']))==q,'Direct input changed: '+q['file']
def main():
 out=W/'inputs.json';assert not out.exists(),'First-only binder preserves prior binding'
 t=json.loads((W/'inputs.template.json').read_text());assert t['schema']=='c-formation-autopilot-preparation-inputs/v1' and t['rootBound'] is False
 app=pin(N/'root-complete-build-result.json');a=json.loads(Path(app['file']).read_text())
 assert a['schema']=='c-formation-root-complete-build/v1' and a['terminal'] is True and a['exitCode']==0 and a['sourceUnchangedAfterBuild'] is True
 assert a['source']==str(S) and a['frozenDist']==str(N/'candidate-complete-dist') and a['buildId']=='tube-c-formation-20261005'
 assert len(a['sourcePins'])==587 and len(a['assetPins'])==49 and a['assetPins']==a['frozenAssetPins']
 verify(a['rootApplicationCommand']);command=json.loads(Path(a['rootApplicationCommand']['file']).read_text())
 assert command['complete'] is True and command['terminal'] is True and command['exitCode']==0 and command['sourceUnchanged'] is True
 assert {q['name']for q in command['checks']}=={'consumers','build'} and all(q['exitCode']==0 and not q['timedOut']for q in command['checks'])
 for q in command['checks']:verify(q['log'])
 diag=pin(N/'root-diagnostic-build-result.json');d=json.loads(Path(diag['file']).read_text());module=pin(N/'diagnostic-autopilot.mjs')
 assert d['schema']=='c-formation-diagnostic-root-build/v1' and d['terminal'] is True and d['exitCode']==0
 assert d['source']==str(S) and d['rootCompleteBuild']==app and d['module']==module
 assert d['actualNewDiagnosticSourceCompiled'] is True and d['diagnosticModuleCopiedFromPrior'] is False and len(d['inputs'])==74 and len(d['sourceInputs'])==71 and d['compilerWatchedInputCount']==75
 assert sorted(d['moduleExports'])==['Autopilot','autopilotView','riderPartVolumes'] and d['diagnosticLexicalObserverFieldCount']==0
 candidate=pin(N/'seal.json');seal=json.loads(Path(candidate['file']).read_text());arm=seal['arms']['candidate']
 assert seal['schema']=='c-formation-root-seal/v1' and seal['complete'] is True and arm['rootAuthorized'] is True
 assert arm['rootBuildManifest']==app and arm['sourcePins']==a['sourcePins'] and arm['assetPins']==a['assetPins'] and seal['diagnosticModule']==module
 for q in t['borrowedHelperPins']:verify(q)
 t.update(rootBound=True,approvedCandidateSeal=candidate,approvedApplicationBuild=app,approvedDiagnosticBuild=diag,diagnosticModule=module,resourcesStarted=False,portsProbed=False)
 out.write_text(json.dumps(t,indent=2)+'\n');print(json.dumps({'schema':'c-formation-autopilot-root-binding/v1','complete':True,'resourcesStarted':False,'portsProbed':False,'inputs':pin(out),'gameplayAcceptance':False}))
if __name__=='__main__':main()
