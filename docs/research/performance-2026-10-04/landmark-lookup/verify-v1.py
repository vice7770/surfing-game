#!/usr/bin/env python3
"""Offline retained identities and raw arithmetic only; optional immutable Git reads, never replay."""
from pathlib import Path
from collections import Counter
import argparse,ast,gzip,hashlib,json,math,re,subprocess
A=Path(__file__).resolve().parent;M=json.loads((A/'manifest.json').read_text());h=lambda b:hashlib.sha256(b).hexdigest()
def check(v,msg):
 if not v:raise AssertionError(msg)
def near(a,b,msg):check(math.isfinite(a) and math.isfinite(b) and abs(a-b)<=1e-8*max(1,abs(b)),msg)
arg=argparse.ArgumentParser();arg.add_argument('--git',action='store_true');args=arg.parse_args()
check(M['schema']=='landmark-lookup-evidence-archive/v1','Archive schema')
prior=M['existingArchiveManifest'];b=(A/prior['path']).read_bytes();check(len(b)==prior['bytes'] and h(b)==prior['sha256'],'Existing dedup manifest authority')
for p in M['plainSources']:
 b=(A/p['path']).read_bytes();check(len(b)==p['bytes'] and h(b)==p['sha256'],'Exact archive source '+p['path'])
contents={}
for p in M['payloads']:
 target=(A/p['path']).resolve();check(target.is_relative_to(A.parent),'Adjacent archive payload scope');b=target.read_bytes();check(len(b)==p['bytes'] and h(b)==p['sha256'],'Encoded payload '+p['path']);raw=gzip.decompress(b);check(len(raw)==p['contentBytes'] and h(raw)==p['contentSha256'],'Decoded payload '+p['path']);contents[p['path']]=raw
aliases={p['originalPath']:p for p in M['aliases']};check(len(aliases)==len(M['aliases']),'Unique original aliases');gitrefs={(p['originalPath'],p['sha256']):p for p in M['gitReferences']}
for p in aliases.values():check(len(contents[p['payload']])==p['bytes'] and h(contents[p['payload']])==p['sha256'],'Exact alias '+p['originalPath'])
def data(path):check(path in aliases,'Missing retained payload alias '+path);return contents[aliases[path]['payload']]
def obj(path):return json.loads(data(path))
def pin(p):
 path=p.get('originalPath',p['path']);r=aliases.get(path)
 if not r or r['sha256']!=p['sha256']:r=gitrefs.get((path,p['sha256']))
 check(r is not None and r['bytes']==p['bytes'] and r['sha256']==p['sha256'],'Pin closure '+path)
physical=virtual=relative=0
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
 if p.endswith('.json') and (any(p.startswith(root+'/') for root in M['activeOwnedRoots']) or p==M['firstFreezeObservation']['path']):walk(obj(p))
# Borrowed earlier JSON is retained by its direct exact pin. Nested expired ancestors remain metadata.
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
cpu=M['cpuRoot'];w=M['nativeRoot'];C=M['runtimeCommit'];cpu_ready=obj(cpu+'/ready.json');ready=obj(w+'/ready.json')
check(cpu_ready['canonicalRuntimeCheckpoint']==ready['runtimeCheckpoint']==C,'Accepted source checkpoint');check(aliases[cpu+'/ready.json']['sha256']=='d08b76435e082f89abc7744f8d868a107e78899b64444aaf7ec28d27f5f5c6f0','CPU d08 authority');check(aliases[w+'/ready.json']['sha256']=='98c9d66f6ac5b190c1887c578695d41f434bd26e270a4aec3967f7aa0e244fb5','Native98 authority')
runtime=cpu_ready['virtual'];check(runtime==ready['runtimeVirtual'] and len(runtime)==2 and not ready['priorTestVirtual'],'Exactly two lookup overlays, no F32/test overlay');check([p['sha256'] for p in runtime]==['44c29e6bff25ac85ce549c24ccafbc1232ef2d360647a2c6250ce737018032ff','202ea5a8e715e338dc25f13d811ca7f6598f87ed52e58cd0ba6560e90a50e23d'],'Exact runtime proposal identity');check(ready['entryVirtual']['baseline']==ready['entryVirtual']['candidate'] and not ready['entryVirtual']['baseline']['explicitExperiment'],'Identical original-default get-only entries')
for mode,n in [('checks',6),('proof',1),('cost',1)]:
 t=obj(cpu+'/root-'+mode+'-first/terminal.json');check(t['valid'] and t['pinsUnchanged'] and t['readySha256']==aliases[cpu+'/ready.json']['sha256'] and len(t['commands'])==n and all(c['exitCode']==0 for c in t['commands']),'First CPU '+mode+' gate')
