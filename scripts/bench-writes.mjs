import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({console,Date,Intl,Set,Map,Math,Number,Object,String,JSON});
vm.runInContext(fs.readFileSync('dist/Code.gs','utf8'),ctx);
const data=Array.from({length:800},(_,i)=>({row:i+1,col:4,text:'۱۴۰۵/۰۷/۲۶'}));
let setValuesCalls=0;
// Implement the methods used by the current safe-write routine; this benchmark is purely local.
const dummy={getRange(_r,_c,rows,cols){return {
 getValues(){return Array.from({length:rows},()=>Array(cols).fill(''));},
 getNumberFormats(){return Array.from({length:rows},()=>Array(cols).fill('General'));},
 setNumberFormat(){return this;},
 setValues(matrix){setValuesCalls++;if(matrix.length!==rows)throw Error('Incorrect rectangle');return this;}
};}};
const t0=performance.now(); ctx.pcWriteRuns_(dummy,data,false);const t1=performance.now();
console.log(JSON.stringify({scenario:'800 contiguous dates in one column',previousHorizontalOnlyWrites:800,newRectangleWrites:setValuesCalls,localPackingMs:Number((t1-t0).toFixed(3)),note:'This is not a live Google Sheets latency benchmark.'},null,2));
