'use strict';
function validWeeklyLearning(value){
 if(value===null)return true;
 return !!value&&typeof value.key==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value.since)&&Number.isFinite(scoreDay(value.since))&&(value.trainingDays===undefined||(
  Array.isArray(value.trainingDays)&&value.trainingDays.length<=6&&
  value.trainingDays.every((day,i)=>validTrainingDate(day)&&day>=value.since&&(!i||day>value.trainingDays[i-1]))
 ))&&Array.isArray(value.entries)&&value.entries.every(row=>row&&typeof row.scoreId==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(row.date)&&Number.isFinite(scoreDay(row.date))&&row.date>=value.since&&Number.isInteger(row.duration)&&row.duration>0&&row.duration<=600&&Number.isInteger(row.value)&&row.value>=0&&row.value<=99999);
}
function normalizeWeeklyLearning(value){return validWeeklyLearning(value)?value:null}
function validWeeklyRatingProgress(value){
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.entries(value).every(([key,days])=>
  drills.some(drill=>drill.id===key)&&Array.isArray(days)&&days.length<=6&&days.every((day,i)=>validTrainingDate(day)&&(!i||days[i-1]<day)));
}
function recordWeeklyRatingDays(key,days){
 const progress=(state.weeklyRatingProgress??={});
 const saved=progress[key]||[];
 const merged=[...new Set([...saved,...days])].filter(day=>validTrainingDate(day)&&day<=date()).sort().slice(0,6);
 if(merged.length)progress[key]=merged;
 return merged;
}
function ensureWeeklyLearning(){
 if(isReadOnly()||!drills.length||state.finished)return;
 const key=drills[state.current]?.id;if(!key)return;
 const previous=state.weeklyLearning;
 if(validWeeklyLearning(previous)&&previous?.key===key)return;
 if(previous?.trainingDays?.length&&validWeeklyLearning(previous)&&drills.some(row=>row.id===previous.key))recordWeeklyRatingDays(previous.key,previous.trainingDays);
 const trainingDays=state.weeklyRatingProgress?.[key]||[];
 state.weeklyLearning={key,since:trainingDays[0]||date(),entries:[],...(trainingDays.length?{trainingDays:[...trainingDays]}:{})};
}
function recoverWeeklyRatingDays(data=state){
 if(isReadOnly()||state.finished||!drills.length)return false;
 const key=drills[state.current].id;
 const before=state.weeklyLearning?.key===key?state.weeklyLearning.trainingDays||[]:[];
 ensureWeeklyLearning();
 const phase=state.weeklyLearning;
 const proven=[...(data.weeklyRatingProgress?.[key]||[])];
 if(data.weeklyLearning?.key===key&&validWeeklyLearning(data.weeklyLearning))proven.push(...(data.weeklyLearning.trainingDays||[]));
 // Saved practice counts and best scores prove an exercise was attempted,
 // but do not prove all its scheduled sets were completed.
 for(const [day,areas] of Object.entries(data.completedPlans||{})){
  if(!validTrainingDate(day)||!data.blockDone?.[day]?.includes('ball')||!Array.isArray(areas?.ball))continue;
  const weekly=areas.ball.filter(row=>row?.kind==='Wochenübung'&&row.key===key);
  if(weekly.length>=data.sets&&weekly.some((row,i)=>row.set===1&&row.total===data.sets&&weekly.slice(i,i+row.total).length===row.total&&weekly.slice(i,i+row.total).every((set,n)=>set.set===n+1&&set.total===row.total&&!set.partialBlock)))proven.push(day);
 }
 const overview=data.overviewDay;
 if((overview?.day<date()||data.blockDone?.[overview?.day]?.includes('ball'))&&Object.values(overview.sections?.ball||{}).some(row=>row?.kind==='Wochenübung'&&row.key===key&&Number.isInteger(row.total)&&row.total>0&&row.total<=20&&Array.isArray(row.completed)&&Array.from({length:row.total},(_,i)=>i+1).every(i=>row.completed?.includes(i))))proven.push(overview.day);
 const days=recordWeeklyRatingDays(key,[...before,...proven]);
 if(days.length){phase.trainingDays=days;if(days[0]<phase.since)phase.since=days[0]}
 return days.some(day=>!before.includes(day));
}
// The initial BALL rollout did not record these credits. Count the
// current drill's saved practice dates once per profile.
function backfillWeeklyRatingDays(){
 if(isReadOnly()||state.weeklyRatingBackfilled||!drills.length)return false;
 const key=drills[state.current]?.id;
 if(!key||state.finished)return false;
 const phase=state.weeklyLearning?.key===key?state.weeklyLearning:null;
 const cutOff='2026-11-18';
 const savedDays=[
  ...Object.entries(state.practiceCounts?.[key]||{}).filter(([,n])=>Number.isInteger(n)&&n>0).map(([day])=>day),
  ...(phase?.entries||[]).map(row=>row.date),
  ...Object.entries(state.completedPlans||{}).filter(([day,areas])=>
   state.blockDone?.[day]?.includes('ball')&&areas?.ball?.some(row=>row.key===key&&row.kind==='Wochenübung')
  ).map(([day])=>day)
 ];
 const history=savedDays.filter(day=>
  validTrainingDate(day)&&day<=date()&&day<=cutOff&&(!phase||day>=phase.since)
 );
 const days=[...new Set([...(phase?.trainingDays||[]),...history])].sort().slice(0,6);
 if(days.length){
  state.weeklyLearning={...(phase||{key,since:days[0],entries:[]}),trainingDays:days};
 }
 state.weeklyRatingBackfilled=true;
 return true;
}
// Keep awarded mastery separate from selection changes made in Settings.
function weeklyRatingPosition(data,today=date()){
 const index=data.weeklyRatingIndex??(Number(data.current)||0);
 const phaseDays=(data.weeklyLearning?.trainingDays||[]).filter(day=>day<=today).length;
 const selection=data.weeklyRatingSelection;
 return {index,days:Math.min(6,selection?selection.days+Math.max(0,phaseDays-selection.baseline):phaseDays)};
}
function changeWeeklySelection(index){
 const before=weeklyRatingPosition(state);
 state.weeklyRatingIndex=state.finished?drills.length:before.index;
 state.current=index;state.finished=false;
 ensureWeeklyLearning();
 state.weeklyRatingSelection={days:before.days,baseline:state.weeklyLearning?.trainingDays?.length||0};
}
function creditWeeklyRatingDay(training,voluntary=false){
 if(training.section!=='ball'||training.day!==date()||state.finished||isReadOnly())return;
 const key=drills[state.current]?.id;
 const completed=new Set(training.completedSets||[]);
 const weeklySets=training.plan.flatMap((item,i)=>item.kind==='Wochenübung'&&item.key===key?[i]:[]);
 if(!weeklySets.length||!(voluntary?weeklySets.some(i=>completed.has(i)):weeklySets.every(i=>completed.has(i))))return;
 ensureWeeklyLearning();
 const phase=state.weeklyLearning;
 const days=phase.trainingDays||(phase.trainingDays=[]);
 if(days.length<6&&!days.includes(training.day)&&training.day>=phase.since){
  days.push(training.day);
  days.sort();
  recordWeeklyRatingDays(key,days);
  return true;
 }
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
function weeklyLearningRows(phase,key,duration,today){
 if(!phase||!validWeeklyLearning(phase)||phase.key!==key)return [];
 return recordSeries(phase.entries.map(row=>({...row,key})),key,duration,0,today);
}
function medianPairwiseTrend(rows){
 if(rows.length<3)return null;
 const slopes=[];for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++)slopes.push({value:(rows[j].value-rows[i].value)/(j-i)});
 const slope=recordMedian(slopes),estimatedChange=slope*(rows.length-1);
 return {rows,slope,estimatedChange,direction:estimatedChange>=1-1e-9?'up':estimatedChange<=-1+1e-9?'down':'flat',early:rows.length<=4,days:rows.length};
}
function weeklyLearningInput(phase,key,duration,today){
 const phaseRows=weeklyLearningRows(phase,key,duration,today);
 if(phase&&(!validWeeklyLearning(phase)||phase.key!==key))return {rows:[],historical:false,phaseDays:0};
 if(phaseRows.length>=3)return {rows:phaseRows,historical:false,phaseDays:phaseRows.length};
 const history=recordSeries(state.scores||[],key,duration,0,today).slice(-8);
 return history.length>=3?{rows:history,historical:true,phaseDays:phaseRows.length}:{rows:phaseRows,historical:false,phaseDays:phaseRows.length};
}
function weeklyLearningTrend(phase,key,duration,today){
 const input=weeklyLearningInput(phase,key,duration,today),trend=medianPairwiseTrend(input.rows);
 return trend?{...trend,historical:input.historical,phaseDays:input.phaseDays}:null;
}
function weeklyLearningMarkup(d){
 if(d?.kind!=='Wochenübung'||d.colour)return '';
 const trend=weeklyLearningTrend(state.weeklyLearning,d.key,d.work,date());if(!trend)return '';
 const label={up:'steigend',flat:'etwa gleich',down:'fallend'}[trend.direction],day=s=>s.split('-').reverse().join('.');
 return `<details class="record-trend-details weekly-learning"><summary><span>Lerntrend:</span><span class="record-trend-item" aria-label="Lerntrend: ${label}">${recordTrendArrow(trend.direction)}</span></summary><div class="record-trend-explanation">${trend.early?'<p>Frühe Tendenz aus wenigen Einträgen.</p>':''}${trend.historical?`<p>Übergangsweise aus vorhandenen Tagesbestwerten. In der separat erfassten Lernphase liegen bisher ${trend.phaseDays} passende Tage vor. Ab drei Tagen verwendet der Lerntrend ausschließlich diese Lernphase.</p>`:'' }<p>Gemeinsame Entwicklung aus ${trend.days} erfassten Tagen (${day(trend.rows[0].date)}–${day(trend.rows.at(-1).date)}).</p><p>Verglichen werden alle Tagespaare. Ihre Veränderungen werden durch den Abstand in erfassten Trainingstagen geteilt; der mittlere dieser Werte (Median) bestimmt die Entwicklungsrichtung. Ein einzelner ungewöhnlicher Wert hat dadurch weniger Einfluss.</p><p>Grün oder rot ab einer geschätzten Veränderung von einer Wiederholung über den gesamten erfassten Zeitraum, sonst goldgelb. Es ist keine zusätzliche Wiederholung pro Tag erforderlich.</p><p>${trend.historical?'Vorhandene Tagesbestwerte dieses Drills mit gleicher Satzdauer; ihre Zuordnung zu einer früheren Lernphase ist nicht bekannt.':'Nur eingetragene Werte dieser Lernphase.'} ${d.work} Sekunden Satzdauer ohne Farberkennung. Fehlende Einträge zählen nicht als null. Der Pfeil bewertet die Wiederholungszahl, nicht die Ausführungsqualität.</p></div></details>`;
}

