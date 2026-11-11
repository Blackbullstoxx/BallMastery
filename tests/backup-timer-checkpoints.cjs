'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
let readonly=false;const timers=new Map();let timerId=0;
const ctx={Date,Promise,JSON,Object,Array,isReadOnly:()=>readonly,window:{addEventListener(){}},document:{querySelector:()=>null},setTimeout:fn=>{timers.set(++timerId,fn);return timerId},clearTimeout:id=>timers.delete(id),state:{name:'Test',sessions:['2026-11-11'],practiceCounts:{},cardTraining:{version:1,since:'2026-11-11',days:{},completedDays:[]},ballTraining:{version:1,since:'2026-11-11',days:{}},areaTrainingHistory:{juggling:{},feints:{}}}};
let src=fs.readFileSync(__dirname+'/../dropbox-backup.js','utf8');src=src.replace('return {markup:ui,','return {comparable,testBaseline:()=>{ready=true;auth={};meta={profile:"synthetic-profile"};lastPayload=JSON.stringify(state);dirty=false;urgent=false;},markup:ui,');
vm.createContext(ctx);vm.runInContext(src+';this.backup=dropboxBackup;',ctx);const b=ctx.backup;b.testBaseline();
const original=JSON.stringify(ctx.state),signature=b.comparable(ctx.state);
for(let second=1;second<=180;second++){
 ctx.state.activeTraining={day:'2026-11-11',runs:{juggling:{remaining:180-second}}};ctx.state.cardTraining.days['2026-11-11']={juggling:second*1000,feints:0};ctx.state.areaTrainingHistory.juggling['2026-11-11']=second*1000;
 b.changed();assert.equal(timers.size,0,'a running timer must not schedule cloud backups');
}
assert.equal(b.comparable(ctx.state),signature);assert.notEqual(JSON.stringify(ctx.state),original,'full backup retains actual elapsed time');
ctx.state.practiceCounts.toe={'2026-11-11':1};b.changed();assert.equal(timers.size,1,'completed training evidence schedules a backup');
timers.clear();b.testBaseline();b.changed(true);assert.equal(timers.size,1,'explicit checkpoints still request a full snapshot');
timers.clear();readonly=true;b.changed(true);assert.equal(timers.size,0,'read-only cannot schedule uploads');
console.log('PASS: three minutes of timer ticks cause no upload scheduling; genuine completion and explicit checkpoints remain saveable; read-only stays isolated.');
