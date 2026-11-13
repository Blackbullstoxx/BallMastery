'use strict';
let dayOverviewOpen=false,dayOverviewDate='';
function overviewBlocks(section,entries){
 const occurrences=new Map(),blocks=[];
 const saved=state.completedPlans?.[date()]?.[section],current=runs[section];
 if(saved&&entries===current?.plan&&!current.repeatMode&&current.phase!=='done')saved.filter(d=>d.set===1).forEach(d=>{const signature=JSON.stringify([d.kind,d.key,d.work,d.total]);occurrences.set(signature,(occurrences.get(signature)||0)+1)});
 entries.forEach((d,index)=>{
  if(d.set!==1)return;
  const signature=JSON.stringify([d.kind,d.key,d.work,d.total]),occurrence=occurrences.get(signature)||0;occurrences.set(signature,occurrence+1);
  blocks.push({id:JSON.stringify([signature,occurrence]),key:d.key,kind:d.kind,total:d.total,work:d.work,rest:d.rest,colourSets:entries.slice(index,index+d.total).filter(row=>row.colour===true).length,start:index,indices:Array.from({length:d.total},(_,n)=>index+n)});
 });
 return blocks;
}
function overviewLedger(){
 if(state.overviewDay?.day!==date()||!state.overviewDay.sections||typeof state.overviewDay.sections!=='object'||Array.isArray(state.overviewDay.sections))state.overviewDay={day:date(),sections:{}};
 return state.overviewDay.sections;
}
function overviewCredits(section,block){
 const stored=overviewLedger()[section]?.[block.id];
 return Array.isArray(stored?.completed)?[...new Set(stored.completed.filter(n=>Number.isInteger(n)&&n>=1&&n<=block.total))]:[];
}
function storeOverviewCredits(section,block,sets){
 if(!sets.length)return;
 const ledger=overviewLedger(),old=ledger[section];
 const rows=old&&typeof old==='object'&&!Array.isArray(old)?old:{};
 const existing=overviewCredits(section,block),completed=[...new Set([...existing,...sets])];
 if(completed.length!==existing.length||rows[block.id]?.colourSets!==block.colourSets)rows[block.id]={key:block.key,kind:block.kind,total:block.total,work:block.work,rest:block.rest,colourSets:block.colourSets,completed};
 ledger[section]=rows;
}
function recordOverviewSet(value,index){
 if(!value||value.day!==date())return;
 const block=overviewBlocks(value.section,value.plan).find(b=>b.indices.includes(index));if(!block)return;
 storeOverviewCredits(value.section,block,[value.plan[index].set]);
}
function overviewSeconds(section,entries,value,blocks){
 const credited=new Map();blocks.forEach(b=>{const sets=overviewCredits(section,b);b.indices.forEach((index,n)=>credited.set(index,sets.includes(n+1)))});
 if(state.blockDone?.[date()]?.includes(section))return 0;
 const current=value?.day===date()?value:null;
 const remaining=current&&['count','work','rest'].includes(current.phase)?(current.paused?current.remaining:Math.max(0,(current.deadline-Date.now())/1000)):0;
 let seconds=0;
 entries.forEach((d,index)=>{
  const done=credited.get(index),at=current?.index===index;
  if(!done){
   seconds+=at&&current.phase==='work'?remaining:d.work;
   const needsCountdown=index===0||entries[index-1].key!==d.key||entries[index-1].rest===0;
   if(at&&current.phase==='count')seconds+=remaining;
   else if(needsCountdown){
    if(!current||index>current.index||at&&current.phase==='ready')seconds+=5;
   }
  }
  // Planned time includes a pause after every set, including the last one.
  if(at&&current.phase==='rest')seconds+=remaining;
  else if(!done&&(!current||index>=current.index))seconds+=d.rest;
 });
 return Math.max(0,Math.ceil(seconds));
}
function dayOverviewData(){
 if(dayOverviewDate!==date()){dayOverviewDate=date();dayOverviewOpen=false}
 const sections=[],ledger=overviewLedger();let seconds=0,started=false;
 for(const section of Object.keys(sectionNames)){
  const current=runs[section]?.day===date()?runs[section]:null,done=!!state.blockDone?.[date()]?.includes(section);
  const entries=done&&state.completedPlans?.[date()]?.[section]||current?.plan||plan(section);
  const blocks=overviewBlocks(section,entries);
  if(current){const completed=new Set(current.completedSets||[]);blocks.forEach(block=>storeOverviewCredits(section,block,block.indices.filter(index=>completed.has(index)).map(index=>entries[index].set)))}
  const rows=new Map();
  // Fully completed drills stay visible even after discarding an unfinished run.
  for(const [id,row] of Object.entries(ledger[section]||{})){
   if(!row||typeof row.kind!=='string'||!Number.isInteger(row.work)||row.work<1||!Number.isInteger(row.total)||row.total<1||row.total>20||!Array.isArray(row.completed))continue;
   const completed=[...new Set(row.completed.filter(n=>Number.isInteger(n)&&n>=1&&n<=row.total))];
   if(completed.length===row.total)rows.set(id,{...row,id,completed});
  }
  blocks.forEach(block=>rows.set(block.id,{...block,completed:done?Array.from({length:block.total},(_,i)=>i+1):overviewCredits(section,block)}));
  const items=[...rows.values()].filter(row=>{
   if(section==='ball'){const drill=drills.find(d=>d.id===row.key);return drill&&['Wochenübung','Feste Zusatzübung','Wiederholung · '+levels[drill.level]].includes(row.kind)}
   return section==='juggling'?Object.hasOwn(techNames,row.key)&&row.kind==='Jonglieren':row.key==='feints'&&row.kind==='Finten · frei wählen';
  });
  if(!items.length)continue;
  items.forEach(row=>row.done=row.completed.length>=row.total);
  sections.push({id:section,name:sectionNames[section],items});seconds+=overviewSeconds(section,entries,current,blocks);
  if(items.some(row=>row.completed.length)||current&&(current.phase!=='ready'||current.index>0))started=true;
 }
 const items=sections.flatMap(s=>s.items),completed=items.filter(row=>row.done).length;
 return {sections,total:items.length,completed,seconds,started,done:items.length>0&&completed===items.length};
}
function overviewDuration(seconds){return seconds>=60?Math.ceil(seconds/60)+' Min.':Math.ceil(seconds)+' Sek.'}
function overviewStatus(row){return row.done?'<span class="overview-check" role="img" aria-label="Erledigt">✓</span>':row.completed.length?`<span class="overview-partial">${row.completed.length}/${row.total} Sätze</span>`:''}
function overviewExactDuration(seconds){
 const n=Math.max(0,Math.round(seconds));
 if(n<60)return n+' Sek.';
 return Math.floor(n/60)+(n%60?':'+String(n%60).padStart(2,'0'):'')+' Min.';
}
function overviewRowSide(row){
 const seconds=row.total*row.work+row.total*(Number.isFinite(row.rest)?row.rest:state.rest);
 return `<div class="overview-row-side"><span class="overview-minutes" aria-label="Gesamtzeit einschließlich Satzpausen">${overviewExactDuration(seconds)}</span>${overviewStatus(row)}</div>`;
}
function overviewBallPrescription(row){
 const count=Number.isInteger(row.colourSets)?Math.max(0,Math.min(row.total,row.colourSets)):0;
 const mixed=count>0&&count<row.total;
 const mode=(colour,n)=>`<span class="overview-mode">${mixed?n+'× ':''}${trainingModeCue({colour})}</span>`;
 return `${row.total} × ${row.work} s · ${count<row.total?mode(false,row.total-count):''}${mixed?' · ':''}${count?mode(true,count):''}`;
}
function overviewBallRow(row){
 const drill=drills.find(d=>d.id===row.key),stars='★'.repeat(drill.level+1);
 return `<li class="overview-drill"><div><span class="overview-name">${esc(title(drill))} <span class="overview-stars" aria-label="${esc(levels[drill.level])}">${stars}</span></span><span class="overview-prescription">${overviewBallPrescription(row)}</span></div>${overviewRowSide(row)}</li>`;
}
function overviewBody(data){
 const progress=overviewProgressLabel(data);
 return `<span class="overview-progress" data-overview-progress ${progress?'':'hidden'} aria-live="polite">${progress}</span>`+data.sections.map(section=>{
  let contents;
  if(section.id==='ball')contents=[['Wochenübung',r=>r.kind==='Wochenübung'],['Wiederholung',r=>r.kind.startsWith('Wiederholung · ')],['Feste Zusatzübungen',r=>r.kind==='Feste Zusatzübung']].map(([label,match])=>{
   const rows=section.items.filter(match);return rows.length?`<div class="overview-category"><h4>${label}</h4><ul>${rows.map(overviewBallRow).join('')}</ul></div>`:'';
  }).join('');
  else if(section.id==='juggling')contents=`<ul>${section.items.map(row=>`<li class="overview-juggle"><span class="overview-name">${techNames[row.key]}</span><span class="overview-minutes">${String(row.work/60).replace('.',',')} Min.</span>${overviewStatus(row)}</li>`).join('')}</ul>`;
  else contents=`<ul>${section.items.map(row=>`<li class="overview-drill"><span class="overview-prescription overview-feints">${row.total} × ${row.work} Sek.</span>${overviewRowSide(row)}</li>`).join('')}</ul>`;
  return `<section class="overview-section"><h3>${section.name}</h3>${contents}</section>`;
 }).join('');
}
function overviewTimeLabel(data){return data.done?'':(data.started?'Noch ca. ':'ca. ')+overviewDuration(data.seconds)}
function overviewProgressLabel(data){return data.started||data.done?`${data.completed} von ${data.total} ${data.total===1?'Übung':'Übungen'} geschafft`:''}
function dayOverviewMarkup(){
 const data=dayOverviewData();if(!data.total)return '';
 return `<details class="card day-overview" id="day-overview" ${dayOverviewOpen?'open':''}><summary><span class="overview-header"><span class="overview-title">${data.done?'Training abgeschlossen ✓':'Heute geplant'}</span><span class="overview-time" ${data.done?'hidden':''}><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg><span data-overview-time>${overviewTimeLabel(data)}</span></span><span class="overview-chevron" aria-hidden="true"></span></span></summary><div class="overview-body">${overviewBody(data)}</div></details>`;
}
function bindDayOverview(){const host=$('#day-overview');host?.addEventListener('toggle',()=>{dayOverviewOpen=host.open})}
function refreshDayOverview(){
 if(tab!=='today')return;const host=$('#day-overview');if(!host?.querySelector)return;
 const data=dayOverviewData();host.querySelector('.overview-title').textContent=data.done?'Training abgeschlossen ✓':'Heute geplant';
 host.querySelector('.overview-time').hidden=data.done;host.querySelector('[data-overview-time]').textContent=overviewTimeLabel(data);
 const body=host.querySelector('.overview-body'),markup=overviewBody(data);if(body._overviewMarkup!==markup){body.innerHTML=markup;body._overviewMarkup=markup}
}

