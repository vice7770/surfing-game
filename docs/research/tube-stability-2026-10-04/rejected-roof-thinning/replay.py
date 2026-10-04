"""Replay the three recorded offline trials against their exact measured receipts."""
import argparse
import copy
import gzip
import hashlib
import json
import os
from pathlib import Path
import struct
import subprocess
import sys
import tempfile

ARCHIVE=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()


def read_gzip(path):
    return gzip.decompress(path.read_bytes())


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo',type=Path,default=ARCHIVE.parents[3])
    parser.add_argument('--output',type=Path)
    args=parser.parse_args()
    repo=args.repo.resolve()
    output=args.output.resolve() if args.output else Path(tempfile.mkdtemp(prefix='roof-thinning-replay-'))
    if args.output:
        output.mkdir(parents=True,exist_ok=False)
    manifest=json.loads((ARCHIVE/'manifest.json').read_text())
    for file in manifest['files']:
        path=ARCHIVE/file['path']
        assert path.stat().st_size==file['bytes'],file['path']
        assert sha(path.read_bytes())==file['sha256'],file['path']
    index=json.loads(read_gzip(ARCHIVE/'inputs/case-frame-index.json.gz'))
    cases=copy.deepcopy(index['cases'])
    for case in cases:
        relative=case['asset'].pop('repositoryRelative')
        data=(repo/relative).read_bytes()
        assert len(data)==case['asset']['bytes'],relative
        assert sha(data)==case['asset']['sha256'],relative
        for frame in case['eligible']:
            offset=frame.pop('byteOffset');count=frame.pop('floatCount');expected=frame.pop('frameBytesSha256')
            payload=data[offset:offset+4*count]
            assert len(payload)==4*count and sha(payload)==expected,(case['id'],frame['frame'])
            # JS JSON serialization used in the recorded input normalizes negative zero.
            frame['profile']=[0.0 if x==0 else x for x in struct.unpack('<'+str(count)+'f',payload)]
    inputs=output/'inputs';inputs.mkdir()
    capture=inputs/'captured.json';capture.write_bytes(read_gzip(ARCHIVE/'inputs/captured-polylines.json.gz'))
    baseline=inputs/'air-baseline.json';baseline.write_bytes(read_gzip(ARCHIVE/'inputs/air-baseline.json.gz'))
    eligibility={'schema':'thin-roof-eligible/v1','complete':True,'sourceFiles':index['sourceFiles'],
        'sourceOwner':index['sourceOwner'],'eligibility':index['eligibility'],'cases':cases}
    results=[]
    names=['v1-highest','v2-nearest-top','v3-nonincident-contour']
    original_work=['/private/tmp/tube-thinner-roof-20261004','/private/tmp/tube-thinner-roof-20261004/nearest-top','/private/tmp/tube-thinner-roof-20261004/contour-ceiling']
    for name,original in zip(names,original_work):
        trial=output/name;trial.mkdir()
        for file in ('measurement_functions.py','load-cases.ts','load-cases.mjs'):
            (trial/file).write_bytes((ARCHIVE/'source'/file).read_bytes())
        (trial/'eligible-cases.json').write_text(json.dumps(eligibility,separators=(',',':'))+'\n')
        source=(ARCHIVE/'source'/f'{name}.py').read_text()
        substitutions={
            f"WORK=Path({original!r})":f"WORK=Path({str(trial)!r})",
            "SOURCE=Path('/private/tmp/tube-lip-attribution-20261004/native-first/report.json')":f"SOURCE=Path({str(capture)!r})",
            "METHOD=Path('/private/tmp/tube-opening-shape-20261004/measure.py')":f"METHOD=Path({str(ARCHIVE/'source/air-measurement-original.py')!r})",
            "Path('/private/tmp/tube-opening-shape-20261004/receipt.json')":f"Path({str(baseline)!r})",
        }
        for original_text,replacement in substitutions.items():
            assert source.count(original_text)==1,(name,original_text)
            source=source.replace(original_text,replacement)
        (trial/'prototype.py').write_text(source)
        env=dict(os.environ);env['PYTHONDONTWRITEBYTECODE']='1'
        run=subprocess.run([sys.executable,str(trial/'prototype.py')],text=True,capture_output=True,env=env)
        if run.returncode:
            raise RuntimeError(name+' replay failed:\n'+run.stdout+'\n'+run.stderr)
        observed=json.loads((trial/'report.json').read_text())
        expected=json.loads(read_gzip(ARCHIVE/'evidence'/f'{name}-report.json.gz'))
        assert observed['actualSections']==expected['actualSections'],name+' actual sections differ'
        assert observed['cases']==expected['cases'],name+' case-frame metrics differ'
        assert observed['aggregate']==expected['aggregate'],name+' aggregate differs'
        results.append({'trial':name,'allFiveCapturedSectionsExact':True,'allEightCasesAnd293FrameRecordsExact':True,
            'aggregate':observed['aggregate'],'report':str(trial/'report.json')})
    receipt={'complete':True,'archive':str(ARCHIVE),'repository':str(repo),'output':str(output),
        'archiveManifestSha256':sha((ARCHIVE/'manifest.json').read_bytes()),'eligibleFrameCount':sum(len(c['eligible']) for c in cases),
        'comparisonScope':'Exact numeric/profile structures actualSections/cases/aggregate; dynamic source file paths/hashes are regenerated and excluded from equality.',
        'trials':results}
    (output/'replay-verification.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps(receipt,indent=2))

if __name__=='__main__':
    main()