proof=obj(cpu+'/proof-first/report.json');cost=obj(cpu+'/cost-first/report.json');check(proof['valid'] and len(proof['cases'])==3 and cost['valid'],'First proof/cost outcomes');near(proof['elapsedMs'],2874.007042,'Recorded proof body duration');near(cost['elapsedMs'],7638.941,'Recorded cost body duration')
p0,p1,p2=proof['cases'];check(p0['rows']==p0['interleavings']==3780 and p0['windows']==22680 and p0['f64Exact'] and p0['defaultMethodsUnchanged'],'Exact query proof');check(p1['builds']==31 and p1['sampledHits']==2025 and p1['statefulCalls']==4574 and p1['allCapacityArraysExact'] and p1['syntheticStress101Fronts'] and not p1['native101FrontCapture'],'Synthetic complete build/contact proof');check(len(p2['rows'])==24 and p2['finiteExact'] and all(r['stateBytesEqual'] and r['fullSnapshotBytesEqual'] and r['gaugeStatusEqual'] for r in p2['rows']),'24 mock Core exact rows');check('no WGSL'in p2['qualification'],'No native proof upgrade')
check(len(cost['pairs'])==32 and cost['work']['warmPairs']==4 and cost['work']['ticksPerBlock']==8 and cost['work']['ticksPerArm']==288,'Original fixed32-pair work');weights=[];orders={}
for i,p in enumerate(cost['pairs']):
 check(p['index']==i and p['baseline']['ticks']==p['candidate']['ticks']==8,'Original measured pair/ticks');check(p['baseline']['sourceCounts']==p['candidate']['sourceCounts']==p['parity']['counts'],'Paired complete source counts');check(p['parity']['stateBytesEqual'] and p['parity']['fullSnapshotBytesEqual'] and p['parity']['gaugeStatusEqual'],'Retained cost parity');v=(p['baseline']['totalMs']-p['candidate']['totalMs'])/8;near(p['savingPerStepMs'],v,'Actual whole-block saving arithmetic');weights.append(v);orders.setdefault(p['order'],[]).append(v)
mean=sum(weights)/32;variance=sum((x-mean)**2 for x in weights)/31;lower=mean-1.96*math.sqrt(variance/32);s=cost['statistics'];near(s['meanSavingPerStepMs'],mean,'CPU mean');near(s['heuristicLower95Ms'],lower,'CPU heuristic lower');near(s['medianSavingPerStepMs'],(sorted(weights)[15]+sorted(weights)[16])/2,'Original CPU median')
for k,v in orders.items():near(s['orderMeans'][k],sum(v)/len(v),'CPU order '+k)
check(s['fixedThresholdMs']==.1 and s['pass'] and lower>.1 and all(sum(v)/len(v)>.1 for v in orders.values()),'Original useful mock-cost criterion');check([p['baseline']['sourceCounts']['contact']['slices'] for p in cost['pairs'][:3]]==[19,13,12] and all(p['baseline']['sourceCounts']['contact']['slices']==0 for p in cost['pairs'][3:]),'Observed contact support becomes empty');check(all(p['baseline']['sourceCounts']['frontPoints']<101 for p in cost['pairs']) and cost['fixture']['initialSparseSixPointIsNotLate101FrontEvidence'] and cost['fixture']['noWGSLDriverEvolution'],'Sparse fixture/empty-contact qualification');check('WGSL'in cost['work']['excluded'],'Mock exclusions retained')
entry=data(w+'/entry-source.mjs').decode();core=ast.literal_eval(re.search(r'const coreLine = (.*);',entry).group(1));witness=entry.split('const witness = `',1)[1].split('`;\nexport function',1)[0];check('${'not in witness and '\\'not in witness,'Literal additive getter template only');original_path=ready['entryVirtual']['baseline']['path'];original=data(original_path).decode() if original_path in aliases else subprocess.check_output(['git','show',C+':'+str(Path(original_path).relative_to(M['repository']))],cwd=M['repository']).decode() if args.git else None
if original is not None:
 check(original.count(core)==1,'One unchanged default Core constructor');b=(original+witness).encode()
 for arm in ['baseline','candidate']:
  expected=ready['entryVirtual'][arm];check(len(b)==expected['bytes'] and h(b)==expected['sha256'],'Literal original-default getter entry '+arm)
