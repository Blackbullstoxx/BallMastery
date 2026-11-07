/* Cache only the versioned app shell; never cache videos, credentials or backups. */
'use strict';
const RELEASE="2026.11.07.5";
const BASE=new URL(self.registration.scope);
const PREFIX='ballmastery-shell-'+encodeURIComponent(BASE.pathname)+'-';
const CACHE=PREFIX+RELEASE;
const ASSETS=["record-history.js?v=100", "private-videos.js?v=94", "./", "index.html", "balltraining-icon-180.png", "balltraining-icon-192.png", "manifest.webmanifest", "style.css?v=100", "videos.js?v=93", "record-charts.js?v=98", "training-progress.js?v=80", "day-overview.js?v=88", "ball-training-time.js?v=74", "dropbox-backup.js?v=95", "read-only.js?v=99", "speech-test-log.js?v=87", "colour-perception.js?v=95", "app.js?v=99", "offline.js?v=96", "drills.json?v=93", "dropbox-videos.json", "balltraining-icon-512.png", "drills.json"].map(path=>new URL(path,BASE).href);
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  try{await cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})))}
  catch(error){await caches.delete(CACHE);throw error}
  // Updates wait until existing app windows close. Never reload a running timer.
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
 const navigation=request.mode==='navigate'&&(url.pathname===BASE.pathname||url.pathname===new URL('index.html',BASE).pathname);
 if(!navigation&&!ASSETS.includes(url.href))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),hit=await cache.match(navigation?new URL('index.html',BASE).href:request);
  return hit||fetch(request);
 })());
});





