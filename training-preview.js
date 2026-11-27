'use strict';
// Presentation-only summaries of existing records; never save derived metrics.
function previewScoreStats(key,duration){
 const rows=recordSeries(state.scores||[],key,duration,0,date()),recent=rows.slice(-5);
 return {rows,today:rows.find(row=>row.date===date())?.value??null,record:rows.length?Math.max(...rows.map(row=>row.value)):null,level:recordCurrentLevel(rows),count:recent.length};
}
function previewMetric(value,label,description=''){
 return `<div class="training-metric"${description?` title="${esc(description)}" aria-label="${esc(label+': '+description)}"`:''}><strong${String(value??'').length>5?' class="training-metric-long"':''}>${value??'–'}</strong><span>${label}</span></div>`;
}
function previewTrend(key,duration,rows){
 const ball=duration>0,info=ball?recordBallTrend(key,duration):null,trend=ball?info?.trend:recordWindowTrend(rows,6);
 const direction=trend?{up:'steigend',flat:'etwa gleich',down:'fallend'}[trend.direction]:'noch nicht genügend Einträge';
 const explanation=ball?recordBallTrendExplanation(info):recordJugglingTrendMarkup(rows)||'<p>Trend ab 12 erfassten Tagesbestwerten. Fehlende Einträge zählen nicht als null.</p>';
 return `<details class="training-metric training-trend"><summary aria-label="Trend: ${direction}"><strong>${trend?recordTrendArrow(trend.direction):'–'}</strong><span>Trend</span></summary><div class="training-trend-info">${explanation}</div></details>`;
}
function previewScoreInput(key,duration){
 return `<form class="scoreform preview-scoreform" data-score="${esc(key)}" data-duration="${duration}" data-colour-score="false"><input type="number" min="0" max="99999" required aria-label="${esc(techNames[key])}: Kontakte" placeholder="Kontakte"><button>Eintragen</button></form>`;
}
function previewTrainingSummary(section){
 return `<section class="card training-summary" aria-label="Bisheriges Training ${sectionNames[section]}">${trainingSummaryMetrics(section)}</section>${section==='juggling'&&typeof individualJugglingMarkup==='function'?individualJugglingMarkup():''}`;
}
function ballExerciseBadge(d){
 const drill=typeof drills!=='undefined'?drills.find(row=>row.id===d.key):null;
 const level=drill?.level??d.level;
 const label=d.kind.startsWith('Wiederholung')?'Wiederholung':d.kind==='Feste Zusatzübung'?'Zusatzübung':d.kind;
 const stars=Number.isInteger(level)&&level>=0&&level<4?'★'.repeat(level+1):'';
 return `<span class="badge ball-exercise-badge"><span>${esc(label)}</span>${stars?`<span class="ball-level-stars" aria-label="Stufe ${level+1} von 4">${stars}</span>`:''}</span>`;
}
function ballPrescription(d,nextSet){
 return `<p class="training-prescription ball-prescription"><span>${d.total} × ${d.work} s</span>${trainingModeCue(nextSet||d,!!nextSet)}<span aria-hidden="true">·</span><span>${d.rest} s Pause</span></p>`;
}
function previewBallExercise(d){
 const stats=previewScoreStats(d.key,d.work),days=practiceDayList(d.key).length;
 return `<div class="exercise-context">${ballExerciseBadge(d)}</div><h3>${esc(d.name)}</h3>${ballPrescription(d)}${video(d)}<div class="training-metrics">${previewMetric(days,days===1?'Tag':'Tage')}${previewMetric(stats.record,'Rekord')}${previewTrend(d.key,d.work,stats.rows)}</div>`;
}
function previewJugglingTechnique(d,options={}){
 const stats=previewScoreStats(d.key,0),level=stats.level===null?null:stats.level.toLocaleString('de-DE',{maximumFractionDigits:0,useGrouping:false});
 return `<section class="card training-exercise juggling-technique" aria-label="${esc(d.name)}"><div class="technique-heading"><h3>${esc(d.name)}</h3>${options.status?`<span class="technique-status">${esc(options.status)}</span>`:''}</div><p class="training-prescription">${options.subtitle||`${(d.work/60).toLocaleString('de-DE',{maximumFractionDigits:2})} Min.`}</p>${options.timer||''}${d.noScore?'':`<div class="training-metrics training-metrics-four">${previewMetric(stats.today,'Heute')}${previewMetric(level,'Form',`Median der Tagesbestwerte der letzten fünf erfassten Trainingstage dieser Technik; bisher ${stats.count} ${stats.count===1?'Eintrag':'Einträge'}. Trainingsfreie Tage zählen nicht als null.`)}${previewMetric(stats.record,'Rekord')}${previewTrend(d.key,0,stats.rows)}</div><p class="technique-input-label">Kontakte am Stück</p>${previewScoreInput(d.key,0)}`}</section>`;
}
function exerciseProgressMarkup(value,detail,completed,maximum,progressLabel,position=openExercisePosition(value)){
 const arrow=(direction,id,label,path)=>{
  const enabled=!value.individual&&exerciseTarget(value,direction)>=0;
  return `<button type="button" class="exercise-arrow" id="${id}" aria-label="${label}"${enabled?'':' disabled'}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}"/></svg></button>`;
 };
 const wideLabels=[position,detail].some(label=>/\d{2}/.test(label));
 const completionCount=detail.endsWith(' erledigt');
 const starts=value.individual?[]:exerciseStarts(value);
 let progress=`<progress value="${completed}" max="${maximum}" aria-label="${progressLabel}"></progress>`;
 if(starts.length>1){
  const completedSets=new Set(value.completedSets||[]);
  const segments=starts.map((start,n)=>{
   const end=starts[n+1]??value.plan.length;
   const count=value.plan.slice(start,end).filter((_,i)=>completedSets.has(start+i)).length;
   return `<progress value="${count}" max="${end-start}" aria-hidden="true"></progress>`;
  }).join('');
  progress=`<div class="exercise-progress-segments" role="progressbar" aria-label="${progressLabel}" aria-valuenow="${completed}" aria-valuemax="${maximum}">${segments}</div>`;
 }
 return `<section class="card technique-progress exercise-progress" aria-label="Trainingsfortschritt"><div class="exercise-progress-row${wideLabels?' exercise-progress-row-wide':''}${completionCount?' exercise-progress-row-completion':''}" role="group" aria-label="Übung wechseln">${arrow(-1,'exercise-prev','Vorherige Übung','M15 5l-7 7 7 7')}<div class="exercise-progress-center"><div class="exercise-progress-labels"><strong>${esc(position)}</strong><span>${esc(detail)}</span></div>${progress}</div>${arrow(1,'exercise-next','Nächste Übung','M9 5l7 7-7 7')}</div></section>`;
}
function setProgressMarkup(value){
 const row=value.plan[value.index];
 return exerciseProgressMarkup(value,`Satz ${row.set} von ${row.total}`,trainingProgress(value),value.plan.length,'Abgeschlossene Sätze');
}
function trainingPreview(section,entries){
 const start=`<button class="primary" id="start" ${entries.length?'':'disabled'}>Los geht’s</button>`;
 const preview={plan:entries,index:0};
 const progress=entries.length?(section==='juggling'?jugglingProgressMarkup(preview):setProgressMarkup(preview)):'';
 if(section==='juggling'){
  const technique=entries.length?previewJugglingTechnique(entries[0]):'';
  return `${previewTrainingSummary(section)}${progress}${technique}<div class="training-shared-start">${start}</div>`;
 }
 return `${previewTrainingSummary(section)}${progress}<section class="card training-exercise">${section==='ball'?(entries.length?previewBallExercise(entries[0]):'<p>Keine Übungen ausgewählt.</p>'):`<h3>Finte frei wählen</h3><p class="training-prescription">${state.feintSets} × ${state.feintWork} s · ${state.feintRest} s Pause</p>`}</section><div class="training-shared-start">${start}</div>`;
}

