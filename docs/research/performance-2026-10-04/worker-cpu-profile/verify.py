#!/usr/bin/env python3
"""Read retained data, hashes and arithmetic only; optional immutable Git reads. No runtime replay."""
from pathlib import Path
from collections import Counter,defaultdict
from datetime import datetime
import argparse,gzip,hashlib,json,math,subprocess
A=Path(__file__).resolve().parent
arg=argparse.ArgumentParser();arg.add_argument('--git',action='store_true');args=arg.parse_args()
M=json.loads((A/'manifest.json').read_text());digest=lambda b:hashlib.sha256(b).hexdigest()
def check(v,msg):
 if not v:raise AssertionError(msg)
def near(a,b,msg):check(math.isfinite(a) and math.isfinite(b) and abs(a-b)<=1e-8*max(1,abs(b)),msg)
contents={}
for p in M['payloads']:
 encoded=(A/p['path']).read_bytes();check(len(encoded)==p['bytes'] and digest(encoded)==p['sha256'],'Encoded bytes '+p['path']);b=gzip.decompress(encoded);check(len(b)==p['contentBytes'] and digest(b)==p['contentSha256'],'Decoded bytes '+p['path']);contents[p['path']]=b
aliases={r['originalPath']:r for r in M['aliases']};check(len(aliases)==len(M['aliases']),'Duplicate original aliases')
for r in M['aliases']:
 b=contents[r['payload']];check(len(b)==r['bytes'] and digest(b)==r['sha256'],'Alias bytes '+r['originalPath'])
gitrefs={r['originalPath']:r for r in M['gitReferences']};check(len(gitrefs)==len(M['gitReferences']),'Duplicate Git refs')
def data(path):check(path in aliases,'Missing stored alias '+path);return contents[aliases[path]['payload']]
def obj(path):return json.loads(data(path))
def pin(r):
 path=r.get('originalPath',r['path']);p=aliases.get(path) or gitrefs.get(path);check(p is not None,'Unresolved pin '+path);check(p['bytes']==r['bytes'] and p['sha256']==r['sha256'],'Pin differs '+path)
pin_count=0
def walk(v):
 global pin_count
 if isinstance(v,dict):
  if set(['path','bytes','sha256'])<=v.keys() and isinstance(v['path'],str) and isinstance(v['bytes'],int) and isinstance(v['sha256'],str):pin(v);pin_count+=1
  for x in v.values():walk(x)
 elif isinstance(v,list):
  for x in v:walk(x)
for r in M['aliases']:
 if r['originalPath'].endswith('.json'):walk(obj(r['originalPath']))
R=Path(M['repository']);git_checked=0
if args.git:
 tree={}
 for row in subprocess.check_output(['git','ls-tree','-r','-z',M['runtimeCommit']],cwd=R).split(b'\0'):
  if row:
   meta,path=row.split(b'\t',1);tree[path.decode()]=meta.decode().split()[2]
 proc=subprocess.Popen(['git','cat-file','--batch'],cwd=R,stdin=subprocess.PIPE,stdout=subprocess.PIPE)
 for r in M['gitReferences']:
  # Verify immutable commit-tree membership, not current working-tree contents.
  check(r['commit']==M['runtimeCommit'] and tree.get(r['repositoryPath'])==r['blob'],'Immutable tree relation '+r['repositoryPath'])
  proc.stdin.write((r['blob']+'\n').encode());proc.stdin.flush();header=proc.stdout.readline().decode().split();check(len(header)==3 and header[0]==r['blob'] and header[1]=='blob','Git blob header');b=proc.stdout.read(int(header[2]));check(proc.stdout.read(1)==b'\n','Git delimiter');check(len(b)==r['bytes'] and digest(b)==r['sha256'],'Git blob bytes '+r['repositoryPath']);git_checked+=1
 proc.stdin.close();check(proc.wait()==0,'Git batch exit')
