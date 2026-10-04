// Offline source-function test only: no browser, server, media API or physics is started.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const WORK='/private/tmp/tube-whole-curl-stream-start-20261004';
const inputs=[
 {name:'fixed-view',path:WORK+'/native.mjs',start:'  async function beginVideo() {',end:'  async function captureVideoFrame(',kind:'fixed'},
 {name:'big-first-standing',path:'/private/tmp/tube-menu-big-entry-20261004/native.mjs',start:' async function beginVideo(){',end:' async function videoFrame(){',kind:'big'},
];
const checks=[];
for(const item of inputs){
 const source=readFileSync(item.path,'utf8'),a=source.indexOf(item.start),b=source.indexOf(item.end,a);assert(a>=0&&b>a);
 const fn=source.slice(a,b),events=[],camera={position:{toArray:()=>[1,2,3]},quaternion:{toArray:()=>[0,0,0,1]}};
 let recorder;
 const track={readyState:'live',stop(){this.readyState='ended';events.push('track-stop');},requestFrame(){
   events.push('requestFrame');assert.equal(recorder.state,'recording');assert(events.includes('render'));
   queueMicrotask(()=>{events.push('onstart');recorder.onstart();});
 }};
 const stream={getVideoTracks:()=>[track],getTracks:()=>[track]};
 class SourceTestRecorder{
   static isTypeSupported(){return true;}
   constructor(){recorder=this;this.state='inactive';this.mimeType='video/webm;codecs=vp9';}
   start(){events.push('start');this.state='recording';}
 }
 const d={canvas:{width:1708,height:879,captureStream(rate){assert.equal(rate,0);events.push('captureStream');return stream;}},renderView(){events.push('render');}};
 const must=(v,m)=>assert(v,m);
 const observation={physicalStepIndex:0,offsetPhysicalSeconds:0,seaTime:553.173058749449};
 const helpers={d,must,MediaRecorder:SourceTestRecorder,camera,observe:n=>{assert.equal(n,0);return observation;},
   videoCapabilities:()=>({mediaRecorder:true,canvasCaptureStream:true,supportedWebm:[{mimeType:'video/webm;codecs=vp9',supported:true}]}),
   MAX_VIDEO_BYTES:16*1024*1024,mode:{camera:{camera}},steps:17,current:()=>({seaTime:553.5,ride:{phase:'standing'}})};
 const build=new Function(...Object.keys(helpers),`let recording,video;${fn};return beginVideo;`);
 const begin=build(...Object.values(helpers));
 const result=await begin();
 assert.deepEqual(events,['captureStream','start','render','requestFrame','onstart']);
 const entry=item.kind==='fixed'?result.initialMotionFrame:result.initialVideoFrame;
 assert(entry);assert.equal(item.kind==='fixed'?entry.canvasFrameRequest.number:entry.request,1);
 assert.equal(item.kind==='fixed'?entry.physicalStepIndex:entry.step,item.kind==='fixed'?0:17);
 assert.equal(item.kind==='fixed'?entry.seaTime:entry.seaTime,item.kind==='fixed'?observation.seaTime:553.5);
 checks.push({name:item.name,passed:true,sourcePath:item.path,functionSha256:createHash('sha256').update(fn).digest('hex'),events,initialRequest:1,
   scope:'Extracted real beginVideo source in a mock recorder requiring a first frame to emit onstart; proves callback/request ordering only, no native capability or pixels.'});
}
writeFileSync(WORK+'/handshake-source-checks.json',JSON.stringify({complete:true,sourceOnly:true,resourcesStarted:false,checks},null,2)+'\n');
process.stdout.write(JSON.stringify({complete:true,sourceOnly:true,resourcesStarted:false,checks:checks.length})+'\n');
