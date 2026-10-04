#!/usr/bin/env python3
"""Preservation/patch verifier only: no archived code execution, simulation, build or resource use."""
from pathlib import Path
import argparse,base64,gzip,hashlib,json,re,struct
HERE=Path(__file__).resolve().parent

def fingerprint(b):return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def demand(c,m):
 if not c:raise AssertionError(m)
def decode(item):
 p=(HERE/item['path']).resolve();allowed=[HERE,HERE.parent/'parallel-physical-native',HERE.parent/'shared-sheet']
 demand(any(p.is_relative_to(x) for x in allowed),'Unexpected archive payload path')
 b=p.read_bytes();demand(fingerprint(b)==item['transport'],'Transport mismatch: '+item['path'])
 raw=gzip.decompress(b) if item['encoding']=='gzip' else b;demand(fingerprint(raw)==item['decoded'],'Decoded mismatch: '+item['path']);return raw

def patch_files(patch):
 lines=patch.splitlines(keepends=True);i=0;out=[]
 while i<len(lines):
  if not lines[i].startswith(b'--- '):i+=1;continue
  old=lines[i][4:].split(b'\t')[0].strip().decode();i+=1;demand(i<len(lines) and lines[i].startswith(b'+++ '),'Missing patch destination');new=lines[i][4:].split(b'\t')[0].strip().decode();i+=1;hunks=[]
  while i<len(lines) and not lines[i].startswith(b'--- '):
   match=re.match(rb'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@',lines[i])
   if not match:i+=1;continue
   os,oc,ns,nc=int(match[1]),int(match[2] or b'1'),int(match[3]),int(match[4] or b'1');i+=1;body=[];oldcount=newcount=0
   while oldcount<oc or newcount<nc:
    demand(i<len(lines),'Truncated patch hunk');line=lines[i];i+=1;demand(line[:1] in {b' ',b'+',b'-'},'Invalid patch hunk line');oldcount+=line[:1]!=b'+';newcount+=line[:1]!=b'-';body.append(line)
    if i<len(lines) and lines[i].startswith(b'\\ No newline'):body[-1]=body[-1].removesuffix(b'\n');i+=1
   demand(oldcount==oc and newcount==nc,'Patch hunk count mismatch');hunks.append((os,oc,ns,nc,body))
  out.append((old,new,hunks))
 demand(out,'No patch files');return out
def apply_exact(before,hunks):
 lines=before.splitlines(keepends=True);cursor=0;out=[]
 for os,oc,ns,nc,body in hunks:
  start=os-1 if os else 0;demand(start>=cursor,'Unordered patch');out.extend(lines[cursor:start]);cursor=start;demand(len(out)==(ns-1 if ns else 0),'Patch destination line mismatch')
  for line in body:
   if line[:1] in {b' ',b'-'}:demand(cursor<len(lines) and lines[cursor]==line[1:],'Exact patch context mismatch; no fuzz');cursor+=1
   if line[:1] in {b' ',b'+'}:out.append(line[1:])
 out.extend(lines[cursor:]);return b''.join(out)
