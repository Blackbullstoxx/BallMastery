'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const context={state:{scores:[],colourScores:[]},date:()=> '2026-11-07',esc:String,colourCue:()=>''};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'record-charts.js'),'utf8'),context);
function rows(values,key='toe',start=1){return values.map((value,i)=>({key,value,date:'2026-11-'+String(start+i).padStart(2,'0'),duration:0}))}
const data=rows([48,55,62,78,70]);data.push({...data[1],value:40},{key:'toe',duration:0,date:'2026-10-08',value:200},{key:'toe',duration:0,date:'2026-10-09',value:79},{key:'toe',duration:0,date:'2026-11-08',value:999},...rows([900],'free'),{...data[0],duration:30,value:900});
const series=context.recordSeries(data,'toe',0,0,'2026-11-07'),stats=context.recordJugglingStats('toe',series,'2026-11-07');
assert.equal(stats.best,79);assert.equal(stats.level,50);assert.equal(stats.count,4);
const missing=context.recordJugglingStats('free',context.recordSeries(rows([10,20,30],'free'),'free',0,0,'2026-11-07'),'2026-11-07');assert.equal(missing.level,null);assert.equal(missing.best,30);
const zero=context.recordJugglingStats('toe',context.recordSeries(rows([0,0,0,0,0]),'toe',0,0,'2026-11-07'),'2026-11-07');assert.equal(zero.best,0);assert.equal(zero.level,null);
const old=context.recordJugglingStats('toe',context.recordSeries([{key:'toe',value:100,duration:0,date:'2026-10-08'}],'toe',0,0,'2026-11-07'),'2026-11-07');assert.equal(old.best,null);
assert.equal(context.recordJugglingStats('001',series,'2026-11-07'),null);
context.state.scores=data;context.state.colourScores=data;
const normal=context.recordChartMarkup('toe',0);assert(normal.includes('30-Tage-Bestwert'));assert(normal.includes('50+'));assert(normal.includes('4 von 5'));assert(!context.recordChartMarkup('toe',0,true).includes('30-Tage-Bestwert'));assert(!context.recordChartMarkup('001',30).includes('30-Tage-Bestwert'));assert(!context.recordChartMarkup('touches',0).includes('30-Tage-Bestwert'));
const high=context.recordJugglingStats('free',context.recordSeries(rows([800,900,1000,1200,1400],'free'),'free',0,0,'2026-11-07'),'2026-11-07');assert.equal(high.level,1000);assert.equal(high.count,3);
console.log('PASS: 30-day inclusive boundary, future exclusion, daily maxima, missing days, sparse histories, entered zero, separate techniques/modes/durations, adaptive contact levels');
