'use strict';
// Credentials belong to this browser only, never to exported training backups.
const dropboxBackup=(()=>{
 const APP_KEY='v2eh42jql99c36g',ROOT='/balltraining',META='balltraining-dropbox-meta-v1',PENDING='balltraining-dropbox-pkce-v1';
 let initializedResolve;const initialized=new Promise(resolve=>initializedResolve=resolve);
 let auth=null,meta={},ready=false,busy=false,timer=null,dirty=false,urgent=false,lastPayload='',message='',pendingPreview=null,conflictPath='',connectionGeneration=0;
 const $d=s=>document.querySelector(s),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const uid=()=>crypto.randomUUID(),folderName=name=>(name||'Training').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,35).replace(/^-|-$/g,'')||'training';
 const reading=()=>typeof isReadOnly==='function'&&isReadOnly();
 const meaningful=s=>!!(s.manualTraining?.length||s.scores?.length||s.colourScores?.length||s.colourTraining?.length||s.sessions?.length||Object.values(s.ballTraining?.days||{}).some(x=>x>0));
 function profilePath(id){if(!/^[a-z0-9-]{10,100}$/.test(id||''))throw Error('Ungültige Sicherungsauswahl.');return ROOT+'/'+id}
 function snapshotPath(path){if(!/^\/balltraining\/[a-z0-9-]{10,100}\/[a-zA-Z0-9.-]+\.json$/.test(path||''))throw Error('Ungültige Sicherungsdatei.');return path}
 // Compare data rather than property order or automatically rebuilt daily views.
 function comparable(value){
  const copy=JSON.parse(typeof value==='string'?value:JSON.stringify(value)),today=new Date().toLocaleDateString('sv-SE');
  // Running clocks are local checkpoints, not new cloud-backup events.
  // Completed sets are represented in overviewDay/practiceCounts; explicit
  // interruptions request an immediate full snapshot even without new records.
  delete copy.activeTraining;
  // Display-only recovered timer totals change continuously with active clocks.
  // They are still included in the full payload at genuine backup checkpoints.
  delete copy.areaTrainingHistory;
  if(copy.cardTraining)copy.cardTraining={version:copy.cardTraining.version,since:copy.cardTraining.since,completedDays:copy.cardTraining.completedDays};
  if(copy.ballTraining)copy.ballTraining={version:copy.ballTraining.version,since:copy.ballTraining.since};
  const overview=copy.overviewDay;
  if(overview?.day!==today||!Object.values(overview.sections||{}).some(section=>Object.values(section||{}).some(row=>row?.completed?.length)))delete copy.overviewDay;
  const ordered=v=>Array.isArray(v)?v.map(ordered):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(key=>[key,ordered(v[key])])):v;
  return JSON.stringify(ordered(copy));
 }
 function unchanged(){return !!lastPayload&&comparable(state)===comparable(lastPayload)}
 function credential(value,key='auth'){return new Promise((resolve,reject)=>{
  const req=indexedDB.open('balltraining-dropbox-auth',1);req.onupgradeneeded=()=>req.result.createObjectStore('connection');req.onerror=()=>reject(Error('Die Dropbox-Verbindung kann auf diesem Gerät nicht gespeichert werden.'));
  req.onsuccess=()=>{const db=req.result,tx=db.transaction('connection',value===undefined?'readonly':'readwrite'),store=tx.objectStore('connection'),op=value===undefined?store.get(key):value===null?store.delete(key):store.put(value,key);let result;op.onsuccess=()=>result=op.result;tx.oncomplete=()=>{db.close();resolve(result)};tx.onerror=()=>{db.close();reject(Error('Dropbox-Verbindung konnte nicht gespeichert werden.'))}};
 })}
 function persist(){localStorage.setItem(META,JSON.stringify(meta))}
 function status(){if(reading())return 'Leseansicht · keine Änderungen oder automatischen Sicherungen';if(!ready)return 'Dropbox wird vorbereitet …';if(message)return message;if(!auth)return 'Nicht verbunden';if(busy)return 'Sicherung läuft …';if(!meta.profile)return 'Verbunden · bitte Sicherung anlegen oder wiederherstellen';if(dirty)return 'Änderungen noch nicht online gesichert'+(navigator.onLine===false?' · kein Internet':'');return meta.lastSaved?'Zuletzt online gesichert: '+new Date(meta.lastSaved).toLocaleString('de-DE')+(meta.cleanupWarning?' · '+meta.cleanupWarning:meta.cleanupPending?' · Weitere alte Zwischenstände werden bei den nächsten Sicherungen bereinigt.':''):'Noch keine Online-Sicherung';}
 function indicator(){
  if(reading())return {tone:'saved',text:'Nur ansehen · schreibgeschützt'};
  if(!ready)return {tone:'waiting',text:'Wird vorbereitet …'};
  if(!auth)return {tone:'error',text:'Dropbox nicht verbunden'};
  if(busy)return {tone:'saving',text:'Wird gesichert …'};
  if(message)return {tone:'error',text:'Sicherung prüfen'};
  if(!meta.profile)return {tone:'saved',text:'Dropbox verbunden'};
  if(dirty)return {tone:'waiting',text:navigator.onLine===false?'Offline · Sicherung ausstehend':'Sicherung ausstehend'};
  if(!meta.lastSaved)return {tone:'saved',text:'Dropbox verbunden'};
  const stamp=new Date(meta.lastSaved),today=new Date().toDateString()===stamp.toDateString();
  return {tone:'saved',text:'Gesichert · '+(today?'':stamp.toLocaleDateString('de-DE')+' · ')+stamp.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})};
 }
 function openStatus(){
  switchTab('settings');const panel=$d('#dropbox-panel');if(!panel)return;
  const details=panel.closest('details');if(details)details.open=true;
  let note=$d('#dropbox-status');
  if(!auth&&!meaningful(state)&&note)note.textContent+=' · Schon einmal hier trainiert? Dropbox verbinden und eine vorhandene Sicherung laden.';
  panel.scrollIntoView({behavior:'smooth',block:'center'});
  const action=panel.querySelector('button');if(action)action.focus({preventScroll:true});
 }
 function paint(){const conflict=$d('#dropbox-conflict');if(conflict&&conflict.dataset.path!==conflictPath){conflict.dataset.path=conflictPath;conflict.innerHTML=conflictMarkup();const button=$d('#dropbox-keep-local');if(button)button.onclick=()=>safe(keepLocal)}const el=$d('#dropbox-status');if(el)el.textContent=status();
  const lamp=$d('#cloud-indicator');if(lamp){lamp.disabled=reading();const view=indicator();lamp.dataset.tone=view.tone;lamp.title=status();lamp.setAttribute('aria-label',view.text+'. Dropbox-Einstellungen öffnen');const label=$d('#cloud-indicator-text');if(label)label.textContent=view.text;lamp.onclick=openStatus}
 }
 function conflictMarkup(){return conflictPath?'<p class="hint">Die Online-Sicherung weicht vom gemerkten Stand ab. Du kannst deinen aktuellen Gerätestand zusätzlich sichern. Vorhandene Sicherungen bleiben erhalten.</p><button type="button" id="dropbox-keep-local">Aktuellen Gerätestand zusätzlich sichern</button><div id="dropbox-conflict-confirm"></div>':''}
 function keepLocal(){
  if(busy)throw Error('Bitte die laufende Sicherung abwarten.');
  if(!conflictPath||!meta.profile)return;
  const confirmed={path:conflictPath,profile:meta.profile,generation:connectionGeneration};
  confirmInline($d('#dropbox-conflict-confirm'),'Den aktuellen Gerätestand von „'+escape(state.name||meta.profileName||'Training')+'“ als neue Sicherung speichern und danach mit diesem Stand automatisch weitersichern? Es werden keine Online-Daten auf das Gerät geladen. Bestehende Sicherungen bleiben erhalten.',()=>safe(()=>flush(true,confirmed)));
 }
 function ui(){return `<section class="settings-subsection" id="dropbox-panel"><h3>Dropbox-Sicherung</h3><p class="hint" id="dropbox-status" role="status">${escape(status())}</p>${auth?`<p class="hint">${meta.profile?'Sicherung: '+escape(meta.profileName||'Training'):'Wähle zuerst, ob du dieses Training neu sichern oder vorhandene Daten laden möchtest.'}</p><div class="dropbox-buttons">${meta.profile?'<button type="button" id="dropbox-save">Jetzt sichern</button>':'<button type="button" id="dropbox-create">Dieses Training neu sichern</button>'}<button type="button" id="dropbox-list">Sicherungen laden</button><button type="button" id="dropbox-disconnect">Verbindung trennen</button></div>`:'<button type="button" id="dropbox-connect">Dropbox verbinden</button>'}<div id="dropbox-conflict">${conflictMarkup()}</div><p class="hint">Sichert Einstellungen, Bestwerte und Trainingsfortschritte. Videos bleiben unverändert. Ohne Internet wird später gesichert. Aufbewahrung je Training: alle Stände der letzten 24 Stunden, danach ein Stand pro Tag bis 30 Tage, anschließend ein Stand pro Monat.</p><div id="dropbox-result"></div></section>`}
 function refreshPanel(){const panel=$d('#dropbox-panel');if(panel){panel.outerHTML=ui();bind()}paint()}
 async function safe(action){try{await action()}catch(e){message=e?.message||'Dropbox ist gerade nicht erreichbar. Bitte erneut versuchen.';paint()}}
 async function tokenRequest(params){const r=await fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:APP_KEY,...params}),signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Dropbox-Anmeldung fehlgeschlagen. Bitte erneut verbinden und einen neuen Code verwenden.');return r.json()}
 async function accessToken(){if(!auth)throw Error('Bitte Dropbox verbinden.');if(auth.expires>Date.now()+60000)return auth.access_token;if(!auth.refresh_token)throw Error('Bitte Dropbox erneut verbinden.');const generation=connectionGeneration,old=auth,res=await tokenRequest({grant_type:'refresh_token',refresh_token:old.refresh_token});if(generation!==connectionGeneration)throw Error('Die Dropbox-Verbindung wurde geändert.');auth={...old,access_token:res.access_token,expires:Date.now()+res.expires_in*1000};await credential(auth);return auth.access_token}
 async function api(route,arg,content){if(reading()&&!['files/list_folder','files/list_folder/continue','files/download','files/get_temporary_link'].includes(route))throw Error('Die Leseansicht kann keine Dropbox-Dateien verändern.');const token=await accessToken(),headers={Authorization:'Bearer '+token};let url='https://api.dropboxapi.com/2/'+route,body=JSON.stringify(arg);if(content!==undefined){url='https://content.dropboxapi.com/2/'+route;headers['Content-Type']='application/octet-stream';headers['Dropbox-API-Arg']=JSON.stringify(arg);body=content}else if(route==='files/download'){url='https://content.dropboxapi.com/2/'+route;headers['Dropbox-API-Arg']=JSON.stringify(arg);body=undefined}else headers['Content-Type']='application/json';const r=await fetch(url,{method:'POST',headers,body,signal:AbortSignal.timeout(25000)});if(!r.ok){let code='';try{code=(await r.json()).error_summary||''}catch{}if(r.status===409&&code.startsWith('path/not_found'))return null;if(route==='files/create_folder_v2'&&r.status===409&&code.startsWith('path/conflict/folder'))return {};if(r.status===401)throw Error('Dropbox-Verbindung abgelaufen oder widerrufen. Bitte erneut verbinden.');if(r.status===403)throw Error('Dropbox-Berechtigungen fehlen. Bitte Lesen und Schreiben von Dateien freigeben und erneut verbinden.');throw Error(r.status===429?'Dropbox erhält zu viele Anfragen. Bitte später erneut versuchen.':'Dropbox-Anfrage fehlgeschlagen. Bitte später erneut versuchen.')}return r.json()}
 async function files(){let response=await api('files/list_folder',{path:ROOT,recursive:true,include_deleted:false}),entries=[];while(response){entries.push(...response.entries);if(!response.has_more)break;response=await api('files/list_folder/continue',{cursor:response.cursor})}return entries.filter(x=>x['.tag']==='file'&&/^\/balltraining\/[a-z0-9-]{10,100}\/[a-zA-Z0-9.-]+\.json$/.test(x.path_lower||'')).sort((a,b)=>b.server_modified.localeCompare(a.server_modified)||b.name.localeCompare(a.name))}
 // Reduce only this profile's immutable, app-generated snapshots. Unknown files,
 // recovery safety copies in other folders, and modified revisions are untouched.
 function retentionCandidates(entries,profile,protectedPath,now=Date.now()){
  const prefix=profilePath(profile)+'/',dayMs=86400000;
  const generated=/^\d{4}-\d{2}-\d{2}t\d{2}-\d{2}-\d{2}\.\d{3}z-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/;
  const rows=entries.filter(e=>e['.tag']==='file'&&e.path_lower?.startsWith(prefix)&&generated.test(e.path_lower.slice(prefix.length))&&/^[0-9a-f]{9,}$/.test(e.rev||'')&&Number.isFinite(Date.parse(e.server_modified))).slice().sort((a,b)=>Date.parse(b.server_modified)-Date.parse(a.server_modified)||b.path_lower.localeCompare(a.path_lower));
  const newest=rows[0]?.path_lower,buckets=new Set(),remove=[];
  for(const row of rows){
   const timestamp=Date.parse(row.server_modified),age=now-timestamp;
   if(age<=dayMs)continue;
   const day=new Date(timestamp).toLocaleDateString('sv-SE'),bucket=(age<=30*dayMs?'day:'+day:'month:'+day.slice(0,7));
   const keep=row.path_lower===protectedPath||row.path_lower===newest||!buckets.has(bucket);
   buckets.add(bucket);if(!keep)remove.push(row);
  }
  return remove;
 }
 async function prune(saved,profile,generation){
  const entries=await files();
  // A confirmed upload must also be visible in the listing before any deletion.
  if(!entries.some(e=>e.path_lower===saved.path))throw Error('Neue Sicherung noch nicht in Dropbox sichtbar.');
  const candidates=retentionCandidates(entries,profile,saved.path);
  for(const entry of candidates.slice(0,50)){
   if(generation!==connectionGeneration||meta.profile!==profile)return;
   await api('files/delete_v2',{path:snapshotPath(entry.path_lower),parent_rev:entry.rev});
  }
  meta.cleanupPending=candidates.length>50;
 }
 async function upload(data,id,name){if(reading())throw Error('In der Leseansicht wird nicht gesichert.');await api('files/create_folder_v2',{path:ROOT,autorename:false});await api('files/create_folder_v2',{path:profilePath(id),autorename:false});const stamp=new Date().toISOString(),payload={format:'balltraining-dropbox-v1',profile:id,profileName:name,savedAt:stamp,data},path=profilePath(id)+'/'+stamp.replace(/:/g,'-')+'-'+uid()+'.json';await api('files/upload',{path,mode:'add',autorename:false,mute:true,strict_conflict:true},JSON.stringify(payload));return {path:path.toLowerCase(),savedAt:stamp}}
 function changed(immediate=false){if(reading()){paint();return}if(!ready||!auth||!meta.profile){paint();return}if(!busy&&!immediate&&!urgent&&unchanged()){dirty=false;urgent=false;if(timer){clearTimeout(timer);timer=null}paint();return}dirty=true;urgent=urgent||immediate;paint();if(busy||message)return;if(immediate&&timer){clearTimeout(timer);timer=null}if(!timer)timer=setTimeout(()=>{timer=null;void safe(()=>flush())},0)}
 function saveNow(){if(reading()){paint();return}changed(true);if(!busy&&!message)return safe(()=>flush())}
 async function flush(force=false,confirmed=null){if(reading()){paint();return}if(busy||!auth||!meta.profile)return;if(timer){clearTimeout(timer);timer=null}if(navigator.onLine===false){dirty=true;paint();return}const required=force||urgent;busy=true;urgent=false;message='';paint();const generation=connectionGeneration;try{
  if(confirmed&&(confirmed.profile!==meta.profile||confirmed.generation!==generation))throw Error('Die Sicherungsauswahl wurde geändert. Bitte erneut prüfen.');
  syncBallTime();const payload=JSON.stringify(state);if(!validBackup(state))throw Error('Die Trainingsdaten konnten nicht geprüft werden. Bitte ein lokales Backup sichern.');if(unchanged()&&!required){dirty=false;return}
  if(!meaningful(state)){dirty=true;throw Error('Leere Trainingsdaten werden nicht automatisch gesichert. Vorhandene Sicherungen bleiben erhalten.')}
  const all=await files(),latest=all.find(x=>x.path_lower.startsWith(profilePath(meta.profile)+'/'));
  if(confirmed&&latest?.path_lower!==confirmed.path){conflictPath=latest?.path_lower||'';throw Error('Der Online-Stand hat sich inzwischen geändert. Bitte erneut vergleichen und bestätigen.')}
  if(latest&&meta.lastPath&&latest.path_lower!==meta.lastPath&&!confirmed){conflictPath=latest.path_lower;dirty=true;throw Error('Es gibt eine andere Online-Sicherung. Bitte die Stände vergleichen oder den aktuellen Gerätestand zusätzlich sichern.')}
  if(generation!==connectionGeneration)return;
  const saved=await upload(JSON.parse(payload),meta.profile,meta.profileName||state.name||'Training');
  if(generation!==connectionGeneration)return;
  conflictPath='';meta.lastPath=saved.path;meta.lastSaved=saved.savedAt;persist();lastPayload=payload;await credential({profile:meta.profile,path:saved.path,payload},'last-backup');dirty=urgent||!unchanged();
  if(!confirmed){try{await prune(saved,meta.profile,generation);meta.cleanupWarning=''}catch{meta.cleanupWarning='Online-Sicherung erfolgreich; ältere Zwischenstände werden später bereinigt.'}}
  if(generation===connectionGeneration)persist();
 }catch(e){dirty=true;message=e?.message||'Dropbox ist gerade nicht erreichbar. Bitte später erneut versuchen.';throw e}finally{busy=false;paint();if((dirty||urgent)&&!message&&auth&&meta.profile)changed(urgent)}}
 async function connect(){message='';if(!crypto.subtle)throw Error('Dropbox benötigt eine sichere HTTPS-Verbindung. Bitte die veröffentlichte App öffnen.');const bytes=crypto.getRandomValues(new Uint8Array(48)),encode=b=>btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');const verifier=encode(bytes),challenge=encode(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));sessionStorage.setItem(PENDING,JSON.stringify({verifier,created:Date.now()}));const url=new URL('https://www.dropbox.com/oauth2/authorize');url.search=new URLSearchParams({client_id:APP_KEY,response_type:'code',code_challenge:challenge,code_challenge_method:'S256',token_access_type:'offline',scope:'files.metadata.read files.content.read files.content.write'});$d('#dropbox-result').innerHTML=`<p>1. Dropbox öffnen und den Zugriff auf den App-Ordner erlauben.</p><a class="download" href="${escape(url.href)}" target="_blank" rel="noopener noreferrer">Bei Dropbox freigeben</a><p>2. Den dort angezeigten Code hier einfügen.</p><label>Verbindungscode<input id="dropbox-code" type="password" autocomplete="off" spellcheck="false"></label><button type="button" id="dropbox-code-submit">Verbindung abschließen</button>`;$d('#dropbox-code-submit').onclick=()=>safe(finishConnect)}
 async function finishConnect(){const pending=JSON.parse(sessionStorage.getItem(PENDING)||'null'),code=$d('#dropbox-code')?.value.trim();if(!pending||Date.now()-pending.created>20*60000)throw Error('Bitte „Dropbox verbinden“ erneut starten.');if(!code)throw Error('Bitte den Verbindungscode einfügen.');const res=await tokenRequest({grant_type:'authorization_code',code,code_verifier:pending.verifier});if(!res.access_token||!res.refresh_token)throw Error('Dropbox hat keine dauerhafte Verbindung freigegeben. Bitte erneut verbinden.');connectionGeneration++;auth={access_token:res.access_token,refresh_token:res.refresh_token,expires:Date.now()+res.expires_in*1000,account_id:res.account_id};await credential(auth);sessionStorage.removeItem(PENDING);meta={};conflictPath='';persist();dirty=false;urgent=false;lastPayload='';message='';refreshPanel()}
 async function create(){if(!meaningful(state))throw Error('Bitte zuerst vorhandene Trainingsdaten importieren oder ein Training absolvieren.');const name=state.name||'Training';confirmInline($d('#dropbox-result'),'Für „'+escape(name)+'“ eine neue, getrennte Dropbox-Sicherung anlegen?',()=>safe(async()=>{meta={profile:folderName(name)+'-'+uid(),profileName:name};persist();dirty=true;await flush(true);refreshPanel()}))}
 async function list(){if(busy)throw Error('Bitte warten, bis die laufende Sicherung beendet ist.');message='Sicherungen werden geladen …';paint();const entries=await files();message='';paint();const host=$d('#dropbox-result');if(!host)return;if(!entries.length){host.innerHTML='<p>Noch keine Dropbox-Sicherungen vorhanden.</p>';return}const groups=new Map();for(const entry of entries){const id=entry.path_lower.split('/')[2];if(!groups.has(id))groups.set(id,[]);groups.get(id).push(entry)}host.innerHTML='<p>Training und Sicherungsstand auswählen:</p>'+[...groups].map(([id,rows])=>`<details class="dropbox-history"><summary>${escape(id.replace(/-[0-9a-f]{8}-[0-9a-f-]{27}$/,''))} · ${rows.length} Sicherungen</summary>${rows.slice(0,30).map(row=>`<button type="button" data-dropbox-file="${escape(row.path_lower)}">${escape(new Date(row.server_modified).toLocaleString('de-DE'))}</button>`).join('')}${rows.length>30?'<p class="hint">Die 30 neuesten Stände werden angezeigt. Weitere Dateien bleiben in Dropbox erhalten.</p>':''}</details>`).join('');host.querySelectorAll('[data-dropbox-file]').forEach(button=>button.onclick=()=>safe(()=>preview(button.dataset.dropboxFile)))}
 async function readEnvelope(path){
  const envelope=await api('files/download',{path:snapshotPath(path)});
  if(!envelope||envelope.format!=='balltraining-dropbox-v1'||!validBackup(envelope.data)||profilePath(envelope.profile)!==path.slice(0,path.lastIndexOf('/'))||!Number.isFinite(Date.parse(envelope.savedAt)))throw Error('Diese Sicherung ist ungültig oder gehört nicht zum ausgewählten Training.');
  return {...envelope,path};
 }
 async function preview(path){
  pendingPreview=await readEnvelope(path);
  const selected=pendingPreview,s=selected.data,ms=Object.values(s.ballTraining?.days||{}).reduce((n,x)=>n+x,0),days=Object.values(s.ballTraining?.days||{}).filter(x=>x>0).length;
  const host=$d('#dropbox-result');
  host.innerHTML=`<div class="divider"><h4>Sicherung prüfen</h4><p>${escape(selected.profileName||s.name||'Training')} · ${escape(new Date(selected.savedAt).toLocaleString('de-DE'))}</p><p class="hint">${s.scores.length} Bestwerteinträge · ${s.sessions.length} abgeschlossene Trainingstage<br>Ballbeherrschung: ${Math.floor(ms/60000)} Min. · ${days} Trainingstage</p><div class="dropbox-load-modes"><button type="button" id="dropbox-view">Nur ansehen</button><p class="hint">Schreibgeschützt ansehen. Dein eigener Gerätestand und dein Sicherungsordner bleiben erhalten.</p><button type="button" id="dropbox-restore">Wiederherstellen und fortsetzen</button><p class="hint">Ersetzt den Gerätestand und sichert künftig im Ordner dieser Sicherung weiter. Der bisherige Gerätestand wird vorher separat gesichert.</p></div><div id="dropbox-restore-confirm"></div><button type="button" id="dropbox-cancel">Abbrechen</button></div>`;
  $d('#dropbox-cancel').onclick=()=>{pendingPreview=null;host.innerHTML=''};
  $d('#dropbox-view').onclick=()=>safe(viewSelected);
  $d('#dropbox-restore').onclick=()=>confirmInline($d('#dropbox-restore-confirm'),'Diesen Stand wiederherstellen und künftig im Sicherungsordner von „'+escape(selected.profileName||s.name||'Training')+'“ weitersichern?',()=>safe(restore));
 }
 function viewSelected(){
  if(busy)throw Error('Bitte die laufende Sicherung abwarten.');
  if(!pendingPreview||reading())return;
  const selected=pendingPreview;
  beginReadOnly(selected.data,{name:selected.profileName||selected.data.name||'Training',profile:selected.profile,path:selected.path,savedAt:selected.savedAt,refresh:refreshReadOnly});
  if(timer){clearTimeout(timer);timer=null}
  pendingPreview=null;paint();
 }
 async function refreshReadOnly(){
  const expected=readOnlyInfo(),generation=connectionGeneration;if(!expected)return;
  const latest=(await files()).find(row=>row.path_lower.startsWith(profilePath(expected.profile)+'/'));
  if(!latest)throw Error('Für diese Ansicht wurde keine Online-Sicherung gefunden.');
  const selected=await readEnvelope(latest.path_lower);
  if(generation!==connectionGeneration||readOnlyInfo()!==expected)return;
  beginReadOnly(selected.data,{name:selected.profileName||selected.data.name||'Training',profile:selected.profile,path:selected.path,savedAt:selected.savedAt,refresh:refreshReadOnly});
  paint();
 }
 async function restore(){if(reading())throw Error('Bitte zuerst die Leseansicht schließen.');if(busy||!pendingPreview)return;busy=true;paint();const selected=pendingPreview;try{if(timer){clearTimeout(timer);timer=null}syncBallTime();if(meaningful(state))await upload(JSON.parse(JSON.stringify(state)),'vor-wiederherstellung-'+uid(),state.name||'Vor Wiederherstellung');const head=(await files()).find(x=>x.path_lower.startsWith(profilePath(selected.profile)+'/'));conflictPath='';meta={profile:selected.profile,profileName:selected.profileName||selected.data.name||'Training',lastPath:head?.path_lower||selected.path,lastSaved:selected.savedAt};persist();lastPayload=JSON.stringify(selected.data);dirty=false;pendingPreview=null;applyBackupData(selected.data);toast('Dropbox-Sicherung wiederhergestellt')}finally{busy=false;refreshPanel();if(auth&&meta.profile)changed(true)}}
 function localReplaced(){if(reading())return;if(timer)clearTimeout(timer);timer=null;connectionGeneration++;meta={};conflictPath='';persist();dirty=false;urgent=false;lastPayload='';message='';paint();}
 function bind(){const keep=$d('#dropbox-keep-local');if(keep)keep.onclick=()=>safe(keepLocal);const on=(id,fn)=>{const button=$d(id);if(button)button.onclick=()=>safe(()=>{if(reading())throw Error('Bitte zuerst die Leseansicht schließen.');return fn()})};on('#dropbox-connect',connect);on('#dropbox-create',create);on('#dropbox-save',()=>flush(true));on('#dropbox-list',list);on('#dropbox-disconnect',async()=>{if(busy)throw Error('Bitte die laufende Sicherung abwarten.');connectionGeneration++;if(timer)clearTimeout(timer);timer=null;auth=null;meta={};conflictPath='';dirty=false;urgent=false;message='';await credential(null);localStorage.removeItem(META);sessionStorage.removeItem(PENDING);refreshPanel()});}
 async function init(){try{meta=JSON.parse(localStorage.getItem(META)||'{}');if(meta.profile)profilePath(meta.profile);auth=await credential();if(auth&&meta.profile){try{let saved=await credential(undefined,'last-backup');if(saved?.profile===meta.profile&&saved.path===meta.lastPath&&typeof saved.payload==='string')lastPayload=saved.payload;else if(meta.lastPath&&navigator.onLine!==false){const envelope=await api('files/download',{path:snapshotPath(meta.lastPath)});if(envelope?.profile===meta.profile&&validBackup(envelope.data)){lastPayload=JSON.stringify(envelope.data);await credential({profile:meta.profile,path:meta.lastPath,payload:lastPayload},'last-backup')}}}catch{message='Der letzte Sicherungsstand konnte nicht geprüft werden. Bitte „Jetzt sichern“ erneut versuchen.'}}ready=true;refreshPanel();paint();if(auth&&meta.profile)changed()}catch{ready=true;auth=null;meta={};message='Dropbox ist nicht eingerichtet. Bitte in den Einstellungen verbinden.';paint()}}

 async function videoLink(path){
  if(typeof path!=='string'||!/^\/Videos\/(?:Ball Mastery|Moves)\/.+\.mp4$/i.test(path)||path.split('/').some(part=>part==='.'||part==='..')||/[\\\x00-\x1f]/.test(path))throw Error('Ungültiger Video-Dateipfad.');
  let timeout;try{await Promise.race([initialized,new Promise((_,reject)=>timeout=setTimeout(()=>reject(Error('Dropbox wird noch vorbereitet. Bitte erneut versuchen.')),15000))])}finally{clearTimeout(timeout)}
  if(!auth)throw Error('Bitte Dropbox in den Einstellungen verbinden, um die Videos anzusehen.');
  if(navigator.onLine===false)throw Error('Für Videos ist eine Internetverbindung erforderlich.');
  const generation=connectionGeneration;
  const response=await api('files/get_temporary_link',{path});
  if(generation!==connectionGeneration||!auth)throw Error('Die Dropbox-Verbindung wurde geändert. Bitte das Video erneut laden.');
  if(!response)throw Error('Video nicht gefunden. Bitte den Videos-Ordner im Dropbox-App-Ordner prüfen.');
  let url;try{url=new URL(response.link)}catch{throw Error('Dropbox hat keinen gültigen Videolink geliefert.')}
  if(url.protocol!=='https:'||!(url.hostname==='dropboxusercontent.com'||url.hostname.endsWith('.dropboxusercontent.com')))throw Error('Dropbox hat einen unerwarteten Videolink geliefert.');
  return url.href;
 }
 window.addEventListener('offline',paint);
 window.addEventListener('online',()=>{if(auth&&meta.profile&&!busy)void safe(()=>flush())});
 window.addEventListener('load',()=>void init().finally(initializedResolve));
 return {markup:ui,bind,changed,localReplaced,saveNow,videoLink,openStatus,connectionVersion:()=>connectionGeneration};
})();


