/* Offline availability; no training data or Dropbox responses are cached here. */
(()=>{
 const footer=document.querySelector('footer');
 // Keep the release label from index.html; availability stays inspectable separately.
 const show=text=>{if(footer)footer.dataset.offlineStatus=text};
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
