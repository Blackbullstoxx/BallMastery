'use strict';
// Derived from the existing learned-drill selection; no extra saved counters.
function ballMasteryProgress(list,current,finished){
 const learned=finished?list.length:Math.max(0,Math.min(list.length,Number.isInteger(current)?current:0));
 const stages=[0,1,2,3].map(level=>{
  const total=list.filter(d=>d.level===level).length;
  const count=list.slice(0,learned).filter(d=>d.level===level).length;
  return {level,total,count,fraction:total?count/total:0};
 });
 return {total:list.length,learned,percent:list.length?100*learned/list.length:0,stages};
}
function ballMasteryMarkup(){
 const p=ballMasteryProgress(drills,state.current,state.finished);
 if(!p.total)return '';
 const star='<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01Z"/>';
 const stageNames=['Anfänger','Fortgeschrittene','Könner','Meister'];
 const stars=p.stages.map(s=>`<span class="mastery-star" title="${stageNames[s.level]}: ${s.count} von ${s.total} Drills gelernt"><svg class="mastery-star-outline" viewBox="0 0 24 24">${star}</svg><span class="mastery-star-fill" style="width:${s.fraction*100}%"><svg viewBox="0 0 24 24">${star}</svg></span></span>`).join('');
 const stageLabel=p.stages.map(s=>stageNames[s.level]+': '+s.count+' von '+s.total+' Drills gelernt').join('; ');
 return `<div class="ball-mastery"><div class="mastery-row"><span class="mastery-label">${p.learned} von ${p.total} Drills gelernt</span><span class="mastery-stars" role="img" aria-label="${stageLabel}">${stars}</span><span class="mastery-percent">${Math.round(p.percent)} %</span></div><div class="mastery-track" role="progressbar" aria-label="Gelernte Ballbeherrschungsdrills" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.learned}" aria-valuetext="${p.learned} von ${p.total} Drills gelernt, ${Math.round(p.percent)} Prozent"><span style="width:${p.percent}%"></span></div></div>`;
}
