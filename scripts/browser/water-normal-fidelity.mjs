// Held-state normal quality screen. One dx2/fineSpacing1/renderSpacing2 GPU run; no FPS claim.
// node scripts/browser/water-normal-fidelity.mjs --url=http://localhost:4189/ --dir=/private/tmp/frozen-dist --out=/private/tmp/water-normal-quality
// --plan=true checks the injected helper without opening Chrome. Run only while GPU benchmarks are idle.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { launch } from './cdp.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const at=arg.indexOf('=');if(!arg.startsWith('--')||at<0)throw Error('Use --name=value arguments');return[arg.slice(2,at),arg.slice(at+1)];}));
const at=(args.at??'0,5,15,30').split(',').map(Number);
if(!at.length||at.some((t,i)=>!Number.isFinite(t)||t<0||t>60||Math.abs(t*60-Math.round(t*60))>1e-7||(i&&t<=at[i-1])))throw Error('Invalid --at checkpoints');
const settings={spot:'padang',stage:2,compute:'auto',source:'buoy',significantHeight:3.8,peakPeriod:18,directionDegrees:0,spread:0,spreading:150,tide:0,windSpeed:0,stormWindSpeed:18,stormFetchKm:600,stormDurationHours:36,stormDistanceKm:3000};
const overrides={seed:8761,componentCount:64,alongShore:320,dx:2,fineSpacing:1,spinUpPeriods:Number(args.spinUp??2),startSeaTime:Number(args.seaTime??400)};
const out=resolve(args.out??'/private/tmp/water-normal-quality');
const url=new URL(args.url??'http://localhost:4189/');url.searchParams.set('diagnostics','');url.searchParams.set('graphics','high');url.searchParams.set('renderSpacing','2');url.searchParams.set('waterNormals','pixel');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

