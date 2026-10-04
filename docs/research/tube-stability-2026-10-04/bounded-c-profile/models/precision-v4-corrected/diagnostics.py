"""Receipts from already-evaluated query rows; no new grid or recipe changes."""
from pathlib import Path
import json,importlib.util
W=Path('/private/tmp/tube-bounded-c-precision-v4-fixed-20261004')
sp=importlib.util.spec_from_file_location('p',W/'prototype.py');p=importlib.util.module_from_spec(sp);sp.loader.exec_module(p)
r=json.load(open(W/'precision-report.json'));blocks={b['label']:b for b in r['blocks']}
q=max(r['rows'],key=lambda a:a['turns']['maximum']['absoluteTurnDegrees'] if a['turns']['maximum'] else 0)
shape,meta=p.transform(blocks[q['block']]['raw'],q['params']);reduced=[]
for a in shape:
 if not reduced or p.xy(a)!=p.xy(reduced[-1]['position']):reduced.append({'position':a,'indices':[a['point']]})
 else:reduced[-1]['indices'].append(a['point'])
i=next(i for i,a in enumerate(reduced) if set(a['indices'])==set(q['turns']['maximum']['indices']))
triplet=reduced[i-1:i+2];positions=[p.xy(a['position']) for a in triplet];lengths=[p.norm(p.sub(b,a)) for a,b in zip(positions,positions[1:])]
collapsed=[a for a in r['rows'] if not a['model']['sheetExists']];maxConnector=max(collapsed,key=lambda a:a['model']['connectorLength'])
d={'schema':'bounded-C-v4/discrete-diagnostics','samePreviouslyDeclaredQueriesOnly':True,'maximumPrecisionTurn':{'block':q['block'],'sample':q['sample'],'turn':q['turns']['maximum'],'sheetExists':meta['sheetExists'],'formation':meta['formation'],'remaining':meta['remaining'],'thickness':meta['thickness'],'minimumRepresentableThickness':meta['minimumRepresentableThickness'],'triplet':triplet,'edgeLengthsND':lengths,'edgeLengthsMetersAt7m':[a*7 for a in lengths]},'maximumCollapsedConnector':{'block':maxConnector['block'],'sample':maxConnector['sample'],'lengthND':maxConnector['model']['connectorLength'],'lengthMetersAt7m':maxConnector['model']['connectorLength']*7,'formation':maxConnector['model']['formation'],'remaining':maxConnector['model']['remaining']},'switches':[{'block':a['block'],'label':a['label'],'maximumPerIndexDisplacementND':a['maximumPerIndexDisplacement'],'maximumRetainedOuterDisplacementND':a['maximumRetainedOuterDisplacement'],'maximumRetainedTailDisplacementND':a['maximumRetainedTailDisplacement'],'sampledSymmetricContourDistanceND':a['sampledSymmetricContourDistance']} for a in r['switches']],'limits':['No all-material-index continuity claim.','Sampled contour distance is not an analytic Hausdorff bound.','Thin resolved cap normals have quantized turns; no numerical tolerance was relaxed.','3D loft/contact and native appearance need independent evidence.']}
(W/'discrete-diagnostics.json').write_text(json.dumps(d,indent=2)+'\n');print(json.dumps({k:v for k,v in d.items() if k!='switches'},indent=2))
