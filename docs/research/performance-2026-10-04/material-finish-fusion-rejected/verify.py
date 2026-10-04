#!/usr/bin/env python3
"""Archive byte/recorded arithmetic verification only; no game/candidate imports, replay, build or timing."""
import argparse, gzip, hashlib, json, math, pathlib, statistics, subprocess
from datetime import datetime

A=pathlib.Path(__file__).resolve().parent
R=A.parents[3]
sha=lambda b:hashlib.sha256(b).hexdigest()
def check(b,n,h,label):assert len(b)==n and sha(b)==h,label
def close(x,y,label):assert math.isclose(x,y,rel_tol=1e-10,abs_tol=1e-10),label
def key(p):return(p['path'],p['bytes'],p['sha256'])
parser=argparse.ArgumentParser()
parser.add_argument('--git',action='store_true',help='Read only immutable c698 committed blobs, never current runtime files')
parser.add_argument('--originals',action='store_true',help='Additionally require exact original scratch/tool/compiled files and dependency symlink')
args=parser.parse_args()
raw=(A/'manifest.json').read_bytes();m=json.loads(raw)
assert m['schema']=='material-finish-fusion-rejected-archive/v1'
assert m['canonicalRuntimeCheckpoint']=='c6982456ca9f73bd19527f8032a6790f1d2b8b85'
assert m['status']=='REJECT_NO_NATIVE_NO_INTEGRATION_NO_ENABLEMENT'
known=set();decoded={};stored_bytes=0
for p in m['payloads']:
 packed=(A/p['storedPath']).read_bytes();check(packed,p['storedBytes'],p['storedSha256'],p['storedPath']);stored_bytes+=len(packed)
 assert p['encoding']=='gzip-mtime0' and packed[:3]==b'\x1f\x8b\x08' and packed[4:8]==bytes(4) and not packed[3]&8
 original=gzip.decompress(packed);check(original,p['originalBytes'],p['originalSha256'],p['storedPath']+' original')
 for alias in p['originalAliases']:check(original,alias['bytes'],alias['sha256'],alias['path']);known.add(key(alias))
 for name in p['ownedNames']:assert name not in decoded;decoded[name]=original
assert m['storedPayloadCount']==len(m['payloads']) and m['storedPayloadBytes']==stored_bytes
assert m['originalPayloadAliasCount']==sum(len(p['originalAliases'])for p in m['payloads'])
assert {str(p.relative_to(A))for p in (A/'evidence').rglob('*')if p.is_file()}=={p['storedPath']for p in m['payloads']}
assert all(p.name.endswith('.gz')for p in (A/'evidence').rglob('*')if p.is_file())
for p in m['reusedInputs']:
 packed=(A/p['storedPath']).read_bytes();check(packed,p['storedBytes'],p['storedSha256'],p['storedPath'])
 assert p['aliasEncoding']in {'gzip','identity'}
 original=gzip.decompress(packed)if p['aliasEncoding']=='gzip'else packed
 for alias in p['originalAliases']:check(original,alias['bytes'],alias['sha256'],alias['path']);known.add(key(alias))
for p in m['authorityLinks']+m['generatedRecords']:check((A/p['path']).read_bytes(),p['bytes'],p['sha256'],p['path'])
for p in m['gitReferences']:
 assert p['commit']==m['canonicalRuntimeCheckpoint'] and len(p['gitBlob'])==40
 for alias in p['originalAliases']:known.add(key(alias))
for p in m['externalIdentityReferences']:
 assert p['kind']in {'compiled-identity','installed-dependency-identity'}
 for alias in p['originalAliases']:known.add(key(alias))
