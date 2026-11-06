'use strict';

function practiceDayList(key,data=state){return Object.entries(data.practiceCounts?.[key]||{}).filter(([day,n])=>validTrainingDate(day)&&day<=date()&&Number.isInteger(n)&&n>0).map(([day])=>day).sort()}
function markPracticeDay(key,day,data=state){
 if(!validTrainingDate(day)||day>date())return;
 if(!data.practiceCounts||typeof data.practiceCounts!=='object'||Array.isArray(data.practiceCounts))data.practiceCounts={};
 if(!data.practiceCounts[key]||typeof data.practiceCounts[key]!=='object'||Array.isArray(data.practiceCounts[key]))data.practiceCounts[key]={};
 const old=data.practiceCounts[key][day];if(!Number.isInteger(old)||old<1)data.practiceCounts[key][day]=1;
}
// Juggling days count from a saved daily best or explicit timer completion.
// Settings and general session dates do not establish a technique-specific day.
function backfillJugglingDays(data){
 for(const score of data.scores||[])if(['toe','free','touches'].includes(score.key)&&Number.isInteger(score.value)&&score.value>=0&&score.value<=99999)markPracticeDay(score.key,score.date,data);
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
 const completed=new Set(run.completedSets||[]);completed.add(run.index);run.completedSets=[...completed];recordOverviewSet(run,run.index);
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

// Store an explicit, paused snapshot together with scores and review rotation.
// Closed time never counts as training time, and timers never restart on load.
function trainingSnapshot(){
 const stored={};
 for(const [section,value] of Object.entries(runs)){
  if(value.day!==date())continue;
  const timed=['count','work','rest'].includes(value.phase);
  stored[section]={day:value.day,section,plan:value.plan.map(({key,kind,set,total,work,rest,colour})=>({key,kind,set,total,work,rest,...(colour?{colour:true}:{})})),index:value.index,phase:value.phase,
   remaining:timed&&!value.paused?Math.max(0,Math.ceil((value.deadline-Date.now())/1000)):value.remaining,
   colourResults:restoreColourResults(value.colourResults,value.plan.length),completedSets:value.completedSets||[],repeatMode:!!value.repeatMode,mastered:!!value.mastered};
 }
 return {version:1,day:date(),activeSection,runs:stored};
}
function restoreSavedRun(saved,section){
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
 const limit=saved.phase==='count'?5:saved.phase==='rest'?restoredPlan[saved.index].rest:restoredPlan[saved.index].work;
 if(!Number.isFinite(saved.remaining)||saved.remaining<0||(['count','work','rest'].includes(saved.phase)&&saved.remaining>limit))return null;
 if(!Array.isArray(saved.completedSets)||!saved.completedSets.every(i=>Number.isInteger(i)&&i>=0&&i<restoredPlan.length))return null;
 const completedSets=[...new Set(saved.completedSets)],completedBlocks=[];
 restoredPlan.forEach((d,i)=>{if(d.set===d.total&&Array.from({length:d.total},(_,j)=>i-j).every(n=>completedSets.includes(n)))completedBlocks.push(i)});
 if(saved.phase==='done'&&!state.blockDone?.[date()]?.includes(section))return null;
 if(saved.phase==='review'&&!completedSets.includes(saved.index))return null;
 return {day:date(),section,plan:restoredPlan,index:saved.index,phase:saved.phase,remaining:saved.remaining,completedSets,completedBlocks,
  colourResults:restoreColourResults(saved.colourResults,restoredPlan.length),repeatMode:!!saved.repeatMode&&!!state.blockDone?.[date()]?.includes(section),mastered:!!saved.mastered,paused:['count','work','rest'].includes(saved.phase),restored:saved.phase!=='done',rotations:levels.map(()=>0)};
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
}
function renderRecovery(){
 const d=run.plan[run.index],timed=['count','work','rest'].includes(run.phase),remaining=Math.ceil(run.remaining);
 const time=Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');
 const detail=timed?`${run.phase==='count'?'Countdown':run.phase==='rest'?'Pause':'Übungszeit'} · noch ${time}`:run.phase==='review'?'Diese Übung ist bereits geschafft.':'Bereit für diese Übung.';
 $('#runner').innerHTML=`<span class="badge">Training gespeichert</span><h2>${esc(d.name)}</h2>${ballTrainingMarkup(run.section)}<p class="hint">${esc(d.kind)} · ${trainingPositionText(run)}</p><p>${detail}</p><button class="primary" id="recover-run">Fortsetzen</button><button class="back-button" id="discard-run">Training verwerfen</button><div id="discard-confirm"></div>`;
 $('#recover-run').onclick=()=>{run.restored=false;if(timed)void resumeRun();else renderRunner()};
 $('#discard-run').onclick=()=>confirmInline($('#discard-confirm'),'Diesen begonnenen Bereich verwerfen? Bereits absolvierte Übungen und gespeicherte Rekorde bleiben erhalten.',stop);
}
function checkpointTraining(){
 if(isReadOnly())return;
 if(!progressReady)return;
 if(run&&!run.paused&&['count','work','rest'].includes(run.phase))pauseRun();
 save();
}
