// Isolated graphics tradeoff preparation. Default plan=true cannot start Chrome.
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {execFileSync,spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {installHeldRasterProbe} from './render-scale-held-helper.mjs';
const root='/Users/regina/Desktop/Projects/surfing-game',work='/private/tmp/render-scale-passive-adapter-v2';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const i=arg.indexOf('=');if(i<0||!arg.startsWith('--'))throw Error('Use --name=value');return[arg.slice(2,i),arg.slice(i+1)];}));
if(Object.keys(args).some(key=>!['variant','plan','out','cdp'].includes(key)))throw Error('Only variant/plan/out/cdp may change');
const variant=args.variant??'baseline';if(!['baseline','candidate'].includes(variant))throw Error('Use variant=baseline|candidate');
const plan=args.plan??'true';if(!['true','false'].includes(plan))throw Error('Use plan=true|false');
const candidate=variant==='candidate',label=candidate?'Custom 1.5 (renderScale6/7)':'High (baseline)';
const url='http://127.0.0.1:4201/?diagnostics',dir='/private/tmp/surf-tube-stability-current-20261003';
const out=args.out??'/private/tmp/render-scale-quality-omitted-spacing-20261003',port=args.cdp??(candidate?'9536':'9535');
const canonical=root+'/scripts/browser/fps-survey.mjs',source=readFileSync(canonical,'utf8');
if(sha(source)!=='84e580b651e8ec1dcd028599d1c931b5d96a4e50c1299f9cdf38ee78dbf5d5cd')throw Error('Canonical FPS source changed');
const files=['index.html',...readdirSync(dir+'/assets').filter(f=>/\.(js|css)$/.test(f)).sort().map(f=>'assets/'+f)];
const aggregate=createHash('sha256');for(const file of files)aggregate.update(file).update(readFileSync(dir+'/'+file));
if(aggregate.digest('hex')!=='7c2e14bade277ece4f1100a09dda8fe731073a41572a6619cfeb2970328fc7a3')throw Error('Canonical frozen build changed');
mkdirSync(work,{recursive:true});mkdirSync(out,{recursive:true});
execFileSync(root+'/node_modules/.bin/rolldown',[root+'/src/game/Graphics.ts','-o',work+'/Graphics.mjs','--format','esm','--platform','node'],{cwd:root,stdio:'pipe'});
const {resolveGraphics,PRESETS}=await import(pathToFileURL(work+'/Graphics.mjs').href);
const detected={preset:'high',water:'accurate',lowPerformance:false};
const high={...PRESETS.high,preset:'high'},custom={...PRESETS.high,preset:'custom',renderScale:6/7};
const a=resolveGraphics(high,detected,2),b=resolveGraphics(custom,detected,2);
const differences=Object.keys(a).filter(key=>JSON.stringify(a[key])!==JSON.stringify(b[key]));
if(differences.join('|')!=='pixelRatio'||a.pixelRatio!==1.75||b.pixelRatio!==1.5)throw Error('Resolved settings differ beyond pixelRatio');
const equivalence={graphicsSourceSha256:sha(readFileSync(root+'/src/game/Graphics.ts')),detected,high,custom,resolvedHigh:a,resolvedCustom:b,differences,
  ownSurferLodDistance:'Infinity for both via ownSurferDetail',shaderImplementationUnchanged:true,pointUniformSourceSha256:sha(readFileSync(root+'/src/scene/SprayPoints.ts')),
  threeMaterialsSourceSha256:sha(readFileSync(root+'/node_modules/three/src/renderers/webgl/WebGLMaterials.js'))};
