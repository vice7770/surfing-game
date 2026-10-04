// QA ONLY. Default prepares/validates the plan; --run=true is a separately reviewed hardware lease.
import {createHash,randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {createConnection} from 'node:net';
import {createReadStream,existsSync,mkdirSync,readFileSync,rmSync,mkdtempSync,statSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {spawn} from 'node:child_process';
import {join,resolve,extname} from 'node:path';
import {tmpdir} from 'node:os';
import {Page,sleep} from './scratch/scripts/browser/cdp.mjs';
import {summarize} from './count-summary.mjs';
const WORK='/private/tmp/contact-lazy-height-20261004',DIST=join(WORK,'scratch/dist'),PORT=4215,CDP=9625,PAGE_URL='http://127.0.0.1:'+PORT+'/?diagnostics';
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');if(!a.startsWith('--')||i<0)throw Error('Use --name=value');return[a.slice(2,i),a.slice(i+1)];}));
if(Object.keys(args).some(k=>!['run','out'].includes(k)))throw Error('Only run/out may vary');
if(args.run&&!['true','false'].includes(args.run))throw Error('run=true|false');
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifestPath=join(WORK,'manifest.json'),manifest=JSON.parse(readFileSync(manifestPath));
const GRAPHICS={preset:'high',renderScale:1,nativePixelDensity:true,frameLimit:60,waterSimulation:'auto',seaDetail:'rich',caustics:true,sprayMist:true,oceanView:'far',foam:'detailed',waterLook:'rich',particles:'high'};
const EXPECTED={spot:'padang',seed:8761,significantHeight:3.8,peakPeriod:18,directionDegrees:0,spreading:150,tide:0,windSpeed:0,stage:2,compute:'auto',dx:2,fineSpacing:1,componentCount:64};
const PLAN={kind:'One original-eager contact demand capture; no FPS claim',base:manifest.base,url:PAGE_URL,viewport:{width:1708,height:926,browserDpr:2,effectiveDpr:1.75,canvasWidth:2989,canvasHeight:1620},route:'ordinary menu → Surf → Padang → Big → Paddle out; idle rider; no synthetic stepping/fast-forward/pocket reflex',schedule:{afterCompletedSpinUpSimSeconds:90,consecutivePostwaterEpochs:15,fixedStepSeconds:1/60,overallSecondsFromOwnedChromeSpawn:150,retries:0},graphics:GRAPHICS,expectedConfig:EXPECTED,runtimeOverrides:[{realm:'page only',target:'Math.random',algorithm:'canonical FPS bootstrap Mulberry32',initialState:0x5eed,purpose:'deterministic menu/Three allocation sequence selects actual ordinary sea seed8761; worker RNG and SurfZoneConfig are not overridden'}],workerRngOverride:false,camera:'unchanged ordinary ride',manifestSha256:hash(readFileSync(manifestPath)),build:manifest.build};
for(const r of manifest.sources)if(hash(readFileSync(join(WORK,'scratch',r.path)))!==r.sha256)throw Error('Scratch source changed:'+r.path);
for(const r of manifest.build)if(hash(readFileSync(join(DIST,r.path)))!==r.sha256)throw Error('Build changed:'+r.path);
for(const r of manifest.preparation)if(hash(readFileSync(join(WORK,r.path)))!==r.sha256)throw Error('Preparation changed:'+r.path);
if(args.run!=='true'){console.log(JSON.stringify({...PLAN,chromeStarted:false},null,2));process.exit(0);}
const OUT=args.out??join(WORK,'run');if(existsSync(OUT))throw Error('Output exists; refusing overwrite');mkdirSync(OUT,{recursive:true});
const report={schema:1,kind:PLAN.kind,plan:PLAN,runId:randomUUID(),valid:false,incomplete:true,startedAt:new Date().toISOString(),sourceChecks:true,ownedChromeClosed:false,ownServerClosed:false,polls:[]};
const save=()=>writeFileSync(join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');save();
const assert=(condition,message)=>{if(!condition)throw Error(message);};
function pagePrelude(options){
 let random=0x5eed;Math.random=()=>{random=(random+0x6D2B79F5)|0;let t=Math.imul(random^(random>>>15),1|random);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};
 localStorage.setItem('breakline.settings.v1',JSON.stringify({graphics:options.graphics,detected:{preset:'high',water:'accurate',lowPerformance:false},gameplay:{showTelemetry:true},seen:{rideHints:true,lowPerformanceNotice:true}}));
 const p=window.__contactQa={tag:'__contactDemand20261004',workers:[],controls:new Map(),id:0};
 const Native=window.Worker;
 window.Worker=class extends Native{
  constructor(url,descriptor){super(url,descriptor);this.qaTracked=/\/surfZoneWorker-[^/]+\.js$/.test(new URL(url,location.href).pathname);this.qaStarts=0;this.qaAdvances=0;this.qaUrl=new URL(url,location.href).href;if(!this.qaTracked)return;p.workers.push(this);
   this.addEventListener('message',event=>{const data=event.data;if(!data?.[p.tag])return;event.stopImmediatePropagation();const pending=p.controls.get(data.id);if(!pending)return;p.controls.delete(data.id);clearTimeout(pending.timer);data.error?pending.reject(Error(data.error)):pending.resolve(data.value);});
   this.addEventListener('error',event=>{p.fatal=event.message||'worker error';});
  }
  postMessage(request,...rest){
   if(this.qaTracked&&request?.type==='start'){this.qaStarts++;this.qaStart={config:{...request.config},rider:request.options?.rider,barrelCaseCount:request.options?.barrelCases?.length??0,renderSpacingHasOwn:Object.prototype.hasOwnProperty.call(request.options??{},'renderSpacing'),renderSpacingUndefined:request.options?.renderSpacing===undefined};}
   if(this.qaTracked&&request?.type==='advance'){this.qaAdvances++;this.qaLastAdvance={serial:this.qaAdvances,steps:request.steps};}
   return Reflect.apply(Native.prototype.postMessage,this,[request,...rest]);
  }
 };
 p.command=command=>new Promise((resolve,reject)=>{const worker=window.breaklineDiagnostics?.mode?.host?.port;if(!p.workers.includes(worker)){reject(Error('Actual host port is not an observed worker'));return;}const id=++p.id;const timer=setTimeout(()=>{p.controls.delete(id);reject(Error('QA '+command+' timeout'));},5000);p.controls.set(id,{resolve,reject,timer});worker.postMessage({[p.tag]:true,id,command});});
}
let server,chrome,page,profile,overall,deadlineReject;
const deadline=new Promise((_,reject)=>{deadlineReject=reject;});
const within=promise=>Promise.race([promise,deadline]);
const tcpProof=port=>new Promise(resolve=>{const socket=createConnection({host:'127.0.0.1',port});let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);socket.destroy();resolve(value);};const timer=setTimeout(()=>finish({closed:null,reason:'TCP300ms deadline'}),300);socket.once('connect',()=>finish({closed:false,reason:'TCP accepted'}));socket.once('error',e=>finish({closed:e.code==='ECONNREFUSED'?true:null,reason:e.code??String(e)}));});
async function ownedChrome(){
 const available=await tcpProof(CDP);assert(available.closed===true,'CDP port must be unoccupied before spawn');report.preSpawnPortProof=available;
 profile=mkdtempSync(join(tmpdir(),'breakline-contact-demand-'));
 report.chromeSpawnedAt=new Date().toISOString();save();
 chrome=spawn(process.env.CHROME??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--remote-debugging-port='+CDP,'--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-extensions','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling','--autoplay-policy=no-user-gesture-required','--window-size=1708,966','--window-position=60,60','--app=about:blank'],{stdio:['ignore','ignore','pipe']});
 report.chromeProcess={pid:chrome.pid??null,profile,spawnargs:chrome.spawnargs,stderr:''};chrome.once('exit',(code,signal)=>{report.chromeProcess.exit={at:new Date().toISOString(),code,signal};});chrome.stderr.on('data',b=>{if(report.chromeProcess.stderr.length<32768)report.chromeProcess.stderr+=String(b).slice(0,32768-report.chromeProcess.stderr.length);});
 overall=setTimeout(()=>deadlineReject(Error('Hard150s overall deadline; no retry')),150000);
 let launchError;chrome.once('error',e=>{launchError=e;report.chromeProcess.startError=String(e);});let target;
 for(let i=0;i<100&&!target;i++){await sleep(150);if(launchError)throw launchError;try{const inventory=await(await fetch('http://127.0.0.1:'+CDP+'/json/list',{signal:AbortSignal.timeout(500)})).json();report.lastTargetInventory=inventory;const pages=inventory.filter(t=>t.type==='page');if(pages.length>1)throw Error('Ambiguous owned page inventory');if(pages.length===1)target=pages[0];}catch(e){if(String(e).includes('Ambiguous'))throw e;report.lastTargetPollError=String(e);}}
 assert(target?.webSocketDebuggerUrl,'Owned sole page unavailable');page=await Page.connect(target.webSocketDebuggerUrl);await page.send('Page.enable');await page.send('Runtime.enable');await page.send('Emulation.setFocusEmulationEnabled',{enabled:true});await page.fitViewport(1708,926);
}
async function validateServed(){
 report.served=[];
 for(const r of manifest.build){const res=await fetch('http://127.0.0.1:'+PORT+'/'+r.path,{signal:AbortSignal.timeout(2000)});assert(res.ok,'Served asset unavailable:'+r.path);const bytes=Buffer.from(await res.arrayBuffer());assert(hash(bytes)===r.sha256,'Served bytes changed:'+r.path);report.served.push({path:r.path,sha256:hash(bytes)});}
 const build=await(await fetch('http://127.0.0.1:'+PORT+'/build.json')).json();assert(build.build==='58ceb6a29','Literal BUILD_ID differs');report.literalBuildId=build.build;save();
}
async function route(){
 await page.send('Page.addScriptToEvaluateOnNewDocument',{source:'('+pagePrelude.toString()+')('+JSON.stringify({graphics:GRAPHICS})+');'});await page.send('Page.navigate',{url:PAGE_URL});
 await page.waitFor("window.__contactQa?.fatal || (document.querySelector('.screen-menu')&&!document.querySelector('.is-scene-pending'))",45000);
 await page.click('.tile','Surf');await page.waitFor("document.querySelector('#app')?.dataset.screen==='surf'",15000);await page.click('.spot-card','Padang');await page.click('.segmented button','Big');await page.click('.button-primary','Paddle out');
 await page.waitFor("window.__contactQa?.fatal || (document.querySelector('#app')?.dataset.screen==='ride'&&window.breaklineDiagnostics?.mode.ready===true&&window.breaklineDiagnostics.mode.host?.snapshot?.status?.compute==='gpu')",45000);
 if(await page.eval('window.__contactQa.fatal'))throw Error(await page.eval('window.__contactQa.fatal'));
 report.rideReadyAt=new Date().toISOString();
 report.initial=await page.eval(`(()=>{const d=window.breaklineDiagnostics,h=d.mode.host,p=window.__contactQa,w=h.port;return{config:d.mode.config,status:h.snapshot.status,start:w.qaStart,startSerial:w.qaStarts,advanceSerial:w.qaAdvances,workerUrl:w.qaUrl,hostPortObserved:p.workers.includes(w),viewport:[innerWidth,innerHeight],browserDpr:devicePixelRatio,canvas:[d.canvas.width,d.canvas.height],grid:h.init.grid,maskSpacing:d.water.barrelMaskGrid?.spacing,renderSpacing:d.water.grid.spacing,maxBatchSteps:h.maxBatchSteps,waterLook:d.water.drawnLook,vertexNormals:d.water.vertexNormals,particles:d.mode.particleLevel,graphics:JSON.parse(localStorage.getItem('breakline.settings.v1')).graphics,userAgent:navigator.userAgent};})()`);save();
 const o=report.initial;
 for(const[k,v]of Object.entries(EXPECTED)){assert(o.config[k]===v,'config.'+k+' differs');assert(o.start?.config?.[k]===v,'actual start config.'+k+' differs');}
 for(const[k,v]of Object.entries(GRAPHICS))assert(o.graphics[k]===v,'graphics.'+k+' differs');
 assert(o.hostPortObserved&&o.startSerial===1&&o.start.rider===true&&o.start.barrelCaseCount===4&&o.start.renderSpacingHasOwn===true&&o.start.renderSpacingUndefined===true,'Actual start/contact options differ');
 assert(o.viewport[0]===1708&&o.viewport[1]===926&&o.browserDpr===2&&o.canvas[0]===2989&&o.canvas[1]===1620,'Native viewport/density differs');
 assert(o.status.compute==='gpu'&&o.status.cells===116000&&o.renderSpacing===2&&o.maskSpacing===1&&o.maxBatchSteps===1&&o.waterLook==='rich'&&o.vertexNormals===false&&o.particles==='high','Ordinary backend/grid/quality differs');
 assert(new URL(o.workerUrl).pathname==='/'+manifest.worker.path,'Loaded worker differs');
 for(;;){
  const summary=await page.eval("window.__contactQa.command('summary')");report.polls.push({wallAt:new Date().toISOString(),...summary});save();
  assert(summary.qaStarts===1&&summary.ordinaryArraysIdentical===true&&summary.compute==='gpu'&&summary.workerMathRandomNative===true,'Worker source identity/backend changed');
  if(summary.complete)break;
  await sleep(500);
 }
 await page.press('Escape');await page.waitFor("document.querySelector('#app')?.dataset.screen==='pause'&&window.breaklineDiagnostics.mode.host.outstandingSteps===0",10000);
 report.pause=await page.eval(`(()=>{const d=window.breaklineDiagnostics,h=d.mode.host,w=h.port;return{screen:document.querySelector('#app')?.dataset.screen,status:h.snapshot.status,outstanding:h.outstandingSteps,advanceSerial:w.qaAdvances,lastAdvance:w.qaLastAdvance};})()`);save();
 report.collectStartedAt=new Date().toISOString();const collected=await page.eval("window.__contactQa.command('collect')");
 const raw=Buffer.from(collected.json),gz=gzipSync(raw);writeFileSync(join(OUT,'capture.json.gz'),gz);
 report.capture={path:join(OUT,'capture.json.gz'),storedBytes:gz.length,storedSha256:hash(gz),jsonBytes:raw.length,jsonSha256:hash(raw),workerMetadata:{qaStarts:collected.qaStarts,qaAdvances:collected.qaAdvances,qaStart:collected.qaStart,seaTime:collected.seaTime,workerMathRandomNative:collected.workerMathRandomNative},serializedAfterNaturalPause:true};
 assert(collected.workerMathRandomNative===true,'Worker Math.random was overridden');const capture=JSON.parse(collected.json),f=capture.firstFixture;
 assert(f&&f.byteOrder==='little'&&f.solver.h.type==='Float64Array'&&f.solver.bed.type==='Float64Array'&&f.solver.h.byteLength===116000*8&&f.solver.bed.byteLength===116000*8,'First actual Float64 provider capture differs');
 for(const name of ['h','bed','xCenters','zCenters','dz']){const d=f.solver[name];assert(d.type==='Float64Array','Provider type differs:'+name);const b=Buffer.from(d.base64,'base64');assert(b.length===d.byteLength&&b.length%8===0,'Provider bytes differ:'+name);for(let i=0;i<b.length;i+=8)assert(Number.isFinite(b.readDoubleLE(i)),'Nonfinite captured provider:'+name+'@'+i);}
 assert(f.nodeSpacing===2&&f.solver.nx===160&&f.solver.nz===725&&f.solver.dx===2&&f.options.rider===true&&f.options.barrelCases.length===4&&f.recordCount>=0,'First fixture inputs/options differ');
 report.summary=summarize(capture);writeFileSync(join(OUT,'summary.json'),JSON.stringify(report.summary,null,2)+'\n');assert(report.summary.valid,'Capture validation:'+report.summary.failures.join('; '));
 report.valid=true;report.incomplete=false;report.finishedAt=new Date().toISOString();save();
}
async function run(){
 server=createServer((req,res)=>{try{const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=resolve(DIST,'.'+(rel==='/'?'/index.html':rel));if(!file.startsWith(DIST+'/')||!statSync(file).isFile()){res.writeHead(404);res.end();return;}const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.jpg':'image/jpeg','.bin':'application/octet-stream'};res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');createReadStream(file).pipe(res);}catch{res.writeHead(404);res.end();}});
 await new Promise((ok,no)=>{server.once('error',no);server.listen(PORT,'127.0.0.1',ok);});await validateServed();await ownedChrome();await route();
}
try{await within(run());}catch(cause){report.error=String(cause?.stack??cause);report.valid=false;save();process.exitCode=1;}finally{
 clearTimeout(overall);
 if(page){await Promise.race([page.send('Browser.close').catch(()=>{}),sleep(500)]);page.socket.close();}
 chrome?.kill('SIGTERM');await sleep(500);if(chrome?.exitCode===null)chrome.kill('SIGKILL');if(profile)rmSync(profile,{recursive:true,force:true});
 report.portProof=chrome?await tcpProof(CDP):{closed:null,reason:'No owned Chrome spawned'};report.ownedChromeClosed=report.portProof.closed;
 if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}report.ownServerClosed=true;report.closedAt=new Date().toISOString();save();
 if(chrome&&report.ownedChromeClosed!==true){report.valid=false;report.cleanupError='Owned CDP closure unproven';save();process.exitCode=1;}
 console.log(JSON.stringify({valid:report.valid,incomplete:report.incomplete,error:report.error,ownedChromeClosed:report.ownedChromeClosed,report:join(OUT,'report.json')}));
}
