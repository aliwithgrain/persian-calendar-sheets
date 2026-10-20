import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function setup({changes=[],stats={converted:0,normalized:0,ambiguous:0}}={}){
 const toasts=[],errors=[],audit=[];
 const sheet={getRange:()=>({canEdit:()=>true,getA1Notation:()=> 'A2'})};
 const ss={getActiveSheet:()=>sheet,getSpreadsheetTimeZone:()=> 'Asia/Tehran'};
 const ctx=vm.createContext({
   SpreadsheetApp:{getActiveSpreadsheet:()=>ss,flush:()=>audit.push('flush')},
   LockService:{getDocumentLock:()=>({tryLock:()=>true,releaseLock:()=>audit.push('release')})},
   pcSelectedRanges_:()=>[{}],pcSettings_:()=>({}),pcProtectionBlocks_:()=>[],
   pcAnalyzeRange_:()=>({changes,stats:{scanned:1,converted:0,normalized:0,already:0,ambiguous:0,invalid:0,datetime:0,skipped:0,formula:0,...stats}}),
   pcWriteRectangles_:(a)=>a.map((x)=>({row:x.row,col:x.col,rows:[[x.text]]})),
   pcWriteRuns_:(_s,list)=>{audit.push('write');return list.length;},
   pcToast_:(m)=>toasts.push(m),pcUiError_:(e)=>errors.push(e.message)
 });
 vm.runInContext(fs.readFileSync('src/ConversionService.gs','utf8'),ctx);
 // The source defines these globals; replace with controlled fakes after loading.
 ctx.pcSelectedRanges_=()=>[{}];
 ctx.pcProtectionBlocks_=()=>[];
 ctx.pcAnalyzeRange_=()=>({changes,stats:{scanned:1,converted:0,normalized:0,already:0,ambiguous:0,invalid:0,datetime:0,skipped:0,formula:0,...stats}});
 ctx.pcWriteRectangles_=(a)=>a.map(x=>({row:x.row,col:x.col,rows:[[x.text]]}));
 ctx.pcWriteRuns_=(_s,list)=>{audit.push('write');return list.length;};
 ctx.pcConvertSelection();return {toasts,errors,audit};
}
test('SO-09: toast includes converted, normalized, ambiguous and actual changed counts',()=>{
 const x=setup({stats:{converted:1,normalized:1,ambiguous:2},changes:[
  {row:2,col:1,text:'۱۴۰۵/۰۷/۲۸'},{row:3,col:1,text:'۱۴۰۵/۰۷/۲۹'}]});
 assert.equal(x.toasts.length,1);
 assert.match(x.toasts[0],/1 تبدیل، 1 یکسان‌سازی، 2 مبهم؛ 2 تغییر/);
 assert.deepEqual(x.audit,['write','flush','release']);assert.deepEqual(x.errors,[]);
});
test('SO-09: no-change case never reports conversion success',()=>{
 const x=setup({stats:{ambiguous:3}});
 assert.match(x.toasts[0],/هیچ تاریخ قابل تبدیلی پیدا نشد/);
 assert.match(x.toasts[0],/3 مورد مبهم/);
 assert.ok(!x.audit.includes('write'));assert.deepEqual(x.errors,[]);
});