git_checked=0
if args.git:
 tree=subprocess.check_output(['git','ls-tree','-r',m['canonicalRuntimeCheckpoint'],'--','src','public','package.json','package-lock.json','tsconfig.json'],cwd=R).decode()
 blobs={line.split('\t',1)[1]:line.split('\t',1)[0].split()[2]for line in tree.splitlines()}
 for p in m['gitReferences']:assert blobs[p['repositoryPath']]==p['gitBlob'],p['repositoryPath']
 unique=list(dict.fromkeys(p['gitBlob']for p in m['gitReferences']))
 batch=subprocess.run(['git','cat-file','--batch'],cwd=R,input=('\n'.join(unique)+'\n').encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True).stdout
 content={};cursor=0
 for blob in unique:
  end=batch.index(b'\n',cursor);parts=batch[cursor:end].decode().split();assert parts[0]==blob and parts[1]=='blob';n=int(parts[2]);cursor=end+1
  content[blob]=batch[cursor:cursor+n];cursor+=n;assert batch[cursor:cursor+1]==b'\n';cursor+=1
 assert cursor==len(batch)
 for p in m['gitReferences']:
  for alias in p['originalAliases']:check(content[p['gitBlob']],alias['bytes'],alias['sha256'],alias['path']);git_checked+=1
if args.originals:
 for path,n,h in known:check(pathlib.Path(path).read_bytes(),n,h,path)
 link=m['dependencyLink'];p=pathlib.Path(link['path']);assert p.is_symlink() and str(p.readlink())==link['target'] and str(p.resolve())==link['realTarget']
closures=0
def walk(x):
 global closures
 if isinstance(x,dict):
  if {'path','bytes','sha256'}<=x.keys() and isinstance(x['path'],str) and x['path'].startswith('/') and not x.get('virtualOnly',False):assert key(x)in known,'Unbound recorded pin '+x['path'];closures+=1
  for value in x.values():walk(value)
 elif isinstance(x,list):
  for value in x:walk(value)
def record(name):return json.loads(decoded[name])
for name in m['closureAuthorities']:walk(record(name))
ready=record('ready.json');compiled=record('compiled.json')
assert sha(decoded['ready.json'])==m['readySha256']=='6b19c544a161c6fce16c226484c8b9bcd035e3a7f4c6d3d4b8839b5a0fd8026b'
assert ready['canonicalRuntimeCheckpoint']==m['canonicalRuntimeCheckpoint'] and ready['fixtureRuntimeCheckpoint']=='b0e003b8670c9d0be83bc9bb24c30b5382a54499'
assert len(ready['inputs'])==597 and compiled['readySha256']==m['readySha256'] and len(compiled['outputs'])==4
assert ready['scope']['sourceOnly'] and all(ready['scope'][k]is False for k in ['numericalImportsExecuted','checksExecuted','bundleExecuted','proofExecuted','costExecuted','browserExecuted','canonicalEdits'])
assert ready['scope']['retries']==0 and ready['scope']['minimumSuccessiveProofTicks']==24 and ready['scope']['restorePaths']==6
assert ready['scope']['optInIntermediateCallbackExceptionFidelity']is False and ready['scope']['finalAndRawNextTolerance']==0
assert ready['sourceWorkOnly']=={'baselineCopyElementsPerTick':'5N','candidateCopyElementsPerTick':0,'removedLogicalReadWriteBytesPerTickAt116k':9280000,'newMaterialArrays':0}
summary=json.loads((A/'summary.json').read_bytes())
assert summary['runtimeAtExperiment']==m['canonicalRuntimeCheckpoint'] and summary['readySha256']==m['readySha256'] and summary['decision']==m['status']
for mode,valid,code,count in [('checks',True,0,598),('proof',True,0,603),('cost',False,1,603)]:
 t=record('root-'+mode+'-first/terminal.json')
 assert t['valid']is valid and t['pinsUnchanged'] and t['readySha256']==m['readySha256']
 assert len(record('root-'+mode+'-first/pins.json'))==count
 assert len(t['commands'])==(7 if mode=='checks'else 1) and all(c['exitCode']==code for c in t['commands'])
 assert all(c['command']==ready['commands'][c['name']]for c in t['commands'])
 assert datetime.fromisoformat(t['startedAt'])<datetime.fromisoformat(t['endedAt']) and t['elapsedSeconds']>0
 assert summary['outcomes'][mode]=={k:t[k]for k in ['valid','pinsUnchanged','startedAt','endedAt','elapsedSeconds']}
