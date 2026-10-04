#!/usr/bin/env python3
"""Offline retained bytes and arithmetic only; optional immutable Git reads, never helper/runtime replay."""
from pathlib import Path
from collections import Counter
import argparse,ast,gzip,hashlib,json,math,re,subprocess
A=Path(__file__).resolve().parent;M=json.loads((A/'manifest.json').read_text());h=lambda b:hashlib.sha256(b).hexdigest()
def check(v,msg):
 if not v:raise AssertionError(msg)
def near(a,b,msg):check(math.isfinite(a) and math.isfinite(b) and abs(a-b)<=1e-8*max(1,abs(b)),msg)
arg=argparse.ArgumentParser();arg.add_argument('--git',action='store_true');args=arg.parse_args()
contents={}
for p in M['payloads']:
 b=(A/p['path']).read_bytes();check(len(b)==p['bytes'] and h(b)==p['sha256'],'Encoded payload '+p['path']);raw=gzip.decompress(b);check(len(raw)==p['contentBytes'] and h(raw)==p['contentSha256'],'Decoded payload '+p['path']);contents[p['path']]=raw
aliases={p['originalPath']:p for p in M['aliases']};check(len(aliases)==len(M['aliases']),'Unique original aliases');gitrefs={(p['originalPath'],p['sha256']):p for p in M['gitReferences']}
for p in aliases.values():check(len(contents[p['payload']])==p['bytes'] and h(contents[p['payload']])==p['sha256'],'Exact alias '+p['originalPath'])
def data(path):check(path in aliases,'Missing retained payload alias '+path);return contents[aliases[path]['payload']]
def obj(path):return json.loads(data(path))
def pin(p):
 path=p.get('originalPath',p['path']);r=aliases.get(path)
 if not r or r['sha256']!=p['sha256']:r=gitrefs.get((path,p['sha256']))
 check(r is not None and r['bytes']==p['bytes'] and r['sha256']==p['sha256'],'Pin closure '+path)
physical=virtual=relative=0
roots=list(M['cpuVersions'].values())+list(M['nativeVersions'].values())
def walk(x):
 global physical,virtual,relative
 if isinstance(x,dict):
  if {'path','bytes','sha256'}<=x.keys() and isinstance(x['path'],str) and isinstance(x['bytes'],int) and isinstance(x['sha256'],str):
   if x.get('virtualOnly') or x.get('additiveGettersOnly'):virtual+=1
   elif Path(x.get('originalPath',x['path'])).is_absolute():pin(x);physical+=1
   else:relative+=1
  for v in x.values():walk(v)
 elif isinstance(x,list):
  for v in x:walk(v)
for p in aliases:
 if p.endswith('.json') and (any(p.startswith(r+'/') for r in roots) or p in [M['v3FirstFreezeReceipt'],M['v4FirstFreezeReceipt']]):walk(obj(p))
# Borrowed earlier JSON is durable by its exact direct frozen input pin, but its nested capture
# compilation fields are historical metadata. No expanded replay/closure claim for expired ancestors.
git_checked=0
if args.git:
 R=Path(M['repository']);trees={}
 for commit in {p['commit'] for p in M['gitReferences']}:
  trees[commit]={}
  for row in subprocess.check_output(['git','ls-tree','-r','-z',commit],cwd=R).split(b'\0'):
   if row:
    meta,path=row.split(b'\t',1);trees[commit][path.decode()]=meta.decode().split()[2]
 proc=subprocess.Popen(['git','cat-file','--batch'],cwd=R,stdin=subprocess.PIPE,stdout=subprocess.PIPE)
 for p in M['gitReferences']:
  check(trees[p['commit']].get(p['repositoryPath'])==p['blob'],'Immutable commit-tree membership');proc.stdin.write((p['blob']+'\n').encode());proc.stdin.flush();head=proc.stdout.readline().decode().split();check(head[:2]==[p['blob'],'blob'],'Git blob header');b=proc.stdout.read(int(head[2]));check(proc.stdout.read(1)==b'\n','Git delimiter');check(len(b)==p['bytes'] and h(b)==p['sha256'],'Immutable Git bytes');git_checked+=1
 proc.stdin.close();check(proc.wait()==0,'Git batch exit')