function weeklyLearningForScore(key,duration){
 const item=run?.plan?.[Number.isInteger(run.historyIndex)?run.historyIndex:run.index];
 return item?.key===key&&item.kind==='Wochenübung'&&!item.colour?weeklyLearningMarkup({...item,work:duration}):'';
}


function recordBallTrend(key,duration){
 if(!drills.some(drill=>drill.id===key)||!Number.isFinite(duration)||duration<=0)return null;
 const weekly=drills[state.current]?.id===key&&!state.finished;
 const input=weekly?weeklyLearningInput(state.weeklyLearning,key,duration,date()):{rows:recordSeries(state.scores,key,duration,0,date()).slice(-8),historical:false};
 return {weekly,duration,...input,trend:medianPairwiseTrend(input.rows)};
}
function recordBallTrendIcon(info){
 if(!info?.trend)return '';
 const label={up:'steigend',flat:'etwa gleich',down:'fallend'}[info.trend.direction],text='Trend: '+label+' · '+info.duration+' Sekunden'+(info.trend.early?' · frühe Tendenz':'');
 return `<span class="record-summary-trend" role="img" aria-label="${esc(text)}" title="${esc(text)}">${recordTrendArrow(info.trend.direction)}</span>`;
}
function recordBallTrendExplanation(info){
 if(!info)return '';
 if(!info.trend)return `<p class="record-ball-trend-note">${info.weekly?'Lerntrend der aktuellen Wochenübung':'Trend'} ab 3 eingetragenen Tagesbestwerten mit ${info.duration} Sekunden Satzdauer${info.weekly?' in dieser Lernphase':''} · bisher ${info.rows.length}.</p>`;
 const day=s=>s.split('-').reverse().join('.'),rows=info.rows,label={up:'steigend',flat:'etwa gleich',down:'fallend'}[info.trend.direction];
 return `<p class="record-ball-trend-note">${info.historical?'Trend vorhandener Tagesbestwerte':info.weekly?'Lerntrend der aktuellen Wochenübung':'Trend'}: ${label} · ${info.trend.early?'Frühe Tendenz aus ':''}${info.weekly?'':info.trend.early?'':'letzte '}${rows.length} ${info.trend.early?'Tagesbestwerten':'Tagesbestwerte'} · ${info.duration} Sek. · ${day(rows[0].date)}–${day(rows.at(-1).date)}.</p><details class="record-ball-trend-method"><summary>Wie wird der Trend ermittelt?</summary><p>Die mittlere Veränderungsrate (Median aller Tagespaare) beschreibt die gemeinsame Entwicklung. Ab einer geschätzten Veränderung von einer Wiederholung über den betrachteten Zeitraum zeigt der Pfeil nach oben oder unten, sonst bleibt er waagerecht. Es ist keine zusätzliche Wiederholung pro Tag erforderlich.</p><p>${info.historical?`Übergangsweise zählen höchstens die letzten acht vorhandenen Tagesbestwerte, wie im Heute-Tab. Die separat erfasste Lernphase enthält bisher ${info.phaseDays} passende Tage. Ab drei Tagen wird ausschließlich diese Lernphase verwendet.`:info.weekly?'Es zählt dieselbe Lernphase wie im Heute-Tab.':'Es zählen höchstens die letzten acht erfassten Tage.'} Fehlende Einträge zählen nicht als null. Werte mit Farberkennung werden nicht einbezogen. Der Trend beschreibt Wiederholungszahlen, nicht die Ausführungsqualität.</p></details>`;
}
