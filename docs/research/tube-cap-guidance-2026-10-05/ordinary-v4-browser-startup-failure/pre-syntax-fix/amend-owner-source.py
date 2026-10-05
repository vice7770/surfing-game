from pathlib import Path
W=Path('/private/tmp/tube-guided-ordinary-v4-telemetry-native-20261005');V3=Path('/private/tmp/tube-guided-ordinary-v3-native-20261005');V2=Path('/private/tmp/tube-shared-leaf-native-v2-20261005')
def replace(s,old,new):
 assert s.count(old)==1,(old[:100],s.count(old));return s.replace(old,new)
old=(V3/'run.py').read_text();validation=old[old.index('def array_bytes('):old.index('sealbytes=')]
validation=validation.replace('guided-ordinary-native/v2','guided-ordinary-native/v4').replace('<=4 and len(lofts)','<=limits[\'pngCount\'] and len(lofts)')
needle="   body=row['ride']['tubeBody'];assert body['seaTime']==row['seaTime']and len(body['renderPoints'])==len(body['partSpheres'])==7"
extra="""   observation=row['ride']['tubeApproachObservation'];assert observation['schema']=='tube-approach-observation/v1'and observation['seaTime']==row['seaTime']
   assert isinstance(observation['geometryStep'],int)and observation['geometryStep']>=0
   for key in('eligibleMaturePairs','nondegenerateMatureCapSegments','candidatesInReach','endpointDuplicatesSkipped','routesAttempted','columnCalls','clearRouteCalls'):
    assert isinstance(observation[key],int)and observation[key]>=0
   assert observation['routesAttempted']<=observation['candidatesInReach']and observation['nondegenerateMatureCapSegments']<=observation['eligibleMaturePairs']
   assert len(observation['rejectionCounts'])<=15 and all(isinstance(count,int)and count>0 for count in observation['rejectionCounts'].values())
   assert sum(observation['rejectionCounts'].values())<=observation['routesAttempted']
   guide=row['ride']['tubeApproach'];assert(observation['outcome']=='accepted')==(guide is not None)
   if guide:
    assert guide['seaTime']==row['seaTime']and observation['accepted']['bodyFitsMouth']==guide['bodyFitsMouth']and observation['accepted']['bodyInCavity']==guide['bodyInCavity']
   assert all(math.isfinite(value)and value>=0 for value in row['observerTiming'].values())
"""
assert validation.count(needle)==1;validation=validation.replace(needle,needle+'\n'+extra)
needle=" assert result['checkpoints'][0]['label']=='initial'and result['checkpoints'][-1]['label']=='terminal'"
extra=""" assert result['policy']['passiveSameQueryApproachTelemetry']and result['policy']['telemetryNeverFeedsControl']and result['policy']['observerClassifierUnoptimized']
 assert len(result['checkpoints'])<=len(inputs['milestonePolicy']['labels'])
 for checkpoint in result['checkpoints']:
  assert checkpoint['label']in inputs['milestonePolicy']['labels']
  assert math.isfinite(checkpoint['nativeCheckpointWallMs'])and checkpoint['nativeCheckpointWallMs']>=0
"""
assert validation.count(needle)==1;validation=validation.replace(needle,needle+'\n'+extra)
# Check that milestone images correspond to the first qualifying recorded step, never selected by appearance.
needle=" assert result['terminalBody']['step']==result['stepCount']and result['terminalBody']['seaTime']==previous"
extra=""" for label,predicate in [('first-standing',lambda row:row['ride']['phase']=='standing'),('first-guide',lambda row:row['ride'].get('tubeApproach')is not None),('first-partial-entry',lambda row:row.get('unionWitness')is not None and row['unionWitness']['classification']=='partial')]:
  first=next((row for row in rows if predicate(row)),None)
  observed=next((checkpoint for checkpoint in result['checkpoints']if checkpoint['label']==label),None)
  assert(first is None)==(observed is None)
  if first:assert observed['step']==first['step']and result['phaseMilestones'][label]['step']==first['step']
"""
assert validation.count(needle)==1;validation=validation.replace(needle,extra+needle)
s=(V2/'run.py').read_text().replace(str(V2),str(W)).replace('shared-leaf-seal/v2','guided-ordinary-seal/v4').replace('shared-leaf-build/v2','guided-ordinary-build/v4').replace('shared-leaf-owner/v2','guided-ordinary-owner/v4')
start=s.index('def validate_result(');end=s.index('sealbytes=');s=s[:start]+validation+s[end:]
s=replace(s,'import hashlib,json,os,signal,socket,subprocess,threading,time','import base64,hashlib,json,math,os,signal,socket,struct,subprocess,threading,time')
s=replace(s,"build=json.loads(verify(seal['applicationBuild']));assert build['schema']=='guided-ordinary-build/v4' and build['build']==inputs['applicationBuildId']", "build=json.loads(verify(seal['applicationBuild']));assert build['schema']=='guided-ordinary-build/v4' and build['complete']and build['build']==inputs['buildId']")
s=replace(s," for spec in build['assets']+build['sources']+build['liveSources']+seal['helpers']+seal['borrowedHelpers']+seal['references']:", " for spec in build['assets']+build['productionSources']+build['diagnosticCompiledSources']+seal['helpers']+seal['borrowedHelpers']+seal['references']+build['applicationBuildAssets']+[seal['diagnosticModule'],seal['diagnosticBuild'],build['rootBuildAuthority'],build['applicationBuildLog'],build['diagnosticBuildLog']:")
s=replace(s,"closure=json.loads(verify(inputs['priorFailedAttempt']['rootClosureReceipt']))", "closure=json.loads(verify(inputs['protectedIdentityReference']))")
s=replace(s,"record['priorFailedAttempt']=inputs['priorFailedAttempt']", "record['priorObservation']=inputs['priorObservation']")
s=replace(s," 'sealSha256':hashlib.sha256(sealbytes).hexdigest(),", " 'applicationBuild':seal['applicationBuild'],'sourceFreeze':seal['sourceFreeze'],'diagnosticBuild':seal['diagnosticBuild'],\n 'sealSha256':hashlib.sha256(sealbytes).hexdigest(),")
s=replace(s," def log_message(self,*args):pass\ntry:", " def log_message(self,*args):pass\n def do_GET(self):\n  if self.path.split('?')[0]=='/diagnostic-autopilot.mjs':\n   raw=verify(seal['diagnosticModule']);self.send_response(200);self.send_header('Content-Type','text/javascript');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)\n  else:super().do_GET()\ntry:")
s=s.replace("'SHARED_LEAF_OWNER_SEAL_SHA'","'GUIDED_OWNER_SEAL_SHA'")
s=replace(s,"record['observation']=validate_result(json.loads((W/'candidate-first/report.json').read_bytes()))", "record['observation']=validate_result(json.loads((W/'candidate-first/report.json').read_bytes()),seal['limits'])")
(W/'run.py').write_text(s)
