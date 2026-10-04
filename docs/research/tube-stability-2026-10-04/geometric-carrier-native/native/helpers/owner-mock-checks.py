"""Pure owner policy fixtures; actual build only if root has finalized it."""
from pathlib import Path
import importlib.util,json,copy,sys
sys.dont_write_bytecode=True
W=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('carrier_owner',W/'run.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
groups=[];initial={'4310':True,'4311':True,'4312':False}
assert m.protected_match(initial,initial);groups.append('closed4310/4311 and open4312 preserved without TCP probe')
for label,after in [('closed user4312',{'4310':True,'4311':True,'4312':True}),('reopened4310',{'4310':False,'4311':True,'4312':False}),('unknown state',{'4310':None,'4311':True,'4312':False}),('missing port',{'4310':True,'4312':False})]:
 assert not m.protected_match(initial,after);groups.append(label+' rejected')
assert not m.protected_match({'4310':True,'4311':True,'4312':True},{'4310':True,'4311':True,'4312':True});groups.append('initial closed4312 rejected')
build=None
if m.BUILD_MANIFEST.exists():
 build=json.loads(m.BUILD_MANIFEST.read_text());assert m.verify_complete_build(build,m.CANDIDATE_DIST)
 groups.append('actual finalized root complete build verified read-only')
 for key in ('rootPartialBuildResult','priorStaticAssetsSeal'):
  t=copy.deepcopy(build);t[key]['sha256']='0'*64
  try:m.verify_complete_build(t,m.CANDIDATE_DIST)
  except AssertionError:groups.append(key+' changed pin rejected')
  else:raise AssertionError('Changed pin accepted')
r={'schema':'bounded-C-carrier-support-owner-CPU-fixtures/v1','complete':True,'resourcesStarted':False,'portsProbed':False,'actualOwnerCalled':False,'actualRootCompleteBuildVerifiedReadOnly':build is not None,'awaitingRootBuild':build is None,'sourcePins':len(build['sourcePins']) if build else None,'assets':len(build['assetPins']) if build else None,'groupCount':len(groups),'groups':groups,'placeholderBuildOrSealCreated':False,'nativeLaunchStillPending':True}
(W/'owner-mock-checks.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
