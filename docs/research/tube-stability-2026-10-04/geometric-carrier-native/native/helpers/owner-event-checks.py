"""Old actual identity compatibility and NEW synthetic carrier schema; no retroacceptance."""
from pathlib import Path
import ast, copy, hashlib, importlib.util, json, sys
sys.dont_write_bytecode=True
W=Path(__file__).resolve().parent
P=Path('/private/tmp/tube-bounded-c-parallel-native-20261004/candidate-first/report.json')
def pin(p):
 b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
ast.parse((W/'run.py').read_text())
spec=importlib.util.spec_from_file_location('carrier_owner',W/'run.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
r=json.loads(P.read_text());events=[o for o in r['observations'] if o.get('lineageDecision',{}).get('componentLineageEvent')]
assert len(events)==4
for o in events:assert m.validate_identity_portion(o['lineageDecision'],o)
for mutation in ('claim','missing','duplicate','mismatch','gate'):
 o=copy.deepcopy(events[0]);e=o['lineageDecision']
 if mutation=='claim':e['materialTrajectoryClaim']=True
 if mutation=='missing':del e['materialTrajectoryClaim']
 if mutation=='duplicate':e['provenOrderedInternalPointIDs']=[158,158]
 if mutation=='mismatch':e['provenOrderedInternalPointIDs']=[1,2]
 if mutation=='gate':next(c for c in e['testedCandidates'] if c['qualified'])['gates']['sameOrderedTwoInternalPointIDs']=False
 try:m.validate_identity_portion(e,o)
 except (AssertionError,KeyError):pass
 else:raise AssertionError('Mutation accepted '+mutation)
f=W/'carrier-event-fixtures.json';fixture=json.loads(f.read_text());assert fixture['mockOnly'] and fixture['sourceLeaseSemanticsProven'] is False
for row in fixture['events']:assert m.validate_lineage_event(row['event'],row['observation'])
for mutation in ('claim','policy','atTau','state','bound','fingerprint','id'):
 row=copy.deepcopy(fixture['events'][0]);e=row['event'];c=next(c for c in e['testedCandidates'] if c['qualified']);p=c['publicPointIdentity']['points'][0]
 if mutation=='claim':e['materialTrajectoryClaim']=True
 if mutation=='policy':e['carrierSupportIsDynamicNotImmutableFingerprint']=False
 if mutation=='atTau':p['carrierSupport']['atTau']+=.01
 if mutation=='state':p['carrierSupport']['state']='own-pocket'
 if mutation=='bound':p['carrierSupport']['incidents'][0]['boundSeconds']=0
 if mutation=='fingerprint':p['jetUntil']+=.01
 if mutation=='id':p['id']+=1
 try:m.validate_lineage_event(e,row['observation'])
 except (AssertionError,KeyError):pass
 else:raise AssertionError('Carrier mutation accepted '+mutation)
direct=json.loads((W/'carrier-probe-fixtures.json').read_text());assert direct['mockOnly'] and direct['newSourceNativeLeaseProven'] is False
for o in direct['observations']:assert m.validate_carrier_probes(o)
for mutation in ('duplicate','threshold','immutable','history'):
 o=copy.deepcopy(direct['observations'][1]);e=o['carrierHistoryEvidence'][0]
 if mutation=='duplicate':o['carrierHistoryEvidence'].append(copy.deepcopy(e))
 if mutation=='threshold':e['triggerPackets'][0]['raw']['tau']=m.f32(e['triggerPackets'][0]['initialImmutableJetUntil'])
 if mutation=='immutable':e['publicPointIdentity']['points'][0]['jetUntil']+=.001
 if mutation=='history':e['publicPointIdentity']['points'][0]['carrierSupport']['retainedForGeometry']=False
 try:m.validate_carrier_probes(o)
 except (AssertionError,KeyError):pass
 else:raise AssertionError('Direct probe mutation accepted '+mutation)
result={'complete':True,'actualRecordedIdentityTransitionsPassed':4,'oldActualEventsProveNewLeaseSemantics':False,'oldSchemaOrIdentityMutationsRejected':5,'syntheticCarrierEventsPassed':len(fixture['events']),'syntheticCarrierMutationsRejected':7,'syntheticDirectProbeObservationsPassed':len(direct['observations']),'syntheticDirectProbeMutationsRejected':4,'inputCapture':pin(P),'syntheticFixture':pin(f),'oldOwnerRewrittenOrRetroaccepted':False,'actualNewNativeCarrierProofPending':True,'resourcesStarted':False,'portsProbed':False}
(W/'owner-event-checks.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
