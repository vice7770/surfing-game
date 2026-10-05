// Applied to detached published status copies after the ordinary controller reads its view.
export function retainContactDiagnostics(ride){
 const cd=ride.contactDiagnostics;
 if(!cd||!Number.isSafeInteger(cd.mount)||!Number.isSafeInteger(cd.step))throw Error('Published bounded contact diagnostics required');
 if(ride.phase!=='prone'||ride.separation||cd.loss)return {...ride,contactDiagnosticRetention:'full'};
 const summaryKeys=['step','substep','feasible','inContact','flightTime','postureError','limit','supportXMin','supportXMax','supportZMin','supportZMax','copX','copZ'];
 const sample=s=>s===null?null:Object.fromEntries(summaryKeys.map(k=>{if(!(k in s))throw Error('Missing prone contact summary field '+k);return[k,s[k]];}));
 const scalars=Object.fromEntries(Object.entries(cd).filter(([,v])=>typeof v==='number'));
 return {...ride,contactDiagnostics:{...scalars,last:sample(cd.last),firstLimited:sample(cd.firstLimited),firstNonContact:sample(cd.firstNonContact),loss:null},contactDiagnosticRetention:'compact-prone-flight-support'};
}
