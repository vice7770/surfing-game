"""Root-run source/adapter check only; never executes native code, tests, builds, or port probes."""
from pathlib import Path
import ast,hashlib,importlib.util,json,sys
sys.dont_write_bytecode=True
W=Path(__file__).resolve().parent
P=Path('/private/tmp/tube-landing-longitudinal-native-20261005')
V11=Path('/private/tmp/tube-pop-up-contact-operands-native-v11-20261005')
def pin(path):
 p=Path(path);b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def function(source,name):
 tree=ast.parse(source);node=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name==name)
 return ast.get_source_segment(source,node)
if __name__=='__main__':
 for name in ['run.py','check-source.py','metadata-check.py','freeze.py']:ast.parse((W/name).read_text())
 old=(P/'native.mjs').read_text();native=(W/'native.mjs').read_text()
 assert native.split('async function startupDiagnosticBound(',1)[1]==old.split('async function startupDiagnosticBound(',1)[1]
 assert native.split('const started=performance.now()',1)[1].split('const report=',1)[0]==old.split('const started=performance.now()',1)[1].split('const report=',1)[0]
 for token in ["',PORT=4301,CDP=9711,DT=1/60;",'ridePauseWaitMilliseconds:180000','635000','for(let i=0;i<2160;i++)','if(row.step-videoStartStep>=240)await finishClip();']:assert token in native,token
 current=(W/'run.py').read_text();parent=(P/'run.py').read_text()
 for name in ['validate_camera','validate_rows','validate_native','terminal_owner_limits','protected_match','tcp','members','main']:
  text=function(current,name).replace('trial-balance-native/v1','pop-up-contact-longitudinal-native/v1').replace('trial-balance-finite-owner/v1','pop-up-contact-longitudinal-finite-owner/v1')
  text=text.replace("json.loads((WORK/'observer-fields.json').read_text())['allFields']","json.loads((WORK/'observer-fields.json').read_text())")
  assert text==function(parent,name),name
 metadata=json.loads((W/'observer-fields.json').read_text())
 assert (W/'observer-fields.json').read_bytes()==Path('/private/tmp/tube-native-trial-balance-observer-20261005/observer-fields.json').read_bytes()
 assert len(metadata['allFields'])==len(set(metadata['allFields']))==102 and len(metadata['originalFields'])==38 and len(metadata['newFields'])==63
 assert metadata['originalFields']==json.loads(Path('/private/tmp/tube-pop-up-contact-operands-native-v8-20261005/observer-fields.json').read_text())
 spec=importlib.util.spec_from_file_location('trial_balance_owner_source_check',W/'run.py');owner=importlib.util.module_from_spec(spec);spec.loader.exec_module(owner)
 authority,rows=owner.verify_source_authority(pin(W/'source-readiness.json'))
 borrowed=json.loads((V11/'source-helper-checks.json').read_text())['borrowedHelpers'];assert len(borrowed)==9
 for q in borrowed:assert pin(q['file'])==q
 record={'schema':'trial-balance-source-helper-checks/v1','complete':True,'sourceOnly':True,'resourcesStarted':False,'portsProbed':False,'numericalExecution':False,'buildExecuted':False,'nativeExecuted':False,'sourceReadiness':pin(W/'source-readiness.json'),'candidateRuntime':authority['candidateRuntime'],'sourcePreparationCount':588,'applicationSourceCount':587,'oneObserverRuntimeChanged':'src/physics/AttachedRider.ts','originalFields':38,'newScalarCopies':63,'availabilityMarker':1,'totalFields':102,'executableReplayStartupMovieTailAndControlsUnchanged':True,'borrowedHelpers':borrowed,'actualAppBuildAccepted':False,'actualDiagnosticBuildAccepted':False,'helperAcceptance':False}
 (W/'source-helper-checks.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record))
