"""Source-only hashing/diff receipt. Does not import or execute game/test code."""
from pathlib import Path
import difflib
import hashlib
import json

work = Path(__file__).resolve().parent
baseline_receipt = json.loads((work / 'baseline.json').read_text())

def receipt(path: Path):
    data = path.read_bytes()
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

parts = []
sources = []
for original in baseline_receipt['files']:
    relative = original['path']
    baseline = work / 'baseline' / relative
    candidate = work / 'candidate' / relative
    expected = {key: original[key] for key in ['bytes', 'sha256']}
    assert receipt(baseline) == expected, ('baseline drift', relative)
    assert receipt(Path(original['originalPath'])) == expected, ('held root source drift', relative)
    sources.append({'path': relative, 'original': expected,
                    'candidate': receipt(candidate), 'originalUnchanged': True})
    parts.extend(difflib.unified_diff(baseline.read_text().splitlines(keepends=True),
                                    candidate.read_text().splitlines(keepends=True),
                                    fromfile='a/' + relative, tofile='b/' + relative))
(work / 'proposal.patch').write_text(''.join(parts))

payloads = []
for path in [work / 'baseline.json', work / 'README.md', work / 'prepare.py', work / 'proposal.patch',
             *[work / directory / entry['path'] for directory in ['baseline', 'candidate']
               for entry in baseline_receipt['files']]]:
    payloads.append({'path': str(path.relative_to(work)), **receipt(path)})

ready = {
    'schema': 'angular-cap-refinement-source-only-proposal/v1',
    'work': str(work),
    'parentReportedRootHead': baseline_receipt['parentReportedRootHead'],
    'rootHeadIndependentlyVerified': False,
    'scope': ['src/wave/barrel/sweptLoft.ts', 'src/wave/barrel/boundedCCapRefinement.test.ts'],
    'originalHeldSourceEquality': True,
    'originalSourcesWritten': False,
    'proposalStatus': 'frozen unexecuted source for root review',
    'angleTrialDegrees': 8,
    'existingLimitsRetained': {'levels': 3, 'minimumSpanMetres': 0.0625, 'maximumSagittaMetres': 0.015},
    'decisionQueries': {'capProbesPerEligibleInterval': 5, 'pointQueriesPerEligibleInterval': 10,
                        'additionalAngularQueriesPerDecision': 0},
    'treeBounds': {'testedIntervalsPerInitialInterval': 7, 'capProbes': 35,
                   'pointQueries': 70, 'insertions': 7},
    'additionalCapScratchBytes': 96,
    'tests': {'priorTestCasesRetained': 4, 'newTestCasesProposed': 4,
              'executed': False, 'results': None, 'strictTypeScriptExecuted': False},
    'localReportOnly': 'LoftResult.cSampling.capRefinement; no worker packet/serialization change',
    'limitations': [
        'No numerical, test, TypeScript, build, native, browser, Git or port execution.',
        'Saved X74.25 quarter samples are absent; no proof this trial repairs that exact 26.06 degree bend.',
        'Quarter chord turns are local pre-water/end-projection measurements, not retained mesh/C1 guarantees.',
        'Depth/spacing/precision/budget limits remain and are reported as unverified or truncated.',
        'Existing sealed hard prefix can omit later mandatory raw/clock stations in an overflowing refined plan.',
        'More eligible intervals can split, increasing total queries/rows inside the retained tree and hard caps.',
        'Generic steep C1 oracle asserts improvement and a remaining >8 degree corner, pending root execution.',
        'Actual provider planned test compares mandatory lattice/clock plan, not old positional adaptive output.',
    ],
    'files': sources,
    'payloads': payloads,
}
(work / 'readiness.json').write_text(json.dumps(ready, indent=2) + '\n')
result = {'readiness': receipt(work / 'readiness.json'), 'patch': receipt(work / 'proposal.patch'),
          'originalHeldSourcesUnchanged': True, 'payloadCount': len(payloads),
          'candidate': sources, 'codeExecuted': False}
(work / 'source-only-checks.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
