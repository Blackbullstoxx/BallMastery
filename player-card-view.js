
function mountPlayerCard(host,options){
 host.innerHTML="<div id=\"fvo-card-preview\" class=\"viz-dotted-background\">\n  <div class=\"fp-demo\">\n    <div class=\"fp-stage\">\n      <div class=\"fp-title\"><span></span><strong>GOLD</strong><span></span></div>\n      <button type=\"button\" class=\"fp-perspective cursor-interaction\" aria-label=\"Kartenanimation sofort abschlie\u00dfen\">\n        <div class=\"fp-halo\" aria-hidden=\"true\"></div>\n        <div class=\"fp-turn\">\n          <div class=\"fp-face fp-back\"><img alt=\"Goldene Kartenr\u00fcckseite\" draggable=\"false\"><img class=\"fp-new-back\" alt=\"\" aria-hidden=\"true\"><div class=\"fp-back-light\"></div><div class=\"fp-mist-clip\" aria-hidden=\"true\"><div class=\"fp-mist\"></div></div></div>\n          <div class=\"fp-face fp-front\"><img alt=\"Kartenhintergrund ohne pers\u00f6nliche Inhalte\" draggable=\"false\"><div class=\"fp-portrait-window\"><div class=\"fp-portrait\"><img alt=\"Freigestelltes Portrait\" draggable=\"false\"></div></div><img class=\"fp-frame-overlay\" alt=\"\" aria-hidden=\"true\" draggable=\"false\"><div class=\"fp-name\">FRITZ</div><div class=\"fp-ges\">GES</div><div class=\"fp-skill-labels\"><span>BALL</span><span>JONG</span><span>FINT</span><span>FLEISS</span></div><div class=\"fp-total\">74</div><div class=\"fp-ratings\"><span>70</span><span>80</span><span>60</span><span>85</span></div><div class=\"fp-badges\"><span class=\"fp-flag\" role=\"img\" aria-label=\"Deutschland\"></span><img src=\"cards/fvo-logo.jpg\" alt=\"FV Ottendorf-Okrilla 05\"></div><div class=\"fp-shine\"></div><div class=\"fp-glints\" aria-hidden=\"true\"></div></div>\n        </div>\n      </button>\n      <div class=\"fp-result\" aria-live=\"polite\">Bereit zur Enth\u00fcllung</div>\n    </div>\n    \n  </div>\n  </div>";

 const backs=["cards/backs-0.webp", "cards/backs-1.webp", "cards/backs-2.webp", "cards/backs-3.webp"],fronts=["cards/fronts-0.webp", "cards/fronts-1.webp", "cards/fronts-2.webp", "cards/fronts-3.webp"];
 const root=host.querySelector('#fvo-card-preview'),q=s=>root.querySelector(s);
 const warmAssets=[...backs,...fronts].map(src=>{const image=new Image();image.src=src;return image;});
 const names=['BRONZE','SILBER','GOLD','LEGENDE'],metals=['#85522e','#61666e','#9c6a17','#9c721d'];
 const turn=q('.fp-turn'),back=q('.fp-back'),front=q('.fp-front'),title=q('.fp-title'),result=q('.fp-result'),total=q('.fp-total'),ratings=[...root.querySelectorAll('.fp-ratings span')];
 const scene={value:options.correction?'fall':options.to.tier>options.from.tier?'upgrade':'reveal'},tier={value:options.from.tier},reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let serial=0,timers=[],animations=[],targetTier=2,target=[70,80,60,85],targetOverall=74;
 const normal=options.from.values,higher=options.to.values;
 function overall(v){return v===normal?options.from.total:options.to.total;}
 function cancel(){options.sounds?.stop();serial++;timers.forEach(clearTimeout);timers=[];animations.forEach(a=>a.cancel());animations=[];q('.fp-glints').replaceChildren();q('.fp-mist').style.opacity='0';q('.fp-new-back').style.clipPath='inset(0 0 100% 0)';q('.fp-back img').style.clipPath='inset(0 0 0 0)';}
 function at(ms,fn){const token=serial;timers.push(setTimeout(()=>{if(token===serial)fn()},ms));}
 function anim(el,keyframes,duration,delay=0){const a=el.animate(keyframes,{duration,delay,easing:'cubic-bezier(.33,0,.2,1)',fill:'forwards'});animations.push(a);return a;}
 function side(which){back.hidden=which!=='back';front.hidden=which!=='front';turn.style.transform='none';}
 function material(t){front.dataset.cardTier=String(t);q('.fp-back img').src=backs[t];q('.fp-front img').src=fronts[t];q('.fp-frame-overlay').src=fronts[t];back.style.maskImage='url('+backs[t]+')';front.style.maskImage='url('+fronts[t]+')';q('.fp-back-light').style.maskImage='url('+backs[t]+')';q('.fp-mist-clip').style.maskImage='url('+backs[t]+'),url('+backs[t]+')';q('.fp-stage').style.setProperty('--metal',metals[t]);title.querySelector('strong').textContent=names[t];q('.fp-back img').alt=names[t]+' – Kartenrückseite';}
 function values(v,o){ratings.forEach((el,i)=>el.querySelector('.fp-num').textContent=options.relevant[i]?v[i]:options.to.values[i]);total.textContent=o;}
 function deltas(){ratings.forEach(el=>{el.className='';el.querySelector('small')?.remove()});}
 function selection(){return options.from.tier;}
 function reset(){cancel();deltas();const player='player';front.dataset.player=player;q('.fp-portrait img').src=options.portrait||'cards/default-portrait.webp';q('.fp-portrait img').alt=options.portrait?'Freigestelltes Portrait von '+options.name:'Spielersilhouette';q('.fp-name').textContent=options.name.toUpperCase();const t=selection();targetTier=t;target=scene.value==='fall'?[...higher]:[...normal];targetOverall=overall(target);material(t);values(target,targetOverall);if(scene.value==='rise')conceal();title.style.opacity='1';side(['rise','fall'].includes(scene.value)?'front':'back');result.textContent='Deine Spielerkarte';}
 function finish(){cancel();material(targetTier);side('front');values(target,targetOverall);title.style.opacity='1';result.textContent='Deine Spielerkarte · '+names[targetTier];}
 function sparks(duration=2200){q('.fp-glints').replaceChildren();for(let i=0;i<18;i++){const e=document.createElement('i');e.style.left=(5+Math.random()*90)+'%';e.style.top=(8+Math.random()*78)+'%';q('.fp-glints').append(e);anim(e,[{opacity:0,transform:'scale(.1) rotate(45deg)'},{opacity:1,transform:'scale(1.4) rotate(90deg)',offset:.4},{opacity:0,transform:'scale(.1) translateY(-20px) rotate(140deg)'}],duration,i*50);}}
 function count(from,to,oldOverall,newOverall){if(scene.value!=='fall'){surpriseCount(from,to,oldOverall,newOverall);return;}const token=serial;ratings.forEach((el,i)=>{const d=to[i]-from[i];if(!d||!options.relevant[i])return;el.className=d>0?'fp-up':'fp-down';const delta=document.createElement('small');delta.textContent=(d>0?'+':'')+d;el.append(delta);anim(el.querySelector('.fp-num'),[{transform:'translateY(0) scale(1)'},{transform:'translateY(-4px) scale(1.12)',offset:.3},{transform:'translateY(0) scale(1)'}],2800)});if(oldOverall!==newOverall)anim(total,[{filter:'brightness(1)'},{filter:'brightness(1.6)',offset:.5},{filter:'brightness(1)'}],2800);let start;function step(now){if(token!==serial)return;if(start===undefined)start=now;const p=Math.min(1,(now-start)/3000);values(from.map((v,i)=>Math.round(v+(to[i]-v)*p)),Math.round(oldOverall+(newOverall-oldOverall)*p));if(p<1)requestAnimationFrame(step);}requestAnimationFrame(step);}
 function conceal(){ratings.forEach((el,i)=>el.querySelector('.fp-num').textContent=options.relevant[i]?'–':options.to.values[i]);total.textContent='–';}
 function showChange(el,d){
   if(!d)return;
   el.className=d>0?'fp-up':'fp-down';
   const delta=document.createElement('small');delta.textContent=(d>0?'+':'')+d;
   el.append(delta);
   if(!reduced)anim(delta,[{opacity:0,transform:'translateX(-50%) translateY(3px)'},{opacity:1,transform:'translateX(-50%) translateY(0)'}],650);
 }
 function surpriseCount(from,to,oldOverall,newOverall){
   const token=serial,duration=6400,fastDuration=1800;
   deltas();values([0,0,0,0],0);
   const fields=[...ratings.flatMap((el,i)=>options.relevant[i]&&options.to.visible[i]?[{el:el.querySelector('.fp-num'),target:to[i]}]:[]),{el:total,target:newOverall}];
   // Accelerate from zero; then let the final eight unit steps take longer
   // and longer. Every intermediate value is below its final target.
   fields.forEach(({el,target})=>{
     const finalSteps=Math.min(8,target),fastTarget=target-finalSteps;
     const steps=[];
     for(let n=1;n<=fastTarget;n++)steps.push({time:fastDuration*Math.sqrt(n/fastTarget),value:n});
     for(let n=1;n<=finalSteps;n++)steps.push({time:fastDuration+(duration-fastDuration)*Math.pow(n/finalSteps,1.8),value:fastTarget+n});
     let index=0,started;
     function roll(now){
       if(token!==serial)return;
       if(started===undefined)started=now;
       const elapsed=now-started;
       let next;
       while(index<steps.length&&elapsed>=steps[index].time)next=steps[index++];
       if(next){
         el.textContent=next.value;
         if(elapsed>=fastDuration)anim(el,[{transform:'translateY(-3px)',opacity:.6},{transform:'translateY(0)',opacity:1}],Math.min(180,110+elapsed/60));
       }
       if(el===total)options.sounds?.countFrame(elapsed,next&&next.value>fastTarget?next.value-fastTarget:0);
       if(index<steps.length)requestAnimationFrame(roll);
       else el.textContent=target;
     }
     requestAnimationFrame(roll);
   });
   at(duration+300,()=>{
     values(to,newOverall);
     ratings.forEach((el,i)=>{if(options.relevant[i])showChange(el,to[i]-from[i])});
     result.textContent='Deine neuen Werte · Gesamt '+newOverall;
   });
 }

 function flip(start){
   at(start,()=>{anim(turn,[{transform:'perspective(1100px) rotateY(0deg)'},{transform:'perspective(1100px) rotateY(90deg)'}],1800);});
   at(start+1800,()=>{animations.filter(a=>a.effect?.target===turn).forEach(a=>a.cancel());side('front');anim(turn,[{transform:'perspective(1100px) rotateY(-90deg)'},{transform:'perspective(1100px) rotateY(0deg)'}],2200);});
   at(start+4000,()=>{anim(q('.fp-shine'),[{transform:'translateX(-110%)'},{transform:'translateX(110%)'}],2300);sparks();});
 }
 function upgrade(old,next){
  const previous=q('.fp-back img'),incoming=q('.fp-new-back'),mist=q('.fp-mist');
  incoming.src=backs[next];q('.fp-mist-clip').style.maskImage='url('+backs[old]+'),url('+backs[next]+')';
  at(900,()=>{
    options.sounds?.shine();result.textContent='Das neue Material entsteht …';
    anim(q('.fp-halo'),[{opacity:0},{opacity:.25,offset:.35},{opacity:0}],6200);
    const token=serial;let started;
    function sweep(now){
      if(token!==serial)return;
      if(started===undefined)started=now;
      const progress=Math.min(1,(now-started)/5800);
      const boundary=-12+124*progress;
      const cut=Math.min(100,Math.max(0,boundary));
      previous.style.clipPath='inset('+cut+'% 0 0 0)';
      incoming.style.clipPath='inset(0 0 '+(100-cut)+'% 0)';
      mist.style.top=(boundary-11)+'%';
      mist.style.opacity=String(Math.min(1,progress*12,(1-progress)*12));
      if(progress<1){requestAnimationFrame(sweep);return;}
      // Both layers now display exactly the final incoming silhouette. Swapping
      // identical pixels here cannot add or remove any part of the new frame.
      material(next);
      previous.style.clipPath='inset(0 0 0 0)';
      incoming.style.clipPath='inset(0 0 100% 0)';
      mist.style.opacity='0';
      result.textContent=names[old]+' wird zu '+names[next];
    }
    requestAnimationFrame(sweep);
  });
}

 function play(){reset();const mode=scene.value,t=selection();let from=[...normal],to=[...higher],before=overall(normal),after=overall(higher);
   before=options.from.total;after=options.to.total;
   if(mode==='upgrade'){targetTier=options.to.tier;}
   targetTier=options.to.tier;target=to;targetOverall=after;values(from,before);if(mode!=='fall')conceal();
   if(reduced){finish();ratings.forEach((el,i)=>{if(options.relevant[i])showChange(el,to[i]-from[i])});return;}
   if(mode==='rise'||mode==='fall'){side('front');result.textContent=mode==='rise'?'Dein Training verbessert die Kartenwerte …':'Berichtigte Trainingsdaten passen die Werte an …';at(1200,()=>count(from,to,before,after));if(mode==='fall')at(4500,()=>{material(targetTier);result.textContent='Gesamt '+before+' → '+after;});return;}
   options.sounds=options.soundFactory?.()||null;
   side('back');result.textContent=mode==='upgrade'?names[t]+' → '+names[options.to.tier]:'Ein besonderer Moment für dein Training …';
   if(mode==='reveal'){options.sounds?.shine();const shine=q('.fp-back-light');const a=shine.animate([{backgroundPosition:'90% 0%'},{backgroundPosition:'10% 0%'}],{duration:3900,easing:'linear',fill:'forwards'});animations.push(a);}
   if(mode==='upgrade')upgrade(t,options.to.tier);
   const start=mode==='upgrade'?7700:4200;flip(start);
   at(start+5200,()=>{count(from,to,before,after);result.textContent=mode==='upgrade'?'Neue Kartenstufe: '+names[targetTier]:'Training geschafft · Deine Werte steigen';});
   at(start+12400,()=>{result.textContent=mode==='upgrade'?names[targetTier]+' freigeschaltet · Gesamt '+after:'Deine neuen Werte · Gesamt '+after;});
 }
 ratings.forEach(el=>{const value=el.textContent;el.replaceChildren();const num=document.createElement('b');num.className='fp-num';num.textContent=value;el.append(num)});

 const image=q('.fp-portrait img');
 q('.fp-name').style.fontSize=Math.min(34,Math.floor(280/(Math.max(1,options.name.length)*.62)))+'px';
 const layout=options.portrait?(options.layout||{scale:114,x:-2,y:0}):{scale:100,x:0,y:0};
 if(!options.portrait)image.classList.add('fp-default-portrait');
 image.style.width=layout.scale+'%';image.style.left=layout.x+'%';image.style.top=layout.y+'%';
 ratings.forEach((el,i)=>el.style.display=options.to.visible[i]?'':'none');
 [...root.querySelectorAll('.fp-skill-labels span')].forEach((el,i)=>el.style.display=options.to.visible[i]?'':'none');
 q('.fp-perspective').onclick=()=>{finish();deltas();ratings.forEach((el,i)=>{if(options.relevant[i]&&options.animate)showChange(el,options.to.values[i]-options.from.values[i])})};
 reset();
 if(options.animate)play();else {targetTier=options.to.tier;target=options.to.values;targetOverall=options.to.total;finish()}
 return cancel;
}
