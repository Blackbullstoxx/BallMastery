'use strict';
// View state stays in memory; training progress continues to use the existing ledger.
const todayNavigation=(()=>{
 let screen='areas';const positions=new Map();
 const key=()=>screen==='section'?'section:'+activeSection:screen;
 function capture(){positions.set(key(),window.scrollY);if(screen==='section')playerCards.leaveCompletion?.()}
 function restoreScroll(){const top=positions.get(key())||0;window.requestAnimationFrame(()=>window.scrollTo({top,behavior:'instant'}))}
 function restore(){const unfinished=Object.keys(runs).filter(k=>runs[k].day===date()&&runs[k].phase!=='done');screen=unfinished.length?'section':'areas';if(unfinished.length&&!unfinished.includes(activeSection)){activeSection=unfinished[0];run=runs[activeSection]}positions.clear()}
 function open(next){
  if(tab==='today'&&screen===next)return;
  if(tab==='today')capture();
  if(run&&!run.paused&&!['ready','review','done'].includes(run.phase))pauseRun();
  document.querySelectorAll('video').forEach(v=>v.pause());
  screen=next;tab='today';render();restoreScroll();
 }
 function sections(){const available=enabledSections();return ['ball','juggling','feints'].filter(k=>available.includes(k)||state.blockDone?.[date()]?.includes(k)&&state.completedPlans?.[date()]?.[k]?.length)}
 function status(section){
  const current=runs[section]?.day===date()?runs[section]:null;
  const closed=!!state.blockDone?.[date()]?.includes(section);
  const entries=closed&&state.completedPlans?.[date()]?.[section]||current?.plan||plan(section);
  const blocks=overviewBlocks(section,entries),completed=new Set(current?.completedSets||[]);
  const credited=new Set();blocks.forEach(b=>{if(current)storeOverviewCredits(section,b,b.indices.filter(i=>completed.has(i)).map(i=>entries[i].set));const sets=overviewCredits(section,b);b.indices.forEach((i,n)=>{if(sets.includes(n+1)||completed.has(i))credited.add(i)})});
  const done=closed||entries.length>0&&entries.every((_,i)=>credited.has(i));
  const started=credited.size>0||!!current&&current.phase!=='ready';
  return {section,done,started,seconds:done?0:overviewSeconds(section,entries,current,blocks)};
 }
 function label(value){return value.done?'Geschafft ✓':(value.started?'noch ca. ':'ca. ')+overviewDuration(value.seconds)}
 function rating(section){const i={ball:0,juggling:1,feints:2}[section],s=playerCards.snapshot();return s.visible[i]?`<span class="area-rating" aria-label="${sectionNames[section]} Rating ${s.values[i]}"><small>${['BALL','JONG','FINT'][i]}</small><strong>${s.values[i]}</strong></span>`:''}
 function icon(section){
  const ball='<circle cx="24" cy="24" r="19"/><path d="m24 15 8 6-3 10H19l-3-10 8-6Zm0-10v10M6 17l10 4m3 10-7 9m17-9 7 9m-4-19 10-4"/>';
  const shoe='<path d="m6 29 5-10 7 7 8 1 7 5 10 4v7H5l1-14Zm0 14v3m10-3v3m12-3v3m11-3v3M23 28l-3 5m9-3-3 5"/><circle cx="30" cy="12" r="8"/><path d="m30 8 4 3-2 4h-4l-2-4 4-3Z"/>';
  const arrow='<path d="M7 42c32-3 32-13 14-17S4 14 38 7m-9-3 10 3-6 9"/>';
  return `<svg class="area-icon" viewBox="0 0 48 50" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${section==='ball'?ball:section==='juggling'?shoe:arrow}</svg>`;
 }
 function goal(){const s=playerCardSnapshotMaterial(playerCards.collectionSnapshot()),tiers=playerCardMaterials.map(m=>m.label),thresholds=playerCardMaterials.map(m=>m.min);if(s.tier===tiers.length-1)return '<section class="card next-tier"><small>DEIN KARTENZIEL</small><h2>'+tiers[s.tier]+' erreicht ✓</h2></section>';
  const target=thresholds[s.tier+1],missing=target-s.total,progress=Math.max(0,s.total-thresholds[s.tier]);
  return `<section class="card next-tier"><small>DEIN NÄCHSTES ZIEL</small><div class="row"><h2>${tiers[s.tier+1]}</h2><svg class="tier-shield tier-${s.tier+1}" viewBox="0 0 30 36" aria-hidden="true"><path d="M15 2 27 6v13c0 7-6 12-12 15C9 31 3 26 3 19V6Z" fill="currentColor" fill-opacity=".15" stroke="currentColor" stroke-width="1.5"/><path d="m7 9 8-3 8 3v10c0 5-4 9-8 11-4-2-8-6-8-11Z" fill="currentColor" fill-opacity=".12"/></svg></div><progress value="${progress}" max="${target-thresholds[s.tier]}" aria-label="Fortschritt zu ${tiers[s.tier+1]}"></progress><p>Noch ${missing} ${missing===1?'Gesamtpunkt':'Gesamtpunkte'} bis ${tiers[s.tier+1]}</p></section>`;
 }
 function summary(values){const done=values.length>0&&values.every(v=>v.done),started=values.some(v=>v.started||v.done),seconds=values.reduce((sum,v)=>sum+v.seconds,0);return `<div class="today-summary" role="status"><span aria-hidden="true">◷</span><strong>${done?'Heute geschafft ✓':'Heute geplant'}</strong>${done?'':`<span>${started?'Noch ca. ':'ca. '}${overviewDuration(seconds)}</span>`}</div>`}
 function choose(section){if(screen==='section')playerCards.leaveCompletion?.();screen='section';positions.set('section:'+section,0);chooseSection(section);restoreScroll()}
 function bind(){document.querySelectorAll('[data-today-view]').forEach(b=>b.onclick=()=>open(b.dataset.todayView));document.querySelectorAll('[data-training-area]').forEach(b=>b.onclick=()=>choose(b.dataset.trainingArea))}
 function renderView(){
  if(screen==='section')return false;
  const list=sections(),values=list.map(status);
  $('#view').innerHTML=`${areaMarkup()}<h2 class="training-question">Was möchtest du trainieren?</h2>${list.length?summary(values):'<div class="today-summary">Heute ist trainingsfrei.</div>'}<div class="training-areas">${values.map(v=>`<button class="training-area" data-training-area="${v.section}">${icon(v.section)}<span class="training-area-copy"><strong>${sectionNames[v.section]}</strong>${v.done?`<span class="technique-status area-complete">${label(v)}</span>`:`<small>${label(v)}</small>`}</span>${rating(v.section)}<span class="area-chevron" aria-hidden="true">›</span></button>`).join('')}</div>`;
  bind();return true;
 }
 function areaMarkup(){
  const items=[['areas','Übersicht']];
  if(screen==='section')items.push(['section',sectionNames[activeSection]]);
  return `<nav class="today-subnav${screen==='section'?' has-area':''}" aria-label="Heute-Ansichten">${items.map(([view,label])=>`<button type="button" data-today-view="${view}"${screen===view?' aria-current="page"':''}>${esc(label)}</button>`).join('')}</nav>`;
 }
 return {capture,restoreScroll,restore,open,render:renderView,rating,status,label,sections,goal,areaMarkup,bind,screen:()=>screen};
})();

