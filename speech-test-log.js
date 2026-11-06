'use strict';
// Temporary, device-local diagnostics. Deliberately outside state and all training backups.
const speechTestLog=(()=>{
 const KEY='balltraining-speech-test-v1',ENABLED='balltraining-speech-test-enabled-v1',LIMIT=1000;
 let enabled=false,events=[],serial=0,downloadUrl=null;
 const reading=()=>typeof isReadOnly==='function'&&isReadOnly();
 try{enabled=localStorage.getItem(ENABLED)==='true';const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved?.version===1&&Array.isArray(saved.events))events=saved.events.slice(-LIMIT)}catch{}
 const countText=()=>`${events.length} Protokolleinträge auf diesem Gerät · maximal ${LIMIT}`;
 function paint(){const el=document.querySelector('#speech-test-count');if(el)el.textContent=countText();const button=document.querySelector('#speech-test-export');if(button)button.disabled=!events.length;const clear=document.querySelector('#speech-test-clear');if(clear)clear.disabled=!events.length}
 function persist(){try{localStorage.setItem(KEY,JSON.stringify({version:1,events}));paint();return true}catch{enabled=false;try{localStorage.setItem(ENABLED,'false')}catch{}toast('Testprotokoll konnte nicht gespeichert werden. Protokollierung wurde ausgeschaltet.');return false}}
 function begin(r,index){if(!enabled||reading())return null;const d=r.plan[index];return {sessionId:Date.now().toString(36)+'-'+(++serial),started:Date.now(),drill:d.key,kind:d.kind,set:d.set,total:d.total,workSeconds:d.work}}
 function add(context,event,details={}){if(!enabled||!context||reading())return;const {started,...meta}=context;events.push({...meta,time:new Date().toISOString(),elapsedMs:Math.max(0,Date.now()-started),event,...details});if(events.length>LIMIT)events=events.slice(-LIMIT);persist()}
 function clear(){if(reading())return;events=[];try{localStorage.removeItem(KEY)}catch{}if(downloadUrl){URL.revokeObjectURL(downloadUrl);downloadUrl=null}const host=document.querySelector('#speech-test-result');if(host)host.innerHTML='';paint()}
 function reset(){if(reading())return;enabled=false;try{localStorage.removeItem(ENABLED)}catch{}clear()}
 function markup(){return `<section class="settings-subsection"><h3>Testprotokoll Farberkennung</h3><label>Erkannten Text lokal protokollieren<input type="checkbox" id="speech-test-enabled" ${enabled?'checked':''}></label><p class="hint">Nur für Tests: erkannter Text, angezeigte Farbe und Zeitpunkt. Keine Tonaufnahme. Bleibt auf diesem Gerät und ist nicht in Dropbox- oder Trainingsbackups enthalten. Der Schalter wirkt sofort.</p><p class="hint" id="speech-test-count">${countText()}</p><button type="button" id="speech-test-export" ${events.length?'':'disabled'}>Testprotokoll exportieren</button><button type="button" id="speech-test-clear" ${events.length?'':'disabled'}>Testprotokoll löschen</button><div id="speech-test-result"></div></section>`}
 async function exportLog(){
  if(reading()||!events.length)return;
  const text=JSON.stringify({format:'balltraining-speech-test-v1',exportedAt:new Date().toISOString(),matching:'exact-colour-word-plus-geld-for-gelb-and-brot-for-rot',timingVersion:2,events},null,2),name='farberkennung-test-'+new Date().toISOString().slice(0,10)+'.json',blob=new Blob([text],{type:'application/json'});
  if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=URL.createObjectURL(blob);
  const host=document.querySelector('#speech-test-result');host.innerHTML=`<a class="download" href="${downloadUrl}" download="${name}" id="speech-test-download">Testprotokoll herunterladen</a><details><summary>Protokoll als Text</summary><textarea id="speech-test-text" aria-label="Testprotokoll als Text" readonly rows="6"></textarea></details>`;document.querySelector('#speech-test-text').value=text;
  try{const file=new File([text],name,{type:'application/json'});if(navigator.canShare?.({files:[file]})&&navigator.share)await navigator.share({files:[file]});else document.querySelector('#speech-test-download').click()}catch(e){if(e.name!=='AbortError')toast('Bitte den Download-Link oder den Protokolltext verwenden.')}
 }
 function bind(){const input=document.querySelector('#speech-test-enabled');if(!input)return;input.onchange=()=>{if(reading())return;try{localStorage.setItem(ENABLED,String(input.checked));enabled=input.checked;toast(enabled?'Testprotokoll aktiviert':'Testprotokoll deaktiviert')}catch{input.checked=enabled;toast('Testprotokoll konnte nicht aktiviert werden.')}};document.querySelector('#speech-test-export').onclick=exportLog;document.querySelector('#speech-test-clear').onclick=()=>confirmInline(document.querySelector('#speech-test-result'),'Lokales Testprotokoll löschen?',clear);paint()}
 return {begin,add,markup,bind,reset};
})();
