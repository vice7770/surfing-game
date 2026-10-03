import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import assert from'node:assert/strict';
const path='/private/tmp/render-scale-passive-adapter-v2/derived-baseline.mjs',source=readFileSync(path,'utf8'),sha=b=>createHash('sha256').update(b).digest('hex');
const validateText=source.slice(source.indexOf('function validateOrdinary(stats)'),source.indexOf('\n\nconst onScreen ='));
const ordinary=JSON.parse(readFileSync('/private/tmp/render-scale-baseline-plan-v2.json')).ordinary;
const validate=new Function('ordinary',validateText+'\nreturn validateOrdinary;')(ordinary);
const observerText=source.slice(source.indexOf('  const nativePost=NativeWorker.prototype.postMessage;'),source.indexOf('  window.Worker = class extends NativeWorker'));
function observed(options){const perf={},sent=[];class Fake{postMessage(request,...rest){sent.push({self:this,request,rest});return'same-return';}}const original=Fake.prototype.postMessage;
 new Function('NativeWorker','perf',observerText)(Fake,perf);const worker=new Fake(),request={type:'start',config:{...ordinary.expectedConfig},options};const transfer=[];
 assert.equal(worker.postMessage(request,transfer),'same-return');assert.equal(sent[0].self,worker);assert.equal(sent[0].request,request);assert.equal(sent[0].rest[0],transfer);
 if(options.rider===true)assert.equal(Fake.prototype.postMessage,original);return perf.workerStart;}
const raw=JSON.parse(readFileSync('/private/tmp/render-scale-quality-20261003/failed-baseline-start-option-guard/baseline-fps.json')).results[0];const base=structuredClone(raw);
base.observed.workerStart=observed({rider:true,barrelCases:[0,1,2,3]});assert.equal(base.observed.workerStart.renderSpacing,null);assert.equal(base.observed.workerStart.renderSpacingOmitted,true);
const results=[];function check(name,edit,pass){const f=structuredClone(base);edit(f);const failures=validate(f);assert.equal(failures.length===0,pass,name+':'+failures.join(';'));results.push({name,passed:true,accepted:pass,failures});}
check('canonical omitted request uses observed default2',()=>{},true);
check('wrong actual grid rejected',f=>f.observed.renderSpacing=1,false);
check('wrong independent mask rejected',f=>f.observed.independentMaskSpacing=2,false);
check('explicit spacing2 override rejected',f=>f.observed.workerStart=observed({rider:true,renderSpacing:2,barrelCases:[0,1,2,3]}),false);
check('explicit undefined option rejected',f=>f.observed.workerStart=observed({rider:true,renderSpacing:undefined,barrelCases:[0,1,2,3]}),false);
check('no rider rejected',f=>f.observed.workerStart=observed({rider:false,barrelCases:[0,1,2,3]}),false);
check('wrong case count rejected',f=>f.observed.workerStart=observed({rider:true,barrelCases:[0,1,2]}),false);
check('wrong actual config rejected',f=>f.observed.workerStart.config.componentCount=24,false);
const report={scope:'tiny CPU-only tests of exact generated observational wrapper and ordinary guard; no browser/GPU',derivedSha256:sha(source),scriptSha256:sha(readFileSync(new URL(import.meta.url))),results};
writeFileSync('/private/tmp/render-scale-quality-omitted-spacing-20261003/start-guard-tests.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:results.length,derivedSha256:report.derivedSha256}));
