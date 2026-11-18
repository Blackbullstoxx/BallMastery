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