receipt=obj(M['runtimeReceipt']);compiled={r['path']:r for r in receipt['build']['compiledFiles']};check(len(compiled)==11,'Accepted dist count')
for r in compiled.values():pin(r);check(r['path'] in aliases,'Ignored dist must have durable bytes')
public=obj(M['publicWhitelist']);check(public['fileCount']==38 and len(public['files'])==38,'Public38')
for r in public['files']:
 g=gitrefs.get(r['originalPath']);check(g is not None and g['bytes']==r['bytes'] and g['sha256']==r['sha256'],'Public immutable source ref')
def closed(driver,report,expected):
 check(all(driver['independentClosure'][k]['closed'] is True and driver['independentClosure'][k]['reason']=='ECONNREFUSED' for k in ['server','cdp']),'Independent owned TCP closure');check(driver['port4200']['closed'] is True,'Prior play4200 closure')
 check(report['ownedClosed'] is True and all(report['closure'][k]['closed'] is True for k in ['server','cdp','port4200']),'Inner closure');check(report['closure']['elapsedMs']<=5000,'Cleanup5s bound');check(driver['elapsedSeconds']<=expected,'Outer whole bound')
 if 'report'in driver:pin(driver['report'])
versions={}
for name,v in M['versions'].items():
 ready=obj(v['ready']);report=obj(v['protocolReport']);driver=obj(v['protocolDriver']);checks=obj(v['rootChecks']);versions[name]=(ready,report,driver)
 check(checks.get('valid') is True and checks.get('pinsUnchanged') is True and all(c['exitCode']==0 for c in checks['commands']),'Root CPU check outcome '+name);check(report['readySha256']==aliases[v['ready']]['sha256'],'Runtime ready binding '+name)
 check(not any(c['method'].startswith('Profiler.') for c in report['trace']['commands']),'Protocol operation no Profiler '+name);closed(driver,report,150)
 if name in ['v1','v2']:check(not report['trace']['commands'] and not report['trace']['events'],'V1/V2 failed preprotocol')
 if name=='v1':check('targetInventories'not in report,'V1 missing inventory limitation')
 if name=='v2':
  check(len(report['targetInventories'])==92,'V2 observed inventories');pages=[x for row in report['targetInventories'] for x in (row.get('inventory') or []) if x['type']=='page'];check(pages and all(p['url']=='chrome://newtab/' and p.get('webSocketDebuggerUrl') for p in pages),'V2 retained NewTab rows')
 if name=='v3':check(report['menu']['inner']==[1708,934] and report['menu']['canvas']==[2989,1634] and report['menu']['dpr']==2,'V3 actual app geometry');check('identity'not in report,'V3 no worker identity acceptance')
 if name in ['v3','v4']:
  plan=obj(v['directory']+'/plan.json');boot=plan['bootstrap']['pin'];pin(boot);check(len(data(boot['path']))==128,'Inert bootstrap size');check(b'<script'not in data(boot['path']).lower(),'Inert bootstrap no script')
  witnesses=report['bootstrapServingWitnesses'];check(len(witnesses)==2 and all(w['bootstrapRows'] and not w['gameServingRows'] for w in witnesses),'Bootstrap only serving before/after arming');check(report['armCompletedAt']<report['navigationStartedAt'],'Parent armed before game navigation')
 if name=='v4':check(report['valid'] is True and driver['valid'] is True,'V4 first protocol accepted')
def identity(report):
 i=report['identity'];frame=i['frameTree']['frameTree']['frame'];parent=i['parent'];child=i['currentChild'];a=i['autoattachedChild'];context=i['workerContext'];url=child['url'];check(url.endswith('/assets/surfZoneWorker-CYx0WJfP.js'),'Exact accepted worker URL');check(i['insideHref']==url and a['targetInfo']['url']==url,'Inside/attached worker URL');check(child['parentFrameId']==frame['id']==a['targetInfo']['parentFrameId']==i['pageContext']['auxData']['frameId'],'Exact parent frame/context relation');check(child.get('browserContextId')==parent.get('browserContextId')==a['targetInfo'].get('browserContextId'),'Browser context equality');check(i['workerSession']==a['sessionId'] and a['waitingForDebugger'] is False and context['uniqueId'],'Child session/context identity')
 cmds=report['trace']['commands'];inside=[c for c in cmds if c['method']=='Runtime.evaluate' and c['params'].get('expression')=='self.location.href' and c['sessionId']==i['workerSession']];check(inside and inside[0]['params']['contextId']==context['id'] and inside[0]['result']['result']['value']==url,'Bounded inside href command result')
 check(report['menu']['inner']==[1708,879] and report['menu']['canvas']==[2989,1538] and report['menu']['dpr']==2,'Original native guard');return i
