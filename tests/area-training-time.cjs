'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={date:()=> '2026-11-11',esc:String,state:{cardTraining:{since:'2026-11-01',days:{'2026-11-01':{juggling:90000,feints:60000},'2026-11-02':{juggling:0,feints:120000},'2026-11-11':{juggling:30000,feints:0},'2026-11-12':{juggling:600000,feints:600000}}}},document:{querySelectorAll:()=>[]}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../ball-training-time.js','utf8'),ctx);
const before=JSON.stringify(ctx.state);
assert.equal(ctx.ballTrainingText('juggling'),'Gesamt: schon 2 Min. / 2 Trainingstage');
assert.equal(ctx.ballTrainingText('feints'),'Gesamt: schon 3 Min. / 2 Trainingstage');
assert(ctx.ballTrainingMarkup('juggling').includes('data-ball-total="juggling"'));
assert.equal(ctx.ballTrainingSince('feints'),'01.11.2026');
assert.equal(JSON.stringify(ctx.state),before,'display must not change training evidence');
ctx.state={};assert.equal(ctx.ballTrainingText('juggling'),'Gesamt: schon 0 Min. / 0 Trainingstage');assert.equal(JSON.stringify(ctx.state),'{}','old backups remain untouched');
ctx.state={cardTraining:{since:'2026-11-01',days:{'2026-11-11':{juggling:45000,feints:0}}}};
assert.equal(ctx.ballTrainingText('juggling'),'Gesamt: schon 45 Sek. / 1 Trainingstag');
ctx.state={practiceCounts:{toe:{'2026-11-01':1,'2026-11-02':1},free:{'2026-11-01':1}},scores:[{key:'toe',date:'2026-11-03',value:0},{key:'toe',date:'2026-11-12',value:12}],cardTraining:{since:'2026-11-03',days:{'2026-11-03':{juggling:840000,feints:0}}},juggleMinutes:{toe:7,free:7}};
assert.equal(ctx.ballTrainingTotals('juggling').days,3,'historical days are unioned across techniques and records');
assert.equal(ctx.ballTrainingText('juggling'),'Gesamt: mind. 14 Min. / 3 Trainingstage','current settings cannot invent historical durations');
ctx.state.blockDone={'2026-11-01':['juggling']};ctx.state.completedPlans={'2026-11-01':{juggling:[{key:'toe',work:420},{key:'free',work:420}]}};
assert.equal(ctx.ballTrainingTotals('juggling').milliseconds,1680000,'saved completed timer durations can be recovered');
ctx.state.cardTraining.days['2026-11-01']={juggling:840000,feints:0};assert.equal(ctx.ballTrainingTotals('juggling').milliseconds,1680000,'time and plan on the same day must not double count');
assert.equal(ctx.ballTrainingTotals('juggling').since,'2026-11-01');
console.log('PASS: area-isolated times and days, zero/future exclusion, empty legacy data, seconds, singular, since date and pure display.');

ctx.rememberAreaTrainingTimes();const archived=JSON.stringify(ctx.state.areaTrainingHistory);delete ctx.state.completedPlans;delete ctx.state.blockDone;delete ctx.state.cardTraining.days['2026-11-01'];assert.equal(ctx.ballTrainingTotals('juggling').milliseconds,1680000,'historical timer durations survive daily-plan cleanup');assert(ctx.validAreaTrainingHistory(ctx.state.areaTrainingHistory));assert(!ctx.validAreaTrainingHistory({juggling:{'2026-11-01':-1}}));ctx.state=JSON.parse(JSON.stringify(ctx.state));assert.equal(JSON.stringify(ctx.state.areaTrainingHistory),archived,'backup round trip preserves recovered timers');

for(const [minutes,label] of [[0,'0 min'],[18,'18 min'],[60,'1 h'],[90,'1 h 30 min'],[264,'4 h 24 min'],[1500,'25 h']])assert.equal(ctx.trainingSummaryDuration(minutes*60000),label);
console.log('PASS: compact minutes and hours at boundaries and large totals');
