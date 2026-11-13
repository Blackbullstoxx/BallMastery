'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
(async()=>{
 let starts=0,constructed=0,reading=false,now=100000;const scheduled=new Map();let timerId=0;
 class Recognition{constructor(){constructed++;this.processLocally=false}start(){starts++;queueMicrotask(()=>this.onstart?.())}abort(){}}
 const ctx={Date:class extends Date{static now(){return now}},Promise,Math,run:null,tab:'today',window:{SpeechRecognition:Recognition},document:{hidden:false,querySelector:()=>null},isReadOnly:()=>reading,toast:()=>{},setTimeout:(fn,ms)=>{scheduled.set(++timerId,{fn,ms});return timerId},clearTimeout:id=>scheduled.delete(id),clearInterval:id=>scheduled.delete(id),setInterval:(fn,ms)=>{scheduled.set(++timerId,{fn,ms});return timerId}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../colour-perception.js','utf8')+';this.cp=colourPerception;',ctx);const cp=ctx.cp;
 ctx.run={section:'ball',index:0,plan:[{key:'001'},{key:'001'}]};assert(await cp.prepare());assert.equal(starts,0,'speed-only plans do not request permission');
 for(const section of ['juggling','feints']){ctx.run={section,index:0,plan:[{colour:true}]};await cp.prepare();assert.equal(starts,0)}
 ctx.run={section:'ball',index:0,plan:[{key:'001'},{key:'001',colour:true}]};reading=true;await cp.prepare();reading=false;ctx.document.hidden=true;await cp.prepare();ctx.document.hidden=false;ctx.tab='records';await cp.prepare();ctx.tab='today';assert.equal(constructed,0);
 assert(await cp.prepare());assert.equal(starts,1,'mixed plans request permission at the initial explicit start, before the speed set');ctx.run.index=1;assert(await cp.prepare());assert.equal(starts,1,'preparation is reused when the colour set is reached');cp.stop(true);
 // Exercise the real countdown/update state machine with the actual colour controller.
 const app=fs.readFileSync(__dirname+'/../app.js','utf8');
 Object.assign(ctx,{$:()=>null,colourPerception:cp,playerCards:{trainingPaused:()=>false},refreshColourPlan:()=>{},prepareTimerAudio:async()=>true,ensureAudio:async()=>{},wakeRetries:0,wakeRetryAt:0,wakeWarning:false,silence:()=>{},beep:()=>{},tick:null,scrollTimerIntoView:()=>{},syncScreenAwake:()=>{},syncBallTime:()=>{},checkTrainingDay:()=>false,refreshTimerRing:()=>{},save:()=>{},refreshDayOverview:()=>{},countCompletedSet:()=>{}});
 ctx.renderRunner=()=>cp.sync();
 vm.runInContext(app.slice(app.indexOf('async function countdown('),app.indexOf('function timerText(')),ctx);
 vm.runInContext(app.slice(app.indexOf('function begin('),app.indexOf('function pauseRun(')),ctx);
 ctx.run={section:'ball',index:0,phase:'ready',paused:false,plan:[{key:'001',work:5,rest:5},{key:'001',work:5,rest:5,colour:true}]};
 await ctx.countdown();assert.equal(starts,2,'one preparation at Los geht’s');assert.equal(ctx.run.phase,'count');
 const expire=()=>{now=ctx.run.deadline;ctx.run.last=0;ctx.update()};
 expire();assert.equal(ctx.run.phase,'work');assert.equal(starts,2,'speed work does not start an active recognizer');
 expire();assert.equal(ctx.run.phase,'rest');expire();assert.equal(ctx.run.index,1);assert.equal(ctx.run.phase,'work','mixed same-drill sets continue directly without another start button');
 const recognitionStart=[...scheduled.values()].find(t=>t.ms===850);assert(recognitionStart);recognitionStart.fn();await Promise.resolve();assert.equal(starts,3,'colour recognition starts automatically after the transition');cp.stop(true);
 ctx.run={section:'ball',index:0,plan:[{key:'001'},{key:'002',colour:true}]};assert(!ctx.sameNext(),'a different drill still has its own deliberate start');
 // Permission denial cannot launch a countdown or an automatic unprepared run.
 ctx.window.SpeechRecognition=class{start(){queueMicrotask(()=>this.onerror?.({error:'not-allowed'}))}abort(){}};
 ctx.run={section:'ball',index:0,phase:'ready',plan:[{key:'001'},{key:'001',colour:true}]};await ctx.countdown();assert.equal(ctx.run.phase,'ready');
 console.log('PASS: first-tap mixed-plan permission, preparation reuse, full speed/rest/colour transition without another tap, active recognition only in colour work, speed-only/juggling/feints/read-only/hidden scope and denial fallback.');
})().catch(e=>{console.error(e);process.exit(1)});
