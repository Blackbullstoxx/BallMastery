'use strict';
// No audio is recorded. Opt-in text diagnostics are stored separately on this device.
const colourPerception=(()=>{
 const palette=['rot','blau','grün','gelb'],DISPLAY_MS=4000,RESULT_GRACE_MS=1500;
 let session=null,preparedRun=null,recognition=null,warm=null,generation=0;
 const supported=()=>window.SpeechRecognition||window.webkitSpeechRecognition;
 const randomGap=()=>2000+Math.random()*2000;
 function eligible(r=run){return !!r&&r.section==='ball'&&r.plan?.[r.index]?.colour===true}
 function active(s=session){return !!s&&s===session&&run===s.run&&run.index===s.index&&run.phase==='work'&&!run.paused&&!document.hidden&&tab==='today'&&!isReadOnly()}
 function stats(r=run,index=r?.index){return r?.colourResults?.[index]||null}
 function paint(){
  const face=document.querySelector('.timer-face');if(!face?.setAttribute)return;
  const colour=active()&&session.trial?.open?session.trial.colour:'';
  face.setAttribute('data-colour',colour);face.classList?.toggle('colour-face',eligible()&&run.phase==='work');
 }
 function closeTrial(s,correct=false){
  const trial=s.trial;if(!trial?.open)return;
  trial.open=false;trial.closed=Date.now();trial.correct=correct;if(correct)s.stats.correct++;
  diagnose(s,'colour_cleared',{colour:trial.colour,colourId:trial.id,reason:correct?'correct':Date.now()>=s.run.deadline?'set_ended':'time_limit'});s.next=Date.now()+randomGap();paint();
 }
 function step(){
  const s=session;if(!active(s)){stop();return}
  const now=Date.now();if(now>=run.deadline||!s.listening)return;
  if(s.trial?.open&&now>=s.trial.until)closeTrial(s);
  if(!s.trial?.open&&now>=s.next){
   // Reserve the full display window and recognition grace before stopping the microphone.
   if(run.deadline-now<DISPLAY_MS+RESULT_GRACE_MS)return;
   const options=palette.filter(c=>c!==s.last),colour=options[Math.floor(Math.random()*options.length)];
   s.last=colour;s.trial={colour,open:true,started:now,until:now+DISPLAY_MS};s.stats.shown++;s.trial.id=s.stats.shown;diagnose(s,'colour_shown',{colour,colourId:s.trial.id});paint();
  }
 }
 function createRecognizer(){
  const API=supported();if(!API)throw Error('Dieses Gerät unterstützt die Spracherkennung im Browser nicht.');
  const r=new API();r.lang='de-DE';r.continuous=true;r.interimResults=true;r.maxAlternatives=1;
  // Require local processing where the browser exposes that option; never fall back on error.
  if('processLocally' in r)r.processLocally=true;
  return r;
 }
 function errorText(code){return ({'not-allowed':'Bitte Mikrofon und Spracherkennung für diese Seite erlauben.','service-not-allowed':'Die Spracherkennung ist auf diesem Gerät nicht freigegeben.','audio-capture':'Kein Mikrofon verfügbar.','language-not-supported':'Die lokale deutsche Spracherkennung ist auf diesem Gerät nicht verfügbar.','network':'Die Spracherkennung ist momentan nicht verfügbar.'})[code]||'Spracherkennung nicht verfügbar. Bitte erneut versuchen.'}
 function abort(r){if(!r)return;r.onend=null;r.onresult=null;r.onerror=null;r.onstart=null;r.onspeechstart=null;try{r.abort()}catch{}}
 // Called directly from a start/resume tap, before awaiting audio activation.
 function prepare(r=run){
  if(isReadOnly()||!r?.plan?.some(d=>d.colour))return Promise.resolve(true);
  if(preparedRun===r)return Promise.resolve(true);
  if(warm)return warm.promise;
  let recognizer;try{recognizer=createRecognizer()}catch(e){toast(e.message);return Promise.resolve(false)}
  const token=generation;let resolve;
  const promise=new Promise(done=>resolve=done),entry={promise,recognizer,finish:null};warm=entry;
  const timeout=setTimeout(()=>finish(false,'Spracherkennung konnte nicht gestartet werden. Bitte erneut versuchen.'),10000);
  function finish(ok,message){if(warm!==entry)return;clearTimeout(timeout);abort(recognizer);warm=null;if(ok&&token===generation&&run===r&&!document.hidden)preparedRun=r;else ok=false;if(message)toast(message);resolve(ok)}
  entry.finish=finish;recognizer.onstart=()=>finish(true);recognizer.onerror=e=>finish(false,errorText(e.error));recognizer.onend=()=>finish(false,'Spracherkennung wurde beendet. Bitte erneut starten.');
  try{recognizer.start()}catch{finish(false,'Spracherkennung konnte nicht gestartet werden. Bitte erneut versuchen.')}
  return promise;
 }
 function diagnose(s,event,details={}){if(typeof speechTestLog!=='undefined')speechTestLog.add(s.diagnostic,event,details)}
 function candidate(s,now){
  const trial=s.trial;
  if(!trial||now<trial.started||now>trial.until+RESULT_GRACE_MS)return {trial:null,assignment:'none'};
  return {trial,assignment:trial.open&&now<=trial.until?'visible_colour':'recent_colour_grace'};
 }
 function matchesColour(words,colour){return words.includes(colour)||colour==='gelb'&&words.includes('geld')||colour==='rot'&&words.includes('brot')}
 function startRecognition(s){
  if(!active(s))return;
  let r;try{r=createRecognizer()}catch(e){fail(s,e.message);return}recognition=r;s.recognitionNumber=(s.recognitionNumber||0)+1;
  const segments=new Map();let speech=null,speechStarted=false;
  s.listening=false;s.startTimeout=setTimeout(()=>{if(active(s)&&recognition===r&&!s.listening)fail(s,'Spracherkennung reagiert nicht. Bitte den Satz erneut starten.')},5000);
  r.onstart=()=>{if(active(s)&&recognition===r){s.listening=true;diagnose(s,'recognition_started',{recognitionNumber:s.recognitionNumber,localProcessingRequested:'processLocally' in r?r.processLocally:null});clearTimeout(s.startTimeout);if(typeof refreshScreenAwakeAfterAudio==='function')void refreshScreenAwakeAfterAudio()}};
  r.onspeechstart=()=>{
   if(!active(s)||recognition!==r)return;const now=Date.now();speechStarted=true;speech={...candidate(s,now),at:now};
   diagnose(s,'speech_started',{recognitionNumber:s.recognitionNumber,colourId:speech.trial?.id??null,expectedColour:speech.trial?.colour??null,visibleColour:s.trial?.open?s.trial.colour:null,assignment:speech.assignment});
  };
  r.onresult=e=>{
   if(!active(s)||recognition!==r)return;
   const receivedAt=Date.now(),visibleColour=s.trial?.open?s.trial.colour:null;
   // Expire independently of the 100-ms paint tick, then use the same grace path.
   if(s.trial?.open&&receivedAt>=s.trial.until)closeTrial(s);
   for(let i=e.resultIndex;i<e.results.length;i++){
    const text=(e.results[i][0]?.transcript||'').toLocaleLowerCase('de-DE').normalize('NFC'),words=text.match(/[a-zäöüß]+/g)||[];
    let segment=segments.get(i);if(!segment){segment=speechStarted?{...speech}:{...candidate(s,receivedAt),at:null};segments.set(i,segment)}
    if(e.results[i].isFinal)speechStarted=false;
    const trial=segment.trial,decision=!trial?'no_assigned_colour':trial.correct?'already_counted':receivedAt>trial.until+RESULT_GRACE_MS?'too_late':matchesColour(words,trial.colour)?'accepted':'no_match';
    const raw=String(e.results[i][0]?.transcript||'').slice(0,500),final=!!e.results[i].isFinal,signature=JSON.stringify([raw,final]);
    if(segment.diagnosticSignature!==signature){segment.diagnosticSignature=signature;diagnose(s,'speech_result',{recognitionNumber:s.recognitionNumber,resultIndex:i,text:raw,final,confidence:Number.isFinite(e.results[i][0]?.confidence)?e.results[i][0].confidence:null,colourId:trial?.id??null,expectedColour:trial?.colour??null,visibleColour,assignment:segment.assignment,speechStartElapsedMs:segment.at===null?null:Math.max(0,segment.at-s.started),receivedAfterColourMs:trial?Math.max(0,receivedAt-trial.until):null,decision})}
    if(decision!=='accepted')continue;
    if(trial.open)closeTrial(s,true);else{trial.correct=true;s.stats.correct++}
    diagnose(s,'colour_answer_counted',{colour:trial.colour,colourId:trial.id,late:receivedAt>trial.until});
   }
  };
  r.onerror=e=>{if(!active(s)||recognition!==r)return;diagnose(s,'recognition_error',{error:e.error});if(['no-speech','aborted'].includes(e.error))return;fail(s,errorText(e.error))};
  r.onend=()=>{if(!active(s)||recognition!==r)return;diagnose(s,'recognition_ended');recognition=null;s.listening=false;clearTimeout(s.startTimeout);if(++s.restarts>4){fail(s,'Spracherkennung wurde unterbrochen. Bitte den Satz erneut starten.');return}s.retry=setTimeout(()=>startRecognition(s),300)};
  try{r.start()}catch{fail(s,'Spracherkennung konnte nicht gestartet werden. Bitte den Satz erneut starten.')}
 }
 function fail(s,message){if(!active(s))return;s.stats.unavailable=true;preparedRun=null;stop();pauseRun();toast(message)}
 function stop(reset=false){
  const s=session;session=null;if(s){clearInterval(s.clock);clearTimeout(s.retry);clearTimeout(s.startTimeout);if(s.trial?.open){s.trial.open=false;s.stats.interrupted=(s.stats.interrupted||0)+1;diagnose(s,'colour_interrupted',{colour:s.trial.colour,colourId:s.trial.id})}diagnose(s,'set_stopped')}
  abort(recognition);recognition=null;paint();
  if(reset){generation++;preparedRun=null;if(warm)warm.finish(false)}
 }
 function sync(){
  if(!eligible()||run.phase!=='work'||run.paused||document.hidden||tab!=='today'||isReadOnly()){stop();return}
  if(active()){paint();return}
  stop();run.colourResults=run.colourResults||{};
  const result=run.colourResults[run.index]||(run.colourResults[run.index]={shown:0,correct:0,interrupted:0});
  const s={run,index:run.index,started:Date.now(),stats:result,next:Date.now()+randomGap(),last:'',trial:null,restarts:0,diagnostic:typeof speechTestLog!=='undefined'?speechTestLog.begin(run,run.index):null};session=s;diagnose(s,'set_started',{timingVersion:2,matching:'exact-colour-word-plus-geld-for-gelb-and-brot-for-rot'});
  // Give the start signal time to finish before opening the microphone.
  s.retry=setTimeout(()=>startRecognition(s),850);s.clock=setInterval(step,100);paint();
 }
 function finishSet(){const s=session;if(s?.trial?.open)closeTrial(s);stop()}
 function summary(){
  const i=run?.index;let result=stats();if(run?.phase==='done'){const rows=Object.values(run.colourResults||{});if(!rows.length)return '';result=rows.reduce((s,r)=>({shown:s.shown+r.shown,correct:s.correct+r.correct,interrupted:s.interrupted+(r.interrupted||0)}),{shown:0,correct:0,interrupted:0})}else if(!run?.plan?.[i]?.colour||!result||!['rest','review'].includes(run.phase))return '';
  const count=Math.max(0,result.shown-(result.interrupted||0));
  return `<p class="colour-summary">${colourCue({colour:true},'Farberkennung')}<span><strong>${Math.min(result.correct,count)} von ${count}</strong> richtig erkannt</span></p>`;
 }
 return {prepare,sync,stop,finishSet,summary,supported:()=>!!supported()};
})();
function normalizeColourSettings(value){return {review:Array.from({length:4},(_,i)=>Math.max(0,Math.min(Number.isInteger(value?.review?.[i])?value.review[i]:0,20))),extras:Math.max(0,Math.min(Number.isInteger(value?.extras)?value.extras:0,20))}}
function validColourSettings(v){return !!v&&Array.isArray(v.review)&&v.review.length===4&&v.review.every(n=>Number.isInteger(n)&&n>=0&&n<=20)&&Number.isInteger(v.extras)&&v.extras>=0&&v.extras<=20}
function restoreColourResults(value,length){
 const result={};for(const [key,row] of Object.entries(value||{}))if(/^\d+$/.test(key)&&Number(key)<length&&row&&['shown','correct','interrupted'].every(k=>Number.isInteger(row[k])&&row[k]>=0&&row[k]<=10000)&&row.correct+row.interrupted<=row.shown)result[key]={shown:row.shown,correct:row.correct,interrupted:row.interrupted};return result;
}

