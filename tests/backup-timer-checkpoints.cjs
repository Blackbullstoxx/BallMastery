'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
let readonly=false;const timers=new Map();let timerId=0;
const ctx={Date,Promise,JSON,Object,Array,isReadOnly:()=>readonly,window:{addEventListener(){}},document:{querySelector:()=>null},setTimeout:fn=>{timers.set(++timerId,fn);return timerId},clearTimeout:id=>timers.delete(id),state:{name:'Test',sessions:['2026-11-11'],practiceCounts:{},cardTraining:{version:1,since:'2026-11-11',days:{},completedDays:[]},ballTraining:{version:1,since:'2026-11-11',days:{}},areaTrainingHistory:{juggling:{},feints:{}}}};
let src=fs.readFileSync(__dirname+'/../dropbox-backup.js','utf8');src=src.replace('return {markup:ui,','return {comparable,testBaseline:()=>{ready=true;auth={};meta={profile:"synthetic-profile"};lastPayload=JSON.stringify(state);dirty=false;urgent=false;},markup:ui,');
vm.createContext(ctx);vm.runInContext(src+';this.backup=dropboxBackup;',ctx);const b=ctx.backup;b.testBaseline();
const original=JSON.stringify(ctx.state),signature=b.comparable(ctx.state);
for(let second=1;second<=180;second++){
 ctx.state.activeTraining={day:'2026-11-11',runs:{juggling:{remaining:180-second}}};ctx.state.cardTraining.days['2026-11-11']={juggling:second*1000,feints:0};ctx.state.areaTrainingHistory.juggling['2026-11-11']=second*1000;
 ctx.state.jugglingIndividualCredits={'2026-11-11':{toe:second*1000}};
 b.changed();assert.equal(timers.size,0,'ongoing individual juggling credit must not schedule cloud backups');
}
assert.equal(b.comparable(ctx.state),signature);assert.notEqual(JSON.stringify(ctx.state),original,'full backup retains actual elapsed time');
ctx.state.practiceCounts.toe={'2026-11-11':1};b.changed();assert.equal(timers.size,1,'completed training evidence schedules a backup');
timers.clear();b.testBaseline();b.changed(true);assert.equal(timers.size,1,'explicit checkpoints still request a full snapshot');
timers.clear();readonly=true;b.changed(true);assert.equal(timers.size,0,'read-only cannot schedule uploads');
console.log('PASS: three minutes of timer ticks cause no upload scheduling; genuine completion and explicit checkpoints remain saveable; read-only stays isolated.');

ctx.state.manualTraining=[{id:'test',date:'2026-11-10',milliseconds:90000}];assert.notEqual(b.comparable(ctx.state),signature,'manual-only changes must trigger backup comparison');

// Exercise the timer and actual local write path with a controlled clock.
{
 const app=fs.readFileSync(__dirname+'/../app.js','utf8');
 const progress=fs.readFileSync(__dirname+'/../training-progress.js','utf8');
 const writes=[];
 let now=100000,overviewUpdates=0;
 const local={
  Date:{now:()=>now},state:{},progressReady:true,
  run:{section:'juggling',phase:'work',index:0,plan:[{work:180}],paused:false,remaining:180,last:180,deadline:now+180000},
  isReadOnly:()=>false,ensureWeeklyLearning(){},syncBallTime(){},rememberAreaTrainingTimes(){},
  refreshBallTimeDisplay(){},trainingSnapshot:()=>({remaining:local.run.remaining,paused:local.run.paused}),
  localStorage:{setItem(_key,value){writes.push(JSON.parse(value).activeTraining)}},
  syncScreenAwake(){},checkTrainingDay:()=>false,refreshTimerRing(){},
  refreshDayOverview(){overviewUpdates++},colourPerception:{stop(){}},silence(){},$:()=>null
 };
 vm.createContext(local);
 vm.runInContext(app.slice(app.indexOf('function save('),app.indexOf('function best(')),local);
 vm.runInContext(app.slice(app.indexOf('function update('),app.indexOf('async function resumeRun(')),local);
 vm.runInContext(progress.slice(progress.indexOf('function nextOpenTrainingSet('),progress.indexOf('function canFinishTraining(')),local);
 vm.runInContext(progress.slice(progress.indexOf('function checkpointTraining(')),local);
 local.renderRunner=()=>local.save();
 local.save();
 for(let second=1;second<=65;second++){now+=1000;local.update()}
 assert.deepEqual(writes.map(row=>row.remaining),[180,150,120]);
 assert.equal(overviewUpdates,65,'the overview still refreshes every second');
 local.save();
 for(let second=1;second<=29;second++){now+=1000;local.update()}
 assert.deepEqual(writes.map(row=>row.remaining),[180,150,120,115],'an immediate save resets the 30-second interval');
 now+=1000;local.update();
 assert.equal(writes.at(-1).remaining,85);
 now+=4000;
 local.checkpointTraining();
 assert(local.run.paused);
 assert.deepEqual(writes.at(-1),{remaining:81,paused:true},'leaving the app saves the current paused stand immediately');
 const priorWrites=writes.length;
 now+=60000;local.update();
 assert.equal(writes.length,priorWrites,'a paused timer has no periodic writes');
 console.log('PASS: local timer checkpoints are 30 seconds apart, actions save immediately, and page exit saves the current paused timer.');
}
