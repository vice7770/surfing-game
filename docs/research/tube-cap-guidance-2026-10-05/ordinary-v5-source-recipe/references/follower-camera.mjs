// Passive public-method instrumentation. The mirror is never rendered or used by physics.
export function installFollowerCamera(d,lab,root){
 const mode=d.mode,owner=mode.camera,view=mode.homeView,original=owner.update;
 const must=(v,m)=>{if(!v)throw Error(m);};
 must(['front','behind','side'].includes(view),'Authored ordinary follower camera required');
 must(typeof mode.setRideView==='function'&&typeof original==='function','Existing public follower API required');
 const mirror=new owner.constructor();mirror.setView(view);mirror.resize(owner.camera.aspect);
 let calls=0,positiveDtCalls=0,zeroDtCalls=0,last=null;
 function hold(){must(root.dataset.screen==='pause'&&root.dataset.base==='ride'&&lab.active===false&&lab.clock.paused===true,'Normal HUD pause must hold clock without active lab fly ownership');}
 const words=()=>JSON.stringify({seaTime:mode.host.snapshot.status.seaTime,outstanding:mode.host.outstandingSteps,board:Array.from(mode.host.snapshot.board.subarray(0,8)),rider:Array.from(mode.host.snapshot.rider.subarray(0,33))});
 const pose=()=>({position:owner.camera.position.toArray(),quaternion:owner.camera.quaternion.toArray()});
 function same(){const a=pose(),b={position:mirror.camera.position.toArray(),quaternion:mirror.camera.quaternion.toArray()};return a.position.every((v,i)=>Object.is(v,b.position[i]))&&a.quaternion.every((v,i)=>Object.is(v,b.quaternion[i]));}
 const followCopy=f=>f?{position:{...f.position},heading:f.heading,...(f.velocity?{velocity:{...f.velocity}}:{}),...(f.crest?{crest:{...f.crest}}:{})}:undefined;
 owner.update=function(host,focus,dt,follow){
  hold();must(this===owner&&owner.view===view&&(dt===0||dt===1/60),'Only authored held-zero or manual fixed-step follower updates');
  must(++calls<=50000,'Finite passive follower observation cap');
  must(host===mode.host&&follow&&mode.drawnBoard[7]>0,'Actual normal mode host and drawn follow target required');
  const falling=mode.drawnRider[23]>0&&mode.drawnRider[21]===5;
  const target=falling?mode.drawnRider:mode.drawnBoard;
  must(['x','y','z'].every((k,i)=>follow.position[k]===target[i]),'Normal follower position must match actual drawn board/fallen rider');
  must(follow.heading===(mode.drawnRider[23]>0?mode.drawnRider[24]:0),'Normal follower heading must match actual drawn rider');
  const snapshot=host.snapshot,before=words();
  // This repeats the authored camera's ordinary host.heightAt reads; no zero-query claim.
  mirror.update(host,{...focus},dt,followCopy(follow));
  const result=original.call(owner,host,focus,dt,follow);
  must(host.snapshot===snapshot&&words()===before,'Camera updates changed published physics clock/body words or outstanding work');
  must(same(),'Real camera differs from public authored follower mirror; stale fly/external pose rejected');
  if(dt>0)positiveDtCalls++;else zeroDtCalls++;
  last={dt,seaTime:snapshot.status.seaTime,followPosition:[follow.position.x,follow.position.y,follow.position.z],follows:falling?'fallen-rider':'drawn-board'};
  return result;
 };
 hold();must(mode.host.outstandingSteps===0,'Drained normal follower setup required');const snapshot=mode.host.snapshot,before=words();
 mode.setRideView(view);mode.update(0); // One public authored cut; no manual camera coordinates.
 must(mode.host.snapshot===snapshot&&words()===before,'Follower setup changed published physics');
 function current(){hold();must(owner.view===view&&same(),'Certified follower pose changed before render/capture');return{policy:'public-authored-follower-mirror/v1',view,activeLab:false,normalHudPause:true,calls,positiveDtCalls,zeroDtCalls,exactPositionQuaternionMatch:true,actualDrawnFollowTargetMatch:true,publishedClockBodyWordsUnchangedByCamera:true,mirrorUsesOrdinaryHostHeightReads:true,last,position:owner.camera.position.toArray(),quaternion:owner.camera.quaternion.toArray(),scope:'Public authored camera execution/pose and recorded physics words; no full renderer-internal nonmutation claim'};}
 return {hold,current,certifyRender:current};
}
