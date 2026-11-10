'use strict';
// Only card effects use this module. The existing timer signals keep their
// own volume/behavior. Buffers are decoded locally and reused across reveals.
const cardAudio=(()=>{
 const files=['cards/glanz-whoosh.mp3','cards/rating-clicks.wav'];
 const burst=[];for(let t=80;t<1250;t+=110-40*Math.min(1,t/2900))burst.push(t);
 burst.push(1309,1419,1549,1709);
 let buffers=null,loading=null;const active=new Set();
 const enabled=()=>state.cardSounds!==false&&!isReadOnly()&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 function load(context){
  if(buffers)return Promise.resolve(buffers);
  if(!loading)loading=Promise.all(files.map(async file=>{const r=await fetch(file);if(!r.ok)throw Error('Card sound unavailable');return context.decodeAudioData(await r.arrayBuffer())})).then(result=>buffers=result).catch(error=>{loading=null;throw error});
  return loading;
 }
 async function prepare(){
  if(!enabled())return false;
  let timeout;
  try{
   // ensureAudio invokes resume/unlock synchronously in the finish-button tap.
   await ensureAudio();const context=audio;
   await Promise.race([load(context),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Card sound timeout')),2000)})]);
   return context===audio&&context.state==='running'&&!document.hidden;
  }catch{return false}finally{clearTimeout(timeout)}
 }
 function preload(){if(enabled()&&typeof audio!=='undefined'&&audio?.state==='running')void load(audio).catch(()=>{})}
 function stopAll(){for(const effect of [...active])effect.stop()}
 function create(){
  const context=typeof audio!=='undefined'?audio:null;
  if(!enabled()||!buffers||context?.state!=='running'||document.hidden)return null;
  let live=true,index=0;const nodes=new Set();
  function stop(){if(!live)return;live=false;active.delete(effect);for(const source of [...nodes]){try{source.stop()}catch{}source.disconnect()}nodes.clear()}
  function play(buffer,offset=0,duration,gain=1){
   if(!live||!enabled()||document.hidden||context!==audio||context.state!=='running'){stop();return}
   const source=context.createBufferSource(),level=context.createGain();source.buffer=buffer;level.gain.value=gain;source.connect(level);level.connect(context.destination);nodes.add(source);
   source.onended=()=>{nodes.delete(source);source.disconnect();level.disconnect()};
   try{if(duration===undefined)source.start();else source.start(0,offset,duration)}catch{nodes.delete(source);source.disconnect();level.disconnect()}
  }
  function tick(slot){play(buffers[1],slot*.04,.035)}
  const effect={
   shine(){play(buffers[0])},
   countFrame(elapsed,tailStep){
    if(!live)return;
    if(elapsed<1800){let slot=-1;while(index<burst.length&&elapsed>=burst[index])slot=index++;if(slot>=0)tick(slot)}
    // These events come directly from the total field after it changes on screen.
    // Late frames coalesce steps: never queue a stale burst after a stall.
    else if(tailStep>0)tick(burst.length+tailStep-1);
   },stop
  };
  active.add(effect);return effect;
 }
 function settingsMarkup(){return `<label>Kartensounds<input type="checkbox" id="card-sounds" ${state.cardSounds!==false?'checked':''}></label><p class="hint">Whoosh beim Kartenglanz und Klicks beim Hochzählen. Die Trainingssignale bleiben unabhängig davon aktiv.</p>`}
 function bindSettings(){const field=document.querySelector('#card-sounds');if(field)field.onchange=()=>{if(isReadOnly())return;state.cardSounds=field.checked;if(!field.checked)stopAll();save();toast('Kartensounds '+(field.checked?'eingeschaltet':'ausgeschaltet'))}}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAll()});
 return {prepare,preload,create,stopAll,enabled,settingsMarkup,bindSettings};
})();
