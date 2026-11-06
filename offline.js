/* Offline availability; no training data or Dropbox responses are cached here. */
(()=>{
 const footer=document.querySelector('footer');
 let status='Offline-Version wird vorbereitet …';
 const paint=()=>{if(!footer)return;const base=footer.textContent.startsWith('Leseansicht')?'Leseansicht · Datenstand aus Dropbox':'Auf diesem Gerät gespeichert';const text=base+' · '+status+' · Videos benötigen Internet';if(footer.textContent!==text)footer.textContent=text};
 const show=text=>{status=text;paint()};
 if(footer)new MutationObserver(paint).observe(footer,{childList:true,characterData:true,subtree:true});
 if(!('serviceWorker' in navigator)||!window.isSecureContext){show('Offline-Start nicht verfügbar');return}
 show('Offline-Version wird vorbereitet …');
 let available=false;
 const ready=()=>{available=true;show('App offline bereit')};
 const watch=registration=>{
  const worker=registration.installing;
  if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='redundant'&&!available)show('Offline-Vorbereitung fehlgeschlagen – online neu laden')});
 };
 navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(registration=>{
  watch(registration);registration.addEventListener('updatefound',()=>watch(registration));
  return navigator.serviceWorker.ready;
 }).then(ready).catch(()=>{if(!available)show('Offline-Vorbereitung fehlgeschlagen – online neu laden')});
})();
