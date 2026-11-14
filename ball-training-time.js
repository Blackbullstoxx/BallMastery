'use strict';
let ballClock=null;
function validTrainingDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value}
function validBallTraining(value){
 return !!value&&value.version===1&&validTrainingDate(value.since)&&!!value.days&&typeof value.days==='object'&&!Array.isArray(value.days)&&Object.entries(value.days).every(([day,ms])=>validTrainingDate(day)&&Number.isSafeInteger(ms)&&ms>=0&&ms<=90000000);
}
function normalizeBallTraining(value){return validBallTraining(value)?{version:1,since:value.since,days:{...value.days}}:{version:1,since:date(),days:{}}}
function ballTrainingState(){return state.ballTraining||(state.ballTraining=normalizeBallTraining(null))}
// The checkpoint contains totals, never a running clock. Restored sessions are
// paused, so closed time cannot be counted again on the next page load.
function syncBallTime(){
 if(typeof playerCards!=='undefined')playerCards.sync();
 if(typeof isReadOnly==='function'&&isReadOnly()){ballClock=null;return}
 const now=Date.now(),previous=ballClock;ballClock=null;
 if(previous){
  const elapsed=Math.max(0,Math.min(now,previous.until)-previous.from);
  if(elapsed){const data=ballTrainingState();data.days[previous.day]=Math.min(90000000,(data.days[previous.day]||0)+elapsed);if(previous.day<data.since)data.since=previous.day}
 }
 if(!(typeof playerCards!=='undefined'&&playerCards.trainingPaused())&&run?.section==='ball'&&run.phase==='work'&&!run.paused&&!document.hidden&&tab==='today'&&run.day===date()&&Number.isFinite(run.deadline)&&run.deadline>now){
  const midnight=new Date(run.day+'T00:00:00');midnight.setDate(midnight.getDate()+1);
  ballClock={from:now,until:Math.min(run.deadline,midnight.getTime()),day:run.day};
 }
}
function resetBallClock(){ballClock=null;if(typeof playerCards!=='undefined')playerCards.resetClock()}
// Older records prove training days even when the active-time ledger did not
// exist yet. Reconstruct only durations explicitly saved with completed timers.
function historicalAreaTraining(section){
 const data=state.cardTraining,days=new Set(),times=new Map(),valid=day=>validTrainingDate(day)&&day<=date(),keys=section==='juggling'?['toe','free','touches']:['feints'];
 const add=(day,ms=0)=>{if(!valid(day))return;days.add(day);if(Number.isFinite(ms)&&ms>0)times.set(day,Math.max(times.get(day)||0,Math.min(90000000,ms)))};
 for(const [day,ms] of Object.entries(state.areaTrainingHistory?.[section]||{}))if(ms>0)add(day,ms);
 for(const [day,row] of Object.entries(data?.days||{}))if(row[section]>0)add(day,row[section]);
 for(const key of keys)for(const [day,n] of Object.entries(state.practiceCounts?.[key]||{}))if(Number.isInteger(n)&&n>0)add(day);
 if(section==='juggling')for(const score of state.scores||[])if(!score.manualTrainingId&&keys.includes(score.key)&&Number.isInteger(score.value)&&score.value>=0)add(score.date);
 const rowTime=row=>row&&keys.includes(row.key)&&Number.isInteger(row.work)&&row.work>0&&row.work<=7200?row.work*1000:0;
 for(const [day,closed] of Object.entries(state.blockDone||{}))if(Array.isArray(closed)&&closed.includes(section)){
  const rows=state.completedPlans?.[day]?.[section];add(day,Array.isArray(rows)?rows.reduce((n,row)=>n+rowTime(row),0):0);
 }
 const overview=state.overviewDay;
 let ms=0;for(const row of Object.values(overview?.sections?.[section]||{}))if(Array.isArray(row.completed)){const completed=new Set(row.completed.filter(n=>Number.isInteger(n)&&n>=1&&n<=row.total));ms+=rowTime(row)*completed.size}
 if(ms)add(overview.day,ms);
 const saved=state.activeTraining,r=saved?.version===1?saved.runs?.[section]:null;
 if(r&&r.day===saved.day&&Array.isArray(r.plan)&&Array.isArray(r.completedSets)){let total=0;for(const i of new Set(r.completedSets))if(Number.isInteger(i)&&i>=0&&i<r.plan.length)total+=rowTime(r.plan[i]);if(total)add(r.day,total)}
 const unknownDays=[...days].filter(day=>!times.has(day)).length;
 return {milliseconds:[...times.values()].reduce((n,v)=>n+v,0),days:days.size,since:[...days,data?.since||date()].sort()[0],unknownDays,dayDates:[...days],timedDays:Object.fromEntries(times)};
}
function validAreaTrainingHistory(value){return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>['juggling','feints'].includes(k))&&Object.values(value).every(days=>days&&typeof days==='object'&&!Array.isArray(days)&&Object.entries(days).every(([day,ms])=>validTrainingDate(day)&&Number.isSafeInteger(ms)&&ms>0&&ms<=90000000))}
function rememberAreaTrainingTimes(){state.areaTrainingHistory=Object.fromEntries(['juggling','feints'].map(section=>[section,historicalAreaTraining(section).timedDays]))}
function ballTrainingTotals(section='ball'){
 const data=section==='ball'?ballTrainingState():null,native=section==='ball'?{milliseconds:Object.values(data.days).reduce((n,v)=>n+v,0),since:data.since,timedDays:data.days}:historicalAreaTraining(section);
 const nativeDays=section==='ball'?Object.keys(data.days).filter(d=>data.days[d]>0):native.dayDates;
 const rows=(state.manualTraining||[]).filter(r=>r.area===section&&r.date<=date()),days=new Set([...nativeDays,...rows.map(r=>r.date)].filter(d=>validTrainingDate(d)&&d<=date()));
 return {...native,milliseconds:native.milliseconds+rows.reduce((n,r)=>n+r.milliseconds,0),days:days.size,since:[native.since,...rows.map(r=>r.date)].sort()[0]};
}
function ballTrainingText(section='ball'){
 const totals=ballTrainingTotals(section),seconds=Math.floor(totals.milliseconds/1000),minutes=Math.floor(seconds/60),hours=Math.floor(minutes/60);
 const duration=hours?`${hours} Std. ${minutes%60} Min.`:minutes?`${minutes} Min.`:seconds?`${seconds} Sek.`:'0 Min.';
 return `Gesamt: ${totals.unknownDays?'mind. ':'schon '}${duration} / ${totals.days} ${totals.days===1?'Trainingstag':'Trainingstage'}`;
}
function ballTrainingSince(section='ball'){return ballTrainingTotals(section).since.split('-').reverse().join('.')}
function ballTrainingMarkup(section){
 if(!['ball','juggling','feints'].includes(section))return '';
 return `<button type="button" class="ball-training-total" data-ball-total="${section}" title="Erfassung seit ${ballTrainingSince(section)}" aria-label="${esc(ballTrainingText(section))} · Erfassungsbeginn anzeigen">${esc(ballTrainingText(section))}</button>`;
}
function trainingSummaryDuration(milliseconds){
 const seconds=Math.floor(milliseconds/1000),minutes=Math.floor(seconds/60),hours=Math.floor(minutes/60);
 return hours?hours+' h'+(minutes%60?' '+minutes%60+' min':''):minutes?minutes+' min':seconds?seconds+' s':'0 min';
}
function trainingSummaryMetrics(section){
 const totals=ballTrainingTotals(section),progress=section==='ball'?ballMasteryProgress(drills,state.current,state.finished):null;
 const metric=(value,label,attribute='')=>`<span class="training-metric"><strong ${attribute}>${value}</strong><span>${label}</span></span>`;
 return `<button type="button" class="training-summary-metrics" data-ball-total="${section}" style="--summary-columns:${progress?3:2}" title="Erfassung seit ${ballTrainingSince(section)}" aria-label="${esc(ballTrainingText(section))} · Erfassungsbeginn anzeigen">${metric(trainingSummaryDuration(totals.milliseconds),'Trainingszeit','data-summary-time')}${metric(totals.days,'Trainingstage','data-summary-days')}${progress?metric(Math.round(progress.percent)+' %','Fortschritt'):''}</button>`;
}
function refreshBallTimeDisplay(){
 document.querySelectorAll('[data-ball-total]').forEach(button=>{
  const section=button.dataset.ballTotal||'ball',text=ballTrainingText(section);
  if(button.classList.contains('training-summary-metrics')){const totals=ballTrainingTotals(section);button.querySelector('[data-summary-time]').textContent=trainingSummaryDuration(totals.milliseconds);button.querySelector('[data-summary-days]').textContent=totals.days;}else if(button.textContent!==text)button.textContent=text;
  button.title='Erfassung seit '+ballTrainingSince(section);button.setAttribute('aria-label',text+' · Erfassungsbeginn anzeigen');
 });
}
function showBallTrainingStart(event){const button=event.target.closest('[data-ball-total]');if(!button)return;const section=button.dataset.ballTotal||'ball',totals=ballTrainingTotals(section);toast('Erfassung seit '+ballTrainingSince(section)+(totals.unknownDays?' · Für '+totals.unknownDays+' ältere Trainingstage ist keine Dauer gespeichert.':''))}