def rel(pin):return pin.get('path') or pin['file'].split('/source/',1)[-1]
def assert_pin_bytes(pin,b,message):demand(fingerprint(b)=={'bytes':pin['bytes'],'sha256':pin['sha256']},message)
def snapshot_verify(s,stub):
 demand(s['schema']=='bounded-C-complete-drawn-loft-words/v1' and s['available'] is True,'Complete snapshot schema')
 demand(all(s[k]==stub[k] for k in ['schema','label','epoch','counts','rawBytes']),'Snapshot metadata/epoch mismatch')
 demand(s['unusedCapacityIncluded'] is False and s['arrayIdentitiesAndWordsUnchanged'] is True and all(s['nonmutation'].values()),'Snapshot nonmutation/capacity gate')
 ns,nv,ni=[s['counts'][k] for k in ['slices','vertices','indices']];demand(ns<=300 and nv==134*ns and ni<=240000 and ni%3==0,'Active loft counts')
 sizes={'Float32Array':4,'Float64Array':8,'Int32Array':4,'Uint32Array':4,'Uint8Array':1,'Int8Array':1,'Uint16Array':2};multipliers={'positions':3,'normals':3,'mask':1,'lift':1,'sheet':1,'sheetWeight':1,'sheetBack':1,'throat':4};rawtotal=0
 demand(len(s['arrays'])==37,'Public complete snapshot37-array inventory')
 for k,a in s['arrays'].items():
  expected=ni if k=='indices' else nv*multipliers[k] if k in multipliers else ns if k.startswith('slice') else None
  demand(a['count']==expected and a['byteLength']==expected*sizes[a['dtype']] and isinstance(a['littleEndian'],bool) and a['encoding']=='base64-exact-active-typed-array-words','Typed active descriptor differs: '+k)
  b=base64.b64decode(a['data'],validate=True);demand(len(b)==a['byteLength'],'Typed decoded byte count differs');rawtotal+=len(b)
  demand({x:a[x] for x in ['dtype','littleEndian','count','byteLength','encoding']}==stub['arrayManifest'][k],'Typed stub differs')
  if k=='indices':
   demand(a['dtype']=='Uint32Array','Index dtype differs');demand(all(i[0]<nv for i in struct.iter_unpack('<I' if a['littleEndian'] else '>I',b)),'Index outside active words')
 demand(rawtotal==s['rawBytes'] and rawtotal<=4*1024*1024,'Decoded raw snapshot bound')
 return rawtotal

