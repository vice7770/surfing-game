"""Root-run literal metadata check; no physics, build, native or resource operation."""
from pathlib import Path
import hashlib,json
W=Path(__file__).resolve().parent
C=Path('/private/tmp/tube-board-rhs-components-observer-20261005')
P=Path('/private/tmp/tube-native-trial-balance-native-20261005')
def pin(path):
 p=Path(path);b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
if __name__=='__main__':
 p=W/'observer-fields.json';assert p.is_file() and not p.is_symlink() and p.read_bytes()==(C/'observer-fields.json').read_bytes()
 q=pin(p);assert q['bytes']==17859 and q['sha256']=='e015b21641a592888aea8c160687edb0e4005d6c3e0ab8c0e011b2b739799fc8'
 d=json.loads(p.read_text());assert len(d['allFields'])==len(set(d['allFields']))==143 and len(d['oldFields'])==102 and len(d['newFields'])==41
 assert d['allFields']==d['oldFields']+d['newFields'] and d['availabilityMarker']=='standingTrialAvailable' and d['availabilityMarker'] in d['oldFields']
 assert d['oldFields']==json.loads((P/'observer-fields.json').read_text())['allFields']
 assert "json.loads((WORK/'observer-fields.json').read_text())['allFields']" in (W/'run.py').read_text()
 assert 'const OPERAND_FIELDS=OPERAND_METADATA.allFields;' in (W/'native.mjs').read_text()
 record={'schema':'board-rhs-components-helper-metadata-check/v1','complete':True,'sourceOnly':True,'resourcesStarted':False,'portsProbed':False,'original':pin(C/'observer-fields.json'),'copy':q,'oldFields':102,'newScalarCopies':41,'availabilityMarker':'standingTrialAvailable','fields':143,'literalCopyNotSymlink':True,'markerZeroInvalidatesStaleWords':True,'markerOneOnlyMeansTrialCaptured':True,'waterRadiationAndEntrainmentRemainMixed':True,'separateHydrodynamicAttributionAvailable':False}
 (W/'metadata-check.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record))
