// Bounded ordinary Wave Lab geometry QA. Preparation does not launch Chrome.
// node scripts/browser/tube-live-regression.mjs --self-test
// node scripts/browser/tube-live-regression.mjs --plan --before=http://localhost:4192/ --after=http://localhost:4201/
// Schedule GPU access first, then add --run --beforeDir=/frozen/dist --afterDir=/new/dist --out=/private/tmp/tube-live-qa
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadavg } from 'node:os';
import { fileURLToPath } from 'node:url';
import { launch, sleep } from './cdp.mjs';

/** Independent active-mesh invariants; no profile builder, simulation, or visual acceptance tolerance. */
export function inspectGeometry(loft) {
  const S = 134, failures = [], out = { slices: loft?.sliceCount ?? 0, vertices: loft?.vertexCount ?? 0,
    joined: 0, negativeRows: 0, zeroRows: 0, minimumAdvance: null, liftedRunEnds: 0, unsupportedLift: 0,
    unusedIsolatedLiftedVertices: 0, worstEnds: [], worstUnsupported: [],
    nonfinite: 0, topologyFaults: 0, phases: [0, 0, 0], overturned: 0, openLiftedSlices: 0, worst: [] };
  if (!loft) return { ...out, failures: ['Missing actual loft'], pass: false };
  if (!Number.isInteger(loft.sliceCount) || loft.vertexCount !== S * loft.sliceCount) failures.push('Invalid active counts');
  const finite = (name, n) => {
    const a = loft[name]; if (!a || a.length < n) { failures.push('Missing active ' + name); return; }
    for (let k = 0; k < n; k++) if (!Number.isFinite(a[k])) out.nonfinite++;
  };
  for (const name of ['positions', 'normals']) finite(name, loft.vertexCount * 3);
  for (const name of ['mask', 'lift', 'sheet', 'sheetWeight', 'sheetBack']) finite(name, loft.vertexCount);
  for (const name of ['sliceFront', 'sliceSigma', 'sliceTau', 'slicePhase', 'sliceFade', 'sliceCollapse', 'sliceRayX',
    'sliceRayZ', 'sliceJoined', 'sliceWeight', 'sliceOverturned', 'sliceFormed', 'sliceTipGap']) finite(name, loft.sliceCount);
  if (failures.length || out.nonfinite) return { ...out, failures: [...failures, ...(out.nonfinite ? ['Nonfinite active geometry'] : [])], pass: false };
  let index = 0;
  for (let s = 0; s < loft.sliceCount; s++) {
    out.phases[loft.slicePhase[s]]++;
    out.overturned += loft.sliceOverturned[s] === 1 ? 1 : 0;
    if (loft.slicePhase[s] === 1 && loft.sliceWeight[s] > 0 && loft.sliceOverturned[s] === 1) out.openLiftedSlices++;
    const joinedBefore = s > 0 && loft.sliceJoined[s - 1] === 1;
    const joinedAfter = s + 1 < loft.sliceCount && loft.sliceJoined[s] === 1;
    // The verified triangulation below uses every vertex of each joined pair, and no isolated slice.
    const indexed = joinedBefore || joinedAfter, end = indexed && (!joinedBefore || !joinedAfter);
    for (let j = 0; j < S; j++) {
      const v = s * S + j;
      if (!indexed && loft.lift[v] > 0) out.unusedIsolatedLiftedVertices++;
      if (end && loft.lift[v] > 0) {out.liftedRunEnds++;if(out.worstEnds.length<4)out.worstEnds.push({s,j,front:loft.sliceFront[s],sigma:loft.sliceSigma[s],joinedBefore,joinedAfter,indexed});}
      if (indexed && loft.lift[v] > 0 && !(loft.mask[v] > 0)) {out.unsupportedLift++;if(out.worstUnsupported.length<4)out.worstUnsupported.push({s,j,front:loft.sliceFront[s],sigma:loft.sliceSigma[s],joinedBefore,joinedAfter,indexed});}
    }
    if (s + 1 >= loft.sliceCount || loft.sliceJoined[s] !== 1) continue;
    out.joined++;
    if (loft.sliceFront[s] !== loft.sliceFront[s + 1] || !(loft.sliceSigma[s + 1] > loft.sliceSigma[s])) out.topologyFaults++;
    for (let j = 0; j < S; j++) {
      const a = 3 * (s * S + j), b = a + 3 * S;
      const dx = loft.positions[b] - loft.positions[a], dz = loft.positions[b + 2] - loft.positions[a + 2];
      const first = dx * loft.sliceRayZ[s] - dz * loft.sliceRayX[s];
      const second = dx * loft.sliceRayZ[s + 1] - dz * loft.sliceRayX[s + 1];
      const least = Math.min(first, second);
      out.minimumAdvance = out.minimumAdvance === null ? least : Math.min(out.minimumAdvance, least);
      if (least < 0) out.negativeRows++;
      if (least === 0) out.zeroRows++;
      if (!(least > 0) && out.worst.length < 4) out.worst.push({ s, front: loft.sliceFront[s], sigma: loft.sliceSigma[s], j, first, second });
      if (j + 1 < S) {
        const v = s * S + j;
        for (const expected of [v, v + S, v + 1, v + 1, v + S, v + S + 1]) {
          if (loft.indices?.[index++] !== expected) out.topologyFaults++;
        }
      }
    }
  }
  if (index !== loft.indexCount) out.topologyFaults++;
  for (const name of ['negativeRows', 'zeroRows', 'liftedRunEnds', 'unsupportedLift', 'topologyFaults']) if (out[name]) failures.push(name);
  return { ...out, failures, pass: failures.length === 0 };
}

