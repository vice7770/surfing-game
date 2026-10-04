// Passive QA only. Original worker requests, callbacks, RAF, camera and draw calls are delegated unchanged.
(() => {
  const TARGETS=[0,5,10,15,20,25,30,35,40], RAW=96*1024*1024, PNG=32*1024*1024;
  const expected={spot:'padang',seed:1,significantHeight:4,peakPeriod:10,directionDegrees:10,spreading:11.720624206334085,tide:0,windSpeed:0,stage:2,compute:'auto',dx:1,fineSpacing:1};
  const api=window.__waveLabPassive={state:'waiting-lab',frames:[],fields:[],workerStarts:[],failure:null,originWall:null,followClick:null};
  const kept=new Map(), workers=[], callbacks=[], originalRAF=window.requestAnimationFrame, NativeWorker=window.Worker;
  let copied=0, pngBytes=0, renderer, scene, originalRender, renderWrapper, serial=0, waterMark, barrelMark, activeWorker, restored=false, doneResolve, followResolve;
  const done=new Promise(resolve=>{doneResolve=resolve;}), followDue=new Promise(resolve=>{followResolve=resolve;});
  const costs=api.observer={typedCopies:0,typedBytes:0,typedCopyMs:0,pngCopies:0,pngBytes:0,pngEncodingMs:0,pngDecodeMs:0,hookCalls:0,hookMs:0,workerMessageCalls:0,workerHookMs:0,accessibleJsTransientPeakBytes:0,transportCalls:0,transportBase64Bytes:0,transportMs:0,browserInternalPeakMemory:'unavailable',timingScope:'hookMs includes nested capture copy/encoding costs; these breakdowns must not be summed as independent costs'};
  const assert=(ok,message)=>{if(!ok)throw Error(message);}, clone=v=>structuredClone(v), matrix=m=>Array.from(m.elements);
  const view=typed=>new Uint8Array(typed.buffer,typed.byteOffset,typed.byteLength);
  function stop(reason) { if(api.state==='complete'||api.state==='incomplete')return;api.failure=String(reason);api.state='incomplete';followResolve({incomplete:true,failure:api.failure});doneResolve(summary()); }
  function own(label,typed) {
    const started=performance.now();assert(ArrayBuffer.isView(typed)&&!(typed instanceof DataView),'Absent numerical field '+label);
    assert(copied+typed.byteLength<=RAW,'96MiB retained numerical/typed payload exceeded');
    const bytes=new Uint8Array(typed.byteLength);bytes.set(view(typed));copied+=bytes.length;kept.set(label,bytes);
    const row={label,kind:'typed',type:typed.constructor.name,elements:typed.length,bytes:bytes.length};api.fields.push(row);
    costs.typedCopies++;costs.typedBytes+=bytes.length;costs.typedCopyMs+=performance.now()-started;return row;
  }
  function matching(c) { return c&&Object.entries(expected).every(([k,v])=>c[k]===v)&&c.componentCount===undefined; }
  function field(o,k) {return {own:Object.prototype.hasOwnProperty.call(o??{},k),undefined:o?.[k]===undefined,...(o?.[k]===undefined?{}:{value:o[k]})};}
  const PassiveWorker=class extends NativeWorker {
    constructor(...args) {
      super(...args);const row=this.passiveAudit={serial:workers.length,url:String(args[0]),starts:[],advances:0,badAdvances:0,publications:0,interventions:[]};workers.push(this);
      this.addEventListener('message',event=>{const t=performance.now();try{const m=event.data;if(m?.type==='ready'){row.readyAt=t;row.readySeaTime=m.snapshot?.status?.seaTime;row.readyCompute=m.snapshot?.status?.compute;row.readyCells=m.snapshot?.status?.cells;}if(m?.snapshot){row.publications++;row.latestSeaTime=m.snapshot.status?.seaTime;}}finally{costs.workerMessageCalls++;costs.workerHookMs+=performance.now()-t;}});
    }
    postMessage(...args) {
      const t=performance.now(),request=args[0],row=this.passiveAudit;
      try {
        if(request?.type==='start') {
          const start={at:t,config:clone(request.config),componentCount:field(request.config,'componentCount'),rider:field(request.options,'rider'),board:field(request.options,'board'),contact:field(request.options,'contact'),renderSpacing:field(request.options,'renderSpacing'),sea:field(request,'sea'),soloOneStep:field(request,'soloOneStep'),cases:[]};row.starts.push(start);
          if(matching(request.config)&&request.options?.rider===false) {
            assert(!activeWorker,'One matching Lab worker start only');activeWorker=this;assert(request.options?.barrelCases?.length===4,'Four original Lab barrelCases inputs required');
            for(const [i,bytes] of request.options.barrelCases.entries())start.cases.push(own('start/case-'+i,bytes));api.workerStarts.push(start);
          }
        } else if(request?.type==='advance') {
          row.advances++;const i=request.input;row.lastSteps=request.steps;
          const neutral=request.steps===1&&i&&i.paddle===false&&i.popUp===false&&i.steer===0&&i.retry===false&&request.reactions===undefined
            &&['hand','reel','trim','crouch','compress','duckDive','rotate','place','spawnAt','pocketReflex'].every(k=>i[k]===undefined);
          if(!neutral){row.badAdvances++;row.firstBad??={at:t,steps:request.steps};}
        } else if(request?.type&&!['look','sprayEnabled','particles'].includes(request.type))row.interventions.push({at:t,type:request.type});
      } catch(e) {stop(e);} finally {costs.workerMessageCalls++;costs.workerHookMs+=performance.now()-t;}
      return Reflect.apply(NativeWorker.prototype.postMessage,this,args);
    }
  };
  window.Worker=PassiveWorker;
  const camera=c=>({position:c.position.toArray(),quaternion:c.quaternion.toArray(),near:c.near,far:c.far,fov:c.fov,aspect:c.aspect,matrixWorld:matrix(c.matrixWorld),matrixWorldInverse:matrix(c.matrixWorldInverse),projectionMatrix:matrix(c.projectionMatrix)});
  const drawRange=g=>({start:g.drawRange.start,count:Number.isFinite(g.drawRange.count)?g.drawRange.count:'Infinity',indexCount:g.index?.count??0});
  const material=m=>({type:m?.type,side:m?.side,depthTest:m?.depthTest,depthWrite:m?.depthWrite,depthFunc:m?.depthFunc,stencilWrite:m?.stencilWrite,stencilWriteMask:m?.stencilWriteMask,stencilFunc:m?.stencilFunc,stencilRef:m?.stencilRef,stencilFuncMask:m?.stencilFuncMask,stencilFail:m?.stencilFail,stencilZFail:m?.stencilZFail,stencilZPass:m?.stencilZPass,transparent:m?.transparent,opacity:m?.opacity});
  function geometryMetadata(mesh) {if(!mesh)return null;const g=mesh.geometry;return {visible:mesh.visible,renderOrder:mesh.renderOrder,matrixWorld:matrix(mesh.matrixWorld),drawRange:drawRange(g),attributes:Object.fromEntries(Object.entries(g.attributes).map(([n,a])=>[n,{count:a.count,itemSize:a.itemSize,version:a.version,interleaved:!!a.isInterleavedBufferAttribute}])),material:material(mesh.material)};}
  function labState(d) {const l=window.breaklineLab;return l?{active:l.active,following:l.following,paused:l.clock.paused,scale:l.clock.scale,pending:l.clock.pending,view:d.mode.camera.view,flyPosition:l.fly.position.toArray(),flyYaw:l.fly.yaw,flyPitch:l.fly.pitch}:null;}
  function isLab(d) {return document.querySelector('#app')?.dataset.screen==='wavelab'&&d?.mode?.ready&&window.breaklineLab?.active;}
  function validate(d,c) {
    const host=d.mode.host,status=host.snapshot.status,l=labState(d),w=host.port;
    assert(matching(d.mode.config)&&matching(host.config),'Actual page/host config differs from fixed C24 seed1 legacy-grid case');
    assert(!Object.prototype.hasOwnProperty.call(d.mode.config,'componentCount')&&!Object.prototype.hasOwnProperty.call(host.config,'componentCount'),'Ordinary standard sea must omit componentCount');
    const far=d.mode.farField;assert(far?.profile?.count===24&&far?.uniforms?.farCount?.value===24,'Observed original main-thread far-field profile/shader component counts differ from24');
    assert(w===activeWorker&&w.passiveAudit.starts.length===1,'Actual original Lab worker/start differs');
    assert(status.compute==='gpu'&&status.cells===203200&&host.init.dx===1,'Actual GPU203200/dx1 witness differs');
    assert(host.maxBatchSteps===1&&host.maxQueuedSteps===6,'Original worker batch/queue differs');
    assert(w.passiveAudit.badAdvances===0&&w.passiveAudit.interventions.length===0,'Non-neutral advance or worker intervention');
    const s=w.passiveAudit.starts[0];assert(s.componentCount.undefined&&!s.componentCount.own&&s.rider.value===false&&s.board.undefined&&s.contact.undefined&&s.renderSpacing.undefined&&s.sea.undefined&&s.soloOneStep.undefined&&!s.soloOneStep.own,'Original riderless start scope differs');
    assert(l&&!l.paused&&l.scale===1&&l.pending===0&&l.view==='free','Original unpaused1x free Lab clock differs');
    if(api.followClick===null)assert(l.following===false,'Overview phase already follows');
    assert(c===d.mode.camera.camera,'Original physical camera object differs');
    assert(d.water.grid.spacing===2&&d.water.barrelMaskGrid.spacing===1&&d.water.drawnLook==='rich','Actual water/mask spacing/look differs');
    assert(d.water.source?.revision===status&&d.water.written?.revision===status&&d.water.written.time===status.seaTime,'Original drawn water publication/time differs');
    if(d.mode.barrelLoft)assert(d.mode.sweptBarrel?.drawn?.revision===status&&d.mode.sweptBarrel.drawn.surfaceRevision===d.water.surfaceRevision,'Original drawn loft publication differs');
    return {host,status,l,w};
  }
  function framebuffer(gl,r) {
    const get=name=>name===undefined?null:gl.getParameter(name);
    return {logicalDefaultTarget:r.getRenderTarget()===null,defaultDrawFramebuffer:get(gl.DRAW_FRAMEBUFFER_BINDING??gl.FRAMEBUFFER_BINDING)===null,viewport:Array.from(get(gl.VIEWPORT)),contextCanvasMatches:gl.canvas===r.domElement,contextAttributes:gl.getContextAttributes(),depthTest:gl.isEnabled(gl.DEPTH_TEST),depthWrite:get(gl.DEPTH_WRITEMASK),depthFunc:get(gl.DEPTH_FUNC),stencilTest:gl.isEnabled(gl.STENCIL_TEST),stencilBits:get(gl.STENCIL_BITS),stencil:{front:{func:get(gl.STENCIL_FUNC),ref:get(gl.STENCIL_REF),valueMask:get(gl.STENCIL_VALUE_MASK),writeMask:get(gl.STENCIL_WRITEMASK),fail:get(gl.STENCIL_FAIL),depthFail:get(gl.STENCIL_PASS_DEPTH_FAIL),depthPass:get(gl.STENCIL_PASS_DEPTH_PASS)},back:{func:get(gl.STENCIL_BACK_FUNC),ref:get(gl.STENCIL_BACK_REF),valueMask:get(gl.STENCIL_BACK_VALUE_MASK),writeMask:get(gl.STENCIL_BACK_WRITEMASK),fail:get(gl.STENCIL_BACK_FAIL),depthFail:get(gl.STENCIL_BACK_PASS_DEPTH_FAIL),depthPass:get(gl.STENCIL_BACK_PASS_DEPTH_PASS)}},scope:'Original before/after main-render GL state only; no depth/stencil pixels or fragment ownership'};
  }
  function originalPNG(canvas,label) {
    const t=performance.now(),url=canvas.toDataURL('image/png');costs.pngEncodingMs+=performance.now()-t;
    assert(url.startsWith('data:image/png;base64,'),'Original PNG encoding unavailable');const encoded=url.slice(22);const decodeStart=performance.now(),binary=atob(encoded);assert(binary.length<=PNG,'32MiB original PNG file cap exceeded');
    const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);costs.pngDecodeMs+=performance.now()-decodeStart;
    const transient={pngDataUrlUtf16UpperBytes:url.length*2,base64SliceUtf16UpperBytes:encoded.length*2,decodedStringUpperBytes:binary.length*2,pngBufferBytes:bytes.length,accounting:'Accessible JS allocations/upper string storage counts; internal browser encoding buffers unavailable'};
    costs.accessibleJsTransientPeakBytes=Math.max(costs.accessibleJsTransientPeakBytes,Object.values(transient).filter(v=>typeof v==='number').reduce((a,b)=>a+b,0));
    kept.set(label,bytes);pngBytes+=bytes.length;costs.pngCopies++;costs.pngBytes+=bytes.length;const r={label,kind:'png',bytes:bytes.length};api.fields.push(r);return {field:r,width:canvas.width,height:canvas.height,origin:'Original canvas.toDataURL PNG at synchronous original main-render return',transient};
  }
  function capture(d,s,c,before,after) {
    const t=performance.now(),index=api.frames.length,wall=t,coherent=validate(d,c),{host,status,l,w}=coherent,water=d.water,loft=d.mode.barrelLoft,mesh=d.mode.barrelMesh?.mesh;
    assert(index<9,'Nine-state cap');assert(wall-api.originWall-TARGETS[index]*1000<=2000,'Fixed target missed immediate draw/lateness2s bound');
    const canvas=renderer.domElement;for(const f of [before,after])assert(f.logicalDefaultTarget&&f.defaultDrawFramebuffer&&f.contextCanvasMatches&&f.viewport[0]===0&&f.viewport[1]===0&&f.viewport[2]===canvas.width&&f.viewport[3]===canvas.height,'Original default full-canvas render witness differs');
    const g=mesh?.geometry,count=g?Math.min(g.index?.count??0,g.drawRange.count):0,nv=count>0?(loft?.vertexCount??0):0;
    if(g){assert(g.drawRange.start===0,'Active mesh interval start differs');assert(count===(loft?.indexCount??0),'Actual mesh/loft index count differs');assert(count%3===0,'Actual index prefix not triangles');if(count===0)assert(!mesh.visible,'Empty mesh must be hidden');}
    const prefix='state-'+index+'/',fields=[],aliases=[],seen=[];
    function keep(name,a) {assert(ArrayBuffer.isView(a)&&!(a instanceof DataView),'Missing '+name);const old=seen.find(r=>r.buffer===a.buffer&&r.offset===a.byteOffset&&r.length===a.byteLength);if(old){aliases.push({name,field:old.field.label});return old.field;}const r=own(prefix+name,a);seen.push({buffer:a.buffer,offset:a.byteOffset,length:a.byteLength,field:r});fields.push(r);return r;}
    const row={index,targetSeconds:TARGETS[index],wall,relativeWallSeconds:(wall-api.originWall)/1000,latenessMs:wall-api.originWall-TARGETS[index]*1000,phase:index<=4?'original-overview':'after-single-real-Follow-click',status:clone(status),config:clone(d.mode.config),lab:l,worker:{serial:w.passiveAudit.serial,publications:w.passiveAudit.publications,advances:w.passiveAudit.advances,lastSteps:w.passiveAudit.lastSteps,readyAt:w.passiveAudit.readyAt,readySeaTime:w.passiveAudit.readySeaTime},outstandingSteps:host.outstandingSteps,hostInit:{grid:clone(host.init.grid),focus:clone(host.init.focus),windowXMin:host.init.windowXMin,dx:host.init.dx},camera:camera(c),completedRenderSerial:serial,frontCount:host.snapshot.frontCount,loft:loft?Object.fromEntries(Object.entries(loft).filter(([,v])=>!ArrayBuffer.isView(v))):null,actualActiveVertices:nv,indexCount:count,barrelActuallyDrawn:!!(barrelMark?.serial===serial&&barrelMark.status===status&&barrelMark.scene===s&&barrelMark.camera===c),waterActuallyDrawn:!!(waterMark?.serial===serial&&waterMark.status===status&&waterMark.scene===s&&waterMark.camera===c),barrelMesh:geometryMetadata(mesh),water:{grid:clone(water.grid),maskGrid:clone(water.barrelMaskGrid),surfaceRevision:water.surfaceRevision,flowFrames:water.flowFrames,flowDataRevision:water.flowDataRevision,written:{time:water.written.time,look:water.written.look,bedRevision:water.written.bedRevision},coarse:geometryMetadata(water.mesh),patch:geometryMetadata(water.patch),fallback:geometryMetadata(water.barrelFallback),patchFallback:geometryMetadata(water.barrelPatchFallback)},framebuffer:{before,after},fields,aliases,meshAttributes:[],waterUniforms:{},scope:'Every active published front and loft, actual indexed mesh prefixes and original pixels; no source-phase/visibility selection or later export substitution'};
    assert(Number.isInteger(host.snapshot.frontCount)&&host.snapshot.frontCount>=0&&host.snapshot.frontCount*9<=host.snapshot.front.length,'Active front prefix bounds');
    row.componentEvidence={observedFarFieldProfileCount:d.mode.farField.profile.count,observedFarFieldShaderCount:d.mode.farField.uniforms.farCount.value,workerPublishedEffectiveCount:null,sourceDerivedWorkerCount:24,workerStartComponentCount:clone(w.passiveAudit.starts[0].componentCount),qualification:'Worker status/init publish no effective spectrum count. Worker24 is source-derived from frozen SEA_COMPONENTS24 + surfZoneSea(config) + absent start override. Observed counts are the separately constructed original main-thread far-field spectrum/shader, not a direct worker spectrum observation.'};
    keep('front',host.snapshot.front.subarray(0,host.snapshot.frontCount*9));for(const name of ['surface','flow','aeration'])keep('published-'+name,host.snapshot[name]);keep('host-bed',host.init.bed);
    for(const name of ['surfaceData','flowData','aerationData','bedData'])keep('drawn-'+name,water[name]);
    if(loft)for(const [name,a] of Object.entries(loft))if(ArrayBuffer.isView(a)) {let n;if(name.startsWith('slice'))n=loft.sliceCount;else if(name==='indices')n=loft.indexCount;else if(name==='positions'||name==='normals')n=loft.vertexCount*3;else if(name==='throat')n=loft.vertexCount*4;else n=loft.vertexCount;assert(Number.isInteger(n)&&n>=0&&n<=a.length,'Loft prefix '+name);keep('loft-'+name,a.subarray(0,n));}
    if(g){if(g.index)keep('mesh-indices',g.index.array.subarray(0,count));for(const [name,a] of Object.entries(g.attributes)){const interleaved=!!a.isInterleavedBufferAttribute,source=interleaved?a.data.array:a.array,stride=interleaved?a.data.stride:a.itemSize;assert(nv*stride<=source.length,'Active attribute prefix '+name);row.meshAttributes.push({name,itemSize:a.itemSize,normalized:a.normalized,interleaved,stride,offset:interleaved?a.offset:0,field:keep('mesh-'+name,source.subarray(0,nv*stride))});}}
    row.waterGeometry=[];
    for(const [kind,waterMesh] of [['coarse',water.mesh],['patch',water.patch],['fallback',water.barrelFallback],['patchFallback',water.barrelPatchFallback]]) {
      if(!waterMesh)continue;const wg=waterMesh.geometry,dr=wg.drawRange,start=dr.start,available=wg.index?.count??wg.getAttribute('position').count,end=Math.min(available,Number.isFinite(dr.count)?start+dr.count:available);
      assert(Number.isInteger(start)&&start>=0&&Number.isInteger(end)&&end>=start,'Original water geometry draw interval '+kind);
      let vertices=end;if(wg.index){vertices=0;for(let i=start;i<end;i++)vertices=Math.max(vertices,wg.index.array[i]+1);}
      const geometry={kind,metadata:geometryMetadata(waterMesh),activeVertexPrefix:vertices,activeIndexEnd:end,attributes:[]};
      if(wg.index)geometry.index=keep('water-'+kind+'-indices',wg.index.array.subarray(0,end));
      for(const [name,a] of Object.entries(wg.attributes)){const interleaved=!!a.isInterleavedBufferAttribute,source=interleaved?a.data.array:a.array,stride=interleaved?a.data.stride:a.itemSize;assert(vertices*stride<=source.length,'Original water attribute prefix '+kind+'/'+name);geometry.attributes.push({name,itemSize:a.itemSize,normalized:a.normalized,interleaved,stride,offset:interleaved?a.offset:0,field:keep('water-'+kind+'-'+name,source.subarray(0,vertices*stride))});}
      row.waterGeometry.push(geometry);
    }
    for(const [name,u] of Object.entries(water.uniforms)){const v=u?.value;if(typeof v==='number'||typeof v==='boolean'||typeof v==='string'||v===null)row.waterUniforms[name]=v;else if(v?.isVector2||v?.isVector3||v?.isVector4||v?.isColor||v?.isMatrix3||v?.isMatrix4)row.waterUniforms[name]=v.toArray();else if(ArrayBuffer.isView(v))row.waterUniforms[name]={field:keep('uniform-'+name,v)};else if(ArrayBuffer.isView(v?.image?.data))row.waterUniforms[name]={width:v.image.width,height:v.image.height,format:v.format,type:v.type,magFilter:v.magFilter,minFilter:v.minFilter,wrapS:v.wrapS,wrapT:v.wrapT,field:keep('texture-'+name,v.image.data)};}
    row.pixels=originalPNG(canvas,prefix+'original.png');row.observerCopyMs=performance.now()-t;row.ownedTypedBytesAfter=copied;row.ownedPNGBytesAfter=pngBytes;api.frames.push(row);
    if(index===4)followResolve({target20Captured:true,relativeWallSeconds:row.relativeWallSeconds});
  }
  function summary() {return {state:api.state,frames:api.frames.length,originWall:api.originWall,followClick:api.followClick,typedBytes:copied,pngBytes,failure:api.failure};}
  function maybeFinish() {if(api.frames.length===9&&api.followClick&&performance.now()-api.followClick.wall>=20000){api.state='complete';api.endedWall=performance.now();api.observerAtEnd=clone(costs);doneResolve(summary());}}
  function returned(d,s,c,before,after) {
    if(!isLab(d)||api.state==='complete'||api.state==='incomplete')return;
    if(api.originWall===null){validate(d,c);api.originWall=performance.now();api.state='observing';api.observerAtHandover=clone(costs);api.handover={firstVisibleCompletedLabDrawWall:api.originWall,workerReadyWall:activeWorker.passiveAudit.readyAt,readySeaTime:activeWorker.passiveAudit.readySeaTime,firstDrawSeaTime:d.mode.host.snapshot.status.seaTime,clock:labState(d),definition:'First original completed visible Lab draw after actual original worker ready; any ready-to-visible gap is reported'};}
    if(api.frames.length<9&&performance.now()>=api.originWall+TARGETS[api.frames.length]*1000)capture(d,s,c,before,after);
    maybeFinish();
  }
  function hookMesh(mesh,d,kind) {
    if(!mesh||callbacks.some(r=>r.mesh===mesh))return;const original=mesh.onAfterRender,descriptor=Object.getOwnPropertyDescriptor(mesh,'onAfterRender');
    const wrapper=function(r,s,c,g){const result=Reflect.apply(original,this,arguments);const t=performance.now();const mark={scene:s,camera:c,geometry:g,status:d.mode.host?.snapshot.status,serial};if(kind==='water')waterMark=mark;else barrelMark=mark;
      if(!renderer){renderer=r;scene=s;originalRender=r.render;renderWrapper=function(s2,c2){const start=performance.now(),main=s2===scene&&c2===d.mode.camera.camera;if(main)serial++;const eligible=main&&isLab(d)&&!['complete','incomplete'].includes(api.state)&&(api.originWall===null||(api.frames.length<9&&start>=api.originWall+TARGETS[api.frames.length]*1000));let before,gl;try{if(eligible){gl=r.getContext();before=framebuffer(gl,r);}}catch(e){stop(e);}costs.hookCalls++;costs.hookMs+=performance.now()-start;const result=Reflect.apply(originalRender,this,arguments);const afterStart=performance.now();try{if(eligible&&api.state!=='incomplete')returned(d,s2,c2,before,framebuffer(gl,r));else if(main&&api.state==='observing')maybeFinish();}catch(e){stop(e);}costs.hookMs+=performance.now()-afterStart;return result;};r.render=renderWrapper;}
      costs.hookCalls++;costs.hookMs+=performance.now()-t;return result;};mesh.onAfterRender=wrapper;callbacks.push({mesh,original,wrapper,descriptor});
  }
  const passiveRAF=function(cb){return Reflect.apply(originalRAF,window,[time=>{const t=performance.now();try{const d=window.breaklineDiagnostics;if(d){hookMesh(d.water?.mesh,d,'water');hookMesh(d.mode?.barrelMesh?.mesh,d,'barrel');}if(api.originWall!==null&&api.state==='observing'&&performance.now()-api.originWall>45000)stop('45s observation bound before completion');}catch(e){stop(e);}costs.hookCalls++;costs.hookMs+=performance.now()-t;return cb(time);}]);};
  window.requestAnimationFrame=passiveRAF;
  const clickListener=event=>{const b=event.target.closest?.('.lab-tool');if(!b||b.textContent.trim()!=='Follow'||!isLab(window.breaklineDiagnostics))return;if(api.frames.length<5||api.followClick){stop('Follow click outside single declared target20 transition');return;}api.followClick={wall:performance.now(),relativeWallSeconds:(performance.now()-api.originWall)/1000,trusted:event.isTrusted,buttonText:b.textContent.trim()};queueMicrotask(()=>{api.followClick.followingAfterOriginalHandler=window.breaklineLab.following;api.followClick.ariaPressedAfterOriginalHandler=b.getAttribute('aria-pressed');});};
  document.addEventListener('click',clickListener,true);
  api.waitFollow=()=>followDue;api.waitDone=()=>done;api.summary=summary;
  api.finish=()=>{assert(['complete','incomplete'].includes(api.state),'Observation still active');return {...summary(),handover:api.handover,endedWall:api.endedWall,frames:api.frames,fields:api.fields,workerStarts:api.workerStarts,workerAudit:activeWorker?clone(activeWorker.passiveAudit):null,observer:clone(costs),observerAtHandover:api.observerAtHandover,observerAtEnd:api.observerAtEnd,observerScope:'Whole-page totals plus observed interval endpoint counters; end wrapper bookkeeping may follow the endpoint. Measured JS/copy costs are not a complete GPU/native/browser overhead measurement.',scope:'Diagnostic original camera scene evidence only; unknown original video seed/pose/history/light; no FPS, quality, adoption or repair pass'};};
  api.chunk=(label,offset)=>{assert(['complete','incomplete'].includes(api.state),'No transport during observed original samples');const t=performance.now(),b=kept.get(label);assert(b&&Number.isInteger(offset)&&offset>=0&&offset<b.length,'Owned chunk bounds');const end=Math.min(b.length,offset+262144),parts=[];for(let k=offset;k<end;k+=16384)parts.push(String.fromCharCode(...b.subarray(k,Math.min(end,k+16384))));const encoded=btoa(parts.join(''));costs.transportCalls++;costs.transportBase64Bytes+=encoded.length;costs.transportMs+=performance.now()-t;return encoded;};
  api.abort=stop;api.restore=()=>{if(restored)return api.teardown;for(const {mesh,original,wrapper,descriptor}of callbacks){assert(mesh.onAfterRender===wrapper,'Callback owner changed before teardown');if(descriptor)Object.defineProperty(mesh,'onAfterRender',descriptor);else delete mesh.onAfterRender;assert(mesh.onAfterRender===original,'Original callback not restored');}if(renderer){assert(renderer.render===renderWrapper,'Renderer wrapper ownership changed');renderer.render=originalRender;}assert(window.requestAnimationFrame===passiveRAF&&window.Worker===PassiveWorker,'Observer wrapper ownership changed');window.requestAnimationFrame=originalRAF;window.Worker=NativeWorker;document.removeEventListener('click',clickListener,true);restored=true;api.teardown={restored:true,callbacks:callbacks.length,at:performance.now()};return api.teardown;};
})();
