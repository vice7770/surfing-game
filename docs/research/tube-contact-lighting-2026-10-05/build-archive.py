#!/usr/bin/env python3
"""First-only composition of selected completed contact/light evidence; no execution."""
from pathlib import Path
import gzip, hashlib, io, json, os

HERE = Path(__file__).resolve().parent
OLD = HERE.parent / 'tube-stability-2026-10-05'
V6 = Path('/private/tmp/tube-pop-up-contact-native-v6-20261005')
V5 = Path('/private/tmp/tube-pop-up-contact-native-v5-20261005')
OBSERVER = Path('/private/tmp/tube-pop-up-contact-diagnostics-20261005')
DIFF = Path('/private/tmp/tube-C-diffuse-interior-native-20261005')
SHADER = Path('/private/tmp/tube-C-diffuse-interior-20261005')
REVIEW = Path('/private/tmp/tube-C-diffuse-interior-actual-review-20261005')
PIXELS = Path('/private/tmp/tube-C-diffuse-interior-root-pixel-review-20261005')
FIX = Path('/private/tmp/tube-landing-remap-fix-20261005')
CAP = 16 * 1024 * 1024
assert not (HERE/'manifest.json').exists(), 'First-only composition; do not overwrite'

def fp(b):
    return {'bytes':len(b), 'sha256':hashlib.sha256(b).hexdigest()}

files=[]; refs=[]
prior_path=OLD/'manifest.json'; prior=json.loads(prior_path.read_text())

def add(original, relative, role, compressed=False):
    original=Path(original).resolve(); b=original.read_bytes(); target=HERE/relative
    assert not target.exists(),target
    target.parent.mkdir(parents=True, exist_ok=True)
    if compressed:
        z=io.BytesIO()
        with gzip.GzipFile(filename='',mode='wb',fileobj=z,compresslevel=9,mtime=0) as f:
            f.write(b)
        stored=z.getvalue(); assert gzip.decompress(stored)==b
    else:
        stored=b
    target.write_bytes(stored)
    q={'originalPath':str(original),'path':relative,'encoding':'gzip' if compressed else 'identity',
       'stored':fp(stored),'decoded':fp(b),'role':role}
    files.append(q);return q

def refer(original, role):
    original=Path(original).resolve(); fingerprint=fp(original.read_bytes())
    matches=[q for q in prior['files'] if q['decoded']==fingerprint]
    assert matches, 'No exact prior stored payload for '+str(original)
    q=matches[0]; target=(OLD/q['path']).resolve(); raw=target.read_bytes()
    assert target.is_relative_to(OLD) and fp(raw)==q['stored']
    assert fp(gzip.decompress(raw) if q['encoding']=='gzip' else raw)==fingerprint
    r={'originalPath':str(original),'path':os.path.relpath(target,HERE),'encoding':q['encoding'],
       'stored':q['stored'],'decoded':fingerprint,'role':role,
       'priorManifest':{'path':os.path.relpath(prior_path,HERE),**fp(prior_path.read_bytes())}}
    refs.append(r);return r

def copy_set(base, names, prefix, role):
    for name in names:
        add(base/name,prefix+name+('.gz' if name.endswith('.json') else ''),role,name.endswith('.json'))

v6=json.loads((V6/'candidate-first/report.json').read_text())
v5=json.loads((V5/'candidate-first/report.json').read_text())
diff=json.loads((DIFF/'candidate-first/report.json').read_text())
assert v6['complete'] and v6['stepCount']==1366 and not v5['complete'] and diff['complete']
assert json.loads((REVIEW/'analysis.json').read_text())['complete']
# Frozen review receipt from its owner, checked before composition.
for name, n, h in [('README.md',3289,'38eeb53e44a29aa3ca74362768c8b57d7ec2bff8cc125059d2e844a22cadbec0'),
                   ('analysis.json',40945,'e0688877eef92ac5a35238ce396797816a845fdc5afde5198c9d0644150550a2'),
                   ('analyze.py',10935,'6086f4049a5c3f6fa702e2afe39d78facce0b1ba2d77be3a703ca53e1772da77')]:
    assert fp((REVIEW/name).read_bytes())=={'bytes':n,'sha256':h}

for name in ['report.json','steps.ndjson','loft-initial.json','loft-first-pop-up.json','loft-first-landing.json','loft-terminal.json']:
    add(V6/'candidate-first'/name,'contact/V6/capture/'+name+'.gz','actual-V6-report-trace-or-words',True)