function installLive(checkGeometry, captureFailures = false) {
  const d = window.breaklineDiagnostics, mode = d.mode, water = d.water, lab = window.breaklineLab;
  const state = { active: false, rows: [], frames: [], previous: new Map(), trackedFront: null,
    cameraCuts: 0, lastSnapshot: null, started: 0, stopped: 0,
    fixtures: [], fixtureClasses: new Set() };
  const draw = mode.drawBarrel.bind(mode);
  const S = 134, C = 35, TIP = 67; // Three shoulder samples, then authored crest32/lip64.
  const vector = mode.camera.camera.position.clone();
  const waterHeight = (x, z) => {
    const g = water.grid, gx = (x - g.xMin) / g.spacing, gz = (z - g.zMin) / g.spacing;
    const weights = t => { const t2 = t * t, t3 = t2 * t; return [(-t3 + 2*t2 - t)/2, (3*t3 - 5*t2 + 2)/2, (-3*t3 + 4*t2 + t)/2, (t3 - t2)/2]; };
    const wx = weights(gx - Math.floor(gx)), wz = weights(gz - Math.floor(gz)); let h = 0;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const ix = Math.max(0, Math.min(g.nx - 1, Math.floor(gx) + i - 1)), iz = Math.max(0, Math.min(g.nz - 1, Math.floor(gz) + j - 1));
      h += wz[j] * wx[i] * water.surfaceData[2 * (iz * g.nx + ix)];
    }
    return h;
  };
  mode.drawBarrel = (...args) => {
    const result = draw(...args);
    if (!state.active) return result;
    const now = performance.now(); state.frames.push(now);
    const snapshot = mode.host.snapshot, status = snapshot.status, loft = mode.barrelLoft;
    if (state.lastSnapshot === status) return result;
    state.lastSnapshot = status;
    const began = performance.now(), geometry = checkGeometry(loft), row = { wall: now, seaTime: status.seaTime, geometry,
      status: { compute: status.compute, cells: status.cells, stepMs: status.stepMs, pipelineMs: status.pipelineMs },
      fronts: snapshot.frontCount, particles: { lip: snapshot.lipCount, spray: snapshot.sprayCount, bubbles: snapshot.bubbleCount },
      freshness: { sourceTime: water.materialUniforms.waterTime.value, surfaceRevision: water.surfaceRevision,
        sourceStatusMatches: water.written?.revision === status, meshStatusMatches: mode.sweptBarrel?.drawn?.revision === status },
      surfaceNonfinite: 0, sourceFrontNonfinite: 0, meshMismatch: 0, crestMismatchMaxMeters: 0,
      liftedMaskMissingNodes: 0, liftedVertices: 0, restingHeightResidualMaxMeters: 0,
      temporal: { comparedControls: 0, maxCrestStepMeters: 0, maxTipRelativeStepMeters: 0, maxRayStep: 0, throwCrossings: 0, touchdownCrossings: 0, worst: [] } };
    for (const value of snapshot.surface) if (!Number.isFinite(value)) row.surfaceNonfinite++;
    for (let k = 0; k < snapshot.frontCount; k++) for (let j = 0; j < 7; j++) if (!Number.isFinite(snapshot.front[9*k+j])) row.sourceFrontNonfinite++;
    const mesh = mode.barrelMesh?.mesh, attr = mesh?.geometry.attributes.position?.array;
    if (loft && mesh) {
      for (let k = 0; k < 3 * loft.vertexCount; k++) if (attr?.[k] !== loft.positions[k]) row.meshMismatch++;
      if (mesh.geometry.drawRange.count !== loft.indexCount) row.meshMismatch++;
      const mask = water.materialUniforms.waterBarrelMask.value.image.data, maskGrid = water.barrelMaskGrid;
      for (let v = 0; v < loft.vertexCount; v++) {
        const x = loft.positions[3*v], y = loft.positions[3*v+1], z = loft.positions[3*v+2];
        if (loft.lift[v] > 0) {
          row.liftedVertices++;
          const ix = Math.floor((x-maskGrid.xMin)/maskGrid.spacing), iz = Math.floor((z-maskGrid.zMin)/maskGrid.spacing);
          let support = false;
          for (const dz of [0,1]) for (const dx of [0,1]) if (ix+dx>=0&&ix+dx<maskGrid.nx&&iz+dz>=0&&iz+dz<maskGrid.nz&&mask[(iz+dz)*maskGrid.nx+ix+dx]>0) support=true;
          if (!support) row.liftedMaskMissingNodes++;
        } else if (v % S === 0 || v % S === S-1) row.restingHeightResidualMaxMeters = Math.max(row.restingHeightResidualMaxMeters, Math.abs(y-waterHeight(x,z)));
      }
      // Interpolate emitted landmarks at each original source control. This diagnostic keeps source columns as
      // stable keys even when paced arc lengths, tessellation and the camera move. End/cut samples are excluded.
      const next = new Map();
      for (let k = 0; k < snapshot.frontCount; k++) {
        const o = 9*k, front = snapshot.front[o+2], sigma = snapshot.front[o+3], x = snapshot.front[o], z = snapshot.front[o+1];
        let a = -1, b = -1;
        for (let s = 0; s + 1 < (loft?.sliceCount ?? 0); s++) if (loft.sliceFront[s] === front && loft.sliceFront[s+1] === front
          && loft.sliceJoined[s] === 1 && loft.sliceSigma[s] <= sigma && sigma <= loft.sliceSigma[s+1]) { a=s; b=s+1; break; }
        if (a < 0) continue;
        const share = (sigma-loft.sliceSigma[a])/(loft.sliceSigma[b]-loft.sliceSigma[a]);
        const mark = j => [0,1,2].map(axis=>loft.positions[3*(a*S+j)+axis]+share*(loft.positions[3*(b*S+j)+axis]-loft.positions[3*(a*S+j)+axis]));
        const crest=mark(C), tip=mark(TIP), ray=[loft.sliceRayX[a]+share*(loft.sliceRayX[b]-loft.sliceRayX[a]),loft.sliceRayZ[a]+share*(loft.sliceRayZ[b]-loft.sliceRayZ[a])];
        row.crestMismatchMaxMeters=Math.max(row.crestMismatchMaxMeters,Math.hypot(crest[0]-x,crest[2]-z));
        const key=front+':'+x, value={seaTime:status.seaTime,crest,relative:tip.map((v,i)=>v-crest[i]),ray,phase:loft.slicePhase[a],tau:snapshot.front[o+4]};
        const old=state.previous.get(key);next.set(key,value);
        if (old) { const delta=Math.hypot(...value.relative.map((v,i)=>v-old.relative[i]));row.temporal.comparedControls++;
          if(old.tau<0&&value.tau>=0)row.temporal.throwCrossings++;if(old.phase<2&&value.phase===2)row.temporal.touchdownCrossings++;
          row.temporal.maxCrestStepMeters=Math.max(row.temporal.maxCrestStepMeters,Math.hypot(...crest.map((v,i)=>v-old.crest[i])));
          row.temporal.maxTipRelativeStepMeters=Math.max(row.temporal.maxTipRelativeStepMeters,delta);
          row.temporal.maxRayStep=Math.max(row.temporal.maxRayStep,Math.hypot(ray[0]-old.ray[0],ray[1]-old.ray[1]));
          row.temporal.worst.push({front,x,delta,seaSeconds:status.seaTime-old.seaTime,fromTau:old.tau,toTau:value.tau,fromPhase:old.phase,toPhase:value.phase}); }
      }
      row.temporal.worst.sort((a,b)=>b.delta-a.delta);row.temporal.worst.length=Math.min(3,row.temporal.worst.length);state.previous=next;
      const candidates=[];
      for (let s=0;s<loft.sliceCount;s++) if (loft.sliceWeight[s]>0 && (loft.sliceJoined[s]===1 || (s>0&&loft.sliceJoined[s-1]===1)))
        candidates.push({s,front:loft.sliceFront[s],open:loft.slicePhase[s]===1&&loft.sliceOverturned[s]===1,
          score:Math.max(0,loft.sliceTipGap[s])*loft.sliceWeight[s]});
      const open=candidates.filter(c=>c.open);const tracked=open.filter(c=>c.front===state.trackedFront);
      const choices=tracked.length?tracked:open.length?open:candidates;
      choices.sort((a,b)=>b.score-a.score);const chosen=choices[0];
      if (chosen) {
        if (state.trackedFront!==null&&chosen.front!==state.trackedFront)state.cameraCuts++;
        state.trackedFront=chosen.front;
        const crest=3*(chosen.s*S+C),target=vector.clone().set(loft.positions[crest],loft.positions[crest+1],loft.positions[crest+2]);
        lab.fly.lookAt(target.clone().add(vector.clone().set(16,9,16)),target);
        lab.fly.applyTo(mode.camera.camera);mode.camera.camera.updateMatrixWorld(true);
        row.target={front:chosen.front,sigma:loft.sliceSigma[chosen.s],tau:loft.sliceTau[chosen.s],life:loft.sliceLife[chosen.s],phase:loft.slicePhase[chosen.s],open:chosen.open};
      }
      row.view={meshVisible:mesh.visible,projectedLiftedVertices:0,projectedOpenLiftedVertices:0,cameraCuts:state.cameraCuts,
        camera:{position:mode.camera.camera.position.toArray(),quaternion:mode.camera.camera.quaternion.toArray()}};
      for(let v=0;v<loft.vertexCount;v++)if(loft.lift[v]>0){vector.fromArray(loft.positions,3*v).project(mode.camera.camera);
        if(vector.z>=-1&&vector.z<=1&&Math.abs(vector.x)<=1&&Math.abs(vector.y)<=1){row.view.projectedLiftedVertices++;
          if(loft.slicePhase[Math.floor(v/S)]===1&&loft.sliceOverturned[Math.floor(v/S)]===1)row.view.projectedOpenLiftedVertices++;}}
    }
    row.failures=[...geometry.failures];
    if(row.surfaceNonfinite||row.sourceFrontNonfinite)row.failures.push('Nonfinite physical snapshot');
    if(!row.freshness.sourceStatusMatches||!row.freshness.meshStatusMatches||row.freshness.sourceTime!==status.seaTime)row.failures.push('Stale source or mesh');
    if(row.meshMismatch)row.failures.push('Renderer active positions/indices differ from actual loft');
    if(status.compute!=='gpu')row.failures.push('GPU computation fell back');
    row.pass=row.failures.length===0;
    const newClasses=row.failures.filter(f=>!state.fixtureClasses.has(f));
    if(captureFailures&&newClasses.length){
      for(const f of newClasses)state.fixtureClasses.add(f);
      const activeLoft={};
      for(const [key,value]of Object.entries(loft)){
        if(ArrayBuffer.isView(value)){
          const count=key==='indices'?loft.indexCount:key==='positions'||key==='normals'?3*loft.vertexCount:key.startsWith('slice')?loft.sliceCount:loft.vertexCount;
          activeLoft[key]=Array.from(value.subarray(0,count));
        }else if(typeof value==='number'||typeof value==='boolean')activeLoft[key]=value;
      }
      state.fixtures.push({capturedAt:now,failureClasses:newClasses,config:{...mode.config},init:{...mode.host.init},status:{...status},
        frontCount:snapshot.frontCount,front:Array.from(snapshot.front.subarray(0,9*snapshot.frontCount)),
        waterGrid:{...water.grid},surfaceData:Array.from(water.surfaceData),loft:activeLoft,
        camera:{position:mode.camera.camera.position.toArray(),quaternion:mode.camera.camera.quaternion.toArray()},
        maskGrid:{...water.barrelMaskGrid},maskNodes:Array.from(water.materialUniforms.waterBarrelMask.value.image.data),row});
    }
    row.inspectMs=performance.now()-began;state.rows.push(row);
    return result;
  };
  const slim=()=>({rows:state.rows.splice(0),published:window.__tubePublished.splice(0),fixtures:state.fixtures.splice(0)});
  window.__tubeLive={start:()=>{state.active=true;state.started=performance.now();window.__tubeCaptureActive=true;},drain:slim,
    stop:()=>{state.active=false;window.__tubeCaptureActive=false;state.stopped=performance.now();return{...slim(),started:state.started,stopped:state.stopped,frames:state.frames,cameraCuts:state.cameraCuts};}};
}

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const argv=process.argv.slice(2),args=Object.fromEntries(argv.map(arg=>{if(!arg.startsWith('--'))throw Error('Use --name=value');const i=arg.indexOf('=');return[arg.slice(2,i<0?undefined:i),i<0?'true':arg.slice(i+1)];}));
function selfTest(){
  const S=134,loft={sliceCount:2,vertexCount:2*S,indexCount:6*(S-1),positions:new Float32Array(6*S),normals:new Float32Array(6*S),indices:new Uint32Array(6*(S-1))};
  for(const name of ['mask','lift','sheet','sheetWeight','sheetBack'])loft[name]=new Float32Array(2*S);
  for(const name of ['sliceFront','sliceSigma','sliceTau','slicePhase','sliceFade','sliceCollapse','sliceRayX','sliceRayZ','sliceJoined','sliceWeight','sliceOverturned','sliceFormed','sliceTipGap'])loft[name]=new Float32Array(2);
  loft.sliceFront.fill(1);loft.sliceSigma[1]=1;loft.sliceRayZ.fill(1);loft.sliceJoined[0]=1;
  for(let j=0;j<S;j++){loft.positions[3*j+2]=j<67?j:134-j;loft.positions[3*(S+j)]=1;loft.positions[3*(S+j)+2]=loft.positions[3*j+2];if(j<S-1)loft.indices.set([j,j+S,j+1,j+1,j+S,j+S+1],6*j);}
  const require=(condition,label)=>{if(!condition)throw Error('Self-test failed: '+label);};
  require(inspectGeometry(loft).pass,'intentional along-ray overhang accepted');loft.positions[3*S]=-1;
  require(inspectGeometry(loft).negativeRows===1,'actual across-front fold rejected');loft.positions[3*S]=1;loft.positions[0]=NaN;
  require(!inspectGeometry(loft).pass,'active nonfinite hole rejected');loft.positions[0]=0;loft.indices[0]=1;
  require(!inspectGeometry(loft).pass,'missing triangle despite finite vertices rejected');loft.indices[0]=0;loft.lift[0]=1;
  require(inspectGeometry(loft).liftedRunEnds===1,'lifted surviving end rejected');require(inspectGeometry(loft).unsupportedLift===1,'missing mask support rejected');
  loft.sliceJoined[0]=0;loft.indexCount=0;
  const isolated=inspectGeometry(loft);require(isolated.pass&&isolated.unusedIsolatedLiftedVertices===1,'unused isolated vertex is not a drawn hole');
  console.log('Seven pure geometry regressions passed; no browser started.');
}
if(args['self-test']==='true'){selfTest();process.exit(0);}
const number=(name,fallback,min,max)=>{const n=Number(args[name]??fallback);if(!Number.isFinite(n)||n<min||n>max)throw Error('Invalid --'+name);return n;};
const seconds=number('seconds',20,15,30),width=number('width',1728,320,4096),height=number('height',1040,240,2160);
const components=(args.components??'24,64').split(',').map(Number);if(components.some(n=>!Number.isInteger(n)||n<1||n>64))throw Error('Invalid --components');
const targets=args.before||args.after?[{label:'before',base:args.before??'http://localhost:4192/',dir:args.beforeDir},{label:'after',base:args.after??'http://localhost:4201/',dir:args.afterDir}]:[{label:args.label??'current',base:args.url??'http://localhost:4201/',dir:args.dir}];
for(const target of targets){const u=new URL(target.base);if(!['localhost','127.0.0.1','[::1]'].includes(u.hostname)||u.port==='4200')throw Error('Use a separate local QA preview; play4200 is forbidden');
  for(const key of ['record','particleBench','waterSheet','demo','room','physical','pilot','barrelView'])if(u.searchParams.has(key))throw Error('Ordinary diagnostic URL must not contain '+key);
  u.searchParams.set('diagnostics','');u.searchParams.set('graphics','high');u.searchParams.set('renderSpacing','1');u.searchParams.set('waterNormals','pixel');target.url=u.href;}
