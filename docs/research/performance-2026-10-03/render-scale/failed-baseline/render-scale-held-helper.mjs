// QA-only helper installed after passive sampling and Escape→pause. No runtime API added.
export async function installHeldRasterProbe() {
  const d=window.breaklineDiagnostics,mode=d.mode,host=mode.host,water=d.water;
  if(window.__perf.sampling||document.querySelector('#app')?.dataset.screen!=='pause')throw Error('Held probe must be outside sampling and paused');
  const begun=performance.now();while(host.outstandingSteps){if(performance.now()-begun>15000)throw Error('Pause did not settle');await new Promise(r=>setTimeout(r,5));}
  const nativeRaf=window.requestAnimationFrame;const stopped=[];
  window.requestAnimationFrame=callback=>{stopped.push(callback);return 0;};
  await new Promise(r=>setTimeout(r,50));
  if(host.outstandingSteps)throw Error('Unexpected advance after RAF stop');
  mode.update(0);
  const ownCamera=mode.camera.camera,ownProjectionBefore=ownCamera.projectionMatrix.toArray();
  if(ownCamera.aspect!==innerWidth/Math.max(1,innerHeight))throw Error('Physical own camera CSS aspect differs');
  // applyGraphics.resize repeats this CSS-aspect operation; prove the current projection is already its exact result.
  mode.camera.resize(innerWidth/Math.max(1,innerHeight));
  if(JSON.stringify(ownProjectionBefore)!==JSON.stringify(ownCamera.projectionMatrix.toArray()))throw Error('Own camera resize would change projection');
  const camera=ownCamera.clone();camera.updateMatrixWorld(true);
  const sea=host.snapshot.status.seaTime;
  let renderer,scene;const old=water.mesh.onBeforeRender;
  water.mesh.onBeforeRender=function(...args){if(args[0].domElement===d.canvas){renderer=args[0];scene=args[1];}return Reflect.apply(old,this,args);};
  try{d.renderView(camera);}finally{water.mesh.onBeforeRender=old;}
  if(!renderer||!scene)throw Error('Actual game renderer was not observed');
  const style=document.createElement('style');style.textContent='#ui,#touch-controls,#loading{visibility:hidden!important}';document.head.append(style);
  let drawFlags={spray:false,bubbles:false};
  function renderOnce(){const restore=[];for(const [name,mesh]of [['spray',mode.spray.mesh],['bubbles',mode.bubbles.mesh]]){
    const callback=mesh.onBeforeRender;restore.push(()=>{mesh.onBeforeRender=callback;});mesh.onBeforeRender=function(...args){if(args[0]===renderer)drawFlags[name]=true;return Reflect.apply(callback,this,args);};
  }try{d.renderView(camera);}finally{for(const restoreCallback of restore)restoreCallback();}}
  renderOnce();renderOnce();
  const sha=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
  const encode=bytes=>{let string='';for(let i=0;i<bytes.length;i+=32768)string+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(string);};
  const pack=async(array,data=false)=>{const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);return{type:array.constructor.name,length:array.length,byteLength:bytes.byteLength,sha256:await sha(bytes),...(data?{base64:encode(bytes)}:{})};};
  const plain=value=>JSON.parse(JSON.stringify(value));
  function sceneState(){
    const objects=[],geometries=new Map(),attributes=new Map(),arrayFields={};
    function attribute(key,attr){const data=attr.isInterleavedBufferAttribute?attr.data:attr;attributes.set(key,attr);arrayFields[key]=data.array;
      return{version:data.version,itemSize:attr.itemSize,count:attr.count,normalized:attr.normalized,usage:data.usage,gpuType:attr.gpuType,offset:attr.offset,stride:data.stride};}
    scene.traverse(object=>{
      const row={id:object.uuid,type:object.type,parent:object.parent?.uuid,visible:object.visible,layers:object.layers.mask,renderOrder:object.renderOrder,frustumCulled:object.frustumCulled,
        position:object.position.toArray(),quaternion:object.quaternion.toArray(),scale:object.scale.toArray(),matrix:object.matrix.toArray(),matrixWorld:object.matrixWorld.toArray(),geometry:object.geometry?.uuid};
      objects.push({object,row});if(object.skeleton){const key='scene.skeleton.'+object.skeleton.uuid;arrayFields[key+'.boneMatrices']=object.skeleton.boneMatrices;row.skeleton={id:object.skeleton.uuid,bones:object.skeleton.bones.map(b=>b.uuid)};}
      const geometry=object.geometry;if(geometry&&!geometries.has(geometry.uuid)){
        const key='scene.geometry.'+geometry.uuid;const attrs={};for(const [name,attr]of Object.entries(geometry.attributes))attrs[name]=attribute(key+'.'+name,attr);
        const morph={};for(const [name,list]of Object.entries(geometry.morphAttributes))morph[name]=list.map((attr,index)=>attribute(key+'.morph.'+name+'.'+index,attr));
        const index=geometry.index?attribute(key+'.index',geometry.index):null;
        geometries.set(geometry.uuid,{geometry,row:{id:geometry.uuid,attributes:attrs,morphAttributes:morph,morphTargetsRelative:geometry.morphTargetsRelative,index,
          drawRange:{start:geometry.drawRange.start,count:Number.isFinite(geometry.drawRange.count)?geometry.drawRange.count:String(geometry.drawRange.count)},groups:geometry.groups}});
      }
    });return{objects,geometries,attributes,arrayFields,scalars:{objects:objects.map(o=>o.row),geometries:[...geometries.values()].map(g=>g.row)}};
  }
  const originalScene=sceneState();
  const arrays=()=>{
    const out={};for(const [name,array]of Object.entries(host.snapshot))if(ArrayBuffer.isView(array))out['snapshot.'+name]=array;
    for(const [name,array]of Object.entries(host.init))if(ArrayBuffer.isView(array))out['init.'+name]=array;
    for(const name of ['surfaceData','bedData','flowData','aerationData','barrelMaskData','tubeTable','tubeTexels','tubeColumnData']){
      if(!ArrayBuffer.isView(water[name]))throw Error('Missing water array '+name);out['water.'+name]=water[name];
    }
    const loft=mode.barrelLoft;if(!loft)throw Error('Missing actual loft result');
    for(const [name,array]of Object.entries(loft))if(ArrayBuffer.isView(array))out['loft.'+name]=array;
    Object.assign(out,sceneState().arrayFields);return out;
  };
  const originalArrays=arrays();
  const scalarState=()=>({config:plain(mode.config),init:plain(Object.fromEntries(Object.entries(host.init).filter(([,v])=>!ArrayBuffer.isView(v)))),
    status:plain(host.snapshot.status),snapshotScalars:plain(Object.fromEntries(Object.entries(host.snapshot).filter(([,v])=>!ArrayBuffer.isView(v)))),
    waterGrid:plain(water.grid),maskGrid:plain(water.barrelMaskGrid),loft:plain(Object.fromEntries(Object.entries(mode.barrelLoft).filter(([,v])=>!ArrayBuffer.isView(v)))),
    scene:sceneState().scalars,
    camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.toArray(),world:camera.matrixWorld.toArray(),fov:camera.fov,aspect:camera.aspect},
    ownCamera:{position:ownCamera.position.toArray(),quaternion:ownCamera.quaternion.toArray(),projection:ownCamera.projectionMatrix.toArray(),fov:ownCamera.fov,aspect:ownCamera.aspect}});
  const beforeScalars=scalarState();const scalarHash=await sha(new TextEncoder().encode(JSON.stringify(beforeScalars)));
  const originalHashes=Object.fromEntries(await Promise.all(Object.entries(originalArrays).map(async([name,array])=>[name,(await pack(array)).sha256])));
  async function assertSource(){
    if(host.outstandingSteps||host.snapshot.status.seaTime!==sea)throw Error('Held physics clock advanced');
    if(await sha(new TextEncoder().encode(JSON.stringify(scalarState())))!==scalarHash)throw Error('Held config/status/geometry scalar state changed');
    const currentScene=sceneState();
    if(currentScene.objects.length!==originalScene.objects.length||currentScene.objects.some((o,i)=>o.object!==originalScene.objects[i].object))throw Error('Held scene object identities changed');
    for(const [id,g]of currentScene.geometries)if(g.geometry!==originalScene.geometries.get(id)?.geometry)throw Error('Held geometry identity changed:'+id);
    for(const [id,attr]of currentScene.attributes)if(attr!==originalScene.attributes.get(id))throw Error('Held attribute identity changed:'+id);
    const current=arrays();if(Object.keys(current).join('|')!==Object.keys(originalArrays).join('|'))throw Error('Held array fields changed');
    for(const [name,array]of Object.entries(current))if(array!==originalArrays[name]||(await pack(array)).sha256!==originalHashes[name])throw Error('Held array bytes/identity changed: '+name);
  }
  async function serialized(){
    const saved=await host.exportState();const stream=new Blob([saved.bytes]).stream();
    const bytes=new Uint8Array(await new Response(saved.deflated?stream.pipeThrough(new DecompressionStream('deflate')):stream).arrayBuffer());
    return{rawSha256:await sha(bytes),rawByteLength:bytes.length,deflated:saved.deflated,compressed:await pack(saved.bytes,true)};
  }
  const beforeExport=await serialized();
  async function shaders(){
    const gl=renderer.getContext(),materials=new Set();scene.traverse(object=>{for(const m of [].concat(object.material??[]))materials.add(m);});
    const rows=[];for(const material of materials){const props=renderer.properties.get(material),program=props.currentProgram;
      if(program?.vertexShader&&program?.fragmentShader)rows.push({type:material.type,defines:plain(material.defines??{}),sizeAttenuation:material.sizeAttenuation,
        vertexSha256:await sha(new TextEncoder().encode(gl.getShaderSource(program.vertexShader))),fragmentSha256:await sha(new TextEncoder().encode(gl.getShaderSource(program.fragmentShader)))});
    }if(!renderer.properties.get(water.mesh.material).currentProgram||rows.length===0)throw Error('Actual compiled water shader proof unavailable');
    return rows.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  async function inspect(){
    function visible(mesh){for(let object=mesh;object;object=object.parent)if(!object.visible)return false;return mesh.material.visible&&camera.layers.test(mesh.layers);}
    const sprayMesh=mode.spray.mesh,bubbleMesh=mode.bubbles.mesh,spray=sprayMesh.material,bubble=bubbleMesh.material,bu=renderer.properties.get(bubble).uniforms;
    const activity={spray:{visible:visible(sprayMesh),count:sprayMesh.geometry.drawRange.count,drawn:drawFlags.spray},bubbles:{visible:visible(bubbleMesh),count:bubbleMesh.geometry.drawRange.count,drawn:drawFlags.bubbles}};
    const uniforms={sprayPixelsPerMetre:spray.uniforms?.pixelsPerMetre?.value,
      expectedSprayPixelsPerMetre:d.canvas.height/(2*Math.tan(camera.fov*Math.PI/360)),
      bubbleSize:bu?.size?.value,expectedBubbleSize:bubble.size*renderer.getPixelRatio(),bubbleScale:bu?.scale?.value,expectedBubbleScale:innerHeight/2};
    for(const [name,state]of Object.entries(activity))if(state.visible&&state.count>0&&!state.drawn)throw Error('Visible nonzero particles not actually drawn:'+name);
    if(activity.spray.drawn){if(!Number.isFinite(uniforms.sprayPixelsPerMetre))throw Error('Drawn spray lacks resolution uniform');if(Math.abs(uniforms.sprayPixelsPerMetre-uniforms.expectedSprayPixelsPerMetre)>1e-9)throw Error('Spray resolution uniform stale');}
    if(activity.bubbles.drawn){if(!Number.isFinite(uniforms.bubbleSize)||!Number.isFinite(uniforms.bubbleScale))throw Error('Drawn bubbles lack resolution uniforms');
      if(Math.abs(uniforms.bubbleSize-uniforms.expectedBubbleSize)>1e-12||Math.abs(uniforms.bubbleScale-uniforms.expectedBubbleScale)>1e-12)throw Error('Bubble resolution uniforms stale');}
    const detail=mode.surfer.detail,skinned=mode.surfer.skinned;
    if(!detail||detail.lodDistance!==Infinity||detail.textureCap!==2048)throw Error('Own surfer High detail fields unavailable or different');
    if(skinned&&skinned.lodDistance!==Infinity)throw Error('Loaded own surfer LOD differs');
    const wanted=renderer.getPixelRatio()===1.75?[2989,1620]:[2562,1389];
    if(innerWidth!==1708||innerHeight!==926||devicePixelRatio!==2||d.canvas.width!==wanted[0]||d.canvas.height!==wanted[1])throw Error('Held raster/native viewport differs');
    if(camera.aspect!==1708/926||ownCamera.aspect!==1708/926)throw Error('Held CSS-aspect camera differs');
    return{seaTime:sea,viewport:[innerWidth,innerHeight],browserDpr:devicePixelRatio,canvas:[d.canvas.width,d.canvas.height],pixelRatio:renderer.getPixelRatio(),
      activity,uniforms,shaderPrograms:await shaders(),shadow:{enabled:renderer.shadowMap.enabled,type:renderer.shadowMap.type,autoUpdate:renderer.shadowMap.autoUpdate},
      ownSurferDetail:{observation:'ordinary TypeScript private detail fields, source-guarded; public skinned getter',lodDistance:'Infinity',textureCap:detail.textureCap,skinned:!!skinned,skinnedLodDistance:skinned?'Infinity':null},waterLook:water.drawnLook,vertexNormals:water.vertexNormals,particleLevel:mode.particleLevel,
      renderInfo:plain(renderer.info.render),tubeNonempty:mode.barrelLoft.vertexCount>0,
      lights:scene.children.filter(o=>o.isLight).map(o=>({type:o.type,color:o.color.toArray(),intensity:o.intensity,position:o.position.toArray()})),
      waterSun:plain({direction:water.uniforms.waterSunDirection.value.toArray(),radiance:water.uniforms.waterSunRadiance.value.toArray(),time:water.uniforms.waterTime.value})};
  }
  async function draw(ratio){
    if(![1.75,1.5].includes(ratio))throw Error('Unsupported held raster ratio');renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight,false);
    drawFlags={spray:false,bubbles:false};renderOnce();renderOnce();await assertSource();return inspect();
  }
  async function capture(){return{scalars:beforeScalars,arrays:Object.fromEntries(await Promise.all(Object.entries(originalArrays).map(async([name,array])=>[name,await pack(array,true)]))),
    serialized:beforeExport,observed:await inspect(),limitations:['SET1 state export includes Float32 sea serialization; main snapshot/renderer arrays are separately hashed without conversion. All snapshot/loft and actual scene geometry attribute/index/skeleton array capacity bytes are retained with counts; geometry/attribute identities, versions, draw ranges and object/world transforms are guarded; no reconstruction used.','Held raster changes use actual renderer.setPixelRatio/setSize, matching the only differing resolved graphics value; shader/uniform equivalence is checked separately. GPU-only FFT/caustic/shadow texture bytes are not read back; repeat PNG differences remain evidence rather than being forced equal.']};}
  async function finish(){const after=await serialized();await assertSource();if(after.rawSha256!==beforeExport.rawSha256)throw Error('Serialized physics bytes changed');
    style.remove();window.requestAnimationFrame=nativeRaf;for(const callback of new Set(stopped))nativeRaf(callback);
    return{serializedBefore:beforeExport.rawSha256,serializedAfter:after.rawSha256,serializedByteParity:true,allArrayBytesAndIdentitiesUnchanged:true,actualSceneGeometryBytesIdentitiesVersionsDrawRangesAndTransformsUnchanged:true,cssCameraProjectionResizeEquivalent:true,seaTime:sea};}
  window.__heldRaster={draw,capture,finish,inspect};
}
