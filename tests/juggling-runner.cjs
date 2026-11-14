'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={state:{scores:[{key:'toe',duration:0,date:'2026-11-12',value:0}],colourScores:[]},date:()=> '2026-11-12',esc:String,sectionNames:{juggling:'Jonglieren'},techNames:{toe:'Zehenjonglieren',free:'Freies Jonglieren',touches:'Gezielte Kontakte'},ballTrainingMarkup:()=>'',trainingSummaryMetrics:()=>'',timerMarkup:()=>'<div id="timer">5</div>',repeatTarget:n=>n<0?-1:1,canEndRepeat:()=>false};vm.createContext(ctx);
for(const f of ['record-charts.js','training-preview.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const plan=[{key:'toe',name:'Zehenjonglieren',set:1,total:1,work:420},{key:'free',name:'Freies Jonglieren',set:1,total:1,work:420},{key:'touches',name:'Gezielte Kontakte',set:1,total:1,work:60,noScore:true}];
const r={section:'juggling',plan,index:0,completedSets:[0],phase:'review'};
for(const phase of ['ready','count','work','review']){
 r.phase=phase;const before=JSON.stringify(r),h=ctx.jugglingRunnerMarkup(r,false,false);assert.equal(JSON.stringify(r),before);assert.equal((h.match(/data-score=/g)||[]).length,1);assert(h.includes('>0</strong><span>Heute'));assert(h.includes('Ø letzte 7'));assert(h.includes('Rekord'));assert(!h.includes('Heute:'));assert(!h.includes('Als Nächstes:'));assert(!h.includes('Satz 1 von 1'));
 if(phase==='ready'){assert(h.includes('id="ready"'));assert(!h.includes('id="timer"'))}
 if(phase==='count'||phase==='work'){assert(h.includes('id="pause"'));assert(h.includes('id="timer"'))}
 if(phase==='review'){assert(h.includes('Geschafft ✓'));assert(h.indexOf('data-score=')<h.indexOf('id="next-drill"'));assert(!h.includes('id="timer"'))}
}
r.phase='work';r.paused=true;let h=ctx.jugglingRunnerMarkup(r,false,false);assert(h.includes('Pausiert'));assert(h.includes('id="restart"'));assert(h.includes('id="resume"'));r.paused=false;
r.index=2;r.phase='review';r.completedSets=[0,1,2];h=ctx.jugglingRunnerMarkup(r,true,true);assert(h.includes('3 von 3 erledigt'));assert(h.includes('id="finish-area"'));assert(!h.includes('data-score='));assert(h.includes('id="previous-drill"'));r.repeatMode=true;h=ctx.jugglingRunnerMarkup(r,true,true);assert(h.includes('id="repeat-prev" disabled'));assert(h.includes('id="repeat-next"'));assert(!h.includes('id="previous-drill"'));
h=ctx.jugglingHistoryMarkup(r,0,false);assert(h.includes('Übung 1 von 3'));assert(h.includes('Geschafft ✓'));assert(h.includes('id="history-current"'));assert(!h.includes('id="finish-area"'));assert(!h.includes('id="history-back"'));
console.log('PASS: shared juggling cards across ready/count/work/paused/review/history, explicit finish gate, input order, completed progress, zero value, unscored and repeat controls; no state mutations.');