const settings={spot:'padang',stage:2,compute:'auto',source:'buoy',significantHeight:4,peakPeriod:10,directionDegrees:10,spread:0.4,
  tide:0,windSpeed:0,stormWindSpeed:18,stormFetchKm:600,stormDurationHours:36,stormDistanceKm:3000};
const baseOverrides={seed:1,spreading:number('spreading',11.720624206334085,0,128),dx:1,fineSpacing:1,
  startSeaTime:number('seaTime',164,0,10000),spinUpPeriods:number('spinUp',2,0.1,4)};
const graphics={preset:'high',renderScale:1,nativePixelDensity:true,frameLimit:60,waterSimulation:'auto',seaDetail:'rich',caustics:true,sprayMist:true,oceanView:'far',foam:'detailed',waterLook:'rich',particles:'high'};
const plan={schema:1,geometryCheckerRevision:2,seconds,width,height,components,targets,settings,overrides:baseOverrides,graphics,
  method:'Sequential ordinary moving Wave Lab sessions. Actual particles and flow retained. Inspect each newly consumed physics snapshot, count publication separately, and follow an open front with a close camera. PNG clocks are bracketed before/after capture.',
  limitations:'Instrumentation and screenshots add CPU/GPU work; frame cadence is descriptive, not a 60FPS proof. Mask-grid overlap, temporal landmark jumps and seam/crest residuals are raw diagnostics. No matching of divergent physical trajectories beyond explicit initial seed/configuration/time.',
  scriptSha256:sha(readFileSync(fileURLToPath(import.meta.url)))};
