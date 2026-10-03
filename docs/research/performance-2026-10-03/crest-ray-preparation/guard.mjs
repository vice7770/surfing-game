import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const expectedConfig = Object.freeze({spot:'padang',seed:8761,significantHeight:3.8,peakPeriod:18,directionDegrees:0,spreading:150,tide:0,windSpeed:0,stage:2,compute:'auto',dx:2,fineSpacing:1,componentCount:64});
export const expectedAssets = Object.freeze(['barrels/pad19-a20-l12.bin','barrels/pad19-a30-l12.bin','barrels/pad19-a45-l12.bin','barrels/periodic-padang19s-l12.bin']);
export function requireTrue(ok, message) { if (!ok) throw Error(message); }
export function configGuard(actual) {
  requireTrue(actual && typeof actual === 'object','Missing config');
  requireTrue(Object.keys(actual).length === Object.keys(expectedConfig).length,'Unexpected config fields');
  for (const [key,value] of Object.entries(expectedConfig)) requireTrue(Object.is(actual[key],value),'Config mismatch: '+key);
}
export function countGuard(count,length,stride=9) {
  requireTrue(Number.isInteger(length) && length>0 && length%stride===0,'Invalid packed front capacity');
  requireTrue(Number.isInteger(count) && count>=0 && count<=length/stride,'Invalid active front count');
}
export function readGuarded(record) {
  const bytes=readFileSync(record.path);
  requireTrue(bytes.length===record.bytes && sha(bytes)===record.sha256,'Byte authority mismatch: '+record.path);
  return bytes;
}
export function discoverRuns(records,count,fields={front:2,sigma:3},stride=9) {
  countGuard(count,records.length,stride);
  const fronts=[];let start=0;
  while(start<count){
    const id=records[start*stride+fields.front];let end=start+1;
    while(end<count && records[end*stride+fields.front]===id) end++;
    const first=records[start*stride+fields.sigma],last=records[(end-1)*stride+fields.sigma];
    if(end-start>=2 && last-first>1e-6) fronts.push({id,start,end,first,last});
    start=end;
  }
  return fronts;
}
