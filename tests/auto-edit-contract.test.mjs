import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setup({marked=[3],autoConvert=true,editColumn=3,editValue='2026/10/20'}={}) {
 const calls={grid:0,settings:0,writes:0,locks:0,readMeta:0,notice:[],output:[]};
 const target={getRow:()=>2,getColumn:()=>3,getValues:()=>{calls.grid++;return [[editValue]]},
   getDisplayValues:()=>[[editValue]],getFormulas:()=>[['']],getDataValidations:()=>[[null]],getSheet:()=>sheet};
 const sheet={getRange:()=>target};
 const range={getNumRows:()=>1,getNumColumns:()=>1,getColumn:()=>editColumn,
   getLastColumn:()=>editColumn,getRow:()=>2,getSheet:()=>sheet};
 const ctx=vm.createContext({
   console:{warn:()=>{},error:()=>{}},
   SpreadsheetApp:{getActiveSpreadsheet:()=>({getSpreadsheetTimeZone:()=> 'Asia/Tehran'})},
   LockService:{getDocumentLock:()=>({tryLock:()=>{calls.locks++;return true;},releaseLock:()=>{}})},
   pcRegisteredColumns_:()=>{calls.readMeta++;return marked;},
   pcSettings_:()=>{calls.settings++;return {autoConvert};},
   pcBlockedRanges_:()=>[],pcIsBlocked_:()=>false,
   pcClassify_:()=>({status:'convert',normalizedText:'۱۴۰۵/۰۷/۲۸'}),
   pcWriteRuns_:(s,changes)=>{calls.writes++;calls.output=changes;return changes.length;},
 });
 vm.runInContext('const PC_MAX_EDIT_=3000;',ctx);
 vm.runInContext(fs.readFileSync('src/EditTrigger.gs','utf8'),ctx);
 ctx.onEdit({range,source:{getSpreadsheetTimeZone:()=> 'Asia/Tehran',toast:m=>calls.notice.push(m)},value:editValue});
 return calls;
}
test('SO-07: unrelated edits never read settings or grid or write',()=>{
 const x=setup({marked:[3],editColumn:4});
 assert.equal(x.readMeta,1);assert.equal(x.settings,0);assert.equal(x.grid,0);assert.equal(x.writes,0);
});
test('SO-07: disabled auto-convert never reads or changes grid',()=>{
 const x=setup({marked:[3],autoConvert:false});
 assert.equal(x.settings,1);assert.equal(x.grid,0);assert.equal(x.writes,0);
});
test('SO-07: registered column edit converts without any sidebar',()=>{
 const x=setup();
 assert.equal(x.grid,1);assert.equal(x.writes,1);
 assert.equal(x.output[0].text,'۱۴۰۵/۰۷/۲۸');assert.equal(x.locks,1);
});