new Function(`return (${inspectGeometry.toString()})`);new Function(`(${installLive.toString()})(${inspectGeometry.toString()})`);
if(args.run!=='true'||args.plan==='true'){console.log(JSON.stringify(plan,null,2));process.exit(0);}
if(targets.some(t=>!t.dir))throw Error('Live capture requires each served immutable directory: --dir or --beforeDir/--afterDir');
const out=resolve(args.out??'/private/tmp/tube-live-regression');mkdirSync(out,{recursive:true});
async function bounded(promise,ms,label){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' timeout')),ms);})]);}finally{clearTimeout(timer);}}
async function provenance(target){const root=resolve(target.dir),files=['index.html',...readdirSync(join(root,'assets')).filter(f=>f.endsWith('.js')).sort().map(f=>'assets/'+f)],hash=createHash('sha256'),served=[];
  for(const file of files){const bytes=readFileSync(join(root,file));hash.update(file);hash.update(bytes);const response=await fetch(new URL(file,target.base));if(!response.ok||sha(Buffer.from(await response.arrayBuffer()))!==sha(bytes))throw Error('Served bundle differs from '+root+':'+file);served.push({file,sha256:sha(bytes)});}
  let build;try{build=JSON.parse(readFileSync(join(root,'build.json')));}catch{}return{root,sha256:hash.digest('hex'),build,served};}