freeze=obj(M['firstFreezeObservation']['path']);check(freeze['terminalExitCode']==0 and freeze['sourceFrozen'] and not freeze['execution'] and freeze['readySha256']==aliases[w+'/ready.json']['sha256'] and 'No separate raw stdout/stderr'in freeze['qualification'],'Qualified original freeze observation')
checks=obj(w+'/root-checks-first/terminal.json');check(checks['valid'] and checks['pinsUnchanged'] and len(checks['commands'])==10 and all(c['exitCode']==0 for c in checks['commands']),'Ten first native strict/build/syntax/unarmed gates');binding=obj(w+'/bindings.json');check(binding['readySha256']==aliases[w+'/ready.json']['sha256'] and aliases[w+'/bindings.json']['sha256']=='8bb28e766d07f2fd404b5f8cf8c522c712f8898bb8ce81513263f5fb636bd6ca','Root native bindings');manifests={}
for arm in ['baseline','candidate']:
 p=binding['arms'][arm];pin(p);m=obj(p['path']);manifests[arm]=m;check(m['arm']==arm and m['status']=='passed' and m['buildId']=='306258296' and m['readySha256']==binding['readySha256'],'Actual build binding');check(len(m['outputs'])==len({p['path'] for p in m['outputs']})==10,'Ten outputs per arm');check(m['additiveEntry']==ready['entryVirtual'][arm],'Identical default entry manifest')
 for p in m['outputs']:pin({**p,'path':m['outputRoot']+'/'+p['path']})
 check(any(p['realm']=='worker' and p['path']==original_path and p['virtualSha256']==ready['entryVirtual'][arm]['sha256'] for p in m['loads']),'Actual worker getter entry consumed')
 check(m['runtimeVirtual']==([] if arm=='baseline' else runtime),'Exactly declared runtime overlays')
 if arm=='candidate':
  for p in runtime:check(any(q['realm']=='worker' and q['path']==p['path'] and q['virtualSha256']==p['sha256'] for q in m['loads']),'Actual two worker overlays consumed')
driver=obj(w+'/native-first.native-driver.json');report=obj(w+'/native-first/report.json');check(driver['valid'] and driver['exitCode']==0 and driver['elapsedSeconds']<=720 and driver['independentClosureValid'],'First native outer bounds/closure');check([p['port'] for p in driver['independentClosure']]==[4266,9676,4267,9677,4268,9678,4269,9679,4200] and all(p['closed'] is True and p['reason']=='ECONNREFUSED' for p in driver['independentClosure']),'All nine actual TCP receipts');check(report['valid'] and not report['incomplete'] and [p['id'] for p in report['arms']]==['AB-baseline','AB-candidate','BA-candidate','BA-baseline'],'First fixed native orders')
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
  i=witnessrow['identity'];child=i['currentChild'];attached=i['autoattachedChild'];context=i['workerContext'];frame=i['frameTree']['frameTree']['frame'];value=witnessrow['value'];check(i['insideHref']==child['url']==attached['targetInfo']['url']==value['insideHref']==worker,'Actual exact worker href');check(i['workerSession']==attached['sessionId'] and context['uniqueId'] and attached['waitingForDebugger'] is False,'Attached live worker/context');check(frame['id']==child['parentFrameId']==attached['targetInfo']['parentFrameId']==i['pageContext']['auxData']['frameId'],'Parent frame relation');check(child.get('browserContextId')==i['parent'].get('browserContextId')==attached['targetInfo'].get('browserContextId'),'Browser context relation');check(value['cells']==116000 and value['selectedSoloRunner'] and value['devicePresent'] and value['deviceDisposed'] is False,'Real selected GPU owner');check(value['primaryOwnerExists'] is False and value['threeIndependentBuffers'] is True and value['primaryViewsMatch'] is False and value['primaryOwnerIsDevice'] is False,'Both default independent F64 owners')
  for key in ['h','qx','qz']:
   p=value[key];check(p['constructor']=='Float64Array' and p['length']==116000 and p['byteLength']==928000 and p['byteOffset']==0 and p['backingBytes']==928000,'Actual default F64 plane '+key)
  check(value['primaryBlock'] is None and value['storageVersion'] is None and value['primaryBlockIsUpload'] is False and value['threeViewsShareBlock'] is False,'No F32 experiment/owner both arms')
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
attr=obj(M['nativeAttribution']['path']);check(attr['executionValid'] and not attr['candidateAdopted'] and not attr['qualityEligible'] and not attr['nativeQualityExecuted'],'Honest native rejection/no quality execution');check(attr['nativeReport']==M['nativeReport'],'Root exact native report pin');check([r['id'] for r in attr['arms']]==[r['id'] for r in report['arms']],'Root first arm order')
for row,arm in zip(attr['arms'],report['arms']):
 fps=obj(row['originalFpsPin']['path']);result=fps['results'][0];check(row['originalFpsPin']==arm['fps'],'Root original raw FPS pin');check(row['renderedFps']==result['renderedFps'] and row['physicsStepsPerWallSecond']==result['physicsStepsPerWallSecond'] and row['totalP50']==result['pipelineMsP50']['total'] and row['totalP95']==result['pipelineMsP95']['total'] and row['renderP95']==result['renderedFrameMsP95'] and row['renderP99']==result['renderedFrameMsP99'],'Root row consistent with raw arithmetic');check(row['machinePower']==fps['machine']['power']=='AC power' and row['samplePower']==result['power'] and result['power'].startswith('AC ') and fps['browser']['refreshHz']==120,'Observed AC120Hz context');check(row['samplingQueries']==0 and row['bothDefaultIndependentF64'],'No sample storage queries; default F64');check(row['lastComplete88Bin']==next(b for b in result['simulationTimeline'] if b['from']==88),'Original late88-bin retained exactly');check(row['commandTerminal']==arm['terminal'] and row['commandElapsedSeconds']==arm['elapsedSeconds'] and row['cleanupElapsedSeconds']==arm['cleanupElapsedSeconds'],'Root actual terminal/bounds')
