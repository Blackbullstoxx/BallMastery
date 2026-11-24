'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={state:{scores:[{key:'toe',duration:0,date:'2026-11-12',value:0}],colourScores:[]},date:()=> '2026-11-12',esc:String,sectionNames:{juggling:'Jonglieren'},techNames:{toe:'Zehenjonglieren',free:'Freies Jonglieren',touches:'Gezielte Kontakte'},ballTrainingMarkup:()=>'',trainingSummaryMetrics:()=>'',timerMarkup:()=>'<div id="timer">5</div>',repeatTarget:n=>n<0?-1:1,canEndRepeat:()=>false};vm.createContext(ctx);
for(const f of ['record-charts.js','juggling-extra.js','training-preview.js','training-progress.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const plan=[{key:'toe',name:'Zehenjonglieren',set:1,total:1,work:420},{key:'free',name:'Freies Jonglieren',set:1,total:1,work:420},{key:'touches',name:'Gezielte Kontakte',set:1,total:1,work:60,noScore:true}];
const r={section:'juggling',plan,index:0,completedSets:[0],phase:'review'};
for(const phase of ['ready','count','work','review']){
 r.phase=phase;const before=JSON.stringify(r),h=ctx.jugglingRunnerMarkup(r,false);assert.equal(JSON.stringify(r),before);assert.equal((h.match(/data-score=/g)||[]).length,1);assert(h.includes('>0</strong><span>Heute'));assert(h.includes('Form'));assert(h.includes('Rekord'));assert(!h.includes('Heute:'));assert(!h.includes('Als Nächstes:'));assert(!h.includes('Satz 1 von 1'));
 if(phase==='ready'){assert(h.includes('id="ready"'));assert(!h.includes('id="timer"'))}
 if(phase==='count'||phase==='work'){assert(h.includes('id="pause"'));assert(h.includes('id="timer"'))}
 if(phase==='review'){assert(h.includes('Geschafft ✓'));assert(h.indexOf('data-score=')<h.indexOf('id="next-drill"'));assert(!h.includes('id="timer"'))}
}
r.phase='work';r.paused=true;let h=ctx.jugglingRunnerMarkup(r,false);assert(h.includes('Pausiert'));assert(h.includes('id="restart"'));assert(h.includes('id="resume"'));r.paused=false;
r.index=2;r.phase='review';r.completedSets=[0,1,2];h=ctx.jugglingRunnerMarkup(r,true);assert(h.includes('3 von 3 erledigt'));assert(h.includes('id="finish-area"'));assert(!h.includes('data-score='));assert(!h.includes('id="previous-drill"'));r.repeatMode=true;h=ctx.jugglingRunnerMarkup(r,true);assert(h.includes('id="exercise-prev"'));assert(!h.includes('id="exercise-next"'));assert(!h.includes('id="previous-drill"'));
r.index=1;r.phase='ready';r.completedSets=[];
h=ctx.jugglingRunnerMarkup(r,false);
assert(h.includes('Übung 2 von 3'));
assert(h.indexOf('id="ready"')<h.indexOf('id="exercise-prev"'));
assert(h.indexOf('id="exercise-prev"')<h.indexOf('id="exercise-next"'));
assert(h.indexOf('data-score=')<h.indexOf('id="ready"'));
r.completedSets=[0];h=ctx.jugglingRunnerMarkup(r,false);
assert(h.includes('Übung 2 von 3'));
assert(h.includes('id="exercise-prev"')&&h.includes('id="exercise-next"'));
r.index=2;r.phase='review';r.completedSets=[0,1,2];
console.log('PASS: shared juggling cards across ready/count/work/paused/review/history, explicit finish gate, input order, completed progress, zero value, unscored and repeat controls; no state mutations.');

r.phase='work';r.extraSeconds=300;r.paused=false;assert(ctx.jugglingRunnerMarkup(r,true).includes('Zusatzzeit beenden'));r.paused=true;assert(ctx.jugglingRunnerMarkup(r,true).includes('id="juggling-extra-end"'));delete r.extraSeconds;assert(!ctx.jugglingRunnerMarkup(r,true).includes('juggling-extra-end'));
