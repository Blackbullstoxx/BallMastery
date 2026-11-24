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
 return `<section class="card training-exercise juggling-technique" aria-label="${esc(d.name)}"><div class="technique-heading"><h3>${esc(d.name)}</h3>${options.status?`<span class="technique-status">${esc(options.status)}</span>`:''}</div><p class="training-prescription">${options.subtitle||`${(d.work/60).toLocaleString('de-DE',{maximumFractionDigits:2})} Min.`}</p>${options.timer||''}${d.noScore?'':`<div class="training-metrics training-metrics-four">${previewMetric(stats.today,'Heute')}${previewMetric(level,'Form',`Median der Tagesbestwerte der letzten fünf erfassten Trainingstage dieser Technik; bisher ${stats.count} ${stats.count===1?'Eintrag':'Einträge'}. Trainingsfreie Tage zählen nicht als null.`)}${previewMetric(stats.record,'Rekord')}${previewTrend(d.key,0,stats.rows)}</div><p class="technique-input-label">Kontakte am Stück</p>${previewScoreInput(d.key,0)}`}${options.afterInput||''}</section>`;
}
function trainingNavigationMarkup(value){
 const back=exerciseTarget(value,-1)>=0,forward=exerciseTarget(value,1)>=0;
 if(!back&&!forward)return '';
 return `<div class="repeat-navigation" role="group" aria-label="Übung wechseln">${back?'<button type="button" id="exercise-prev"><span aria-hidden="true">←</span> Zurück</button>':''}${forward?'<button type="button" id="exercise-next">Vor <span aria-hidden="true">→</span></button>':''}</div>`;
}
function trainingPreview(section,entries){
 const start=`<button class="primary" id="start" ${entries.length?'':'disabled'}>Los geht’s</button>`;
 if(section==='juggling'){
  const preview={plan:entries,index:0};
  const technique=entries.length?jugglingProgressMarkup(preview)+previewJugglingTechnique(entries[0]):'';
  return `${previewTrainingSummary(section)}${technique}<div class="training-shared-start">${start}${trainingNavigationMarkup(preview)}</div>`;
 }
 return `${previewTrainingSummary(section)}<section class="card training-exercise">${section==='ball'?(entries.length?previewBallExercise(entries[0]):'<p>Keine Übungen ausgewählt.</p>'):`<h3>Finte frei wählen</h3><p class="training-prescription">${state.feintSets} × ${state.feintWork} s · ${state.feintRest} s Pause</p>`}${start}${trainingNavigationMarkup({plan:entries,index:0})}</section>`;
}

