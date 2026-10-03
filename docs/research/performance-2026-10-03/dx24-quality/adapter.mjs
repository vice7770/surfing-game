// Isolated adaptation. Default --plan=true cannot launch Chrome. Root grants the GPU lease separately.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const root='/Users/regina/Desktop/Projects/surfing-game', work='/private/tmp/gpu-dx24-quality-adapter';
const sourcePath=root+'/scripts/browser/gpu-resolution-fidelity.ts', source=readFileSync(sourcePath,'utf8');
const sha=value=>createHash('sha256').update(value).digest('hex');
if(sha(source)!=='b50f34679b8d66983fcde3d832de276e810dfd133aed8bf97ecca5ada65f8939')throw Error('Canonical quality helper changed since review');
const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const at=arg.indexOf('=');if(!arg.startsWith('--')||at<0)throw Error('Use --name=value');return[arg.slice(2,at),arg.slice(at+1)];}));
if(args.plan!==undefined&&!['true','false'].includes(args.plan))throw Error('Invalid --plan');
const defaults={url:'http://127.0.0.1:4201/',dir:'/private/tmp/surf-tube-stability-current-20261003',out:'/private/tmp/padang-dx24-quality-20261003',at:'5,15,30',spinUp:'2',seaTime:'400',width:'1708',height:'926',cdp:'9524',plan:'true'};
const options={...defaults,...args};
for(const key of ['at','spinUp','seaTime','width','height'])if(options[key]!==defaults[key])throw Error('This controlled trial fixes '+key+'='+defaults[key]);
if(options.allowBuildDifference==='true')throw Error('Quality isolation requires one immutable runtime');
if(options.before&&options.before!==options.url||options.after&&options.after!==options.url||options.beforeDir&&options.beforeDir!==options.dir||options.afterDir&&options.afterDir!==options.dir)throw Error('Both grids require the same URL/directory');
if(!options.dir)throw Error('Frozen directory required');
const frozenFiles=['index.html',...readdirSync(options.dir+'/assets').filter(name=>/\.(js|css)$/.test(name)).sort().map(name=>'assets/'+name)];
const frozenAggregate=createHash('sha256');const frozenManifest=frozenFiles.map(file=>{const bytes=readFileSync(options.dir+'/'+file);frozenAggregate.update(file).update(bytes);return{file,sha256:sha(bytes)};});
const expectedFrozen={root:options.dir,sha256:frozenAggregate.digest('hex'),files:frozenManifest};
if(expectedFrozen.sha256!=='7c2e14bade277ece4f1100a09dda8fe731073a41572a6619cfeb2970328fc7a3')throw Error('Frozen runtime changed since review');
mkdirSync(work,{recursive:true});let derived=source;const changes=[];
function replace(name,before,after){if(derived.split(before).length!==2)throw Error('Exact helper marker changed: '+name);derived=derived.replace(before,after);changes.push({name,beforeSha256:sha(before),afterSha256:sha(after)});}
replace('grid-labels',"const specs = [{ label:'dx1', dx:1,", "const specs = [{ label:'dx2', dx:2,");
replace('coarse-grid-label',"{ label:'dx2', dx:2, url:args.after", "{ label:'dx4', dx:4, url:args.after");
replace('description','Actual worker/GPU dx=1 versus dx=2 quality screen','Actual worker/GPU dx=2 versus dx=4 quality screen');
replace('defect-caveat','that dx=2 caused an existing loft defect','that dx=4 caused an existing loft defect');
replace('simulation-import',"from '../../src/wave/SurfZoneSimulation'",'from '+JSON.stringify(root+'/src/wave/SurfZoneSimulation.ts'));
replace('grid-import',"from '../../src/wave/ShallowWaterSolver'",'from '+JSON.stringify(root+'/src/wave/ShallowWaterSolver.ts'));
replace('cdp-import',"from './cdp.mjs'",'from '+JSON.stringify(work+'/owned-cdp.mjs'));
const nativeGraphics={preset:'high',renderScale:1,nativePixelDensity:true,frameLimit:60,waterSimulation:'auto',seaDetail:'rich',caustics:true,sprayMist:true,oceanView:'far',foam:'detailed',waterLook:'rich',particles:'high'};
replace('native-graphics',"{preset:'high',frameLimit:'60',waterLook:'rich',particles:'high'}",JSON.stringify(nativeGraphics));
replace('contact-enable',"  const raf=requestAnimationFrame.bind(window);",`  const NativeWorker=window.Worker;window.Worker=class extends NativeWorker {
    postMessage(request,transfer){if(request?.type==='start'&&request.config?.spot==='padang'){
      request={...request,options:{...request.options,contact:true}};
      window.__qualityLatestStart={config:{...request.config},contact:request.options.contact,rider:request.options.rider,renderSpacing:request.options.renderSpacing,barrelCaseCount:request.options.barrelCases?.length??0};
    }return super.postMessage(request,transfer);}
  };
  const raf=requestAnimationFrame.bind(window);`);
