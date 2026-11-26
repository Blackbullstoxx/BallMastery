const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/../app.js','utf8');let scrolls=0;const now=Date.now();
const ctx={keepingExercisePosition:false,exerciseScrollSpace:null,removeExerciseScrollSpace:()=>{},Date:{now:()=>now},Math,run:{phase:'rest',index:0,paused:false,last:6,deadline:now+5000,plan:[{key:'001',set:1,work:30,rest:10},{key:'001',set:2,work:30,rest:10}]},playerCards:{trainingPaused:()=>false},isReadOnly:()=>false,scrollTimerIntoView:()=>scrolls++,renderRunner:()=>{},syncScreenAwake:()=>{},syncBallTime:()=>{},checkTrainingDay:()=>false,refreshTimerRing:()=>{},save:()=>{},refreshDayOverview:()=>{},beep:()=>{},$:()=>null};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../training-progress.js','utf8'),ctx);vm.runInContext(src.slice(src.indexOf('function begin('),src.indexOf('function pauseRun(')),ctx);
ctx.update();assert.equal(scrolls,1,'return to timer when the next-set countdown starts');ctx.update();assert.equal(scrolls,1,'no repeated scrolling on timer ticks');
ctx.begin('rest',5);assert.equal(scrolls,2,'short pauses align immediately');
ctx.run.plan[1].key='002';ctx.begin('rest',5);assert.equal(scrolls,2,'no automatic countdown for another drill');
ctx.run.phase='work';ctx.run.last=6;ctx.run.deadline=now+5000;ctx.update();assert.equal(scrolls,2,'work timer does not pull user away while swiping');
console.log('PASS: next-set countdown scrolls once, short pauses align immediately, work and different-drill pauses do not scroll');
let target=null;ctx.run={phase:'count',paused:false};ctx.window={requestAnimationFrame:fn=>fn(),matchMedia:()=>({matches:true})};ctx.tab='today';ctx.document={hidden:false};ctx.$=()=>({querySelector:()=>({scrollIntoView:()=>target='progress'}),scrollIntoView:()=>target='runner'});vm.runInContext(src.slice(src.indexOf('function scrollTimerIntoView('),src.indexOf('async function countdown(')),ctx);ctx.scrollTimerIntoView();assert.equal(target,'progress','alignment starts at exercise/set progress instead of the summary');target=null;ctx.run.paused=true;ctx.scrollTimerIntoView();assert.equal(target,null,'paused training must not pull scroll position');
console.log('PASS: live alignment uses progress panel and respects pause');

for(const section of ['ball','juggling','feints']){
 ctx.run={section,phase:'ready',paused:false};target=null;ctx.scrollTimerIntoView(true);assert.equal(target,'progress',section+' next exercise aligns before starting');
 ctx.run.paused=true;target=null;ctx.scrollTimerIntoView(true);assert.equal(target,'progress',section+' explicit return to paused exercise aligns');
}
target=null;ctx.tab='records';ctx.scrollTimerIntoView(true);assert.equal(target,null,'never scroll another tab');ctx.tab='today';ctx.document.hidden=true;ctx.scrollTimerIntoView(true);assert.equal(target,null,'never scroll a hidden document');ctx.document.hidden=false;
let renders=0,navigations=0;ctx.renderRunner=()=>renders++;ctx.scrollTimerIntoView=flag=>{assert.equal(flag,true);navigations++};ctx.clearInterval=()=>{};ctx.tick=null;ctx.silence=()=>{};ctx.resetBallClock=()=>{};ctx.colourPerception={stop(){}};
vm.runInContext(src.slice(src.indexOf('function canPreviewNext('),src.indexOf('const rewardShown')),ctx);
for(const section of ['ball','juggling','feints']){
 ctx.run={section,index:0,phase:'review',plan:[{key:'a',set:1,total:1},{key:'b',set:1,total:1}]};
 ctx.advancePreview();assert.equal(ctx.run.index,1);assert.equal(ctx.run.phase,'ready');
}
assert.equal(renders,3);assert.equal(navigations,3,'every area next action aligns once after rendering');
console.log('PASS: next exercise aligns in all areas, including ready and explicit paused returns; hidden screens stay untouched');

// The first exercise is reachable from the end of the plan and suspended time
// belongs to its original exercise across a backup round-trip.
ctx.run={section:'juggling',index:2,phase:'work',paused:true,remaining:36.25,day:'2026-11-23',completedSets:[],plan:[
 {key:'toe',kind:'Jonglieren',set:1,total:1,work:60,rest:0,juggling:true},
 {key:'free',kind:'Jonglieren',set:1,total:1,work:60,rest:0,juggling:true},
 {key:'touches',kind:'Jonglieren',set:1,total:1,work:60,rest:0,juggling:true}
]};
ctx.date=()=>ctx.run.day;ctx.validTrainingDate=()=>true;ctx.state={};ctx.techNames={toe:'Zehen',free:'Frei',touches:'Gezielt'};ctx.levels=[];
ctx.restoreColourResults=()=>({});
ctx.run.completedSets=[1];
assert.equal(ctx.exerciseTarget(ctx.run,-1),1,'completed middle exercise is available backwards');
assert.equal(ctx.exerciseTarget(ctx.run,1),-1,'the last exercise never wraps forwards');
ctx.jumpExercise(-1);
assert.equal(ctx.run.index,1);
assert.equal(ctx.run.phase,'review');
const checkpoint=JSON.parse(JSON.stringify(ctx.trainingRunSnapshot(ctx.run,'juggling')));
ctx.run=ctx.restoreSavedRun(checkpoint,'juggling');
assert(ctx.run);
assert.equal(ctx.exerciseTarget(ctx.run,-1),0,'the first exercise is reachable from the middle');
ctx.jumpExercise(1);
assert.equal(ctx.run.remaining,36.25);
assert(ctx.run.paused);
assert.deepEqual([...ctx.run.completedSets],[1]);
assert.equal(ctx.exerciseTarget({...ctx.run,completedSets:[0,1]},-1),1,'navigation remains available when other exercises are complete');
assert(!ctx.canFinishTraining(ctx.run),'paused and partially trained juggling cannot be completed');
console.log('PASS: directional exercise selection and exact remaining time across a backup and return.');

// Number every planned exercise, including completed exercises.
const remaining={plan:ctx.run.plan,index:1,completedSets:[0]};
assert.equal(ctx.openExercisePosition(remaining),'Übung 2 von 3');
assert.equal(ctx.exerciseTarget(remaining,-1),0);
assert.equal(ctx.exerciseTarget(remaining,1),2);
remaining.index=2;
assert.equal(ctx.openExercisePosition(remaining),'Übung 3 von 3');
assert.equal(ctx.exerciseTarget(remaining,-1),1);
assert.equal(ctx.exerciseTarget(remaining,1),-1);
