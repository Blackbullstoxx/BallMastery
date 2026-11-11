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
function ballTrainingTotals(section='ball'){
 if(section!=='ball'){
  const data=state.cardTraining,values=Object.entries(data?.days||{}).filter(([day])=>validTrainingDate(day)&&day<=date()).map(([,row])=>row[section]||0);
  return {milliseconds:values.reduce((sum,ms)=>sum+ms,0),days:values.filter(ms=>ms>0).length,since:data?.since||date()};
 }
 const data=ballTrainingState(),values=Object.values(data.days);
 return {milliseconds:values.reduce((sum,ms)=>sum+ms,0),days:values.filter(ms=>ms>0).length,since:data.since};
}
function ballTrainingText(section='ball'){
 const totals=ballTrainingTotals(section),seconds=Math.floor(totals.milliseconds/1000),minutes=Math.floor(seconds/60),hours=Math.floor(minutes/60);
 const duration=hours?`${hours} Std. ${minutes%60} Min.`:minutes?`${minutes} Min.`:seconds?`${seconds} Sek.`:'0 Min.';
 return `Gesamt: schon ${duration} / ${totals.days} ${totals.days===1?'Trainingstag':'Trainingstage'}`;
}
function ballTrainingSince(section='ball'){return ballTrainingTotals(section).since.split('-').reverse().join('.')}
function ballTrainingMarkup(section){
 if(!['ball','juggling','feints'].includes(section))return '';
 return `<button type="button" class="ball-training-total" data-ball-total="${section}" title="Erfassung seit ${ballTrainingSince(section)}" aria-label="${esc(ballTrainingText(section))} · Erfassungsbeginn anzeigen">${esc(ballTrainingText(section))}</button>`;
}
function refreshBallTimeDisplay(){
 document.querySelectorAll('[data-ball-total]').forEach(button=>{
  const section=button.dataset.ballTotal||'ball',text=ballTrainingText(section);
  if(button.textContent!==text)button.textContent=text;
  button.title='Erfassung seit '+ballTrainingSince(section);button.setAttribute('aria-label',text+' · Erfassungsbeginn anzeigen');
 });
}
function showBallTrainingStart(event){const button=event.target.closest('[data-ball-total]');if(button)toast('Erfassung seit '+ballTrainingSince(button.dataset.ballTotal||'ball'))}
