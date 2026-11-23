'use strict';

function validPracticeScore(row){return !!row&&!row.manualTrainingId&&validTrainingDate(row.date)&&row.date<=date()&&Number.isInteger(row.value)&&row.value>=0&&row.value<=99999&&Number.isFinite(row.duration)&&row.duration>=0}
function practiceDayList(key,data=state){return Object.entries(data.practiceCounts?.[key]||{}).filter(([day,n])=>validTrainingDate(day)&&day<=date()&&Number.isInteger(n)&&n>0).map(([day])=>day).concat([...(data.scores||[]),...(data.colourScores||[])].filter(row=>row.key===key&&validPracticeScore(row)).map(row=>row.date),(data.manualTraining||[]).filter(r=>r.key===key&&r.date<=date()).map(r=>r.date)).filter((d,i,a)=>a.indexOf(d)===i).sort()}

function markPracticeDay(key,day,data=state){
 if(!validTrainingDate(day)||day>date())return;
 if(!data.practiceCounts||typeof data.practiceCounts!=='object'||Array.isArray(data.practiceCounts))data.practiceCounts={};
 if(!data.practiceCounts[key]||typeof data.practiceCounts[key]!=='object'||Array.isArray(data.practiceCounts[key]))data.practiceCounts[key]={};
 const old=data.practiceCounts[key][day];if(!Number.isInteger(old)||old<1)data.practiceCounts[key][day]=1;
}
// Juggling days count from a saved daily best or explicit timer completion.
// Settings and general session dates do not establish a technique-specific day.
function backfillJugglingDays(data){
 for(const score of data.scores||[])if(!score.manualTrainingId&&['toe','free','touches'].includes(score.key)&&Number.isInteger(score.value)&&score.value>=0&&score.value<=99999)markPracticeDay(score.key,score.date,data);
 const validRow=(row,overview=false)=>!!row&&['toe','free','touches'].includes(row.key)&&row.kind==='Jonglieren'&&row.total===1&&(overview||row.set===1)&&Number.isInteger(row.work)&&row.work>0&&row.work<=7200&&(row.rest===0||overview&&row.rest===undefined);
 for(const [day,sections] of Object.entries(data.completedPlans||{})){
  const rows=sections?.juggling;
  if(!Array.isArray(data.blockDone?.[day])||!data.blockDone[day].includes('juggling')||!Array.isArray(rows)||!rows.length||!rows.every(row=>validRow(row)))continue;
  rows.forEach(row=>markPracticeDay(row.key,day,data));
 }
 const overview=data.overviewDay;
 for(const row of Object.values(overview?.sections?.juggling||{}))if(validRow(row,true)&&Array.isArray(row.completed)&&row.completed.length&&row.completed.every(n=>n===1))markPracticeDay(row.key,overview.day,data);
 const snapshot=data.activeTraining,run=snapshot?.runs?.juggling;
 if(snapshot?.version===1&&run?.section==='juggling'&&run.day===snapshot.day&&Array.isArray(run.plan)&&run.plan.length&&run.plan.every(row=>validRow(row))&&Array.isArray(run.completedSets)&&run.completedSets.every(i=>Number.isInteger(i)&&i>=0&&i<run.plan.length))run.completedSets.forEach(i=>markPracticeDay(run.plan[i].key,run.day,data));
}

// A completed review moves to the back immediately; unfinished reviews stay first.
// Existing cursor positions seed the queue once, so old backups retain their order.
function reviewQueue(level){
 const ids=pools(level).map(d=>d.id);
 if(!Array.isArray(state.reviewQueues)||state.reviewQueues.length!==4)state.reviewQueues=levels.map(()=>null);
 let queue=state.reviewQueues[level];
 if(!Array.isArray(queue)){
  const offset=ids.length?((Math.trunc(state.cursors[level])%ids.length)+ids.length)%ids.length:0;
  queue=[...ids.slice(offset),...ids.slice(0,offset)];
 }
 queue=[...new Set(queue.filter(id=>ids.includes(id)))];
 state.reviewQueues[level]=[...queue,...ids.filter(id=>!queue.includes(id))];
 return state.reviewQueues[level];
}
function completedReviewsToday(){return state.reviewDone?.day===date()&&Array.isArray(state.reviewDone.ids)?state.reviewDone.ids:[]}
function selection(level){
 const ids=reviewQueue(level).filter(id=>!completedReviewsToday().includes(id));
 return ids.slice(0,state.reviews[level].count).map(id=>drills.find(d=>d.id===id));
}
function countCompletedSet(d){
 if(isReadOnly())return;
 const completed=new Set(run.completedSets||[]);if(completed.has(run.index))return;
 playerCards.completedSet();completed.add(run.index);run.completedSets=[...completed];recordOverviewSet(run,run.index);
 if(drills.some(row=>row.id===d.key))markPracticeDay(d.key,run.day);
 const first=run.index-(d.set-1),last=first+d.total-1;
 if(d.set!==d.total||!Array.from({length:d.total},(_,i)=>first+i).every(i=>completed.has(i)))return;
 run.completedBlocks=run.completedBlocks||[];
 if(!run.completedBlocks.includes(last))run.completedBlocks.push(last);
 const drill=drills.find(x=>x.id===d.key),juggling=run.section==='juggling'&&Object.hasOwn(techNames,d.key);
 if(!drill&&!juggling)return;
 markPracticeDay(d.key,run.day);
 if(!drill)return;
 if(run.repeatMode||d.kind!=='Wiederholung · '+levels[drill.level]||completedReviewsToday().includes(d.key))return;
 const queue=reviewQueue(drill.level);
 if(!queue.includes(d.key))return;
 state.reviewQueues[drill.level]=[...queue.filter(id=>id!==d.key),d.key];
 state.cursors[drill.level]++;
 state.reviewDone={day:date(),ids:[...completedReviewsToday(),d.key]};
}