replace('contact-stage-status','frontCount:host.snapshot.frontCount, bubbleCount:host.snapshot.bubbleCount', 'contactBuildMs:requireFinite(s.pipelineMs?.contact,\'contact build timing\'),frontCount:host.snapshot.frontCount, bubbleCount:host.snapshot.bubbleCount');
replace('contact-proof','  run.elapsedWallSeconds=(Date.now()-wall)/1000;run.events=event;', `  run.contactProof={start:initial.observed.workerStart,activeTimedTimelineSamples:run.timeline.filter(s=>s.frontCount>0&&s.contactBuildMs>0).length,nonemptyGeometryCheckpoints:run.checkpoints.filter(s=>s.tubeGeometry.sliceCount>0&&s.tubeGeometry.vertexCount>0).map(s=>s.at)};
  if(!run.contactProof.activeTimedTimelineSamples||!run.contactProof.nonemptyGeometryCheckpoints.length)throw new Error('No active worker contact/renderer geometry proof');
  run.elapsedWallSeconds=(Date.now()-wall)/1000;run.events=event;`);
replace('hold-before-start','const d=window.breaklineDiagnostics,lab=window.breaklineLab;lab.clock.paused=true;','const d=window.breaklineDiagnostics,lab=window.breaklineLab;lab.clock.paused=true;window.__qualityStopFrames=true;');
replace('keep-native-size','    d.resize(${Number(args.width??1280)},${Number(args.height??720)});d.setWaterLook',`    if(innerWidth!==1708||innerHeight!==926||devicePixelRatio!==2)throw new Error('Native viewport/DPR differs');
    if(d.canvas.width!==2989||d.canvas.height!==1620)throw new Error('Native buffer differs');
    if(!window.__qualityLatestStart?.contact||window.__qualityLatestStart.rider!==false||window.__qualityLatestStart.renderSpacing!==1||window.__qualityLatestStart.barrelCaseCount<1)throw new Error('Missing1m worker contact');
    if(d.water.vertexNormals||d.mode.particleLevel!=='high')throw new Error('Normals/particles changed');
    d.setWaterLook`);
replace('native-observation','      camera:{position:c.position.toArray()',`      observed:{viewport:innerWidth+' × '+innerHeight,dpr:devicePixelRatio,canvas:d.canvas.width+' × '+d.canvas.height,vertexNormals:d.water.vertexNormals,particles:d.mode.particleLevel,waterLook:d.water.drawnLook,graphics:JSON.parse(localStorage.getItem('breakline.settings.v1')).graphics,workerStart:window.__qualityLatestStart},
      camera:{position:c.position.toArray()`);
replace('observed-start-config','  const resolved={...initial.config};', `  const resolved={...initial.config};
  for(const [key,expected]of Object.entries(${JSON.stringify(nativeGraphics)}))if(initial.observed.graphics[key]!==expected)throw new Error('Native graphics setting differs: '+key);
  for(const [key,expected]of Object.entries({...shared,dx:spec.dx,componentCount:64}))if(initial.observed.workerStart.config[key]!==expected)throw new Error('Actual worker start differs: '+key);`);