// Reuse the same technique card while preparing, timing, reviewing and revisiting.
function jugglingProgressMarkup(value){
 const starts=value.plan.map((d,i)=>d.set===1?i:-1).filter(i=>i>=0),completed=new Set(value.completedSets||[]);
 const done=starts.filter((start,n)=>value.plan.slice(start,starts[n+1]??value.plan.length).every((_,i)=>completed.has(start+i))).length;
 return `<section class="card technique-progress" aria-label="Trainingsfortschritt"><div><span>${openExercisePosition(value)}</span><span>${done} von ${starts.length} erledigt</span></div><progress value="${done}" max="${starts.length}" aria-label="Abgeschlossene Jonglierübungen"></progress></section>`;
}
function jugglingRunnerMarkup(value,last){
 const d=value.plan[value.index],review=value.phase==='review',ready=value.phase==='ready',timing=!review&&!ready;
 const status=review?'Geschafft ✓':value.paused?'Pausiert':ready?'':value.phase==='count'?'Bereit machen':'Läuft';
 const card=previewJugglingTechnique(d,{status,subtitle:value.extraSeconds?`Zusatzzeit · ${(value.extraSeconds/60).toLocaleString('de-DE')} Min.`:'',timer:timing?timerMarkup():review?jugglingDoneTimerMarkup():'',afterInput:review?jugglingExtraMarkup(value,last):''});
 const action=ready?'<button class="primary" id="ready">Los geht’s</button>':review?'':value.paused?pauseActionsMarkup():'<button class="primary timer-pause" id="pause"><span aria-hidden="true">Ⅱ</span> Pause</button>';
 const navigation=trainingNavigationMarkup(value);
 const finish=!last&&canFinishTraining(value)?'<button type="button" class="back-button" id="finish-area">Jonglieren abschließen</button>':'';
 return `${previewTrainingSummary('juggling')}${jugglingProgressMarkup(value)}${card}<div class="technique-actions">${action}${value.extraSeconds?'<button class="back-button" id="juggling-extra-end">Zusatzzeit beenden</button>':''}${navigation}${finish}${canEndRepeat()?'<button class="back-button" id="end-repeat">Training beenden</button>':''}</div>`;
}
function pauseActionsMarkup(){return '<div class="two runner-pause-actions"><button class="primary" id="resume">Fortsetzen</button><button id="restart">Neustart</button></div>'}
function ballVideoAction(value){
 return value.paused&&!value.showVideo?'<button class="back-button" id="toggle-video">Video ansehen</button>':'';
}
function ballRunnerMarkup(value,last){
 const d=value.plan[value.index],run=value,previewNext=canPreviewNext(),stats=previewScoreStats(d.key,d.work),days=practiceDayList(d.key).length;
 const status=(value.skippedSets||[]).includes(value.index)?'Gemeistert':value.phase==='review'?'Geschafft ✓':value.paused?'Pausiert':value.phase==='ready'?'':value.phase==='count'?'Bereit machen':'Läuft';
 const metrics=d.colour?scoreForm(d.key,d.work,true):`<div class="training-metrics training-metrics-four">${previewMetric(stats.today,'Heute')}${previewMetric(stats.record,'Rekord')}${previewMetric(days,'Trainingstage')}${previewTrend(d.key,d.work,stats.rows)}</div><p class="technique-input-label">Wiederholungen</p><form class="scoreform preview-scoreform" data-score="${esc(d.key)}" data-duration="${d.work}" data-colour-score="false"><input type="number" min="0" max="99999" required aria-label="${esc(d.name)}: Wiederholungen" placeholder="Wiederholungen"><button>Eintragen</button></form>`;
 const next=nextOpenTrainingSet(run),finishInside=last&&run.phase==='review',mastery=masteredControl(d),weeklyPanel=mastery.startsWith('<section');
 const nextSet=value.phase==='rest'&&next>=0&&next-value.plan[next].set===value.index-d.set?value.plan[next]:null;
 const reviewAction=last?`<button class="primary" id="finish-area">${sectionNames[run.section||activeSection]} abschließen</button>`:
  next>=0?`<button class="primary" id="next-drill">${next-run.plan[next].set===run.index-d.set?'Nächsten Satz ansehen':'Nächste Übung ansehen'}</button>`:'';
 const action=run.phase==='ready'?'<button class="primary" id="ready">Los geht’s</button>':(run.phase==='review'||previewNext)?reviewAction:run.phase==='done'?'<button class="primary" id="close">Erneut trainieren</button>':run.paused?pauseActionsMarkup():'<button class="primary timer-pause" id="pause"><span aria-hidden="true">Ⅱ</span> Pause</button>';
 return `${previewTrainingSummary('ball')}<section class="card technique-progress"><div><span>${openExercisePosition(value)}</span><span>Satz ${d.set} von ${d.total}</span></div><progress value="${trainingProgress(value)}" max="${value.plan.length}" aria-label="Abgeschlossene Sätze"></progress></section><section class="card training-exercise ball-technique"><div class="technique-heading">${ballExerciseBadge(d)}${status?`<span class="technique-status">${status}</span>`:''}</div><h3>${esc(d.name)}</h3>${ballPrescription(d,nextSet)}${colourPerception.summary()}${!['ready','review'].includes(value.phase)?timerMarkup():''}${value.phase==='ready'||value.paused&&value.showVideo?video(d):''}${metrics}${finishInside?`<div class="ball-finish-action">${action}</div>`:''}${weeklyPanel?'':mastery}</section><div class="technique-actions">${finishInside?'':action}${previewNext?(run.paused?pauseActionsMarkup():'<button class="back-button" id="pause">Anhalten</button>'):''}${trainingNavigationMarkup(run)}${!last&&canFinishTraining(value)?'<button type="button" class="back-button" id="finish-area">Ballbeherrschung für heute abschließen</button>':''}${canEndRepeat()?'<button class="back-button" id="end-repeat">Training beenden</button>':''}${ballVideoAction(run)}</div>${weeklyPanel?mastery:''}`;
}

function feintsRunnerMarkup(value,last){
 const d=value.plan[value.index],ready=value.phase==='ready',review=value.phase==='review';
 const status=review?'Geschafft ✓':value.paused?'Pausiert':ready?'':value.phase==='count'?'Bereit machen':'Läuft';
 const action=ready?'<button class="primary" id="ready">Los geht’s</button>':review?last||nextOpenTrainingSet(value)>=0?`<button class="primary" id="${last?'finish-area':'next-drill'}">${last?'Finten abschließen':'Nächsten Satz ansehen'}</button>`:'':value.paused?pauseActionsMarkup():'<button class="primary timer-pause" id="pause"><span aria-hidden="true">Ⅱ</span> Pause</button>';
 return `${previewTrainingSummary('feints')}<section class="card technique-progress"><div><span>Satz ${d.set} von ${d.total}</span></div><progress value="${trainingProgress(value)}" max="${value.plan.length}" aria-label="Abgeschlossene Sätze"></progress></section><section class="card training-exercise"><div class="technique-heading"><h3>Finten</h3><span class="technique-status">${status}</span></div><p class="training-prescription">${d.total} × ${d.work} s · ${d.rest} s Pause</p>${!ready&&!review?timerMarkup():''}</section><div class="technique-actions">${action}${trainingNavigationMarkup(value)}${canEndRepeat()?'<button class="back-button" id="end-repeat">Training beenden</button>':''}</div>`;
}
