// Serialized into the page. Read-only query over ACTUAL active indexed drawing geometry.
// Uses detached public render points AND actual part spheres; never uses the guide containment boolean.
export function createBodyMeshClassifier() {
 const S=134,names=['pelvis','torso','head','leftHandTip','rightHandTip','leftFootTip','rightFootTip'];
 const must=(v,m)=>{if(!v)throw Error(m);};
 let previousIndices=new Uint32Array(0),previousVertexCount=-1,components=[],topologyGeneration=0;
 function topology(l){
  must(l.vertexCount<=200000&&l.indexCount<=1200000&&l.indexCount%3===0,'Finite geometry bounds');
  let same=previousVertexCount===l.vertexCount&&previousIndices.length===l.indexCount;
  if(same)for(let i=0;i<l.indexCount;i++)if(previousIndices[i]!==l.indices[i]){same=false;break;}
  if(same)return;
  previousVertexCount=l.vertexCount;previousIndices=l.indices.slice(0,l.indexCount);topologyGeneration++;
  const count=l.indexCount/3,parent=new Int32Array(count),rank=new Uint8Array(count),edges=new Map();
  for(let i=0;i<count;i++)parent[i]=i;
  const find=i=>{let root=i;while(parent[root]!==root)root=parent[root];while(parent[i]!==i){const next=parent[i];parent[i]=root;i=next;}return root;};
  const unite=(a,b)=>{a=find(a);b=find(b);if(a===b)return;if(rank[a]<rank[b])[a,b]=[b,a];parent[b]=a;if(rank[a]===rank[b])rank[a]++;};
  const stride=l.vertexCount+1;
  for(let t=0;t<count;t++){
   const a=l.indices[3*t],b=l.indices[3*t+1],c=l.indices[3*t+2];
   must(a<l.vertexCount&&b<l.vertexCount&&c<l.vertexCount,'Actual active index bound');
   for(const[u,v]of[[a,b],[b,c],[c,a]]){
    if(u===v)continue;const key=Math.min(u,v)*stride+Math.max(u,v),other=edges.get(key);
    if(other===undefined)edges.set(key,t);else unite(t,other);
   }
  }
  const groups=new Map();
  for(let t=0;t<count;t++){
   const root=find(t);let group=groups.get(root);
   if(!group)groups.set(root,group={id:3*t,triangles:[],rows:new Set()});
   group.triangles.push(3*t);
   for(let k=0;k<3;k++)group.rows.add(Math.floor(l.indices[3*t+k]/S));
  }
  must(groups.size<=1024,'Component count bound');
  components=[...groups.values()].map(g=>({...g,rows:[...g.rows].sort((a,b)=>a-b)}));
 }
 function geometry(l){
  topology(l);const p=l.positions;
  return components.map(g=>{
   let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
   for(const o of g.triangles)for(let k=0;k<3;k++){
    const v=3*l.indices[o+k];minX=Math.min(minX,p[v]);maxX=Math.max(maxX,p[v]);minZ=Math.min(minZ,p[v+2]);maxZ=Math.max(maxZ,p[v+2]);
   }
   const fronts=new Set(g.rows.map(row=>l.sliceFront[row]));
   return{...g,minX,maxX,minZ,maxZ,descriptor:{localId:g.id,front:fronts.size===1?[...fronts][0]:null,
    firstRow:g.rows[0],lastRow:g.rows.at(-1),sigmaMin:Math.min(...g.rows.map(row=>l.sliceSigma[row])),
    sigmaMax:Math.max(...g.rows.map(row=>l.sliceSigma[row]))}};
  });
 }
 function edge(p,u,v,x,z){const lo=Math.min(u,v),hi=Math.max(u,v),value=(p[3*hi]-p[3*lo])*(z-p[3*lo+2])-(p[3*hi+2]-p[3*lo+2])*(x-p[3*lo]);return u<v?value:-value;}
 const inside=(v,u,w,sign)=>v*sign>0||(v===0&&(sign>0)===(u<w));
 function crossing(l,g,x,z){
  if(x<g.minX||x>g.maxX||z<g.minZ||z>g.maxZ)return[];
  const p=l.positions,hits=[];
  for(const i of g.triangles){
   const a=l.indices[i],b=l.indices[i+1],c=l.indices[i+2];
   const area=edge(p,a,b,p[3*c],p[3*c+2]);if(area===0)continue;const sign=area>0?1:-1;
   const wa=edge(p,b,c,x,z);if(!inside(wa,b,c,sign))continue;
   const wb=edge(p,c,a,x,z);if(!inside(wb,c,a,sign))continue;
   const wc=edge(p,a,b,x,z);if(!inside(wc,a,b,sign))continue;
   const y=(wa*p[3*a+1]+wb*p[3*b+1]+wc*p[3*c+1])/area;must(Number.isFinite(y),'Finite actual triangle crossing');
   hits.push({y,indexOffset:i,indices:[a,b,c]});must(hits.length<=31,'Bounded component crossings');
  }
  return hits.sort((a,b)=>a.y-b.y||a.indexOffset-b.indexOffset);
 }
 // Closest point on a triangle, Ericson region tests; only scalar arithmetic, no production geometry mutation.
 function triangleDistanceSquared(p,a,b,c,x,y,z){
  const ax=p[3*a],ay=p[3*a+1],az=p[3*a+2],bx=p[3*b],by=p[3*b+1],bz=p[3*b+2],cx=p[3*c],cy=p[3*c+1],cz=p[3*c+2];
  const abx=bx-ax,aby=by-ay,abz=bz-az,acx=cx-ax,acy=cy-ay,acz=cz-az,apx=x-ax,apy=y-ay,apz=z-az;
  const dist=(qx,qy,qz)=>(x-qx)**2+(y-qy)**2+(z-qz)**2;
  const segment=(ux,uy,uz,vx,vy,vz)=>{const dx=vx-ux,dy=vy-uy,dz=vz-uz,len=dx*dx+dy*dy+dz*dz;
   const t=len>0?Math.max(0,Math.min(1,((x-ux)*dx+(y-uy)*dy+(z-uz)*dz)/len)):0;
   return dist(ux+t*dx,uy+t*dy,uz+t*dz);};
  const degenerate=()=>Math.min(segment(ax,ay,az,bx,by,bz),segment(bx,by,bz,cx,cy,cz),segment(cx,cy,cz,ax,ay,az));
  const nx=aby*acz-abz*acy,ny=abz*acx-abx*acz,nz=abx*acy-aby*acx;
  if(nx*nx+ny*ny+nz*nz===0)return degenerate();
  const d1=abx*apx+aby*apy+abz*apz,d2=acx*apx+acy*apy+acz*apz;
  if(d1<=0&&d2<=0)return dist(ax,ay,az);
  const bpx=x-bx,bpy=y-by,bpz=z-bz,d3=abx*bpx+aby*bpy+abz*bpz,d4=acx*bpx+acy*bpy+acz*bpz;
  if(d3>=0&&d4<=d3)return dist(bx,by,bz);
  const vc=d1*d4-d3*d2;
  if(vc<=0&&d1>=0&&d3<=0){const denominator=d1-d3;if(!(denominator>0))return degenerate();const v=d1/denominator;return dist(ax+v*abx,ay+v*aby,az+v*abz);}
  const cpx=x-cx,cpy=y-cy,cpz=z-cz,d5=abx*cpx+aby*cpy+abz*cpz,d6=acx*cpx+acy*cpy+acz*cpz;
  if(d6>=0&&d5<=d6)return dist(cx,cy,cz);
  const vb=d5*d2-d1*d6;
  if(vb<=0&&d2>=0&&d6<=0){const denominator=d2-d6;if(!(denominator>0))return degenerate();const w=d2/denominator;return dist(ax+w*acx,ay+w*acy,az+w*acz);}
  const va=d3*d6-d5*d4;
  if(va<=0&&d4-d3>=0&&d5-d6>=0){const denominator=(d4-d3)+(d5-d6);if(!(denominator>0))return degenerate();const w=(d4-d3)/denominator;return dist(bx+w*(cx-bx),by+w*(cy-by),bz+w*(cz-bz));}
  const sum=va+vb+vc;
  if(!(sum>0))return degenerate();
  const v=vb/sum,w=vc/sum;return dist(ax+v*abx+w*acx,ay+v*aby+w*acy,az+v*abz+w*acz);
 }
 function sphere(l,xyz,radius){
  const p=l.positions,[x,y,z]=xyz;let checked=0,nearest=null,min=Infinity;
  for(let i=0;i<l.indexCount;i+=3){
   const a=l.indices[i],b=l.indices[i+1],c=l.indices[i+2];
   if(x+radius<Math.min(p[3*a],p[3*b],p[3*c])||x-radius>Math.max(p[3*a],p[3*b],p[3*c])
    ||y+radius<Math.min(p[3*a+1],p[3*b+1],p[3*c+1])||y-radius>Math.max(p[3*a+1],p[3*b+1],p[3*c+1])
    ||z+radius<Math.min(p[3*a+2],p[3*b+2],p[3*c+2])||z-radius>Math.max(p[3*a+2],p[3*b+2],p[3*c+2]))continue;
   checked++;const d2=triangleDistanceSquared(p,a,b,c,x,y,z);must(Number.isFinite(d2)&&d2>=0,'Finite sphere triangle distance');
   if(d2<min){min=d2;nearest={indexOffset:i,indices:[a,b,c]};}
  }
  return{radius,clearOfAllActiveIndexedTriangles:min>radius*radius,intersectsOrTouches:min<=radius*radius,
   checkedNearTriangles:checked,minimumNearCandidateDistance:checked?Math.sqrt(min):null,
   lowerBoundIfNoNearCandidate:checked?null:radius,nearestTriangle:nearest};
 }

 function branch(vertices){
  const profiles=vertices.map(v=>v%S-3),lo=Math.min(...profiles),hi=Math.max(...profiles);
  return lo>=88&&hi<=112?'floor':lo>=68&&hi<=88?'inner-return':lo>=32&&hi<=68?'outer-roof':'other';
 }
 function mature(l,hit){
  return hit.indices.every(v=>{const row=Math.floor(v/S);return l.slicePhase[row]===1&&l.sliceWeight[row]===1;});
 }
 function cavity(l,hits,y){
  if(hits.length!==3||!hits.every((h,i)=>i===0||h.y>hits[i-1].y))return false;
  if(branch(hits[0].indices)!=='floor'||branch(hits[1].indices)!=='inner-return'||branch(hits[2].indices)!=='outer-roof')return false;
  return hits.every(h=>mature(l,h))&&y>hits[0].y&&y<hits[1].y;
 }
 // Conservative upper bound for SnapshotSampler.heightAt: bilinear raw nodes, then carveAt only lowers.
 // The square contains the sphere's entire horizontal footprint; y-radius is below its whole lower surface.
 function ordinaryWaterBound(ordinary,x,y,z,radius){
  const provenance='current-snapshot-bilinear-raw-node-max/host-carve-only-lowers';
  const fail=reason=>({provenance,available:false,clear:false,reason,wholeFootprintBound:false,
   shaderCubicSkinOrLimbProof:false});
  if(!ordinary||typeof ordinary.heightAt!=='function'||!ordinary.grid||!(ordinary.surface instanceof Float32Array))return fail('Current ordinary-water snapshot unavailable');
  const {grid,surface}=ordinary,{xMin,zMin,spacing,nx,nz}=grid;
  if(![xMin,zMin,spacing].every(Number.isFinite)||!(spacing>0)||!Number.isSafeInteger(nx)||!Number.isSafeInteger(nz)||nx<2||nz<2||surface.length<2*nx*nz)return fail('Invalid current ordinary-water grid');
  const footprint={xMin:x-radius,xMax:x+radius,zMin:z-radius,zMax:z+radius};
  const gx0=(footprint.xMin-xMin)/spacing,gx1=(footprint.xMax-xMin)/spacing,gz0=(footprint.zMin-zMin)/spacing,gz1=(footprint.zMax-zMin)/spacing;
  // sampleSurfaceHeight returns0 at/outside the upper domain boundary; never infer that default as known water.
  if(![gx0,gx1,gz0,gz1].every(Number.isFinite)||gx0<0||gz0<0||gx1>=nx-1||gz1>=nz-1)return fail('Radius footprint outside known bilinear grid');
  const firstX=Math.floor(gx0),lastX=Math.floor(gx1)+1,firstZ=Math.floor(gz0),lastZ=Math.floor(gz1)+1;
  const nodeCount=(lastX-firstX+1)*(lastZ-firstZ+1);
  if(!Number.isSafeInteger(nodeCount)||nodeCount>4096)return fail('Finite4096-node footprint budget');
  let maximum=-Infinity;
  for(let row=firstZ;row<=lastZ;row++)for(let column=firstX;column<=lastX;column++){
   const height=surface[2*(row*nx+column)];if(!Number.isFinite(height))return fail('Nonfinite raw node in radius footprint');maximum=Math.max(maximum,height);
  }
  const height=ordinary.heightAt(x,z);
  if(!Number.isFinite(height)||height>maximum)return fail('Actual host height is nonfinite or exceeds the raw-node upper bound');
  const bottom=y-radius,bottomGap=bottom-height,boundBottomGap=bottom-maximum;
  return{provenance,available:true,clear:boundBottomGap>0,height,bottom,bottomGap,wholeFootprintBound:true,
   rawNodeMaximum:maximum,boundBottomGap,footprint,nodeRange:{firstX,lastX,firstZ,lastZ,nodeCount},
   surfaceSeaTime:ordinary.seaTime,scope:'Whole radius footprint against the normal host bilinear/carved height field only.',shaderCubicSkinOrLimbProof:false};
 }
 function measure(l,body,waterAt,ordinary){
  must(l.vertexCount===S*l.sliceCount&&l.sliceCount<=300,'Actual134-vertex row contract required');
  must(body&&Number.isFinite(body.seaTime)&&body.renderPoints?.length===7&&body.partSpheres?.length===7,'Detached full14 body telemetry required');
  const source=[...body.renderPoints,...body.partSpheres],groups=geometry(l),points=[];
  for(let i=0;i<14;i++){
   const {x,y,z,radius}=source[i];must([x,y,z,radius].every(Number.isFinite)&&radius>=0,'Finite actual body witness');
   must(i<7?radius===0:radius>0,'Render point0 or actual positive part radius required');
   const candidates=[];
   for(const g of groups){
    const hits=crossing(l,g,x,z);if(!hits.length)continue;
    must(candidates.length<8,'Bounded covering components');
    const strictlyOrdered=hits.every((h,k)=>k===0||h.y>hits[k-1].y);
    const inside=cavity(l,hits,y),vertical=inside?{floorGap:y-radius-hits[0].y,roofGap:hits[1].y-y-radius}:null;
    candidates.push({component:g.descriptor,crossingCount:hits.length,strictlyOrdered,
     crossings:hits.map(h=>({...h,branch:branch(h.indices),mature:mature(l,h)})),unambiguousCavity:inside,
     sphereVerticallyInside:!!vertical&&vertical.floorGap>0&&vertical.roofGap>0,vertical});
   }
   const drawnWater=waterAt(x,y,z,0)??null;
   const parityDisagreement=candidates.some(c=>((c.crossings.filter(h=>h.y>y).length&1)===1)!==drawnWater&&drawnWater!==null);
   const clearance=radius>0?sphere(l,[x,y,z],radius):null;
   // Covered even/unclosed/ambiguous columns cannot borrow the ordinary-water answer.
   const fallback=drawnWater===null&&candidates.length===0?ordinaryWaterBound(ordinary,x,y,z,radius):null;
   const waterClear=drawnWater===false&&!parityDisagreement||!!fallback?.available&&fallback.clear;
   points.push({name:i<7?names[i]:['pelvisPart','torsoPart','headPart','leftArmPart','rightArmPart','leftLegPart','rightLegPart'][i-7],
    kind:i<7?'published-render-point':'actual-physics-part-sphere',xyz:[x,y,z],radius,candidates,drawnWater,parityDisagreement,clearance,
    waterClear,waterAuthority:fallback?'ordinary-host-height-field/outside-all-indexed-crossings':'drawn-loft-parity',ordinaryWater:fallback});
  }
  let common=points[0].candidates.filter(c=>c.unambiguousCavity&&c.sphereVerticallyInside).map(c=>c.component.localId);
  for(const p of points.slice(1))common=common.filter(id=>p.candidates.some(c=>c.unambiguousCavity&&c.sphereVerticallyInside&&c.component.localId===id));
  const selected=common.length===1?common[0]:null,component=selected===null?null:points[0].candidates.find(c=>c.component.localId===selected).component;
  const allSpheresClear=points.slice(7).every(p=>p.clearance.clearOfAllActiveIndexedTriangles);
  const parityClear=points.every(p=>p.drawnWater===false&&!p.parityDisagreement);
  const waterClear=points.every(p=>p.waterClear),outsideWaterUnclassified=points.some(p=>p.ordinaryWater&&!p.ordinaryWater.available);
  const contained=selected!==null&&component.front!==null&&allSpheresClear&&parityClear;
  const pointCount=points.filter(p=>p.candidates.some(c=>c.unambiguousCavity)).length;
  const ambiguous=common.length>1||(component&&component.front===null)||points.some(p=>p.parityDisagreement||p.candidates.some(c=>![1,3].includes(c.crossingCount)||!c.strictlyOrdered));
  const classification=contained?'contained':ambiguous?'ambiguous':pointCount?'partial':outsideWaterUnclassified?'outside-unclassified':'outside';
  return {geometryStamp:{topologyGeneration,slices:l.sliceCount,vertices:l.vertexCount,indices:l.indexCount,components:groups.length},
   points,component,commonComponentCount:common.length,pointCountInUnambiguousCavity:pointCount,
   allActualPartSpheresClear:allSpheresClear,allPointsLoftParityClear:parityClear,allPointsWaterClear:waterClear,outsideWaterUnclassified,
   all14ModelWitnessesContained:contained,classification,
   scope:'Cavity uses seven render witnesses and seven actual part spheres in one indexed mature air-column component. Outside all indexed crossings only, the normal host bilinear/carved field may answer via a whole-footprint raw-node upper bound. No skin, capsule/limb-segment, cubic/displaced shader, air-volume connectivity or worker-force claim.'};
 }
 function point(l,row,profile){const v=3*(row*S+3+profile);return[l.positions[v],l.positions[v+1],l.positions[v+2]];}
 function mouth(l,row,t,validateAir=true){
  const next=row+1;if(next>=l.sliceCount||l.sliceJoined[row]!==1||l.sliceFront[row]!==l.sliceFront[next])return null;
  if(![row,next].every(r=>l.slicePhase[r]===1&&l.sliceWeight[r]===1))return null;
  const caps=[point(l,row,64),point(l,next,64)],floors=[point(l,row,104),point(l,next,104)];
  if(!caps.every((p,i)=>p[0]===floors[i][0]&&p[2]===floors[i][2]&&p[1]-floors[i][1]>=1.2))return null;
  const sigma0=l.sliceSigma[row],sigma1=l.sliceSigma[next];if(!(Number.isFinite(sigma0)&&Number.isFinite(sigma1)&&sigma0!==sigma1))return null;
  const mix=(a,b)=>a.map((v,i)=>v+(b[i]-v)*t),cap=mix(...caps),floor=mix(...floors);
  let tx=caps[1][0]-caps[0][0],tz=caps[1][2]-caps[0][2];const length=Math.hypot(tx,tz);if(!(length>0))return null;
  const increasing=Math.sign(sigma1-sigma0);tx=tx/length*increasing;tz=tz/length*increasing;
  let rx=l.sliceRayX[row]+(l.sliceRayX[next]-l.sliceRayX[row])*t,rz=l.sliceRayZ[row]+(l.sliceRayZ[next]-l.sliceRayZ[row])*t;
  const rn=Math.hypot(rx,rz);if(!(rn>0))return null;rx/=rn;rz/=rn;
  const mid68=mix(point(l,row,68),point(l,next,68)),mid88=mix(point(l,row,88),point(l,next,88));
  const inner=[(mid68[0]+mid88[0])/2,(mid68[2]+mid88[2])/2];
  const result={front:l.sliceFront[row],row,nextRow:next,t,sigma:sigma0+(sigma1-sigma0)*t,
   cap,floor,position:cap,tangent:[tx,tz],ray:[rx,rz],bothRowGaps:caps.map((p,i)=>p[1]-floors[i][1]),
   actualInteriorAir:null,openingAlive:false,
   scope:'Mature joined actual cap64/floor104 pair with both gaps>=1.20m and one actual three-crossing interior air column; no finite swept-body route claim.'};
  if(!validateAir)return result;
  const groups=geometry(l),candidates=groups.filter(g=>g.descriptor.front===l.sliceFront[row]);
  const air=[];
  for(const g of candidates){const hits=crossing(l,g,...inner);if(hits.length===3&&cavity(l,hits,(hits[0].y+hits[1].y)/2))air.push({component:g.descriptor,floorY:hits[0].y,roofY:hits[1].y,clearance:hits[1].y-hits[0].y});}
  if(air.length!==1)return null;
  return {...result,actualInteriorAir:{xz:inner,...air[0]},openingAlive:true};
 }
 function nearestMouth(l,board,front=null){
  let best=null;
  for(let row=0;row+1<l.sliceCount;row++){
   if(front!==null&&l.sliceFront[row]!==front)continue;
   const a=point(l,row,64),b=point(l,row+1,64),dx=b[0]-a[0],dz=b[2]-a[2],den=dx*dx+dz*dz;if(!(den>0))continue;
   const t=Math.max(0,Math.min(1,((board[0]-a[0])*dx+(board[2]-a[2])*dz)/den)),candidate=mouth(l,row,t,false);if(!candidate)continue;
   const distanceSquared=(board[0]-candidate.cap[0])**2+(board[2]-candidate.cap[2])**2;
   if(!best||distanceSquared<best.distanceSquared)best={...candidate,distanceSquared};
  }
  if(!best)return null;
  const checked=mouth(l,best.row,best.t);
  return checked?{...checked,distanceSquared:best.distanceSquared}:null;
 }
 function mouthAtSigma(l,front,sigma){
  for(let row=0;row+1<l.sliceCount;row++){
   if(l.sliceFront[row]!==front||l.sliceFront[row+1]!==front)continue;
   const a=l.sliceSigma[row],b=l.sliceSigma[row+1];
   if(a!==b&&Math.min(a,b)<=sigma&&sigma<=Math.max(a,b))return mouth(l,row,(sigma-a)/(b-a));
  }
  return null;
 }
 function outsideThroughMouth(witness,frame){
  if(!frame||witness.classification!=='outside'||!witness.allActualPartSpheresClear||!witness.allPointsWaterClear)return false;
  return witness.points.every(p=>(p.xyz[0]-frame.cap[0])*frame.ray[0]+(p.xyz[2]-frame.cap[2])*frame.ray[1]>p.radius);
 }
 return {measure,nearestMouth,mouthAtSigma,outsideThroughMouth};
}