new Function('return '+installHeldRasterProbe.toString());
let derived=source;const changes=[];
function replace(name,before,after){if(derived.split(before).length!==2)throw Error('FPS source marker changed: '+name);derived=derived.replace(before,after);changes.push({name,beforeSha256:sha(before),afterSha256:sha(after)});}
replace('owned-launcher',"from './cdp.mjs'",'from '+JSON.stringify(work+'/owned-cdp.mjs'));
replace('imports',"import { launch, sleep }", "import { gzipSync } from 'node:zlib';\nimport { installHeldRasterProbe } from '/private/tmp/render-scale-held-helper.mjs';\nimport { launch, sleep }");
replace('selected-row',"args.only !== 'High (baseline)'",'args.only !== '+JSON.stringify(label));
replace('feature',"['High (baseline)', {}]",'['+JSON.stringify(label)+','+(candidate?'{renderScale:6/7}':'{}')+']');
replace('edition-guard',"expectedMaxBatchSteps: EDITION === 'catchup-batch2' ? 2 : undefined",'expectedMaxBatchSteps:1');
replace('expected-buffer','expectedCanvas: BASELINE_RIDE.canvas', 'expectedCanvas:'+JSON.stringify(candidate?'2562 × 1389':'2989 × 1620'));
replace('expected-graphics',"expectedRenderPixelRatio: 1.75, graphics: { ...PRESET_VALUES.high, preset: 'high' }",'expectedRenderPixelRatio:'+(candidate?'1.5':'1.75')+', graphics:'+JSON.stringify(candidate?custom:high));
replace('comparison-label','timingComparableToPassiveBaseline: !GPU_DIAGNOSTIC','timingComparableToPassiveBaseline:!GPU_DIAGNOSTIC,explicitGraphicsTradeoff:'+candidate+',nativeQualityPreserved:'+(!candidate));
replace('baseline-comparable','baselineComparable: failures.length === 0 && !GPU_DIAGNOSTIC','baselineComparable: failures.length===0&&!GPU_DIAGNOSTIC&&'+(!candidate)+',configuredGraphicsTradeoffMatches:failures.length===0,nativeQualityPreserved:'+(!candidate));
replace('worker-start-observer','  const NativeWorker = window.Worker;',`  const NativeWorker = window.Worker;
  const nativePost=NativeWorker.prototype.postMessage;NativeWorker.prototype.postMessage=function(request,...rest){
    if(request?.type==='start'&&request.config?.spot==='padang'&&request.options?.rider===true){
      perf.workerStart={config:{...request.config},rider:request.options.rider,renderSpacing:request.options.renderSpacing??null,renderSpacingOmitted:!Object.prototype.hasOwnProperty.call(request.options,'renderSpacing'),barrelCaseCount:request.options.barrelCases?.length??0};
      NativeWorker.prototype.postMessage=nativePost;
    }return Reflect.apply(nativePost,this,[request,...rest]);
  };`);
replace('worker-start-output','maxBatchSteps: d?.mode?.host?.maxBatchSteps,','maxBatchSteps: d?.mode?.host?.maxBatchSteps,workerStart:window.__perf.workerStart,independentMaskSpacing:d?.water?.barrelMaskGrid?.spacing,');
replace('physics-render-guards',"  if (!(stats.freshSnapshots > 1)",`  if(o.renderSpacing!==2||o.independentMaskSpacing!==1||o.renderPixelRatio!==ordinary.expectedRenderPixelRatio)failures.push('Render/contact/raster spacing changed');
  if(!o.workerStart||o.workerStart.rider!==true||o.workerStart.renderSpacing!==null||o.workerStart.renderSpacingOmitted!==true||o.workerStart.barrelCaseCount!==4)failures.push('Actual rider/contact start options differ');
  for(const [key,value]of Object.entries(ordinary.expectedConfig))if(o.workerStart?.config?.[key]!==value)failures.push('Actual worker config differs:'+key);
  if (!(stats.freshSnapshots > 1)`);
replace('plan-equivalence','const ordinary = ordinaryPlan();',`const ordinary=ordinaryPlan();ordinary.resolvedEquivalence=${JSON.stringify(equivalence)};
ordinary.graphicsDelta=${JSON.stringify(candidate?{preset:['high','custom'],renderScale:[1,6/7],pixelRatio:[1.75,1.5],canvas:['2989 × 1620','2562 × 1389']}:{})};
ordinary.captureOutsideSample='After validated passive90, Escape→pause→outstanding0; retain full source/export/geometry/particles. Baseline held raster1.75→1.5→1.75 in same complete scene; candidate final capture verifies actualCustom uniforms/tier/shaders.';`);
replace('held-after-pause',"  if (pause) await measure(setting, 'Pause menu', MENU_SECONDS, 1500);",`  await captureHeld();
  if (pause) await measure(setting, 'Pause menu', MENU_SECONDS, 1500);`);
