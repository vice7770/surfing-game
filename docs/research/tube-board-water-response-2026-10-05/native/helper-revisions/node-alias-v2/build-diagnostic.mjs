// Proposed root-run wrapper only: root owns entry, actual compilation/module/receipt, and every output.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,realpathSync,readdirSync} from 'node:fs';
import {join,basename} from 'node:path';
import {rolldown} from '/Users/regina/Desktop/Projects/surfing-game/node_modules/rolldown/dist/index.mjs';
const W='/private/tmp/tube-board-rhs-components-native-20261005',S=join(W,'source');
const C='/private/tmp/tube-board-rhs-components-observer-20261005';
const P='/private/tmp/tube-native-trial-balance-native-20261005';
const ORIGINAL='/private/tmp/tube-stable-x-ordinary-rider-prep-20261005';
const OLD='/private/tmp/tube-bounded-c-stable-x-sampling-20261005/source';
const CHANGED=['src/physics/AttachedRider.ts','src/physics/BoardBody.ts'];
const BUILD_ID='tube-board-rhs-components-20261005';
function pin(file){file=realpathSync(file);const b=readFileSync(file);return{file,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};}
let historicalNodeAliasVerification=null;
function verify(q){
 if(q.file==='/opt/homebrew/bin/node'){
  assert.deepEqual(q,{file:'/opt/homebrew/bin/node',bytes:61838736,sha256:'dad9bfeb954abae3c4af3767909df6ca1b83dc29a61539d2a023605f35afc48e'});
  const bytes=readFileSync(q.file),literal={file:q.file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
  assert.deepEqual(literal,q);
  const canonical=pin(q.file);sameWords(canonical,q);
  const aliasRealpath=realpathSync(q.file);assert.equal(canonical.file,aliasRealpath);
  historicalNodeAliasVerification={recordedPin:{...q},canonicalPin:canonical,aliasRealpath,exactHistoricalAliasOnly:true,recordedBytesAndShaVerified:true};
  return;
 }
 assert.deepEqual(pin(q.file),q);
}
function sameWords(q,r){assert.equal(q.bytes,r.bytes);assert.equal(q.sha256,r.sha256);}
const originalDiagnosticBuild=pin(join(ORIGINAL,'root-diagnostic-build-result.json'));
const old=JSON.parse(readFileSync(originalDiagnosticBuild.file));for(const q of old.inputs)verify(q);
const parentTrialBalanceDiagnosticBuild=pin(join(P,'root-diagnostic-build-result.json'));
const parentDiagnostic=JSON.parse(readFileSync(parentTrialBalanceDiagnosticBuild.file));for(const q of parentDiagnostic.inputs)verify(q);
const build=JSON.parse(readFileSync(join(W,'root-complete-build-result.json')));
assert.equal(build.schema,'board-rhs-components-root-complete-build/v1');assert.equal(build.terminal,true);assert.equal(build.exitCode,0);
assert.equal(build.source,S);assert.equal(build.buildId,BUILD_ID);assert.equal(build.sourcePins.length,587);assert.equal(build.assetPins.length,49);
verify(build.rootApplicationCommand);const command=JSON.parse(readFileSync(build.rootApplicationCommand.file));assert.equal(command.schema,'board-rhs-components-root-application-command/v1');assert.equal(command.complete,true);assert.equal(command.terminal,true);assert.equal(command.exitCode,0);assert.equal(command.sourceUnchanged,true);
assert(command.checks.some(q=>q.name==='strict-build')&&command.checks.some(q=>q.name==='application')&&command.checks.every(q=>q.exitCode===0));
const sourceReadiness=pin(join(W,'source-readiness.json')),authority=JSON.parse(readFileSync(sourceReadiness.file));
assert.equal(authority.schema,'board-rhs-components-source-readiness/v1');assert.equal(authority.complete,true);assert.equal(authority.frozen,true);
assert.equal(authority.sourceDirectory,S);assert.equal(authority.sourceCount,588);assert.equal(authority.applicationSourceCount,587);assert.equal(authority.unchangedParentInputs,586);
assert.equal(authority.buildId,BUILD_ID);assert.deepEqual(authority.runtimeChangedPaths,CHANGED);
verify(authority.sourcePinsManifest);verify(authority.sourceDelta);verify(authority.parentManifest);
assert.equal(authority.parentManifest.file,join(P,'source-pins.json'));
const manifest=JSON.parse(readFileSync(authority.sourcePinsManifest.file)),delta=JSON.parse(readFileSync(authority.sourceDelta.file)),parent=JSON.parse(readFileSync(authority.parentManifest.file));
assert.equal(manifest.schema,'board-rhs-components-source-pins/v1');assert.equal(manifest.count,588);assert.equal(manifest.pins.length,588);
assert.equal(parent.schema,'trial-balance-source-pins/v1');assert.equal(parent.count,588);assert.equal(parent.pins.length,588);
const rows=new Map(manifest.pins.map(q=>[q.path,q])),priorRows=new Map(parent.pins.map(q=>[q.path,q]));assert.equal(rows.size,588);assert.equal(priorRows.size,588);
const before={'src/physics/AttachedRider.ts':[153209,'1a92e1b5ebe216c4a29f32a12e274a0d7f713d4bed0202ff54f4c1742cb2a2f4'],'src/physics/BoardBody.ts':[55109,'7ce22c47a4ea3025dedaa5ec494d861bfb66d5dc7363481b77f3a8e02e2150c4']};
const after={'src/physics/AttachedRider.ts':[159692,'85e4ca8149292bf85b95c7c709531b15e220b14b2489e18f02c5a9e41b979cf1'],'src/physics/BoardBody.ts':[55693,'eb49becb36b6f8b1a9f34f956a001eeda100c7abfe84b75b5ff7ef3278c45917']};
const sourceDifferences=[];
for(const [relative,q]of rows){assert.equal(relative.startsWith('/'),false);assert.equal(relative.split('/').includes('..'),false);const prior=priorRows.get(relative);assert(prior);
 verify({file:join(S,relative),bytes:q.bytes,sha256:q.sha256});verify({file:join(P,'source',relative),bytes:prior.bytes,sha256:prior.sha256});if(q.bytes!==prior.bytes||q.sha256!==prior.sha256)sourceDifferences.push(relative);}
assert.deepEqual(sourceDifferences.sort(),CHANGED);assert.equal(delta.schema,'board-rhs-components-source-delta/v1');assert.equal(delta.source,S);assert.equal(delta.sourceCount,588);assert.equal(delta.unchangedParentInputs,586);
assert.deepEqual(delta.parentManifest,authority.parentManifest);assert.deepEqual([...delta.overrides].sort((a,b)=>a.path.localeCompare(b.path)),CHANGED.map(path=>({path,before:priorRows.get(path),after:rows.get(path)})));
const preparationMetadata=JSON.parse(readFileSync(join(C,'observer-fields.json')));
assert.equal(authority.candidateRuntimePins.length,2);assert.equal(preparationMetadata.candidateRuntimePins.length,2);
for(const relative of CHANGED){assert.deepEqual([priorRows.get(relative).bytes,priorRows.get(relative).sha256],before[relative]);assert.deepEqual([rows.get(relative).bytes,rows.get(relative).sha256],after[relative]);
 const actual=authority.candidateRuntimePins.find(q=>q.file===join(S,relative)),prepared=preparationMetadata.candidateRuntimePins.find(q=>q.file===join(C,'source',relative));assert(actual&&prepared);verify(actual);verify(prepared);sameWords(actual,prepared);sameWords(actual,rows.get(relative));}
verify(authority.candidatePreparation);assert.equal(authority.candidatePreparation.file,join(C,'readiness.json'));verify(authority.observerFields);assert.equal(authority.observerFields.file,join(W,'observer-fields.json'));verify(authority.candidatePatch);verify(authority.rootBaseCopy);
assert.deepEqual(authority.rootObserverChecks,authority.rootCPUResult);verify(authority.rootCPUResult);assert.equal(authority.rootCPUResult.file,join(C,'root-checks/result.json'));
const cpu=JSON.parse(readFileSync(authority.rootCPUResult.file));assert.equal(cpu.schema,'board-rhs-components-root-cpu-checks/v1');assert.equal(cpu.complete,true);assert.equal(cpu.sourcePostUnchanged,true);assert.equal(cpu.sourceCount,588);
const strict=cpu.checks.find(q=>q.name==='strict'),parity=cpu.checks.find(q=>q.name==='parity');assert(strict&&parity);assert(cpu.checks.every(q=>q.exitCode===0&&q.timedOut===false));
assert.equal(parity.success,true);assert.equal(parity.passed,2);assert.equal(parity.total,2);assert.equal(parity.failed,0);assert.equal(parity.wholeSteps,552);
for(const q of cpu.checks){verify(q.log);if(q.report)verify(q.report);}
for(const [key,expected]of [['sourceInputs',rows],['oracleInputs',priorRows]]){assert.equal(cpu[key].length,588);const matched=new Set();
 for(const q of cpu[key]){verify(q);const matches=[...expected.keys()].filter(path=>q.file.endsWith('/'+path));assert.equal(matches.length,1);assert(!matched.has(matches[0]));matched.add(matches[0]);sameWords(q,expected.get(matches[0]));}assert.equal(matched.size,588);}
for(const q of cpu.checkInputs)verify(q);
// Source authority is frozen prebuild. Allowed postbuild outputs come only from the actual complete-build receipt.
assert.equal(build.builtAssetPins.length,21);assert.equal(build.generatedOutputPins.length,1);
const expectedSourceFiles=new Set([...rows.keys()].map(relative=>join(S,relative)));
for(const q of [...build.builtAssetPins,...build.generatedOutputPins]){verify(q);assert(q.file.startsWith(S+'/'));assert(!expectedSourceFiles.has(q.file));expectedSourceFiles.add(q.file);}
function sourceFiles(root){const files=[];for(const q of readdirSync(root,{withFileTypes:true})){const path=join(root,q.name);if(q.isFile())files.push(path);else if(q.isDirectory())files.push(...sourceFiles(path));}return files;}
assert.equal(expectedSourceFiles.size,610);assert.deepEqual(sourceFiles(S).sort(),[...expectedSourceFiles].sort());
const observerFields=pin(join(W,'observer-fields.json'));assert.equal(observerFields.bytes,17859);assert.equal(observerFields.sha256,'e015b21641a592888aea8c160687edb0e4005d6c3e0ab8c0e011b2b739799fc8');
const metadata=JSON.parse(readFileSync(observerFields.file));assert.equal(metadata.oldFields.length,102);assert.equal(metadata.newFields.length,41);assert.equal(metadata.allFields.length,143);assert.equal(new Set(metadata.allFields).size,143);
assert.deepEqual(metadata.allFields,[...metadata.oldFields,...metadata.newFields]);assert.deepEqual(metadata.oldFields,JSON.parse(readFileSync(join(P,'observer-fields.json'))).allFields);assert.equal(metadata.availabilityMarker,'standingTrialAvailable');
assert.equal(readFileSync(observerFields.file).equals(readFileSync(join(C,'observer-fields.json'))),true);
for(const q of [...build.sourcePins,...build.assetPins,...build.builtAssetPins,...build.generatedOutputPins])verify(q);
const appWorkerObserverRetention=[];
for(const prefix of ['WorkerSurfZone-','surfZoneWorker-']){const assets=build.assetPins.filter(q=>basename(q.file).startsWith(prefix)&&q.file.endsWith('.js'));assert.equal(assets.length,1);const asset=assets[0],text=readFileSync(asset.file,'utf8');
 const present=metadata.allFields.filter(field=>new RegExp('(?<![\\w$])'+field+'(?![\\w$])').test(text));assert.equal(present.length,143);appWorkerObserverRetention.push({asset,requiredFields:143,presentFields:present.length});}
const entry=join(W,'autopilot-entry.ts'),module=join(W,'diagnostic-autopilot.mjs'),receipt=join(W,'root-diagnostic-build-result.json');
for(const file of [module,receipt])assert.equal(existsSync(file),false,'Preserve root first diagnostic output '+file);
assert.equal(readFileSync(entry,'utf8'),readFileSync(old.entry.file,'utf8').replaceAll(OLD,S),'Root-prepared entry exactly maps original');
const bundle=await rolldown({input:entry,cwd:'/Users/regina/Desktop/Projects/surfing-game',treeshake:true});
const {output}=await bundle.write({file:module,format:'esm'}),files=(await bundle.watchFiles).map(file=>realpathSync(file));await bundle.close();
assert.equal(output.length,1);assert.equal(output[0].type,'chunk');assert.deepEqual([...output[0].exports].sort(),['Autopilot','autopilotView','riderPartVolumes']);
const watchedFiles=[...new Set(files)].sort(),compilerConfigurationInputs=watchedFiles.filter(file=>file===join(S,'tsconfig.json')).map(pin);
assert.equal(watchedFiles.length,75);assert.equal(compilerConfigurationInputs.length,1);
const inputFiles=watchedFiles.filter(file=>file!==join(S,'tsconfig.json'));
const mapped=old.inputs.map(q=>q.file===old.entry.file?entry:q.file.startsWith(OLD+'/')?S+q.file.slice(OLD.length):q.file).map(file=>realpathSync(file)).sort();assert.deepEqual(inputFiles,mapped);
const inputs=inputFiles.map(pin),sourceInputs=inputs.filter(q=>q.file.startsWith(S+'/'));assert.equal(inputs.length,74);assert.equal(sourceInputs.length,71);
for(const relative of CHANGED)assert(sourceInputs.some(q=>q.file===join(S,relative)),'Both candidate runtimes must be reachable in source graph');
const changedSourceInputsAgainstImmediateParent=[];
for(const q of parentDiagnostic.sourceInputs){const relative=q.file.slice(parentDiagnostic.source.length+1),next=pin(join(S,relative));if(q.bytes!==next.bytes||q.sha256!==next.sha256)changedSourceInputsAgainstImmediateParent.push(relative);}
assert.deepEqual(changedSourceInputsAgainstImmediateParent.sort(),CHANGED);
const changedSourceInputsAgainstOriginalStableX=old.sourceInputs.filter(q=>{const next=pin(S+q.file.slice(OLD.length));return q.bytes!==next.bytes||q.sha256!==next.sha256;}).map(q=>q.file.slice(OLD.length+1));
const moduleText=readFileSync(module,'utf8'),diagnosticLexicalObserverFieldCount=metadata.allFields.filter(field=>new RegExp('(?<![\\w$])'+field+'(?![\\w$])').test(moduleText)).length;
for(const q of [...build.sourcePins,...build.assetPins,...build.builtAssetPins,...build.generatedOutputPins])verify(q);
const result={schema:'board-rhs-components-diagnostic-root-build/v1',terminal:true,exitCode:0,source:S,sourceReadiness,
 originalFailedCompilation:pin('/private/tmp/tube-pop-up-contact-build-20261005/diagnostic-first-attempt/failure.json'),originalDiagnosticBuild,originalEntry:old.entry,entry:pin(entry),module:pin(module),inputs,sourceInputs,
 compilerConfigurationInputs,compilerWatchedInputCount:watchedFiles.length,inputDefinition:'Original imported74 graph plus separately pinned source tsconfig; both changed runtimes reachable; tree-shaken field count is not retention authority',
 actualCompiler:'Installed rolldown from application dependency tree',compilerEntry:pin('/Users/regina/Desktop/Projects/surfing-game/node_modules/rolldown/dist/index.mjs'),moduleExports:[...output[0].exports],originalGraphMappedExactly:true,
 compilerWrapper:pin(new URL(import.meta.url)),compilerWrapperRevision:'node-alias-v2',historicalAliasResolutions:historicalNodeAliasVerification?[historicalNodeAliasVerification]:[],
 changedSourceInputsAgainstOriginalStableX,parentTrialBalanceDiagnosticBuild,changedSourceInputsAgainstImmediateParent,attachedRiderReachable:true,boardBodyReachable:true,
 observerFields,observerFieldCount:143,oldObserverFieldCount:102,newObserverScalarCount:41,diagnosticLexicalObserverFieldCount,
 observerRetentionPolicy:'source-graph-reachability-and-both-actual-app-workers;diagnostic-class-fields-may-be-tree-shaken',appWorkerObserverRetention,
 sourceOrCompleteDistModified:false,separateDiagnosticRoute:'/diagnostic-autopilot.mjs',completeBuildAssetCountUnchanged:49,rootCompleteBuild:pin(join(W,'root-complete-build-result.json')),
 actualNewDiagnosticSourceCompiled:true,diagnosticModuleCopiedFromPrior:false};
writeFileSync(receipt,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({complete:true,receipt:pin(receipt),module:result.module,inputs:inputs.length,sourceInputs:sourceInputs.length,diagnosticLexicalObserverFieldCount,appWorkerObserverRetention}));
