import{readFileSync,writeFileSync}from'node:fs';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';import assert from'node:assert/strict';
const root='/Users/regina/Desktop/Projects/surfing-game',source=readFileSync('/private/tmp/render-scale-passive-adapter-v3/derived-baseline.mjs','utf8'),sha=b=>createHash('sha256').update(b).digest('hex');
const main=readFileSync(root+'/src/main.ts','utf8');assert.equal(sha(main),sha(execFileSync('git',['show','1bcc7c0c9:src/main.ts'],{cwd:root})));
const header='function surfZoneFactory(rider: boolean, stance: StanceName): SurfZoneHostFactory {';assert.equal(main.split(header).length,2);
const body=main.split(header)[1].split('\n}')[0];assert(body.includes('{ rider, renderSpacing, stance, ...extra }'));
class FactoryHost{constructor(config,_port,options){this.config=config;this.options=options;}}
// Execute the exact main.ts factory body, including its own undefined member and extra-field ordering.
const factory=new Function('devParam','inPage','LocalSurfZone','WorkerSurfZone','rider','stance',body);
const ordinary=JSON.parse(readFileSync('/private/tmp/render-scale-baseline-plan-v3.json')).ordinary;
function options({rider=true,query=null,extra={}}={}){const host=factory(()=>query,false,FactoryHost,FactoryHost,rider,'regular')(ordinary.expectedConfig,{barrelCases:[0,1,2,3],...extra});
 const cloned=structuredClone(host.options);assert(Object.prototype.hasOwnProperty.call(cloned,'renderSpacing'));return cloned;}
const validateText=source.slice(source.indexOf('function validateOrdinary(stats)'),source.indexOf('\n\nconst onScreen ='));
const validate=new Function('ordinary',validateText+'\nreturn validateOrdinary;')(ordinary);
const observerText=source.slice(source.indexOf('  const nativePost=NativeWorker.prototype.postMessage;'),source.indexOf('  window.Worker = class extends NativeWorker'));
function observed(options){const perf={},sent=[];class Fake{postMessage(request,...rest){sent.push({self:this,request,rest});return'same-return';}}const original=Fake.prototype.postMessage;
 new Function('NativeWorker','perf',observerText)(Fake,perf);const worker=new Fake(),request={type:'start',config:{...ordinary.expectedConfig},options};const transfer=[];
 assert.equal(worker.postMessage(request,transfer),'same-return');assert.equal(sent[0].self,worker);assert.equal(sent[0].request,request);assert.equal(sent[0].rest[0],transfer);
 if(options.rider===true)assert.equal(Fake.prototype.postMessage,original);return perf.workerStart;}
const raw=JSON.parse(readFileSync('/private/tmp/render-scale-quality-20261003/failed-baseline-start-option-guard/baseline-fps.json')).results[0];const base=structuredClone(raw);
base.observed.workerStart=observed(options());assert.equal(base.observed.workerStart.renderSpacing,null);assert.equal(base.observed.workerStart.renderSpacingValueIsUndefined,true);assert.equal(base.observed.workerStart.renderSpacingHasOwn,true);
const results=[];function check(name,edit,pass){const f=structuredClone(base);edit(f);const failures=validate(f);assert.equal(failures.length===0,pass,name+':'+failures.join(';'));results.push({name,passed:true,accepted:pass,failures});}
check('exact factory own undefined + structured clone passes',()=>{},true);
check('wrong actual grid rejected',f=>f.observed.renderSpacing=1,false);
check('wrong independent mask rejected',f=>f.observed.independentMaskSpacing=2,false);
check('explicit numeric2 override rejected',f=>f.observed.workerStart=observed(options({query:'2'})),false);
check('explicit numeric4 override rejected',f=>f.observed.workerStart=observed(options({query:'4'})),false);
check('explicit null option rejected',f=>f.observed.workerStart=observed(options({extra:{renderSpacing:null}})),false);
check('noncanonical missing property rejected',f=>{const o=options();delete o.renderSpacing;f.observed.workerStart=observed(o);},false);
check('no rider rejected',f=>f.observed.workerStart=observed(options({rider:false})),false);
check('wrong case count rejected',f=>f.observed.workerStart=observed(options({extra:{barrelCases:[0,1,2]}})),false);
check('wrong actual config rejected',f=>f.observed.workerStart.config.componentCount=24,false);
const report={scope:'tiny CPU-only exact main.ts surfZoneFactory body + structuredClone, generated observer and ordinary guard; no browser/GPU',mainSha256:sha(main),factoryBodySha256:sha(body),derivedSha256:sha(source),scriptSha256:sha(readFileSync(new URL(import.meta.url))),results};
writeFileSync('/private/tmp/render-scale-quality-default-option-20261003/start-guard-tests.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:results.length,mainSha256:report.mainSha256,derivedSha256:report.derivedSha256}));
