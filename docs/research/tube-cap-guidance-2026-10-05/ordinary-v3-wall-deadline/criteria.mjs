// Browser-safe independent state machine. Controller cues are descriptive, never containment authority.
export function createTrialCriteria(mesh) {
 let observedOutside=false,partialFronts=new Set(),entry=null,travel=null,exitIntent=null,exit=null,standingAfter=0,stop=null;
 const compact=(row)=>({step:row.step,seaTime:row.seaTime,visualPoseTime:row.visualPoseTime,interpolationLag:row.interpolationLag,
  displayedRiderPhase:row.displayedRiderPhase,boardPose:row.boardPose.slice(),pilotPhase:row.pilot.phase,witnessClass:row.witness?.classification??null,
  renderedWitnessClass:row.renderedWitness?.classification??null,unionWitnessClass:row.unionWitness?.classification??null});
 function observe(row,loft){
  if(stop)return summary();
  if(row.ride.phase==='fallen'||row.ride.phase==='recover'||row.ride.separation){stop={kind:'actual-fall-or-separation',...compact(row)};return summary();}
  if(row.ride.resets>row.initialResets){stop={kind:'actual-reset',...compact(row)};return summary();}
  if(row.pilot.attempts>1){stop={kind:'second-attempt-forbidden',...compact(row)};return summary();}
  if(row.ride.phase!=='standing'){
   if(entry)stop={kind:'lost-standing-during-body-attempt',...compact(row)};
   else if(row.pilot.state==='done')stop={kind:'pilot-ended-before-entry',...compact(row)};
   return summary();
  }
  const witness=row.witness,rendered=row.renderedWitness,union=row.unionWitness;
  if(!witness||!rendered||!union){stop={kind:'missing-independent-current-or-displayed-witness',...compact(row)};return summary();}
  if(union.outsideWaterUnclassified){stop={kind:'ordinary-water-clearance-unclassified',...compact(row)};return summary();}
  if(!union.displayedStanding){if(entry)stop={kind:'displayed-standing-lost-during-body-attempt',...compact(row)};return summary();}
  if(union.classification==='outside'&&!entry)observedOutside=true;
  if(observedOutside&&union.classification==='partial')for(const p of [...witness.points,...rendered.points.slice(0,7)])for(const c of p.candidates)
   if(c.unambiguousCavity&&c.component.front!==null)partialFronts.add(c.component.front);
  if(!entry&&union.all21ModelWitnessesContained){
   const component=witness.component,frame=mesh.nearestMouth(loft,row.boardPose,component.front);
   if(observedOutside&&partialFronts.has(component.front)&&frame?.openingAlive){
    entry={...compact(row),front:component.front,sigma:frame.sigma,mouth:frame.cap.slice(),boardRelative:[row.boardPose[0]-frame.cap[0],row.boardPose[2]-frame.cap[2]],
     tangent:frame.tangent.slice(),travelSign:Math.sign(row.inputView.peelDirection)||1,frame,continuousSeconds:0,relativeProgressMetres:0};
   }
  }
  if(entry&&!exit){
   if(union.all21ModelWitnessesContained&&witness.component.front!==entry.front){stop={kind:'contained-front-changed',...compact(row)};return summary();}
   const frame=mesh.mouthAtSigma(loft,entry.front,entry.sigma),local=mesh.nearestMouth(loft,row.boardPose,entry.front);
   row.independentFixedSigmaMouth=frame;row.independentLocalMouth=local;
   if(!frame){stop={kind:'entry-material-sigma-opening-lost',...compact(row)};return summary();}
   if(union.all21ModelWitnessesContained&&witness.component.front===entry.front){
    entry.continuousSeconds=(row.seaTime-entry.seaTime);
    const relative=[row.boardPose[0]-frame.cap[0]-entry.boardRelative[0],row.boardPose[2]-frame.cap[2]-entry.boardRelative[1]];
    entry.relativeProgressMetres=(relative[0]*entry.tangent[0]+relative[1]*entry.tangent[1])*entry.travelSign;
    if(!travel&&entry.continuousSeconds>=1-1e-8&&entry.relativeProgressMetres>=3)travel={...compact(row),continuousSeconds:entry.continuousSeconds,relativeProgressMetres:entry.relativeProgressMetres,frame};
   } else if(!travel){stop={kind:'containment-interrupted-before-travel',...compact(row)};return summary();}
   // Intent is an actual pilot exit-phase input while the independently measured opening still lives.
   if(travel&&!exitIntent&&row.pilot.phase==='exit'&&row.inputPilot.phase==='exit'&&local?.openingAlive)
    exitIntent={...compact(row),frame:local,input:row.input};
   if(travel&&!exitIntent&&!union.all21ModelWitnessesContained){stop={kind:'containment-lost-before-exit-intent',...compact(row)};return summary();}
   if(exitIntent&&!local?.openingAlive){stop={kind:'opening-lost-before-intentional-exit',...compact(row)};return summary();}
   if(exitIntent&&union.classification==='ambiguous'){stop={kind:'ambiguous-exit',...compact(row)};return summary();}
   if(exitIntent&&mesh.outsideThroughMouth(witness,local)&&mesh.outsideThroughMouth(rendered,local))
    exit={...compact(row),openingAlive:true,frame:local,all21ShorewardAndClear:true,uniqueWitnessCount:21};
  }
  if(exit){
   const local=mesh.nearestMouth(loft,row.boardPose,entry.front);row.independentLocalMouth=local;
   if(union.classification!=='outside'||!union.all21ActualPartSpheresClear||!union.all21WaterClear){stop={kind:'outside-standing-clearance-lost',...compact(row)};return summary();}
   standingAfter=row.seaTime-exit.seaTime;
   if(standingAfter>=1-1e-8)stop={kind:'accepted-model-body-entry-travel-intentional-exit',...compact(row),standingAfterExitSeconds:standingAfter};
  }
  return summary();
 }
 function summary(){return{observedStandingOutside:observedOutside,partialFronts:[...partialFronts],entry,travel,exitIntent,exit,standingAfterExitSeconds:standingAfter,
  stop,accepted:stop?.kind==='accepted-model-body-entry-travel-intentional-exit',
  uniqueWitnessCount:21,currentModelWitnessCount:14,additionalDisplayedPointCount:7,bothCurrentAndDisplayedStandingRequired:true,
  modelPartSpheresAndRenderWitnessesOnly:true,completeSkinnedBodyOrCapsuleClaim:false,controllerCueNotContainmentAuthority:true,normalInterpolationPreserved:true};}
 function finish(row,kind){stop??={kind,...compact(row)};return summary();}
 return{observe,summary,finish};
}
