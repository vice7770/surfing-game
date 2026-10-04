// Serialized into the page. Read-only query over ACTUAL active indexed drawing geometry.
// Snapshot hands/feet are tips, and trunk points include drawn swing. This is a witness detector, not worker force/capsule proof.
export function createWitnessSampler() {
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
 function measure(l,words,radii,waterAt){
  must(words.length===21&&words.every(Number.isFinite),'Seven finite actual published witnesses');
  must(radii.length===7&&radii.every(r=>Number.isFinite(r)&&r>0),'Seven finite positive reference radii');
  const groups=geometry(l),points=[];
  for(let i=0;i<7;i++){
   const xyz=words.slice(3*i,3*i+3),candidates=[];
   for(const g of groups){
    const hits=crossing(l,g,xyz[0],xyz[2]);if(!hits.length)continue;
    must(candidates.length<8,'Bounded covering components');
    const strictlyOrdered=hits.every((h,k)=>k===0||h.y>hits[k-1].y);
    const boundedAir=[];
    if((hits.length&1)===1&&strictlyOrdered)for(let k=0;k+1<hits.length;k+=2)
     if(xyz[1]>hits[k].y&&xyz[1]<hits[k+1].y)boundedAir.push(k/2);
    const airBand=boundedAir.length===1?boundedAir[0]:null;
    const unambiguous=hits.length===3&&strictlyOrdered&&airBand===0;
    candidates.push({component:g.descriptor,crossingCount:hits.length,crossings:hits.map(h=>h.y),strictlyOrdered,
     airBand,unambiguousCavity:unambiguous,classification:unambiguous?'cavity-air':airBand!==null?'ambiguous-air':hits.length===1?'exterior-column':'ambiguous-or-water',
     floor:airBand!==null?hits[2*airBand]:null,roof:airBand!==null?hits[2*airBand+1]:null,
     roofTop:airBand!==null&&hits[2*airBand+2]?hits[2*airBand+2]:null});
   }
   const drawnWater=waterAt(...xyz,0)??null;
   points.push({name:names[i],xyz,candidates,drawnWater,
    componentParityDisagreement:candidates.some(c=>((c.crossings.filter(v=>v>xyz[1]).length&1)===1)!==drawnWater&&drawnWater!==null)});
  }
  let common=points[0].candidates.filter(c=>c.unambiguousCavity).map(c=>c.component.localId);
  for(const p of points.slice(1))common=common.filter(id=>p.candidates.some(c=>c.unambiguousCavity&&c.component.localId===id));
  const selected=common.length===1?common[0]:null;
  const allPoints=selected!==null;
  const chosen=allPoints?points.map(p=>p.candidates.find(c=>c.unambiguousCavity&&c.component.localId===selected)):null;
  const headChoices=points[2].candidates.filter(c=>c.unambiguousCavity),head=allPoints?chosen[2]:headChoices.length===1?headChoices[0]:null;
  const headRadius=radii[2],headVertical=head?{radius:headRadius,floorGap:words[7]-headRadius-head.floor.y,
   roofGap:head.roof.y-words[7]-headRadius,component:head.component}:null;
  const headSphere=head?sphere(l,points[2].xyz,headRadius):null;
  const trunkSpheres=allPoints?[sphere(l,points[0].xyz,radii[0]),sphere(l,points[1].xyz,radii[1]),headSphere]:null;
  const headContained=!!headVertical&&headVertical.floorGap>0&&headVertical.roofGap>0&&headSphere.clearOfAllActiveIndexedTriangles;
  const referenceTrunkSpheresClear=!!trunkSpheres&&trunkSpheres.every(s=>s.clearOfAllActiveIndexedTriangles);
  const productionPointParityClear=points.every(p=>p.drawnWater===false&&!p.componentParityDisagreement);
  const predicate=allPoints&&chosen[0].component.front!==null&&headContained&&referenceTrunkSpheresClear&&productionPointParityClear;
  const count=points.filter(p=>p.candidates.some(c=>c.unambiguousCavity)).length;
  const ambiguous=common.length>1||(allPoints&&chosen[0].component.front===null)||points.some(p=>p.componentParityDisagreement
   ||(p.candidates.some(c=>c.unambiguousCavity)&&p.drawnWater!==false)
   ||p.candidates.some(c=>![1,3].includes(c.crossingCount)||!c.strictlyOrdered));
  const classification=predicate?'contained':ambiguous?'ambiguous':count>0?'partial':'outside';
  return{geometryStamp:{topologyGeneration,slices:l.sliceCount,vertices:l.vertexCount,indices:l.indexCount,components:groups.length},
   points,pointCountInUnambiguousCavity:count,commonComponentCount:common.length,component:allPoints?chosen[0].component:null,
   allPublishedPointsInAirColumnsOfOneConnectedMeshComponent:allPoints,headVertical,headSphere,referenceTrunkSpheres:trunkSpheres,
   referenceTrunkSpheresClear,productionPointParityClear,sevenPublishedWitnessesAndReferenceTrunkSpheresContained:predicate,classification,
   scope:'Air-column witnesses on one connected actual indexed mesh component; air-volume connectivity is not proved. Published swung trunk centres/limb tips and reference spheres using production volumes. No full body/capsule, shader-displacement, or worker-contact-force claim.'};
 }
 // The directed-entry selector uses this same topology and exact half-open indexed crossing rule.
 measure.columns=function columns(l,queries){
  must(Array.isArray(queries)&&queries.length<=24,'Bounded exact opening shortlist');
  const groups=geometry(l);
  return queries.map(q=>({x:q.x,z:q.z,covering:groups.flatMap(g=>{
   const hits=crossing(l,g,q.x,q.z);if(!hits.length)return[];
   return[{component:g.descriptor,crossings:hits.map(h=>h.y),strictlyOrdered:hits.every((h,k)=>k===0||h.y>hits[k-1].y),hits}];
  })}));
 };
 return measure;
}
