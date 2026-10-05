// One declared input intervention after the first published standing output.
// Same prone actual-cue pulse and standing posture as the accepted C replay.
export function createLineSteeringControl() {
 let popupIssued=false,popupTrigger=null,standingSteerStarted=false;
 return function(view,pilotInput,step,dt=1/60) {
  if(!(dt===1/60&&Number.isSafeInteger(step)&&step>=1))throw Error('Finite one-step ordinary control');
  const phase=view.ride.phase,standing=phase==='standing',prone=phase==='prone';
  if(!Number.isFinite(pilotInput.steer)||Math.abs(pilotInput.steer)>1)throw Error('Finite production line steer within game range');
  const input={paddle:prone,popUp:false,steer:standing?pilotInput.steer:0,trim:0,crouch:standing?1:0,compress:standing?1:0,pocketReflex:false};
  const firstStandingInput=standing&&!standingSteerStarted;
  standingSteerStarted=standing;
  if(prone&&!popupIssued&&view.ride.cue===true){input.popUp=true;popupIssued=true;popupTrigger={step,kind:'first-actual-positive-cue',cue:true,phase,wave:JSON.parse(JSON.stringify(view.ride.wave))};}
  // Before standing retain the complete original metadata as well as inputs.
  const steeringControl=standing
   ?{requestedPilotSteer:pilotInput.steer,actualInputSteer:input.steer,targetLimitedSteer:pilotInput.steer,maximumAbsolute:1,slewRatePerSecond:null,standing,firstStandingInput,proneSteering:0,mode:'production-line-verbatim-after-first-standing'}
   :{requestedPilotSteer:pilotInput.steer,actualInputSteer:0,targetLimitedSteer:0,maximumAbsolute:.2,slewRatePerSecond:.4,standing,firstStandingInput,proneSteering:0};
  return {input,steeringControl,popupControl:{issued:popupIssued,trigger:popupTrigger}};
 };
}
