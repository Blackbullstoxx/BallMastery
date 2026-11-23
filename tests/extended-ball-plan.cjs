const fs=require('fs'),vm=require('vm'),assert=require('assert');
const day='2026-11-13',rows=n=>Array.from({length:n},(_,i)=>({key:'001',kind:'Wochenübung',set:i+1,total:n,work:30,rest:10}));
const ctx={state:{groups:{ball:true},blockDone:{[day]:['ball']},completedPlans:{[day]:{ball:rows(2)}}},date:()=>day,runs:{},activeSection:'ball',run:null,levels:[],plan:()=>rows(4),refreshColourPlan:()=>{}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../day-overview.js','utf8'),ctx);
ctx.reopenExtendedPlan('ball');assert.deepEqual([...ctx.state.blockDone[day]],[]);assert.equal(ctx.run.plan.length,2);assert.equal(ctx.run.phase,'ready');assert.equal(ctx.run.completedSets.length,0);
let blocks=ctx.overviewBlocks('ball',ctx.run.plan);assert.equal(ctx.overviewCredits('ball',blocks[0]).length,0,'new sets must not inherit old credits with identical totals');
assert.equal(ctx.state.completedPlans[day].ball.length,2);
ctx.reopenExtendedPlan('ball');assert.equal(ctx.run.plan.length,2,'repeated save does not duplicate additions');
ctx.run.phase='work';const active=ctx.run;ctx.plan=()=>rows(6);ctx.reopenExtendedPlan('ball');assert.equal(ctx.run,active,'active training stays intact');
ctx.run.phase='done';ctx.state.completedPlans[day].ball.push(...rows(2));ctx.state.blockDone[day]=['ball'];ctx.plan=()=>rows(4);ctx.reopenExtendedPlan('ball');assert(ctx.state.blockDone[day].includes('ball'),'unchanged plan remains complete');
ctx.plan=()=>rows(5);ctx.reopenExtendedPlan('ball');assert.equal(ctx.run.plan.length,1,'second extension subtracts all previously completed sets');
console.log('PASS: additional sets only, isolated credits, repeated saves, ongoing run preservation and subsequent extensions');
ctx.state.completedPlans[day].feints=rows(2).map(d=>({...d,key:'feints',kind:'Finten · frei wählen',noScore:true}));ctx.state.blockDone[day].push('feints');ctx.plan=()=>rows(4).map(d=>({...d,key:'feints',kind:'Finten · frei wählen',noScore:true}));ctx.reopenExtendedPlan('feints');assert.equal(ctx.runs.feints.plan.length,2);assert(!ctx.state.blockDone[day].includes('feints'));
const juggling=work=>[{key:'toe',name:'Zehenjonglieren',kind:'Jonglieren',set:1,total:1,work,rest:0,juggling:true}];ctx.state.completedPlans[day].juggling=juggling(180);ctx.state.blockDone[day].push('juggling');ctx.plan=()=>[...juggling(360),{...juggling(120)[0],key:'free'}];ctx.reopenExtendedPlan('juggling');assert.equal(ctx.runs.juggling.plan[0].work,180,'only added minutes remain');assert.equal(ctx.runs.juggling.plan[1].work,120,'new technique included');assert.equal(ctx.state.completedPlans[day].juggling[0].work,180);
console.log('PASS: feint sets, added juggling minutes and new techniques');
// Exact regression: weekly completed, extra review sets, discard, rebuild.
const weekly=rows(2),review=rows(2).map(d=>({...d,key:'002',kind:'Wiederholung · Anfänger'}));
ctx.levels=['Anfänger'];ctx.isScheduled=()=>true;ctx.state.groups.ball=true;ctx.state.reviews=[{count:1,sets:4}];ctx.state.work=30;ctx.state.rest=10;ctx.state.colourSets={review:[0]};ctx.state.completedPlans[day].ball=[...weekly,...review];ctx.state.blockDone[day]=['ball'];ctx.runs={};ctx.plan=()=>[...weekly];
ctx.reopenExtendedPlan('ball');assert(ctx.runs.ball.plan.every(d=>d.key==='002'));assert.equal(ctx.runs.ball.plan.length,2);
ctx.preserveDiscardedWork(ctx.runs.ball);delete ctx.runs.ball;ctx.run=null;ctx.reopenExtendedPlan('ball');assert(ctx.runs.ball.plan.every(d=>d.key==='002'),'discard must not reintroduce weekly exercise');assert.equal(ctx.runs.ball.plan.length,2);
ctx.runs.ball.completedSets=[0];ctx.preserveDiscardedWork(ctx.runs.ball);delete ctx.runs.ball;ctx.run=null;ctx.reopenExtendedPlan('ball');assert.equal(ctx.runs.ball.plan.length,1,'completed extension set remains completed');assert.equal(ctx.runs.ball.plan[0].key,'002');
console.log('PASS: discarded review extension excludes completed weekly exercise and preserves completed added sets');

// Settings can extend an unfinished plan even when the area has no archived completion.
ctx.state.completedPlans={};ctx.state.blockDone={};ctx.state.overviewDay=null;
const activeWeekly={day,section:'ball',plan:[...weekly],index:1,phase:'review',completedSets:[0,1],completedBlocks:[1],colourResults:{1:{shown:4,correct:4,interrupted:0}}};
ctx.runs={ball:activeWeekly};ctx.run=activeWeekly;
ctx.state.reviews=[{count:1,sets:2}];ctx.plan=()=>[...weekly,...review];
ctx.reopenExtendedPlans();
assert.strictEqual(ctx.run,activeWeekly);
assert.deepEqual(ctx.run.plan.map(d=>d.key),['001','001','002','002']);
assert.deepEqual(ctx.run.completedSets,[0,1]);assert.deepEqual(ctx.run.completedBlocks,[1]);
assert.equal(ctx.run.phase,'review');assert.equal(ctx.run.index,1);
assert.equal(ctx.run.colourResults[1].correct,4);
ctx.reopenExtendedPlans();assert.equal(ctx.run.plan.length,4,'saving again does not append duplicates');
// A completed review rotates out of the current selection. An unchanged count
// must not add the next drill from the queue.
ctx.run.index=3;ctx.run.completedSets.push(2,3);ctx.run.completedBlocks.push(3);
const nextReview=review.map(row=>({...row,key:'003'}));
ctx.plan=()=>[...weekly,...nextReview];
ctx.reopenExtendedPlans();assert.equal(ctx.run.plan.length,4);
ctx.state.reviews[0].count=2;
ctx.plan=()=>[...weekly,...nextReview,...review.map(row=>({...row,key:'004'}))];
ctx.reopenExtendedPlans();
assert.deepEqual([...ctx.run.plan.map(d=>d.key)],['001','001','002','002','003','003']);
console.log('PASS: a live weekly exercise keeps its progress when settings add reviews; queue rotation and repeated saves do not add duplicates');
