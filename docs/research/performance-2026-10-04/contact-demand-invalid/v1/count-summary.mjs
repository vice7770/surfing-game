/** Pure offline count summarizer. No solver, browser, timing, or geometry modifications. */
export const nonfinite = value => value && typeof value === 'object' && 'number' in value;
export function summarize(capture) {
 const failures=[];const epochs=capture.epochs??[];const status=capture.status??{};
 if(!status.complete||epochs.length!==15)failures.push('Capture needs exactly15 completed original afterWater epochs');
 if(status.ordinaryArraysIdentical!==true)failures.push('Original arrays/contact/water identities changed');
 if(status.fault&&!status.fault.undefined)failures.push('Observer fault:'+JSON.stringify(status.fault));
 const S=134; // P128 + three extension points on each end, pinned in source manifest.
 const rows=epochs.map((e,k)=>{
  if(e.ordinal!==k+1||e.afterWaterEnded!==true)failures.push('Epoch order/completion differs:'+k);
  if(k&&Math.abs(e.seaTime-epochs[k-1].seaTime-1/60)>1e-7)failures.push('Nonconsecutive original fixed step:'+k);
  const candidateHeight=new Set(e.candidates.flatMap(s=>[s,s+1]));
  if(JSON.stringify([...candidateHeight].sort((a,b)=>a-b))!==JSON.stringify(e.heightRows))failures.push('Candidate height-row union differs:'+k);
  const normalVertices=new Set(e.queries.flatMap(q=>q.normalVertices));
  if(JSON.stringify([...normalVertices].sort((a,b)=>a-b))!==JSON.stringify(e.hitNormalVertices))failures.push('Successful triangle normal union differs:'+k);
  const normalRows=e.runs.reduce((n,[a,b])=>n+b-a+1,0);
  if(normalRows!==e.normalRows)failures.push('Run-clamped eager normal row count differs:'+k);
  const hits=e.queries.filter(q=>q.method==='query'&&q.result===true),misses=e.queries.filter(q=>q.method==='query'&&q.result===false),floors=e.queries.filter(q=>q.method==='floorAt');
  if(floors.some(q=>q.normalVertices.length))failures.push('Floor query demanded normals:'+k);
  if(e.queries.some(q=>q.candidates.some(c=>!e.candidates.includes(c.strip))))failures.push('Ordered candidate absent from epoch union:'+k);
  return {ordinal:e.ordinal,seaTime:e.seaTime,slices:e.slices,vertices:e.vertices,joinedStrips:e.joinedStrips,eagerNormalRows:e.normalRows,eagerNormalVertices:e.normalRows*S,queryCalls:e.queries.length,hits:hits.length,queryMisses:misses.length,floorCalls:floors.length,crossingCandidateCalls:e.queries.reduce((n,q)=>n+q.candidates.length,0),crossingMissCandidates:e.queries.reduce((n,q)=>n+q.candidates.filter(c=>c.crossings===0).length,0),distinctCrossingStrips:e.candidates.length,distinctHeldXzCandidateStrips:e.heldXz.length,exclusiveHeldXzNeverCrossedStrips:e.heldXz.filter(s=>!e.candidates.includes(s)).length,heldAndCrossingStripIntersection:e.heldXz.filter(s=>e.candidates.includes(s)).length,crossingHeightAndNormalHaloRowIntersection:e.heightRows.filter(s=>e.haloRows.includes(s)).length,unionCrossingHeightAndNormalHaloRows:new Set([...e.heightRows,...e.haloRows]).size,distinctCrossingHeightRows:e.heightRows.length,distinctHitNormalRows:e.hitNormalRows.length,distinctHitNormalVertices:normalVertices.size,distinctNormalPositionHaloRows:e.haloRows.length,heightRowsOverSlices:e.slices?e.heightRows.length/e.slices:null,normalRowsOverEagerRows:e.normalRows?e.hitNormalRows.length/e.normalRows:null,normalVerticesOverEagerVertices:e.normalRows?normalVertices.size/(e.normalRows*S):null,normalHaloRowsOverSlices:e.slices?e.haloRows.length/e.slices:null,heightCallStages:e.heightCalls,instrumentedBuildMs:e.buildMs,instrumentedEagerNormalsMs:e.normalMs,byPhase:Object.fromEntries(Object.entries(e.byPhase).map(([phase,c])=>[phase,{calls:c.calls,distinctCrossingStrips:c.candidates.length,distinctHeldXzCandidateStrips:c.heldXz.length,exclusiveHeldXzNeverCrossedStrips:c.heldXz.filter(s=>!c.candidates.includes(s)).length,distinctCrossingHeightRows:c.heightRows.length,distinctNormalVertices:c.normalVertices.length,distinctNormalPositionHaloRows:c.haloRows.length}]))};
 });
 if(epochs.length&&(!(epochs[0].seaTime-status.spinUpEnd>=90-1e-7)||epochs[0].seaTime-status.spinUpEnd>90+1/60+1e-6))failures.push('First original contact epoch missed predeclared90simsec gate');
 return {valid:failures.length===0,failures,kind:'Original eager demand counts; component clocks include observer/timer overhead; no FPS or removable-cost verdict',spinUpEnd:status.spinUpEnd,firstSeaTime:epochs[0]?.seaTime,lastSeaTime:epochs.at(-1)?.seaTime,epochs:rows};
}