identity(versions['v4'][1])
report=obj(M['profile']['report']);driver=obj(M['profile']['driver']);closed(driver,report,180);check(report['valid'] is True and report['profileValid'] is True and driver['valid'] is True and report['launch']['exit']['code']==0,'Profile success/Chrome exit0');check(report['baselineComparable'] is False and report['passiveFpsAcceptance'] is False,'Diagnostic scope');i=identity(report)
check(report['rootAcceptedProtocolReport']['sha256']==aliases[M['versions']['v4']['protocolReport']]['sha256'],'Separate accepted first protocol binding')
check([w['id'] for w in report['windows']]==['early','late'],'Two predeclared windows');commands=report['trace']['commands'];profiler=[c for c in commands if c['method'].startswith('Profiler.')];check(all(c['sessionId']==i['workerSession'] for c in profiler),'Only identified worker profiled');check([c['method'] for c in profiler]==['Profiler.enable','Profiler.setSamplingInterval','Profiler.start','Profiler.stop','Profiler.start','Profiler.stop','Profiler.disable'],'Exact profile operations');check(profiler[1]['params']=={'interval':5000},'5ms sampling interval')
def js_slice(s,start,end):return s.encode('utf-16-le','surrogatepass')[start*2:end*2].decode('utf-16-le','surrogatepass')
summaries={};scalar={};ob=report['scalarObservations'];check(not ob['scopeChanged'] and not ob['overflow'],'Scalar scope/bounds')
for w,offset in zip(report['windows'],[5,75]):
 k=w['id'];check(w['plannedAfterOriginSeconds']==offset and w['plannedSeconds']==8,'Original5/75 and8s plan');check(w['startRequestedAfterOriginMs']>=offset*1000,'Requested start after planned offset')
 pin(w['rawProfile']);pin(w['attribution']);p=obj(M['profile']['raw'][k]);a=obj(M['profile']['attribution'][k]);check(p['samples'] and len(p['samples'])==len(p['timeDeltas']),'Nonempty sample/delta lengths');check(p['endTime']>p['startTime'],'Profile duration');nodes={n['id']:n for n in p['nodes']};check(len(nodes)==len(p['nodes']),'Unique node IDs');parent={}
 for n in p['nodes']:
  for c in n.get('children',[]):check(c in nodes and c not in parent,'Valid unique child parent');parent[c]=n['id']
 for n in nodes:
  chain=set();at=n
  while at in parent:check(at not in chain,'Acyclic full node graph');chain.add(at);at=parent[at]
 self_us=defaultdict(int);inc_us=defaultdict(int);counts=Counter();total=0
 for node,delta in zip(p['samples'],p['timeDeltas']):
  check(node in nodes and isinstance(delta,(int,float)) and math.isfinite(delta) and delta>=0,'Sample node/nonnegative delta');self_us[node]+=delta;counts[node]+=1;total+=delta;at=node
  while at is not None:inc_us[at]+=delta;at=parent.get(at)
 check(total>0,'Positive total sampled weight');check(len(a['rows'])==len(nodes),'All node attribution rows');categories=defaultdict(float)
 for r in a['rows']:
  n=nodes[r['id']];check(r['callFrame']==n['callFrame'] and r['parent']==parent.get(r['id']) and r['selfSamples']==counts[r['id']],'Raw node metadata/count');near(r['selfMs'],self_us[r['id']]/1000,'Self weight');near(r['inclusiveMs'],inc_us[r['id']]/1000,'Inclusive weight');check(r['hitCount']==n.get('hitCount'),'Raw hitCount retained')
  source=r['sourceAuthority'];cf=n['callFrame'];fn=cf.get('functionName','');category={'(root)':'root','(idle)':'idle','(program)':'program','(garbage collector)':'gc'}.get(fn,'pinned-script'if source else'native-or-unresolved');categories[category]+=r['selfMs']
  if source:
   pin(source);b=data(source['path']);check(len(b)==source['bytes'] and digest(b)==source['sha256'],'Exact source bytes before label');line=b.decode().split('\n')[cf['lineNumber']];check(r['sourceSnippet']==js_slice(line,max(0,cf['columnNumber']-100),cf['columnNumber']+180),'Exact UTF16 source excerpt')
 s=a['summary'];check(s['samples']==len(p['samples']) and s['firstDeltaUs']==p['timeDeltas'][0],'Samples/first delta');near(s['profileDurationMs'],(p['endTime']-p['startTime'])/1000,'Raw duration');near(s['sampleWeightMs'],total/1000,'Sample weight');check(s['lastSample']=={'index':len(p['samples'])-1,'nodeId':p['samples'][-1],'timeUs':p['startTime']+total,'offsetUs':total},'Derived last sample');near(s['lastSampleTimeUs'],p['startTime']+total,'Last sample timestamp');near(s['trailingResidualUs'],p['endTime']-p['startTime']-total,'Signed unassigned tail');check(s['precedingIntervalEstimator']['trailingResidualAssigned'] is False and s['precedingIntervalEstimator']['renormalizedToProfileDuration'] is False,'Estimator scope');check(set(s['categoriesMs'])==set(categories),'All categories visible')
 for cat,val in categories.items():near(s['categoriesMs'][cat],val,'Category weight '+cat)
 near(sum(categories.values()),total/1000,'Full self/category coverage');near(sum(r['selfMs'] for r in a['rows']),total/1000,'Self coverage');check(a['topSelf']==sorted(a['rows'],key=lambda r:-r['selfMs'])[:40] and a['topInclusive']==sorted(a['rows'],key=lambda r:-r['inclusiveMs'])[:40],'Attribution sorted tables');check(w['attribution']['summary']==s,'Report summary equals retained attribution')
 summaries[k]={**s,'sampleWeightCoverage':total/(p['endTime']-p['startTime'])}
 lo=ob['startedAt']+offset*1000;hi=lo+8000;rows=[r for r in ob['rows'] if lo<=r['wall']<hi];check(rows and all(r['type']=='snapshot' for r in rows),'Published scalar packets');q=lambda xs:sorted(xs)[int(len(xs)*.5)]
 scalar[k]={'binStartPageMs':lo,'binEndPageMs':hi,'publishedPackets':len(rows),'publishedPacketsPerSecond':len(rows)/8,'countsMedian':{key:q([r[key] for r in rows]) for key in ['front','lip','tube','bubble','spray']},'pipelineMedianMs':{key:q([r['pipeline'][key] for r in rows]) for key in rows[0]['pipeline']},'meaning':'Planned page-observer wall bin, not exact Profiler command interval or actual drawn FPS'}
check(scalar['early']['publishedPackets']==477 and scalar['late']['publishedPackets']==467,'Retained planned-bin packet counts')
check(scalar['early']['countsMedian']['front']==0 and scalar['late']['countsMedian']['front']==101,'Root scalar front medians')
result={'status':'passed','payloads':len(M['payloads']),'aliases':len(M['aliases']),'pinClosures':pin_count,'immutableGitBlobChecks':git_checked,'gitAuthorityNotReadWithoutFlag':not args.git,'profileSummaries':summaries,'scalarDiagnostic':scalar,'scope':'Bytes, immutable source refs and retained arithmetic only. No runtime/protocol replay, benchmark or native/API/network execution; no FPS/thermal/exclusiveGPU/allocation/adoption claim.'}
print(json.dumps(result,indent=2))
