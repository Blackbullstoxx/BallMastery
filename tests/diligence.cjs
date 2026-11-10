'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
let today='2026-01-01',reading=false;
const ctx={Date,date:()=>today,isReadOnly:()=>reading,state:{},drills:[],validTrainingDate:s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname+'/../player-cards.js','utf8')+';this.rules=diligenceRules;this.cards=playerCards',ctx);
const r=ctx.rules,add=(d,n)=>r.day(r.number(d)+n);
const fresh=()=>({groups:{ball:true},practiceCounts:{},sessions:[],cardTraining:{version:1,since:'2026-01-01',days:{},completedDays:[]},ballTraining:{version:1,since:'2026-01-01',days:{}},diligence:{version:1,since:'2026-01-01',pauses:[]}});
function train(s,d,minutes,complete=true){s.ballTraining.days[d]=Math.round(minutes*60000);if(complete)s.cardTraining.completedDays.push(d)}
for(const [minutes,points] of [[.5,7/12],[3,1],[6,1.5],[8.5,23/12],[9,2],[12,2.5],[30,2.5]]){const s=fresh();train(s,today,minutes);assert(Math.abs(r.report(s,today).points-points)<1e-10)}
let s=fresh();train(s,today,3,false);assert.equal(r.report(s,today).points,0,'an unfinished first set earns nothing');
s=fresh();train(s,'2026-01-01',8.5);train(s,'2026-01-02',8.5);assert(Math.abs(r.report(s,'2026-01-02').points-23/6)<1e-10,'fractional points retained across dates');
s=fresh();train(s,today,1);s.cardTraining.days[today]={feints:60000,juggling:60000};s.sessions.push(today);s.practiceCounts['001']={[today]:1};assert.equal(r.report(s,today).points,1,'all areas add time, daily bonus once');
// Earlier days are exactly one point: no invented historical time.
s=fresh();s.diligence.since='2026-01-10';train(s,'2026-01-01',90);s.sessions.push('2026-01-01');assert.equal(r.report(s,'2026-01-09').points,1);
ctx.state=s;ctx.cards.init();assert.equal(s.diligence.since,'2026-01-10','migration idempotent');
let legacy=fresh();delete legacy.diligence;legacy.sessions=['2025-12-31'];ctx.state=legacy;ctx.cards.init();assert.equal(legacy.diligence.since,today);assert.equal(r.report(legacy,today).rating,32);const raw=JSON.stringify(legacy);reading=true;today='2026-01-10';ctx.cards.init();assert.equal(JSON.stringify(legacy),raw);reading=false;
// Sustainable five-day weeks: 4/5 (80%) holds; 3/5 triggers gradual deductions.
function weekly(s,w,days,minutes=9){for(let j=0;j<days;j++)train(s,add('2026-01-01',w*7+j),minutes)}
s=fresh();for(let w=0;w<8;w++)weekly(s,w,5);const base=r.report(s,add('2026-01-01',56));assert.equal(base.deduction,0);assert.equal(base.reference,10);
const four=structuredClone(s);for(let w=8;w<12;w++)weekly(four,w,4);assert.equal(r.report(four,add('2026-01-01',84)).deduction,0,'80% allowance');
const less=structuredClone(s);for(let w=8;w<12;w++)weekly(less,w,3);assert(r.report(less,add('2026-01-01',84)).deduction>0);
for(let w=12;w<24;w++)weekly(less,w,3);const adapted=r.report(less,add('2026-01-01',168));assert.equal(adapted.reference,6);assert.equal(adapted.deduction,0,'stable lower positive workload becomes standard and recovers');
const spike=structuredClone(s);for(let w=8;w<10;w++)weekly(spike,w,7,30);assert.equal(r.report(spike,add('2026-01-01',70)).reference,10,'two extreme weeks do not reset standard');
// At 99 there is no accumulated reserve that prevents inactivity losses.
const stopped=fresh();for(let w=0;w<30;w++)weekly(stopped,w,7,12);assert.equal(r.report(stopped,add('2026-01-01',210)).rating,99);
let previous=99;for(let w=31;w<=44;w++){const v=r.report(stopped,add('2026-01-01',w*7));assert(previous-v.rating<=1,'maximum one point weekly loss');previous=v.rating;assert(v.reference>0,'empty weeks never create a zero standard')}
assert(previous<99);assert.equal(r.report(stopped,add('2026-01-01',900)).rating,30,'continued absence falls to floor');
// No penalties in first 28 complete unpaused days, and no premature partial-week penalty.
s=fresh();s.sessions=['2025-12-25'];assert.equal(r.report(s,'2026-01-28').deduction,0);assert.equal(r.report(s,'2026-01-29').deduction,1);assert.equal(r.report(s,'2026-01-30').deduction,1);
const paused=structuredClone(stopped),at=add('2026-01-01',210);paused.diligence.pauses=[{from:at,to:add(at,59)}];const before=r.report(paused,at);assert.deepEqual(JSON.parse(JSON.stringify(r.report(paused,add(at,59)))),JSON.parse(JSON.stringify(before)),'60-day pause freezes all windows and losses');assert(r.paused(paused,add(at,59)));assert(!r.paused(paused,add(at,60)));assert.equal(r.report(paused,add(at,67)).weeks,before.weeks+1);
paused.diligence.pauses[0].to=null;assert(r.paused(paused,add(at,1000)));
// Date validation, overlapping/open pauses, old backup support.
assert(r.valid(paused.diligence));assert(!r.valid({...paused.diligence,pauses:[{from:at,to:null},{from:add(at,2),to:null}]}));assert(!r.valid({...paused.diligence,pauses:[{from:at,to:'2020-01-01'}]}));assert(!r.valid({...paused.diligence,since:'invalid'}));assert(ctx.cards.valid(fresh()));assert(!ctx.cards.valid({...fresh(),diligence:{broken:true}}));
// Future evidence is excluded; unrelated training settings do not change diligence.
s=fresh();train(s,'2030-01-01',12);assert.equal(r.report(s,'2026-01-01').points,0);s=four;const beforeGroups=r.report(s,'2026-03-26');s.groups={};assert.deepEqual(r.report(s,'2026-03-26'),beforeGroups);
ctx.state=fresh();ctx.state.diligence.pauses=[{from:today,to:null}];ctx.run={day:today,phase:'work',section:'feints',paused:false,deadline:Date.now()+30000};ctx.document={hidden:false};ctx.tab='today';ctx.cards.sync();ctx.cards.completedSet();assert.equal(ctx.state.cardTraining.completedDays.length,0,'paused training cannot establish a qualifying day');assert.equal(Object.keys(ctx.state.cardTraining.days).length,0,'pause cannot arm a work clock');
// A distant legacy training day still supplies a nonzero inactivity standard;
// the minimum rating cannot accumulate an invisible debt below 30.
s=fresh();s.sessions=['2020-01-01'];let distant=r.report(s,'2026-03-26');assert(distant.reference>0);assert.equal(distant.rating,30);assert.equal(distant.deduction,2);assert.equal(r.report(s,'2026-01-29').deduction,1);
// The actual import validator accepts a serialized new backup and rejects bad pauses.
const app=fs.readFileSync(__dirname+'/../app.js','utf8');
for(const f of ['ball-training-time.js','weekly-learning.js','colour-perception.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
ctx.techNames={toe:'',free:'',touches:''};ctx.scheduleKeys=[];ctx.drills=[{id:'001'}];
for(const name of ['validDayList','validBackup']){const a=app.indexOf('function '+name+'('),b=app.indexOf('\nfunction ',a+1);vm.runInContext(app.slice(a,b),ctx)}
ctx.backup={...fresh(),version:1,current:0,scores:[],reviews:Array.from({length:4},()=>({count:1,sets:2})),cursors:[0,0,0,0],work:30,rest:30,sets:4,feintSets:4,feintWork:30,feintRest:30};ctx.backup.diligence.pauses=[{from:'2026-01-10',to:null}];
ctx.roundtrip=JSON.parse(JSON.stringify(ctx.backup));assert(vm.runInContext('validBackup(roundtrip)',ctx));ctx.roundtrip.diligence.pauses[0].to='2020-01-01';assert(!vm.runInContext('validBackup(roundtrip)',ctx));
console.log('PASS: fractional/time-weighted points, completed-set gate, per-day cap, all-area sum, legacy migration, read-only, 80% tolerance, adaptive median, spikes, sustained inactivity/99, weekly loss limit, pause freeze/expiry, validators, future dates, plan independence.');