for name in ['02-first-landing.png','03-terminal.png','pop-up-motion.webm']:
    add(V6/'candidate-first'/name,'contact/V6/capture/'+name,'actual-V6-media')
copy_set(V6,['readiness.json','seal.json','helper-pins.json','candidate-first-owner.json','candidate-first-owner.log',
             'actual-comparison.json','root-pixel-inspection.json','label-fix.json','label-checks.json',
             'loft-snapshot-tools.mjs','contact-retention.mjs','rider-driver.mjs','native.mjs','run.py','README.md'],
         'contact/V6/receipts/','actual-V6-and-helper-label-provenance')
copy_set(V5,['candidate-first/report.json','candidate-first-owner.json','candidate-first-owner.log','seal.json',
             'readiness.json','root-complete-build-result.json','root-diagnostic-build-result.json',
             'source-contract-checks.json','cpu-validation.json','README.md'],
         'contact/V5/','failed-V5-or-borrowed-actual-build-receipt')
copy_set(OBSERVER,['runtime.patch','readiness.json','source-delta.json','README.md','observer-review.md','test-metrics.json'],
         'contact/source/','observer-source-preparation')
observer_delta=json.loads((OBSERVER/'source-delta.json').read_text())
for q in observer_delta['overrides']:
    p=OBSERVER/'source'/q['path']; assert fp(p.read_bytes())=={k:q['after'][k] for k in ['bytes','sha256']}
    add(p,'contact/source/postimages/'+q['path']+'.gz','observer-postimage',True)

add(DIFF/'candidate-first/report.json','diffuse/capture/report.json.gz','actual-diffuse-report',True)
for name in ['0-initial.png','2-first-phase2.png','moving-C.webm']:
    add(DIFF/'candidate-first'/name,'diffuse/capture/'+name,'actual-diffuse-selected-media')
for name in ['loft-initial.json','loft-first-phase2.json']:
    refer(DIFF/'candidate-first'/name,'actual-diffuse-sidecar-byte-identical-to-retirement-V2')
copy_set(DIFF,['readiness.json','seal.json','root-complete-build-result.json','helper-pins.json',
               'candidate-first-owner.json','candidate-first-owner.log','helper-checks.json','preparation-first-errors.json','README.md'],
         'diffuse/receipts/','actual-diffuse-native-and-build-receipt')
copy_set(SHADER,['runtime.patch','tests.patch','readiness.json','source-delta.json','cpu-validation.json','focused-tests.json','README.md'],
         'diffuse/source/','appearance-source-preparation')
shader_delta=json.loads((SHADER/'source-delta.json').read_text())
for q in shader_delta['replacements']:
    p=SHADER/'source'/q['path']; assert fp(p.read_bytes())=={k:q[k] for k in ['bytes','sha256']}
    add(p,'diffuse/source/postimages/'+q['path']+'.gz','appearance-postimage',True)
copy_set(REVIEW,['README.md','analysis.json','analyze.py'],'diffuse/review/','frozen-actual-diffuse-comparison')
add(PIXELS/'inspection.json','diffuse/review/root-pixel-inspection.json','actual-root-pixel-inspection')

assert fp((FIX/'readiness.json').read_bytes())=={'bytes':12124,'sha256':'ebd96a5bd8df830c9b2b81b21a74704ab1001c3f04ce56de1d2175582d35b538'}
copy_set(FIX,['README.md','runtime.patch','tests.patch','readiness.json','source-delta.json','first-parent-five-contract-tests.json',
              'authored-focused-summary.json','complete-motion-comparison.json','complete-motion-first-differences.json',
              'first-focused-tests.json','second-motion-tests.json','final-focused-tests.json','bounded-motion-tests.json',
              'zero-heading-motion-final-metrics.json','first-typecheck.log'],
         'frame-fix/','frozen-independent-frame-correction-source-validation')
add(Path('/private/tmp/tube-landing-production-checks-20261005/focused-tests.json'),
    'frame-fix/production-focused-tests.json.gz','actual-independent-production-focused-validation',True)

