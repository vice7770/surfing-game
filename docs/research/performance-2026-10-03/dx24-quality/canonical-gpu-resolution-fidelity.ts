// @ts-nocheck
/**
 * Actual worker/GPU dx=1 versus dx=2 quality screen; no FPS claim.
 * ./node_modules/.bin/rolldown scripts/browser/gpu-resolution-fidelity.ts -o /private/tmp/gpu-resolution-fidelity.mjs --format esm --platform node
 * node /private/tmp/gpu-resolution-fidelity.mjs --url=http://localhost:4188/ --dir=/private/tmp/frozen-dist --out=/private/tmp/padang-dx-quality
 * --plan=true validates the probe/grids and injected JavaScript without launching Chrome.
 * Run sequentially while other GPU benchmarks are idle. Fixed 1/60 s steps; renderSpacing=1 in both runs.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tankLayout } from '../../src/wave/SurfZoneSimulation';
import { stretchedEdges } from '../../src/wave/ShallowWaterSolver';
import { launch } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const equal = arg.indexOf('=');
  if (!arg.startsWith('--') || equal < 0) throw new Error('Use --name=value arguments');
  return [arg.slice(2, equal), arg.slice(equal + 1)];
}));
const out = resolve(args.out ?? '/private/tmp/padang-dx-quality');
const checkpoints = (args.at ?? '5,15,30').split(',').map(Number);
if (!checkpoints.length || checkpoints.some((t,i) => !Number.isFinite(t) || t <= 0 || t > 60 || Math.abs(t*60-Math.round(t*60)) > 1e-7 || (i>0 && t<=checkpoints[i-1])))
  throw new Error('--at must be increasing positive times <=60 s on the 1/60 s clock');
const settings = { spot: 'padang', stage: 2, compute: 'auto', source: 'buoy', significantHeight: 3.8,
  peakPeriod: 18, directionDegrees: 0, spread: 0, spreading: 150, tide: 0, windSpeed: 0,
  stormWindSpeed: 18, stormFetchKm: 600, stormDurationHours: 36, stormDistanceKm: 3000 };
const shared = { seed: 8761, componentCount: 64, alongShore: 320, fineSpacing: 1,
  spinUpPeriods: Number(args.spinUp ?? 2), startSeaTime: Number(args.seaTime ?? 400) };
if (!Number.isFinite(shared.spinUpPeriods) || shared.spinUpPeriods < 0 || !Number.isFinite(shared.startSeaTime)) throw new Error('Invalid warm clock');
const specs = [{ label:'dx1', dx:1, url:args.before ?? args.url ?? 'http://localhost:4188/', directory:args.beforeDir ?? args.dir },
  { label:'dx2', dx:2, url:args.after ?? args.url ?? 'http://localhost:4188/', directory:args.afterDir ?? args.dir }];
const urls = specs.map(spec => {
  const url = new URL(spec.url); url.searchParams.set('diagnostics',''); url.searchParams.set('graphics','high');
  url.searchParams.set('renderSpacing','1'); return url.href;
});
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// This function is self-contained: its source is installed in the page. SET1 bytes stay in-page;
// only profiles, finite checks and physical aggregate measurements cross the CDP boundary.
function installQualityHelpers() {
  const d = window.breaklineDiagnostics;
  if (!d) throw new Error('Missing diagnostics');
  const requireFinite = (value, context) => { if (!Number.isFinite(value)) throw new Error('Nonfinite '+context); return value; };
  const selectedStatus = () => {
    const host=d.mode.host, s=host.snapshot.status;
    if (s.compute !== 'gpu') throw new Error('GPU quality run fell back to CPU');
    if (s.ride) throw new Error('Expected riderless Wave Lab, got a ride');
    for (const key of ['seaTime','cells','breakDepth','breakingFraction','lipLaunches','lipVolume','lipJets','lipRollers','lipAirborne','spray','onsetScale']) requireFinite(s[key], 'status.'+key);
    return { seaTime:s.seaTime, cells:s.cells, compute:s.compute, breakPoint:s.breakPoint, breakDepth:s.breakDepth,
      breaker:s.breaker, breakingFraction:s.breakingFraction, peel:s.peel, lipLaunches:s.lipLaunches,
      lipVolume:s.lipVolume, lipJets:s.lipJets, lipRollers:s.lipRollers, lipAirborne:s.lipAirborne, spray:s.spray, onsetScale:s.onsetScale,
      frontCount:host.snapshot.frontCount, bubbleCount:host.snapshot.bubbleCount, sprayCount:host.snapshot.sprayCount };
  };
  function cubic(data, grid, x, z) {
    const weights=t=>{ const t2=t*t,t3=t2*t; return [(-t3+2*t2-t)/2,(3*t3-5*t2+2)/2,(-3*t3+4*t2+t)/2,(t3-t2)/2]; };
    const slopes=t=>{ const t2=t*t; return [(-3*t2+4*t-1)/2,(9*t2-10*t)/2,(-9*t2+8*t+1)/2,(3*t2-2*t)/2]; };
    const gx=(x-grid.xMin)/grid.spacing,gz=(z-grid.zMin)/grid.spacing,ix=Math.floor(gx),iz=Math.floor(gz);
    const wx=weights(gx-ix),wz=weights(gz-iz),dx=slopes(gx-ix),dz=slopes(gz-iz);
    let height=0,slopeX=0,slopeZ=0;
    for(let k=0;k<4;k++) for(let i=0;i<4;i++) {
      const row=Math.max(0,Math.min(grid.nz-1,iz+k-1)),col=Math.max(0,Math.min(grid.nx-1,ix+i-1));
      const h=data[2*(row*grid.nx+col)]; height+=wz[k]*wx[i]*h; slopeX+=wz[k]*dx[i]*h; slopeZ+=dz[k]*wx[i]*h;
    }
    return [requireFinite(height,'height sample'),requireFinite(slopeX/grid.spacing,'slope x'),requireFinite(slopeZ/grid.spacing,'slope z')];
  }
  function profiles(probe) {
    const host=d.mode.host, grid=host.init.grid, data=host.snapshot.surface;
    const x=[],z=[],height=[],slopeX=[],slopeZ=[],peaks=[];
    for(let i=0;i<probe.transects;i++) x.push(probe.xMin+i*probe.xStep);
    for(let k=0;k<probe.samples;k++) z.push(probe.zMin+k*probe.zStep);
    const right=grid.xMin+(grid.nx-1)*grid.spacing,front=grid.zMin+(grid.nz-1)*grid.spacing;
    if(x[0]<grid.xMin || x.at(-1)>right || z[0]<grid.zMin || z.at(-1)>front) throw new Error('Common probe extends beyond render grid');
    for(let i=0;i<x.length;i++) {
      const candidates=[];
      for(let k=0;k<z.length;k++) { const h=cubic(data,grid,x[i],z[k]);height.push(h[0]);slopeX.push(h[1]);slopeZ.push(h[2]); }
      for(let k=1;k<z.length-1;k++) { const n=i*z.length+k;
        if(height[n]>.2 && height[n]>=height[n-1] && height[n]>height[n+1]) candidates.push({x:x[i],z:z[k],height:height[n]}); }
      candidates.sort((a,b)=>b.height-a.height);
      const chosen=[];
      for(const p of candidates) if(chosen.every(old=>Math.abs(old.z-p.z)>=20)) { chosen.push(p); if(chosen.length===2)break; }
      peaks.push(chosen);
    }
    return {x,z,height,slopeX,slopeZ,peaks};
  }
  async function aggregate(geometry, focus, baselineTime) {
    const sea=await d.mode.host.exportState(), stream=new Blob([sea.bytes]).stream();
    const bytes=new Uint8Array(await new Response(sea.deflated?stream.pipeThrough(new DecompressionStream('deflate')):stream).arrayBuffer());
    const view=new DataView(bytes.buffer);
    if(bytes.length<8 || view.getUint32(0,true)!==0x53455431)throw new Error('Not SET1');
    const length=view.getUint32(4,true),header=JSON.parse(new TextDecoder().decode(bytes.subarray(8,8+length)));
    const floats=new Float32Array(bytes.buffer,8+Math.ceil(length/4)*4),arrays={};let offset=0;
    for(const [name,count]of header.arrays){if(offset+count>floats.length)throw new Error('Truncated '+name);arrays[name]=floats.subarray(offset,offset+count);offset+=count;}
    const nx=header.nx,nz=header.nz,size=nx*nz;
    if(nz!==geometry.dz.length || nx!==geometry.nx)throw new Error('Export/grid geometry mismatch');
    requireFinite(header.solverTime,'solverTime');requireFinite(header.seaTimeOffset,'seaTimeOffset');
    const finiteFields=['h','qx','qz','foam.dense','foam.residual','aeration.air','aeration.depth','breakingStrength','breakingAge','plungeHold','predictor.x','predictor.z'];
    const finite={};
    for(const name of finiteFields){const values=arrays[name];if(!values || values.length!==size)throw new Error('Missing/wrong field '+name);
      let min=Infinity,max=-Infinity;for(let i=0;i<values.length;i++){const v=requireFinite(values[i],name+'['+i+']');min=Math.min(min,v);max=Math.max(max,v);}
      finite[name]={count:values.length,min,max};}
    if(finite.h.min<0)throw new Error('Negative water depth');
    const blank=()=>({wetAreaM2:0,activeBreakingIndicatorAreaM2:0,strengthWeightedAreaM2:0,denseFoamAreaM2:0,residualFoamAreaM2:0,totalFoamAreaM2:0,airVolumeM3:0});
    const domain=blank(),nearBreak=blank();
    const add=(dest,n,area)=>{const h=arrays.h[n],b=arrays.breakingStrength[n];if(h>1e-4)dest.wetAreaM2+=area;
      if(h>.01&&b>0)dest.activeBreakingIndicatorAreaM2+=area;dest.strengthWeightedAreaM2+=b*area;
      dest.denseFoamAreaM2+=arrays['foam.dense'][n]*area;dest.residualFoamAreaM2+=arrays['foam.residual'][n]*area;
      dest.totalFoamAreaM2+=(arrays['foam.dense'][n]+arrays['foam.residual'][n])*area;dest.airVolumeM3+=arrays['aeration.air'][n]*area;};
    const xMin=d.mode.host.init.windowXMin;
    for(let k=0;k<nz;k++){const area=geometry.dx*geometry.dz[k],z=geometry.z[k];for(let i=0;i<nx;i++){
      const n=k*nx+i,x=xMin+(i+.5)*geometry.dx;add(domain,n,area);
      if(Math.abs(x-focus.x)<=40&&Math.abs(z-focus.z)<=100)add(nearBreak,n,area);
    }}
    const onset={newColumns:0,newWidthM:0,firstSolverTime:null,lastSolverTime:null};
    for(const [name,sentinel]of [['lastOnset',-Infinity],['lastThrow',-Infinity],['outerBreak',Infinity]]){
      const values=arrays[name];if(!values||values.length!==nx)throw new Error('Missing history '+name);
      for(const value of values){if(!Number.isFinite(value)&&value!==sentinel)throw new Error('Invalid '+name+' history');
        if(name==='lastOnset'&&Number.isFinite(value)&&value>baselineTime+1e-5){onset.newColumns++;
          onset.firstSolverTime=onset.firstSolverTime===null?value:Math.min(onset.firstSolverTime,value);onset.lastSolverTime=onset.lastSolverTime===null?value:Math.max(onset.lastSolverTime,value);}}
    }
    onset.newWidthM=onset.newColumns*geometry.dx;
    const points=header.front?.points??[],groups=new Map();let thrown=0,newJoined=0,newThrown=0,firstNewJoined=null,firstNewThrown=null,activeJetClaimAreaM2=0;
    for(const p of points){for(const key of ['x','z','sigma','tau','joined','footHeight','footDepth'])requireFinite(p[key],'front.'+key);
      const group=groups.get(p.front)??{points:0,minSigma:Infinity,maxSigma:-Infinity};group.points++;group.minSigma=Math.min(group.minSigma,p.sigma);group.maxSigma=Math.max(group.maxSigma,p.sigma);groups.set(p.front,group);
      if(p.joined>baselineTime+1e-7){newJoined++;firstNewJoined=firstNewJoined===null?p.joined:Math.min(firstNewJoined,p.joined);}
      if(p.thrown!==null){requireFinite(p.thrown,'front.thrown');thrown++;if(p.thrown>baselineTime+1e-7){newThrown++;firstNewThrown=firstNewThrown===null?p.thrown:Math.min(firstNewThrown,p.thrown);}}
      if(p.jetWindow!==undefined&&p.jetUntil!==undefined&&p.tau<p.jetUntil){requireFinite(p.jetWindow,'front.jetWindow');activeJetClaimAreaM2+=2*p.jetWindow*geometry.dx;}
    }
    return {clock:{solverTime:header.solverTime,seaTimeOffset:header.seaTimeOffset,seaTime:header.solverTime+header.seaTimeOffset},finite,domain,nearBreak,onset,
      front:{points:points.length,fronts:groups.size,crestSpanM:[...groups.values()].reduce((sum,g)=>sum+g.maxSigma-g.minSigma,0),
        activeColumnWidthM:points.length*geometry.dx,thrownColumnWidthM:thrown*geometry.dx,activeJetClaimAreaM2,newJoinedPoints:newJoined,newThrownPoints:newThrown,firstNewJoinedSolverTime:firstNewJoined,firstNewThrownSolverTime:firstNewThrown},
      counters:header.counters};
  }
  function tubeGeometry() {
    const r=d.mode.barrelLoft;if(!r)return {present:false};
    const samples=r.sliceCount?r.vertexCount/r.sliceCount:0;
    if(r.sliceCount&&(!Number.isInteger(samples)||samples<1))throw new Error('Invalid loft sample dimensions');
    const regions={back:{tested:0,reversed:0},roof:{tested:0,reversed:0},underside:{tested:0,reversed:0},face:{tested:0,reversed:0},forwardRest:{tested:0,reversed:0}};
    let joins=0,cuts=0,endWeightMax=0,maxRayTurnDegrees=0,minY=Infinity,maxY=-Infinity;
    for(let i=0;i<r.vertexCount*3;i++){const value=requireFinite(r.positions[i],'loft position');requireFinite(r.normals[i],'loft normal');if(i%3===1){minY=Math.min(minY,value);maxY=Math.max(maxY,value);}}
    for(let i=0;i<r.vertexCount;i++){requireFinite(r.lift[i],'loft lift');requireFinite(r.mask[i],'loft mask');}
    for(let i=0;i<r.indexCount;i++)if(!Number.isInteger(r.indices[i])||r.indices[i]>=r.vertexCount)throw new Error('Invalid loft index');
    for(let s=0;s<r.sliceCount;s++){
      if((s===0||!r.sliceJoined[s-1])||s===r.sliceCount-1||!r.sliceJoined[s])endWeightMax=Math.max(endWeightMax,r.sliceWeight[s]);
      if(s===r.sliceCount-1)continue;
      if(!r.sliceJoined[s]){cuts++;continue;}joins++;
      const dot=Math.max(-1,Math.min(1,r.sliceRayX[s]*r.sliceRayX[s+1]+r.sliceRayZ[s]*r.sliceRayZ[s+1]));maxRayTurnDegrees=Math.max(maxRayTurnDegrees,Math.acos(dot)*180/Math.PI);
      for(let j=0;j<samples;j++){const a=s*samples+j,b=(s+1)*samples+j;if(Math.min(r.lift[a],r.lift[b])<=.01)continue;
        const region=j<35?regions.back:j<67?regions.roof:j<91?regions.underside:j<115?regions.face:regions.forwardRest;region.tested++;
        const cross=(r.positions[3*b]-r.positions[3*a])*r.sliceRayZ[s]-(r.positions[3*b+2]-r.positions[3*a+2])*r.sliceRayX[s];if(cross<0)region.reversed++;
      }
    }
    return {present:true,vertexCount:r.vertexCount,indexCount:r.indexCount,sliceCount:r.sliceCount,samples,joins,cuts,
      overlaps:r.overlaps,overlapsOpen:r.overlapsOpen,overlapOpenWeight:r.overlapOpenWeight,clamps:r.clamps,clampedLookups:r.clampedLookups,
      endWeightMax,maxRayTurnDegrees,minY:r.vertexCount?minY:null,maxY:r.vertexCount?maxY:null,regions,
      caveat:'Reversed across-front orientation is a structural fold indicator, not a complete self-intersection/contact test. The same implementation is used in both grids.'};
  }
  window.__qualityHelpers={selectedStatus,profiles,aggregate,tubeGeometry};
}
const helperSource=`(${installQualityHelpers.toString()})()`;
new Function(helperSource); // Check browser-source syntax without running it.
function geometry(config) {
  const tank=tankLayout(config),edges=stretchedEdges(tank.offshore,tank.shore,tank.fineFrom,config.fineSpacing??1,config.coarseSpacing??4);
  return {nx:Math.round(config.alongShore/config.dx),dx:config.dx,dz:Array.from(edges.slice(1),(edge,k)=>edge-edges[k]),
    z:Array.from(edges.slice(1),(edge,k)=>(edge+edges[k])/2),tank};
}
const plan={settings,shared,checkpoints,fixedStep:1/60,steps:Math.round(checkpoints.at(-1)*60),renderSpacing:1,
  variants:specs.map((spec,i)=>({label:spec.label,url:urls[i],physicsGrid:{nx:geometry({...settings,...shared,dx:spec.dx}).nx,nz:geometry({...settings,...shared,dx:spec.dx}).dz.length}}))};
if(args.plan==='true'){console.log(JSON.stringify(plan,null,2));process.exit(0);}
mkdirSync(out,{recursive:true});
async function bundleMetadata(base,directory) {
  if(!directory)return {unverified:true};
  const root=resolve(directory),files=['index.html',...readdirSync(join(root,'assets')).filter(n=>n.endsWith('.js')).sort().map(n=>'assets/'+n)],sha=createHash('sha256');
  for(const file of files){sha.update(file);sha.update(readFileSync(join(root,file)));}
  const response=await fetch(base);if(!response.ok||hash(new Uint8Array(await response.arrayBuffer()))!==hash(readFileSync(join(root,'index.html'))))throw new Error('Served index differs from frozen directory');
  const workers=files.filter(file=>/^assets\/surfZoneWorker-[^/]+\.js$/.test(file));if(workers.length!==1)throw new Error('Expected one served worker');
  const workerResponse=await fetch(new URL(workers[0],base));if(!workerResponse.ok)throw new Error('Missing worker');
  const bytes=new Uint8Array(await workerResponse.arrayBuffer());if(hash(bytes)!==hash(readFileSync(join(root,workers[0]))))throw new Error('Served worker differs from frozen directory');
  const source=new TextDecoder().decode(bytes);return {root,sha256:sha.digest('hex'),worker:workers[0],workerSha256:hash(bytes),containsRowScratch:source.includes('fn rowScratch('),containsSideTimes:source.includes('var<workgroup> sideTimes:')};
}
const instrument=`(() => {
  let seed=0x5eed; Math.random=()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};
  const raf=requestAnimationFrame.bind(window);window.__qualityStopFrames=false;window.requestAnimationFrame=callback=>raf(time=>{if(!window.__qualityStopFrames)callback(time);});
  localStorage.setItem('breakline.settings.v1',JSON.stringify({graphics:{preset:'high',frameLimit:'60',waterLook:'rich',particles:'high'},detected:{preset:'high',water:'accurate',lowPerformance:false},seen:{rideHints:true,lowPerformanceNotice:true}}));
})();`;
const page=await launch({url:urls[0],port:Number(args.cdp??9450),width:Number(args.width??1280),height:Number(args.height??720),args:['--mute-audio']});
const failures=[],consoleMessages=[];let activeLabel='startup';
page.on('Runtime.consoleAPICalled',event=>{const message=event.args.map(a=>a.value??a.description??'').join(' ');consoleMessages.push({run:activeLabel,type:event.type,message});
  if(event.type==='error'||/non.?finite|\bNaN\b|numerical.*unstable/i.test(message))failures.push({run:activeLabel,type:event.type,message});});
page.on('Runtime.exceptionThrown',event=>failures.push({run:activeLabel,type:'exception',message:event.exceptionDetails.exception?.description??event.exceptionDetails.text}));
const assertNoFailures=()=>{if(failures.length)throw new Error('Browser/GPU error: '+JSON.stringify(failures));};
const bounded=async(promise,seconds,context)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(context+' timeout')),seconds*1000);})]);}finally{clearTimeout(timer);}};
const report={schema:1,date:new Date().toISOString(),method:'Actual worker GPU; two riderless paused Lab runs on the same seed/warm clock, 1/60 s per completed snapshot. Continuous RAF rendering is suspended after initialization; checkpoints are manually rendered from the same fixed camera. This measures quality, not real-time FPS.',
  plan,caveats:['Both runs use 1 m render/contact sampling to isolate physical dx. RenderSpacing=2 fidelity is measured separately.',
    'Physical foam/air aggregates use exported float32 cell fields and exact stretched-cell areas. Active breaking-indicator area is a source proxy; the transient FoamField.source field is not exported. Front widths and activeJetClaimAreaM2 sum across fronts and may count overlapping columns/claims more than once.',
    'Warm states are independently spun up on their respective grids. Differences at t=0 are reported rather than removed.',
    'Tube folds/cuts are tracked separately; their presence cannot establish that dx=2 caused an existing loft defect.'],runs:[],comparisons:[]};
let commonProbe,cameraPose,baselineSolverTime;
async function capture(spec,index) {
  activeLabel=spec.label;
  const bundle=await bundleMetadata(spec.url,spec.directory);
  await page.send('Page.navigate',{url:urls[index]});
  await page.waitFor("window.breaklineDiagnostics && window.breaklineLab && document.querySelector('.screen-menu') && !document.querySelector('.is-scene-pending')",120000);
  const initial=await bounded(page.eval(`(async()=>{
    const d=window.breaklineDiagnostics,lab=window.breaklineLab;lab.clock.paused=true;
    await d.start(${JSON.stringify(settings)},${JSON.stringify({...shared,dx:spec.dx})},{rider:false,lab:true});
    lab.active=true;lab.clock.paused=true;
    const host=d.mode.host;while(host.outstandingSteps>0)await new Promise(resolve=>setTimeout(resolve,5));
    window.__qualityStopFrames=true;
    if(!d.mode.sweptBarrel?.ready)throw new Error('Missing Padang barrel');
    await Promise.race([d.mode.sweptBarrel.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Barrel library timeout')),15000))]);
    // UI overlays are outside the checkpoint image; only the normal game canvas stays visible.
    const style=document.createElement('style');style.textContent='#ui,#touch-controls,#loading{display:none!important}';document.head.append(style);
    d.resize(${Number(args.width??1280)},${Number(args.height??720)});d.setWaterLook('rich');d.setTimeOfDay('midday');
    d.mode.camera.setView('front');d.mode.camera.update(host,d.mode.focus,0);
    const c=d.mode.camera.camera.clone();
    ${cameraPose?`c.position.fromArray(${JSON.stringify(cameraPose.position)});c.quaternion.fromArray(${JSON.stringify(cameraPose.quaternion)});c.fov=${cameraPose.fov};c.aspect=${cameraPose.aspect};c.updateProjectionMatrix();c.updateMatrixWorld(true);`:''}
    window.__qualityCamera=c;
    return {status:host.snapshot.status,config:d.mode.config,grid:host.init.grid,focus:d.mode.focus,windowXMin:host.init.windowXMin,dx:host.init.dx,
      camera:{position:c.position.toArray(),quaternion:c.quaternion.toArray(),fov:c.fov,aspect:c.aspect}};
  })()`),Number(args.startTimeoutSeconds??180),'GPU warm initialization');
  assertNoFailures();
  if(initial.status.compute!=='gpu'||initial.status.ride)throw new Error('Expected riderless GPU run');
  const resolved={...initial.config};
  for(const [key,expected]of Object.entries({...shared,dx:spec.dx,significantHeight:3.8,peakPeriod:18,spreading:150,componentCount:64}))if(resolved[key]!==expected)throw new Error(`Resolved config differs: ${key}=${resolved[key]} expected ${expected}`);
  if(initial.grid.spacing!==1)throw new Error('Render spacing must stay 1 m in both physics variants');
  const grid=geometry(resolved);
  if(!commonProbe){commonProbe={xMin:initial.focus.x-40,xStep:4,transects:21,zMin:initial.focus.z-100,zStep:.5,samples:401,focus:{...initial.focus}};cameraPose=initial.camera;}
  await page.eval(helperSource);
  const collect=async (at,shot=true)=>{
    const data=await page.eval(`(async()=>{const d=window.breaklineDiagnostics,h=window.__qualityHelpers;
      d.render(0,window.__qualityCamera);const status=h.selectedStatus();
      const physical=await h.aggregate(${JSON.stringify(grid)},${JSON.stringify(commonProbe.focus)},${baselineSolverTime??-1});
      return {status,physical,profiles:h.profiles(${JSON.stringify(commonProbe)}),tubeGeometry:h.tubeGeometry(),maskGrid:d.water.barrelMaskGrid};})()`);
    assertNoFailures();
    const expected=initial.status.seaTime+at;
    if(Math.abs(data.status.seaTime-expected)>1e-7||Math.abs(data.physical.clock.seaTime-expected)>1e-7)throw new Error('Checkpoint sea clock drift');
    let screenshot;
    if(shot){const png=await page.send('Page.captureScreenshot',{format:'png'});screenshot=join(out,`${spec.label}-${at}s.png`);writeFileSync(screenshot,Buffer.from(png.data,'base64'));}
    return {at,fixedSteps:Math.round(at*60),...data,screenshot};
  };
  const start=await collect(0);
  if(Math.abs(start.status.seaTime-shared.startSeaTime)>1e-7)throw new Error('Warm sea clock differs from requested startSeaTime');
  if(baselineSolverTime===undefined)baselineSolverTime=start.physical.clock.solverTime;
  if(Math.abs(start.physical.clock.solverTime-baselineSolverTime)>1e-7)throw new Error('Warm solver clocks differ');
  // Initial state is measured before defining "new onset"; correct those baseline-relative fields.
  start.physical.onset={newColumns:0,newWidthM:0,firstSolverTime:null,lastSolverTime:null};
  start.physical.front.newJoinedPoints=0;start.physical.front.newThrownPoints=0;start.physical.front.firstNewJoinedSolverTime=null;start.physical.front.firstNewThrownSolverTime=null;
  const run={label:spec.label,url:urls[index],bundle,initial:{...initial,status:start.status,clock:start.physical.clock},start,timeline:[],checkpoints:[],elapsedWallSeconds:0};
  report.runs.push(run);writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  const wall=Date.now();let done=0;
  const event={firstFrontAfterStartSeconds:start.status.frontCount?0:null,firstNewLipLaunchSeconds:null,firstFrontThrowClockAdvanceSeconds:start.physical.front.thrownColumnWidthM>0?0:null};
  while(done<plan.steps){
    const count=Math.min(60,plan.steps-done,...checkpoints.map(t=>Math.round(t*60)-done).filter(n=>n>0));
    const progress=await page.eval(`(async()=>{
      const d=window.breaklineDiagnostics,host=d.mode.host,h=window.__qualityHelpers,out=[];
      for(let i=0;i<${count};i++){
        if(host.outstandingSteps!==0)throw new Error('Unexpected pending advances');const time=host.snapshot.status.seaTime;
        d.step({paddle:false,popUp:false,steer:0});const began=performance.now();
        while(host.snapshot.status.seaTime<=time||host.outstandingSteps>0){if(performance.now()-began>15000)throw new Error('Fixed GPU step timeout');await new Promise(resolve=>setTimeout(resolve,2));}
        const s=h.selectedStatus(),delta=s.seaTime-time;if(Math.abs(delta-1/60)>1e-7)throw new Error('Automatic/missing steps: '+delta);
        const front=host.snapshot.front;let thrownClock=false;for(let p=0;p<host.snapshot.frontCount;p++)if(front[p*9+4]>0)thrownClock=true;
        out.push({seaTime:s.seaTime,frontCount:s.frontCount,lipLaunches:s.lipLaunches,thrownClock});
      }
      return {steps:out,status:h.selectedStatus()};
    })()`);
    assertNoFailures();
    for(let i=0;i<progress.steps.length;i++){const s=progress.steps[i],elapsed=(done+i+1)/60;
      if(event.firstFrontAfterStartSeconds===null&&s.frontCount>0)event.firstFrontAfterStartSeconds=elapsed;
      if(event.firstNewLipLaunchSeconds===null&&s.lipLaunches>initial.status.lipLaunches)event.firstNewLipLaunchSeconds=elapsed;
      if(event.firstFrontThrowClockAdvanceSeconds===null&&s.thrownClock)event.firstFrontThrowClockAdvanceSeconds=elapsed;
    }
    done+=count;
    const delta=progress.status.seaTime-initial.status.seaTime;
    if(Math.abs(delta-done/60)>1e-7)throw new Error('Run cumulative clock drift');
    run.timeline.push({at:done/60,...progress.status});
    if(checkpoints.includes(done/60)){const checkpoint=await collect(done/60);run.checkpoints.push(checkpoint);console.log(JSON.stringify({run:spec.label,at:checkpoint.at,seaTime:checkpoint.status.seaTime,cells:checkpoint.status.cells,crestMax:Math.max(...checkpoint.profiles.height),fronts:checkpoint.status.frontCount,foamArea:checkpoint.physical.nearBreak.totalFoamAreaM2,air:checkpoint.physical.nearBreak.airVolumeM3}));writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
    if(Date.now()-wall>Number(args.timeoutSeconds??240)*1000)throw new Error('Bounded quality run wall timeout');
  }
  run.elapsedWallSeconds=(Date.now()-wall)/1000;run.events=event;
  return run;
}
function stats(values){const sorted=[...values].sort((a,b)=>a-b);return {count:values.length,rms:values.length?Math.sqrt(values.reduce((sum,v)=>sum+v*v,0)/values.length):null,p95:sorted[Math.floor((sorted.length-1)*.95)]??null,max:sorted.at(-1)??null};}
function compare(a,b){
  const p=a.profiles,q=b.profiles;if(p.height.length!==q.height.length||JSON.stringify(p.x)!==JSON.stringify(q.x)||JSON.stringify(p.z)!==JSON.stringify(q.z))throw new Error('Profile coordinates differ');
  const dh=[],slopes=[],nearCrests=[],crest=[];
  const hAt=(profile,i,z)=>{const n=(z-profile.z[0])/(profile.z[1]-profile.z[0]),k=Math.floor(n),f=n-k;if(k<0||k+1>=profile.z.length)return null;return profile.height[i*profile.z.length+k]*(1-f)+profile.height[i*profile.z.length+k+1]*f;};
  for(let n=0;n<p.height.length;n++){dh.push(Math.abs(q.height[n]-p.height[n]));slopes.push(Math.hypot(q.slopeX[n]-p.slopeX[n],q.slopeZ[n]-p.slopeZ[n]));}
  for(let i=0;i<p.x.length;i++)for(const peak of p.peaks[i]){
    const options=q.peaks[i].filter(c=>Math.abs(c.z-peak.z)<=20).sort((a,b)=>Math.abs(a.z-peak.z)-Math.abs(b.z-peak.z));const coarse=options[0];
    const aligned=[];for(let offset=-8;offset<=8;offset+=.5){const a=hAt(p,i,peak.z+offset),b=coarse?hAt(q,i,coarse.z+offset):null;if(a!==null&&b!==null)aligned.push(Math.abs(a-b));}
    crest.push({x:peak.x,fine:peak,coarse:coarse??null,heightDifferenceM:coarse?coarse.height-peak.height:null,positionDifferenceM:coarse?coarse.z-peak.z:null,alignedShapeHeightM:stats(aligned)});
    for(let k=0;k<p.z.length;k++)if(Math.abs(p.z[k]-peak.z)<=8)nearCrests.push(Math.abs(q.height[i*p.z.length+k]-p.height[i*p.z.length+k]));
  }
  const scalarDiff=(x,y)=>Object.fromEntries(Object.entries(x).filter(([,v])=>typeof v==='number').map(([k,v])=>[k,{fine:v,coarse:y[k],difference:y[k]-v,relative:v?y[k]/v-1:null}]));
  return {at:a.at,sameSeaTime:Math.abs(a.status.seaTime-b.status.seaTime)<=1e-7,sameSolverTime:Math.abs(a.physical.clock.solverTime-b.physical.clock.solverTime)<=1e-7,
    sameSeaTimeOffset:Math.abs(a.physical.clock.seaTimeOffset-b.physical.clock.seaTimeOffset)<=1e-7,
    breakBandHeightM:stats(dh),breakBandSlope:stats(slopes),fineCrestNeighborhoodHeightM:stats(nearCrests),
    crestPeaks:{matched:crest.filter(c=>c.coarse).length,unmatched:crest.filter(c=>!c.coarse).length,heightDifferenceM:stats(crest.filter(c=>c.coarse).map(c=>Math.abs(c.heightDifferenceM))),positionDifferenceM:stats(crest.filter(c=>c.coarse).map(c=>Math.abs(c.positionDifferenceM))),samples:crest},
    nearBreakPhysical:scalarDiff(a.physical.nearBreak,b.physical.nearBreak),domainPhysical:scalarDiff(a.physical.domain,b.physical.domain),
    onset:{fine:a.physical.onset,coarse:b.physical.onset},front:{fine:a.physical.front,coarse:b.physical.front},tubeGeometry:{fine:a.tubeGeometry,coarse:b.tubeGeometry},screenshots:[a.screenshot,b.screenshot]};
}
try{
  await page.send('Page.addScriptToEvaluateOnNewDocument',{source:instrument});
  const a=await capture(specs[0],0),b=await capture(specs[1],1);
  if(a.bundle.sha256&&b.bundle.sha256&&a.bundle.sha256!==b.bundle.sha256&&args.allowBuildDifference!=='true')throw new Error('Physics isolation requires the same immutable build; use --allowBuildDifference=true only for an explicitly labeled combined change');
  report.commonProbe=commonProbe;report.camera=cameraPose;report.comparisons=[compare(a.start,b.start),...a.checkpoints.map((frame,i)=>compare(frame,b.checkpoints[i]))];
  report.valid=report.comparisons.every(c=>c.sameSeaTime&&c.sameSolverTime&&c.sameSeaTimeOffset)&&!failures.length;
  report.qualityDecision='Review required: compare crest phase/height, breaking/foam/air changes and paired images; valid means clocks and finite-data checks passed, not that coarser physics was accepted.';
  if(!report.valid)process.exitCode=1;
}catch(error){report.valid=false;report.failure=String(error?.stack??error);process.exitCode=1;console.error(report.failure);}
finally{report.consoleMessages=consoleMessages;report.failures=failures;writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');await page.close();}
console.log(JSON.stringify({valid:report.valid,report:join(out,'report.json'),runs:report.runs.map(run=>({label:run.label,wallSeconds:run.elapsedWallSeconds,initialSeaTime:run.start.status.seaTime,finalSeaTime:run.checkpoints.at(-1)?.status.seaTime})),comparisons:report.comparisons.map(c=>({at:c.at,height:c.fineCrestNeighborhoodHeightM,peakHeight:c.crestPeaks.heightDifferenceM,peakShift:c.crestPeaks.positionDifferenceM,air:c.nearBreakPhysical.airVolumeM3}))}));