check(len(M['sourceClosure']['publicPaths'])==38,'Public38 immutable refs')
cpu=M['cpuVersions'];native=M['nativeVersions'];C=M['runtimeCommit']
for v,w in cpu.items():
 r=obj(w+'/ready.json');t=obj(w+'/root-checks-first/terminal.json');check(r['canonicalRuntimeCheckpoint']==C,'CPU source checkpoint');check(t['readySha256']==aliases[w+'/ready.json']['sha256'] and t['pinsUnchanged'],'CPU ready and unchanged pins')
 check(t['valid']==(v=='v3'),'CPU first check outcomes');check(all(c['exitCode']==0 for c in t['commands']) if v=='v3' else len(t['commands'])==1 and t['commands'][0]['exitCode']==1,'CPU first check commands')
r=obj(cpu['v3']+'/ready.json');runtime=[p for p in r['virtual'] if not p['testOnly']];check(len(runtime)==6 and len(r['virtual'])==10,'Six runtime/four typing-only identities')
proof=obj(cpu['v3']+'/proof-first/report.json');cost=obj(cpu['v3']+'/cost-first/report.json');check(proof['valid'] and len(proof['cases'])==24,'Finite proof24 cases');near(proof['elapsedMs'],7214.371958000001,'Proof actual body duration');near(cost['elapsedMs'],9723.781709,'Cost actual body duration')
for mode in ['proof','cost']:
 t=obj(cpu['v3']+'/root-'+mode+'-first/terminal.json');check(t['valid'] and t['pinsUnchanged'] and t['readySha256']==aliases[cpu['v3']+'/ready.json']['sha256'],'Root first '+mode+' gate')
check(cost['valid'] and len(cost['pairs'])==32,'Cost32 pairs');weights=[];orders={}
for p in cost['pairs']:
 check(p['baseline']['ticks']==p['candidate']['ticks']==8 and p['baseline']['lastHostSubsteps']==p['candidate']['lastHostSubsteps']==1,'Eight original one-step ticks');near(p['baseline']['logicalSeaTime'],p['candidate']['logicalSeaTime'],'Paired logical clock');v=(p['baseline']['totalMs']-p['candidate']['totalMs'])/8;near(p['savingPerStepMs'],v,'Actual cost arithmetic');weights.append(v);orders.setdefault(p['order'],[]).append(v)
mean=sum(weights)/32;variance=sum((x-mean)**2 for x in weights)/31;lower=mean-1.96*math.sqrt(variance/32);s=cost['statistics'];near(s['meanSavingPerStepMs'],mean,'Mean cost');near(s['sampleVariance'],variance,'Sample variance');near(s['heuristicLower95Ms'],lower,'Heuristic lower');near(s['medianSavingPerStepMs'],(sorted(weights)[15]+sorted(weights)[16])/2,'Original CPU median');check(s['positivePairs']==sum(v>0 for v in weights),'Positive pairs')
for k,v in orders.items():near(s['orderMeans'][k],sum(v)/len(v),'Order mean '+k)
check(s['thresholdMs']==.1 and s['pass'] and lower>.1 and all(sum(v)/len(v)>.1 for v in orders.values()),'Original useful-cost criterion');check(cost['work']['cells']==116000 and cost['work']['components']==64 and cost['work']['ticksPerBlock']==8,'Mock work scope');check('no WGSL'in proof['qualification'] and 'WGSL'in cost['work']['excluded'],'Mock qualification retained')
for v in ['v1','v2']:
 w=native[v];t=obj(w+'/root-checks-first/terminal.json');check(not t['valid'] and t['pinsUnchanged'],'Native setup failure unchanged');check(len(t['commands'])==(1 if v=='v1' else 2),'Native first failure stage')
