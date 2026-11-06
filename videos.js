'use strict';
const videoLibrary={area:'ball',openGroups:new Set(),selected:null,moves:privateVideos.catalog('moves')};
const moveVideoGroups=[['direction','Richtungswechsel'],['stops','Stops und Starts'],['feints','Finten']];
function libraryGroups(){return videoLibrary.area==='ball'?levels.map((name,i)=>({id:String(i),name,rows:drills.filter(d=>d.level===i)})):moveVideoGroups.map(([id,name])=>({id,name,rows:(videoLibrary.moves||[]).filter(d=>d.group===id)}))}
function closeLibraryVideo(){document.querySelectorAll('#video-results video').forEach(v=>{v.pause();v.removeAttribute('src');v.load()});document.querySelectorAll('#video-results .library-player').forEach(p=>p.replaceChildren())}
function renderVideos(){
 $('#view').innerHTML=`<h2>Videos</h2><div class="library-choice" role="group" aria-label="Videobereich"><button type="button" data-library-area="ball" aria-pressed="${videoLibrary.area==='ball'}">Ballbeherrschung</button><button type="button" data-library-area="moves" aria-pressed="${videoLibrary.area==='moves'}">Spieltechniken</button></div><div id="video-results"></div>`;
 document.querySelectorAll('[data-library-area]').forEach(b=>b.onclick=()=>{if(videoLibrary.area===b.dataset.libraryArea)return;closeLibraryVideo();videoLibrary.area=b.dataset.libraryArea;videoLibrary.selected=null;renderVideos()});
 renderVideoResults();
}
function renderVideoResults(){
 const host=$('#video-results');if(!host)return;

 const groups=libraryGroups().filter(g=>g.rows.length);
 host.innerHTML=groups.length?groups.map(g=>`<details class="card library-group" name="video-library-group" data-video-group="${g.id}" ${videoLibrary.openGroups.has(videoLibrary.area+':'+g.id)?'open':''}><summary>${esc(g.name)} <span class="library-count">${g.rows.length}</span></summary><div class="library-list">${g.rows.map(d=>{const key=videoLibrary.area+':'+d.id;return `<details class="library-drill" data-library-key="${key}" ${videoLibrary.selected===key?'open':''}><summary>${esc(title(d))}</summary><div class="library-player"></div></details>`}).join('')}</div></details>`).join(''):'<p role="status">Keine passenden Drills.</p>';
 host.querySelectorAll('[data-video-group]').forEach(g=>g.addEventListener('toggle',()=>{const key=videoLibrary.area+':'+g.dataset.videoGroup;if(g.open){host.querySelectorAll('[data-video-group]').forEach(other=>{if(other!==g){other.open=false;videoLibrary.openGroups.delete(videoLibrary.area+':'+other.dataset.videoGroup);other.querySelectorAll('.library-drill[open]').forEach(d=>{const v=d.querySelector('video');if(v){v.pause();v.removeAttribute('src');v.load()}d.querySelector('.library-player').replaceChildren();d.open=false})}});videoLibrary.openGroups.add(key)}else{videoLibrary.openGroups.delete(key);g.querySelectorAll('.library-drill[open]').forEach(d=>{d.open=false});}}));
 host.querySelectorAll('[data-library-key]').forEach(row=>{row.addEventListener('toggle',()=>{if(!row.open){const p=row.querySelector('.library-player'),v=p.querySelector('video');if(v){v.pause();v.removeAttribute('src');v.load()}p.replaceChildren();if(videoLibrary.selected===row.dataset.libraryKey)videoLibrary.selected=null;return}openLibraryVideo(row)});if(row.open)openLibraryVideo(row)});
}
function openLibraryVideo(row){
 const key=row.dataset.libraryKey;videoLibrary.selected=key;
 document.querySelectorAll('#video-results .library-drill[open]').forEach(other=>{if(other!==row){const v=other.querySelector('video');if(v){v.pause();v.removeAttribute('src');v.load()}other.querySelector('.library-player').replaceChildren();other.open=false}});
 const player=row.querySelector('.library-player');if(player.querySelector('video'))return;
 const d=(videoLibrary.area==='ball'?drills:videoLibrary.moves).find(x=>videoLibrary.area+':'+x.id===key);if(!d)return;
 player.innerHTML=privateVideos.markup(d,videoLibrary.area);privateVideos.bind(player);
}
