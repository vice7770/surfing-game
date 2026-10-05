"""Root-run direct receipt verification only; no tests, build, resources or port probes."""
from pathlib import Path
import json
from authority import W,record,direct_inputs,preparation
def main():
 assert not (W/'inputs.json').exists(),'First-only direct binder preserves prior receipt'
 preparation();t=json.loads((W/'inputs.template.json').read_text());assert t['rootBound'] is False
 direct_inputs(t)
 t.update(rootBound=True,resourcesStarted=False,portsProbed=False,bindingPerformedByRoot=True,applicationRebuilt=False,geometryOrPhysicsChanged=False)
 (W/'inputs.json').write_text(json.dumps(t,indent=2)+'\n')
 print(json.dumps({'schema':'c-line-steering-root-binding/v1','complete':True,'inputs':record(W/'inputs.json'),'resourcesStarted':False,'portsProbed':False,'nativeRun':False}))
if __name__=='__main__':main()
