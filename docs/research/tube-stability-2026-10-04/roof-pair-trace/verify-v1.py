#!/usr/bin/env python3
"""Retained byte and arithmetic integrity only. No reconstruction or native execution."""
import gzip,hashlib,json,pathlib,struct,sys,time,traceback
ROOT=pathlib.Path(__file__).resolve().parent;REPO=ROOT.parents[3];began=time.monotonic();checks=[]
result={'schema':'roof-pair-trace-archive-verification/v1','valid':False,'checks':checks,'scope':'Verify retained local/shared bytes, first failures/root terminals, F32 schedule words, raw pair deltaY and stored arithmetic decompositions only. Core reconstruction match is an original report assertion tied to retained source/run receipt, not independently rerun. No game/helper/compiler import, simulation, native/raster/video quality or adoption pass.'}
def need(v,msg):
 if not v:raise AssertionError(msg)
def h(b):return hashlib.sha256(b).hexdigest()
def done(name,**kw):checks.append({'check':name,'valid':True,**kw})
def fword(x):return struct.pack('<f',x)
def near(a,b):return abs(a-b)<=1e-9
try:
 m=json.loads((ROOT/'manifest.json').read_text());out=json.loads((ROOT/'outcome.json').read_text());blobs={}
 for p in m['payloads']:
  target=(ROOT/p['storedPath']) if p['storage']=='local' else (REPO/p['storedPath'])
  need(p['storage'] in ('local','shared-durable') and target.resolve().is_relative_to(REPO),'Stored path outside repository')
  stored=target.read_bytes();need(len(stored)==p['storedBytes'] and h(stored)==p['storedSha256'],'Stored byte/hash mismatch')
  need(p['encoding'] in ('identity','gzip'),'Unknown encoding')
  if p['encoding']=='gzip':
   with gzip.open(target,'rb') as f:b=f.read(8388609)
   need(len(b)<=8388608,'Decoded archive body exceeds8MiB')
  else:b=stored
  need(len(b)==p['bytes'] and h(b)==p['sha256'] and p['id'] not in blobs,'Original payload identity/unique id differs');blobs[p['id']]=b
 bypath={};labels={}
 for a in m['aliases']:
  need(a['label'] not in labels and a['payload'] in blobs,'Invalid byte alias');b=blobs[a['payload']]
  need(len(b)==a['bytes'] and h(b)==a['sha256'],'Alias original identity differs')
  labels[a['label']]=b
  if a['originalPath'] in bypath:need(bypath[a['originalPath']]==b,'Original-path alias differs')
  bypath[a['originalPath']]=b
 for p in m['plainSources']:
  b=(ROOT/p['path']).read_bytes();need(len(b)==p['bytes'] and h(b)==p['sha256'],'Archive recipe/verifier source differs')
 counts=m['counts'];need(counts['payloads']==len(blobs) and counts['aliases']==len(labels) and counts['selectedOriginalSources']==9,'Manifest counts differ')
 need(counts['localPayloads']==sum(p['storage']=='local' for p in m['payloads']) and counts['sharedDurablePayloads']==sum(p['storage']=='shared-durable' for p in m['payloads']),'Shared/local counts differ')
 read=lambda label:json.loads(labels[label])
 a,b=read('trace-v1/report.json'),read('trace-v2/report.json');r1,r2=read('root-v1/receipt.json'),read('root-v2/receipt.json')
 need(h(labels['trace-v2/report.json'])==m['traceV2ReportSha256']=='7c05e4ed03f7e4c8a19b780de2497d4475406627b4974a5c7d06452ce817706d','Original V2 trace report differs')
 def pin(p):
  original=bypath.get(p['path']);need(original is not None and len(original)==p['bytes'] and h(original)==p['sha256'],'Required selected pin unresolved: '+p['path']);return original
 for p in a['inputPins']+b['inputPins']:pin(p)
 for authority in b['sourceAuthorities']:
  need((authority['originalPin']['bytes'],authority['originalPin']['sha256'])==(authority['immutableCopy']['bytes'],authority['immutableCopy']['sha256']),'Historical original source identity differs');pin(authority['immutableCopy']);pin(authority['originalPin'])
 observation=read('root-v2/current-source-observation.json')
 need(observation['valid'] is True and observation['runtimeChanges'] is False and observation['tubeQualityPass'] is False and len(observation['files'])==9,'Read-only current-source receipt scope differs')
 for source in observation['files']:
  need(source['equalsFrozenOriginal'] is True,'Current-source equality observation failed');pin(source)
 need(m['selectedImmutableOriginalSources']==b['sourceAuthorities'] and len(b['sourceAuthorities'])==9,'Consumed nine-source closure differs')
 for r in (r1,r2):
  for p in r['helpers']+r['authorityMetadata']:pin(p)
  need(r['nativeJobs'] is False and r['tubeQualityPass'] is False,'Root gate incorrectly native/quality-labeled')
  for c in r['commands']:pin(c['log']);need(c['processGroupClosed'] is True,'Original trace command group not closed')
 need(r1['valid'] is False and r1['commands'][0]['exitCode']==0 and r1['commands'][1]['exitCode']==1,'First failed root trace terminal changed')
 need(a['traceCompleted'] is False and a['rows']==[] and 'Cannot find module' in a['firstFailure'] and 'esbuild' in a['firstFailure'],'First missing-esbuild failure not preserved')
 need(b['priorTraceFirstFailure']['firstFailure']==a['firstFailure'] and b['priorTraceFirstFailure']['rowsCalculated']==0,'V1 failure lineage changed')
 pin(b['priorTraceFirstFailure']['report']);pin(b['priorTraceFirstFailure']['rootReceipt']);pin(b['priorTraceFirstFailure']['rootLog']);pin(b['priorTraceFirstFailure']['rootSyntaxLog'])
 need(r2['valid'] is True and all(c['exitCode']==0 for c in r2['commands']) and r2['elapsedSeconds']<=30,'First successful V2 root trace terminal changed');pin(r2['report'])
 need(b['traceCompleted'] is True and b['firstFailure'] is None and all(b[k] is True for k in ('inputsUnchangedBefore','inputsUnchangedAfter','arraysUnchangedAfter')),'V2 trace result differs')
 for report in (a,b):
  need(all(report[k] is False for k in ('nativeCaptureComplete','nineStateQuality','adoption','tubeQuality','fpsGate','geometryRepaired','visibleArtifactReproduced','exactFragmentCauseAttributed','finCauseProved','directOriginalF64QueryObservation')),'Trace assertions promoted beyond source reconstruction')
 done('retained-byte-aliases-nine-original-sources-and-both-first-trace-terminals',payloads=len(blobs),aliases=len(labels),originalSources=9,firstV1Failure=a['firstFailure'],firstV2ElapsedSeconds=r2['elapsedSeconds'])

 native=json.loads(pin(b['originalFailure']['report']));driver=json.loads(pin(b['originalFailure']['driver']));pin(b['originalFailure']['ready']);binding=json.loads(pin(b['originalFailure']['bindings']))
 need(native['valid'] is False and native['incomplete'] is True and native['firstFailure']==b['originalFailure']['firstFailure'],'Original partial native failure changed')
 need(native['capture']['failure']==b['originalFailure']['captureFailure']=='Error: 96MiB retained numerical/typed payload exceeded','Original raw-cap failure changed')
 need(driver['valid'] is False and driver['exitCode']==1 and driver['independentClosureValid'] is True,'Original failed native/independent closure lineage changed')
 frame=native['capture']['frames'][5];need(frame['index']==5 and frame['targetSeconds']==25 and frame['status']['seaTime']==b['context']['seaTime'] and frame['config']==b['context']['config'] and frame['camera']==b['context']['camera'],'Fixed target25 context differs')
 need(b['context']['pixelsReadOrModified'] is False and m['pngPayloadsRetained'] is False and m['fullRuntimeReplayClosure'] is False and m['allNativePayloadsRetained'] is False,'Omitted runtime/image scope differs')
 original_fields={f['label']:f for f in native['capture']['fields']}
 typed_paths=[p for p in b['inputPins'] if '/fields/' in p['path']];need(sum(p['bytes'] for p in typed_paths)==b['typedUniqueBytes']==1226096 and len(typed_paths)==counts['selectedTypedPaths'],'Reported selected unique-path typed bytes differ')
 def field(name):return pin(original_fields['state-5/'+name]['file'])
 positions=field('loft-positions');mesh=field('mesh-position');need(positions==mesh,'Actual loft/mesh-position byte alias differs')
 fronts=field('loft-sliceFront');sigmas=field('loft-sliceSigma');taus=field('loft-sliceTau')
 schedule=b['schedule'];need(schedule['emittedRows']==148 and schedule['allFrontSigmaTauF32WordsMatch'] is True and len(schedule['emittedF64Sequence'])==148,'Reported whole schedule differs')
 for index,front,sigma,tau in schedule['emittedF64Sequence']:
  need(index in range(148) and struct.unpack_from('<i',fronts,index*4)[0]==front and sigmas[index*4:index*4+4]==fword(sigma) and taus[index*4:index*4+4]==fword(tau),'Reported F64 schedule does not round to retained F32 words')
 need([r[0] for r in schedule['emittedF64Sequence']]==list(range(148)),'Schedule row coverage differs')
 need([r['row'] for r in b['rows']]==[126,127] and all(r['corePointsChecked']==57 and r['wholeCoreProfileYWordsMatch'] is True for r in b['rows']),'Original per-row core check assertions differ')
 stride=frame['loft']['vertexCount']//148;need(stride==134,'Original stored profile stride differs')
 y=lambda row,point:struct.unpack_from('<f',positions,((row*stride+point)*3+1)*4)[0]
 points=b['comparison']['points'];need([p['point'] for p in points]==list(range(32,89)),'All57 core comparison points not retained')
 for p in points:
  need(near(y(127,p['point'])-y(126,p['point']),p['actualDeltaXY'][1]),'Actual raw core pair deltaY differs')
  for coord in (0,1):
   need(near(p['phaseThenSize']['phaseDeltaXY'][coord]+p['phaseThenSize']['sizeDeltaXY'][coord],p['actualDeltaXY'][coord]),'Phase-then-size stored arithmetic does not sum')
   need(near(p['sizeThenPhase']['sizeDeltaXY'][coord]+p['sizeThenPhase']['phaseDeltaXY'][coord],p['actualDeltaXY'][coord]),'Size-then-phase stored arithmetic does not sum')
 for row in b['rows']:
  index=row['row'];seq=schedule['emittedF64Sequence'][index]
  need(row['sigma']==seq[2] and row['query']['seconds']==seq[3] and row['query']['footDepth']==7 and row['scale']==7,'Fixed reconstructed query scalar differs')
  for c in row['sourceContributions']:
   point=c['point'];start=(index*stride+point)*3*4;xyz=struct.unpack_from('<fff',positions,start)
   need(list(xyz)==c['originalXYZ'],'Original detailed contribution position differs')
   need([positions[start+k*4:start+k*4+4][::-1].hex() for k in range(3)]==c['originalWords'],'Original detailed contribution words differ')
   need([fword(value)[::-1].hex() for value in c['profileXY']]==c['profileWords'] and fword(c['profileXY'][1])==positions[start+4:start+8],'Stored detailed source profile Y/words differs')
 for i,case in enumerate(b['libraryCases']):
  body=pin(case['input']);source=original_fields['start/case-'+str(i)]['file'];need((len(body),h(body))==(source['bytes'],source['sha256']),'Consumed original case byte identity differs')
  compiled=next(x for x in binding['compiledFiles'] if x['relativePath']==case['asset']);need((len(body),h(body))==(compiled['bytes'],compiled['sha256']),'Original case/dist authority identity differs')
 need(out['selectedScalarDecompositions']==[p for p in points if p['point'] in (83,86)] and out['sourcePrototypeImplemented'] is False and out['reportedAllCoreYWordsMatch']==[True,True] and out['emittedRows']==148,'Derived scalar outcome differs')
 done('original-native-failure-selected-cases-148-F32-schedule-words-and-57-raw-pair-deltas',scheduleRows=148,rawCorePairDeltas=57,reportedCoreChecksPerRow=57,profileStride=134,selectedTypedPathBytes=b['typedUniqueBytes'],reportedMatchScope='Original reconstruction assertions preserved; not rerun')
 need(sum(p.stat().st_size for p in ROOT.rglob('*') if p.is_file())<=16777216,'16MiB local archive cap exceeded')
 result.update(valid=True,retainedSelectedEvidenceIntegrity=True,localArchiveBytesAtVerification=sum(p.stat().st_size for p in ROOT.rglob('*') if p.is_file()),nativeCaptureComplete=False,nineStateQuality=False,tubeQuality=False,adoption=False,finCauseProved=False,sourcePrototypeImplemented=False)
except BaseException as error:result['firstFailure']=type(error).__name__+': '+str(error);result['traceback']=traceback.format_exc()[-8192:]
result['elapsedSeconds']=time.monotonic()-began
body=(json.dumps(result,indent=2)+'\n').encode();need(len(body)<=131072,'Result exceeds128KiB')
if len(sys.argv)>1:
 with pathlib.Path(sys.argv[1]).open('xb') as f:f.write(body)
print(body.decode(),end='');sys.exit(0 if result['valid'] else 1)
