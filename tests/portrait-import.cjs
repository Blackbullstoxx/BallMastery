'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
async function check(format,opaque=false){
 let closed=false,attempts=[];
 const canvas={width:0,height:0,getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8Array([0,0,0,opaque?255:0])})}),toDataURL(type,quality){attempts.push([canvas.width,quality]);return 'data:image/'+format+';base64,'+'A'.repeat(Math.ceil(canvas.width*canvas.height*1.3))}};
 const ctx={document:{createElement:()=>canvas},createImageBitmap:async()=>({width:1312,height:1199,close(){closed=true}})};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../player-cards.js','utf8'),ctx);
 if(opaque){await assert.rejects(ctx.prepareCardPortrait({type:'image/png',size:1300000}),/transparenten Hintergrund/);assert(closed);return;}
 const result=await ctx.prepareCardPortrait({type:'image/png',size:1300000});
 assert(result.length<=1000000);assert(result.startsWith('data:image/'+format));assert(closed);
 assert.equal(attempts[0][0],1000);assert(attempts.some(([width])=>width===900));
 if(format==='png')assert.equal(attempts.length,2,'PNG quality is ignored; resize immediately');
 else assert.equal(attempts.length,4,'try high WebP qualities before resizing');
 await assert.rejects(ctx.prepareCardPortrait({type:'image/jpeg',size:50000}),/PNG oder WebP/);
}
(async()=>{await check('webp');await check('png');await check('png',true);console.log('PASS: automatic WebP compression, PNG fallback resizing, transparency validation, bounded backup size and bitmap cleanup')})().catch(e=>{console.error(e);process.exitCode=1});