replace('native-mask-guard','      d.render(0,window.__qualityCamera);const status=h.selectedStatus();',`      d.render(0,window.__qualityCamera);if(d.water.barrelMaskGrid.spacing!==1)throw new Error('Independent mask is not1m');
      if(d.canvas.width!==2989||d.canvas.height!==1620||d.water.vertexNormals||d.mode.particleLevel!=='high'||d.water.drawnLook!=='rich')throw new Error('Checkpoint quality changed');const status=h.selectedStatus();`);
replace('plume-measures','totalFoamAreaM2:0,airVolumeM3:0','totalFoamAreaM2:0,airVolumeM3:0,plumeDepthAreaM3:0,voidFractionAreaM2:0');
replace('plume-aggregation',"dest.airVolumeM3+=arrays['aeration.air'][n]*area;", "dest.airVolumeM3+=arrays['aeration.air'][n]*area;dest.plumeDepthAreaM3+=arrays['aeration.depth'][n]*area;dest.voidFractionAreaM2+=(arrays['aeration.depth'][n]>0?Math.min(1,arrays['aeration.air'][n]/arrays['aeration.depth'][n]):0)*area;");
replace('launch-comparison','    onset:{fine:a.physical.onset,coarse:b.physical.onset}',`    launches:{dx2:{count:a.status.lipLaunches,volumeM3:a.status.lipVolume,jets:a.status.lipJets,rollers:a.status.lipRollers,columnWidthProxyM:a.status.lipLaunches*2},dx4:{count:b.status.lipLaunches,volumeM3:b.status.lipVolume,jets:b.status.lipJets,rollers:b.status.lipRollers,columnWidthProxyM:b.status.lipLaunches*4}},
    onset:{fine:a.physical.onset,coarse:b.physical.onset}`);
replace('css-manifest',"filter(n=>n.endsWith('.js'))", "filter(n=>/\\.(js|css)$/.test(n))");
replace('all-served-bundles','  const response=await fetch(base);',`  const verified=[];for(const file of files){const response=await fetch(new URL(file,base));if(!response.ok)throw new Error('Missing served '+file);const served=new Uint8Array(await response.arrayBuffer());const expected=hash(readFileSync(join(root,file)));if(hash(served)!==expected)throw new Error('Served file differs '+file);verified.push({file,sha256:expected});}
  const response=await fetch(base);`);
