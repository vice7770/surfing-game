// Observational adapter: forwards every request and retains the original worker handler.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const root='/Users/regina/Desktop/Projects/surfing-game';
const sourcePath=root+'/scripts/browser/fps-survey.mjs';
const original=readFileSync(sourcePath,'utf8');
const sha=v=>createHash('sha256').update(v).digest('hex');
let derived=original; const changes=[];
function replace(name, before, after) {
  if(derived.split(before).length!==2) throw Error('Harness marker changed: '+name);
  derived=derived.replace(before,after);
  changes.push({name,beforeSha256:sha(before),afterSha256:sha(after)});
}
replace('absolute-cdp',"from './cdp.mjs'",'from '+JSON.stringify(pathToFileURL(root+'/scripts/browser/cdp.mjs').href));
replace('trace-store','snapshots: [], contextsDrawn: 0','snapshots: [], portTrace: [], contextsDrawn: 0');
replace('post-observer','    constructor(...args) {\n      super(...args);',`    postMessage(...args) {
      const request=args[0], now=performance.now();
      const result=super.postMessage(...args);
      if(request?.type==='advance') {
        const sent={id:++this.probeSequence,wall:now,steps:request.steps,sampling:perf.sampling,
          pendingAfterDequeue:window.breaklineDiagnostics?.mode?.host===undefined?null:window.breaklineDiagnostics.mode.host.pending};
        if(this.probeReceipt) this.probeReceipt.nextSend={id:sent.id,wall:now,steps:sent.steps};
        this.probeRequest=sent;
      }
      return result;
    }
    set onmessage(callback) {
      this.probeCallback=callback;
      if(callback===null){super.onmessage=null;return;}
      const owner=this;
      super.onmessage=function(event){
        const received=owner.probeReceipt;
        if(received)received.handlerStarted=performance.now();
        try {return callback.call(this,event);}
        finally {if(received){received.handlerFinished=performance.now();
          received.pendingAfterReceipt=window.breaklineDiagnostics?.mode?.host?.pending;
          if(owner.probeReceipt===received)owner.probeReceipt=undefined;}}
      };
    }
    get onmessage(){return this.probeCallback??null;}
    constructor(...args) {
      super(...args);
      this.probeSequence=0;
      this.probeUrl=String(args[0]);`);
replace('receipt-observer',"        if (data?.snapshot?.status) {\n          const status = data.snapshot.status;",`        if (data?.snapshot?.status) {
          const status = data.snapshot.status;
          if(data.type==='snapshot' && perf.sampling && this.probeRequest?.sampling) {
            const host=window.breaklineDiagnostics?.mode?.host;
            const received={worker:this.probeUrl,request:this.probeRequest,wall:performance.now(),
              sea:status.seaTime,pipeline:status.pipelineMs,pendingBeforeReceipt:host?.pending,
              inFlightBeforeReceipt:host?.inFlightSteps,hostPortMatches:host?.port===this};
            this.probeReceipt=received;
            this.probeRequest=undefined;
            perf.portTrace.push(received);
          }`);
replace('trace-reset','perf.gpuRows = []; perf.snapshots = [];','perf.gpuRows = []; perf.snapshots = []; perf.portTrace = [];');
replace('trace-export',"return { canvas: canvas ? canvas.width + ' × ' + canvas.height : '', solver:","return { workerPortTrace: window.__perf.portTrace, canvas: canvas ? canvas.width + ' × ' + canvas.height : '', solver:");
replace('diagnostic-plan','timingComparableToPassiveBaseline: !GPU_DIAGNOSTIC,','timingComparableToPassiveBaseline: false, portTimingDiagnostic: true,');
replace('diagnostic-result','baselineComparable: failures.length === 0 && !GPU_DIAGNOSTIC,','baselineComparable: false, portTimingDiagnostic: true,');
const metadata={sourcePath,sourceSha256:sha(original),driverSha256:sha(readFileSync(new URL(import.meta.url))),derivedSha256:sha(derived),changes,
  method:'Same-main-clock request/reply and queued receipt-to-next-send observation. Original postMessage, transfer lists, host onmessage and every one-step publication remain. The onmessage property forwards the original callback with its native this/event, and try/finally timestamps its actual boundaries.',
  limitations:['Observer adds timestamps, allocations and a forwarding callback per measured reply; diagnostic, not pristine passive FPS.','Request latency minus paired pipeline total includes worker receive/main delivery queues, post serialization, timing granularity and uninstrumented work; no separated one-way delay.','Queued receipt-to-send is main-thread handoff only; do not confuse input/RAF idle waits with round-trip waste.']};
const metadataText=JSON.stringify(metadata);
replace('retained-provenance','const run = {','const run = { workerPortProbe: '+metadataText+',');
const scratch=mkdtempSync('/private/tmp/worker-port-observer-');
const script=scratch+'/derived-fps.mjs';writeFileSync(script,derived);
try {
  const child=spawn(process.execPath,[script,...process.argv.slice(2)],{cwd:root,stdio:'inherit'});
  process.exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>resolve(code??1));});
} finally { rmSync(scratch,{recursive:true,force:true}); }
