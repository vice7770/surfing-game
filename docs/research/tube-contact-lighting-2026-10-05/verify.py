#!/usr/bin/env python3
"""Verify selected completed contact/light evidence; executes no archived code."""
from pathlib import Path
import argparse, gzip, hashlib, json, math, struct

HERE=Path(__file__).resolve().parent
OLD=HERE.parent/'tube-stability-2026-10-05'

def fp(b):
    return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}

def require(condition, message):
    if not condition:
        raise ValueError(message)

def read(path):
    b=path.read_bytes()
    return json.loads(gzip.decompress(b) if path.suffix=='.gz' else b)

def canonical(value):
    return json.dumps(value,sort_keys=True)

def verify_record(q, external=False, originals=False):
    path=(HERE/q['path']).resolve()
    require(path.is_relative_to(OLD if external else HERE),'Archive path escapes allowed directory')
    require(q['encoding'] in ('identity','gzip'),'Unknown encoding')
    b=path.read_bytes();require(fp(b)==q['stored'],'Stored mismatch: '+str(path))
    decoded=gzip.decompress(b) if q['encoding']=='gzip' else b
    require(fp(decoded)==q['decoded'],'Decoded mismatch: '+str(path))
    if q['encoding']=='gzip' and not external:
        require(b[:3]==b'\x1f\x8b\x08' and not b[3]&8 and struct.unpack('<I',b[4:8])[0]==0,'Non-deterministic gzip metadata')
    if external:
        pin=q['priorManifest'];p=(HERE/pin['path']).resolve()
        require(p.is_relative_to(OLD) and fp(p.read_bytes())=={k:pin[k] for k in ('bytes','sha256')},'Prior manifest mismatch')
    if originals and 'originalPath' in q:
        require(fp(Path(q['originalPath']).read_bytes())==q['decoded'],'Original mismatch: '+q['originalPath'])

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--originals',action='store_true')
    ap.add_argument('--output',type=Path)
    args=ap.parse_args()
    manifest_path=HERE/'manifest.json';m=read(manifest_path)
    require(m['schema']=='tube-contact-and-diffuse-lighting-archive/v1','Schema mismatch')
    files=m['files'];refs=m['exactPriorArchiveReferences'];records={q['path']:q for q in files}
    require(len(records)==len(files),'Duplicate local payload')
    for q in files:verify_record(q,originals=args.originals)
    for q in refs:verify_record(q,external=True,originals=args.originals)
    pin=m['priorArchiveManifest'];p=(HERE/pin['path']).resolve()
    require(p==OLD/'manifest.json' and fp(p.read_bytes())=={k:pin[k] for k in ('bytes','sha256')},'Prior archive identity')
    inventory={str(p.relative_to(HERE)) for p in HERE.rglob('*') if p.is_file()}
    allowed=set(records)|{'manifest.json','verification.json'}
    if args.output:
        output=args.output.resolve();require(output.is_relative_to(HERE),'Output must be inside archive')
        allowed.add(str(output.relative_to(HERE)))
    require(inventory<=allowed and set(records)<=inventory,'Unexpected or missing payload')
    require(len(files)==m['counts']['localPayloadFiles'] and len(refs)==m['counts']['exactPriorReferences'],'Payload count mismatch')
    stored=sum(p.stat().st_size for p in HERE.rglob('*') if p.is_file())
    require(stored<m['storedByteCap']==16*1024*1024,'Stored archive cap')
    require(sum(q['stored']['bytes'] for q in files)==m['bytes']['storedPayload'] and
            sum(q['decoded']['bytes'] for q in files)==m['bytes']['decodedLocalPayload'],'Payload totals mismatch')

    def pin_of(q):return {k:q[k] for k in ('bytes','sha256')}
    def by_role(role):
        match=[q for q in refs if q['role']==role];require(len(match)==1,'Missing/ambiguous prior role: '+role)
        return read(HERE/match[0]['path'])
    def capture_pins(report,prefix):
        artifacts={q['file']:q for q in report['artifacts']+report['loftSnapshots']}
        for q in files:
            if q['path'].startswith(prefix):
                name=q['path'][len(prefix):]
                if name.endswith('.gz'):name=name[:-3]
                if name=='report.json':continue # Bound by archive hash, not its own media inventory.
                require(name in artifacts and q['decoded']==pin_of(artifacts[name]),'Actual capture pin mismatch: '+name)
    def owner_checks(owner):
        require(owner['complete'] and owner['exitCode']==0 and owner['firstFailure'] is None,'Owner completion mismatch')
        require(owner['closedPorts']=={'4299':True,'9709':True} and owner['protectedStatesFinally']=={'4310':True,'4311':True,'4312':False,'4313':False},'Recorded closure/protected states mismatch')
        require(owner['independentClosureValid'] and owner['protectedPortsPreserved'] and owner['sourceBuildHelpersPostUnchanged'],'Owner integrity mismatch')

    v6=read(HERE/'contact/V6/capture/report.json.gz')
    owner6=read(HERE/'contact/V6/receipts/candidate-first-owner.json.gz');owner_checks(owner6)
    require(v6['complete'] and v6['firstFailure'] is None and v6['stepCount']==len(v6['steps'])==1366,'V6 completion/count mismatch')
    trace=gzip.decompress((HERE/'contact/V6/capture/steps.ndjson.gz').read_bytes())
    rows=[json.loads(line) for line in trace.splitlines() if line]
    require(canonical(rows)==canonical(v6['steps']),'V6 NDJSON/report mismatch')
    require([q['step'] for q in rows]==list(range(1,1367)) and
            all(math.isclose(q['physicalSeconds'],q['step']/60,abs_tol=1e-7) for q in rows),'V6 chronology/clock mismatch')
    require(v6['firstPopUp']['step']==1300 and v6['firstLanding']['step']==1343 and v6['stop']['step']==1366,'V6 events mismatch')
    require(v6['stop']['phase']=='fallen' and v6['stop']['separation']=='lost board' and v6['stop']['resets']==0,'V6 stop mismatch')
    require(len(v6['loftSnapshots'])==4 and len(v6['videoRequests'])==67,'V6 sidecar/movie request mismatch')
    capture_pins(v6,'contact/V6/capture/')
    loss=v6['firstContactLoss'];diag=loss['diagnostics'];sample=diag['loss']['sample']
    require(loss['step']==1366 and diag['loss']['trigger']=='posture-error' and diag['loss']['selectedCause']=='lost board' and
            diag['loss']['dominantLimit']=='flight' and sample['inContact'] is True and sample['flightTime']==0 and
            sample['postureError']==0.2509080941485283>diag['recoverableError']==0.25,'Recorded loss latch mismatch')
    comparison=read(HERE/'contact/V6/receipts/actual-comparison.json.gz')
    require(canonical(comparison['loss'])==canonical(loss) and comparison['physicsEqualityClaim'] is False and
            comparison['configComparison']['differences']=={},'V6 comparison scope mismatch')
    v4=by_role('exact-V4-comparison-report')
    for field,expected in comparison['fields'].items():
        equal=[canonical(a[field])==canonical(b[field]) for a,b in zip(v4['steps'],rows)]
        first=next((i+1 for i,q in enumerate(equal) if not q),None)
        require(len(equal)==expected['compared'] and sum(equal)==expected['equalRows'] and first==expected['firstDifference'],
                'Published V4/V6 comparison mismatch: '+field)
    inspection6=read(HERE/'contact/V6/receipts/root-pixel-inspection.json.gz')
    require(len(inspection6['imagesViewed'])==2 and inspection6['movieMetadataOnly']['encodedFrames']==67 and
            inspection6['movieMetadataOnly']['movieDecodedOrWatched'] is False and inspection6['tubeAccepted'] is False,'V6 pixel scope mismatch')

    v5=read(HERE/'contact/V5/candidate-first/report.json.gz')
    owner5=read(HERE/'contact/V5/candidate-first-owner.json.gz')
    require(v5['complete'] is False and owner5['complete'] is False and owner5['exitCode']==1 and
            'Only the four declared ordinary checkpoint epochs' in v5['firstFailure'],'V5 unsuccessful provenance mismatch')
    label=read(HERE/'contact/V6/receipts/label-fix.json.gz')
    require(label['applicationRebuilt'] is False and label['moduleRebuilt'] is False and label['physicsChanged'] is False,'Label-only repair mismatch')

    diffuse=read(HERE/'diffuse/capture/report.json.gz')
    ownerd=read(HERE/'diffuse/receipts/candidate-first-owner.json.gz');owner_checks(ownerd)
    require(diffuse['complete'] and len(diffuse['observations'])==len(diffuse['videoRequests'])==71 and
            [q['movingStep'] for q in diffuse['observations']]==list(range(71)) and diffuse['stop']['movingStep']==70,'Diffuse completion/chronology mismatch')
    capture_pins(diffuse,'diffuse/capture/')
    baseline=by_role('exact-retirement-V2-comparison-report')
    wordrefs=[q for q in refs if q['role']=='actual-diffuse-sidecar-byte-identical-to-retirement-V2']
    require(len(wordrefs)==len(diffuse['loftSnapshots'])==2,'Diffuse sidecar reference count')
    for a,b in zip(diffuse['loftSnapshots'],baseline['loftSnapshots']):
        require(pin_of(a)==pin_of(b) and any(q['decoded']==pin_of(a) for q in wordrefs),'Diffuse complete sidecar identity mismatch')
    review=read(HERE/'diffuse/review/analysis.json.gz')
    require(review['complete'] and review['resourcesProbedOrStarted'] is False,'Frozen numerical review scope')
    pixels=read(HERE/'diffuse/review/root-pixel-inspection.json')
    require(len(pixels['inspectedOriginalPNGs'])==6 and pixels['decoder']['selectedEncodedFrameIndices']==[0,35,70] and
            pixels['decoder']['encodedFrameCount']==71 and not any(pixels[k] for k in ('appearanceAccepted','tubeEntryAccepted','productionAdoption','FPSClaim')),'Diffuse root pixel scope')

    fixed=read(HERE/'frame-fix/readiness.json.gz')
    production=read(HERE/'frame-fix/production-focused-tests.json.gz')
    require(fixed['complete'] and fixed['frozen'] and fixed['validation']['authoredFocused']['passed']==15 and
            fixed['validation']['parentFiveContracts']['passed']==1 and fixed['validation']['parentFiveContracts']['failed']==4 and
            fixed['validation']['strictTypeScript']['exitCode']==0 and fixed['limits']['nativeFixReplay'] is False and
            fixed['limits']['fixProvenToSolveV6Loss'] is False,'Frozen frame-correction scope')
    require(production['numPassedTests']==15 and production['numFailedTests']==0 and production['success'],'Independent production focused validation')
    require(not any(m['acceptance'].values()) and not m['fullBuildReconstructionClaim'] and
            not m['activeSubsequentSourceFixesIncluded'] and m['pairedNativeFrameCorrectionAcceptance'] is False,'Declared acceptance/scope mismatch')
    result={'schema':'tube-contact-and-diffuse-lighting-archive-verification/v1','complete':True,
            'manifest':fp(manifest_path.read_bytes()),'mode':'stored-decoded-and-originals' if args.originals else 'stored-and-decoded',
            'localPayloadFiles':len(files),'exactPriorReferences':len(refs),'storedTreeBytesBeforeOutput':stored,
            'storedPayloadBytes':m['bytes']['storedPayload'],'decodedLocalPayloadBytes':m['bytes']['decodedLocalPayload'],'storedByteCap':m['storedByteCap'],
            'V6':{'rows':1366,'PNGs':2,'movies':1,'wordSidecars':4,'lossTrigger':'posture-error','flightTime':0,'inContact':True},
            'V5':{'ownerExitCode':1,'complete':False},'diffuse':{'observations':71,'PNGs':2,'movies':1,'exactReferencedWordSidecars':2},
            'frameCorrection':{'authoredPassed':15,'parentPassed':1,'parentFailed':4,'productionFocusedPassed':15,'nativeReplay':False},
            'resourcesBuildTestsOrArchivedCodeExecuted':False,'qualityFPSOrAdoptionAcceptance':False}
    text=json.dumps(result,indent=2)+'\n'
    if args.output:
        output.write_text(text)
        require(sum(p.stat().st_size for p in HERE.rglob('*') if p.is_file())<m['storedByteCap'],'Output exceeds cap')
    print(text,end='')

if __name__=='__main__':
    main()