replace('manifest-results','return {root,sha256:sha.digest', 'return {root,verified,sha256:sha.digest');
replace('no-unverified-runtime','  if(!directory)return {unverified:true};', "  if(!directory)throw new Error('Immutable directory required');");
replace('probe-cell-guards',"if(args.plan==='true'){console.log(JSON.stringify(plan,null,2));process.exit(0);}",`if(plan.steps!==1800||plan.variants[0].physicsGrid.nx!==160||plan.variants[1].physicsGrid.nx!==80||plan.variants.some(v=>v.physicsGrid.nz!==725))throw new Error('dx2/4 geometry/clock changed');
plan.numericApproximation='Alongshore dx2→dx4; fineSpacing1 and all other sea inputs fixed. Not exact semantics or FPS.';
plan.expectedNative={viewport:'1708 × 926',browserDpr:2,renderPixelRatio:1.75,canvas:'2989 × 1620',graphics:${JSON.stringify(nativeGraphics)},contactSamplingM:1,independentMaskSamplingM:1};
if(args.plan==='true'){console.log(JSON.stringify(plan,null,2));process.exit(0);}`);
replace('overall-deadline','  const a=await capture(specs[0],0),b=await capture(specs[1],1);', "  const [a,b]=await bounded((async()=>[await capture(specs[0],0),await capture(specs[1],1)])(),600,'Paired GPU quality trial');");
replace('extra-caveat',"'Warm states are independently spun up on their respective grids.","'Riderless worker contact is enabled identically;1m geometry is checked, but no board/contact trajectory is certified. Turbulence is not exported by SET1 and is not directly compared. Native checkpoints remain held, not a FPS run.',\n    'Warm states are independently spun up on their respective grids.");
if(/label:'dx1'|dx=1 versus dx=2/.test(derived))throw Error('Old variant labels survived');
const instrumentBegin=derived.indexOf('const instrument=`'), instrumentEnd=derived.indexOf('\nconst page=await launch',instrumentBegin);
if(instrumentBegin<0||instrumentEnd<0)throw Error('Browser instrumentation marker changed');
const instrumentSource=new Function(derived.slice(instrumentBegin,instrumentEnd)+'\nreturn instrument;')();new Function(instrumentSource);
const ownedCdp=`import {spawn} from 'node:child_process';import{mkdtempSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{Page,sleep}from ${JSON.stringify(pathToFileURL(root+'/scripts/browser/cdp.mjs').href)};
export async function launch({url,width,height,port,args=[]}){
 let occupied=false;try{const r=await fetch('http://127.0.0.1:'+port+'/json/version');occupied=r.ok;}catch{}if(occupied)throw Error('Owned CDP port already occupied');
 const profile=mkdtempSync(join(tmpdir(),'breakline-dx24-quality-'));let chrome,page,closed=false;
 const close=async()=>{if(closed)return;closed=true;try{page?.socket?.close();chrome?.kill();await sleep(500);}finally{rmSync(profile,{recursive:true,force:true});}};
 try{chrome=spawn(process.env.CHROME??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--remote-debugging-port='+port,'--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-extensions','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling','--autoplay-policy=no-user-gesture-required','--window-size='+width+','+(height+40),'--window-position=60,60','--app='+url,...args],{stdio:'ignore'});
 let launchError;chrome.once('error',error=>{launchError=error;});let target;for(let n=0;n<100&&!target;n++){await sleep(150);if(launchError)throw launchError;try{const list=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();target=list.find(t=>t.type==='page'&&t.url.startsWith(url.split('?')[0]));}catch{}}
 if(!target)throw Error('Owned quality Chrome did not open target');page=await Page.connect(target.webSocketDebuggerUrl);page.close=close;await page.send('Page.enable');await page.send('Runtime.enable');await page.send('Emulation.setFocusEmulationEnabled',{enabled:true});await page.fitViewport(width,height);return page;
 }catch(error){await close();throw error;}
}
`;
writeFileSync(work+'/owned-cdp.mjs',ownedCdp);writeFileSync(work+'/derived.ts',derived);
const metadata={sourcePath,sourceSha256:sha(source),adapterSha256:sha(readFileSync(new URL(import.meta.url))),derivedSha256:sha(derived),ownedLauncherSha256:sha(ownedCdp),changes,options,expectedFrozen,productionEdited:false,gpuRunAuthorizedHere:false,browserInstrumentationSyntaxChecked:true};
writeFileSync(work+'/adapter-meta.json',JSON.stringify(metadata,null,2)+'\n');
const reportMetadata={...metadata,changes:changes.map(change=>change.name)};
// Retain provenance before launching anything, including for a failed run or plan.
const metadataReportPath=options.out+'/adapter-meta.json';
mkdirSync(options.out,{recursive:true});writeFileSync(metadataReportPath,JSON.stringify(reportMetadata,null,2)+'\n');
execFileSync(root+'/node_modules/.bin/rolldown',[work+'/derived.ts','-o',work+'/derived.mjs','--format','esm','--platform','node'],{cwd:root,stdio:'pipe'});
const child=spawn(process.execPath,[work+'/derived.mjs',...Object.entries(options).map(([key,value])=>'--'+key+'='+value)],{cwd:root,stdio:'inherit'});
process.exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>resolve(code??1));});