def main():
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--originals',action='store_true');args=ap.parse_args();mb=(HERE/'manifest.json').read_bytes();m=json.loads(mb);items=m['files']+m['externalFiles'];d={x['path']:decode(x) for x in items};original_map={x['originalPath']:x for x in items if x.get('originalPath')}
 expected={x['path'] for x in m['files']}|{'manifest.json','verification.json'};actual={str(p.relative_to(HERE)) for p in HERE.rglob('*') if p.is_file()};demand(actual==expected or actual==expected-{'verification.json'},'Unmanifested/missing archive file')
 def obj(p):return json.loads(d[p])
 def origin(path):
  candidates=[x for x in items if x.get('originalPath')==path or path in x.get('additionalOriginalPaths',[])];demand(len(candidates)==1,'Original payload map unavailable: '+path);return d[candidates[0]['path']]
 patchcount=0
 for group in m['patches']:
  parsed=patch_files(d[group['patch']]);demand(len(parsed)==len(group['files']),'Patch inventory mismatch')
  for (old,new,hunks),f in zip(parsed,group['files']):
   demand(new.removeprefix('b/')==f['path'] and (old=='/dev/null')==(f['before'] is None),'Patch path/preimage mismatch');before=d[f['before']['path']] if f['before'] else b'';demand(apply_exact(before,hunks)==d[f['after']['path']],'Patched postimage differs: '+f['path']);patchcount+=1
 C='/private/tmp/tube-bounded-c-carrier-support-20261004';N='/private/tmp/tube-bounded-c-carrier-support-native-20261004'
 source=json.loads(origin(C+'/readiness.json'));parent=json.loads(d[m['parentReadiness']['path']]);build=json.loads(origin(N+'/root-complete-build-result.json'));seal=json.loads(origin(N+'/seal.json'));ready=json.loads(origin(N+'/readiness.json'));helpers=json.loads(origin(N+'/helper-pins.json'));owner=obj('native/candidate-first-owner.json');report=obj('native/capture/report.json.gz')
 demand(source['complete'] and len(source['sourcePins'])==582 and len(parent['sourcePins'])==580,'Source preparation inventories');demand(source['validation']['focusedTestsPassed']==97 and source['validation']['strictTSExitCode']==0 and source['validation']['newCarrierTests']==9,'Recorded source validation differs')
 pp={rel(x):x for x in source['sourcePins']};bp={rel(x):x for x in build['sourcePins']};excluded=sorted(pp.keys()-bp.keys());demand(len(bp)==581 and excluded==['docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json'] and not bp.keys()-pp.keys(),'Root581/exclusion inventory');demand(all(pp[k]['bytes']==bp[k]['bytes'] and pp[k]['sha256']==bp[k]['sha256'] for k in bp),'Preparation/build shared inputs differ')
 demand(build['terminal'] and build['exitCode']==0 and build['sourceUnchangedAfterBuild'],'Recorded build finality');demand(len(build['builtAssetPins'])==21 and len(build['frozenAssetPins'])==49 and len(build['assetPins'])==49,'Asset counts');demand(build['staticComposition']['additionalStaticAssets']==28 and build['staticComposition']['identicalOverlap']==2,'Asset composition')
 demand(len(helpers)==42 and helpers==ready['helperPins'] and len(seal['helperPins'])==44,'42helpers/44seal inventory')
 for p in helpers:assert_pin_bytes(p,origin(p['file']),'Archived helper/source reference differs')
 demand(owner['complete'] is True and owner['exitCode']==0 and owner['firstFailure'] is None and owner['independentClosureValid'] is True and owner['protectedPortsPreserved'] is True and owner['sourceBuildHelpersPostUnchanged'] is True,'Recorded terminal owner failed')
 demand(owner['sealSha256']==fingerprint(origin(N+'/seal.json'))['sha256'],'Owner seal differs');demand(owner['protectedStatesInitially']==owner['protectedStatesFinally']=={'4310':True,'4311':True,'4312':False} and not owner['remainingOwnedPids'] and all(owner['closedPorts'].values()),'Recorded resource closure differs')
 demand(report['complete'] is True and report['firstFailure'] is None and report['stop']['movingStep']==68 and report['stop']['reason']=='loft-join-absent','Native capture finality');demand(len(report['observations'])==69 and report['video']['physicsAdvances']==68 and report['video']['requestCount']==69 and abs(report['video']['physicalSeconds']-68/60)<1e-10 and report['firstObservedPhase2']['movingStep']==47,'Actual chronology')
 demand(len(report['artifacts'])==5 and len(report['checkpoints'])==4,'Native media inventory');pngbytes=0
 for f in report['artifacts']:
  b=d['native/capture/'+f['file']];assert_pin_bytes(f,b,'Media pin differs')
  if f['file'].endswith('.png'):demand(b[:8]==b'\x89PNG\r\n\x1a\n','PNG signature');pngbytes+=len(b)
  else:demand(b[:4]==b'\x1aE\xdf\xa3' and len(b)<=16*1024*1024,'Movie EBML/16MiB cap')
 demand(pngbytes<=48*1024*1024 and len(d['native/capture/report.json.gz'])==9452886 and len(d['native/capture/report.json.gz'])<=32*1024*1024,'Media/report caps')
 demand(len(report['loftSnapshots'])==2 and {q['label'] for q in report['loftSnapshots']}=={'initial','first-phase2'},'Snapshot inventory');snapshotbytes=rawtotal=0
 for f in report['loftSnapshots']:
  b=d['native/capture/'+f['file']+'.gz'];assert_pin_bytes(f,b,'Snapshot original byte pin differs');demand(len(b)<=6*1024*1024,'Snapshot6MiB bound');snapshotbytes+=len(b);rawtotal+=snapshot_verify(json.loads(b),f)
 demand(snapshotbytes<=12*1024*1024,'Two snapshot12MiB bound')
 review=obj('reviews/native-evidence/analysis.json.gz');demand(review['complete'] and review['readOnly'] and review['checkCount']==54 and len(review['checks'])==54 and all(x['pass'] for x in review['checks']),'Recorded54check independent review')
 video=obj('reviews/video/receipt.json');probe=obj('reviews/video/ffprobe.json');demand(video['actualEncodedFrames']==69 and video['selectedIndices']==[0,17,34,51,68] and int(probe['streams'][0]['nb_read_frames'])==69,'Recorded encoded69 movie evidence');assert_pin_bytes(video['input'],d['native/capture/moving-C.webm'],'Decoded movie original differs');demand(len(m['omitted'])==5 and all(x['originalPath'].endswith('.png') for x in m['omitted']),'Five omitted decoded PNG mappings')
 geometry=obj('reviews/geometry/actual/analysis.json.gz');demand(geometry['inputPreservationRechecked'] and len(geometry['snapshots'])==2 and len(geometry['outputPlots'])==22 and all(s['normalVerification']['f32WordDifferencesFromSourceReconstruction']==0 and s['indexVerification']['exactSourceCIndexSequence'] for s in geometry['snapshots']),'Recorded exact geometry analysis');demand(all(geometry['initialExteriorSightline']['exactComparison'].values()),'Recorded exterior exact reconstruction')
 screen=obj('reviews/screen-ray/report.json.gz');demand(len(screen['results'])==3 and len(screen['pins']['sourceVerifiedAgainstCaptureSeal'])==13 and len(screen['pins']['helpersVerifiedAgainstHelperPins'])==2 and not any(screen['claims'].values()),'Recorded final three-ray analysis boundaries')
 demand(fingerprint(d['reviews/screen-ray/report.json.gz'])=={'bytes':109713,'sha256':'68b07164a2a68d1bf5521b806cbac6b9fe86184f7ef83eeedf81609be2f675e4'},'Final screen-ray outcome differs')
 stress=obj('reviews/release-stress/outcome.json');demand(stress['complete'] and stress['actualTrials']==5 and stress['contractGateFailures']==0 and stress['strictTSExitCode']==0 and stress['testsPassed']==5,'Recorded bounded release stress')
 demand(m['acceptance']=={'tubeQuality':False,'mouth':False,'airCorridor':False,'bodyPassage':False,'FPS':False,'productionAdoption':False} and m['fullSourceDependenciesOrBuildReconstructionClaim'] is False,'Acceptance/reconstruction boundaries')
 originalcount=pingroups=0
 if args.originals:
  for path,pin in m['originalIntegrityInputs'].items():demand(fingerprint(Path(path).read_bytes())==pin,'Original changed: '+path);originalcount+=1
  for root,pins in [(source['sourceRoot'],source['sourcePins']),(source['parentSource'],parent['sourcePins'])]:
   for p in pins:assert_pin_bytes(p,(Path(root)/rel(p)).read_bytes(),'Original fullsource pin differs');pingroups+=1
  for pins in [build['sourcePins'],build['assetPins'],build['frozenAssetPins'],build['builtAssetPins'],seal['helperPins']]:
   for p in pins:assert_pin_bytes(p,Path(p['file']).read_bytes(),'Original source/build/helper pin differs');pingroups+=1
 print(json.dumps({'schema':'geometric-carrier-native-archive-verification/v1','passed':True,'manifestSha256':fingerprint(mb)['sha256'],'payloadFiles':len(m['files']),'externalReferences':len(m['externalFiles']),'transportBytes':sum(x['transport']['bytes'] for x in m['files']),'decodedBytes':sum(x['decoded']['bytes'] for x in m['files']),'exactPatchSets':len(m['patches']),'exactPatchedFileChecks':patchcount,'candidateSourcePins':582,'rootBuildSourcePins':581,'completeAssets':49,'helperManifestPins':42,'rootSealHelperPins':44,'nativeMedia':5,'fullLoftSnapshots':2,'snapshotJSONBytes':snapshotbytes,'snapshotRawWordBytes':rawtotal,'encodedFramesRecorded':69,'independentNativeChecksRecorded':54,'decodedPNGsOmitted':5,'originalPathsRehashed':originalcount,'optionalOriginalSourceBuildHelperChecks':pingroups,'noSourceModelBuildNativeTestsOrResourcesRun':True,'fullSourceDependenciesOrBuildReconstructionClaim':False,'adoptionAcceptance':False},indent=2))
if __name__=='__main__':main()