assert summary['sessions']=={'checks':29868,'proof':5277,'cost':11431}
assert [c['name']for c in record('root-checks-first/terminal.json')['commands']]==['strict','transformSyntax','buildSyntax','freezeSyntax','bundle','unarmedProof','unarmedCost']
proof=record('proof-first/report.json');cases=proof['cases']
assert proof['valid'] and len(cases)==9 and cases==summary['proofCases'] and proof['readySha256']==m['readySha256']
for i,p in enumerate(cases[:3]):
 assert p['ticks']==24 and p['internalModeEnabled']is (i>0)
 assert all(p[k]for k in ['allPublicRawNextAndSnapshotByteExact','physicalSourceDissipationListsStencilHostAndRngInputsExact','identitiesStable','SET1HeaderAndNonFoamStateExact'])
assert all(cases[3][k]for k in ['physicalSourceRngInputsAndDeparturesExact','allPublicAndRawNextF64Exact'])
assert cases[4]['smallSplashAbsoluteError']==0 and cases[4]['tracePresence']==[{'baseline':[False,False,True],'candidate':[False,False,True]}]
assert cases[5]['details']==[{'donorTicks':ticks,'recipientTicksBeforeImport':27-ticks,'kind':kind,'subsequentCpuTicks':24}for ticks in [25,26]for kind in ['direct-F64','direct-F32','SET1-F32']]
assert cases[5]['originalTkeReset'] and cases[5]['stateHeaderAndNonFoamArraysExact'] and cases[5]['allPublicAndRawNextF64Exact']
assert cases[6]['calls']==[{'stage':'foam','arity':3},{'stage':'air','arity':2}] and cases[6]['endAndRawNextByteExact']
compat=cases[7]['compatibility'];assert cases[7]['optInCallbackAndExceptionFidelityClaim']is False
assert [p['name']for p in compat]==['dense-alias','residual-alias','dense-subarray','breaking-getter','breaking-throw','decay-getter','decay-throw','commit-throw','foam-set-throw','air-set-throw']
for p in compat:
 assert p['observations'] and (p['thrown']is not None)==p['name'].endswith('throw')
for name in ['decay-getter','decay-throw']:assert next(p for p in compat if p['name']==name)['observations']==['stencil.commit','decay.dense','decay.residual']
special=cases[8]['special'];assert len(special)==2
for i,p in enumerate(special):assert p['sharedStencil']is bool(i) and p['cells']==16 and p['rawNextAndFinalF64BytesExact'] and p['chosenNanPayloads']==['7ff8000000001234','fff8000000005678','7ff8000000009abc'] and p['nonpositiveDt']==[0,-.125,'NaN']
assert proof['elapsedMs']<20000 and record('proof-first/terminal.json')['valid']
cost=record('cost-first/report.json');rows=cost['rows'];s=cost['statistics']
assert not cost['valid'] and cost['strictStop'] and 'Reject: no >0.1 ms'in cost['firstFailure'] and len(rows)==32
assert cost['readySha256']==proof['readySha256']==m['readySha256'] and summary['statistics']==s
savings=[]
for i,p in enumerate(rows):
 assert p['pair']==i and p['order']==['AB','BA','BA','AB'][i%4] and p['baseline']['ticks']==p['candidate']['ticks']==8
 assert p['baseline']['substepsLastTick']==p['candidate']['substepsLastTick']==1
 assert all(math.isfinite(p[arm]['totalMs'])and p[arm]['totalMs']>0 for arm in ['baseline','candidate'])
 value=(p['baseline']['totalMs']-p['candidate']['totalMs'])/8;close(value,p['savingPerStepMs'],'row '+str(i));savings.append(value)