replace('held-function','async function ride(setting, spot, { pause = false } = {}) {',`async function captureHeld(){
  const folder=${JSON.stringify(out+'/'+variant+'-held')};mkdirSync(folder,{recursive:true});
  await page.eval('('+installHeldRasterProbe.toString()+')()');
  const full=await page.eval('window.__heldRaster.capture()');const fullBytes=Buffer.from(JSON.stringify(full));
  const sourcePath=join(folder,'source.json.gz');writeFileSync(sourcePath,gzipSync(fullBytes,{level:9,mtime:0}));
  const frames=[];const ratios=${JSON.stringify(candidate?[['actualCustom',1.5]]:[['native',1.75],['raster1p5',1.5],['nativeRepeat',1.75]])};
  for(const [name,ratio]of ratios){const observed=await page.eval('window.__heldRaster.draw('+ratio+')');
    const png=Buffer.from((await page.send('Page.captureScreenshot',{format:'png'})).data,'base64'),path=join(folder,name+'.png');writeFileSync(path,png);frames.push({name,ratio,path,pngSha256:sha(png),bytes:png.length,observed});}
  const invariant=await page.eval('window.__heldRaster.finish()');
  const first=frames[0].observed;for(const frame of frames)for(const key of ['shaderPrograms','shadow','ownSurferDetail','lights','waterSun'])if(JSON.stringify(first[key])!==JSON.stringify(frame.observed[key]))throw Error('Held tier/shader/lighting changed:'+key);
  const held={kind:${JSON.stringify(candidate?'ActualCustom final scene; not matched to evolving baseline':'Same loaded baseline physics/geometry at both raster ratios')},sourcePath,sourceJsonSha256:sha(fullBytes),sourceCompressedSha256:sha(readFileSync(sourcePath)),invariant,frames,
    baselineRepeatPngSame:${candidate?'null':"frames[0].pngSha256===frames[2].pngSha256"},qualityAccepted:false};
  writeFileSync(join(folder,'report.json'),JSON.stringify(held,null,2)+'\\n');run.held=held;save();
}
async function ride(setting, spot, { pause = false } = {}) {`);
replace('bounded-open','let save = () => {};\ntry {',`let save=()=>{};const bounded=async(promise,seconds)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Owned passive/held deadline')),seconds*1000);})]);}finally{clearTimeout(timer);}};
try{await bounded((async()=>{`);
replace('bounded-close','} finally {\n  save();\n  await page.close();','})(),360);\n}finally{\n  save();\n  await page.close();');
execFileSync(process.execPath,['--check','/dev/stdin'],{input:derived,stdio:['pipe','pipe','pipe']});
const launcherSource=readFileSync('/private/tmp/gpu-dx24-quality-adapter/owned-cdp.mjs','utf8').replace('breakline-dx24-quality-','breakline-render-scale-')+'\nexport{sleep};\n';
writeFileSync(work+'/owned-cdp.mjs',launcherSource);writeFileSync(work+'/derived-'+variant+'.mjs',derived);
const metadata={variant,plan,adapterSha256:sha(readFileSync(new URL(import.meta.url))),canonicalSha256:sha(source),derivedSha256:sha(derived),heldHelperSha256:sha(readFileSync('/private/tmp/render-scale-held-helper.mjs')),launcherSha256:sha(launcherSource),equivalence,changes,productionEdited:false,sourceRuntimeAggregate:'7c2e14bade277ece4f1100a09dda8fe731073a41572a6619cfeb2970328fc7a3'};
writeFileSync(out+'/'+variant+'-adapter-meta.json',JSON.stringify(metadata,null,2)+'\n');
const childArgs=[work+'/derived-'+variant+'.mjs',out+'/'+variant+'-fps.json','--url='+url,'--dir='+dir,'--baseline='+root+'/docs/research/performance-2026-10-03/padang-live-frame-pacing.json','--features=true','--only='+label,'--spot=Padang','--swell=Big','--rideSeconds=90','--warmSeconds=5','--gpuTiming=false','--width=1708','--height=926','--qualityBase=1bcc7c0c9','--edition=render-scale-'+variant,'--cdp='+port,...(plan==='true'?['--plan=true']:[])];
const child=spawn(process.execPath,childArgs,{cwd:root,stdio:'inherit'});process.exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>resolve(code??1));});
