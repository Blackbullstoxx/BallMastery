'use strict';
// A viewed backup lives only in memory. The device's own state and Dropbox
// profile are never replaced by it, including when the browser is closed.
let readOnlySession=null;
function isReadOnly(){return readOnlySession!==null}
function readOnlyInfo(){return readOnlySession?.info||null}
function beginReadOnly(data,info){
 if(!validBackup(data))throw Error('Diese Sicherung kann nicht angezeigt werden.');
 if(!isReadOnly())checkpointTraining();
 const own=readOnlySession?.own||JSON.parse(JSON.stringify(state));
 const ownTab=readOnlySession?.tab||tab,viewTab=isReadOnly()?tab:'today';
 const rewards=readOnlySession?.rewards||new Set(rewardShown);
 clearRuns();
 readOnlySession={own,tab:ownTab,rewards,info};tab=viewTab;
 try{applyBackupData(JSON.parse(JSON.stringify(data)),true)}catch(e){closeReadOnly();throw e}
 if(typeof dropboxBackup!=='undefined')dropboxBackup.changed();
}
function closeReadOnly(){
 if(!readOnlySession)return;
 const previous=readOnlySession;clearRuns();readOnlySession=null;
 state=previous.own;rewardShown.clear();previous.rewards.forEach(key=>rewardShown.add(key));
 restoreTraining();tab=previous.tab;render();
}
function renderReadOnlyUI(){
 let banner=document.querySelector('#read-only-banner');
 const settings=document.querySelector('nav [data-tab="settings"]');
 if(settings){settings.disabled=isReadOnly();settings.title=isReadOnly()?'In der Leseansicht nicht verfügbar':''}
 if(!isReadOnly()){banner?.remove();return}
 const info=readOnlyInfo(),view=document.querySelector('#view');
 if(!banner){banner=document.createElement('aside');banner.id='read-only-banner';view.before(banner)}
 banner.innerHTML=`<div><strong>Ansicht: ${esc(info.name||state.name||'Training')}</strong><span>Nur ansehen · Stand ${esc(new Date(info.savedAt).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'}))}</span></div><div class="read-only-actions"><button type="button" id="read-only-refresh">Stand aktualisieren</button><button type="button" id="read-only-close">Ansicht schließen</button></div><p id="read-only-notice" role="status"></p>`;
 banner.querySelector('#read-only-close').onclick=closeReadOnly;
 banner.querySelector('#read-only-refresh').onclick=async()=>{
  const expected=readOnlySession,button=banner.querySelector('#read-only-refresh');button.disabled=true;
  try{await info.refresh()}catch(e){if(readOnlySession===expected)banner.querySelector('#read-only-notice').textContent=e?.message||'Der Stand konnte nicht aktualisiert werden.'}
  finally{if(readOnlySession===expected)button.disabled=false}
 };
 // Accordions, charts, videos and area selection remain usable. All training
 // actions, input forms and record corrections are unavailable in this view.
 view.querySelectorAll('input,select,textarea').forEach(el=>el.disabled=true);
 view.querySelectorAll('[data-score],#home-mastery,[data-edit],[data-delete]').forEach(el=>el.hidden=true);
 const allowed='[data-today-view],[data-training-area],#to-training,[data-section],[data-library-area],[data-chart-period],[data-record-duration],[data-record-title],[data-ball-total],[data-history-more],.fp-perspective';
 view.querySelectorAll('button').forEach(button=>{if(!button.matches(allowed)){button.disabled=true;button.hidden=true}});
}

