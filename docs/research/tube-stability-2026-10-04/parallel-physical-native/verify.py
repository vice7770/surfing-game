#!/usr/bin/env python3
"""Verify archived bytes and exact local patches; never evaluate tube quality or run game code."""
from pathlib import Path
import argparse, gzip, hashlib, json, re

HERE=Path(__file__).resolve().parent
def fingerprint(b):return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def demand(condition,message):
    if not condition:raise AssertionError(message)
def decode(item):
    path=(HERE/item['path']).resolve()
    demand(path.is_relative_to(HERE) or path.is_relative_to(HERE.parent/'shared-sheet'),'Unexpected payload path')
    packed=path.read_bytes();demand(fingerprint(packed)==item['transport'],'Transport mismatch: '+item['path'])
    b=gzip.decompress(packed) if item['encoding']=='gzip' else packed
    demand(fingerprint(b)==item['decoded'],'Decoded mismatch: '+item['path']);return b
def patch_files(patch):
    lines=patch.splitlines(keepends=True);i=0;result=[]
    while i<len(lines):
        if not lines[i].startswith(b'--- '):i+=1;continue
        old=lines[i][4:].split(b'\t')[0].strip().decode();i+=1
        demand(i<len(lines) and lines[i].startswith(b'+++ '),'Missing patch destination')
        new=lines[i][4:].split(b'\t')[0].strip().decode();i+=1;hunks=[]
        while i<len(lines) and not lines[i].startswith(b'--- '):
            m=re.match(rb'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@',lines[i])
            if not m:i+=1;continue
            oldstart=int(m[1]);oldcount=int(m[2] or b'1');newstart=int(m[3]);newcount=int(m[4] or b'1');i+=1
            body=[];oc=nc=0
            while oc<oldcount or nc<newcount:
                demand(i<len(lines),'Truncated hunk');line=lines[i];i+=1
                demand(line[:1] in {b' ',b'+',b'-'},'Invalid hunk line')
                oc+=line[:1]!=b'+';nc+=line[:1]!=b'-';body.append(line)
                if i<len(lines) and lines[i].startswith(b'\\ No newline'):
                    body[-1]=body[-1].removesuffix(b'\n');i+=1
            demand(oc==oldcount and nc==newcount,'Hunk count mismatch')
            hunks.append((oldstart,oldcount,newstart,newcount,body))
        result.append((old,new,hunks))
    demand(bool(result),'No patch files');return result
def apply_exact(before,hunks):
    lines=before.splitlines(keepends=True);cursor=0;out=[]
    for os,oc,ns,nc,body in hunks:
        start=os-1 if os else 0;demand(start>=cursor,'Unordered patch')
        out.extend(lines[cursor:start]);cursor=start
        demand(len(out)==(ns-1 if ns else 0),'New hunk position mismatch')
        for line in body:
            if line[:1] in {b' ',b'-'}:
                demand(cursor<len(lines) and lines[cursor]==line[1:],'Patch context differs; fuzz is forbidden')
                cursor+=1
            if line[:1] in {b' ',b'+'}:out.append(line[1:])
    out.extend(lines[cursor:]);return b''.join(out)