function installNormalHelpers(){
  const d=window.breaklineDiagnostics,water=d.water;
  const hash=async(array,limit=array.length)=>{const bytes=new Uint8Array(array.buffer,array.byteOffset,limit*array.BYTES_PER_ELEMENT);const h=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(h),v=>v.toString(16).padStart(2,'0')).join('');};
  const finite=(value,name)=>{if(!Number.isFinite(value))throw Error('Nonfinite '+name);return value;};
  const finiteArray=(array,count=array.length)=>{for(let i=0;i<count;i++)finite(array[i],'array['+i+']');};
  async function signature(){
    const host=d.mode.host,s=host.snapshot,loft=d.mode.barrelLoft,u=water.materialUniforms;
    if(host.outstandingSteps||s.status.compute!=='gpu'||s.status.ride)throw Error('Expected idle riderless GPU checkpoint');
    finite(s.status.seaTime,'seaTime');finiteArray(water.surfaceData);
    const geom=async(g)=>({position:await hash(g.getAttribute('position').array),indices:g.index?await hash(g.index.array):null,positionCount:g.getAttribute('position').count,indexCount:g.index?.count??0});
    const texture=async(name)=>{const t=u[name]?.value;return t?.image?.data?{uuid:t.uuid,version:t.version,hash:await hash(t.image.data),width:t.image.width,height:t.image.height}:{uuid:t?.uuid,version:t?.version,width:t?.image?.width,height:t?.image?.height};};
    if(loft){finiteArray(loft.positions,loft.vertexCount*3);finiteArray(loft.normals,loft.vertexCount*3);}
    return {seaTime:s.status.seaTime,cells:s.status.cells,frontCount:s.frontCount,grid:{...water.grid},maskGrid:{...water.barrelMaskGrid},
      surface:await hash(water.surfaceData),snapshotSurface:await hash(s.surface),front:await hash(s.front,s.frontCount*9),
      mainGeometry:await geom(water.mesh.geometry),patchGeometry:await geom(water.patch.geometry),patchMatrix:water.patch.matrixWorld.toArray(),
      loft:loft?{vertices:loft.vertexCount,indices:loft.indexCount,positions:await hash(loft.positions,loft.vertexCount*3),indicesHash:await hash(loft.indices,loft.indexCount),normals:await hash(loft.normals,loft.vertexCount*3)}:null,
      textures:Object.fromEntries(await Promise.all(['waterSurface','waterBarrelMask','waterFlow','waterAeration','waterRippleMap','waterChurnMap','waterChopMap'].map(async name=>[name,await texture(name)]))),
      optics:Object.fromEntries(['waterAttenuation','waterDiffuseAttenuation','waterDeepReflectance','waterBedAlbedo','waterSunDirection','waterSunRadiance','waterBodyGain'].map(name=>[name,u[name]?.value?.toArray?.()??u[name]?.value])),
      stableUniforms:{waterTime:u.waterTime?.value,waterChop:u.waterChop?.value,waterChopFft:u.waterChopFft?.value,waterChopPatch:u.waterChopPatch?.value,waterRippleStrength:u.waterRippleStrength?.value,waterReflection:u.waterReflection?.value,roughness:water.mesh.material.roughness,
        patchRect:u.waterPatchRect.value.toArray(),maskGrid:u.waterBarrelGrid.value.toArray(),maskSize:u.waterBarrelGridSize.value.toArray(),maskActive:u.waterBarrelMaskActive.value}};
  }
  function angularScreen(){
    const grid=water.grid,data=water.surfaceData,mask=water.materialUniforms.waterBarrelMask.value.image.data,mg=water.barrelMaskGrid,rect=water.materialUniforms.waterPatchRect.value;
    const weights=t=>{const t2=t*t,t3=t2*t;return[(-t3+2*t2-t)/2,(3*t3-5*t2+2)/2,(-3*t3+4*t2+t)/2,(t3-t2)/2];};
    const deriv=t=>{const t2=t*t;return[(-3*t2+4*t-1)/2,(9*t2-10*t)/2,(-9*t2+8*t+1)/2,(3*t2-2*t)/2];};
    const slope=(x,z)=>{const gx=(x-grid.xMin)/grid.spacing,gz=(z-grid.zMin)/grid.spacing,i=Math.floor(gx),k=Math.floor(gz),wx=weights(gx-i),wz=weights(gz-k),dx=deriv(gx-i),dz=deriv(gz-k);let sx=0,sz=0;
      for(let b=0;b<4;b++)for(let a=0;a<4;a++){const col=Math.max(0,Math.min(grid.nx-1,i+a-1)),row=Math.max(0,Math.min(grid.nz-1,k+b-1)),h=data[2*(row*grid.nx+col)];sx+=wz[b]*dx[a]*h;sz+=dz[b]*wx[a]*h;}return[sx/grid.spacing,sz/grid.spacing];};
    const masked=(x,z)=>{if(water.materialUniforms.waterBarrelMaskActive.value<=0)return false;const gx=(x-mg.xMin)/mg.spacing,gz=(z-mg.zMin)/mg.spacing,i=Math.floor(gx),k=Math.floor(gz),tx=gx-i,tz=gz-k;
      if(i<0||k<0||i+1>=mg.nx||k+1>=mg.nz)return false;const n=k*mg.nx+i,v=(mask[n]*(1-tx)+mask[n+1]*tx)*(1-tz)+(mask[n+mg.nx]*(1-tx)+mask[n+mg.nx+1]*tx)*tz;return v>1;};
    const angles={densePatch:[],coarseMesh:[]};let maskedSamples=0;const focus=d.mode.focus;
    for(let x=focus.x-40+.37;x<=focus.x+40;x+=4)for(let z=focus.z-100+.61;z<=focus.z+100;z+=2){
      if(masked(x,z)){maskedSamples++;continue;}
      const patch=x>rect.x+.5&&x<rect.z-.5&&z>rect.y+.5&&z<rect.w-.5;
      const step=patch ? 0.25 : grid.spacing,x0=patch?rect.x:grid.xMin,z0=patch?rect.y:grid.zMin;
      const i=Math.floor((x-x0)/step),k=Math.floor((z-z0)/step),a=x0+i*step,b=z0+k*step,tx=(x-a)/step,tz=(z-b)/step;
      const s00=slope(a,b),s10=slope(a+step,b),s01=slope(a,b+step),s11=slope(a+step,b+step),exact=slope(x,z),v=[0,0];
      for(let q=0;q<2;q++)v[q]=tx+tz<=1?(1-tx-tz)*s00[q]+tx*s10[q]+tz*s01[q]:(1-tz)*s10[q]+(1-tx)*s01[q]+(tx+tz-1)*s11[q];
      const dot=(1+exact[0]*v[0]+exact[1]*v[1])/(Math.hypot(exact[0],1,exact[1])*Math.hypot(v[0],1,v[1]));
      angles[patch?'densePatch':'coarseMesh'].push(finite(Math.acos(Math.max(-1,Math.min(1,dot)))*180/Math.PI,'normal angle'));
    }
    const stats=values=>{const sorted=[...values].sort((a,b)=>a-b);return{count:values.length,rms:values.length?Math.sqrt(values.reduce((sum,v)=>sum+v*v,0)/values.length):null,p95:sorted[Math.floor((sorted.length-1)*.95)]??null,max:sorted.at(-1)??null};};
    return{baseNormalAngleDegrees:Object.fromEntries(Object.entries(angles).map(([name,v])=>[name,stats(v)])),maskedSamples,probe:'Offset 4 m × 2 m samples over ±40 m alongshore / ±100 m cross-shore, skipping nonzero mask coverage. CPU mirror of cubic slopes and mesh-triangle interpolation; excludes identical FFT/ripple/churn perturbations and is not a GPU normal-buffer readback.'};
  }
  window.__normalHelpers={signature,angularScreen};
}
const helperSource=`(${installNormalHelpers.toString()})()`;new Function(helperSource);
const plan={url:url.href,settings,overrides,renderSpacing:2,at,fixedStep:1/60,steps:Math.round(at.at(-1)*60),method:'One actual GPU run; held checkpoint pixel → vertex → pixel repeat, same fixed camera. State hashes must match exactly.'};
if(args.plan==='true'){console.log(JSON.stringify(plan,null,2));process.exit(0);}
mkdirSync(out,{recursive:true});
async function bundleMetadata(){if(!args.dir)return{unverified:true};const root=resolve(args.dir),files=['index.html',...readdirSync(join(root,'assets')).filter(n=>n.endsWith('.js')).sort().map(n=>'assets/'+n)],h=createHash('sha256');
  for(const file of files){h.update(file);h.update(readFileSync(join(root,file)));}const index=await fetch(url);if(!index.ok||sha(new Uint8Array(await index.arrayBuffer()))!==sha(readFileSync(join(root,'index.html'))))throw Error('Served index differs from frozen build');
  const workers=files.filter(f=>/^assets\/surfZoneWorker-[^/]+\.js$/.test(f));if(workers.length!==1)throw Error('Expected one worker');const r=await fetch(new URL(workers[0],url));const bytes=new Uint8Array(await r.arrayBuffer());if(!r.ok||sha(bytes)!==sha(readFileSync(join(root,workers[0]))))throw Error('Served worker differs');return{root,sha256:h.digest('hex'),worker:workers[0],workerSha256:sha(bytes)};}