function refreshColourPlan(r,current=false,all=false){
 if(!r||r.section!=='ball'||isReadOnly())return;
 r.plan=r.plan.map((d,index)=>{
  if(!all&&(r.completedSets||[]).includes(index)&&!(current&&index===r.index))return d;
  const drill=drills.find(x=>x.id===d.key);if(!drill)return d;
  const count=d.kind==='Feste Zusatzübung'?state.colourSets.extras:d.kind==='Wiederholung · '+levels[drill.level]?state.colourSets.review[drill.level]:0;
  const colour=count>0&&d.set>d.total-Math.min(count,d.total),row={...d};delete row.colour;delete row.noScore;if(colour)row.colour=true;return row;
 });
}

function colourCue(d,label='Dieser Satz mit Farberkennung'){
 return d?.colour?`<span class="colour-cue" role="img" aria-label="${label}">${['rot','blau','grün','gelb'].map(colour=>`<span data-cue-colour="${colour}" aria-hidden="true"></span>`).join('')}</span>`:'';
}

function trainingModeCue(d,next=false){
 if(!d)return '';
 const label=(next?'Nächster Satz':'Dieser Satz')+(d.colour?' mit Farberkennung':' auf Geschwindigkeit');
 return d.colour?colourCue(d,label):`<span class="speed-cue" role="img" aria-label="${label}"><svg viewBox="0 0 48 30" aria-hidden="true" focusable="false"><path d="M5 26a19 19 0 0 1 28-16M40 15a19 19 0 0 1 3 11" fill="none" stroke="currentColor" stroke-width="3.5"/><path d="M23 21 39 6 28 26Z" fill="currentColor"/><circle cx="24" cy="25" r="4.5" fill="currentColor"/></svg></span>`;
}
