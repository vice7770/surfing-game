// QA-only native launcher. Reuses Page/sleep, never calls the root launch/fitViewport helper.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Page, sleep } from '/Users/regina/Desktop/Projects/surfing-game/scripts/browser/cdp.mjs';
export { sleep };

export function tcpProof(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    let done = false;
    const finish = (result) => { if (done) return; done = true; clearTimeout(timer); socket.destroy(); resolve(result); };
    const timer = setTimeout(() => finish({ closed: null, reason: 'TCP300ms deadline' }), 300);
    socket.once('connect', () => finish({ closed: false, reason: 'TCP accepted' }));
    socket.once('error', (error) => finish({ closed: error.code === 'ECONNREFUSED' ? true : null, reason: error.code ?? String(error) }));
  });
}

export async function launch({ url, width, height, port, args }) {
  if (width !== 1708 || height !== 966 || JSON.stringify(args) !== JSON.stringify(['--mute-audio'])) throw Error('Owned launch contract changed');
  const output = process.env.WHOLE_CURL_LAUNCHER_REPORT;
  if (!output) throw Error('Launcher evidence path missing');
  const evidence = { initialRequest: { size: [1708, 966], position: [60, 60] }, resizeOverrides: [], ownedChromeClosed: false };
  const save = () => writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n');
  evidence.preSpawnPort = await tcpProof(port);
  if (evidence.preSpawnPort.closed !== true) throw Error('Owned CDP port must be unoccupied');
  const profile = mkdtempSync(join(tmpdir(), 'breakline-whole-curl-native-'));
  const chrome = spawn(process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-networking', '--disable-component-update', '--disable-sync',
    '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
    '--autoplay-policy=no-user-gesture-required', '--window-size=1708,966', '--window-position=60,60',
    '--app=about:blank', '--mute-audio',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  evidence.startedAt = new Date().toISOString(); evidence.pid = chrome.pid ?? null; evidence.profile = profile; evidence.spawnargs = chrome.spawnargs; evidence.stderr = '';
  chrome.stderr.on('data', (bytes) => { if (evidence.stderr.length < 16384) evidence.stderr += String(bytes).slice(0, 16384 - evidence.stderr.length); });
  let startError;
  const saveEvent = () => { try { save(); } catch(error) { startError ??= error; evidence.evidenceWriteFailure ??= String(error); chrome.kill('SIGTERM'); } };
  chrome.once('exit', (code, signal) => { evidence.exit = { at: new Date().toISOString(), code, signal }; saveEvent(); });
  chrome.once('error', (error) => { startError = error; evidence.startError = String(error); saveEvent(); });
  let closed = false;
  let page;
  const close = async () => {
    if (closed) return; closed = true;
    chrome.kill('SIGTERM');
    for (let pass = 0; pass < 10 && chrome.exitCode === null && chrome.signalCode === null; pass += 1) await sleep(100);
    if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill('SIGKILL');
    page?.socket.close();
    for (let pass = 0; pass < 10; pass += 1) { evidence.portProof = await tcpProof(port); if (evidence.portProof.closed === true) break; await sleep(100); }
    evidence.ownedChromeClosed = evidence.portProof?.closed === true;
    evidence.closedAt = new Date().toISOString(); save();
    if (evidence.ownedChromeClosed) rmSync(profile, { recursive: true, force: true });
    if (!evidence.ownedChromeClosed) throw Error('Owned CDP closure unproven');
  };
  process.once('SIGTERM', () => { void close().finally(() => process.exit(1)); });
  try {
    save();
    let target;
    for (let attempt = 0; attempt < 100 && !target; attempt += 1) {
      await sleep(150);
      if (startError) throw startError;
      try {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(500) })).json();
        const pages = list.filter((entry) => entry.type === 'page');
        if (pages.length > 1) throw Error('Ambiguous owned page inventory');
        if (pages.length === 1) target = pages[0];
      } catch (error) { if (String(error).includes('Ambiguous')) throw error; }
    }
    if (!target?.webSocketDebuggerUrl) throw Error('Owned sole page unavailable');
    page = await Page.connect(target.webSocketDebuggerUrl);
    page.close = close;
    await page.send('Page.enable'); await page.send('Runtime.enable');
    const allowedOrigin=new URL(url).origin; evidence.blockedPageRequests=[];
    page.on('Fetch.requestPaused', event => {
      let allowed=false;try{allowed=new URL(event.request.url).origin===allowedOrigin;}catch{}
      if(!allowed){if(evidence.blockedPageRequests.length<16)evidence.blockedPageRequests.push(event.request.url.slice(0,2048));saveEvent();}
      void page.send(allowed?'Fetch.continueRequest':'Fetch.failRequest',allowed?{requestId:event.requestId}:{requestId:event.requestId,errorReason:'BlockedByClient'})
        .catch(error=>{startError ??= error;evidence.requestGuardFailure ??= String(error);saveEvent();chrome.kill('SIGTERM');});
    });
    await page.send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
    await page.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    evidence.aboutblank = await page.eval('({inner:[innerWidth,innerHeight],outer:[outerWidth,outerHeight],dpr:devicePixelRatio,screen:[screen.width,screen.height,screen.availWidth,screen.availHeight]})');
    const { windowId } = await page.send('Browser.getWindowForTarget');
    evidence.aboutblankBounds = await page.send('Browser.getWindowBounds', { windowId }); save();
    // Match the survey's initial ordinary navigation; instrumentation is installed before its reload below.
    await page.send('Page.navigate', { url });
    await page.waitFor("document.querySelector('.screen-menu') && !document.querySelector('.is-scene-pending')", 45000);
    return page;
  } catch (error) { evidence.error = String(error); await close(); throw error; }
}
