// Browser-safe factory. Preserve every ordinary pilot control, including prone prealignment.
export function createGuidedControl() {
 let pulses=0;
 return (view,requested,step)=>{
  if(requested.tubeGuide!==true)throw Error('The current tube controller must request opt-in guidance');
  if(!Number.isFinite(requested.steer)||Math.abs(requested.steer)>1)throw Error('Finite ordinary steer required');
  const input={...requested};
  if(input.popUp){
   if(view.ride.phase!=='prone'||view.ride.cue!==true||pulses!==0)throw Error('Only one pilot-requested actual-positive-cue pop-up is allowed');
   pulses++;
  }
  return {input,control:{step,popUpPulses:pulses,actualInputEqualsPilotOutput:true,proneSteeringPreserved:input.steer===requested.steer,
   tubeGuideForwarded:input.tubeGuide===true,noPostureCompressionTrimOverlay:true,noForcedPopUp:true,noPrivateCueClock:true}};
 };
}
