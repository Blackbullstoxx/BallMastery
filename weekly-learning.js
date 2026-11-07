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
 // The median pairwise slope uses all recorded days while limiting outlier influence.
 const slopes=[];for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++)slopes.push({value:(rows[j].value-rows[i].value)/(j-i)});
 const slope=recordMedian(slopes),estimatedChange=slope*(rows.length-1);
 return {rows,slope,estimatedChange,direction:estimatedChange>=1-1e-9?'up':estimatedChange<=-1+1e-9?'down':'flat',early:rows.length<=4,days:rows.length};
}
function weeklyLearningMarkup(d){
 if(d?.kind!=='Wochenübung'||d.colour)return '';
 const trend=weeklyLearningTrend(state.weeklyLearning,d.key,d.work,date());if(!trend)return '';
 const label={up:'steigend',flat:'etwa gleich',down:'fallend'}[trend.direction],day=s=>s.split('-').reverse().join('.');
 return `<details class="record-trend-details weekly-learning"><summary><span>Lerntrend:</span><span class="record-trend-item" aria-label="Lerntrend: ${label}">${recordTrendArrow(trend.direction)}</span></summary><div class="record-trend-explanation">${trend.early?'<p>Frühe Tendenz aus wenigen Einträgen.</p>':''}<p>Gemeinsame Entwicklung aus ${trend.days} erfassten Tagen (${day(trend.rows[0].date)}–${day(trend.rows.at(-1).date)}).</p><p>Verglichen werden alle Tagespaare. Ihre Veränderungen werden durch den Abstand in erfassten Trainingstagen geteilt; der mittlere dieser Werte (Median) bestimmt die Entwicklungsrichtung. Ein einzelner ungewöhnlicher Wert hat dadurch weniger Einfluss.</p><p>Grün oder rot ab einer geschätzten Veränderung von einer Wiederholung über den gesamten erfassten Zeitraum, sonst goldgelb. Es ist keine zusätzliche Wiederholung pro Tag erforderlich.</p><p>Nur eingetragene Werte dieser Lernphase mit ${d.work} Sekunden Satzdauer ohne Farberkennung. Fehlende Einträge zählen nicht als null. Der Pfeil bewertet die Wiederholungszahl, nicht die Ausführungsqualität.</p></div></details>`;
}

function weeklyLearningForScore(key,duration){
 const item=run?.plan?.[Number.isInteger(run.historyIndex)?run.historyIndex:run.index];
 return item?.key===key&&item.kind==='Wochenübung'&&!item.colour?weeklyLearningMarkup({...item,work:duration}):'';
}