check(obj(native['v1']+'/strict-terminal.json')['arms']==[],'V1 failed baseline before completed arm')
v2strict=obj(native['v2']+'/strict-terminal.json');check(v2strict['valid'] and [p['arm'] for p in v2strict['arms']]==['baseline','candidate'],'V2 both strict arms');check(data(native['v2']+'/root-checks-first/command-0.log')==b'','V2 empty strict stdout');check('10 !== 11'in obj(native['v2']+'/build-terminal.json')['firstFailure'],'V2 count setup failure')
v3=obj(M['v3FirstFreezeReceipt']);check(v3['exitCode']==1 and not any(v3[k] for k in ['readyPresent','checksExecuted','buildExecuted','nativeExecuted','rawStderrRetained']),'V3 first freeze failure before gates');check(len(v3['sourcePins'])==21 and 'truncated'in v3['rawStderrQualification'].lower(),'V3 structured truncated receipt qualification');check(native['v3']+'/ready.json'not in aliases,'No invented V3 ready')
v4=obj(M['v4FirstFreezeReceipt']);check(v4['exitCode']==0 and v4['log']in aliases,'V4 first freeze result/log');w=native['v4'];ready=obj(w+'/ready.json');check(ready['runtimeVirtual']==runtime,'Same six runtime identities');check(ready['priorTestVirtual']==[p for p in r['virtual'] if p['testOnly']],'Same four typing identities');check(ready['nativeQualityPending'] and not ready['nativeAdoptionAuthorized'],'No quality/adoption acceptance')
# Reconstruct only the literal additive entry text as data; no JS evaluator/helper import.
entry=data(w+'/entry-source.mjs').decode();core=ast.literal_eval(re.search(r'const coreLine = (.*);',entry).group(1));witness=entry.split('const witness = `',1)[1].split('`;\nexport function',1)[0];check('${'not in witness and '\\'not in witness,'Literal witness template only')
original_path=ready['entryVirtual']['baseline']['path'];original_pin=next(p for p in ready['inputs'] if p['path']==original_path)
original=data(original_path).decode() if original_path in aliases else subprocess.check_output(['git','show',C+':'+str(Path(original_path).relative_to(M['repository']))],cwd=M['repository']).decode() if args.git else None
# Default validates stored entry identity metadata and actual build-load bindings; --git can also
# reconstruct the original literal entry from its immutable Git blob without invoking a transformer.
if original is not None:
 for arm in ['baseline','candidate']:
  line=core if arm=='baseline' else core.replace('GpuBoussinesq.create(solver));',"GpuBoussinesq.create(solver), { primaryStorage: 'f32' });")
  b=(original.replace(core,line)+witness).encode();expected=ready['entryVirtual'][arm];check(len(b)==expected['bytes'] and h(b)==expected['sha256'],'Literal additive entry bytes '+arm)
checks=obj(w+'/root-checks-first/terminal.json');check(checks['valid'] and checks['pinsUnchanged'] and len(checks['commands'])==10 and all(c['exitCode']==0 for c in checks['commands']),'Ten V4 first gates');binding=obj(w+'/bindings.json');check(binding['readySha256']==aliases[w+'/ready.json']['sha256'],'Binding ready');manifests={}
for arm in ['baseline','candidate']:
 p=binding['arms'][arm];pin(p);b=obj(p['path']);manifests[arm]=b;check(b['arm']==arm and b['status']=='passed' and b['buildId']=='306258296' and b['readySha256']==binding['readySha256'],'Arm manifest binding');check(len(b['outputs'])==len({p['path'] for p in b['outputs']})==10,'Ten outputs')
 for out in b['outputs']:pin({**out,'path':b['outputRoot']+'/'+out['path']})
 check(any(p['realm']=='worker' and p['path']==original_path and p['virtualSha256']==ready['entryVirtual'][arm]['sha256'] for p in b['loads']),'Actual worker entry overlay');check(b['additiveEntry']==ready['entryVirtual'][arm],'Entry manifest identity')
 if arm=='candidate':
  for p in runtime:check(any(q['realm']=='worker' and q['path']==p['path'] and q['virtualSha256']==p['sha256'] for q in b['loads']),'Actual worker pinned runtime use '+p['path'])
