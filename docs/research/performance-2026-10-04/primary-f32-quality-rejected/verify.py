#!/usr/bin/env python3
"""Retained bytes and rejection arithmetic only; no game/helper import or native replay."""
from pathlib import Path
from collections import Counter
import argparse, gzip, hashlib, json, math

A=Path(__file__).resolve().parent
parser=argparse.ArgumentParser();parser.add_argument('--write-outcome',action='store_true',help='First producer-only derivation; refuse an existing outcome')
args=parser.parse_args();M=json.loads((A/'manifest.json').read_text());P=M['plan']
H=lambda b:hashlib.sha256(b).hexdigest()
def check(ok,label):
 if not ok:raise AssertionError(label)
def near(a,b,label):check(math.isfinite(a) and math.isfinite(b) and abs(a-b)<=1e-10*max(1,abs(b)),label)
check(M['schema']=='primary-f32-quality-rejection-archive/v1','Archive schema')
contents={}
for p in M['payloads']:
 check(p['path'].startswith(('payloads/','images/')) and '..' not in Path(p['path']).parts,'Owned retained payload path')
 encoded=(A/p['path']).read_bytes();check(len(encoded)==p['bytes'] and H(encoded)==p['sha256'],'Encoded byte identity '+p['path'])
 raw=gzip.decompress(encoded) if p['encoding'].startswith('deterministic gzip') else encoded
 check(len(raw)==p['contentBytes'] and H(raw)==p['contentSha256'],'Decoded byte identity '+p['path']);contents[p['path']]=raw
aliases={p['originalPath']:p for p in M['aliases']};check(len(aliases)==len(M['aliases']),'Unique original aliases')
for p in aliases.values():check(p['payload'] in contents and len(contents[p['payload']])==p['bytes'] and H(contents[p['payload']])==p['sha256'],'Exact retained alias '+p['originalPath'])
def data(path):check(path in aliases,'Missing retained alias '+path);return contents[aliases[path]['payload']]
def obj(path):return json.loads(data(path))
shared_path=(A/M['sharedManifest']['archive']).resolve();shared_bytes=shared_path.read_bytes()
check(len(shared_bytes)==M['sharedManifest']['bytes'] and H(shared_bytes)==M['sharedManifest']['sha256']==P['sharedManifestSha256'],'Exact adjacent shared manifest')
S=json.loads(shared_bytes);shared_aliases={(p['originalPath'],p['sha256']):p for p in S['aliases']};shared_git={(p['originalPath'],p['sha256']):p for p in S['gitReferences']};shared_payloads={p['path']:p for p in S['payloads']};shared_contents={};shared_index={}
for p in M['sharedAuthorities']:
 key=(p['originalPath'],p['sha256']);check(key not in shared_index,'Unique shared authority');shared_index[key]=p
 q=(shared_aliases if p['kind']=='payload' else shared_git).get(key)
 check(q and q['bytes']==p['bytes'],'Exact adjacent frozen authority '+p['originalPath'])
 if p['kind']=='payload':
  check(q['payload']==p['payload'],'Shared payload route')
  if p['payload'] not in shared_contents:
   ref=shared_payloads[p['payload']];encoded=(shared_path.parent/ref['path']).read_bytes();check(len(encoded)==ref['bytes'] and H(encoded)==ref['sha256'],'Shared encoded bytes');raw=gzip.decompress(encoded);check(len(raw)==ref['contentBytes'] and H(raw)==ref['contentSha256'],'Shared decoded bytes');shared_contents[p['payload']]=raw
  raw=shared_contents[p['payload']];check(len(raw)==p['bytes'] and H(raw)==p['sha256'],'Shared content authority')
 else:
  check(p['kind']=='immutable-git-metadata' and all(p[k]==q[k] for k in ['commit','blob','repositoryPath']),'Shared immutable Git metadata authority')
omitted={(p['path'],p['sha256']):p for p in M['omittedArtifacts']}
check(len(omitted)==len(M['omittedArtifacts']) and all(p['path'] not in aliases and p['scope'].startswith('metadata-only') for p in omitted.values()),'Explicit omitted metadata is not retained bytes')
closed=Counter()
def closure(p):
 if not isinstance(p.get('path'),str) or not Path(p['path']).is_absolute() or p.get('virtualOnly') or p.get('additiveGettersOnly'):return
 local=aliases.get(p['path']);key=(p['path'],p['sha256'])
 if local and local['sha256']==p['sha256'] and local['bytes']==p['bytes']:closed['retained']+=1;return
 q=shared_index.get(key)
 if q and q['bytes']==p['bytes']:closed['sharedPayload' if q['kind']=='payload' else 'sharedGitMetadata']+=1;return
 q=omitted.get(key)
 check(q and q['bytes']==p['bytes'],'Direct pin must be retained/shared/or explicitly omitted '+p['path']);closed['omittedMetadata']+=1

