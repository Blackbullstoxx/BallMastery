'use strict';
const MAX_CARD_PORTRAIT_LENGTH=1000000;
async function prepareCardPortrait(file){
 if(!['image/png','image/webp'].includes(file.type)||file.size>15000000)throw Error('Bitte ein freigestelltes PNG oder WebP bis 15 MB auswählen.');
 const image=await createImageBitmap(file);
 try{
  const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
  let checkedTransparency=false;
  // Safari may return a PNG when WebP canvas encoding is unavailable. Its
  // quality argument then has no effect, so reduce dimensions automatically.
  for(const edge of [1000,900,800,700,600,500,400,320]){
   const scale=Math.min(1,edge/Math.max(image.width,image.height));
   canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
   context.drawImage(image,0,0,canvas.width,canvas.height);
   if(!checkedTransparency){
    const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;let transparent=false;
    for(let i=3;i<pixels.length;i+=4)if(pixels[i]<250){transparent=true;break}
    if(!transparent)throw Error('Dieses Bild hat keinen transparenten Hintergrund. Bitte zuerst freistellen lassen.');
    checkedTransparency=true;
   }
   for(const quality of [.94,.90,.86]){
    const portrait=canvas.toDataURL('image/webp',quality);
    if(/^data:image\/(png|webp);base64,/.test(portrait)&&portrait.length<=MAX_CARD_PORTRAIT_LENGTH)return portrait;
    if(!portrait.startsWith('data:image/webp;'))break;
   }
  }
  throw Error('Das Portrait konnte nicht vorbereitet werden. Bitte ein anderes freigestelltes PNG oder WebP auswählen.');
 }finally{image.close()}
}
// Fleiß is recomputed from dated evidence, so imports, corrections and closed
// app time use the same rules. Civil dates use UTC arithmetic (DST independent).
const diligenceRules=(()=>{
 const DAY=86400000,anchors=[[0,30],[5,40],[20,55],[50,70],[100,85],[180,95],[250,99]];
 const number=day=>Date.parse(day+'T00:00:00Z')/DAY;
 const day=n=>new Date(n*DAY).toISOString().slice(0,10);
 function earned(points){for(let i=1;i<anchors.length;i++){const [x,y]=anchors[i],[a,b]=anchors[i-1];if(points<=x)return Math.floor(b+(points-a)*(y-b)/(x-a)+1e-9)}return 99}
 function qualifying(data,today){
  const days=new Set();
  for(const entries of Object.values(data.practiceCounts||{}))for(const [d,n] of Object.entries(entries||{}))if(n>0&&validTrainingDate(d)&&d<=today)days.add(d);
  for(const d of [...(data.sessions||[]),...(data.cardTraining?.completedDays||[])])if(validTrainingDate(d)&&d<=today)days.add(d);
  return days;
 }
 function paused(data,date){return (data.diligence?.pauses||[]).some(p=>p.from<=date&&(p.to===null||date<=p.to))}
 function valid(value){
  return !!value&&value.version===1&&validTrainingDate(value.since)&&value.since>='2000-01-01'&&Array.isArray(value.pauses)&&value.pauses.length<=1000&&value.pauses.every((p,i)=>p&&validTrainingDate(p.from)&&p.from>=value.since&&(p.to===null||validTrainingDate(p.to)&&p.to>=p.from)&&(i===0||value.pauses[i-1].to!==null&&value.pauses[i-1].to<p.from));
 }
 function report(data,today){
  const days=qualifying(data,today),model=data.diligence;
  if(!model)return {points:days.size,rating:earned(days.size),earned:earned(days.size),deduction:0,todayPoints:days.has(today)?1:0,weeks:0,reference:0,recent:0};
  const credits=new Map();let points=0;
  for(const d of days){const ms=(data.ballTraining?.days?.[d]||0)+(data.cardTraining?.days?.[d]?.feints||0)+(data.cardTraining?.days?.[d]?.juggling||0);const value=d<model.since?1:Math.min(2.5,.5+ms/360000);credits.set(d,value);points+=value}
  const start=number(model.since),end=number(today),history=[];
  // Historical days seed the personal reference, but never retroactive losses.
  for(let week=8;week>0;week--){let total=0;for(let j=0;j<7;j++)total+=credits.get(day(start-week*7+j))||0;history.push(total)}
  let deduction=0,weekPoints=0,weekDays=0,weeks=0,reference=days.size?1:0,recent=0;
  let processedPoints=[...credits].reduce((sum,[d,n])=>sum+(d<model.since?n:0),0);
  const median=values=>{const a=values.slice().sort((a,b)=>a-b),i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2};
  // Paused dates never advance the personal seven-day weeks or the 28-day window.
  // Partial current days/weeks cannot create a penalty.
  for(let n=start;n<end&&n-start<20000;n++){
   const d=day(n);processedPoints+=credits.get(d)||0;if(paused(data,d))continue;weekPoints+=credits.get(d)||0;weekDays++;
   if(weekDays<7)continue;
   weeks++;history.push(weekPoints);weekPoints=0;weekDays=0;
   const nonzero=history.slice(-8).filter(n=>n>0);
   if(nonzero.length)reference=median(nonzero);
   // Retain the last positive reference if all eight weeks are empty.
   recent=history.slice(-4).reduce((a,b)=>a+b,0)/4;
   if(weeks>=4){if(reference>0&&recent+1e-9<reference*.8)deduction=Math.min(deduction+1,Math.max(0,earned(processedPoints)-30));else deduction=Math.max(0,deduction-1)}
  }
  const potential=earned(points);return {points,rating:Math.max(30,potential-deduction),earned:potential,deduction,todayPoints:credits.get(today)||0,weeks,reference,recent};
 }
 return {qualifying,paused,valid,report,earned,number,day};
})();

