(() => {
 const root=document.querySelector('#app'), d=window.breaklineDiagnostics, mode=d?.mode;
 const lab=window.breaklineLab, clock=lab?.clock, host=mode?.host, snapshot=host?.snapshot, status=snapshot?.status;
 const loading=document.getElementById('loading'), loadingText=document.getElementById('loading-text');
 const generation=mode?Object.getOwnPropertyDescriptor(mode,'starts'):undefined;
 const readyWait=mode?Object.getOwnPropertyDescriptor(mode,'dropPending'):undefined;
 const text=(value,limit)=>typeof value==='string'?value.slice(0,limit):null;
 const number=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
 return {
  screen:text(root?.dataset.screen,48), base:text(root?.dataset.base,48),
  menu:window.__ordinaryMenuEvidence??null, seaTime:number(status?.seaTime),
  startupPredicates:{
   screenIsPause:root?.dataset.screen==='pause',
   baseIsRide:root?.dataset.base==='ride',
   rideStatusPresent:!!status?.ride,
   labInactive:lab?!lab.active:null,
   labClockPaused:clock?!!clock.paused:null,
  },
  availability:{root:!!root,diagnostics:!!d,mode:!!mode,lab:!!lab,labClock:!!clock},
  scenePending:root?root.classList.contains('is-scene-pending'):null,
  loading:{present:!!loading,hidden:loading?loading.classList.contains('is-hidden'):null,text:text(loadingText?.textContent,160)},
  currentHost:{
   present:!!host,initPresent:!!host?.init,snapshotPresent:!!snapshot,statusPresent:!!status,
   spot:text(mode?.config?.spot,32),seed:number(mode?.config?.seed),
   configuredCompute:text(mode?.config?.compute,16),snapshotCompute:text(status?.compute,16),
   ridePhase:text(status?.ride?.phase,24),
  },
  modeStartupFields:{
   generationOwnDataField:generation&&Object.prototype.hasOwnProperty.call(generation,'value')?number(generation.value):null,
   hostReadyWaitCallbackOwnDataField:readyWait&&Object.prototype.hasOwnProperty.call(readyWait,'value')?typeof readyWait.value==='function':null,
  },
 };
})()