function trainingSetDone(value,index){
 return (value.completedSets||[]).includes(index)||(value.skippedSets||[]).includes(index);
}
function exerciseStarts(value){
 return value.plan.flatMap((row,index)=>row.set===1?[index]:[]);
}
function openTrainingExercises(value){
 const starts=exerciseStarts(value),open=[];
 starts.forEach((start,position)=>{
  const end=starts[position+1]??value.plan.length;
  for(let index=start;index<end;index++){
   if(trainingSetDone(value,index))continue;
   open.push({start,index});
   break;
  }
 });
 return open;
}
function exerciseTarget(value,direction){
 const row=value.plan[value.index];
 if(!row)return -1;
 const current=value.index-row.set+1,open=openTrainingExercises(value);
 const target=direction<0?open.findLast(exercise=>exercise.start<current):open.find(exercise=>exercise.start>current);
 return target?.index??-1;
}
function openExercisePosition(value){
 const current=value.index-value.plan[value.index].set+1,open=openTrainingExercises(value);
 const position=open.findIndex(exercise=>exercise.start===current);
 return position<0?'Übung abgeschlossen':`Übung ${position+1} von ${open.length}`;
}
function nextOpenTrainingSet(value){
 for(let index=value.index+1;index<value.plan.length;index++){
  if(!trainingSetDone(value,index))return index;
 }
 return -1;
}
function canFinishTraining(value){
 if(!value||value.individual||value.extraSeconds||value.extraStarting)return false;
 const settled=value.phase==='ready'||value.phase==='review'||value.paused;
 if(!settled)return false;
 const worked=(value.completedSets||[]).length||value.optionalWeekly||(value.skippedSets||[]).length;
 if(worked&&value.plan.every((row,index)=>trainingSetDone(value,index)||row.kind==='Wochenübung'&&row.key===value.optionalWeekly))return true;
 if(value.section!=='juggling'||value.repeatMode)return false;
 const active=value.plan[value.index];
 return !!worked||value.phase==='work'&&value.remaining<active.work||
  Object.entries(value.checkpoints||{}).some(([i,checkpoint])=>checkpoint.phase==='work'&&checkpoint.remaining<value.plan[i].work);
}
function validRunCheckpoints(checkpoints,plan,completed){
 if(checkpoints===undefined)return true;
 return !!checkpoints&&typeof checkpoints==='object'&&!Array.isArray(checkpoints)&&Object.entries(checkpoints).every(([key,c])=>{
  const row=plan[Number(key)];
  return /^\d+$/.test(key)&&row&&c&&['count','work','rest'].includes(c.phase)&&Number.isFinite(c.remaining)&&c.remaining>=0&&
   (!c.extraSeconds||row.juggling&&completed.includes(Number(key))&&Number.isInteger(c.extraSeconds)&&c.extraSeconds>=30&&c.extraSeconds<=7200&&c.phase!=='rest')&&
   c.remaining<=(c.phase==='count'?5:c.phase==='rest'?row.rest:c.extraSeconds||row.work);
 });
}

