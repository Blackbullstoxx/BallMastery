'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
(async()=>{
 let starts=0,constructed=0,reading=false;const scheduled=new Map();let timerId=0;
 class Recognition{constructor(){constructed++;this.processLocally=false}start(){starts++;queueMicrotask(()=>this.onstart?.())}abort(){}}
 const ctx={Date,Promise,Math,run:null,tab:'today',window:{SpeechRecognition:Recognition},document:{hidden:false,querySelector:()=>null},isReadOnly:()=>reading,toast:()=>{},setTimeout:fn=>{scheduled.set(++timerId,fn);return timerId},clearTimeout:id=>scheduled.delete(id),clearInterval:id=>scheduled.delete(id),setInterval:()=>++timerId};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../colour-perception.js','utf8')+';this.cp=colourPerception;',ctx);const cp=ctx.cp;
 ctx.run={section:'ball',index:0,plan:[{key:'001'},{key:'001',colour:true}]};assert(await cp.prepare());assert.equal(starts,0,'a later colour set cannot request permission during a speed set');
 for(const section of ['juggling','feints']){ctx.run={section,index:0,plan:[{colour:true}]};await cp.prepare();assert.equal(starts,0)}
 ctx.run={section:'ball',index:0,plan:[{key:'001',colour:true}]};reading=true;await cp.prepare();reading=false;ctx.document.hidden=true;await cp.prepare();ctx.document.hidden=false;ctx.tab='records';await cp.prepare();ctx.tab='today';assert.equal(constructed,0);
 assert(await cp.prepare());assert.equal(starts,1,'current colour set prepares recognition');assert(await cp.prepare());assert.equal(starts,1,'preparation is reused');cp.stop(true);
 const app=fs.readFileSync(__dirname+'/../app.js','utf8');vm.runInContext(app.slice(app.indexOf('function sameNext('),app.indexOf('function pauseRun(')),ctx);
 ctx.run={section:'ball',index:0,plan:[{key:'001'},{key:'001',colour:true}]};assert(!ctx.sameNext(),'switching to colour waits for a deliberate start tap');ctx.run.plan[1]={key:'001'};assert(ctx.sameNext(),'normal same-mode sets keep automatic transitions');ctx.run.plan[0].colour=ctx.run.plan[1].colour=true;assert(ctx.sameNext());
 console.log('PASS: speed-only/mixed-plan starts, juggling, feints, read-only, hidden and other tabs never request the microphone; current colour starts do; preparation reuse and mode transitions.');
})().catch(e=>{console.error(e);process.exit(1)});