check(attr['firstOutputObservation']['all20OutputPinsMatched'] and attr['firstOutputObservation']['bothIdenticalGetterEntrySha256']==ready['entryVirtual']['baseline']['sha256'] and attr['firstOutputObservation']['originalAdvanceExport']=='t' and 'not a retained independent raw command transcript'in attr['firstOutputObservation']['qualification'],'Qualified original output observation')
rows=attr['arms'];check(rows[1]['totalP50']>rows[0]['totalP50'] and rows[2]['totalP50']>rows[3]['totalP50'] and rows[1]['renderP95']>rows[0]['renderP95'] and rows[2]['renderP95']>rows[3]['renderP95'],'Candidate pipeline/render p95 worse in both original orders');check(rows[1]['physicsStepsPerWallSecond']<rows[0]['physicsStepsPerWallSecond'] and rows[2]['physicsStepsPerWallSecond']>rows[3]['physicsStepsPerWallSecond'],'Physics-rate effect changes sign by order')
outcome=json.loads((A/'outcome.json').read_text());check(not outcome['runtimeAdopted'] and not outcome['nativeQualityExecuted'] and not outcome['qualityEligible'] and not outcome['timingRetryPerformed'],'No adoption/quality/timing retry');near(outcome['cpu']['meanSavingPerStepMs'],mean,'Outcome mock mean');near(outcome['cpu']['heuristicLower95Ms'],lower,'Outcome mock lower');check(outcome['native']['fourRenderedFps']==[r['renderedFps'] for r in rows] and outcome['native']['physicsStepsPerWallSecond']==[r['physicsStepsPerWallSecond'] for r in rows] and outcome['native']['totalP50']==[r['totalP50'] for r in rows] and outcome['native']['renderP95']==[r['renderP95'] for r in rows],'Outcome native observations');check(M['unfrozenQuality']['retained'] is False and M['unfrozenQuality']['frozen'] is False and M['unfrozenQuality']['executed'] is False and M['unfrozenQuality']['eligibility'] is False,'Unfrozen unexecuted quality excluded')
print(json.dumps({'status':'passed','counts':M['counts'],'physicalPinClosures':physical,'virtualIdentityMetadata':virtual,'relativeOutputRecordsSeparatelyBound':relative,'immutableGitBlobChecks':git_checked,'gitAuthorityNotReadWithoutFlag':not args.git,'costArithmetic':{'meanMsPerStep':mean,'heuristicLower95Ms':lower,'sampleVariance':variance,'pairs':32,'positivePairs':sum(v>0 for v in weights),'contactSlicesFirstThree':[19,13,12],'remainingMeasuredPairContactSlices':0},'nativeRawArithmetic':raw_summary,'historicalAncestryQualification':M['historicalAncestryQualification'],'scope':'Retained identities and original raw callback/publication/bin/pipeline/cost/closure arithmetic plus optional immutable Git only. No game/helper imports, replay, benchmark/build/native retry, consistent FPS gain, stable60 physics, moving quality or runtime adoption claim.'},indent=2))
