// Serialized into the actual game page. Calls real rendered menu buttons, never diagnostic.start/retry/place.
export function prepareMenu() {
 const d=window.breaklineDiagnostics,lab=window.breaklineLab,root=document.querySelector('#app');
 if(!d||!lab||!root||!document.querySelector('.screen-menu'))throw Error('Actual ready main menu required');
 const evidence=window.__ordinaryMenuEvidence={actualDomStartup:true,actions:[],rideObserved:false,popupNotForced:true,normalSpawnPreserved:true,normalPhysicalStartup:true,initialModeClock:d.mode.host?.snapshot.status.seaTime??null};
 lab.active=true;lab.clock.paused=true;
 const observer=new MutationObserver(()=>{if(root.dataset.screen==='ride'){observer.disconnect();lab.clock.paused=true;evidence.rideObserved=true;evidence.rideClockAtObserver=d.mode.host?.snapshot.status.seaTime??null;evidence.outstandingAtObserver=d.mode.host?.outstandingSteps??null;evidence.normalRideView=d.mode.homeView;const query='.ride-hud button.hud-pause',buttons=[...document.querySelectorAll(query)];evidence.pauseButtonInventory={query,count:buttons.length,buttons:buttons.slice(0,16).map(b=>({disabled:!!b.disabled,ariaLabel:b.getAttribute('aria-label')}))};if(buttons.length!==1||buttons[0].disabled){evidence.firstFailure={reason:'unique-enabled-normal-hud-pause',...evidence.pauseButtonInventory};return;}buttons[0].click();lab.active=false;evidence.normalHudPaused=root.dataset.screen==='pause'&&root.dataset.base==='ride';evidence.activeLabDisabled=lab.active===false;if(!evidence.normalHudPaused)evidence.firstFailure={reason:'normal-hud-pause-did-not-hold',screen:root.dataset.screen,base:root.dataset.base};}});
 observer.observe(root,{attributes:true,attributeFilter:['data-screen']});
 function inventory(query,label) {
  const all=[...document.querySelectorAll(query)],matches=all.filter(b=>label===null||b.textContent.trim()===label);
  const brief=b=>({text:b.textContent.trim().slice(0,200),tag:b.tagName??null,disabled:!!b.disabled,ariaDisabled:b.getAttribute?.('aria-disabled')??null,ariaPressed:b.getAttribute?.('aria-pressed')??null});
  return {query,label,beforeScreen:root.dataset.screen,queriedButtonCount:all.length,matchingButtonCount:matches.length,queriedButtons:all.slice(0,64).map(brief),matchingButtons:matches.slice(0,64).map(brief),groupInventory:[...document.querySelectorAll('.choice-row .segmented')].slice(0,16).map(g=>({ariaLabel:g.getAttribute('aria-label'),buttons:[...g.querySelectorAll('button')].slice(0,16).map(brief)})),inventoryTruncated:all.length>64||matches.length>64};
 }
 function click(query,label){const item=inventory(query,label);evidence.lastAttempt=item;const list=[...document.querySelectorAll(query)].filter(b=>label===null||b.textContent.trim()===label);if(list.length!==1||list[0].disabled){evidence.firstFailure={reason:'unique-enabled-menu-selector',...item};throw Error('Unique enabled actual menu button required: '+label+'; inventory='+JSON.stringify(item));}evidence.actions.push({query,label:label??list[0].textContent.trim(),beforeScreen:root.dataset.screen});list[0].click();}
 click('.screen-menu button.tile-primary',null);
 const cards=[...document.querySelectorAll('.spot-card')].filter(b=>b.querySelector('strong')?.textContent.trim()==='Padang Padang');if(cards.length!==1)throw Error('Unique Padang card required');evidence.actions.push({query:'.spot-card',label:'Padang Padang',beforeScreen:root.dataset.screen});cards[0].click();
 for(const [group,label] of [['Swell','Big'],['Tide','Mid'],['Wind','Calm'],['Time of day','Midday']])click('.choice-row .segmented[aria-label="'+group+'"] button',label);
 const selectedSpot=[...document.querySelectorAll('.spot-card[aria-pressed="true"] strong')];if(selectedSpot.length!==1)throw Error('One selected actual spot required');
 evidence.selectedConditionScopes=[];
 evidence.selectedChoices=[selectedSpot[0].textContent.trim()];
 for(const group of ['Swell','Tide','Wind','Time of day']){
  const query='.choice-row .segmented[aria-label="'+group+'"] button[aria-pressed="true"]',selected=[...document.querySelectorAll(query)];
  const scoped={group,query,matchingSelectedButtonCount:selected.length,selectedTexts:selected.slice(0,16).map(b=>b.textContent.trim())};evidence.selectedConditionScopes.push(scoped);
  if(selected.length!==1){evidence.firstFailure={reason:'unique-selected-condition',...scoped};throw Error('Unique selected authored condition required: '+JSON.stringify(scoped));}
  evidence.selectedChoices.push(selected[0].textContent.trim());
 }
 if(JSON.stringify(evidence.selectedChoices)!==JSON.stringify(['Padang Padang','Big','Mid','Calm','Midday']))throw Error('Actual chosen Padang Big conditions mismatch');
 click('.panel-footer button.button-primary','Paddle out');return {...evidence};
}