Q=M['qualityWork'];R=M['roofWork'];report=obj(Q+'/native-first/report.json');driver=obj(Q+'/native-first.native-driver.json');ready=obj(Q+'/ready.json');roof_ready=obj(R+'/ready.json');roof=obj(R+'/offline-first/report.json')
check(aliases[Q+'/ready.json']['sha256']==P['qualityReadySha256'] and aliases[R+'/ready.json']['sha256']==P['roofReadySha256'],'Exact readiness pins')
check(aliases[Q+'/native-first/report.json']['sha256']==P['qualityReportSha256'] and aliases[Q+'/native-first/report.json']['bytes']==1192230,'Exact first failure report')
for frozen in [ready,roof_ready]:
 for p in frozen['inputs']:closure(p)
for p in report['artifacts']:closure(p)
quality_check=obj(Q+'/root-checks-first/terminal.json')
check(quality_check['valid'] and quality_check['pinsUnchanged'] and quality_check['sourceBefore']==quality_check['sourceAfter'] and len(quality_check['commands'])==9 and all(c['exitCode']==0 for c in quality_check['commands']),'Original nine first quality checks')
first_freeze=obj('/private/tmp/surf-primary-f32-quality-first-freeze-20261004.json')
check(first_freeze['exitCode']==0 and first_freeze['command']==['node',Q+'/freeze.mjs'] and first_freeze['log'] in aliases,'Original first quality freeze receipt/log')
for mode,count in [('syntax',5),('offline',1)]:
 t=obj(R+'/root-'+mode+'-first/terminal.json');check(t['valid'] and t['readySha256']==P['roofReadySha256'] and t['pinsUnchangedBefore'] and t['pinsUnchangedAfter'] and len(t['commands'])==count and all(c['returncode']==0 for c in t['commands']),'Original first roof '+mode+' outcome')
check(not report['valid'] and not report['numericalPassed'] and not report['adoptionAccepted'] and not report['visualQualityAccepted'],'Paired rejection remains authoritative')
check(len(report['arms'])==2 and [x['arm'] for x in report['arms']]==['baseline','candidate'] and all(x['valid'] for x in report['arms']),'Exactly two individually valid completed arms')
check(len(report['comparisons'])==1 and report['comparisons'][0]['frames']==[] and not report['comparisons'][0]['numericalPassed'],'Timeline failure before checkpoint H/Q comparison')
check('supplementalTriggered' not in report and len(report['requiredNumericalScenes'])==1,'No supplemental/retry scene')
check(not driver['valid'] and driver['exitCode']==1 and driver['elapsedSeconds']<=990 and driver['commandSeconds']==980 and driver['wholeSeconds']==990,'Original outer first failure and bounds')
ports=[4266,9676,4267,9677,4268,9678,4269,9679,4200]
check(driver['ports']==ports and [p['port'] for p in driver['independentTCP']]==ports and all(p['closed'] is True and p['reason']=='ECONNREFUSED' for p in driver['independentTCP']),'Nine actual independent TCP closure observations')
account=driver['retainedByteAccounting'];check(account['totalBytes']==account['ownedOutputBytes']+account['driverLogBytes']+account['driverWrapperBytes']==207417740 and account['capBytes']==402653184 and account['totalBytes']<=account['capBytes'],'Original stored cap arithmetic')
check(account['driverLogBytes']==aliases[Q+'/native-first.native-driver.log']['bytes'] and account['driverWrapperBytes']==aliases[Q+'/native-first.native-driver.json']['bytes'],'Original actual driver sibling byte accounting')
check(report['plan']['capture']['rawStateCapBytes']==100663296 and report['plan']['capture']['storedCapBytes']==402653184,'Unchanged original 96/384MiB caps')
sessions=[obj(a['sessionFile']) for a in report['arms']]
check(sessions[0]['restart']['initial']==sessions[1]['restart']['initial'],'Exact original initial seat/config/clock/grid')
for s in sessions:
 check(s['valid'] and s['ownedClosed'] and s['ownedChromeClosed'] and s['sourceBefore']==s['sourceAfter'] and s['elapsedSeconds']<=245,'Individual arm execution/source/owned cleanup')
 check(all(p['closed'] is True for p in s['closure'].values()),'Individual actual closure')
 check(len(s['timeline'])==3600 and len(s['frames'])==11 and s['completion']['tick']==3600,'Original 3600 ticks/eleven checkpoints')
 for f in s['frames']:
  a=f['rawAccounting'];check(f['committedUnchangedAfter'] and a['totalBytes']==a['primaryOwnedBytes']+a['pageFieldBytes']+a['exportExpandedBytes'] and a['totalBytes']<=100663296,'Original per-state raw accounting metadata')
