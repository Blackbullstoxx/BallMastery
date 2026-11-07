'use strict';
const recordHistoryViews=new Map();
function recordHistoryRows(scores){return scores.slice().sort((a,b)=>b.date.localeCompare(a.date)||a.duration-b.duration||String(a.id).localeCompare(String(b.id)))}
function recordHistoryMarkup(key,scores){
 if(!scores.length)return '';
 const view=recordHistoryViews.get(key)||{limit:10,open:false},rows=recordHistoryRows(scores),shown=rows.slice(0,view.limit);
 return `<details class="record-history" data-history-key="${esc(key)}" ${view.open?'open':''}><summary>${isReadOnly()?'Verlauf':'Verlauf und Korrekturen'}</summary><div class="record-history-list">${shown.map(row=>`<div class="record-history-row"><time datetime="${esc(row.date)}">${esc(row.date.slice(2).split('-').reverse().join('.'))}</time><span class="record-history-value"><strong>${row.value.toLocaleString('de-DE')}</strong>${row.duration?`<span> · ${row.duration} s</span>`:''}</span>${isReadOnly()?'':`<div class="record-history-actions"><button type="button" data-edit="${esc(row.id)}">Korrigieren</button><button type="button" data-delete="${esc(row.id)}">Löschen</button></div>`}</div>`).join('')}</div>${rows.length>shown.length?`<button type="button" class="record-history-more" data-history-more>Weitere ${Math.min(10,rows.length-shown.length)} anzeigen</button>`:''}</details>`;
}
function bindRecordHistory(){
 document.querySelectorAll('[data-history-key]').forEach(host=>{
  if(host.dataset.historyBound)return;host.dataset.historyBound='true';
  const key=host.dataset.historyKey,view=recordHistoryViews.get(key)||{limit:10,open:host.open};recordHistoryViews.set(key,view);
  host.addEventListener('toggle',()=>{if(host.isConnected)view.open=host.open});
  host.querySelector('[data-history-more]')?.addEventListener('click',()=>{
   view.limit+=10;view.open=true;
   host.outerHTML=recordHistoryMarkup(key,state.scores.filter(row=>row.key===key));bindRecordHistory();
  });
  host.querySelectorAll('[data-edit],[data-delete]').forEach(button=>button.addEventListener('click',()=>{
   if(isReadOnly())return;
   const id=button.dataset.edit||button.dataset.delete,row=state.scores.find(row=>row.id===id);if(!row)return;
   let changed=false;
   if(button.hasAttribute('data-edit')){
    const value=prompt('Richtiger Wert:',row.value);if(value===null||value.trim()==='')return;
    const n=Number(value);if(!Number.isInteger(n)||n<0||n>99999)return;
    row.value=n;correctWeeklyLearningScore(id,n);changed=true;
   }else if(confirm('Diesen Eintrag löschen?')){state.scores=state.scores.filter(row=>row.id!==id);removeWeeklyLearningScore(id);changed=true}
   if(changed){view.open=true;save();render()}
  }));
 });
}