driver=obj(w+'/fps-first.native-driver.json');report=obj(w+'/fps-first/report.json');check(driver['valid'] and driver['exitCode']==0 and driver['elapsedSeconds']<=720 and driver['independentClosureValid'],'Native outer execution/closure');check([p['port'] for p in driver['independentClosure']]==[4262,9672,4263,9673,4264,9674,4265,9675,4200] and all(p['closed'] is True and p['reason']=='ECONNREFUSED' for p in driver['independentClosure']),'All nine actual TCP closures');check(report['valid'] and not report['incomplete'] and [p['id'] for p in report['arms']]==['AB-baseline','AB-candidate','BA-candidate','BA-baseline'],'Fixed first ABBA execution')
def q(xs,at):return sorted(xs)[min(len(xs)-1,math.floor(len(xs)*at))] if xs else 0
def rnd(x,d=2):return float(format(x,'.'+str(d)+'f'))
def pubs(events):
 fresh=[];deltas=[];dup=back=nonint=0
 for e in events:
  if not math.isfinite(e['sea']):continue
  if not fresh:fresh.append(e);continue
  advance=e['sea']-fresh[-1]['sea']
  if abs(advance)<=1e-9:dup+=1;continue
  if advance<0:back+=1;continue
  steps=advance*60;whole=math.floor(steps+.5);nonint+=abs(steps-whole)>1e-4;deltas.append(whole);fresh.append(e)
 span=(events[-1]['wall']-events[0]['wall'])/1000 if len(events)>1 else 0;adv=fresh[-1]['sea']-fresh[0]['sea'] if len(fresh)>1 else 0
 return {'publicationEvents':len(events),'advancingPublications':max(0,len(fresh)-1),'duplicatePublicationEvents':dup,'backwardsPublicationEvents':back,'publicationEventsPerSecond':rnd((len(events)-1)/span) if span>0 else 0,'freshSnapshots':len(fresh),'freshSnapshotsPerSecond':rnd((len(fresh)-1)/span) if span>0 else 0,'fixedPhysicsStepSeconds':1/60,'physicsAdvanceSeconds':rnd(adv,6),'physicsStepsPerWallSecond':rnd(adv*60/span) if span>0 else 0,'physicsStepsBetweenPublicationsP50':q(deltas,.5),'physicsStepsBetweenPublicationsP95':q(deltas,.95),'physicsStepsBetweenPublicationsMax':max(deltas) if deltas else 0,'physicsStepDeltaDistribution':dict(sorted(Counter(str(x) for x in deltas).items())),'nonIntegralPhysicsStepDeltas':nonint}
