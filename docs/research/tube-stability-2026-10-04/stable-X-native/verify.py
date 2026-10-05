#!/usr/bin/env python3
"""Preservation/patch verifier only: no archived code execution, simulation, build or resource use."""
from pathlib import Path
import argparse,base64,gzip,hashlib,json,re,struct
HERE=Path(__file__).resolve().parent

def fingerprint(b):return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def demand(c,m):
 if not c:raise AssertionError(m)
def decode(item):
 p=(HERE/item['path']).resolve();allowed=[HERE,HERE.parent/'geometric-carrier-native',HERE.parent/'parallel-physical-native',HERE.parent/'shared-sheet']
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
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--originals',action='store_true');args=ap.parse_args();mb=(HERE/'manifest.json').read_bytes();m=json.loads(mb)
 items=m['files']+m['externalFiles'];d={x['path']:decode(x) for x in items}
 assert_pin_bytes(m['parentArchiveManifest'],(HERE/m['parentArchiveManifestRelative']).read_bytes(),'Relative parent archive manifest changed')
 expected={x['path'] for x in m['files']}|{'manifest.json','verification.json'};actual={str(p.relative_to(HERE)) for p in HERE.rglob('*') if p.is_file()};demand(actual==expected or actual==expected-{'verification.json'},'Unmanifested/missing archive file')
 def obj(p):return json.loads(d[p])
 def origin(path):
  candidates=[x for x in items if x.get('originalPath')==path or path in x.get('additionalOriginalPaths',[])];demand(len(candidates)==1,'Original payload map unavailable: '+path);return d[candidates[0]['path']]
 C=m['sourceRoot'];N=m['nativeRoot'];P=m['parentSourceRoot'];source=json.loads(origin(C+'/readiness.json'));sources=json.loads(origin(C+'/source-pins.json'));parent=json.loads(origin(C+'/parent-readiness.json'));build=json.loads(origin(N+'/root-complete-build-result.json'));seal=json.loads(origin(N+'/seal.json'));helpers=json.loads(origin(N+'/helper-pins.json'));ready=json.loads(origin(N+'/readiness.json'));owner=obj('native/candidate-first-owner.json');report=obj('native/capture/report.json.gz')
 demand(source['complete'] and source['frozen'] and source['sourceCount']==sources['count']==len(sources['pins'])==584 and len(source['payloadPins'])==30 and len(parent['sourcePins'])==582,'Recorded584/582/30source inventories')
 for pin in source['payloadPins']:assert_pin_bytes(pin,origin(C+'/'+pin['path']),'Readiness payload differs')
 demand(source['cpuValidation']['uniqueFocusedPassingTests']==101 and source['cpuValidation']['strictTypeScriptExitCode']==0 and source['cpuValidation']['fullSuiteRun'] is False,'Recorded source checks differ')
 demand(source['physicsHistoryAndLegacySealChanged'] is False and source['rawParity']['completeResultWordsMetadataControls'] is True,'Source physical/RAW boundary changed')
 initialfail=json.loads(origin(C+'/carrier-handoff-original-failure.json'));demand(bool(initialfail),'Initial inherited failure missing')
 pp={rel(p):p for p in sources['pins']};bp={rel(p):p for p in build['sourcePins']};excluded=sorted(pp.keys()-bp.keys());demand(len(bp)==583 and excluded==['docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json'] and not bp.keys()-pp.keys(),'Root583 source omission mismatch');demand(all(pp[k]['bytes']==bp[k]['bytes'] and pp[k]['sha256']==bp[k]['sha256'] for k in bp),'Preparation/build inputs differ')
 patchcount=0
 for group in m['patches']:
  parsed=patch_files(d[group['patch']]);demand(len(parsed)==len(group['files']),'Patch inventory mismatch')
  for (old,new,hunks),f in zip(parsed,group['files']):
   demand(new.removeprefix('b/')==f['path'] and (old=='/dev/null')==(f['before'] is None),'Patch path/preimage mismatch');before=d[f['before']['path']] if f['before'] else b'';after=d[f['after']['path']];demand(apply_exact(before,hunks)==after,'Exact patched postimage differs; no fuzz');assert_pin_bytes(pp[f['path']],after,'Touched postimage differs from584manifest');patchcount+=1
 demand(patchcount==5 and len(m['patches'])==2,'Exactly two runtime/three test files required')
 demand(build['schema']=='bounded-C-stable-X-root-complete-build/v1' and build['terminal'] is True and build['exitCode']==0 and build['sourceUnchangedAfterBuild'] is True,'Root build finality')
 demand(len(build['builtAssetPins'])==21 and len(build['assetPins'])==len(build['frozenAssetPins'])==49 and build['assetPins']==build['frozenAssetPins'],'49asset count')
 comp=build['staticComposition'];demand(comp['newBuildAssets']==21 and comp['additionalStaticAssets']==28 and comp['identicalOverlap']==2 and len(comp['references'])==28 and len(comp['overlap'])==2 and comp['sourceRuntimeCodeChanged'] is False and comp['rebuildPerformed'] is False,'Recorded asset composition differs')
 asset={str(Path(p['file']).relative_to(build['frozenDist'])):p for p in build['assetPins']}
 for r in comp['references']+comp['overlap']:
  q=r.get('frozenCopy',r.get('sameBuiltAsset'));demand(q==asset[r['relative']] and r['source']['bytes']==q['bytes'] and r['source']['sha256']==q['sha256'],'Static composition pin mismatch')
 partial=json.loads(origin(N+'/root-build-result.json'));assert_pin_bytes(build['rootPartialBuildResult'],origin(N+'/root-build-result.json'),'Partial build receipt changed');assert_pin_bytes(build['rootOriginalBuildResult'],origin(build['rootOriginalBuildResult']['file']),'Original build receipt changed');demand(partial['terminal'] and partial['exitCode']==0 and partial['sourcePins']==build['sourcePins'],'Partial/original finality/source mismatch')
 demand(len(helpers)==44 and helpers==ready['helperPins'] and len(seal['helperPins'])==46,'44helper/46seal inventories')
 for p in seal['helperPins']:assert_pin_bytes(p,origin(p['file']),'Sealed helper/preparation archive bytes differ')
 demand(owner['complete'] is True and owner['exitCode']==0 and owner['firstFailure'] is None and owner['sourceBuildHelpersPostUnchanged'] is True and owner['independentClosureValid'] is True and owner['protectedPortsPreserved'] is True,'Recorded native owner finality')
 demand(owner['sealSha256']==fingerprint(origin(N+'/seal.json'))['sha256'] and report['seal']==seal['arms']['candidate'],'Recorded sealed owner/report arm differs')
 demand(owner['protectedStatesInitially']==owner['protectedStatesFinally']=={'4310':True,'4311':True,'4312':False} and not owner['remainingOwnedPids'] and all(owner['closedPorts'].values()),'Recorded resource closure/protection mismatch')
 demand(report['complete'] is True and report['firstFailure'] is None and report['chromeClosed'] is True and report['stop']['reason']=='loft-join-absent' and report['stop']['movingStep']==67,'Recorded native capture finality')
 demand(len(report['observations'])==68 and len(report['videoRequests'])==68 and report['video']['physicsAdvances']==67 and report['video']['requestCount']==68 and abs(report['video']['physicalSeconds']-67/60)<1e-10 and report['firstObservedPhase2']['movingStep']==48 and report['selection']['locked']['stationX']==16.25,'Recorded native chronology')
 demand(len(report['artifacts'])==5 and len(report['checkpoints'])==4,'FourPNG/oneMovie inventory')
 pngbytes=0
 for p in report['artifacts']:
  b=d['native/capture/'+p['file']];assert_pin_bytes(p,b,'Native media differs')
  if p['file'].endswith('.png'):demand(b[:8]==b'\x89PNG\r\n\x1a\n' and len(b)<=12*1024*1024,'PNG header/cap');pngbytes+=len(b)
  else:demand(b[:4]==b'\x1aE\xdf\xa3' and len(b)<=16*1024*1024,'Movie EBML/cap')
 demand(pngbytes==report['pngBytes']<=48*1024*1024 and len(d['native/capture/report.json.gz'])==8731120 and len(d['native/capture/report.json.gz'])<=32*1024*1024,'Native caps/full report')
 demand(len(report['loftSnapshots'])==2 and {p['label'] for p in report['loftSnapshots']}=={'initial','first-phase2'},'Two full sidecars required');snapshotbytes=rawbytes=0
 for p in report['loftSnapshots']:
  b=d['native/capture/'+p['file']+'.gz'];assert_pin_bytes(p,b,'Native snapshot pin differs');demand(len(b)<=6*1024*1024,'6MiB snapshot bound');snapshotbytes+=len(b);rawbytes+=snapshot_verify(json.loads(b),p)
 demand(snapshotbytes==report['snapshotBytes']==3910204 and snapshotbytes<=12*1024*1024,'Two sidecar total')
 review=json.loads(origin('/private/tmp/tube-stable-x-native-evidence-review-20261005/analysis.json'))
 demand(review['complete'] and review['drawEpochAllValid'] and review['pinChecks']['reportArmEqualsSealedArm'] and review['pinChecks']['ownerSealPinMatches'] and all(not p['mismatches'] for p in review['pinChecks'].values() if isinstance(p,dict) and 'mismatches' in p),'Independent recorded native review differs')
 demand(review['selected']['stationX']==16.25 and review['timeline']['physicsAdvances']==67 and review['mouth']['externalEntranceClaims']==0 and review['mouth']['externalIndexedOccluded']==review['mouth']['shorewardIndexedOccluded']==56,'Native review scoped chronology/mouth')
 jump=review['fixedXConsecutiveJumps']['crest'][0];demand(jump['beforeStep']==59 and jump['afterStep']==60 and jump['delta'][1]==-0.21455711126327515,'Actual retained boundary crease differs');demand([p['firstRetainedRow']['crest'][0] for p in review['largestChangeRetirementAnchors']]==[14.5,15],'First-surviving-row seal anchors differ')
 demand(all(not review[k] for k in ['bodyEntryClaim','physicalGeometryEqualityClaim','fpsClaim']),'Native acceptance boundary changed')
 video=obj('reviews/video/receipt.json');probe=obj('reviews/video/ffprobe.json');failed=obj('reviews/video/failed-decode.json');pixels=obj('reviews/video/pixel-inspection.json')
 demand(video['complete'] and video['actualEncodedFrames']==68 and video['selectedEncodedIndices']==[0,17,34,50,67] and int(probe['streams'][0]['nb_read_frames'])==68,'Recorded68encoded-frame evidence')
 assert_pin_bytes(video['movie'],d['native/capture/moving-C.webm'],'Video receipt input differs');assert_pin_bytes(video['ffprobe'],d['reviews/video/ffprobe.json'],'Video probe receipt differs');assert_pin_bytes(video['priorFailedAttempt'],d['reviews/video/failed-decode.json'],'Original decode failure differs')
 demand(failed['complete'] is False and failed['exitCode']==1 and failed['framesWritten']==0 and failed['nativeCaptureChanged'] is False,'Failed decode not preserved')
 demand(pixels['complete'] and pixels['rootViewedAllFourOriginalPNGs'] and pixels['rootViewedEncodedIndices']==[0,17,34,50,67] and pixels['nativeVisualAdoption'] is False and pixels['rasterCausalityProven'] is False,'Recorded root visual boundary differs')
 demand(len(m['omitted'])==5 and [p['decoded'] for p in m['omitted']]==[{'bytes':p['bytes'],'sha256':p['sha256']} for p in video['decodedImages']],'Five omitted derivedPNG mappings')
 sourceReview=json.loads(origin('/private/tmp/tube-stable-x-source-review-20261005/pin-verification.json'));demand(sourceReview['noTestsBuildNativeOrGitRun'] is True,'Source review provenance')
 rider=json.loads(origin('/private/tmp/tube-carrier-rider-entry-audit-20261005/geometry.json'));demand(rider['schema'] and len(rider['normalInitialRiderLandmarks'])==7,'Rider-entry audit retained')
 demand(m['acceptance']=={'tubeQuality':False,'mouth':False,'airCorridor':False,'bodyPassage':False,'FPS':False,'productionAdoption':False} and m['fullSourceDependenciesOrBuildReconstructionClaim'] is False and m['laterAppearanceAttributionRiderOrRetirementWorkIncluded'] is False,'Archive scope/acceptance changed')
 originalcount=pingroups=0
 if args.originals:
  for path,p in m['originalIntegrityInputs'].items():demand(fingerprint(Path(path).read_bytes())==p,'Original mapped payload changed: '+path);originalcount+=1
  for root,pins in [(source['sourceRoot'],sources['pins']),(source['parentSource'],parent['sourcePins'])]:
   for p in pins:assert_pin_bytes(p,(Path(root)/rel(p)).read_bytes(),'Original fullsource pin differs');pingroups+=1
  for pins in [build['sourcePins'],build['assetPins'],build['frozenAssetPins'],build['builtAssetPins'],seal['helperPins']]:
   for p in pins:assert_pin_bytes(p,Path(p['file']).read_bytes(),'Original source/build/helper pin differs');pingroups+=1
 print(json.dumps({'schema':'stable-X-native-archive-verification/v1','passed':True,'manifestSha256':fingerprint(mb)['sha256'],'payloadFiles':len(m['files']),'externalReferences':len(m['externalFiles']),'transportBytes':sum(p['transport']['bytes'] for p in m['files']),'decodedBytes':sum(p['decoded']['bytes'] for p in m['files']),'exactPatchSets':2,'exactPatchedFileChecks':patchcount,'candidateSourcePins':584,'rootBuildSourcePins':583,'completeAssets':49,'helperManifestPins':44,'rootSealHelperPins':46,'recordedFocusedSourceTests':101,'nativeRootSession':71253,'nativeMedia':5,'fullLoftSnapshots':2,'snapshotJSONBytes':snapshotbytes,'snapshotRawWordBytes':rawbytes,'ordinaryAdvancesRecorded':67,'encodedFramesRecorded':68,'decodedPNGsOmitted':5,'originalPathsRehashed':originalcount,'optionalOriginalSourceBuildHelperChecks':pingroups,'noSourceModelBuildNativeTestsOrResourcesRun':True,'fullSourceDependenciesOrBuildReconstructionClaim':False,'adoptionAcceptance':False},indent=2))
if __name__=='__main__':main()