check([f['tick'] for f in sessions[0]['frames']]==[f['tick'] for f in sessions[1]['frames']],'Original exact capture schedule replay')
def diffs(x,y,path=''):
 if isinstance(x,dict) and isinstance(y,dict):
  check(list(x)==list(y),'Timeline row schema')
  return [p for k in x for p in diffs(x[k],y[k],path+'.'+k if path else k)]
 if isinstance(x,list) and isinstance(y,list):
  check(len(x)==len(y),'Timeline array schema');return [p for i,(a,b) in enumerate(zip(x,y)) for p in diffs(a,b,path+'['+str(i)+']')]
 return [] if x==y else [{'path':path,'baseline':x,'candidate':y}]
counts=Counter();first=None;front_rows=[];phase_rows=[];max_spray={'absolute':0,'tick':None,'baseline':None,'candidate':None}
for i,(a,b) in enumerate(zip(sessions[0]['timeline'],sessions[1]['timeline']),1):
 check(a['tick']==b['tick']==i and a['seaTime']==b['seaTime'] and a['input']==b['input'],'Exact original input/clock/tick')
 row=diffs(a,b)
 if row and first is None:first={'tick':i,'differences':row}
 counts.update(p['path'] for p in row)
 if a['counts']['front']!=b['counts']['front']:front_rows.append({'tick':i,'baseline':a['counts']['front'],'candidate':b['counts']['front']})
 if a['ride']['phase']!=b['ride']['phase']:phase_rows.append({'tick':i,'baseline':a['ride']['phase'],'candidate':b['ride']['phase']})
 d=abs(a['counts']['spray']-b['counts']['spray'])
 if d>max_spray['absolute']:max_spray={'absolute':d,'tick':i,'baseline':a['counts']['spray'],'candidate':b['counts']['spray']}
check(dict(counts)=={'counts.spray':2087,'ride.phase':1666,'counts.front':2},'Complete exact timeline divergence counts')
check(first=={'tick':770,'differences':[{'path':'counts.spray','baseline':4084,'candidate':4081}]},'Actual first divergence')
check(max_spray['absolute']==170 and max_spray['tick']==1393,'Actual maximum spray count gap')
check([p['tick'] for p in front_rows]==[2548,2598],'Actual two front-count divergence ticks')
check([p['tick'] for p in phase_rows]==list(range(1912,3578)) and all(p['baseline']=='prone' and p['candidate']=='fallen' for p in phase_rows),'Actual sustained rider-phase divergence')
def frame(s,tick):return next(f for f in s['frames'] if f['tick']==tick)
def bracket(f):
 q=f['page']['bracketEligibility'];check(q and len(q['slices'])==4,'Retained scalar bracket')
 a=q['slices'];same=all(s['front']==q['lockedFront'] for s in a);joined=all(s['joined']==1 for s in a[:3]);opened=same and joined and all(s['phase']==1 and s['formed']==1 and s['weight']==1 and s['fade']==1 for s in a);post=same and joined and a[1]['phase']==2
 check([q['matchedFront'],q['joined'],q['openEligible'],q['postEligible']]==[same,joined,opened,post],'Scalar metadata bracket eligibility arithmetic')
 check(q['selectedIndex']==a[1]['index'] and q['selectedSigma']==a[1]['sigma'] and q['selectedPhase']==a[1]['phase'],'Scalar selected bracket metadata')
 return {'selectedIndex':q['selectedIndex'],'selectedSigma':q['selectedSigma'],'lockedSigma':q['lockedSigma'],'OPEN':opened,'POST':post,'fourthWeight':a[3]['weight']}