raw_summary={}
for arm in report['arms']:
 check(arm['valid'] and arm['elapsedSeconds']<=180 and arm['cleanupElapsedSeconds']<=5 and arm['terminal']['code']==0 and all(p['closed'] for p in arm['closure'].values()),'Inner arm execution/bounds/closure');fps=obj(arm['fps']['path']);launcher=obj(arm['launcher']['path']);storage=obj(arm['storage']['path']);audit=obj(arm['nativeAudit']['path']);result=fps['results'][0];manifest=manifests[arm['name']];worker=arm['url'].split('?')[0].rstrip('/')+'/'+manifest['worker'];check(fps['valid'] and fps['nativeAudit']['valid'] and result['ordinaryConfigMatches'] and fps['gpuTiming']=='disabled (passive counters)','Original FPS route/config');check(launcher['ownedClosed'] and launcher['ownedChromeClosed'] and launcher['launch']['exit']['code']==0 and launcher['closure']['elapsedMs']<=5000,'Owned Chrome closure');check(not launcher['launch']['resizeOverrides'] and all(p['closed'] for k,p in launcher['closure'].items() if k in ['server','cdp','port4200']),'No resize/closure');check(len(storage['rows'])==2 and storage['samplingQueries']==0 and not storage['alteredMathOrPhysics'],'Boundary witnesses only');check([p['phase'] for p in storage['rows']]==['sample-start','sample-end'],'Witness phases');check(all(c['deadlineMs']==10000 for c in launcher['trace']['commands']),'Original bounded CDP deadlines');check(not any(c['method'].startswith('Profiler.') for c in launcher['trace']['commands']),'No native profiler')
 for witnessrow in storage['rows']:
  i=witnessrow['identity'];child=i['currentChild'];attached=i['autoattachedChild'];context=i['workerContext'];frame=i['frameTree']['frameTree']['frame'];value=witnessrow['value'];check(i['insideHref']==child['url']==attached['targetInfo']['url']==value['insideHref']==worker,'Actual exact worker href');check(i['workerSession']==attached['sessionId'] and context['uniqueId'] and attached['waitingForDebugger'] is False,'Attached live worker/context');check(frame['id']==child['parentFrameId']==attached['targetInfo']['parentFrameId']==i['pageContext']['auxData']['frameId'],'Parent frame relation');check(child.get('browserContextId')==i['parent'].get('browserContextId')==attached['targetInfo'].get('browserContextId'),'Browser context relation');check(value['cells']==116000 and value['selectedSoloRunner'] and value['devicePresent'] and value['deviceDisposed'] is False,'Real selected GPU owner');candidate=arm['name']=='candidate';check(value['primaryOwnerExists']==candidate and value['threeIndependentBuffers']==(not candidate) and value['primaryViewsMatch']==candidate and value['primaryOwnerIsDevice']==candidate,'Actual storage ownership')
  for n,key in enumerate(['h','qx','qz']):
   p=value[key];check(p['constructor']==('Float32Array' if candidate else 'Float64Array') and p['length']==116000 and p['byteLength']==116000*(4 if candidate else 8) and p['byteOffset']==(n*464000 if candidate else 0) and p['backingBytes']==(1392000 if candidate else 928000),'Actual plane '+key)
  if candidate:check(value['primaryBlockIsUpload'] and value['threeViewsShareBlock'] and value['devicePrivateUnusable'] is False and value['storageVersion']>=1,'One coherent F32 upload block')
  else:check(value['primaryBlock'] is None and value['storageVersion'] is None,'Default F64 without owner')
 witnesses=launcher['bootstrapServingWitnesses'];check(len(witnesses)==2 and all(p['bootstrapRows'] and not p['gameServingRows'] for p in witnesses),'Pinned inert bootstrap before arming');check(all(p['actual']['inner']==[1708,879] and p['actual']['canvas']==[2989,1538] and p['actual']['dpr']==2 for p in audit['observations']),'Native viewport tuple')
 # Exact recorded HTTP200 GETs are checked against the active arm output/public/bootstrap whitelist.
 allow={'/'+p['path']:p for p in manifest['outputs']};pub=obj(M['publicWhitelist']);allow.update({'/'+p['path']:p for p in pub['files']});allow['/bootstrap.html']=ready['bootstrap']['pin']
 for req in launcher['serverRequests']:
  if req.get('status')==200:
   path=req['route'].split('?',1)[0];check(path in allow and req['bytes']==allow[path]['bytes'] and req['sha256']==allow[path]['sha256'],'Actual served bytes '+path)
 def captured(expr):
  cs=[c for c in launcher['trace']['commands'] if c['method']=='Runtime.evaluate' and c['params'].get('expression')==expr];check(len(cs)==1,'One retained raw capture '+expr);return cs[0]['result']['result']['value']
 frames=captured('(() => { window.__perf.sampling = false; return window.__perf.frames; })()');events=captured('window.__perf.snapshots');check(len(frames)==result['frames'] and sum(f[1]>0 for f in frames)==result['renderedFrames'],'Raw callback/drawn counts');total=sum(f[0] for f in frames);near(result['fps'],rnd(len(frames)*1000/total,1),'Callback rate');near(result['renderedFps'],rnd(result['renderedFrames']*1000/total,1),'Draw rate');intervals=[];elapsed=0;had=False
 for f in frames:
  elapsed+=f[0]
  if f[1]>0:
   if had:intervals.append(elapsed)
   elapsed=0;had=True
 for key,at in [('renderedFrameMsP50',.5),('renderedFrameMsP95',.95),('renderedFrameMsP99',.99)]:near(result[key],rnd(q(intervals,at)),key)
 stats=pubs(events)
 for key,v in stats.items():check(result[key]==v,'Raw publication arithmetic '+key)
 keys=list(result['pipelineMsP50'])
 for key in keys:
  xs=[e['pipeline'][key] for e in events if math.isfinite(e['pipeline'].get(key,float('nan')))];near(result['pipelineMsP50'][key],rnd(q(xs,.5)),'Pipeline p50 '+key);near(result['pipelineMsP95'][key],rnd(q(xs,.95)),'Pipeline p95 '+key)
 for row in result['simulationTimeline']:
  lo=events[0]['wall']+row['from']*1000;subset=[e for e in events if lo<=e['wall']<lo+2000];check(row['snapshots']==len(subset),'Original wall-bin count')
  for key,v in pubs(subset).items():check(row[key]==v,'Wall-bin publication arithmetic '+key)
  for key in keys:near(row['pipelineMsP50'][key],rnd(q([e['pipeline'][key] for e in subset],.5)),'Wall-bin p50 '+key)
 raw_summary[arm['id']]={'callbacks':len(frames),'drawnFrames':result['renderedFrames'],'precedingCallbackIntervalWeightMs':total,'renderedFps':result['renderedFps'],'physicsStepsPerWallSecond':result['physicsStepsPerWallSecond'],'pipelineTotalP50':result['pipelineMsP50']['total'],'lastBin':result['simulationTimeline'][-1]['from'],'rawPublications':len(events)}
