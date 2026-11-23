'use strict';
// Credits only reduce today's goal. Active time itself stays in the existing clock ledger.
const individualJugglingChoice={open:false,key:'toe',minutes:3};
function validIndividualJugglingCredits(value){return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.entries(value).every(([day,keys])=>validTrainingDate(day)&&keys&&typeof keys==='object'&&!Array.isArray(keys)&&Object.entries(keys).every(([key,ms])=>['toe','free','touches'].includes(key)&&Number.isSafeInteger(ms)&&ms>=0&&ms<=90000000))}
function individualJugglingCredit(key,day=date()){return state.jugglingIndividualCredits?.[day]?.[key]||0}
function creditIndividualJugglingTime(day,key,ms){
 if(isReadOnly()||!validTrainingDate(day)||!['toe','free','touches'].includes(key)||!Number.isFinite(ms)||ms<=0)return;
 const all=state.jugglingIndividualCredits||(state.jugglingIndividualCredits={}),keys=all[day]||(all[day]={});keys[key]=Math.min(90000000,(keys[key]||0)+Math.round(ms));
}
function individualJugglingEnabled(){return !!runs.juggling?.individual||['toe','free','touches'].some(key=>state.groups[key])}
function scheduledJugglingRun(){const value=runs.juggling;return value?.individual?value.scheduled:value}
function individualJugglingHasCredits(){return Object.values(state.jugglingIndividualCredits?.[date()]||{}).some(ms=>ms>0)}
function individualJugglingPending(){
 const value=scheduledJugglingRun(),completed=new Set(value?.completedSets||[]),credits=new Map();
 for(const row of state.completedPlans?.[date()]?.juggling||[])credits.set(row.key,(credits.get(row.key)||0)+row.work);
 if(value&&value.phase!=='done'&&!value.repeatMode){
  value.plan.forEach((row,i)=>{
   const checkpoint=value.checkpoints?.[i];
   const seconds=completed.has(i)?row.work:checkpoint?.phase==='work'?Math.max(0,row.work-checkpoint.remaining):0;
   if(seconds)credits.set(row.key,(credits.get(row.key)||0)+seconds);
  });
  if(value.phase==='work'&&!completed.has(value.index)&&!value.extraSeconds){const row=value.plan[value.index],remaining=value.paused?value.remaining:Math.max(0,(value.deadline-Date.now())/1000);credits.set(row.key,(credits.get(row.key)||0)+Math.max(0,row.work-remaining))}
 }
 return plan('juggling').map(row=>({...row,work:Math.max(0,row.work-(credits.get(row.key)||0))})).filter(row=>row.work>.001);
}
function individualJugglingRepeatPlan(){return Object.entries(techNames).filter(([key])=>state.groups[key]&&isScheduled(key)).map(([key,name])=>({key,name,kind:'Jonglieren',set:1,total:1,work:Math.round(state.juggleMinutes[key]*60),rest:0,juggling:true,noScore:key==='touches'}))}
function individualJugglingDailyStatus(){
 const entries=individualJugglingPending(),current=runs.juggling,individual=current?.individual?current:null;
 const regular=scheduledJugglingRun();
 const countdownFor=row=>{
  const index=regular?.plan.findIndex(item=>item.key===row.key),checkpoint=regular?.checkpoints?.[index];
  if(checkpoint)return checkpoint.phase==='work'?0:checkpoint.phase==='count'?checkpoint.remaining:5;
  return regular?.plan[regular.index]?.key===row.key&&!regular.extraSeconds&&!(regular.completedSets||[]).includes(regular.index)?regular.phase==='work'?0:regular.phase==='count'?(regular.paused?regular.remaining:Math.max(0,(regular.deadline-Date.now())/1000)):5:5;
 };
 let seconds=entries.reduce((sum,row)=>sum+row.work+countdownFor(row),0);
 if(regular?.extraSeconds)seconds+=overviewExtraSeconds(regular);
 if(individual&&['count','work'].includes(individual.phase)){
  const remaining=individual.paused?individual.remaining:Math.max(0,(individual.deadline-Date.now())/1000),key=individual.plan[0].key,goal=entries.find(row=>row.key===key);
  const unit=(individual.phase==='count'?individual.plan[0].work:0)+remaining;
  seconds+=Math.max(0,unit-(goal?goal.work+countdownFor(goal):0));
 }
 return {section:'juggling',entries,seconds:Math.ceil(seconds),done:seconds===0,started:true};
}
function individualJugglingMarkup(){
 if(isReadOnly()||runs.juggling?.individual&&runs.juggling.phase!=='review')return '';
 const choice=individualJugglingChoice;
 return `<section class="individual-juggling"><button type="button" class="individual-juggling-toggle" id="individual-juggling-toggle" aria-expanded="${choice.open}" aria-controls="individual-juggling-options">${choice.open?'Individuell trainieren ⌃':'+ Individuell trainieren'}</button>${choice.open?`<form class="card individual-juggling-options" id="individual-juggling-options"><fieldset><legend>Jonglierart</legend>${Object.entries(techNames).map(([key,name])=>`<label class="individual-juggling-type"><input type="radio" name="technique" value="${key}" ${choice.key===key?'checked':''}>${name}</label>`).join('')}</fieldset><fieldset><legend>Dauer</legend><div class="juggling-extra-presets">${[3,5,7].map(n=>`<button type="button" data-individual-minutes="${n}" aria-pressed="${choice.minutes===n}">${n} Min.</button>`).join('')}</div></fieldset><label for="individual-juggling-minutes">Eigene Dauer</label><div class="juggling-extra-duration"><input id="individual-juggling-minutes" type="number" min="0.5" max="120" step="0.5" value="${choice.minutes}" required inputmode="decimal"><span>Min.</span></div><button type="submit" class="primary">Starten</button><button type="button" class="back-button" id="individual-juggling-close">Schließen</button></form>`:''}</section>`;
}
function bindIndividualJuggling(){
 const toggle=$('#individual-juggling-toggle');
 if(toggle)toggle.onclick=()=>{if(isReadOnly())return;if(run&&!run.paused&&['count','work','rest'].includes(run.phase))pauseRun();individualJugglingChoice.open=!individualJugglingChoice.open;preserveScroll(()=>render());if(individualJugglingChoice.open)window.requestAnimationFrame(()=>$('#individual-juggling-options')?.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}))};
 const form=$('#individual-juggling-options');if(form){
  const input=form.querySelector('#individual-juggling-minutes'),buttons=[...form.querySelectorAll('[data-individual-minutes]')];
  const select=()=>{if(input.validity.valid)individualJugglingChoice.minutes=Number(input.value);buttons.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.individualMinutes)===Number(input.value))))};
  buttons.forEach(b=>b.onclick=()=>{input.value=b.dataset.individualMinutes;select()});input.oninput=select;
  form.querySelectorAll('[name="technique"]').forEach(radio=>radio.onchange=()=>{individualJugglingChoice.key=radio.value});
  form.onsubmit=e=>{e.preventDefault();if(form.reportValidity())void startIndividualJuggling(individualJugglingChoice.key,Number(input.value))};
  $('#individual-juggling-close').onclick=()=>{individualJugglingChoice.open=false;preserveScroll(()=>render())};
 }
 $('#individual-juggling-end')?.addEventListener('click',endIndividualJuggling);
 $('#individual-juggling-return')?.addEventListener('click',returnFromIndividualJuggling);
}
async function startIndividualJuggling(key,minutes){
 if(isReadOnly()||playerCards.trainingPaused()||!Object.hasOwn(techNames,key)||!Number.isFinite(minutes)||minutes<.5||minutes>120||!Number.isInteger(minutes*2)||run?.individual&&run.phase!=='review')return;
 if(run?.individual)returnFromIndividualJuggling(false);
 if(run&&!run.paused&&['count','work','rest'].includes(run.phase))pauseRun();
 syncBallTime();resetBallClock();clearInterval(tick);silence();
 const scheduled=runs.juggling||null;
 const value={individual:true,scheduled,creditStart:individualJugglingCredit(key),day:date(),section:'juggling',plan:[{key,name:techNames[key],kind:'Jonglieren',set:1,total:1,work:minutes*60,rest:0,juggling:true,noScore:key==='touches'}],index:0,phase:'ready',paused:false,remaining:5,completedSets:[],completedBlocks:[],rotations:levels.map(()=>0)};
 individualJugglingChoice.open=false;activeSection='juggling';runs.juggling=value;run=value;render();await countdown();
}
function endIndividualJuggling(){
 if(isReadOnly()||!run?.individual||!['count','work'].includes(run.phase))return;
 syncBallTime();resetBallClock();clearInterval(tick);silence();
 if(individualJugglingCredit(run.plan[0].key)>run.creditStart){markPracticeDay(run.plan[0].key,run.day);playerCards.completedSet()}
 run.phase='review';run.paused=false;run.remaining=0;renderRunner();if(typeof dropboxBackup!=='undefined')dropboxBackup.changed(true);
}
function returnFromIndividualJuggling(redraw=true){
 if(isReadOnly()||!run?.individual)return;
 if(['count','work'].includes(run.phase))endIndividualJuggling();
 const scheduled=run.scheduled;clearInterval(tick);silence();resetBallClock();
 if(scheduled){runs.juggling=scheduled;run=scheduled;run.restored=false}else{delete runs.juggling;run=null}
 reopenExtendedPlan('juggling');reopenExtendedPlan('juggling');reconcileJugglingPlan();if(redraw){render();if(run)scrollTimerIntoView(true);else window.requestAnimationFrame(()=>document.querySelector('#view .training-summary')?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}))}
}
function individualJugglingRunnerMarkup(value){
 const d=value.plan[0],review=value.phase==='review',ready=value.phase==='ready';
 const action=review?'<button class="primary" id="individual-juggling-return">Zum Tagesplan</button>':ready?'<button class="primary" id="ready">Los geht’s</button>':value.paused?pauseActionsMarkup():'<button class="primary timer-pause" id="pause">Ⅱ Pause</button>';
 return `${previewTrainingSummary('juggling')}<section class="card technique-progress"><div><span>Individuelle Einheit</span><span>${(d.work/60).toLocaleString('de-DE')} Min.</span></div></section>${previewJugglingTechnique(d,{status:review?'Geschafft ✓':value.paused?'Pausiert':'Individuell',timer:ready?'':review?jugglingDoneTimerMarkup():timerMarkup()})}<div class="technique-actions">${action}${!review&&!ready?'<button class="back-button" id="individual-juggling-end">Einheit beenden</button>':''}${ready?'<button class="back-button" id="individual-juggling-return">Zum Tagesplan</button>':''}</div>`;
}
