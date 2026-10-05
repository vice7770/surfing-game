"""Root-run literal metadata check; no source, physics, build, native or resource operation."""
from pathlib import Path
import hashlib,json
W=Path(__file__).resolve().parent
O=Path('/private/tmp/tube-native-trial-balance-observer-20261005')
def pin(path):
 p=Path(path);b=p.read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
if __name__=='__main__':
 p=W/'observer-fields.json';assert p.is_file() and not p.is_symlink() and p.read_bytes()==(O/'observer-fields.json').read_bytes()
 q=pin(p);assert q['bytes']==8731 and q['sha256']=='19917b765b18c8b1e37e608878e9041115e1b96fdd21d46451a36d375554d72a'
 d=json.loads(p.read_text());assert len(d['allFields'])==len(set(d['allFields']))==102 and len(d['originalFields'])==38 and len(d['newFields'])==63
 assert d['allFields']==d['originalFields']+d['newFields']+[d['availabilityMarker']] and d['availabilityMarker']=='standingTrialAvailable'
 assert "json.loads((WORK/'observer-fields.json').read_text())['allFields']" in (W/'run.py').read_text()
 assert 'const OPERAND_FIELDS=OPERAND_METADATA.allFields;' in (W/'native.mjs').read_text()
 record={'schema':'trial-balance-helper-metadata-check/v1','complete':True,'sourceOnly':True,'resourcesStarted':False,'portsProbed':False,'original':pin(O/'observer-fields.json'),'copy':q,'originalFields':38,'newScalarCopies':63,'availabilityMarker':1,'fields':102,'literalCopyNotSymlink':True,'markerOneOnlyMeansTrialCaptured':True,'separateHydrodynamicAttributionAvailable':False}
 (W/'metadata-check.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record))
