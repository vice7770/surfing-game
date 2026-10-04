# Read-only new complete build + owner contract fixtures; no main/run/TCP/native call.
from pathlib import Path
import importlib.util,json,hashlib,copy,sys
sys.dont_write_bytecode=True
W=Path('/private/tmp/tube-bounded-c-parallel-physics-mouth-native-20261004')
spec=importlib.util.spec_from_file_location('finite_owner',W/'run.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def pin(p):
 p=Path(p);b=p.read_bytes();return {'file':str(p.resolve()),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
fixture=W/'owner-fixture';fixture.mkdir(exist_ok=True);m.WORK=fixture;groups=[]
buildpath=W/'root-complete-build-result.json';build=json.loads(buildpath.read_text())
helpers=[W/f for f in ['run.py','native.mjs','native-owned.mjs','moving-shape.mjs','station-tools.mjs','mouth-tools.mjs','mock-checks.mjs']]+[Path('/private/tmp/tube-directed-entry-20261004/body-witnesses.mjs'),Path('/Users/regina/Desktop/Projects/surfing-game/scripts/browser/cdp.mjs')]
s={'schema':'bounded-C-parallel-physics-mouth-root-seal/v1','complete':True,'priorAirSeal':pin('/private/tmp/tube-bounded-c-air-native-20261004/seal.json'),'priorFullsheetSeal':pin('/private/tmp/tube-bounded-c-fullsheet-native-20261004/seal.json'),'arms':{'candidate':{'rootAuthorized':True,'source':build['source'],'dist':build['frozenDist'],'buildId':build['buildId'],'sourcePins':build['sourcePins'],'assetPins':build['assetPins'],'rootBuildManifest':pin(buildpath)}},'helperPins':[pin(p) for p in helpers]}
def accept(value):
 (fixture/'seal.json').write_text(json.dumps(value));return m.sealed('candidate')
def rejects(label,value):
 try:accept(value)
 except (AssertionError,FileNotFoundError,KeyError):groups.append(label)
 else:raise AssertionError('Expected reject '+label)
_,a,dist,_=accept(s);assert str(dist)==str(W/'candidate-complete-dist');groups.append('actual new source/49 asset/21 build+28 static provenance accepted read-only; no old-arm equality')
t=copy.deepcopy(s);t['priorAirSeal']['sha256']='0'*64;rejects('changed prior air provenance seal rejected',t)
t=copy.deepcopy(s);t['arms']['candidate']['dist']='/private/tmp/tube-bounded-c-native-20261004/candidate-dist';rejects('old candidate dist rejected',t)
t=copy.deepcopy(s);t['arms']['candidate']['dist']=str(W/'candidate-dist');rejects('partial new candidate dist rejected',t)
t=copy.deepcopy(s);t['helperPins']=[p for p in t['helperPins'] if Path(p['file']).name!='station-tools.mjs'];rejects('missing station helper rejected',t)
t=copy.deepcopy(s);t['helperPins'][0]['sha256']='0'*64;rejects('changed new helper rejected',t)
t=copy.deepcopy(s);t['arms']['candidate']['assetPins'][0]['sha256']='0'*64;rejects('asset pins disagree with complete composition rejected',t)
t=copy.deepcopy(s);t['arms']['candidate']['sourcePins'][0]['sha256']='0'*64;rejects('source pins disagree with root build manifest rejected',t)
t=copy.deepcopy(s);t['arms']['candidate']['rootBuildManifest']['file']='/private/tmp/tube-bounded-c-native-20261004/root-build-result.json';rejects('old root build manifest rejected',t)
t=copy.deepcopy(s);t['arms']['candidate']['buildId']='wrong';rejects('wrong candidate build id rejected',t)
for label,key in [('changed original partial-build receipt','rootPartialBuildResult'),('changed sealed old static-source provenance','priorStaticAssetsSeal')]:
 t=copy.deepcopy(build);t[key]['sha256']='0'*64
 try:m.verify_complete_build(t,dist)
 except AssertionError:groups.append(label+' rejected')
 else:raise AssertionError('Expected reject '+label)
initial={'4310':True,'4311':True,'4312':False}
assert m.protected_match(initial,initial);groups.append('current closed4310/4311 and open4312 states accepted/preserved without TCP probe')
for label,after in [('closed user play4312',{'4310':True,'4311':True,'4312':True}),('reopened old4310',{'4310':False,'4311':True,'4312':False}),('unknown transient protected state',{'4310':None,'4311':True,'4312':False}),('missing protected port',{'4310':True,'4312':False})]:
 assert not m.protected_match(initial,after);groups.append(label+' rejected by exact protected-state policy')
assert not m.protected_match({'4310':True,'4311':True,'4312':True},{'4310':True,'4311':True,'4312':True});groups.append('initial closed4312 cannot launch new finite arm')
(fixture/'seal.json').unlink()
r={'schema':'bounded-C-parallel-physics-mouth-owner-CPU-fixtures/v1','complete':True,'resourcesStarted':False,'portsProbed':False,'actualOwnerCalled':False,'actualRootCompleteBuildVerifiedReadOnly':True,'sourcePins':len(build['sourcePins']),'assets':49,'groupCount':len(groups),'groups':groups,'fixtureSealRemoved':True,'nativeLaunchStillPending':True}
(W/'owner-mock-checks.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
