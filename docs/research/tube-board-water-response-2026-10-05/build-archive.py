from pathlib import Path
import gzip,hashlib,json
ROOT=Path('/Users/regina/Desktop/Projects/surfing-game');OUT=ROOT/'docs/research/tube-board-water-response-2026-10-05';assert not OUT.exists()
BASE=Path('/private/tmp');C=BASE/'tube-board-rhs-components-observer-20261005';W=BASE/'tube-board-rhs-components-native-20261005';B=BASE/'tube-board-rhs-components-build-20261005';A=BASE/'tube-board-rhs-components-actual-review-20261005';D=BASE/'tube-board-water-assembly-source-review-20261005'
selected=[]
def add(p,r):
 p=Path(p);assert p.is_file() and not p.is_symlink(),p;selected.append((p,r))
def top(p,r):
 for f in sorted(Path(p).iterdir()):
  if f.is_file() and not f.is_symlink():add(f,r+'/'+f.name)
def tree(p,r):
 for f in sorted(Path(p).rglob('*')):
  if f.is_file() and not f.is_symlink():add(f,r+'/'+str(f.relative_to(p)))
top(C,'controlled-observer');tree(C/'tests','controlled-observer/tests');tree(C/'root-checks','controlled-observer/root-checks')
for name in ['AttachedRider.ts','BoardBody.ts']:add(C/'source/src/physics'/name,'controlled-observer/source/src/physics/'+name)
top(W,'native');tree(W/'root-helper-logs','native/root-helper-logs');tree(W/'root-pre-acceptance','native/root-pre-acceptance');tree(W/'helper-revisions','native/helper-revisions');tree(W/'candidate-first','native/candidate-first')
top(B,'build');top(A,'review');tree(A/'root-numeric-review','review/root-numeric-review');top(D,'water-assembly-source-review')
add(Path(__file__).parent/'README.md','README.md');add(Path(__file__),'build-archive.py')
assert len(selected)==len({r for _,r in selected})
def words(b):return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
OUT.mkdir();files=[];seen={};total=0
for source,relative in selected:
 raw=source.read_bytes();original=words(raw);key=(original['bytes'],original['sha256'])
 if key in seen:
  stored=seen[key];assert seen[key]['originalBytes']==raw
 else:
  compressed=source.suffix in ('.json','.ndjson') and len(raw)>=32768;encoded=gzip.compress(raw,compresslevel=9,mtime=0) if compressed else raw;relative += '.gz' if compressed else '';target=OUT/relative;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(encoded)
  stored={'file':relative,**words(encoded),'encoding':'gzip'if compressed else'identity','originalBytes':raw};seen[key]=stored;total+=len(encoded)
 files.append({'original':{'file':str(source),**original},'archived':{k:v for k,v in stored.items()if k!='originalBytes'}})
assert total<=40*1024*1024
summary={'schema':'tube-board-water-response-evidence/v1','complete':True,'goalComplete':False,'productionRuntimeChanged':False,'observerAdopted':False,
 'native':{'rootSession':4030,'terminal':True,'exitCode':0,'steps':1366,'cueStep':1300,'landingStep':1343,'fallStep':1366,'standingReached':False,'tubeEntryOrPassageEstablished':False,'ownedPortsClosed':[4301,9711],'humanPreviewPortsPreserved':[4312,4313],'elapsedSeconds':320.492294708034,'cleanupSeconds':0.2173402089974843},
 'controlledObserver':{'fields':143,'parentFields':102,'newScalarCopies':41,'runtimeFilesChanged':2,'sourceInputs':588,'unchangedParentInputs':586,'strictPassed':True,'parityCases':2,'wholeSteps':552,'stateQueryReactionStageAndDetachedReturnsChecked':True},
 'applicationAndDiagnostic':{'applicationSources':587,'completeAssets':49,'freshApplicationBuild':True,'freshDiagnosticCompile':True,'diagnosticInputs':74,'diagnosticSourceInputs':71,'diagnosticWatchedInputs':75,'diagnosticLexicalFieldCount':0,'applicationWorkersRetainingAll143':2,'helperPins':99,'firstNodeAliasVerificationFailurePreserved':True},
 'actualAudit':{'rootSession':42945,'terminal':True,'exitCode':0,'allOriginalPublicRowsEqual':1366,'old102AndAvailabilityMarkerRetained':True,'onlyNew41FullRecordFieldsAndDeclaredSevenSuffixesExcluded':True,'allRawDifferencesRetained':True,'fourCheckpointCamerasAndStepsExact':True,'fourTimes37LoftArraysAndRawFrontWordsExact':True,'signedSurfaceRevisionDifferences':[-1,-1,-1,-1]},
 'boardRhs':{'availableLandingRecords':46,'allSixSourceOrderedWordsExact':True,'allEightGroupSumsClosedWithinRoundoff':True,'transition':[1356,32,1357,1],'totalDownwardRhsDeltaNs':-17.142726595992315,'combinedWaterDownwardRhsDeltaNs':-17.014320629332417,'coupledRateIncrementDelta':.8546126542662399,'combinedBoardRhsRateContribution':.8338514758803494,'waterRateContribution':.8122913834555612,'pressureRateContribution':.020789782855625834,'boardMatrixRateContribution':.021882318755727978,'maximumSevenUnknownSolveResidual':2.020605904817785e-14,'maximumFullRowResidual':8.526512829121202e-14,'scope':'Chosen B inverse algebraic allocation, not a native intervention or unique causal split; water combines radiation and entrainment.'},
 'nextWork':'Passive per-patch existing-operand capture to distinguish radiation, entrainment, flow, projection, wetting and mass history before a causal physics intervention; hollow geometry and ordinary standing/passage remain open.',
 'archive':{'selectedReferences':len(files),'uniquePayloads':len(seen),'uniquePayloadBytes':total,'allOriginalCopiedAndDecodedBytesVerified':True,'scope':'Selected evidence, changed postimages and source-only next-step assessment; not a complete runnable588-input/dependency snapshot.'},'files':files}
(OUT/'result.json').write_text(json.dumps(summary,indent=2,allow_nan=False)+'\n')
for row in files:
 original,stored=row['original'],row['archived'];assert words(Path(original['file']).read_bytes())=={k:original[k]for k in ['bytes','sha256']};b=(OUT/stored['file']).read_bytes();assert words(b)=={k:stored[k]for k in ['bytes','sha256']};raw=gzip.decompress(b)if stored['encoding']=='gzip'else b;assert words(raw)=={k:original[k]for k in ['bytes','sha256']}
actual={str(p.relative_to(OUT))for p in OUT.rglob('*')if p.is_file()};assert actual=={row['archived']['file']for row in files}|{'result.json'}
print(json.dumps({'complete':True,'directory':str(OUT),'selectedReferences':len(files),'uniquePayloads':len(seen),'actualFiles':len(actual),'totalBytes':sum(p.stat().st_size for p in OUT.rglob('*')if p.is_file()),'result':words((OUT/'result.json').read_bytes())}))