def local(pin):return pin.get('path') or pin['file'].split('/source/',1)[-1]

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--originals',action='store_true',help='Also rehash retained original paths and source/build pin groups; requires the original scratch inputs.')
    args=parser.parse_args();manifest_bytes=(HERE/'manifest.json').read_bytes();m=json.loads(manifest_bytes)
    items=m['files']+m['externalFiles'];decoded={x['path']:decode(x) for x in items};originals={x['originalPath']:x for x in items if x.get('originalPath')}
    expected={x['path'] for x in m['files']}|{'manifest.json','verification.json'}
    actual={str(p.relative_to(HERE)) for p in HERE.rglob('*') if p.is_file()}
    demand(actual<=expected,'Unmanifested archive files: '+str(sorted(actual-expected)))
    def obj(path):return json.loads(decoded[path])
    def ref(r):return decoded[r['path']]
    patch_count=0
    for group in m['patches']:
        files=patch_files(decoded[group['patch']]);demand(len(files)==len(group['files']),'Patch file inventory differs')
        for (old,new,hunks),spec in zip(files,group['files']):
            demand(new.removeprefix('b/')==spec['path'],'Patch destination differs')
            before=ref(spec['before']) if spec['before'] else b''
            demand((old=='/dev/null')==(spec['before'] is None),'Patch preimage inventory differs')
            demand(apply_exact(before,hunks)==ref(spec['after']),'Patch postimage mismatch: '+spec['path']);patch_count+=1
    physical=obj('source/physical/receipts/readiness.json.gz');parallel=obj('source/parallel/receipts/readiness.json.gz')
    build=obj('native/manifests/root-complete-build-result.json.gz');seal=obj('native/manifests/seal.json.gz')
    owner=obj('native/candidate-first-owner.json');report=obj('native/capture/report.json.gz')
    pp={local(x):x for x in physical['sourcePins']};bp={local(x):x for x in build['sourcePins']}
    demand(len(pp)==580 and len(bp)==579,'Preparation/build source counts differ')
    excluded=sorted(pp.keys()-bp.keys());demand(excluded==['docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json'],'Build omission inventory differs')
    demand(not (bp.keys()-pp.keys()),'Unexpected build-only source')
    demand(all(pp[k]['bytes']==bp[k]['bytes'] and pp[k]['sha256']==bp[k]['sha256'] for k in bp),'Preparation/build shared source differs')
    demand(len(parallel['sourcePins'])==579,'Parallel source count differs')
    demand(set(physical['runtimePins'][i]['path'] for i in range(2))=={'src/wave/barrel/SweptCrash.ts','src/wave/barrel/crashCurve.ts'},'Physical runtime scope differs')
    demand(len(build['builtAssetPins'])==21 and len(build['frozenAssetPins'])==49,'Build asset inventory differs')
    demand(build['staticComposition']['newBuildAssets']==21 and build['staticComposition']['additionalStaticAssets']==28,'Asset composition differs')
    demand(owner['complete'] is True and owner['exitCode']==0 and owner['firstFailure'] is None,'Successful owner record differs')
    demand(owner['sealSha256']==fingerprint(decoded['native/manifests/seal.json.gz'])['sha256'],'Owner seal differs')
    demand(report['complete'] is True and report['firstFailure'] is None and report['stop']['movingStep']==67,'Capture finality differs')
    demand(report['video']['physicsAdvances']==67 and abs(report['video']['physicalSeconds']-67/60)<1e-10,'Physical interval differs')
    demand(report['firstObservedPhase2']['movingStep']==48,'First phase-2 differs')
    demand(len(report['artifacts'])==5 and len(report['checkpoints'])==4,'Media inventory differs')
    for a in report['artifacts']:
        demand(fingerprint(decoded['native/capture/'+a['file']])=={'bytes':a['bytes'],'sha256':a['sha256']},'Capture media pin differs')
    for label in ['parallel','mouth']:
        failed=obj('history/failed-'+label+'/candidate-first-owner.json');demand(failed['complete'] is False and failed['firstFailure'] is not None,'Failed owner was not retained as failed')
    analysis=obj('reviews/native-analysis/analysis.json.gz')
    demand(analysis['readOnly'] is True and analysis['allIndependentChecksPassed'] is True and len(analysis['checks'])==38,'Independent analysis receipt differs')
    mouth=analysis['mouth'];demand(mouth['epochs']==56 and mouth['totalDiscreteColumnQueries']==1344,'Mouth sampling inventory differs')
    demand(mouth['allInternalSegmentsClear'] and mouth['allExteriorSegmentsObstructed'] and mouth['allShorewardSegmentsObstructed'],'Sightline diagnostics differ')
    demand(analysis['geometry']['openSteps']==list(range(56)) and analysis['geometry']['lostAirSteps']==list(range(56,67)),'Air lifetime inventory differs')
    video=obj('reviews/video/receipt.json');probe=obj('reviews/video/ffprobe.json')
    demand(video['complete'] and video['decodedFrameCount']==68 and video['selectedDecodedFrameIndices']==[0,17,34,51,67],'Decoded frame evidence differs')
    demand(int(probe['streams'][0]['nb_read_frames'])==68,'ffprobe frame count differs')
    demand(fingerprint(decoded['native/capture/moving-C.webm'])=={'bytes':video['input']['bytes'],'sha256':video['input']['sha256']},'Decoded movie input differs')
    demand(m['acceptance']=={'mouth':False,'airCorridor':False,'bodyPassage':False,'FPS':False,'productionAdoption':False},'Quality boundary differs')
    original_count=0;pin_count=0
    if args.originals:
        for path,pin in m['originalIntegrityInputs'].items():
            demand(fingerprint(Path(path).read_bytes())==pin,'Original changed: '+path);original_count+=1
        groups=[(physical['sourceRoot'],physical['sourcePins']),(parallel['sourceRoot'],parallel['sourcePins'])]
        for root,pins in groups:
            for pin in pins:
                demand(fingerprint((Path(root)/local(pin)).read_bytes())=={'bytes':pin['bytes'],'sha256':pin['sha256']},'Original preparation source pin differs');pin_count+=1
        for pins in [build['sourcePins'],build['assetPins'],build['frozenAssetPins'],build['builtAssetPins'],seal['helperPins']]:
            for pin in pins:
                demand(fingerprint(Path(pin['file']).read_bytes())=={'bytes':pin['bytes'],'sha256':pin['sha256']},'Original build/helper pin differs: '+pin['file']);pin_count+=1
    print(json.dumps({'schema':'parallel-physical-native-archive-verification/v1','passed':True,'manifestSha256':fingerprint(manifest_bytes)['sha256'],'payloadFiles':len(m['files']),'externalReferences':len(m['externalFiles']),'payloadTransportBytes':sum(x['transport']['bytes'] for x in m['files']),'payloadDecodedBytes':sum(x['decoded']['bytes'] for x in m['files']),'exactPatchSets':len(m['patches']),'exactPatchedFileChecks':patch_count,'preparationSourcePins':580,'rootBuildSourcePins':579,'newBuildAssets':21,'staticAssetsAdded':28,'completeAssetPins':49,'captureMediaPins':5,'originalPathsRehashed':original_count,'originalSourceBuildHelperPinChecks':pin_count,'nativeBuildOrModelTestsRun':False,'futureFullSourceOrBuildReconstructionClaim':False,'tubeQualityAcceptance':False,'mouthBodyFPSProductionAcceptance':False},indent=2))

if __name__=='__main__':main()
