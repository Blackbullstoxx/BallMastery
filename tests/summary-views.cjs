'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=file=>fs.readFileSync(__dirname+'/../'+file,'utf8');
for(const file of ['app.js','training-progress.js','training-preview.js']){
 assert(!source(file).includes('ballTrainingMarkup('),file+' must not render legacy total text');
 assert(!source(file).includes('Training verwerfen'),file+' must not render the discard action');
}

const day='2026-11-24';
const ctx=vm.createContext({
 date:()=>day,levels:['Bronze'],drills:[{id:'001',name:'Test',level:0}],title:drill=>drill.name,
 restoreColourResults:()=>({}),techNames:{toe:'Zehn jonglieren',free:'Freies Jonglieren'},state:{}
});
vm.runInContext(source('training-progress.js'),ctx);
const ball={key:'001',kind:'Wochenübung',set:1,total:2,work:30,rest:30};
const feints={key:'feints',kind:'Finten · frei wählen',set:1,total:2,work:30,rest:30};
const juggling={key:'toe',kind:'Jonglieren',set:1,total:1,work:30,rest:0};
for(const [section,plan] of [
 ['ball',[ball,{...ball,set:2}]],
 ['feints',[feints,{...feints,set:2}]],
 ['juggling',[juggling,{...juggling,key:'free'}]]
]){
 const restore=options=>ctx.restoreSavedRun({day,section,plan,index:0,completedSets:[],...options},section);
 const stateOf=value=>[value.phase,value.index,value.remaining,value.paused,[...value.completedSets]];
 assert.deepEqual(stateOf(restore({phase:'ready',remaining:5})),['ready',0,5,false,[]]);
 assert.deepEqual(stateOf(restore({phase:'count',remaining:2})),['ready',0,5,false,[]]);
 assert.deepEqual(stateOf(restore({phase:'work',remaining:30})),['ready',0,5,false,[]]);
 assert.deepEqual(stateOf(restore({phase:'work',remaining:12})),['work',0,12,true,[]]);
 assert.deepEqual(stateOf(restore({phase:'review',remaining:0,completedSets:[0]})),['ready',1,5,false,[0]]);
 assert.deepEqual(stateOf(restore({phase:'review',remaining:0,completedSets:[0],checkpoints:{1:{phase:'work',remaining:8}}})),['work',1,8,true,[0]]);
 assert.deepEqual(stateOf(restore({phase:'review',index:1,remaining:0,completedSets:[0,1]})),['review',1,0,false,[0,1]]);
 if(section!=='juggling')assert.deepEqual(stateOf(restore({phase:'rest',remaining:12,completedSets:[0]})),['ready',1,5,false,[0]]);
}
const extra=ctx.restoreSavedRun({day,section:'juggling',plan:[juggling],index:0,completedSets:[0],extraSeconds:180,phase:'count',remaining:3},'juggling');
assert.equal(extra.phase,'ready');
assert.equal(extra.extraSeconds,180);
assert(ctx.restoreSavedRun(ctx.trainingRunSnapshot(extra,'juggling'),'juggling'));
console.log('PASS: saved training opens in ready, paused work, next set or completion as appropriate.');
