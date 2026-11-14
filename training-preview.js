'use strict';
// Presentation-only summaries of existing records; never save derived metrics.
function previewScoreStats(key,duration){
 const rows=recordSeries(state.scores||[],key,duration,0,date()),recent=rows.slice(-7);
 return {rows,today:rows.find(row=>row.date===date())?.value??null,record:rows.length?Math.max(...rows.map(row=>row.value)):null,average:recent.length?recent.reduce((sum,row)=>sum+row.value,0)/recent.length:null,count:recent.length};
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
 return `<section class="card training-summary" aria-label="Bisheriges Training ${sectionNames[section]}">${trainingSummaryMetrics(section)}</section>`;
}
function previewBallExercise(d){
 const stats=previewScoreStats(d.key,d.work),days=practiceDayList(d.key).length;
 return `<small class="exercise-context">${esc(d.kind)} · ${levels[(drills.find(x=>x.id===d.key)||drills[state.current]).level]}</small><h3>${esc(d.name)}</h3><p class="training-prescription"><span>${d.total} × ${d.work} s</span>${trainingModeCue(d)}<span aria-hidden="true">·</span><span>${d.rest} s Pause</span></p>${video(d)}<div class="training-metrics">${previewMetric(days,days===1?'Tag':'Tage')}${previewMetric(stats.record,'Rekord')}${previewTrend(d.key,d.work,stats.rows)}</div>`;
}
function previewJugglingTechnique(d,options={}){
 const stats=previewScoreStats(d.key,0),average=stats.average===null?null:stats.average.toLocaleString('de-DE',{maximumFractionDigits:0,useGrouping:false});
 return `<section class="card training-exercise juggling-technique" aria-label="${esc(d.name)}"><div class="technique-heading"><h3>${esc(d.name)}</h3>${options.status?`<span class="technique-status">${esc(options.status)}</span>`:''}</div><p class="training-prescription">${options.subtitle||`${(d.work/60).toLocaleString('de-DE',{maximumFractionDigits:2})} Min.`}</p>${options.timer||''}${d.noScore?'':`<div class="training-metrics training-metrics-four">${previewMetric(stats.today,'Heute')}${previewMetric(average,'Ø letzte 7',`Durchschnitt der Tagesbestwerte der letzten sieben erfassten Trainingstage dieser Technik; bisher ${stats.count} ${stats.count===1?'Eintrag':'Einträge'}. Trainingsfreie Tage zählen nicht als null.`)}${previewMetric(stats.record,'Rekord')}${previewTrend(d.key,0,stats.rows)}</div><p class="technique-input-label">Kontakte am Stück</p>${previewScoreInput(d.key,0)}`}</section>`;
}
function trainingPreview(section,entries){
 const start=`<button class="primary" id="start" ${entries.length?'':'disabled'}>Los geht’s</button>`;
 if(section==='juggling')return `${previewTrainingSummary(section)}${entries.map(d=>previewJugglingTechnique(d)).join('')}<div class="training-shared-start">${start}</div>`;
 return `${previewTrainingSummary(section)}<section class="card training-exercise">${section==='ball'?(entries.length?previewBallExercise(entries[0]):'<p>Keine Übungen ausgewählt.</p>'):`<h3>Finte frei wählen</h3><p class="training-prescription">${state.feintSets} × ${state.feintWork} s · ${state.feintRest} s Pause</p>`}${start}</section>`;
}

// Reuse the same technique card while preparing, timing, reviewing and revisiting.
function jugglingProgressMarkup(value,index=value.index){
 const starts=value.plan.map((d,i)=>d.set===1?i:-1).filter(i=>i>=0),completed=new Set(value.completedSets||[]);
 const done=starts.filter((start,n)=>value.plan.slice(start,starts[n+1]??value.plan.length).every((_,i)=>completed.has(start+i))).length;
 const position=starts.filter(i=>i<=index).length;
 return `<section class="card technique-progress" aria-label="Trainingsfortschritt"><div><span>Übung ${position} von ${starts.length}</span><span>${done} von ${starts.length} erledigt</span></div><progress value="${done}" max="${starts.length}" aria-label="Abgeschlossene Jonglierübungen"></progress></section>`;
}
function jugglingRunnerMarkup(value,back,last){
 const d=value.plan[value.index],review=value.phase==='review',ready=value.phase==='ready',timing=!review&&!ready;
 const status=review?'Geschafft ✓':value.paused?'Pausiert':ready?'':value.phase==='count'?'Bereit machen':'Läuft';
 const card=previewJugglingTechnique(d,{status,subtitle:review?'Trainingszeit absolviert':'',timer:timing?timerMarkup():''});
 const action=ready?'<button class="primary" id="ready">Los geht’s</button>':review?`<button class="primary" id="${last?'finish-area':'next-drill'}">${last?'Jonglieren abschließen':'Nächste Übung ansehen'}</button>`:value.paused?'<div class="two"><button id="restart">Neustart</button><button class="primary" id="resume">Fortsetzen</button></div>':'<button class="primary timer-pause" id="pause"><span aria-hidden="true">Ⅱ</span> Pause</button>';
 const repeat=value.repeatMode?`<div class="two repeat-navigation"><button id="repeat-prev" ${repeatTarget(-1)<0?'disabled':''}>Zurück</button><button id="repeat-next" ${repeatTarget(1)<0?'disabled':''}>Vor</button></div>`:'';
 return `${previewTrainingSummary('juggling')}${jugglingProgressMarkup(value)}${card}<div class="technique-actions">${action}${repeat}${canEndRepeat()?'<button class="back-button" id="end-repeat">Training beenden</button>':''}${back&&!value.repeatMode?'<button class="back-button" id="previous-drill">Zurück</button>':''}</div>`;
}
function jugglingHistoryMarkup(value,index,hasPrevious){
 const d=value.plan[index];
 return `${previewTrainingSummary('juggling')}${jugglingProgressMarkup(value,index)}${previewJugglingTechnique(d,{status:'Geschafft ✓',subtitle:'Trainingszeit absolviert'})}<div class="two technique-actions">${hasPrevious?'<button id="history-back">Zurück</button>':''}<button class="primary" id="history-current">Zum aktuellen Training</button></div>`;
}