attr=obj(M['nativeAttribution']);check(attr['executionValid'] and not attr['twoOrderPerformanceAttributionValid'] and not attr['runtimeAdopted'] and not attr['physicsQualityExecuted'] and not attr['timingRetryPerformed'],'Honest attribution limits')
for p in attr['rows']:
 raw=obj(p['source']['path']);result=raw['results'][0];check(p['renderedFps']==result['renderedFps'] and p['callbackFps']==result['fps'] and p['physicsStepsPerWallSecond']==result['physicsStepsPerWallSecond'] and p['pipelineTotalP50']==result['pipelineMsP50']['total'] and p['powerAtMachineCapture']==raw['machine']['power'] and p['powerAtSampleEnd']==result['power'] and p['initialRefreshHz']==raw['browser']['refreshHz'],'Root attribution raw consistency');last=next(b for b in result['simulationTimeline'] if b['from']==88);check(p['lastFullBin']=={'from':88,'physicsStepsPerWallSecond':last['physicsStepsPerWallSecond'],'totalP50':last['pipelineMsP50']['total']},'Root late88 bin')
check(attr['rows'][0]['powerAtMachineCapture']=='battery' and attr['rows'][0]['renderedFps']==30 and attr['rows'][1]['powerAtSampleEnd'].startswith('AC '),'Actual AB power confound');check(all(p['powerAtMachineCapture']=='AC power' and p['renderedFps']==60 for p in attr['rows'][2:]),'One same-AC BA order')
near(attr['sameACOrderObservedSavingsMs'],attr['rows'][3]['pipelineTotalP50']-attr['rows'][2]['pipelineTotalP50'],'Reported BA context difference');check(attr['sameACOrderRenderedFpsDifference']==0,'BA render difference0')
print(json.dumps({'status':'passed','counts':M['counts'],'physicalPinClosures':physical,'virtualIdentityRecords':virtual,'relativeOutputRecordsSeparatelyBound':relative,'immutableGitBlobChecks':git_checked,'gitAuthorityNotReadWithoutFlag':not args.git,'costArithmetic':{'meanMsPerStep':mean,'heuristicLower95Ms':lower,'sampleVariance':variance,'pairs':32,'positivePairs':sum(v>0 for v in weights)},'nativeRawArithmetic':raw_summary,'historicalAncestryQualification':M['historicalAncestryQualification'],'scope':'Archive bytes/active frozen pin closure/retained arithmetic and optional immutable Git only. No helper imports, replay, CPU benchmark, build, API/network/browser/native execution; no two-order causal gain, stable60 physics, moving quality or adoption claim.'},indent=2))
