"""Exercise the new validator on actual retained transitions; never alter old receipts."""
from pathlib import Path
import ast, copy, hashlib, importlib.util, json, sys
sys.dont_write_bytecode=True
W=Path(__file__).resolve().parent
P=Path('/private/tmp/tube-bounded-c-parallel-native-20261004/candidate-first/report.json')
def pin(p):
    b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
ast.parse((W/'run.py').read_text())
spec=importlib.util.spec_from_file_location('mouth_owner',W/'run.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
r=json.loads(P.read_text())
events=[o for o in r['observations'] if o.get('lineageDecision',{}).get('componentLineageEvent')]
assert len(events)==4
for o in events: assert m.validate_lineage_event(o['lineageDecision'],o)
for mutation in ('claim','missing','duplicate','mismatch','gate'):
    o=copy.deepcopy(events[0]);e=o['lineageDecision']
    if mutation=='claim': e['materialTrajectoryClaim']=True
    if mutation=='missing': del e['materialTrajectoryClaim']
    if mutation=='duplicate': e['provenOrderedInternalPointIDs']=[158,158]
    if mutation=='mismatch': e['provenOrderedInternalPointIDs']=[1,2]
    if mutation=='gate': next(c for c in e['testedCandidates'] if c['qualified'])['gates']['sameOrderedTwoInternalPointIDs']=False
    try: m.validate_lineage_event(e,o);raise RuntimeError('Mutation accepted '+mutation)
    except (AssertionError,KeyError): pass
build=json.loads(m.BUILD_MANIFEST.read_text())
assert m.verify_complete_build(build,m.CANDIDATE_DIST)
states={'4310':True,'4311':True,'4312':False}
assert m.protected_match(states,states)
assert not m.protected_match(states,{**states,'4312':True})
assert not m.protected_match(states,{**states,'4310':False})
result={'complete':True,'actualRecordedTransitionsPassed':4,'schemaOrIdentityMutationsRejected':5,
        'actualFrozenBuildProvenanceChecked':True,'protectedStateFixtures':3,
        'inputCapture':pin(P),'oldOwnerRewrittenOrRetroaccepted':False,
        'resourcesStarted':False,'portsProbed':False}
(W/'owner-event-checks.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
