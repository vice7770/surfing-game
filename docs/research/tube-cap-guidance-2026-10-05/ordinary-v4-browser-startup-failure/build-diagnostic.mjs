// Root-only new compilation. Never copies the prior line-policy module.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { rolldown } from '/Users/regina/Desktop/Projects/surfing-game/node_modules/rolldown/dist/index.mjs';
const W='/private/tmp/tube-guided-ordinary-v4-telemetry-native-20261005',R='/Users/regina/Desktop/Projects/surfing-game';
const pin=file=>{const raw=readFileSync(file);return{file,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex')};};
const authority=JSON.parse(readFileSync(W+'/root-build-authority.json'));
assert.equal(authority.schema,'guided-ordinary-root-build-authority/v4');assert.equal(authority.applicationTerminalExitCode,0);assert.equal(authority.rootVerifiedNewProductionBuild,true);
assert.equal(authority.buildId,'tube-guided-passive-telemetry-20261005');
assert.deepEqual(pin(authority.applicationBuildLog.file),authority.applicationBuildLog,'Actual fresh successful application log pin required');
assert.equal(JSON.parse(readFileSync(R+'/dist/build.json')).build,authority.buildId);
assert(!existsSync(W+'/diagnostic-build.json')&&!existsSync(W+'/diagnostic-autopilot.mjs'),'One new root build only');
const bundle=await rolldown({input:W+'/autopilot-entry.ts',cwd:R,treeshake:true});
try {
 const {output}=await bundle.write({file:W+'/diagnostic-autopilot.mjs',format:'esm'});
 const sourceFiles=[...new Set((await bundle.watchFiles).map(file=>realpathSync(file)))].sort();
 assert(sourceFiles.includes(R+'/src/dev/Autopilot.ts')&&sourceFiles.includes(R+'/src/dev/TubePilot.ts'),'Current tube controller must be compiled');
 const result={schema:'guided-ordinary-diagnostic-build/v4',complete:true,buildId:authority.buildId,entry:pin(W+'/autopilot-entry.ts'),module:pin(W+'/diagnostic-autopilot.mjs'),
  compiledSources:sourceFiles.map(pin),compiler:pin(R+'/node_modules/rolldown/dist/index.mjs'),
  exports:output.filter(o=>o.type==='chunk').flatMap(o=>o.exports).sort(),copiedHistoricalModule:false,style:'tube',runtimeResourcesStarted:false};
 assert(result.exports.includes('Autopilot')&&result.exports.includes('autopilotView'));
 writeFileSync(W+'/diagnostic-build.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({complete:true,module:result.module,compiledSourceCount:result.compiledSources.length,exports:result.exports}));
} finally { await bundle.close(); }
