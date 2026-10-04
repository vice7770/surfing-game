"""Regenerate only frozen existing golden/boundary queries for direct port comparison."""
from pathlib import Path
import importlib.util,json
W=Path('/private/tmp/tube-bounded-c-precision-v4-fixed-20261004');B=Path('/private/tmp/tube-bounded-c-profile-20261004');sp=importlib.util.spec_from_file_location('p',W/'prototype.py');p=importlib.util.module_from_spec(sp);sp.loader.exec_module(p)
def js(z):return {'crest':z['A'],'toe':z['T'],'incoming':z['ct'],'outgoing':z['tt'],'authoredTD':z['TD'],'tau':z['tau']}
def arr(points):return [v[k] for v in points for k in ('q','y')]
assert not(W/'port-reference.json').exists()
legacy=[]
for r in json.load(open(B/'port-reference.json')):
 q=r['params'];z={'A':q['crest'],'T':q['toe'],'ct':q['incoming'],'tt':q['outgoing'],'TD':q['authoredTD'],'tau':q['tau']};raw=[{'point':i,'q':r['raw'][2*i],'y':r['raw'][2*i+1]} for i in range(128)];out,m=p.transform(raw,z);assert out is not None;legacy.append({'raw':r['raw'],'expected':arr(out),'params':q,'impactTau':m['impactTau'],'thickness':m['thickness']})
report=json.load(open(W/'precision-report.json'));blocks={a['label']:a for a in report['blocks']};rows=[]
for r in report['rows']:
 raw=blocks[r['block']]['raw'];out,m=p.transform(raw,r['params']);assert out is not None
 rows.append({'block':r['block'],'sample':r['sample'],'params':js(r['params']),'expected':arr(out),'sheetExists':m['sheetExists'],'thickness':m['thickness'],'impactTau':m['impactTau'],'precisionEnvelopeBound':m.get('collapseGeometryBound',0),'precisionEnvelopeBudget':m.get('collapseSpatialBudget',.001*max(m['W'],m['H'])),'connectorLength':m.get('connectorLength',0)})
(W/'port-reference.json').write_text(json.dumps({'legacy39':legacy,'rawBlocks':{k:arr(v['raw']) for k,v in blocks.items()},'precision522':rows},separators=(',',':'))+'\n');print('goldens',len(legacy),len(rows),(W/'port-reference.json').stat().st_size)
