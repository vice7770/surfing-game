#!/usr/bin/env python3
"""Stored bytes and recorded volume/count arithmetic only. No game modules or subprocesses."""
import gzip,hashlib,json,math,pathlib
A=pathlib.Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
key=lambda p:(p['path'],p['bytes'],p['sha256'])
def check(b,n,h,label):assert len(b)==n and sha(b)==h,label
def close(a,b,label,tolerance=1e-12):assert math.isfinite(a)and math.isfinite(b)and abs(a-b)<=tolerance,label
raw=(A/'manifest.json').read_bytes();m=json.loads(raw);known=set();decoded={};stored_bytes=0
for p in m['payloads']:
 b=(A/p['storedPath']).read_bytes();check(b,p['storedBytes'],p['storedSha256'],p['storedPath']);stored_bytes+=len(b)
 assert p['encoding']=='gzip-mtime0'and b[:3]==b'\x1f\x8b\x08'and b[4:8]==bytes(4)and not b[3]&8
 value=gzip.decompress(b);check(value,p['originalBytes'],p['originalSha256'],p['name'])
 for alias in p['originalAliases']:check(value,alias['bytes'],alias['sha256'],alias['path']);known.add(key(alias))
 assert p['name']not in decoded;decoded[p['name']]=value
assert{str(p.relative_to(A))for p in(A/'evidence').rglob('*')if p.is_file()}=={p['storedPath']for p in m['payloads']}
assert not any(p.suffix in{'.ts','.mjs','.js','.py'}for p in(A/'evidence').rglob('*'))
assert m['storedPayloadCount']==len(m['payloads'])and m['storedPayloadBytes']==stored_bytes
for p in m['generatedRecords']:check((A/p['path']).read_bytes(),p['bytes'],p['sha256'],p['path'])
assert len(m['authorityLinks'])==1
link=m['authorityLinks'][0];authority=(A/link['path']).read_bytes();check(authority,link['bytes'],link['sha256'],link['path'])
assert sha(authority)=='48828b1817a53d5a34f8d3b7f26ff9b01c3654bed4bffcfeeee1086a79f508bd'
f=json.loads(authority);borrowed={}
for kind in['payloads','reusedInputs','gitReferences','externalIdentityReferences']:
 for p in f[kind]:
  for alias in p['originalAliases']:borrowed[key(alias)]=kind
for p in m['borrowedIdentityBindings']:assert borrowed.get(key(p['originalIdentity']))==p['kind'];known.add(key(p['originalIdentity']))
for p in m['borrowedPayloads']:
 b=(A/p['storedPath']).read_bytes();check(b,p['storedBytes'],p['storedSha256'],p['storedPath']);value=gzip.decompress(b)if p['aliasEncoding']=='gzip'else b
 for alias in p['originalAliases']:assert key(alias)in borrowed;check(value,alias['bytes'],alias['sha256'],alias['path']);known.add(key(alias))
for p in m['canonicalGitReferences']:
 assert p['commit']==m['integrationCommit']and p['repositoryPath']in{'src/wave/PlungingLip.ts','src/wave/PlungingLip.test.ts'}
 for alias in p['originalAliases']:known.add(key(alias))
for p in m['externalIdentityReferences']:
 assert p['kind']in{'scratch-compiled-module','production-compiled-output'}
 for alias in p['originalAliases']:known.add(key(alias))
closures=0
def walk(x):
 global closures
 if isinstance(x,dict):
  if{'path','bytes','sha256'}<=x.keys()and isinstance(x['path'],str)and x['path'].startswith('/')and not x.get('virtualOnly',False):assert key(x)in known,'Unbound identity '+x['path'];closures+=1
  for value in x.values():walk(value)
 elif isinstance(x,list):
  for value in x:walk(value)
