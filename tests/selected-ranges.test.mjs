import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function makeHarness({lastRow=6,lastCol=5, selections=[[1,1,1,1]]}={}) {
 const inspected=[];
 const makeRange=([r,c,h,w])=>({
   getRow:()=>r,getColumn:()=>c,getLastRow:()=>r+h-1,getLastColumn:()=>c+w-1,
   getNumRows:()=>h,getNumColumns:()=>w,
 });
 const sheet={getLastRow:()=>lastRow,getLastColumn:()=>lastCol,
   getRange:(r,c,h,w)=>{inspected.push([r,c,h,w]);return makeRange([r,c,h,w]);}};
 const selection={getActiveRangeList:()=>({getRanges:()=>selections.map(makeRange)})};
 const context=vm.createContext({SpreadsheetApp:{getActiveSpreadsheet:()=>({getActiveSheet:()=>sheet,getSelection:()=>selection})},console});
 vm.runInContext(fs.readFileSync('src/ConversionService.gs','utf8'),context);
 return {context,inspected};
}
test('SO-05: single cell / entire row / column / rectangle clip to populated grid',()=>{
 for(const [sel,expected] of [
   [[[3,2,1,1]],[[3,2,1,1]]],
   [[[4,1,1,18000]],[[4,1,1,5]]],
   [[[1,3,999999,1]],[[1,3,6,1]]],
   [[[2,2,3,3]],[[2,2,3,3]]],
 ]) {
   const x=makeHarness({selections:sel});
   assert.equal(x.context.pcSelectedRanges_().length,1);
   assert.deepEqual(x.inspected,expected);
 }
});
test('SO-05: multiple disjoint selections stay distinct, unused areas ignored',()=>{
 const x=makeHarness({selections:[[1,1,2,2],[4,4,2,2],[100,1,10,3]]});
 assert.equal(x.context.pcSelectedRanges_().length,2);
 assert.deepEqual(x.inspected,[[1,1,2,2],[4,4,2,2]]);
});
test('SO-05: selection scan budget is rejected before range writes',()=>{
 const x=makeHarness({lastRow:1000,lastCol:50,selections:[[1,1,1000,30]]});
 assert.throws(()=>x.context.pcSelectedRanges_(),/25000/);
 assert.deepEqual(x.inspected,[]);
});
test('SO-05: empty sheet yields no ranges rather than editing anything',()=>{
 const x=makeHarness({lastRow:0,lastCol:0,selections:[[1,1,1000,10]]});
 assert.equal(x.context.pcSelectedRanges_().length,0);
 assert.deepEqual(x.inspected,[]);
});
