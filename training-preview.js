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
 return `<section class="card training-summary" aria-label="Bisheriges Training ${sectionNames[section]}">${section==='ball'?ballMasteryMarkup():''}${ballTrainingMarkup(section)}</section>`;
}
function previewBallExercise(d){
 const stats=previewScoreStats(d.key,d.work),days=practiceDayList(d.key).length;
 return `<small class="exercise-context">${esc(d.kind)} · ${levels[(drills.find(x=>x.id===d.key)||drills[state.current]).level]}</small><h3>${esc(d.name)}</h3><p class="training-prescription"><span>${d.total} × ${d.work} s</span>${trainingModeCue(d)}<span aria-hidden="true">·</span><span>${d.rest} s Pause</span></p>${video(d)}<div class="training-metrics">${previewMetric(days,days===1?'Tag':'Tage')}${previewMetric(stats.record,'Rekord')}${previewTrend(d.key,d.work,stats.rows)}</div>`;
}
function previewJugglingTechnique(d){
 const stats=previewScoreStats(d.key,0),average=stats.average===null?null:stats.average.toLocaleString('de-DE',{maximumFractionDigits:1,useGrouping:false});
 return `<section class="card training-exercise juggling-technique" aria-label="${esc(d.name)}"><h3>${esc(d.name)}</h3><p class="training-prescription">${(d.work/60).toLocaleString('de-DE',{maximumFractionDigits:2})} Min.</p>${d.noScore?'':`<div class="training-metrics training-metrics-four">${previewMetric(stats.today,'Heute')}${previewMetric(average,'Ø letzte 7',`Durchschnitt der Tagesbestwerte der letzten sieben erfassten Trainingstage dieser Technik; bisher ${stats.count} ${stats.count===1?'Eintrag':'Einträge'}. Trainingsfreie Tage zählen nicht als null.`)}${previewMetric(stats.record,'Rekord')}${previewTrend(d.key,0,stats.rows)}</div>${previewScoreInput(d.key,0)}`}</section>`;
}
function trainingPreview(section,entries){
 const start=`<button class="primary" id="start" ${entries.length?'':'disabled'}>Los geht’s</button>`;
 if(section==='juggling')return `${previewTrainingSummary(section)}${entries.map(previewJugglingTechnique).join('')}<div class="training-shared-start">${start}</div>`;
 return `${previewTrainingSummary(section)}<section class="card training-exercise">${section==='ball'?(entries.length?previewBallExercise(entries[0]):'<p>Keine Übungen ausgewählt.</p>'):`<h3>Finte frei wählen</h3><p class="training-prescription">${state.feintSets} × ${state.feintWork} s · ${state.feintRest} s Pause</p>`}${start}</section>`;
}
