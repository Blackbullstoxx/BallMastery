'use strict';
const recordChartPeriods=new Map();let recordChartObserver=null;
const scoreDay=date=>/^\d{4}-\d{2}-\d{2}$/.test(date)?Date.parse(date+'T00:00:00Z'):NaN;
function recordSeries(scores,key,duration,period,today){const end=scoreDay(today),cutoff=period?end-(period-1)*86400000:-Infinity,byDate=new Map();for(const row of scores){const day=scoreDay(row.date);if(row.key!==key||row.duration!==duration||!Number.isFinite(row.value)||row.value<0||!Number.isFinite(day)||day<cutoff||day>end)continue;const previous=byDate.get(row.date);if(!previous||row.value>previous.value)byDate.set(row.date,{date:row.date,value:row.value,day})}return [...byDate.values()].sort((a,b)=>a.day-b.day)}
function recordChartMarkup(key,duration,colour=false){const rows=recordSeries(colour?state.colourScores:state.scores,key,duration,0,date()),today=rows.find(r=>r.date===date()),record=rows.length?Math.max(...rows.map(r=>r.value)):0,period=recordChartPeriods.get(JSON.stringify([key,duration,colour]))||0;return `<section class="record-chart" data-chart-key="${esc(key)}" data-chart-duration="${duration}" data-chart-colour="${colour}"><h4 class="chart-duration">${colour?colourCue({colour:true},'Mit Farberkennung')+' ':''}${duration?duration+' Sekunden':'Kontakte am Stück'}</h4><div class="record-metrics"><div><span>Heute</span><strong>${today?.value??'–'}</strong></div><div><span>Rekord</span><strong>${record}</strong></div></div>${!colour&&duration===0&&['toe','free'].includes(key)?recordJugglingTrendMarkup(rows):recordTrendMarkup(rows,duration)}${!colour&&duration===0?recordJugglingMarkup(key,rows):''}<div class="chart-periods" role="group" aria-label="Zeitraum ${duration?duration+' Sekunden':'Kontakte am Stück'}">${[[30,'30 Tage'],[90,'90 Tage'],[0,'Alles']].map(([n,label])=>`<button type="button" data-chart-period="${n}" aria-pressed="${n===period}">${label}</button>`).join('')}</div><div class="chart-drawing"></div><p class="chart-selection" aria-live="polite"></p></section>`}
function stopRecordCharts(){recordChartObserver?.disconnect();recordChartObserver=null}
function mountRecordCharts(){stopRecordCharts();const panels=[...document.querySelectorAll('.record-chart')];for(const panel of panels){panel.querySelectorAll('[data-chart-period]').forEach(button=>button.onclick=()=>{recordChartPeriods.set(JSON.stringify([panel.dataset.chartKey,Number(panel.dataset.chartDuration),panel.dataset.chartColour==='true']),Number(button.dataset.chartPeriod));delete panel.dataset.selectedDate;panel.querySelectorAll('[data-chart-period]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));drawRecordChart(panel)});drawRecordChart(panel)}if(window.ResizeObserver){recordChartObserver=new ResizeObserver(entries=>entries.forEach(({target})=>{if(target.isConnected&&target.dataset.chartWidth!==String(target.querySelector('.chart-drawing').clientWidth))drawRecordChart(target)}));panels.forEach(p=>recordChartObserver.observe(p))}}
function drawRecordChart(panel){const key=panel.dataset.chartKey,duration=Number(panel.dataset.chartDuration),colour=panel.dataset.chartColour==='true',scores=colour?state.colourScores:state.scores,period=recordChartPeriods.get(JSON.stringify([key,duration,colour]))||0,rows=recordSeries(scores,key,duration,period,date()),all=recordSeries(scores,key,duration,0,date()),allBest=all.length?Math.max(...all.map(r=>r.value)):0,host=panel.querySelector('.chart-drawing'),detail=panel.querySelector('.chart-selection');const width=Math.max(200,host.clientWidth);panel.dataset.chartWidth=String(host.clientWidth);
 if(!rows.length){host.innerHTML='<p class="chart-empty">In diesem Zeitraum noch keine Einträge.</p>';detail.textContent='';return}
 const h=190,left=Math.max(44,String(Math.max(3,...rows.map(r=>r.value))*3).length*7+12),right=14,top=18,bottom=35,plotW=width-left-right,plotH=h-top-bottom,end=scoreDay(date());let xMin=period?end-(period-1)*86400000:rows[0].day,xMax=period?end:rows[rows.length-1].day;if(xMin===xMax){xMin-=86400000;xMax+=86400000}
 const largest=Math.max(...rows.map(r=>r.value)),raw=Math.max(1,largest/3),power=10**Math.floor(Math.log10(raw)),step=[1,2,5,10].map(n=>n*power).find(n=>n>=raw),maxY=step*3,x=d=>left+(d-xMin)/(xMax-xMin)*plotW,y=v=>top+plotH-(v/maxY)*plotH,formatDay=(value,full=false)=>new Date(value).toLocaleDateString('de-DE',{timeZone:'UTC',day:'2-digit',month:'2-digit',...(full?{year:'numeric'}:{})});
 const peakIndex=rows.findLastIndex(r=>r.value===allBest),ticks=rows.length===1?[rows[0].day]:[xMin,(xMin+xMax)/2,xMax],line=rows.map((r,i)=>(i?'L':'M')+x(r.day).toFixed(2)+','+y(r.value).toFixed(2)).join(' '),area=rows.length>1?`${line} L${x(rows[rows.length-1].day)},${top+plotH} L${x(rows[0].day)},${top+plotH} Z`:'';
 host.innerHTML=`<svg class="record-plot" viewBox="0 0 ${width} ${h}" role="group" aria-label="Fortschritt: ${rows.length} Trainingstag${rows.length===1?'':'e'}, ${duration?'Wiederholungen in '+duration+' Sekunden':'Kontakte am Stück'}"><title>Tagesbestwerte über die Zeit</title>${[0,1,2,3].map(i=>`<line class="chart-grid" x1="${left}" x2="${width-right}" y1="${y(i*step)}" y2="${y(i*step)}"/><text class="chart-axis" text-anchor="end" x="${left-9}" y="${y(i*step)+4}">${i*step}</text>`).join('')}${ticks.map((d,i)=>`<text class="chart-axis" text-anchor="${ticks.length===1?'middle':i===0?'start':i===2?'end':'middle'}" x="${x(d)}" y="${h-12}">${formatDay(d)}</text>`).join('')}${area?`<path class="chart-area" d="${area}"/>`:''}${rows.length>1?`<path class="chart-line" d="${line}"/>`:''}<line class="chart-guide" x1="0" x2="0" y1="${top}" y2="${top+plotH}" visibility="hidden"/>${rows.map((r,i)=>`<g class="chart-point" data-point-index="${i}" role="button" tabindex="0" aria-label="${formatDay(r.day,true)}: ${r.value}${r.value===allBest?', persönlicher Rekord':''}"><circle class="chart-hit" cx="${x(r.day)}" cy="${y(r.value)}" r="16"/>${i===peakIndex?`<circle class="chart-record" cx="${x(r.day)}" cy="${y(r.value)}" r="6"/>`:''}</g>`).join('')}</svg>`;
 const svg=host.querySelector('svg'),guide=host.querySelector('.chart-guide');
 function show(i){const r=rows[i];panel.dataset.selectedDate=r.date;detail.textContent=formatDay(r.day,true)+' · '+r.value+' '+(duration?'Wiederholungen':'Kontakte')+(r.value===allBest?' · Rekord':'');guide.setAttribute('x1',x(r.day));guide.setAttribute('x2',x(r.day));guide.setAttribute('visibility','visible')}
 function nearest(e){const box=svg.getBoundingClientRect(),px=(e.clientX-box.left)*width/box.width;let index=0;for(let i=1;i<rows.length;i++)if(Math.abs(x(rows[i].day)-px)<Math.abs(x(rows[index].day)-px))index=i;show(index)}
 svg.addEventListener('click',nearest);svg.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')nearest(e)});host.querySelectorAll('[data-point-index]').forEach(point=>{point.addEventListener('focus',()=>show(Number(point.dataset.pointIndex)));point.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show(Number(point.dataset.pointIndex))}})});
 show(Math.max(0,rows.findIndex(r=>r.date===panel.dataset.selectedDate)>=0?rows.findIndex(r=>r.date===panel.dataset.selectedDate):rows.length-1));
}


// Compare two disjoint groups of recorded days, never fill missing days with zero.
function recordMedian(rows){const values=rows.map(r=>r.value).sort((a,b)=>a-b),i=Math.floor(values.length/2);return values.length?(values.length%2?values[i]:(values[i-1]+values[i])/2):null}
function recordTrendMarkup(rows,duration){
 if(rows.length<10)return '';
 const current=recordMedian(rows.slice(-5)),previous=recordMedian(rows.slice(-10,-5)),f=n=>n.toLocaleString('de-DE',{maximumFractionDigits:1});
 return `<p class="record-trend" title="Median der letzten fünf eingetragenen Tagesbestwerte im Vergleich zu den fünf davor. Unabhängig vom gewählten Diagrammzeitraum.">Zuletzt meist <strong>${f(current)}</strong> ${duration?'Wiederholungen':'Kontakte'} · zuvor ${f(previous)}<small>Je 5 Tagesbestwerte · Median</small></p>`;
}
function recordColourMarkup(key){
 const rows=(state.colourTraining||[]).filter(r=>r.key===key&&scoreDay(r.date)<=scoreDay(date())),durations=[...new Set(rows.map(r=>r.duration))].sort((a,b)=>a-b);
 const scores=(state.colourScores||[]).filter(r=>r.key===key),scoreDurations=[...new Set(scores.map(r=>r.duration))].sort((a,b)=>a-b);
 if(!rows.length&&!scores.length)return '';
 return `<section class="record-colour"><h4 class="chart-duration">${colourCue({colour:true},'Farberkennung')}</h4>${durations.map(duration=>{
  const all=rows.filter(r=>r.duration===duration&&r.shown>r.interrupted).sort((a,b)=>scoreDay(a.date)-scoreDay(b.date)||a.finishedAt-b.finishedAt),recent=all.slice(-5),prior=all.slice(-10,-5);
  const total=list=>list.reduce((a,r)=>({shown:a.shown+r.shown-r.interrupted,correct:a.correct+r.correct}),{shown:0,correct:0}),t=total(recent),p=total(prior);
  if(!recent.length)return `<p class="hint">${duration} Sek. · Noch keine auswertbaren Farben.</p>`;
  return `<p class="record-colour-result"><strong>${t.correct} von ${t.shown}</strong> richtig erkannt · ${Math.round(100*t.correct/t.shown)} %<small>${duration} Sek. · ${recent.length===1?'letzter Satz':'letzte '+recent.length+' Sätze'}${recent.length===5&&prior.length===5?' · zuvor '+Math.round(100*p.correct/p.shown)+' %':''}</small></p>`;
 }).join('')}${scoreDurations.map(duration=>recordChartMarkup(key,duration,true)).join('')}</section>`;
}

/* Summarise recorded daily maxima; unrecorded days are not failed attempts. */
function recordJugglingStats(key,rows,today){
 if(!['toe','free'].includes(key))return null;
 const cutoff=scoreDay(today)-29*86400000,recent=rows.slice(-5),window=rows.filter(row=>row.day>=cutoff);
 const best=window.length?Math.max(...window.map(row=>row.value)):null;
 let level=null,count=0;
 if(recent.length===5){
  const median=recordMedian(recent),steps=[1,5,10,20,30,50,75];
  for(let power=100;power<=median;power*=10)steps.push(power,power*1.5,power*2,power*3,power*5,power*7.5);
  level=steps.filter(n=>n<=median).sort((a,b)=>b-a)[0]??null;
  if(level!==null)count=recent.filter(row=>row.value>=level).length;
 }
 return {best,level,count};
}
function recordJugglingMarkup(key,rows){
 const stats=recordJugglingStats(key,rows,date());if(!stats||!rows.length)return '';
 const f=n=>n.toLocaleString('de-DE');
 return `<p class="record-trend record-juggling" title="Das Kontaktniveau ist die höchste passende Stufe, die an mindestens drei der letzten fünf Tage mit eingetragenem Tagesbestwert erreicht wurde. Der 30-Tage-Bestwert umfasst heute und die 29 Tage davor. Beide Angaben sind unabhängig vom gewählten Diagrammzeitraum.">${stats.level!==null?`<span><strong>${f(stats.level)}+</strong> Kontakte an <strong>${stats.count} von 5</strong> erfassten Tagen</span><br>`:''}<span>30-Tage-Bestwert: <strong>${stats.best===null?'–':f(stats.best)}</strong>${stats.best===null?'':' Kontakte'}</span></p>`;
}


// Two non-overlapping windows of recorded daily maxima, not calendar weeks/months.
function recordWindowTrend(rows,size){
 if(rows.length<size*2)return null;
 const recent=rows.slice(-size),prior=rows.slice(-size*2,-size),current=recordMedian(recent),previous=recordMedian(prior),difference=current-previous,percent=previous===0?null:difference/previous*100;
 const changed=Math.abs(difference)>=3&&(percent===null||Math.abs(percent)>=10-1e-9);
 return {recent,prior,current,previous,difference,percent,direction:changed?(difference>0?'up':'down'):'flat'};
}
function recordTrendArrow(direction){
 const paths={up:'M2 17 10 9 17 14 29 2 M21 2 H29 V10',flat:'M2 10 H29 M22 3 29 10 22 17',down:'M2 3 10 11 17 6 29 18 M21 18 H29 V10'};
 return `<svg class="record-trend-arrow trend-${direction}" viewBox="0 0 32 20" aria-hidden="true" focusable="false"><path d="${paths[direction]}"/></svg>`;
}
function recordJugglingTrendMarkup(rows){
 if(!rows.length)return '';
 const format=n=>n.toLocaleString('de-DE',{maximumFractionDigits:0}),day=d=>d.split('-').reverse().join('.'),windows=[[6,'Woche'],[24,'Monat']],directionLabel={up:'steigend',flat:'etwa gleich',down:'fallend'};
 const comparisons=windows.map(([size,label])=>({size,label,trend:recordWindowTrend(rows,size)}));
 const icon=({label,trend})=>{if(!trend)return `<span class="record-trend-item" aria-label="${label}: noch nicht genügend Einträge">${label} <span aria-hidden="true">–</span></span>`;
  const value=trend.direction==='flat'?'':trend.percent===null?(trend.difference>0?'+':'')+format(trend.difference): (trend.percent>0?'+':'−')+Math.round(Math.abs(trend.percent))+' %';
  return `<span class="record-trend-item" aria-label="${label}: ${directionLabel[trend.direction]}${value?', '+value+(trend.percent===null?' Kontakte':''):''}">${label} ${recordTrendArrow(trend.direction)}${value?`<span>${value}</span>`:''}</span>`;
 };
 const week=comparisons[0].trend,last=rows.at(-1),stale=scoreDay(date())-last.day>30*86400000;
 return `${week?`<p class="record-trend">Zuletzt meist <strong>${format(week.current)}</strong> Kontakte · zuvor ${format(week.previous)}</p>`:''}<details class="record-trend-details"><summary><span>Trend:</span>${comparisons.map(icon).join('<span aria-hidden="true">·</span>')}</summary><div class="record-trend-explanation">${comparisons.map(({size,label,trend})=>trend?`<p><strong>${label}:</strong> letzte ${size} erfasste Tage (${day(trend.recent[0].date)}–${day(trend.recent.at(-1).date)}), Median ${format(trend.current)}; davor ${size} Tage (${day(trend.prior[0].date)}–${day(trend.prior.at(-1).date)}), Median ${format(trend.previous)}.</p>`:`<p><strong>${label}:</strong> verfügbar ab ${size*2} Tagen mit eingetragenem Bestwert (bisher ${rows.length}).</p>`).join('')}<p>Verglichen werden Tagesbestwerte derselben Jonglierart. Fehlende Einträge zählen nicht als null. Die Zeiträume richten sich nach den erfassten Tagen und sind unabhängig vom Diagrammzeitraum.</p><p>Steigend oder fallend ab 10 % und mindestens 3 Kontakten Unterschied; sonst etwa gleich. Bei einem Ausgangswert von null wird die Veränderung in Kontakten angezeigt.</p></div></details>${stale?`<p class="record-trend-stamp">Stand: ${day(last.date)}</p>`:''}`;
}

