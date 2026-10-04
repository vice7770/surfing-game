// Private native resources only. Reuses frozen Page; never its launch/fitViewport helpers.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createConnection } from 'node:net';
import { join } from 'node:path';
import { Page, sleep } from './borrowed-cdp.mjs';
export { sleep };
export function tcpProof(port) {
  return new Promise(resolve=>{const socket=createConnection({host:'127.0.0.1',port});let done=false;const finish=r=>{if(done)return;done=true;clearTimeout(timer);socket.destroy();resolve(r);};const timer=setTimeout(()=>finish({closed:null,reason:'TCP300ms deadline'}),300);socket.once('connect',()=>finish({closed:false,reason:'TCP accepted'}));socket.once('error',e=>finish({closed:e.code==='ECONNREFUSED'?true:null,reason:e.code??String(e)}));});
}
export async function launchOwned({port,work,onEvidence,onHandle,onFailure,log}) {
  if(port!==9669)throw Error('CDP whitelist differs');const pre=await tcpProof(port);if(pre.closed!==true)throw Error('Owned CDP port occupied');
  const profile=mkdtempSync(join(work,'chrome-profile-'));const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',[
    `--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--disable-extensions',
    '--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling',
    '--autoplay-policy=no-user-gesture-required','--window-size=1708,966','--window-position=60,60','--app=about:blank','--mute-audio'
  ],{stdio:['ignore','ignore','pipe']});
  const evidence={pid:chrome.pid??null,profile,spawnargs:chrome.spawnargs,pre,startedAt:new Date().toISOString(),resizeOverrides:[],ownedChromeClosed:false};let page,startError,closing;
  const notifyFailure=e=>{startError??=e;evidence.evidenceFailure??=String(e);try{onFailure?.(e);}catch{}void close().catch(error=>{evidence.closeFailure??=String(error);});};
  const emit=()=>{try{onEvidence(evidence);}catch(e){notifyFailure(e);}};
  const close=()=>closing??=(async()=>{chrome.kill('SIGTERM');for(let i=0;i<8&&chrome.exitCode===null&&chrome.signalCode===null;i++)await sleep(100);if(chrome.exitCode===null&&chrome.signalCode===null)chrome.kill('SIGKILL');for(let i=0;i<8&&chrome.exitCode===null&&chrome.signalCode===null;i++)await sleep(100);page?.socket.close();evidence.portProof=await tcpProof(port);evidence.ownedChromeClosed=evidence.portProof.closed===true&&(chrome.exitCode!==null||chrome.signalCode!==null);evidence.closedAt=new Date().toISOString();emit();if(evidence.ownedChromeClosed)rmSync(profile,{recursive:true,force:true});if(!evidence.ownedChromeClosed)throw Error('Owned Chrome PID/port closure unproven');})();
  // Publish the close handle before any fallible evidence callback or asynchronous listener.
  try{onHandle({close,evidence});}catch(e){await close();throw e;}
  chrome.stderr.on('data',b=>{try{log(b);}catch(e){notifyFailure(e);}});
  chrome.once('error',e=>{startError=e;evidence.startError=String(e);emit();});
  chrome.once('exit',(code,signal)=>{evidence.exit={code,signal,at:new Date().toISOString()};emit();});
  emit();
  try {
    let target;for(let i=0;i<100&&!target;i++){if(startError)throw startError;await sleep(100);try{const list=await(await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(400)})).json();const tabs=list.filter(t=>t.type==='page');if(tabs.length>1)throw Error('Ambiguous private page inventory');if(tabs.length===1)target=tabs[0];}catch(e){if(String(e).includes('Ambiguous'))throw e;}}
    if(!target?.webSocketDebuggerUrl)throw Error('Private sole page unavailable');page=await Page.connect(target.webSocketDebuggerUrl);page.close=close;
    await page.send('Page.enable');await page.send('Runtime.enable');await page.send('Emulation.setFocusEmulationEnabled',{enabled:true});
    const {windowId}=await page.send('Browser.getWindowForTarget');evidence.initialBounds=await page.send('Browser.getWindowBounds',{windowId});evidence.initialViewport=await page.eval('({inner:[innerWidth,innerHeight],outer:[outerWidth,outerHeight],dpr:devicePixelRatio})');emit();if(startError)throw startError;
    return {page,close,evidence};
  } catch(e){await close();throw e;}
}