for p,role in [(Path('/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/candidate-first/report.json'),'exact-V4-comparison-report'),
                (Path('/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/candidate-first/steps.ndjson'),'exact-V4-comparison-trace'),
                (Path('/private/tmp/tube-bounded-c-retirement-boundary-native-20261005/candidate-first/report.json'),'exact-retirement-V2-comparison-report'),
                (Path('/private/tmp/tube-bounded-c-retirement-boundary-20261005/cap-prefix-v2/source-pins.json'),'exact-parent588-source-pins'),
                (Path('/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/README.md'),'borrowed-V4-replay-method'),
                (Path('/private/tmp/tube-stable-x-ordinary-rider-v4-20261005/follower-camera.mjs'),'borrowed-unchanged-authored-follower'),
                (Path('/private/tmp/tube-bounded-c-retirement-boundary-native-20261005/run.py'),'borrowed-retirement-owner-method')]:
    refer(p,role)

for name in ['README.md','verify.py','build-archive.py','verification-preparation.txt']:
    b=(HERE/name).read_bytes();files.append({'path':name,'encoding':'identity','stored':fp(b),'decoded':fp(b),
                                          'role':'generated-archive-document-or-verifier','generated':True})
omitted=[]
for base,report,names in [(V6,v6,['00-initial.png','01-first-pop-up.png']),
                          (DIFF,diff,['1-initial-exterior.png','3-first-phase2-water-hidden.png','4-first-phase2-barrel-hidden.png','5-terminal.png'])]:
    for name in names:
        q=next(q for q in report['artifacts'] if q['file']==name)
        omitted.append({'originalPath':str(base/'candidate-first'/name),'bytes':q['bytes'],'sha256':q['sha256'],
                        'reason':'Unselected original image body; inventory/inspection provenance retained'})
for q in json.loads((PIXELS/'inspection.json').read_text())['decoder']['decodedFrames']:
    omitted.append({'originalPath':q['file'],'bytes':q['bytes'],'sha256':q['sha256'],
                    'reason':'Derived frame body omitted; actual movie and inspected-index receipt retained'})
readiness=json.loads((V6/'readiness.json').read_text())
module=readiness['diagnosticModule']
omitted.append({'originalPath':module['file'],'bytes':module['bytes'],'sha256':module['sha256'],
                'reason':'Borrowed compiled diagnostic module; exact root compilation receipt retained'})
manifest={'schema':'tube-contact-and-diffuse-lighting-archive/v1','files':files,'exactPriorArchiveReferences':refs,
          'selectedMedia':{'V6':['02-first-landing.png','03-terminal.png','pop-up-motion.webm'],
                           'diffuse':['0-initial.png','2-first-phase2.png','moving-C.webm']},
          'omittedPinnedBodies':omitted,'storedByteCap':CAP,'activeSubsequentSourceFixesIncluded':False,
          'frozenIndependentFrameCorrectionEvidenceIncluded':True,'pairedNativeFrameCorrectionAcceptance':False,
          'fullBuildReconstructionClaim':False,'newGameSourceOrResourcesChanged':False,
          'acceptance':{'tubeQuality':False,'mouthVisibility':False,'bodyPassage':False,'landing':False,'FPS':False,'productionAdoption':False},
          'counts':{'localPayloadFiles':len(files),'exactPriorReferences':len(refs),'V6TraceRows':1366,'V6PNGs':2,'V6Movies':1,'V6Sidecars':4,
                    'diffuseObservations':71,'diffusePNGs':2,'diffuseMovies':1,'diffuseExactReferencedSidecars':2,'unsuccessfulV5Reports':1},
          'bytes':{'storedPayload':sum(q['stored']['bytes'] for q in files),'decodedLocalPayload':sum(q['decoded']['bytes'] for q in files)},
          'priorArchiveManifest':{'path':os.path.relpath(prior_path,HERE),**fp(prior_path.read_bytes())},
          'omittedScopes':['Complete source/dependencies and application assets','Compiled application/dist/module bodies and unselected borrowed runtime inputs',
                           'V5 duplicate NDJSON/media beyond its retained full failed report',
                           'Complete frame-corrected source and unselected intermediate CPU fixtures','Later active experiments']}
(HERE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
for q in files+refs:
    if 'originalPath' in q:assert fp(Path(q['originalPath']).read_bytes())==q['decoded']
stored=sum(p.stat().st_size for p in HERE.rglob('*') if p.is_file())
assert stored<CAP, (stored,CAP)
print(json.dumps({'complete':True,'localPayloadFiles':len(files),'exactPriorReferences':len(refs),'storedTreeBytes':stored,
                  'storedPayloadBytes':manifest['bytes']['storedPayload'],'decodedLocalPayloadBytes':manifest['bytes']['decodedLocalPayload'],
                  'storedUnder16MiB':True,'activeSubsequentSourceFixesIncluded':False}))