// Size the whole card together (including type), then align before first paint.
// Resize handles browser chrome/keyboard changes without scrolling the child again.
function fitPlayerCardCompletion(host,scroll=false){
 const root=host.querySelector?.('#fvo-card-preview');if(!root)return ()=>{};
 const viewport=window.visualViewport;
 const fit=()=>{
  if(!host.isConnected)return;
  const height=viewport?.height||window.innerHeight,natural=root.offsetHeight;
  if(!natural||!height)return;
  const scale=Math.min(1,Math.max(1,height-16)/natural);
  root.style.transformOrigin='top center';root.style.transform=scale<1?'scale('+scale+')':'';
  host.style.height=Math.ceil(natural*scale)+'px';
 };
 fit();
 if(scroll)window.scrollTo({top:Math.max(0,window.scrollY+host.getBoundingClientRect().top-(viewport?.offsetTop||0)-8),behavior:'instant'});
 window.addEventListener('resize',fit);viewport?.addEventListener('resize',fit);
 return ()=>{window.removeEventListener('resize',fit);viewport?.removeEventListener('resize',fit)};
}

// Pure rating rules and device-local card state. No network or audio.
const playerCards=(()=>{
 const areas=['ball','juggling','feints'],weights=[.4,.25,.15,.2];
 const names=['BALL','JONG','FINT','FLEISS'];
 const feintCurve=[[0,30],[30,40],[120,55],[360,70],[780,85],[1200,95],[1460,99]];
 const juggleCurve=[[0,30],[30,40],[120,50],[600,60],[1800,70],[3600,80],[6600,90],[10200,99]];
 const bonusCurves={toe:[[0,0],[25,3],[50,6],[100,9],[200,12],[300,15]],free:[[0,0],[10,3],[25,6],[50,9],[100,12],[200,15]]};
 let clock=null,dispose=null;
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 function curve(value,points){
  if(value<=points[0][0])return points[0][1];
  for(let i=1;i<points.length;i++){const [x,y]=points[i],[px,py]=points[i-1];if(value<=x)return py+(y-py)*(value-px)/(x-px)}
  return points.at(-1)[1];
 }
 function config(data=state){return data.playerCard||{version:1,areas:{ball:!!data.groups?.ball,juggling:['toe','free','touches'].some(k=>data.groups?.[k]),feints:!!data.groups?.feints},techniques:{toe:!!data.groups?.toe,free:!!data.groups?.free},portrait:'',layout:{scale:114,x:-2,y:0}}}
 function bonus(data,key,today=date()){
  const days=new Map();
  for(const row of data.scores||[])if(row.key===key&&validTrainingDate(row.date)&&row.date<=today&&Number.isInteger(row.value)&&row.value>=0)days.set(row.date,Math.max(days.get(row.date)||0,row.value));
  const ordered=[...days].sort((a,b)=>a[0].localeCompare(b[0])).map(row=>row[1]);let highest=0;
  for(let i=5;i<ordered.length;i++){const regular=ordered.slice(i-5,i+1).sort((a,b)=>b-a)[3];highest=Math.max(highest,curve(regular,bonusCurves[key]))}
  return highest;
 }
 function snapshot(data=state,list=drills,today=date()){
  const c=config(data),time=data.cardTraining?.days||{};
  const minutes=key=>Object.entries(time).reduce((sum,[day,row])=>sum+(day<=today&&validTrainingDate(day)?row[key]||0:0),0)/60000;
  const learned=data.finished?list.length:clamp(Number(data.current)||0,0,list.length);
  const techniques=['toe','free'].filter(k=>c.techniques[k]);
  const performance=techniques.length?techniques.reduce((sum,k)=>sum+bonus(data,k,today),0)/techniques.length:0;
  const rawBall=list.length?30+69*learned/list.length:30;
  const values=[learned===list.length&&list.length?99:Math.min(98,Math.round(rawBall)),Math.min(99,Math.floor(curve(minutes('juggling'),juggleCurve)+performance+1e-9)),Math.floor(curve(minutes('feints'),feintCurve)+1e-9),diligenceRules.report(data,today).rating];
  const visible=[!!c.areas.ball,!!c.areas.juggling,!!c.areas.feints,true];
  const sum=weights.reduce((n,w,i)=>n+(visible[i]?w:0),0);
  let total=Math.round(values.reduce((n,v,i)=>n+(visible[i]?v*weights[i]:0),0)/sum);
  if(total===99&&!values.every((n,i)=>!visible[i]||n===99))total=98;
  return {values,total,tier:total>=85?3:total>=70?2:total>=50?1:0,visible};
 }
 function init(){
  if(isReadOnly())return;
  if(!state.playerCard)state.playerCard=config();
  if(!state.cardTraining)state.cardTraining={version:1,since:date(),days:{},completedDays:[]};
  if(!state.diligence)state.diligence={version:1,since:date(),pauses:[]};
  if(!state.playerCard.lastShown)state.playerCard.lastShown=snapshot();
 }
 function sync(){
  const now=Date.now(),previous=clock;clock=null;if(isReadOnly())return;
  if(previous){const elapsed=Math.max(0,Math.min(now,previous.until)-previous.from);if(elapsed){init();const row=state.cardTraining.days[previous.day]||(state.cardTraining.days[previous.day]={feints:0,juggling:0});row[previous.section]=Math.min(90000000,row[previous.section]+elapsed)}}
  if(!trainingPaused()&&run&&['feints','juggling'].includes(run.section)&&run.phase==='work'&&!run.paused&&!document.hidden&&tab==='today'&&run.day===date()&&run.deadline>now){const midnight=new Date(run.day+'T00:00:00');midnight.setDate(midnight.getDate()+1);clock={from:now,until:Math.min(run.deadline,midnight.getTime()),day:run.day,section:run.section}}
 }
 function completedSet(){if(isReadOnly()||trainingPaused())return;init();if(!state.cardTraining.completedDays.includes(run.day))state.cardTraining.completedDays.push(run.day)}
 function completed(section){
  if(isReadOnly())return;init();
  const c=state.playerCard,to=snapshot(),from=c.lastShown||to;
  c.reveal={day:date(),section,from,to,seen:false};c.lastShown=to;
 }
 function destroy(){if(dispose)dispose();dispose=null}
 function mount(host,{section='ball',animate=false,from=null,to=snapshot(),correction=false}={}){
  if(!host)return;destroy();
  const c=config(),old=from||to;
  const relevant=correction?to.values.map((v,i)=>v!==old.values[i]):[section==='ball',section==='juggling',section==='feints',true];
  dispose=mountPlayerCard(host,{from:old,to,section,relevant,name:state.name||'DEIN NAME',portrait:c.portrait||'',layout:c.layout,animate,correction});
 }
 function completion(section){
  const host=document.querySelector('[data-player-card]');if(!host)return;
  queueMicrotask(()=>{
  if(!host.isConnected||document.querySelector('.player-card-dialog[open]'))return;
  const reveal=state.playerCard?.reveal;
  const animate=!isReadOnly()&&reveal?.day===date()&&reveal.section===section&&!reveal.seen;
  // Persist before starting, so changing tabs or reopening never replays it.
  if(animate){reveal.seen=true;save()}
  rewardShown.add(date()+':'+section);if(run)run.rewardPending=false;
  mount(host,{section,animate,from:animate?reveal.from:null,to:animate?reveal.to:snapshot()});
  const cancel=dispose,stopFitting=fitPlayerCardCompletion(host,animate);dispose=()=>{stopFitting();if(cancel)cancel()};
  });
 }
 function collectionMarkup(){return '<section id="my-player-card" aria-label="Spielerkarte"><div data-player-card></div></section>'}
 function collection(){const panel=document.querySelector('#my-player-card');if(!panel)return;mount(panel.querySelector('[data-player-card]'))}
 function correction(before){
  if(isReadOnly())return;init();const to=snapshot();state.playerCard.lastShown=to;save();
  if(to.values.every((v,i)=>v===before.values[i])&&to.total===before.total)return;
  const dialog=document.createElement('dialog');dialog.className='player-card-dialog';dialog.innerHTML='<div data-player-card></div><button type="button">Schließen</button>';document.body.append(dialog);
  const close=()=>{destroy();dialog.close();dialog.remove()};dialog.querySelector('button').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close()});dialog.showModal();mount(dialog.querySelector('[data-player-card]'),{from:before,to,animate:true,correction:true});
 }
 function validSnapshot(s){return !!s&&Array.isArray(s.values)&&s.values.length===4&&s.values.every(n=>Number.isInteger(n)&&n>=30&&n<=99)&&Number.isInteger(s.total)&&s.total>=30&&s.total<=99&&Number.isInteger(s.tier)&&s.tier>=0&&s.tier<=3&&Array.isArray(s.visible)&&s.visible.length===4&&s.visible.every(n=>typeof n==='boolean')}
 function valid(data){
  const c=data.playerCard,t=data.cardTraining;
  if(c!==undefined&&(!c||c.version!==1||!c.areas||!areas.every(k=>typeof c.areas[k]==='boolean')||!c.techniques||!['toe','free'].every(k=>typeof c.techniques[k]==='boolean')||typeof c.portrait!=='string'||c.portrait.length>1000000||c.portrait&&!/^data:image\/(png|webp);base64,[A-Za-z0-9+/=]+$/.test(c.portrait)||!c.layout||!['scale','x','y'].every(k=>Number.isFinite(c.layout[k]))||c.layout.scale<80||c.layout.scale>150||Math.abs(c.layout.x)>20||Math.abs(c.layout.y)>10||c.lastShown&&!validSnapshot(c.lastShown)||c.reveal&&(!validTrainingDate(c.reveal.day)||!areas.includes(c.reveal.section)||typeof c.reveal.seen!=='boolean'||!validSnapshot(c.reveal.from)||!validSnapshot(c.reveal.to))))return false;
  if(t!==undefined&&(!t||t.version!==1||!validTrainingDate(t.since)||!t.days||typeof t.days!=='object'||Array.isArray(t.days)||!Object.entries(t.days).every(([day,row])=>validTrainingDate(day)&&row&&['feints','juggling'].every(k=>Number.isSafeInteger(row[k])&&row[k]>=0&&row[k]<=90000000))||!Array.isArray(t.completedDays)||!t.completedDays.every(validTrainingDate)))return false;
  if(data.diligence!==undefined&&!diligenceRules.valid(data.diligence))return false;
  return true;
 }
 function trainingPaused(){return diligenceRules.paused(state,date())}
 const shortDay=d=>d.split('-').reverse().join('.');
 function pauseLabel(){const p=state.diligence?.pauses.find(p=>p.from<=date()&&(p.to===null||p.to>=date()));return p?.to?'Trainingspause bis einschließlich '+shortDay(p.to):'Trainingspause aktiv'}
 function pauseMarkup(){
  const r=diligenceRules.report(state,date()),active=trainingPaused(),format=n=>n.toLocaleString('de-DE',{maximumFractionDigits:2});
  return `<details class="card settings-panel" data-settings-panel="diligence"><summary>Trainingspause und Fleiß</summary><div class="settings-panel-body"><p><strong>${active?pauseLabel():'Keine Trainingspause aktiv'}</strong></p><p class="hint">Eine Pause schützt das Fleiß-Rating. Pausentage zählen nicht in den Vergleich. Der Wochenplan bleibt erhalten.</p>${active?'<button type="button" data-end-training-pause>Training wieder aufnehmen</button>':`<label>Enddatum (einschließlich)<input type="date" id="training-pause-until" min="${date()}" disabled></label><label>Bis ich sie beende<input type="checkbox" id="training-pause-open" checked></label><button type="button" id="start-training-pause">Trainingspause aktivieren</button>`}<p id="training-pause-status" role="status"></p><div class="divider"><h3>Dein Fleiß</h3><p>${format(r.points)} Fleißpunkte · Rating ${r.rating}</p><p>Heute: ${format(r.todayPoints)} Punkte · Grundbonus 0,5 plus ein Punkt je sechs aktive Minuten, höchstens 2,5 täglich. Mindestens ein vollständiger Satz oder eine vollständige Jongliereinheit ist erforderlich. Zeitanteile bleiben erhalten.</p><p class="hint">Bisherige Tage zählen vor dem ${shortDay(state.diligence?.since||date())} mit je einem Punkt. Ab dann zählt die aktive Zeit aus allen Bereichen.</p><p class="hint">Vergleich: letzte vier Wochen mit dem mittleren Umfang der letzten acht Wochen. Wochen ohne Training senken den Maßstab nicht. 80 % reichen zum Halten. Erst nach vier vollständigen Wochen kann pro weiterer Woche ein Rating-Punkt abgezogen werden. Bei ausreichendem Umfang wird pro Woche ein solcher Abzug wieder aufgehoben.</p>${r.weeks>=4?`<p>Aktuell je Woche: ${format(r.recent)} Punkte · persönlicher Vergleich: ${format(r.reference)} · Abzug: ${r.deduction} Rating-Punkte.</p>`:`<p>Vergleich wird aufgebaut: ${Math.min(4,r.weeks)} von vier vollständigen Wochen.</p>`}</div></div></details>`;
 }
 function endPause(){
  if(isReadOnly())return;init();const today=date(),previous=diligenceRules.day(diligenceRules.number(today)-1);
  state.diligence.pauses=state.diligence.pauses.flatMap(p=>p.from<=today&&(p.to===null||p.to>=today)?p.from<today?[{from:p.from,to:previous}]:[]:[p]);
  resetBallClock();save();render();toast('Trainingspause beendet');
 }
 function bindPause(){
  const panel=document.querySelector('[data-settings-panel="diligence"]');if(!panel)return;
  panel.querySelector('[data-end-training-pause]')?.addEventListener('click',endPause);
  const open=panel.querySelector('#training-pause-open'),until=panel.querySelector('#training-pause-until');
  if(open)open.onchange=()=>{until.disabled=open.checked;if(!open.checked&&!until.value)until.value=date()};
  panel.querySelector('#start-training-pause')?.addEventListener('click',()=>{
   if(isReadOnly())return;
   if(!open.checked&&(!validTrainingDate(until.value)||until.value<date())){panel.querySelector('#training-pause-status').textContent='Bitte heute oder ein späteres Enddatum wählen.';return}
   syncBallTime();colourPerception.stop(true);clearInterval(tick);silence();
   for(const r of new Set([...Object.values(runs),run].filter(Boolean)))if(['count','work','rest'].includes(r.phase)&&!r.paused){r.remaining=Math.max(0,Math.ceil((r.deadline-Date.now())/1000));r.paused=true}
   init();state.diligence.pauses.push({from:date(),to:open.checked?null:until.value});resetBallClock();save();render();toast('Trainingspause aktiviert');
  });
 }
 function pauseBanner(){return trainingPaused()?`<aside class="training-pause-banner" role="status"><strong>${pauseLabel()}</strong><p>Dein Fleiß-Rating ist geschützt. Zum Trainieren zuerst die Pause beenden.</p><button type="button" data-end-training-pause>Training wieder aufnehmen</button></aside>`:''}
 function bindPauseBanner(){document.querySelector('.training-pause-banner [data-end-training-pause]')?.addEventListener('click',endPause);if(trainingPaused())document.querySelectorAll('#start,#ready,#resume,#restart,#recover-run,#cancel-stop').forEach(b=>b.disabled=true)}

 function settingsMarkup(){
  const c=config();return `<details class="card settings-panel" data-settings-panel="player-card"><summary>Spielerkarte</summary><div class="settings-panel-body"><p class="hint">Freigestelltes Portrait als PNG oder WebP mit transparentem Hintergrund. Das Foto wird mit deinen Trainingsdaten privat gesichert.</p><label>Portrait auswählen<input type="file" id="card-portrait" accept="image/png,image/webp"></label><p id="card-photo-status" role="status"></p><button type="button" id="card-remove-photo">Portrait entfernen</button><div class="card-photo-controls">${[['scale','Bildgröße',80,150],['x','Waagerecht',-20,20],['y','Senkrecht',-10,10]].map(([k,label,min,max])=>`<label>${label}<input type="range" id="card-${k}" min="${min}" max="${max}" value="${c.layout[k]}" step="1"></label>`).join('')}</div><div id="card-settings-preview" data-player-card></div><h3>Bereiche auf der Karte</h3><p class="hint">Unabhängig vom Wochenplan. Änderungen können die Gesamtbewertung beeinflussen.</p>${areas.map((k,i)=>`<label>${['Ballbeherrschung','Jonglieren','Finten'][i]}<input type="checkbox" id="card-area-${k}" ${c.areas[k]?'checked':''}></label>`).join('')}<h3>Leistungsbonus beim Jonglieren</h3>${['toe','free'].map(k=>`<label>${k==='toe'?'Zehenjonglieren':'Freies Jonglieren'}<input type="checkbox" id="card-technique-${k}" ${c.techniques[k]?'checked':''}></label>`).join('')}<p class="hint">Vier von sechs erfassten Tagen belegen den regelmäßigen Wert. Fehlende Einträge zählen nicht als null. FLEISS gehört immer zur Karte.</p><button type="button" id="save-card-settings">Spielerkarte speichern</button><div id="card-settings-confirm"></div></div></details>`;
 }
 function bindSettings(){
  const panel=document.querySelector('[data-settings-panel="player-card"]');if(!panel)return;
  const draft=JSON.parse(JSON.stringify(config())),status=panel.querySelector('#card-photo-status');
  const preview=()=>{destroy();dispose=mountPlayerCard(panel.querySelector('[data-player-card]'),{from:snapshot(),to:snapshot(),name:state.name||'DEIN NAME',portrait:draft.portrait,layout:draft.layout,animate:false,relevant:[false,false,false,false]})};
  panel.addEventListener('toggle',()=>{if(panel.open)preview()});
  ['scale','x','y'].forEach(k=>panel.querySelector('#card-'+k).oninput=e=>{draft.layout[k]=Number(e.target.value);preview()});
  panel.querySelector('#card-remove-photo').onclick=()=>{draft.portrait='';status.textContent='Portrait entfernt. Zum Übernehmen speichern.';preview()};
  panel.querySelector('#card-portrait').onchange=async e=>{
   const file=e.target.files[0];if(!file)return;
   try{
    draft.portrait=await prepareCardPortrait(file);status.textContent='Portrait geladen. Zum Übernehmen speichern.';preview();
   }catch(error){status.textContent=error.message||'Das Portrait konnte nicht geladen werden.'}
  };
  panel.querySelector('#save-card-settings').onclick=()=>{
   if(isReadOnly())return;const before=snapshot();
   draft.areas=Object.fromEntries(areas.map(k=>[k,panel.querySelector('#card-area-'+k).checked]));draft.techniques=Object.fromEntries(['toe','free'].map(k=>[k,panel.querySelector('#card-technique-'+k).checked]));
   const changed=JSON.stringify(draft.areas)!==JSON.stringify(config().areas)||JSON.stringify(draft.techniques)!==JSON.stringify(config().techniques);
   const apply=()=>{state.playerCard=draft;state.playerCard.lastShown=snapshot();delete state.playerCard.reveal;save();render();toast('Spielerkarte gespeichert');correction(before)};
   if(changed)confirmInline(panel.querySelector('#card-settings-confirm'),'Kartenbereiche ändern? Die Gesamtbewertung wird mit den gewählten Bereichen neu berechnet.',apply);else apply();
  };
 }
 return {curve,bonus,snapshot,config,init,sync,resetClock:()=>clock=null,completedSet,completed,mount,completion,destroy,collectionMarkup,collection,correction,valid,settingsMarkup,bindSettings,trainingPaused,pauseMarkup,bindPause,pauseBanner,bindPauseBanner};
})();