brackets={s['arm']:{str(t):bracket(frame(s,t)) for t in [988,1017]} for s in sessions}
check(brackets['baseline']['988']['OPEN'] and not brackets['candidate']['988']['OPEN'] and brackets['baseline']['988']['selectedIndex']==16 and brackets['candidate']['988']['selectedIndex']==17,'Actual metadata OPEN loss')
check(all(brackets[s['arm']]['1017']['POST'] for s in sessions),'Actual metadata POST match')
landing={s['arm']:frame(s,524)['page']['status']['ride']['phase']=='landing' and frame(s,524)['page']['drawnRiderPhase']==2 and frame(s,524)['page']['bodyPointSupport']['qualified'] for s in sessions}
check(all(landing.values()),'Actual landing metadata eligibility')
check(roof['valid'] and roof['diagnosisOnly'] and not any(roof[k] for k in ['adoptionAccepted','visualQualityAccepted','geometryRepaired','nativeFinCauseProved']) and roof['inputsUnchangedBefore'] and roof['inputsUnchangedAfter'],'Roof diagnosis validity without quality/causal upgrade')
check(roof['inputQualityStatus']['valid']==report['valid'] and roof['inputQualityStatus']['numericalPassed']==report['numericalPassed'],'Original rejection copied into roof diagnosis')
pairs=roof['selectedPairs'];check(len(pairs)==16 and len({p['id'] for p in pairs})==16,'At most sixteen unique global diagnostic pairs')
fronts=Counter(p['sliceMetadata'][0]['sliceFront'] for p in pairs);check(fronts=={86:5,78:4,12:5,80:2} and 0 not in fronts,'Selected diagnostic front distribution')
degenerate=sum(p['scores']['triangleAspect']=={'numericSentinel':'+Infinity'} for p in pairs);check(degenerate==14,'Fourteen explicitly degenerate selected diagnostics')
gaps=[]
for p in pairs:
 clocks=p['clocks'];check(clocks['originalExactFrameSeparation'].get('unavailable'),'Exact original refinement predicate unavailable')
 q=clocks['retainedWordReconstruction'];check(q['originalRefinementPredicateClassified'] is False,'Reconstruction does not classify original predicate')
 near(q['retainedTauGapNormalizedByMinimumFrame'],q['retainedTauGapSeconds']/q['minimumFrameSeconds'],'Retained scalar clock-gap arithmetic')
 gaps.extend([q['retainedTauGapNormalizedByMinimumFrame'],q['sourceTauAtRetainedSigmaGapNormalizedByMinimumFrame']])
check(max(gaps)<3,'Stored reconstruction gaps below three without causal conclusion')
images=[p for p in M['payloads'] if p['encoding']=='original encoded PNG, unchanged'];check(len(images)==3 and {p['path'] for p in images}=={'images/baseline-open-988.png','images/baseline-post-1017.png','images/candidate-open-988.png'},'Three original unchanged encoded PNGs only')
outcome={'schema':'primary-f32-quality-rejection-outcome/v1','pairedQualityPassed':False,'nativeArmsCompleted':2,'ticksPerArm':3600,'checkpointNumericalComparisonsReached':0,'firstTimelineDifference':first,'timelineDifferenceRowCounts':dict(counts),'maximumSprayCountGap':max_spray,'frontCountDifferences':front_rows,'riderPhaseDifference':{'firstTick':1912,'lastTick':3577,'rows':1666,'baseline':'prone','candidate':'fallen'},'bracketMetadata':brackets,'landingMetadata':landing,'scalarMetadataQualification':'Typed slice bytes are omitted; scalar eligibility arithmetic is not a fresh typed-word or visual quality proof.','independentTCPClosedPorts':ports,'driverElapsedSeconds':driver['elapsedSeconds'],'originalStoredOutputBytes':account['totalBytes'],'originalStoredCapBytes':account['capBytes'],'originalRawStateCapBytes':100663296,'roofDiagnosis':{'selectedPairs':16,'selectedFrontCounts':{str(k):v for k,v in sorted(fronts.items())},'explicitlyDegeneratePairs':degenerate,'maximumRetainedWordNormalizedClockGap':max(gaps),'originalRefinementPredicateAvailable':False,'nativeFinCauseProved':False,'geometryRepaired':False,'visualQualityAccepted':False},'archiveScope':{'retainedAliases':len(aliases),'localPayloads':len(M['payloads']),'originalEncodedPNGCount':3,'omittedArtifactMetadata':len(omitted),'sharedAuthorityReferences':len(shared_index),'directPinClosure':dict(closed),'fullCaptureDurable':False,'durableGeometryDecoding':False,'omittedPayloadBytesVerifiedHere':False,'sharedGitBlobReadsRepeated':False},'adoptionAccepted':False,'stable60FpsAccepted':False}
if args.write_outcome:
 check(not (A/'outcome.json').exists(),'One first derived outcome only');(A/'outcome.json').write_text(json.dumps(outcome,indent=2)+'\n')
else:check(json.loads((A/'outcome.json').read_text())==outcome,'Exact recomputed retained rejection outcome')
print(json.dumps({'valid':True,'retainedAliases':len(aliases),'localPayloads':len(M['payloads']),'sharedAuthorityReferences':len(shared_index),'omittedArtifactMetadata':len(omitted),'firstDivergenceTick':770,'timelineDifferenceRows':dict(counts),'fullCaptureDurable':False,'adoptionAccepted':False,'stable60FpsAccepted':False}))