// Store an explicit, paused snapshot together with scores and review rotation.
// Closed time never counts as training time, and timers never restart on load.
function trainingRunSnapshot(value,section){
 const timed=['count','work','rest'].includes(value.phase);
 return {day:value.day,section,plan:value.plan.map(({key,kind,set,total,work,rest,colour})=>({key,kind,set,total,work,rest,...(colour?{colour:true}:{})})),index:value.index,phase:value.phase,remaining:timed&&!value.paused?Math.max(0,(value.deadline-Date.now())/1000):value.remaining,colourResults:restoreColourResults(value.colourResults,value.plan.length),completedSets:value.completedSets||[],repeatMode:!!value.repeatMode,mastered:!!value.mastered,
  ...(Object.keys(value.checkpoints||{}).length?{checkpoints:value.checkpoints}:{}),
  ...(value.skippedSets?.length?{skippedSets:value.skippedSets}:{}),
  ...(value.optionalWeekly?{optionalWeekly:value.optionalWeekly}:{}),...(value.extraSeconds?{extraSeconds:value.extraSeconds}:{}),...(value.individual?{individual:true,creditStart:value.creditStart,scheduled:value.scheduled?trainingRunSnapshot(value.scheduled,section):null}:{})};
}
function trainingSnapshot(){
 const stored={};
 for(const [section,value] of Object.entries(runs)){
  if(value.day!==date())continue;
  stored[section]=trainingRunSnapshot(value,section);
 }
 return {version:1,day:date(),activeSection,runs:stored};
}
function restoreSavedRun(saved,section,nested=false){
 if(saved?.individual&&(nested||section!=='juggling'||saved.plan?.length!==1||!Number.isSafeInteger(saved.creditStart)||saved.creditStart<0||saved.creditStart>90000000||!['ready','count','work','review'].includes(saved.phase)))return null;
 const scheduled=saved?.individual&&saved.scheduled?restoreSavedRun(saved.scheduled,section,true):null;
 if(saved?.individual&&saved.scheduled&&!scheduled)return null;
 if(!saved||saved.day!==date()||saved.section!==section||!Array.isArray(saved.plan)||!saved.plan.length||saved.plan.length>5000)return null;
 const restoredPlan=[];
 for(const [index,entry] of saved.plan.entries()){
  if(!entry||!Number.isInteger(entry.set)||!Number.isInteger(entry.total)||entry.set<1||entry.total>20||entry.set>entry.total||!Number.isInteger(entry.work)||entry.work<1||entry.work>7200||!Number.isInteger(entry.rest)||entry.rest<0||entry.rest>600)return null;
  const base={key:entry.key,kind:entry.kind,set:entry.set,total:entry.total,work:entry.work,rest:entry.rest};
  let row;
  if(section==='ball'){
   const drill=drills.find(d=>d.id===entry.key);
   if(!drill||!['Wochenübung','Feste Zusatzübung','Wiederholung · '+levels[drill.level]].includes(entry.kind)||entry.work>600)return null;
   if(entry.colour!==undefined&&typeof entry.colour!=='boolean'||entry.colour&&entry.kind==='Wochenübung')return null;
   row={...base,name:title(drill),url:drill.url,...(entry.colour?{colour:true}:{})};
  }else if(section==='feints'){
   if(entry.key!=='feints'||entry.kind!=='Finten · frei wählen'||entry.work>600)return null;
   row={...base,name:'Finten',noScore:true};
  }else{
   if(!Object.hasOwn(techNames,entry.key)||entry.kind!=='Jonglieren'||entry.total!==1||entry.set!==1||entry.rest!==0)return null;
   row={...base,name:techNames[entry.key],juggling:true,noScore:entry.key==='touches'};
  }
  const first=index-(entry.set-1),start=saved.plan[first];
  if(!start||start.set!==1||start.key!==entry.key||start.kind!==entry.kind||start.total!==entry.total||first+entry.total>saved.plan.length)return null;
  if(index>0&&entry.set===1&&saved.plan[index-1].set!==saved.plan[index-1].total)return null;
  if(entry.set>1&&saved.plan[index-1]?.set!==entry.set-1)return null;
  restoredPlan.push(row);
 }
 if(restoredPlan.at(-1).set!==restoredPlan.at(-1).total||!Number.isInteger(saved.index)||saved.index<0||saved.index>=restoredPlan.length||!['ready','count','work','rest','review','done'].includes(saved.phase))return null;
 if(saved.extraSeconds!==undefined&&(section!=='juggling'||!Number.isInteger(saved.extraSeconds)||saved.extraSeconds<30||saved.extraSeconds>7200||!['count','work'].includes(saved.phase)))return null;
 const limit=saved.phase==='count'?5:saved.phase==='rest'?restoredPlan[saved.index].rest:(saved.extraSeconds||restoredPlan[saved.index].work);
 if(!Number.isFinite(saved.remaining)||saved.remaining<0||(['count','work','rest'].includes(saved.phase)&&saved.remaining>limit))return null;
 if(!Array.isArray(saved.completedSets)||!saved.completedSets.every(i=>Number.isInteger(i)&&i>=0&&i<restoredPlan.length))return null;
 const completedSets=[...new Set(saved.completedSets)],completedBlocks=[];
 const skippedSets=saved.skippedSets??[];
 if(!Array.isArray(skippedSets)||skippedSets.some(i=>!Number.isInteger(i)||restoredPlan[i]?.kind!=='Wochenübung'||completedSets.includes(i)))return null;
 if(saved.optionalWeekly!==undefined&&(section!=='ball'||!restoredPlan.some(row=>row.kind==='Wochenübung'&&row.key===saved.optionalWeekly)))return null;
 if(!validRunCheckpoints(saved.checkpoints,restoredPlan,completedSets))return null;
 restoredPlan.forEach((d,i)=>{if(d.set===d.total&&Array.from({length:d.total},(_,j)=>i-j).every(n=>completedSets.includes(n)))completedBlocks.push(i)});
 if(saved.phase==='done'&&!state.blockDone?.[date()]?.includes(section))return null;
 if(!saved.individual&&(saved.phase==='review'||saved.extraSeconds)&&!completedSets.includes(saved.index)&&!skippedSets.includes(saved.index))return null;
 if(saved.individual&&(saved.extraSeconds||completedSets.length))return null;
 return {...(saved.individual?{individual:true,scheduled,creditStart:saved.creditStart}:{}),...(saved.extraSeconds?{extraSeconds:saved.extraSeconds}:{}),day:date(),section,plan:restoredPlan,index:saved.index,phase:saved.phase,remaining:saved.remaining,completedSets,completedBlocks,
  ...(saved.checkpoints?{checkpoints:saved.checkpoints}:{}),...(skippedSets.length?{skippedSets}:{}),...(saved.optionalWeekly?{optionalWeekly:saved.optionalWeekly}:{}),
  colourResults:restoreColourResults(saved.colourResults,restoredPlan.length),repeatMode:!!saved.repeatMode&&(!!state.blockDone?.[date()]?.includes(section)||section==='juggling'&&typeof individualJugglingHasCredits==='function'&&individualJugglingHasCredits()),mastered:!!saved.mastered,paused:['count','work','rest'].includes(saved.phase),restored:saved.phase!=='done',rotations:levels.map(()=>0)};
}
function restoreTraining(){
 const saved=state.activeTraining;runs={};run=null;
 if(saved?.version===1&&saved.day===date()&&saved.runs&&typeof saved.runs==='object'){
  for(const section of Object.keys(sectionNames)){
   const restored=restoreSavedRun(saved.runs[section],section);if(restored)runs[section]=restored;
  }
  activeSection=Object.hasOwn(runs,saved.activeSection)?saved.activeSection:Object.keys(runs)[0]||'ball';
  run=runs[activeSection]||null;
 }
 progressReady=true;
 if(typeof todayNavigation!=='undefined')todayNavigation.restore();
}
function renderRecovery(){
 const d=run.plan[run.index],timed=['count','work','rest'].includes(run.phase),remaining=Math.ceil(run.remaining);
 const time=Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');
 const detail=timed?`${run.phase==='count'?'Countdown':run.phase==='rest'?'Pause':run.extraSeconds?'Zusatzzeit':'Übungszeit'} · noch ${time}`:run.phase==='review'?'Diese Übung ist bereits geschafft.':'Bereit für diese Übung.';
 $('#runner').classList?.add('summary-runner');$('#runner').innerHTML=`${previewTrainingSummary(run.section)}<section class="card"><span class="badge">Training gespeichert</span><h2>${esc(d.name)}</h2>${run.section==='ball'?ballExerciseBadge(d):''}<p class="hint">${run.section==='ball'?'':esc(d.kind)+' · '}${trainingPositionText(run)}</p><p>${detail}</p><button class="primary" id="recover-run">Fortsetzen</button><button class="back-button" id="discard-run">Training verwerfen</button><div id="discard-confirm"></div>${trainingNavigationMarkup(run)}</section>`;
 $('#recover-run').onclick=()=>{run.restored=false;if(timed)void resumeRun();else{renderRunner();scrollTimerIntoView(true)}};
 $('#discard-run').onclick=()=>confirmInline($('#discard-confirm'),'Diesen begonnenen Bereich verwerfen? Bereits absolvierte Übungen und gespeicherte Rekorde bleiben erhalten.',stop);
}
function checkpointTraining(){
 if(isReadOnly())return;
 if(!progressReady)return;
 if(run&&!run.paused&&['count','work','rest'].includes(run.phase))pauseRun();
 save();
}
