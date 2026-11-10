/* Cache only the versioned app shell; never cache videos, credentials or backups. */
'use strict';
const RELEASE="2026.11.10.1";
const BASE=new URL(self.registration.scope);
const PREFIX='ballmastery-shell-'+encodeURIComponent(BASE.pathname)+'-';
const CACHE=PREFIX+RELEASE;
const ASSETS=["player-card-view.js?v=110", "player-cards.js?v=110", "player-cards.css?v=110", "cards/backs-0.webp", "cards/backs-1.webp", "cards/backs-2.webp", "cards/backs-3.webp", "cards/fronts-0.webp", "cards/fronts-1.webp", "cards/fronts-2.webp", "cards/fronts-3.webp", "cards/fvo-logo.jpg","weekly-learning.js?v=106", "record-history.js?v=110", "private-videos.js?v=94", "./", "index.html", "balltraining-icon-180.png", "balltraining-icon-192.png", "manifest.webmanifest", "style.css?v=109", "videos.js?v=93", "record-charts.js?v=98", "training-progress.js?v=110", "day-overview.js?v=103", "ball-training-time.js?v=110", "dropbox-backup.js?v=110", "read-only.js?v=110", "speech-test-log.js?v=87", "colour-perception.js?v=95", "mastery-progress.js?v=109", "app.js?v=110", "offline.js?v=96", "drills.json?v=93", "dropbox-videos.json", "balltraining-icon-512.png", "drills.json"].map(path=>new URL(path,BASE).href);
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







