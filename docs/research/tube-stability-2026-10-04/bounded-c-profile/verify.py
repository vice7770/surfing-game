#!/usr/bin/env python3
"""Verify bytes and recorded receipts only; never import game or trial code."""
from pathlib import Path
import argparse,gzip,hashlib,json

def digest(raw):
    return {'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--original-scratch',action='store_true')
    args=parser.parse_args()
    root=Path(__file__).resolve().parent
    manifest=json.loads((root/'manifest.json').read_text())
    bypath={x['path']:x for x in manifest['files']}
    checks={'payloads':0,'gzipPayloads':0,'priorReferences':0,'originalPayloads':0,'originalTransports':0,'originalBaselines':0}
    def decoded(path):
        r=bypath[path];raw=(root/path).read_bytes()
        assert digest(raw)==r['transport'],f'transport drift: {path}'
        value=gzip.decompress(raw) if r['encoding']=='gzip' else raw
        assert digest(value)==r['decoded'],f'decoded drift: {path}'
        return value
    for r in manifest['files']:
        value=decoded(r['path']);checks['payloads']+=1
        checks['gzipPayloads']+=r['encoding']=='gzip'
        if args.original_scratch and 'originalPath' in r:
            assert digest(Path(r['originalPath']).read_bytes())==r['decoded'],f'original drift: {r["originalPath"]}'
            checks['originalPayloads']+=1
            if 'originalTransport' in r:
                t=r['originalTransport'];assert digest(Path(t['path']).read_bytes())=={'bytes':t['bytes'],'sha256':t['sha256']}
                checks['originalTransports']+=1
    refs=json.loads(decoded('input-references.json'))
    for r in refs['priorArchivedInputsAndHelpers']:
        raw=(root/r['archiveRelative']).read_bytes();assert digest(raw)==r['transport'],f'reference transport: {r["archiveRelative"]}'
        value=gzip.decompress(raw) if r['encoding']=='gzip' else raw
        assert digest(value)==r['decoded'],f'reference decoded: {r["archiveRelative"]}'
        checks['priorReferences']+=1
        if args.original_scratch and 'originalPath' in r:
            assert digest(Path(r['originalPath']).read_bytes())==r['decoded'],f'prior original drift: {r["originalPath"]}'
            checks['originalPayloads']+=1
    if args.original_scratch:
        r=refs['decodedCaseDumpNotDuplicated'];assert digest(Path(r['originalPath']).read_bytes())=={'bytes':r['bytes'],'sha256':r['sha256']}
        checks['originalPayloads']+=1
        r=refs['baselineSnapshotOriginal'];h=json.loads(decoded(r['hashMapArchive']))['files']
        assert len(h)==r['files']
        for name,sha in h.items():
            assert hashlib.sha256((Path(r['root'])/name.removeprefix('src/')).read_bytes()).hexdigest()==sha,f'baseline drift: {name}'
            checks['originalBaselines']+=1
    # Validate captured receipt semantics, without calculating another model query.
    v1=json.loads(decoded('models/v1/summary.json.gz'))['outcome']
    assert v1['captured']['valid']==5 and v1['all1224Frames']['valid']==1224 and v1['all3648AdjacentF32']['valid']==3648
    band=json.loads(decoded('models/v1/retirement-band-analysis.json'))
    assert band['portOrNativeAdoptionBlockedForFullQueries'] and not band['newGridOrCoefficientSearch']
    assert all(not c['singleInteriorReproduction']['geometryReturned'] for c in band['cases'])
    v2=json.loads(decoded('models/precision-v2/precision-summary.json'))
    assert (v2['attempted'],v2['valid'],v2['invalid'])==(342,303,39)
    v3=json.loads(decoded('models/precision-v3/precision-summary.json'))
    assert (v3['attempted'],v3['valid'],v3['invalid'])==(522,483,39)
    original=json.loads(decoded('models/precision-v4-original/monotonicity-failure.json'))
    assert original['failures'] and original['failures'][0]['edges'][0]['dq']<0
    corrected=json.loads(decoded('models/precision-v4-corrected/precision-summary.json'))
    assert (corrected['attempted'],corrected['valid'],corrected['invalid'])==(522,522,0)
    assert corrected['allCollapsedOwnedMonotoneX'] and corrected['switchPairs']==40 and corrected['switchValid']
    provider=json.loads(decoded('models/precision-v4-corrected/provider-readiness.json'))
    assert provider['ownedSourcesFinal'] and provider['tests']['passed']==30 and provider['strictTsc']['exitCode']==0
    for r in provider['ownedSources']:
        rel=r['path'].split('/source/',1)[1]
        assert digest(decoded('source/final/'+rel))=={'bytes':r['bytes'],'sha256':r['sha256']}
    result=json.loads(decoded('consumers/receipts/v4-final-focused-result.json'))
    assert result['focusedResult']['assertions']==9 and result['focusedResult']['passed']==8 and result['focusedResult']['failed']==1
    assert result['focusedResult']['knownFailureUnchanged'] and result['focusedResult']['failureBytesEqualToPriorCanonicalReceipt']
    prior='consumers/history/tube-bounded-c-final-mesh-canonical-receipt-20261004.json.gz'
    final='consumers/receipts/v4-final-mesh-failure.json.gz'
    assert decoded(prior)==decoded(final)
    f=json.loads(decoded(final));assert len(f['failures'])==1 and f['checkedAir']==75710
    assert f['failures'][0]['case']=='periodic-reef42-l12' and f['failures'][0]['penetration']==0.0003114571531508403
    status=json.loads(decoded('consumers/receipts/v4-final-focused-validation.json'))
    assert status['exitCode']==1 and status['consumerSourceUnchanged']
    for r in status['consumerFiles']:
        assert digest(decoded('source/final/'+r['path']))=={'bytes':r['bytes'],'sha256':r['sha256']}
    assert manifest['nativeEvidenceIncluded'] is False and manifest['sourceAdopted'] is False
    expected=set(bypath)|{'manifest.json','verification.json'}
    actual={str(p.relative_to(root)) for p in root.rglob('*') if p.is_file()}
    assert actual<=expected and set(bypath)<=actual,f'archive inventory mismatch: {actual^expected}'
    print(json.dumps({'verified':True,'mode':'original-scratch' if args.original_scratch else 'portable','checks':checks,'manifest':digest((root/'manifest.json').read_bytes()),'recordedFinalFocused':'8 passed / 1 known failure','retainedPenetrationMeters':f['failures'][0]['penetration'],'nativeOrNumericalRerun':False,'sourceAdoptionOrEntryPass':False},indent=2))

if __name__=='__main__':main()
