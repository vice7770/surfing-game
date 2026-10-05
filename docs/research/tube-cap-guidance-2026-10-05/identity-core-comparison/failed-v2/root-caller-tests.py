"""Synthetic tests of exact extracted caller functions; no OS/Popen/native execution."""
import ast,json,subprocess,sys,unittest
from pathlib import Path
from types import SimpleNamespace
W=Path('/private/tmp/tube-leaf-identity-core-native-v2-20261005')
sys.path.insert(0,str(W))
import owned_group_anchor as anchor

class Clock:
 def __init__(self,values):self.values=list(values);self.last=values[-1]
 def monotonic(self):
  if self.values:self.last=self.values.pop(0)
  return self.last
 def sleep(self,_seconds):pass

def environment(values):
 tree=ast.parse((W/'run.py').read_text());names={'OwnedReadExpired','note_timeout','required_read','remember_owned'}
 selected=[v for v in tree.body if isinstance(v,(ast.FunctionDef,ast.ClassDef))and v.name in names]
 env={name:getattr(anchor,name)for name in ['Identity','ProtectedIdentity','LaunchFacts','ReadWindow','AnchorRejected','observe_owned_group','identity_evidence','observation_record']}
 authority=json.loads(Path('/private/tmp/tube-five-protected-preview-identities-20261005.json').read_text())
 protected={int(port):(anchor.ProtectedIdentity(**v['actualIdentity']),)for port,v in authority['protectedIdentities'].items()}
 argv=['/opt/homebrew/bin/node',str(W/'native.mjs'),'--synthetic-caller-fixture'];command=' '.join(argv)
 env.update(time=Clock(values),subprocess=subprocess,OS_SECONDS=2,NOTE_LIMIT=16,REQUIRED_ATTEMPTS=3,
  whole_started=100,timeout_count=0,timeout_notes=[],record={},native_argv=argv,expected_native_command=command,OWNED=(4301,9711),
  protected_reference=protected,protected_before=protected,owned_state=None,latest_observation=None,
  proc=SimpleNamespace(pid=123,args=argv,poll=lambda:None),
  group_identities=lambda _pid,_deadline:{123:{'pid':123,'pgid':123,'started':'synthetic fixed leader start','command':command}})
 exec(compile(ast.Module(body=selected,type_ignores=[]),str(W/'run.py')+' [extracted source]', 'exec'),env)
 return env

class Caller(unittest.TestCase):
 def assert_expired(self,values):
  e=environment(values);previous=SimpleNamespace(observation_number=7);old_observation=object();e['owned_state']=previous;e['latest_observation']=old_observation
  called=[];e['observe_owned_group']=lambda *_args,**_kwargs:called.append(True)
  with self.assertRaises(e['OwnedReadExpired'])as caught:e['remember_owned'](1000,'periodic-owned-identity')
  self.assertIs(e['owned_state'],previous);self.assertIs(e['latest_observation'],old_observation);self.assertFalse(called)
  self.assertFalse(caught.exception.evidence['pureObservationCalled']);self.assertFalse(caught.exception.evidence['acceptedStateRefreshed'])
 def test_completed_duration_over_two_seconds_rejected_without_refresh(self):self.assert_expired([100,102.059,102.059])
 def test_completed_age_over_two_seconds_rejected_without_refresh(self):self.assert_expired([100,101,103.059])
 def test_fresh_read_uses_exact_pure_bootstrap(self):
  e=environment([100,100.1,100.11]);observed=e['remember_owned'](1000,'initial-owned-leader')
  self.assertEqual(observed.anchor_kind,'original-leader/bootstrap');self.assertEqual(observed.state.observation_number,1);self.assertIs(e['latest_observation'],observed)
 def test_required_expiry_retries_and_can_accept_later_fresh_result(self):
  e=environment([500]);calls=[];sentinel=object()
  def read(_deadline):
   calls.append(True)
   if len(calls)==1:raise e['OwnedReadExpired']({'durationSeconds':2.059,'ageSeconds':0})
   return sentinel
  self.assertIs(e['required_read'](read,'required-caller-fixture',1000),sentinel);self.assertEqual(len(calls),2);self.assertEqual(e['timeout_count'],1)
 def test_required_expiry_stops_at_three_attempts(self):
  e=environment([500]);calls=[]
  def read(_deadline):calls.append(True);raise e['OwnedReadExpired']({'durationSeconds':2.059,'ageSeconds':0})
  with self.assertRaises(TimeoutError):e['required_read'](read,'required-caller-fixture',1000)
  self.assertEqual(len(calls),3);self.assertEqual(e['timeout_count'],3)
 def test_genuine_anchor_rejection_is_never_retried(self):
  e=environment([500]);calls=[]
  def read(_deadline):calls.append(True);raise anchor.AnchorRejected('synthetic changed leader',{})
  with self.assertRaises(anchor.AnchorRejected):e['required_read'](read,'required-caller-fixture',1000)
  self.assertEqual(len(calls),1);self.assertEqual(e['timeout_count'],0)

if __name__=='__main__':unittest.main(verbosity=2)
