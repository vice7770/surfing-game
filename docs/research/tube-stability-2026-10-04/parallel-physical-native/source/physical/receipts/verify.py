#!/usr/bin/env python3
"""Read-only source-pin checks plus disposable patch reconstruction within this experiment."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

W = Path(__file__).resolve().parent
SOURCE = W / 'source'
RUNTIME = ['src/wave/barrel/SweptCrash.ts', 'src/wave/barrel/crashCurve.ts']
TEST = 'src/wave/barrel/parallelPhysicalCoupling.test.ts'


def pin(path):
    data = path.read_bytes()
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def verify():
    copy = json.loads((W / 'parent-copy.json').read_text())
    parent = Path(copy['parentSource'])
    manifest = json.loads((W / 'source-pins.json').read_text())
    assert pin(Path(copy['parentReadiness']['file'])) == {
        k: copy['parentReadiness'][k] for k in ['bytes', 'sha256']
    }, 'frozen parent readiness changed'
    parent_paths = {r['path'] for r in copy['files']}
    assert len(parent_paths) == 579
    changed = []
    for row in copy['files']:
        expected = {k: row[k] for k in ['bytes', 'sha256']}
        assert pin(parent / row['path']) == expected, f"frozen parent changed: {row['path']}"
        if pin(SOURCE / row['path']) != expected:
            changed.append(row['path'])
    assert sorted(changed) == sorted(RUNTIME), changed
    actual_paths = set()
    for directory, subdirs, filenames in os.walk(SOURCE, followlinks=False):
        subdirs[:] = [d for d in subdirs if d != 'node_modules']
        for name in filenames:
            actual_paths.add((Path(directory) / name).relative_to(SOURCE).as_posix())
    pinned_paths = {r['path'] for r in manifest['files']}
    assert actual_paths == pinned_paths == parent_paths | {TEST}
    assert len(pinned_paths) == 580
    for row in manifest['files']:
        assert pin(SOURCE / row['path']) == {k: row[k] for k in ['bytes', 'sha256']}, row['path']
    logs = {}
    with tempfile.TemporaryDirectory(prefix='patch-reconstruction-', dir=W) as temporary:
        rebuilt = Path(temporary)
        for rel in RUNTIME:
            (rebuilt / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(parent / rel, rebuilt / rel)
        for patch in ['runtime.patch', 'tests.patch']:
            run = subprocess.run(['patch', '--batch', '--forward', '-p1', '-i', str(W / patch)],
                                 cwd=rebuilt, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            assert run.returncode == 0, run.stdout
            logs[patch] = {'exitCode': run.returncode, 'actualStdoutAndStderr': run.stdout}
        for rel in RUNTIME + [TEST]:
            assert (rebuilt / rel).read_bytes() == (SOURCE / rel).read_bytes(), rel
    return {
        'schema': 'bounded-C/parallel-physical-coupling-verification/v1',
        'passed': True,
        'parentPinnedFilesStillExact': 579,
        'newSourcePinnedFiles': 580,
        'unchangedParentFiles': 577,
        'runtimeChangedFiles': RUNTIME,
        'newTestFiles': [TEST],
        'runtimeAndTestPatchReconstructionByteExact': True,
        'patchCommands': logs,
        'dependenciesSymlink': str((SOURCE / 'node_modules').resolve()),
        'dependencyBytesPinned': False,
        'buildPerformed': False,
        'nativeResourcesStarted': False,
        'browserUsed': False,
        'portsProbedOrChanged': False,
        'gitUsed': False,
    }


if __name__ == '__main__':
    print(json.dumps(verify(), indent=2))
