'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let today = '2026-11-10', readOnly = false;
const drills = Array.from({length:105}, (_, i) => ({id:String(i)}));
const ctx = vm.createContext({
 date: () => today, isReadOnly: () => readOnly, validTrainingDate: day => /^2026-11-\d\d$/.test(day),
 scoreDay: day => Date.parse(day), drills, state: {current:26, groups:{ball:true}}
});
function load(file, extra='') {
 vm.runInContext(fs.readFileSync(__dirname+'/../'+file, 'utf8')+extra,ctx);
}
load('weekly-learning.js');
load('player-cards.js','\nthis.cards=playerCards;');
const {state,cards} = ctx;
const result = () => [cards.snapshot().values[0],cards.snapshot().ballDots];
const credit = (key='26', completedSets=[0,1], kind='Wochenübung') => ctx.creditWeeklyRatingDay({
 section:'ball', day:today, plan:[{key,kind},{key,kind}], completedSets
});
assert.equal(cards.snapshot({current:0,groups:{ball:true}}).ballDots,0);
cards.init();
credit('26',[0]);
credit('25');
credit('26',[0,1],'Wiederholung');
assert.equal(state.weeklyLearning,undefined);
readOnly=true;
credit();
assert.equal(state.weeklyLearning,undefined);
readOnly=false;
for(let n=10;n<=13;n++){
 today='2026-11-'+n;
 credit(); credit();
 assert.equal(state.weeklyLearning.trainingDays.length,n-9);
 cards.completed('ball');
}
assert.deepEqual(result(),[47,3]);
state.current++;
ctx.ensureWeeklyLearning();
assert.deepEqual(result(),[48,0]);
assert.equal(cards.collectionSnapshot().values[0],47,'switch stays pending until a BALL award');
today='2026-11-14';
cards.completed('juggling');
assert.equal(cards.collectionSnapshot().values[0],47,'another area cannot grant BALL progress after midnight');
credit('27');
cards.completed('ball');
assert.deepEqual(result(),[48,1]);
assert.equal(state.playerCard.reveal.from.values[0],47);
assert.equal(state.playerCard.reveal.to.ballDots,1);
for(let n=15;n<=21;n++){today='2026-11-'+n;credit('27');}
assert.equal(state.weeklyLearning.trainingDays.length,6);
assert(ctx.validWeeklyLearning(JSON.parse(JSON.stringify(state.weeklyLearning))));
assert(cards.valid(JSON.parse(JSON.stringify(state))));
state.finished=true;
assert.deepEqual(result(),[99,0]);
console.log('PASS: weekly day credit, eligibility, cap, switching, independent reveals and backup compatibility.');

// Rollout: three historical dates, one already credited, plus dates from
// other phases and after rollout. A subsequent training day follows the live rule.
today='2026-11-19';
ctx.state={
 current:36,groups:{ball:true},
 weeklyLearning:{key:'36',since:'2026-11-14',entries:[{date:'2026-11-16',value:20,duration:30,scoreId:'s1'}],trainingDays:['2026-11-17']},
 practiceCounts:{'35':{'2026-11-14':1},'36':{'2026-11-13':1,'2026-11-16':1,'2026-11-17':1,'2026-11-18':1,'2026-11-19':1}}
};
assert.equal(cards.snapshot().ballDots,0);
assert(ctx.backfillWeeklyRatingDays());
assert.equal(JSON.stringify(ctx.state.weeklyLearning.trainingDays),'["2026-11-16","2026-11-17","2026-11-18"]');
assert.equal(cards.snapshot().values[0],54);
assert.equal(cards.snapshot().ballDots,1);
assert(!ctx.backfillWeeklyRatingDays());
ctx.creditWeeklyRatingDay({section:'ball',day:today,plan:[{key:'36',kind:'Wochenübung'}],completedSets:[0]});
assert.equal(ctx.state.weeklyLearning.trainingDays.length,4);
readOnly=true;
ctx.state={current:36,groups:{ball:true},practiceCounts:{'36':{'2026-11-17':1}}};
assert(!ctx.backfillWeeklyRatingDays());
readOnly=false;
assert(ctx.backfillWeeklyRatingDays());
assert.equal(ctx.state.weeklyLearning.since,'2026-11-17');
console.log('PASS: initial backfill is scoped to a profile and the current weekly phase, without duplicate or post-rollout credit.');

// The active weekly drill can change without discarding its recorded days.
today='2026-11-23';
const previousDays=['2026-11-18','2026-11-19','2026-11-20','2026-11-22'];
ctx.state={current:26,sets:2,groups:{ball:true},weeklyLearning:{key:'26',since:previousDays[0],entries:[],trainingDays:[...previousDays]}};
ctx.state.current=27;ctx.ensureWeeklyLearning();
ctx.state.current=26;ctx.ensureWeeklyLearning();
assert.deepEqual([...ctx.state.weeklyLearning.trainingDays],previousDays);
credit();credit();
assert.deepEqual([...ctx.state.weeklyLearning.trainingDays],[...previousDays,today]);

// Simulate the old reset and recover a saved phase into the newer session.
const backup={weeklyLearning:{key:'26',since:previousDays[0],entries:[],trainingDays:previousDays},practiceCounts:{26:{'2026-11-21':1}}};
ctx.state={current:26,sets:2,groups:{ball:true},weeklyLearning:{key:'26',since:today,entries:[],trainingDays:[today]},scores:[{key:'26',date:today,value:20}]};
cards.init();
assert(ctx.recoverWeeklyRatingDays(backup));
cards.repairWeeklyRating();
assert.deepEqual([...ctx.state.weeklyLearning.trainingDays],[...previousDays,today]);
assert.equal(cards.collectionSnapshot().values[0],cards.snapshot().values[0]);
assert.equal(cards.collectionSnapshot().ballDots,cards.snapshot().ballDots);
assert.equal(ctx.state.scores.length,1);
assert(!ctx.recoverWeeklyRatingDays(backup),'the same backup adds no duplicate days');
assert(ctx.validWeeklyRatingProgress(ctx.state.weeklyRatingProgress));
console.log('PASS: switching back retains weekly credit; older backup recovers rating without overwriting current scores or counting attempted sets.');