// Reopen finished areas with only the additional work requested today.
function reopenExtendedPlans(){['ball','feints','juggling'].forEach(reopenExtendedPlan)}
function reopenExtendedPlan(section){
 const day=date(),saved=state.completedPlans?.[day]?.[section],current=runs[section];
 if(!saved?.length||(!state.blockDone?.[day]?.includes(section)&&(current?.phase!=='ready'||current.index!==0||current.completedSets?.length)))return;
 const signature=d=>JSON.stringify([d.kind,d.key,...(section==='juggling'?[]:[d.work])]);
 const completed=new Map();saved.forEach(d=>completed.set(signature(d),(completed.get(signature(d))||0)+(section==='juggling'?d.work:1)));
 let desired=plan(section);
 // Completed reviews have already rotated out of selection(). Keep today's
 // exercises first, filling additional review slots from the current queue.
 if(section==='ball')levels.forEach((level,i)=>{
  const kind='Wiederholung · '+level,old=[...new Map(saved.filter(d=>d.kind===kind).map(d=>[d.key,d])).values()];
  const fresh=desired.filter(d=>d.kind===kind&&d.set===1);
  desired=desired.filter(d=>d.kind!==kind);
  if(!state.groups.ball||!isScheduled('review'))return;
  const chosen=[...new Map([...old,...fresh].map(d=>[d.key,d])).values()].slice(0,state.reviews[i].count);
  chosen.forEach(d=>{for(let n=1;n<=state.reviews[i].sets;n++)desired.push({...d,set:n,total:state.reviews[i].sets,work:state.work,rest:state.rest,colour:n>state.reviews[i].sets-state.colourSets.review[i]})});
 });
 const pending=[];
 overviewBlocks(section,desired).forEach(block=>{
  const rows=desired.slice(block.start,block.start+block.total),d=rows[0],key=signature(d),done=completed.get(key)||0;
  if(section==='juggling'){const remaining=Math.max(0,d.work-done);completed.set(key,Math.max(0,done-d.work));if(remaining)pending.push({...d,work:remaining});return;}
  completed.set(key,Math.max(0,done-rows.length));
  const extra=rows.slice(Math.min(done,rows.length));
  extra.forEach((row,i)=>pending.push({...row,set:i+1,total:extra.length}));
 });
 if(!pending.length)return;
 overviewBlocks(section,saved).forEach(b=>storeOverviewCredits(section,b,Array.from({length:b.total},(_,i)=>i+1)));
 state.blockDone[day]=state.blockDone[day].filter(k=>k!==section);
 const next={repeatMode:false,completedBlocks:[],completedSets:[],day,section,plan:pending,index:0,phase:'ready',paused:false,remaining:5,rotations:levels.map(()=>0)};
 refreshColourPlan(next,true,true);runs[section]=next;if(activeSection===section)run=next;
}
