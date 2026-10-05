// Exact active public draw-loft words for offline geometry/material inspection; no ownership or visibility claim.
export function createLoftSnapshotTools() {
 const vertex={positions:3,normals:3,mask:1,lift:1,sheet:1,sheetWeight:1,sheetBack:1,throat:4};
 const littleEndian=new Uint8Array(new Uint16Array([0x0102]).buffer)[0]===2;
 function encode(bytes){let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);}
 function capture(l,label,epoch) {
  if(!['initial','body-entry','intentional-exit','terminal'].includes(label))throw Error('Only the four declared ordinary checkpoint epochs can request full loft words');
  if(!(l.normals instanceof Float32Array))return {available:false,label,reason:'Public drawn loft vertex normals unavailable; no recomputation attempted',geometryOrCameraSearch:false};
  if(!Number.isSafeInteger(l.sliceCount)||l.sliceCount<0||l.sliceCount>300||!Number.isSafeInteger(l.vertexCount)||l.vertexCount<0||l.vertexCount>40200||!Number.isSafeInteger(l.indexCount)||l.indexCount<0||l.indexCount>240000)throw Error('Complete active loft snapshot count bounds');
  const keys=[...Object.keys(vertex),'indices',...Object.keys(l).filter(k=>/^slice[A-Z]/.test(k)&&ArrayBuffer.isView(l[k]))],arrays={},identities={},words={};let rawBytes=0;
  for(const key of keys){const a=/** @type {any} */(l[key]),count=key==='indices'?l.indexCount:vertex[key]?vertex[key]*l.vertexCount:l.sliceCount;
   if(!(a instanceof Float32Array||a instanceof Uint32Array||a instanceof Int32Array||a instanceof Uint8Array)||a.length<count)throw Error('Complete public draw-loft array unavailable: '+key);
   identities[key]=a;const b=new Uint8Array(a.buffer,a.byteOffset,count*a.BYTES_PER_ELEMENT).slice();rawBytes+=b.length;
   if(rawBytes>4*1024*1024)throw Error('4MiB complete raw loft snapshot cap');words[key]=b;
   arrays[key]={dtype:a.constructor.name,littleEndian,count,byteLength:b.length,encoding:'base64-exact-active-typed-array-words',data:null};
  }
  for(const key of keys)arrays[key].data=encode(words[key]);
  for(const key of keys){const a=l[key],b=words[key],now=new Uint8Array(a.buffer,a.byteOffset,b.length);if(a!==identities[key]||now.length!==b.length||!now.every((v,i)=>v===b[i]))throw Error('Array identity/words changed while copying and encoding: '+key);}
  const result={schema:'bounded-C-complete-drawn-loft-words/v1',available:true,label,epoch,counts:{slices:l.sliceCount,vertices:l.vertexCount,indices:l.indexCount},rawBytes,arrays,positionSpace:'world-coordinate-loft-input',normalsMeaning:'loft vertex normals supplied to draw mesh; no fragment or G-buffer attribution',unusedCapacityIncluded:false,arrayIdentitiesAndWordsUnchanged:true,geometryOrCameraSearch:false,perFragmentOwnershipOrVisibilityClaim:false,openingOrBodyPassageClaim:false};
  if(new TextEncoder().encode(JSON.stringify(result)).length>6*1024*1024)throw Error('6MiB complete loft JSON snapshot cap');return result;
 }
 return {capture};
}