function jugglingProgressMarkup(value){
 const starts=exerciseStarts(value),completed=new Set(value.completedSets||[]);
 const done=starts.filter((start,n)=>value.plan.slice(start,starts[n+1]??value.plan.length).every((_,i)=>completed.has(start+i))).length;
 return exerciseProgressMarkup(value,`${done} von ${starts.length} erledigt`,done,starts.length,'Abgeschlossene Jonglierübungen');
}
function nextTrainingAction(value,next=nextOpenTrainingSet(value)){
 if(next<0)return '';
 const current=value.plan[value.index];
 const sameExercise=next-value.plan[next].set===value.index-current.set;
 return `<button type="button" class="primary" id="next-drill">${sameExercise?'Nächsten Satz ansehen':'Nächste Übung'}</button>`;
}
function trainingReviewActions(action,repeat,hasNextExercise){
 return hasNextExercise&&repeat?`<div class="two training-review-actions">${repeat}${action}</div>`:action+repeat;
}
function jugglingRunnerMarkup(value,last){
 const d=value.plan[value.index],review=value.phase==='review',ready=value.phase==='ready',timing=!review&&!ready;
 const status=review?'Geschafft ✓':value.paused?'Pausiert':ready?'':value.phase==='count'?'Bereit machen':'Läuft';
 const card=previewJugglingTechnique(d,{status,subtitle:value.extraSeconds?`Zusatzzeit · ${(value.extraSeconds/60).toLocaleString('de-DE')} Min.`:'',timer:timing?timerMarkup():review?jugglingDoneTimerMarkup():''});
 const action=ready?'<button class="primary" id="ready">Los geht’s</button>':review?last?'<button type="button" class="primary" id="finish-area">Jonglieren abschließen</button>':nextTrainingAction(value):value.paused?pauseActionsMarkup():'<button class="primary timer-pause" id="pause"><span aria-hidden="true">Ⅱ</span> Pause</button>';
 const repeat=exerciseRepeatMarkup(value);
 const extra=review&&!value.exerciseRepeat&&(value.completedSets||[]).includes(value.index)?jugglingExtraMarkup(value):'';
 return `${previewTrainingSummary('juggling')}${jugglingProgressMarkup(value)}${card}<div class="technique-actions">${trainingReviewActions(action,repeat,review&&!last&&!!action)}${value.extraSeconds?'<button class="back-button" id="juggling-extra-end">Zusatzzeit beenden</button>':''}${extra}${canEndRepeat()?'<button class="back-button" id="end-repeat">Training beenden</button>':''}</div>`;
}
function exerciseRepeatMarkup(value){
 if(value.exerciseRepeat)return '<button class="back-button" id="repeat-return">Zum Tagesplan</button>';
 if(value.phase!=='review'||!exerciseComplete(value))return '';
 return '<button class="back-button" id="repeat-exercise">Erneut starten</button>';
}
function pauseActionsMarkup(){return '<div class="two runner-pause-actions"><button class="primary" id="resume">Fortsetzen</button><button id="restart">Neustart</button></div>'}
function pausedBallMedia(player){
 const videoButton=`<button type="button" class="pause-media-switch pause-media-open" aria-label="Video ansehen">
  <span class="pause-media-icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 5v14l12-7z" fill="currentColor"/></svg>Video</span>
 </button>`;
 return `<div class="pause-media">
  <div class="pause-media-stage">
   <div class="pause-media-side pause-media-timer">${timerMarkup(videoButton)}</div>
   <div class="pause-media-side pause-media-video" inert aria-hidden="true">
    ${player}
    <button type="button" class="pause-media-switch pause-media-return" aria-label="Zurück zum Timer">
     <span class="pause-media-icon"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>Timer</span>
    </button>
   </div>
  </div>
 </div>`;
}
function bindPausedBallMedia(root){
 const media=root.querySelector('.pause-media');
 if(!media)return;
 const label=media.querySelector('.timer-label');
 // Align to the bottom of the visible text, including the descender of g.
 const font=getComputedStyle(label),measure=document.createElement('canvas').getContext('2d');
 if(measure){
  measure.font=`${font.fontWeight} ${font.fontSize} ${font.fontFamily}`;
  const descent=measure.measureText(label.textContent).actualBoundingBoxDescent;
  const baseline=label.querySelector('.pause-media-baseline').offsetTop;
  if(Number.isFinite(descent))label.parentElement.style.setProperty('--label-ink-bottom',`${baseline+descent-label.offsetHeight}px`);
 }
 media.addEventListener('click',event=>{
  const button=event.target.closest('.pause-media-switch');
  if(!button)return;
  const videoSide=media.querySelector('.pause-media-video');
  const timerSide=media.querySelector('.pause-media-timer');
  const showingVideo=media.classList.toggle('is-video');
  videoSide.inert=!showingVideo;
  videoSide.setAttribute('aria-hidden',!showingVideo);
  timerSide.inert=showingVideo;
  timerSide.setAttribute('aria-hidden',showingVideo);
  if(!showingVideo)videoSide.querySelector('video')?.pause();
  if(event.detail===0){
   (showingVideo?videoSide:timerSide).querySelector('.pause-media-switch').focus({preventScroll:true});
  }
 });
}
function ballRunnerMarkup(value,last){
 const d=value.plan[value.index],run=value,betweenExercises=value.phase==='rest'&&d.set===d.total,stats=previewScoreStats(d.key,d.work),days=practiceDayList(d.key).length;
 const status=(value.skippedSets||[]).includes(value.index)?(value.masteredWeekly?.includes(d.key)?'Gemeistert':'Gewechselt'):value.phase==='review'?(exerciseComplete(value)?'Geschafft ✓':'Satz geschafft ✓'):value.paused?'Pausiert':value.phase==='ready'?(value.optionalWeekly===d.key&&d.kind==='Wochenübung'?'Heute freiwillig':''):value.phase==='count'?'Bereit machen':'Läuft';
 const metrics=d.colour?scoreForm(d.key,d.work,true):`<div class="training-metrics training-metrics-four">${previewMetric(stats.today,'Heute')}${previewMetric(stats.record,'Rekord')}${previewMetric(days,'Trainingstage')}${previewTrend(d.key,d.work,stats.rows)}</div><p class="technique-input-label">Wiederholungen</p><form class="scoreform preview-scoreform" data-score="${esc(d.key)}" data-duration="${d.work}" data-colour-score="false"><input type="number" min="0" max="99999" required aria-label="${esc(d.name)}: Wiederholungen" placeholder="Wiederholungen"><button>Eintragen</button></form>`;
 const next=nextOpenTrainingSet(run),finishing=last&&run.phase==='review',mastery=masteredControl(d),weeklyPanel=mastery.startsWith('<section');
 const repeat=exerciseRepeatMarkup(value);
 const showVideo=['ready','review'].includes(value.phase);
 const player=showVideo||value.paused?video(d):'';
 const media=showVideo?player:value.paused&&player?pausedBallMedia(player):timerMarkup();
 const sameExercise=next>=0&&next-value.plan[next].set===value.index-d.set;
 const nextSet=value.phase==='rest'&&sameExercise?value.plan[next]:null;
 const reviewAction=last?`<button class="primary" id="finish-area">${sectionNames[run.section||activeSection]} abschließen</button>`:
  nextTrainingAction(value,next);
 const action=run.phase==='ready'?'<button class="primary" id="ready">Los geht’s</button>':(run.phase==='review'||betweenExercises)?reviewAction:run.phase==='done'?'<button class="primary" id="close">Erneut trainieren</button>':run.paused?pauseActionsMarkup():'<button class="primary timer-pause" id="pause"><span aria-hidden="true">Ⅱ</span> Pause</button>';
 return `${previewTrainingSummary('ball')}${setProgressMarkup(value)}<section class="card training-exercise ball-technique"><div class="technique-heading">${ballExerciseBadge(d)}${status?`<span class="technique-status">${status}</span>`:''}</div><h3>${esc(d.name)}</h3>${ballPrescription(d,nextSet)}${colourPerception.summary()}${media}${metrics}${weeklyPanel?'':mastery}</section><div class="technique-actions">${trainingReviewActions(action,repeat,run.phase==='review'&&!last&&next>=0&&!sameExercise)}${!finishing&&canFinishTraining(value)?'<button type="button" class="back-button" id="finish-area">Ballbeherrschung für heute abschließen</button>':''}${canEndRepeat()?'<button class="back-button" id="end-repeat">Training beenden</button>':''}</div>${weeklyPanel?mastery:''}`;
}

function feintsRunnerMarkup(value,last){
 const d=value.plan[value.index],ready=value.phase==='ready',review=value.phase==='review';
 const status=review?'Geschafft ✓':value.paused?'Pausiert':ready?'':value.phase==='count'?'Bereit machen':'Läuft';
 const action=ready?'<button class="primary" id="ready">Los geht’s</button>':review?last?'<button type="button" class="primary" id="finish-area">Finten abschließen</button>':nextTrainingAction(value):value.paused?pauseActionsMarkup():'<button class="primary timer-pause" id="pause"><span aria-hidden="true">Ⅱ</span> Pause</button>';
 return `${previewTrainingSummary('feints')}${setProgressMarkup(value)}<section class="card training-exercise"><div class="technique-heading"><h3>Finten</h3><span class="technique-status">${status}</span></div><p class="training-prescription">${d.total} × ${d.work} s · ${d.rest} s Pause</p>${!ready&&!review?timerMarkup():''}</section><div class="technique-actions">${action}${exerciseRepeatMarkup(value)}${canEndRepeat()?'<button class="back-button" id="end-repeat">Training beenden</button>':''}</div>`;
}