const reports=[];let page;
try{
  for(const target of targets){const bundle=await provenance(target);
    for(const componentCount of components){const label=target.label+'-c'+componentCount,dir=join(out,label);mkdirSync(dir,{recursive:true});const errors=[],rows=[],published=[],shots=[],fixtures=[],reasons=new Set();
      const saveFixtures=batch=>{for(const fixture of batch.fixtures??[]){const file=join(dir,`failure-${fixtures.length.toString().padStart(2,'0')}.json`);const bytes=Buffer.from(JSON.stringify(fixture)+'\n');writeFileSync(file,bytes);fixtures.push({file,sha256:sha(bytes),seaTime:fixture.status.seaTime,failureClasses:fixture.failureClasses});}};
      page=await launch({url:target.url,width,height,port:number('cdp',9461,1024,65535),args:['--mute-audio']});
      page.on('Runtime.exceptionThrown',({exceptionDetails:e})=>errors.push(e.exception?.description??e.text));
      const instrument=`(()=>{let seed=0x5eed;Math.random=()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};localStorage.setItem('breakline.settings.v1',${JSON.stringify(JSON.stringify({graphics,detected:{preset:'high',water:'accurate',lowPerformance:false},seen:{rideHints:true,lowPerformanceNotice:true}}))});window.__tubePublished=[];const NativeWorker=Worker;window.Worker=class extends NativeWorker{constructor(...args){super(...args);this.addEventListener('message',({data})=>{if(window.__tubeCaptureActive&&data?.snapshot?.status)window.__tubePublished.push({wall:performance.now(),seaTime:data.snapshot.status.seaTime,stepMs:data.snapshot.status.stepMs});});}};})();`;
      await page.send('Page.addScriptToEvaluateOnNewDocument',{source:instrument});await page.send('Page.navigate',{url:target.url});
      await page.waitFor("window.breaklineDiagnostics&&window.breaklineLab&&document.querySelector('.screen-menu')&&!document.querySelector('.is-scene-pending')",120000);
      console.log('Starting '+label+' at '+target.url+' (GPU sessions are sequential)');
      const initial=await bounded(page.eval(`(async()=>{const d=window.breaklineDiagnostics,lab=window.breaklineLab;lab.clock.paused=true;await d.start(${JSON.stringify(settings)},${JSON.stringify({...baseOverrides,componentCount})},{rider:false,lab:true});lab.active=true;lab.clock.paused=true;while(d.mode.host.outstandingSteps)await new Promise(r=>setTimeout(r,5));await Promise.race([d.mode.sweptBarrel.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Barrel library timeout')),15000))]);d.setWaterLook('rich');await d.setTimeOfDay('midday');d.mode.idleView='free';d.mode.camera.setView('free');const style=document.createElement('style');style.textContent='#ui,#touch-controls,#loading,#app::after{display:none!important}#scene{opacity:1!important;transition:none!important}';document.head.append(style);const c=d.canvas,gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return{status:d.mode.host.snapshot.status,config:d.mode.config,grid:d.mode.host.init.grid,viewport:{width:innerWidth,height:innerHeight,devicePixelRatio,canvasWidth:c.width,canvasHeight:c.height},browser:{userAgent:navigator.userAgent,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)}};})()`),180000,'GPU initialization');
      if(initial.config.componentCount!==componentCount||initial.status.compute!=='gpu')throw Error('Initial GPU/configuration authority failed');
      await page.eval(`(${installLive.toString()})(${inspectGeometry.toString()},${target.label!=='before'})`);
      await page.eval('window.__tubeLive.start();window.breaklineLab.clock.paused=false');
      const began=Date.now();let lastShot=-Infinity,lastState;
      while(Date.now()-began<1000*seconds){await sleep(200);const batch=await page.eval('window.__tubeLive.drain()');saveFixtures(batch);rows.push(...batch.rows);published.push(...batch.published);lastState=rows.at(-1);if(!lastState)continue;
        const at=(Date.now()-began)/1000,events=[
          !lastState.pass&&'first-failure',
          lastState.view?.meshVisible&&lastState.view.projectedOpenLiftedVertices>0&&'first-open',
          lastState.temporal.throwCrossings&&'first-new-throw',
          lastState.target?.phase===2&&'first-touchdown',
          lastState.geometry.overturned&&'first-overturn',
          lastState.target?.phase===0&&'first-pre',
        ];
        const reason=events.find(event=>event&&!reasons.has(event))??(at-lastShot>=5?'periodic':null);
        if(reason&&(reason==='first-failure'||lastState.view?.meshVisible&&lastState.view.projectedLiftedVertices>0)){const before=await page.eval('window.breaklineDiagnostics.mode.host.snapshot.status.seaTime'),shot=await page.send('Page.captureScreenshot',{format:'png'}),after=await page.eval('window.breaklineDiagnostics.mode.host.snapshot.status.seaTime');
          const file=join(dir,`${shots.length.toString().padStart(2,'0')}-${reason}.png`),bytes=Buffer.from(shot.data,'base64');writeFileSync(file,bytes);shots.push({at,reason,file,sha256:sha(bytes),seaTimeBefore:before,seaTimeAfter:after,row:lastState});lastShot=at;reasons.add(reason);}
      }
      await page.eval('window.breaklineLab.clock.paused=true');const final=await page.eval('window.__tubeLive.stop()');saveFixtures(final);rows.push(...final.rows);published.push(...final.published);
      const wall=(final.stopped-final.started)/1000,visibleOpen=rows.filter(r=>r.view?.meshVisible&&r.view.projectedOpenLiftedVertices>0).length,failures=[];
      if(!rows.length)failures.push('No inspected physics snapshots');if(!visibleOpen||!shots.some(s=>s.reason==='first-open'))failures.push('No actual visible open tube captured');
      if(errors.length)failures.push('Browser exceptions');if(rows.some(r=>!r.pass))failures.push('Live geometry/source invariant failures');
      const inspectedTimes=new Set(rows.map(r=>r.seaTime)),missingPublished=published.filter(r=>!inspectedTimes.has(r.seaTime));
      const report={...plan,label,bundle,initial,date:new Date().toISOString(),loadAverage:loadavg(),pass:failures.length===0,failures,errors,shots,fixtures,
        summary:{wallSeconds:wall,renderedFramesPerSecond:final.frames.length/wall,freshPublishedPerSecond:published.length/wall,inspectedSnapshotsPerSecond:rows.length/wall,
          simulationSecondsPerWallSecond:rows.length>1?(rows.at(-1).seaTime-rows[0].seaTime)/((rows.at(-1).wall-rows[0].wall)/1000):null,
          visibleOpenSnapshots:visibleOpen,phaseEvidence:{pre:rows.filter(r=>r.geometry.phases[0]>0).length,open:rows.filter(r=>r.geometry.phases[1]>0).length,post:rows.filter(r=>r.geometry.phases[2]>0).length,newThrows:rows.reduce((sum,r)=>sum+r.temporal.throwCrossings,0),touchdowns:rows.reduce((sum,r)=>sum+r.temporal.touchdownCrossings,0)},uninspectedPublishedSnapshots:missingPublished.length,inspectCpuMs:rows.reduce((sum,r)=>sum+r.inspectMs,0),cameraCuts:final.cameraCuts,
          negativeRows:rows.reduce((sum,r)=>sum+r.geometry.negativeRows,0),maximumTipRelativeStepMeters:Math.max(0,...rows.map(r=>r.temporal.maxTipRelativeStepMeters)),
          maximumCrestMismatchMeters:Math.max(0,...rows.map(r=>r.crestMismatchMaxMeters))},rows,published,missingPublished};
      writeFileSync(join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');reports.push({label,pass:report.pass,failures,summary:report.summary,report:join(dir,'report.json')});console.log(JSON.stringify(reports.at(-1)));
      await page.close();page=undefined;
    }
  }
}finally{if(page)await page.close();writeFileSync(join(out,'summary.json'),JSON.stringify({plan,checkout:{commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirtyFiles:execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim().split('\n').filter(Boolean)},runs:reports},null,2)+'\n');}
if(reports.some(r=>!r.pass))process.exitCode=1;