def record(name):return json.loads(decoded[name])
for name in m['closureAuthorities']:walk(record(name))
BASE='c6982456ca9f73bd19527f8032a6790f1d2b8b85';INTEGRATED='0b17d603cb8d7b06bc60a56e599f06f4f362afd5';READY='3872bae79f1743471ddf7782d99ba1e636137ee4d93a17d9df71718dd371ee5b'
assert m['baselineRuntime']==BASE and m['integrationCommit']==INTEGRATED and m['readySha256']==READY
r=record('ready.json');assert sha(decoded['ready.json'])==READY and len(r['inputs'])==625 and r['canonicalRuntimeCheckpoint']==BASE
assert r['scope']['sourceOnly']and not r['scope']['numericalRegressionExecuted']
assert r['sourceAuthority']['sha256']=='64c837b73696669dc33a91066bf0822565fdc1a60f363c4c3f0858cbbc282015'
assert r['virtual']['bytes']==66189 and r['virtual']['sha256']=='1d5ccf4d41e9ee6625a0ea355fc7f85678689c12369c3619b1baf1a965094460'
root=record('root-first/terminal.json');assert root['valid']and root['pinsUnchanged']and root['readySha256']==READY
assert[root['commands'][i]['name']for i in range(6)]==['transformSyntax','buildSyntax','strict','bundle','unarmedRegression','regression']and all(p['exitCode']==0 for p in root['commands'])
assert root['startedAt']=='2026-10-04T09:15:20.831091+00:00'and root['endedAt']=='2026-10-04T09:15:34.248705+00:00'
assert decoded['root-first/strict.log'].count(b'"strict":true')==2 and b'"variant":"baseline"'in decoded['root-first/strict.log']and b'"variant":"candidate"'in decoded['root-first/strict.log']
assert json.loads(decoded['root-first/unarmedRegression.log'])['numericalExecution']is False
assert json.loads(decoded['root-first/regression.log'])['valid']and json.loads(decoded['root-first/regression.log'])['cases']==3
c=record('compiled.json');assert c['readySha256']==READY and len(c['outputs'])==3
terminal=record('regression-first/terminal.json');assert terminal['valid']and terminal['inputPinsUnchanged']and terminal['readySha256']==READY
p=record('regression-first/report.json');assert p['valid']and p['readySha256']==READY and len(p['cases'])==3
summary=json.loads((A/'summary.json').read_text());assert summary['cases']==p['cases']and summary['decision']=='INTEGRATED_CONSERVATION_CORRECTION_ONLY'
assert summary['readySha256']==READY and summary['readyPins']==625 and summary['integrationCommit']==INTEGRATED
for i,case in enumerate(p['cases']):
 assert case['ticks']==240 and case['maxCandidateLedgerErrorM3']<=1e-9
 if i<2:
  assert case['dt']==1/60 and case['finalJetStep']==18 and case['finalResidualAirM3']>1e-7
  close(case['finalResidualAirM3'],case['finalStepOutputAirM3'],'Recovered final residual')
  close(case['maxOriginalDeficitM3'],case['finalResidualAirM3'],'Original missing volume')
  ledger=case['ledger'];close(ledger['bubbles']+ledger['spit']+ledger['eruption'],ledger['output'],'Final output addition')
  close(ledger['trapped']-(ledger['output']+ledger['held']),ledger['deficit'],'Final deficit arithmetic')
  close(ledger['output']+ledger['held'],case['trappedAirM3'],'Final conserved volume');assert ledger['held']==0
  close(ledger['bubbles'],.5*case['trappedAirM3'],'Bubble fraction');close(ledger['spit']+ledger['eruption'],.5*case['trappedAirM3'],'Escaping fraction')
  close(case['waterCallbacksM3'],.3*(i+1),'Water callback shares');assert case['jetLandings']==case['splashLandings']==8*(i+1)
  assert all(case[k]for k in['exactParcelAndSolverProtocol','finalParcelReusedAsOwnedSplash','nextPositiveStepRetirement','noActiveTubeRowOrCavityFromRetention'])
 else:assert case['exactLifecycleAndWaterAndAir']and case['noExtraTubeRows']and case['closingSteps']==18
receipt=record('canonical-verification.json');assert sha(decoded['canonical-verification.json'])=='666f6c99e9c2b06c1c31be48e22399584dfb727cbfd4b0c2e93819c447237220'
assert receipt['baselineRuntime']==BASE and receipt['tests']['testsPassed']==71 and receipt['tests']['durationMs']==558 and receipt['tests']['exitCode']==0
assert receipt['build']['exitCode']==0 and receipt['build']['tscBuildPassed']and receipt['build']['modulesTransformed']==251 and receipt['build']['viteReportedDurationMs']==504 and len(receipt['build']['compiledFiles'])==11
assert summary['canonicalTests']==receipt['tests']and not summary['canonicalRawStdoutRetained']and summary['integrationResultsAttribution']==receipt['attributedTo']
patch=decoded['canonical.diff'].decode();assert sha(decoded['canonical.diff'])=='b510c43816051641ae1957097301c259b8691eb7e26fec6e80d4a7337196df6d'
assert patch.count('diff --git ')==2 and '+      // Keep the final air dose until releaseAir runs after the last parcel lands.'in patch
condition='if (strip.live === 0 && (!tube || (collapsed(tube, this.time) >= 1 && tube.released >= 1))) this.removeStrip(stripId, strip);'
assert condition in patch and condition in decoded['patch-source.mjs'].decode()
test_part=patch.split('diff --git a/src/wave/PlungingLip.ts')[0]
added='\n'.join(line[1:]for line in test_part.splitlines()if line.startswith('+')and not line.startswith('+++')).strip()
assert added==decoded['test-port.txt'].decode().strip(),'Exact reviewed port insertion'
assert summary['oneExtraEmptyMapExportInterval']and not summary['activeZeroScaleTubeRowAdded']and summary['intendedDownstreamAirSprayRngOutputsMayChange']
assert not summary['majorFinsReferenceVisualOrFpsAccepted']and not summary['rejectedMaterialCandidatesAdopted']and not summary['archiveExperimentReexecuted']
if(A/'SHA256SUMS').exists():
 lines={}
 for line in(A/'SHA256SUMS').read_text().splitlines():h,name=line.split('  ',1);assert name not in lines;lines[name]=h;assert sha((A/name).read_bytes())==h,name
 assert set(lines)=={str(p.relative_to(A))for p in A.rglob('*')if p.is_file()and p.name!='SHA256SUMS'}
print(json.dumps({'valid':True,'manifestSha256':sha(raw),'storedPayloads':len(m['payloads']),'storedPayloadBytes':stored_bytes,'borrowedPayloads':len(m['borrowedPayloads']),'borrowedInputBindings':len(m['borrowedIdentityBindings']),'recordedClosureChecks':closures,'readyPins':625,'finiteCasesChecked':3,'ticksPerRecordedCase':240,'canonicalTestsFromRootReceipt':71,'externalCompiledIdentities':14,'originalRuntimePathsRequired':False,'numericalExperimentReexecuted':False},indent=2))
