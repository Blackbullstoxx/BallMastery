'use strict';
function validWeeklyLearning(value){
 if(value===null)return true;
 return !!value&&typeof value.key==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value.since)&&Number.isFinite(scoreDay(value.since))&&Array.isArray(value.entries)&&value.entries.every(row=>row&&typeof row.scoreId==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(row.date)&&Number.isFinite(scoreDay(row.date))&&row.date>=value.since&&Number.isInteger(row.duration)&&row.duration>0&&row.duration<=600&&Number.isInteger(row.value)&&row.value>=0&&row.value<=99999);
}
function normalizeWeeklyLearning(value){return validWeeklyLearning(value)?value:null}
function ensureWeeklyLearning(){
 if(isReadOnly()||!drills.length||state.finished)return;
 const key=drills[state.current]?.id;if(!key)return;
 if(!validWeeklyLearning(state.weeklyLearning)||state.weeklyLearning?.key!==key)state.weeklyLearning={key,since:date(),entries:[]};
}
function weeklyLearningContext(key){
 const item=run?.plan?.[Number.isInteger(run.historyIndex)?run.historyIndex:run.index];
 return !isReadOnly()&&item?.kind==='Wochenübung'&&!item.colour&&item.key===key&&drills[state.current]?.id===key&&!state.finished;
}
function recordWeeklyLearningScore(key,duration,value,scoreId){
 if(!weeklyLearningContext(key))return false;ensureWeeklyLearning();
 const phase=state.weeklyLearning;if(!phase||phase.key!==key)return false;
 const existing=phase.entries.find(row=>row.date===date()&&row.duration===duration);
 if(existing){if(value<=existing.value)return false;existing.value=value;existing.scoreId=scoreId}
 else phase.entries.push({date:date(),duration,value,scoreId});
 return true;
}
function correctWeeklyLearningScore(scoreId,value){if(isReadOnly())return;for(const row of state.weeklyLearning?.entries||[])if(row.scoreId===scoreId)row.value=value}
function removeWeeklyLearningScore(scoreId){if(isReadOnly()||!state.weeklyLearning)return;state.weeklyLearning.entries=state.weeklyLearning.entries.filter(row=>row.scoreId!==scoreId)}
function weeklyLearningTrend(phase,key,duration,today){
 if(!phase||!validWeeklyLearning(phase)||phase.key!==key)return null;
 const rows=recordSeries(phase.entries.map(row=>({...row,key})),key,duration,0,today);if(rows.length<3)return null;
 const baseline=rows[0],recent=rows.length===3?rows.slice(1):rows.slice(-3),current=recordMedian(recent),difference=current-baseline.value;
 return {baseline,recent,current,difference,percent:baseline.value===0?null:difference/baseline.value*100,direction:difference>=1?'up':difference<=-1?'down':'flat',early:rows.length<=4,days:rows.length};
}
function weeklyLearningMarkup(d){
 if(d?.kind!=='Wochenübung'||d.colour)return '';
 const trend=weeklyLearningTrend(state.weeklyLearning,d.key,d.work,date());if(!trend)return '';
 const label={up:'steigend',flat:'etwa gleich',down:'fallend'}[trend.direction],format=n=>n.toLocaleString('de-DE',{maximumFractionDigits:1}),day=s=>s.split('-').reverse().join('.');
 const change=trend.direction==='flat'?'':trend.percent===null?(trend.difference>0?'+':'−')+format(Math.abs(trend.difference))+' Wdh.':(trend.percent>0?'+':'−')+Math.round(Math.abs(trend.percent))+' %';
 return `<details class="record-trend-details weekly-learning"><summary><span>Seit Beginn:</span><span class="record-trend-item" aria-label="Lerntrend: ${label}${change?', '+change:''}">${recordTrendArrow(trend.direction)}${change?`<span>${change}</span>`:''}</span></summary><div class="record-trend-explanation">${trend.early?'<p>Frühe Tendenz aus wenigen Einträgen.</p>':''}<p>Ausgangspunkt: ${format(trend.baseline.value)} Wiederholungen am ${day(trend.baseline.date)}. Vergleich: ${format(trend.current)} aus ${trend.recent.length} erfassten Tagen (${day(trend.recent[0].date)}–${day(trend.recent.at(-1).date)}).</p><p>Am dritten Tag zählt der Mittelwert aus Tag 2 und 3, danach der Median der letzten drei Tage. Ein Unterschied von mindestens einer Wiederholung bestimmt die Pfeilrichtung; die Prozentzahl dient nur zur Anzeige.</p><p>Nur eingetragene Werte dieser Lernphase mit ${d.work} Sekunden Satzdauer ohne Farberkennung. Fehlende Einträge zählen nicht als null. Der Pfeil bewertet die Wiederholungszahl, nicht die Ausführungsqualität.</p></div></details>`;
}
function weeklyLearningForScore(key,duration){
 const item=run?.plan?.[Number.isInteger(run.historyIndex)?run.historyIndex:run.index];
 return item?.key===key&&item.kind==='Wochenübung'&&!item.colour?weeklyLearningMarkup({...item,work:duration}):'';
}