const instrument=`(()=>{let seed=0x5eed;Math.random=()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};const raf=requestAnimationFrame.bind(window);window.__normalStopFrames=false;window.requestAnimationFrame=cb=>raf(t=>{if(!window.__normalStopFrames)cb(t);});localStorage.setItem('breakline.settings.v1',JSON.stringify({graphics:{preset:'high',frameLimit:'60',waterLook:'rich',particles:'high'},detected:{preset:'high',water:'accurate',lowPerformance:false},seen:{rideHints:true,lowPerformanceNotice:true}}));})();`;
const report={schema:1,date:new Date().toISOString(),plan,pairs:[],valid:false,limitation:'Same-state normal/shading quality only; no FPS or rider-contact claim. The pixel repeat checks render determinism. CPU-backed textures are byte-hashed; the FFT render target is checked by unchanged identity/metadata and sea clock, without a GPU pixel readback. Image highlight metrics are luminance proxies that also include unchanged white foam.'};
const page=await launch({url:url.href,port:Number(args.cdp??9455),width:Number(args.width??1280),height:Number(args.height??720),args:['--mute-audio']});
const failures=[];page.on('Runtime.consoleAPICalled',e=>{const message=e.args.map(a=>a.value??a.description??'').join(' ');if(e.type==='error'||/non.?finite|\bNaN\b|numerical.*unstable/i.test(message))failures.push(message);});page.on('Runtime.exceptionThrown',e=>failures.push(e.exceptionDetails.exception?.description??e.exceptionDetails.text));
const noErrors=()=>{if(failures.length)throw Error(JSON.stringify(failures));};
const bounded=async(promise,seconds,context)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(context+' timeout')),seconds*1000);})]);}finally{clearTimeout(timer);}};
const save=()=>writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
try{
  report.bundle=await bundleMetadata();await page.send('Page.addScriptToEvaluateOnNewDocument',{source:instrument});await page.send('Page.navigate',{url:url.href});
  await page.waitFor("window.breaklineDiagnostics && window.breaklineLab && document.querySelector('.screen-menu') && !document.querySelector('.is-scene-pending')",120000);
  report.initial=await bounded(page.eval(`(async()=>{const d=window.breaklineDiagnostics,lab=window.breaklineLab;lab.clock.paused=true;await d.start(${JSON.stringify(settings)},${JSON.stringify(overrides)},{rider:false,lab:true});lab.active=true;lab.clock.paused=true;const host=d.mode.host;while(host.outstandingSteps>0)await new Promise(r=>setTimeout(r,5));window.__normalStopFrames=true;await Promise.race([d.mode.sweptBarrel.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Barrel library timeout')),15000))]);const style=document.createElement('style');style.textContent='#ui,#touch-controls,#loading{display:none!important}';document.head.append(style);d.resize(${Number(args.width??1280)},${Number(args.height??720)});d.setWaterLook('rich');d.setTimeOfDay('midday');d.mode.camera.setView('front');d.mode.camera.update(host,d.mode.focus,0);window.__normalCamera=d.mode.camera.camera.clone();return{status:host.snapshot.status,config:d.mode.config,grid:host.init.grid,camera:{position:window.__normalCamera.position.toArray(),quaternion:window.__normalCamera.quaternion.toArray(),fov:window.__normalCamera.fov,aspect:window.__normalCamera.aspect}};})()`),Number(args.startTimeoutSeconds??180),'Warm initialization');
  noErrors();if(report.initial.status.compute!=='gpu'||report.initial.status.ride||report.initial.grid.spacing!==2||Math.abs(report.initial.status.seaTime-overrides.startSeaTime)>1e-7)throw Error('Unexpected initial GPU/grid/clock');
  for(const[key,value]of Object.entries(overrides))if(report.initial.config[key]!==value)throw Error('Resolved '+key+' differs');
  await page.eval(helperSource);let done=0;const began=Date.now();
  for(const target of at){
    while(done<Math.round(target*60)){const n=Math.min(60,Math.round(target*60)-done);const time=await page.eval(`(async()=>{const d=window.breaklineDiagnostics,host=d.mode.host;for(let i=0;i<${n};i++){if(host.outstandingSteps)throw Error('Pending step');const old=host.snapshot.status.seaTime;d.step({paddle:false,popUp:false,steer:0});const start=performance.now();while(host.snapshot.status.seaTime<=old||host.outstandingSteps){if(performance.now()-start>15000)throw Error('GPU step timeout');await new Promise(r=>setTimeout(r,2));}if(host.snapshot.status.compute!=='gpu'||Math.abs(host.snapshot.status.seaTime-old-1/60)>1e-7)throw Error('GPU clock/fallback');}return host.snapshot.status.seaTime;})()`);done+=n;noErrors();if(Math.abs(time-report.initial.status.seaTime-done/60)>1e-7)throw Error('Cumulative step drift');if(Date.now()-began>Number(args.timeoutSeconds??240)*1000)throw Error('Bounded quality run timeout');}
    const frames=[];
    for(const mode of ['pixel','vertex','pixel-repeat']){
      const state=await page.eval(`(async()=>{const d=window.breaklineDiagnostics;d.water.setVertexNormals(${mode==='vertex'});d.render(0,window.__normalCamera);d.render(0,window.__normalCamera);return{signature:await window.__normalHelpers.signature(),programKey:d.water.mesh.material.customProgramCacheKey(),angular:window.__normalHelpers.angularScreen()};})()`);
      noErrors();const shot=await page.send('Page.captureScreenshot',{format:'png'}),png=Buffer.from(shot.data,'base64'),path=join(out,`${target}s-${mode}.png`);writeFileSync(path,png);frames.push({mode,path,pngSha256:sha(png),...state});
    }
    const unchanged=JSON.stringify(frames[0].signature)===JSON.stringify(frames[1].signature)&&JSON.stringify(frames[0].signature)===JSON.stringify(frames[2].signature);
    const repeatedPixelImageExact=frames[0].pngSha256===frames[2].pngSha256;
    const shaderChanged=frames[0].programKey!==frames[1].programKey&&frames[0].programKey===frames[2].programKey;
    report.pairs.push({at:target,fixedSteps:done,unchanged,repeatedPixelImageExact,shaderChanged,frames});save();
    if(!unchanged||!shaderChanged)throw Error('The normal toggle changed state/geometry or failed to switch shader');
    console.log(JSON.stringify({at:target,seaTime:frames[0].signature.seaTime,unchanged,repeatedPixelImageExact,angular:frames[1].angular}));
  }
  report.valid=report.pairs.every(p=>p.unchanged&&p.shaderChanged&&p.repeatedPixelImageExact)&&!failures.length;
  if(!report.valid)process.exitCode=1;
}catch(error){report.failure=String(error.stack??error);process.exitCode=1;console.error(report.failure);}
finally{report.failures=failures;save();await page.close();}
if(report.pairs.length){try{execFileSync(args.python??'python3',['scripts/browser/water-normal-image-metrics.py','--report',join(out,'report.json'),'--out',join(out,'image-metrics.json')],{stdio:'inherit'});}catch(error){report.imageMetricsFailure=String(error);report.valid=false;process.exitCode=1;save();}}
console.log(JSON.stringify({valid:report.valid,report:join(out,'report.json'),images:join(out,'image-metrics.json')}));