computed={'meanSavingPerStepMs':sum(savings)/32,'medianSavingPerStepMs':statistics.median(savings),'minSavingPerStepMs':min(savings),'maxSavingPerStepMs':max(savings),'heuristicLower95Ms':sum(savings)/32-1.96*statistics.stdev(savings)/math.sqrt(32)}
for k,v in computed.items():close(v,s[k],k)
assert s['positivePairs']==sum(v>0 for v in savings)==3 and s['pairs']==32 and s['ticksPerSample']==8
means={}
for order,p in zip(['AB','BA'],s['orderStrata']):
 values=[row['savingPerStepMs']for row in rows if row['order']==order];assert p['order']==order and p['pairs']==len(values)==16
 means[order]=sum(values)/16;close(means[order],p['meanSavingPerStepMs'],order)
assert s['thresholdMs']==.1 and s['thresholdPass']is False
assert (computed['heuristicLower95Ms']>.1 and all(v>.1 for v in means.values()))is False
assert all(v<0 for v in means.values()) and computed['meanSavingPerStepMs']<0
work=cost['work'];assert work['warmPairs']==4 and work['measuredPairs']==32 and work['ticksPerBlock']==8 and work['completedTicksPerArm']==summary['completedTicksPerCostArm']==288
assert work['cells']==116000 and work['components']==64 and work['dt']==1/60 and cost['elapsedMs']<20000
close(work['finalSolverTime']-work['initialSolverTime'],288/60,'cost solver clock');close(work['finalSeaTime']-work['initialSeaTime'],288/60,'cost sea clock')
assert work['sourceWorkOnly']['removedLogicalReadWriteBytesPerTick']==80*116000 and work['sourceWorkOnly']['newMaterialArrays']==0
assert cost['inputAuthority']==proof['inputAuthority'] and cost['inputAuthority']['captureIncomplete'] and cost['inputAuthority']['f32CommittedExport']
for name,valid in [('proof-first',True),('cost-first',False)]:
 t=record(name+'/terminal.json');assert t['valid']is valid
 p=t['report'];check(decoded[name+'/report.json'],p['bytes'],p['sha256'],name+' report')
assert record('cost-first/terminal.json')['error']==cost['firstFailure']
assert all(summary[k]is False for k in ['nativeExecuted','candidateIntegrated','candidateEnabled','visualOrFpsClaim','optInIntermediateCallbackExceptionFidelityClaim'])
assert m['scope']['recordedEvidenceOnly'] and all(m['scope'][k]is False for k in ['producerExperimentExecution','simulationReplay','compiledTreesCopied','dependencyTreeCopied','canonicalSourceTreeCopied','publicAssetTreeCopied','candidateAdopted','nativeExecuted'])
if (A/'SHA256SUMS').exists():
 sums={}
 for line in (A/'SHA256SUMS').read_text().splitlines():
  h,name=line.split('  ',1);assert name not in sums;sums[name]=h;assert sha((A/name).read_bytes())==h,name
 assert set(sums)=={str(p.relative_to(A))for p in A.rglob('*')if p.is_file()and p.name!='SHA256SUMS'}
print(json.dumps({'valid':True,'manifestSha256':sha(raw),'storedPayloads':len(m['payloads']),'storedPayloadBytes':stored_bytes,'reusedInputs':len(m['reusedInputs']),'immutableGitReferences':len(m['gitReferences']),'immutableGitBytesChecked':git_checked,'externalIdentities':len(m['externalIdentityReferences']),'closureChecks':closures,'proofCasesChecked':9,'costRowsChecked':32,'originalPathsChecked':len(known)if args.originals else 0,'recordedMeanSavingPerStepMs':computed['meanSavingPerStepMs'],'recordedMedianSavingPerStepMs':computed['medianSavingPerStepMs'],'experimentReexecuted':False},indent=2))
