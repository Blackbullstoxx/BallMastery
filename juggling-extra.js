'use strict';
// Optional time belongs to the current run, never to the prescribed plan.
function jugglingExtraMarkup(value,last){
 const minutes=value.extraMinutes||3;
 return `<div class="two juggling-review-actions"><button type="button" id="juggling-extra-toggle" aria-expanded="${!!value.extraOpen}" aria-controls="juggling-extra-options">Weitertrainieren${value.extraOpen?' ⌃':''}</button><button type="button" class="primary" id="${last?'finish-area':'next-drill'}">${last?'Jonglieren abschließen':'Nächste Übung'}</button></div>${value.extraOpen?`<form id="juggling-extra-options" class="juggling-extra-options"><h4>Zusatzzeit</h4><div class="juggling-extra-presets">${[3,5,7].map(n=>`<button type="button" data-extra-minutes="${n}" aria-pressed="${minutes===n}">+${n} Min.</button>`).join('')}</div><label for="juggling-extra-minutes">Eigene Dauer</label><div class="juggling-extra-duration"><input id="juggling-extra-minutes" name="minutes" type="number" min="0.5" max="120" step="0.5" inputmode="decimal" value="${minutes}" required><span>Min.</span></div><button class="primary" type="submit">Starten</button></form>`:''}`;
}
function jugglingDoneTimerMarkup(){return '<div class="timer-ring juggling-done-timer"><svg viewBox="0 0 240 240" aria-hidden="true"><circle class="timer-arc" cx="120" cy="120" r="108"/></svg><div class="timer-face"><div class="clock">00:00</div><div class="timer-label">Geschafft!</div></div></div>'}
function bindJugglingExtra(){
 const toggle=document.querySelector('#juggling-extra-toggle');
 if(toggle)toggle.onclick=()=>{if(isReadOnly())return;run.extraOpen=!run.extraOpen;preserveScroll(()=>renderRunner());if(run.extraOpen)window.requestAnimationFrame(()=>document.querySelector('#juggling-extra-options')?.scrollIntoView({block:'nearest',inline:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}))};
 document.querySelector('#juggling-extra-end')?.addEventListener('click',endJugglingExtra);
 const form=document.querySelector('#juggling-extra-options');if(!form)return;
 const input=form.querySelector('input'),buttons=[...form.querySelectorAll('[data-extra-minutes]')];
 const select=()=>{const n=Number(input.value);if(input.validity.valid)run.extraMinutes=n;buttons.forEach(b=>b.setAttribute('aria-pressed',String(n===Number(b.dataset.extraMinutes))))};
 buttons.forEach(b=>b.onclick=()=>{input.value=b.dataset.extraMinutes;select()});input.addEventListener('input',select);
 form.onsubmit=e=>{e.preventDefault();if(isReadOnly()||!form.reportValidity())return;void startJugglingExtra(Number(input.value))};
}
async function startJugglingExtra(minutes){
 const value=run;
 if(isReadOnly()||!value||value.section!=='juggling'||value.phase!=='review'||value.extraStarting||value.finishPending||!(value.completedSets||[]).includes(value.index)||!Number.isFinite(minutes)||minutes<.5||minutes>120||!Number.isInteger(minutes*2))return;
 value.extraStarting=true;value.extraSeconds=minutes*60;value.extraMinutes=minutes;value.extraOpen=false;
 try{await countdown()}finally{delete value.extraStarting;if(value.phase==='review'){delete value.extraSeconds;if(run===value)renderRunner()}}
}
function finishJugglingExtra(){
 if(run?.section!=='juggling'||!run.extraSeconds)return false;
 delete run.extraSeconds;run.phase='review';run.remaining=0;run.paused=false;clearInterval(tick);
 if(typeof reconcileJugglingPlan==='function')reconcileJugglingPlan();renderRunner();return true;
}

function endJugglingExtra(){
 if(isReadOnly()||run?.section!=='juggling'||!run.extraSeconds||!['count','work'].includes(run.phase))return;
 syncBallTime();resetBallClock();silence();
 if(finishJugglingExtra()&&typeof dropboxBackup!=='undefined')dropboxBackup.changed(true);
}
