// Root-run compiler: direct immediate143 graph, with the narrow approved node-alias-v2 check.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,realpathSync} from 'node:fs';
import {join,basename} from 'node:path';
import {rolldown} from '/Users/regina/Desktop/Projects/surfing-game/node_modules/rolldown/dist/index.mjs';
const W='/private/tmp/tube-board-raw-normal-native-20261005',S=join(W,'source');
const P='/private/tmp/tube-board-rhs-components-native-20261005';
const C='/private/tmp/tube-board-raw-normal-native-prep-20261005';
function pin(file){file=realpathSync(file);const b=readFileSync(file);return{file,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};}
function sameWords(q,r){assert.equal(q.bytes,r.bytes);assert.equal(q.sha256,r.sha256);}
let historicalNodeAliasVerification=null;
function verify(q){
 if(q.file==='/opt/homebrew/bin/node'){
  assert.deepEqual(q,{file:'/opt/homebrew/bin/node',bytes:61838736,sha256:'dad9bfeb954abae3c4af3767909df6ca1b83dc29a61539d2a023605f35afc48e'});
  const bytes=readFileSync(q.file),literal={file:q.file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
  assert.deepEqual(literal,q);const canonical=pin(q.file);sameWords(canonical,q);
  const aliasRealpath=realpathSync(q.file);assert.equal(canonical.file,aliasRealpath);
  historicalNodeAliasVerification={recordedPin:{...q},canonicalPin:canonical,aliasRealpath,exactHistoricalAliasOnly:true,recordedBytesAndShaVerified:true};return;
 }
 assert.deepEqual(pin(q.file),q);
}
const freeze=JSON.parse(readFileSync(join(C,'freeze.json')));assert.equal(freeze.schema,'board-raw-normal-source-preparation-freeze/v1');for(const q of freeze.pins)verify(q);
const prepared=JSON.parse(readFileSync(join(C,'inputs.json')));verify(prepared.parentDiagnosticBuild);
for(const q of prepared.compilerToolInputs)verify(q);
const parent=JSON.parse(readFileSync(prepared.parentDiagnosticBuild.file));
assert.equal(parent.schema,'board-rhs-components-diagnostic-root-build/v1');assert.equal(parent.terminal,true);assert.equal(parent.exitCode,0);assert.equal(parent.source,join(P,'source'));
assert.equal(parent.inputs.length,74);assert.equal(parent.sourceInputs.length,71);assert.equal(parent.compilerWatchedInputCount,75);
for(const q of [...parent.inputs,...parent.compilerConfigurationInputs])verify(q);
const build=JSON.parse(readFileSync(join(W,'root-complete-build-result.json')));
assert.equal(build.schema,'board-raw-normal-root-complete-build/v1');assert.equal(build.terminal,true);assert.equal(build.exitCode,0);assert.equal(build.source,S);assert.equal(build.buildId,'tube-board-raw-normal-20261005');
assert.equal(build.sourcePins.length,587);assert.equal(build.assetPins.length,49);assert.equal(build.builtAssetPins.length,21);assert.equal(build.generatedOutputPins.length,1);
for(const q of [...build.sourcePins,...build.assetPins,...build.builtAssetPins,...build.generatedOutputPins,build.rootApplicationCommand,build.readiness])verify(q);
const command=JSON.parse(readFileSync(build.rootApplicationCommand.file));assert.equal(command.schema,'board-raw-normal-root-application-command/v1');assert(command.complete&&command.terminal&&command.exitCode===0&&command.sourceUnchanged);
assert.deepEqual(command.checks.map(q=>q.name),['strict-build','application']);assert(command.checks.every(q=>q.exitCode===0&&!q.timedOut));
const readiness=JSON.parse(readFileSync(build.readiness.file));assert.equal(readiness.schema,'board-raw-normal-source-readiness/v1');assert(readiness.complete&&readiness.frozen);assert.deepEqual(readiness.runtimeChangedPaths,['src/physics/BoardBody.ts']);
assert.equal(readiness.sourceCount,588);assert.equal(readiness.unchangedParentInputs,587);assert.equal(readiness.sourceDirectory,S);verify(readiness.rootCPUResult);verify(readiness.sourcePinsManifest);verify(readiness.candidateOverride);
const fields=JSON.parse(readFileSync(join(W,'observer-fields.json')));assert.equal(fields.allFields.length,143);assert.equal(fields.oldFields.length,102);assert.equal(fields.newFields.length,41);assert(readFileSync(join(W,'observer-fields.json')).equals(readFileSync(prepared.observerFields.file)));
const appWorkerObserverRetention=[];
for(const prefix of ['WorkerSurfZone-','surfZoneWorker-']){const matches=build.assetPins.filter(q=>basename(q.file).startsWith(prefix)&&q.file.endsWith('.js'));assert.equal(matches.length,1);const asset=matches[0],text=readFileSync(asset.file,'utf8');const count=fields.allFields.filter(field=>new RegExp('(?<![\\w$])'+field+'(?![\\w$])').test(text)).length;assert.equal(count,143);appWorkerObserverRetention.push({asset,requiredFields:143,presentFields:count});}
const entry=join(W,'autopilot-entry.ts'),module=join(W,'diagnostic-autopilot.mjs'),receipt=join(W,'root-diagnostic-build-result.json');
assert(!existsSync(module)&&!existsSync(receipt),'First root compilation only; preserve every previous output');
assert.equal(readFileSync(entry,'utf8'),readFileSync(parent.entry.file,'utf8').replaceAll(parent.source,S));
const bundle=await rolldown({input:entry,cwd:'/Users/regina/Desktop/Projects/surfing-game',treeshake:true});
const {output}=await bundle.write({file:module,format:'esm'}),files=(await bundle.watchFiles).map(file=>realpathSync(file));await bundle.close();
assert.equal(output.length,1);assert.equal(output[0].type,'chunk');assert.deepEqual([...output[0].exports].sort(),['Autopilot','autopilotView','riderPartVolumes']);
const watchedFiles=[...new Set(files)].sort();assert.equal(watchedFiles.length,75);
const compilerConfigurationInputs=watchedFiles.filter(file=>file===join(S,'tsconfig.json')).map(pin);assert.equal(compilerConfigurationInputs.length,1);
const inputFiles=watchedFiles.filter(file=>file!==join(S,'tsconfig.json'));
const mapped=parent.inputs.map(q=>q.file===parent.entry.file?entry:q.file.startsWith(parent.source+'/')?S+q.file.slice(parent.source.length):q.file).map(file=>realpathSync(file)).sort();assert.deepEqual(inputFiles,mapped);
const inputs=inputFiles.map(pin),sourceInputs=inputs.filter(q=>q.file.startsWith(S+'/'));assert.equal(inputs.length,74);assert.equal(sourceInputs.length,71);
const changedSourceInputsAgainstImmediateParent=[];
for(const q of parent.sourceInputs){const relative=q.file.slice(parent.source.length+1),next=pin(join(S,relative));if(q.bytes!==next.bytes||q.sha256!==next.sha256)changedSourceInputsAgainstImmediateParent.push(relative);}
assert.deepEqual(changedSourceInputsAgainstImmediateParent.sort(),['src/physics/BoardBody.ts']);
assert(sourceInputs.some(q=>q.file===join(S,'src/physics/BoardBody.ts')));assert(sourceInputs.some(q=>q.file===join(S,'src/physics/AttachedRider.ts')));
const text=readFileSync(module,'utf8'),diagnosticLexicalObserverFieldCount=fields.allFields.filter(field=>new RegExp('(?<![\\w$])'+field+'(?![\\w$])').test(text)).length;
for(const q of [...build.sourcePins,...build.assetPins,...build.builtAssetPins,...build.generatedOutputPins])verify(q);
const result={schema:'board-raw-normal-diagnostic-root-build/v1',terminal:true,exitCode:0,source:S,sourceReadiness:build.readiness,immediateParentDiagnosticBuild:prepared.parentDiagnosticBuild,entry:pin(entry),module:pin(module),inputs,sourceInputs,compilerConfigurationInputs,compilerWatchedInputCount:75,moduleExports:[...output[0].exports],changedSourceInputsAgainstImmediateParent,boardBodyReachable:true,attachedRiderReachable:true,originalGraphMappedExactly:true,actualCompiler:'Installed rolldown from application dependency tree',compilerEntry:pin('/Users/regina/Desktop/Projects/surfing-game/node_modules/rolldown/dist/index.mjs'),compilerWrapper:pin(new URL(import.meta.url)),compilerWrapperRevision:'node-alias-v2',historicalAliasResolutions:historicalNodeAliasVerification?[historicalNodeAliasVerification]:[],observerFields:pin(join(W,'observer-fields.json')),observerFieldCount:143,diagnosticLexicalObserverFieldCount,appWorkerObserverRetention,observerRetentionPolicy:'source-graph-reachability-and-both-actual-app-workers;diagnostic-class-fields-may-be-tree-shaken',sourceOrCompleteDistModified:false,separateDiagnosticRoute:'/diagnostic-autopilot.mjs',completeBuildAssetCountUnchanged:49,rootCompleteBuild:pin(join(W,'root-complete-build-result.json')),actualNewDiagnosticSourceCompiled:true,diagnosticModuleCopiedFromPrior:false,physicalDifferenceIntentional:true,noHistoricalHelperInventoriesLoaded:true};
writeFileSync(receipt,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({complete:true,receipt:pin(receipt),module:result.module,inputs:74,sourceInputs:71,appWorkerObserverRetention}));
