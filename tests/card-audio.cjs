'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
(async()=>{
 let unlocked=0,decodes=0,readonly=false,reduced=false,plays=[],sources=[];const listeners={};
 const context={state:'running',destination:{},resume:async()=>{},decodeAudioData:async()=>({tag:decodes++}),createGain:()=>({gain:{value:1},connect:()=>{},disconnect:()=>{}}),createBufferSource:()=>{const n={connect:()=>{},disconnect:()=>{},start:(when,offset,duration)=>plays.push({tag:n.buffer.tag,offset,duration}),stop:()=>{n.stopped=true;n.onended?.()}};sources.push(n);return n}};
 const ctx={audio:context,state:{cardSounds:true},isReadOnly:()=>readonly,window:{matchMedia:()=>({matches:reduced})},document:{hidden:false,addEventListener:(k,f)=>listeners[k]=f},ensureAudio:async()=>{unlocked++},fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(2)}),setTimeout,clearTimeout};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../card-audio.js','utf8')+';this.effects=cardAudio;',ctx);const effects=ctx.effects;
 const preparation=effects.prepare();assert.equal(unlocked,1,'unlocks synchronously inside the user tap');assert(await preparation);assert.equal(decodes,2);const e=effects.create();assert(e);e.shine();assert.equal(plays[0].tag,0);
 // One common fast-click track, with the chosen smooth bridge.
 for(let time=0;time<1800;time+=10)e.countFrame(time,0);
 const fast=plays.filter(x=>x.tag===1);assert.equal(fast.length,16);assert.deepEqual(fast.map(x=>Math.round(x.offset*1000)),Array.from({length:16},(_,i)=>i*40));
 const times=Array.from({length:8},(_,i)=>1800+4600*((i+1)/8)**1.8);
 for(let i=0;i<8;i++)e.countFrame(times[i],i+1);
 const ticks=plays.filter(x=>x.tag===1);assert.equal(ticks.length,24);assert.equal(ticks.at(-1).offset,.92);assert.equal(ticks.at(-1).duration,.035);
 // Frozen frames do not play a catch-up rattle. Tail audio only follows display events.
 const count=plays.length;e.countFrame(6500,0);assert.equal(plays.length,count);e.stop();e.countFrame(6600,8);e.shine();assert.equal(plays.length,count);assert(sources.every(n=>n.stopped));
 plays=[];const stalled=effects.create();stalled.countFrame(1700,0);assert.equal(plays.length,1,'coalesce missed early sounds');stalled.countFrame(6400,8);assert.equal(plays.length,2,'one final visible value means one final click');effects.stopAll();stalled.countFrame(6500,8);assert.equal(plays.length,2);
 const hidden=effects.create();hidden.shine();ctx.document.hidden=true;listeners.visibilitychange();assert(sources.at(-1).stopped);ctx.document.hidden=false;
 ctx.state.cardSounds=false;assert.equal(effects.create(),null);assert.equal(await effects.prepare(),false);assert.equal(unlocked,1,'muting card effects never touches timer audio');ctx.state.cardSounds=true;readonly=true;assert.equal(effects.create(),null);readonly=false;reduced=true;assert.equal(effects.create(),null);reduced=false;
 assert(await effects.prepare());assert.equal(decodes,2,'decoded assets reused');
 const failed={...ctx,state:{cardSounds:true},fetch:async()=>{throw Error('offline asset missing')}};vm.createContext(failed);vm.runInContext(fs.readFileSync(__dirname+'/../card-audio.js','utf8')+';this.effects=cardAudio;',failed);assert.equal(await failed.effects.prepare(),false,'audio failure returns without blocking the card');
 const index=fs.readFileSync(__dirname+'/../index.html','utf8'),sw=fs.readFileSync(__dirname+'/../sw.js','utf8');assert(index.indexOf('card-audio.js?v=116')<index.indexOf('player-card-view.js?v=124'));for(const file of ['card-audio.js?v=116','cards/glanz-whoosh.mp3','cards/rating-clicks.wav'])assert(sw.includes(file));
 console.log('PASS: tap unlock, reused decoded approved sounds, 16 smooth opening clicks, eight display-driven final clicks, no catch-up burst, cancellation/hidden cleanup, mute/read-only/reduced motion and offline assets.');
})().catch(e=>{console.error(e);process.exitCode=1});
