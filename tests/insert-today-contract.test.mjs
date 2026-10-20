import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function mock({canEdit=true,formula='',validation=null,merge=false}={}) {
 const calls=[];const cell={canEdit:()=>canEdit,getFormula:()=>formula,getDataValidation:()=>validation,
   isPartOfMerge:()=>merge,getSheet:()=>({getName:()=> 'گفتگو با عوامل'}),getA1Notation:()=> 'A2',
   setNumberFormat:(v)=>{calls.push(['format',v]);return cell;},
   setValue:(v)=>{calls.push(['value',v]);return cell;}};
 const messages=[];const errors=[];
 const ctx=vm.createContext({
   SpreadsheetApp:{getActiveSpreadsheet:()=>({getSelection:()=>({getCurrentCell:()=>cell})})},
   pcToday_:()=>({y:1405,m:7,d:28}),pcToDay_:()=>123,
   pcSettings_:()=>({format:'numeric',digits:'persian'}),
   pcFormat_:()=> '۱۴۰۵/۰۷/۲۸',pcToast_:(v)=>messages.push(v),
   pcUiError_:(v)=>errors.push(v.message),
 });
 vm.runInContext(fs.readFileSync('src/Code.gs','utf8'),ctx);
 return {ctx,calls,messages,errors};
}
test('SO-08: Insert Today writes Jalali text to selected cell independently of Calendar HTML',()=>{
 const {ctx,calls,messages,errors}=mock();ctx.pcInsertToday();
 assert.deepEqual(calls,[['format','@'],['value','۱۴۰۵/۰۷/۲۸']]);
 assert.match(messages[0],/گفتگو با عوامل!A2/);assert.deepEqual(errors,[]);
});
test('SO-08: locked, formula, validated or merged destination never changes',()=>{
 for(const opts of [{canEdit:false},{formula:'=TODAY()'},{validation:{}},{merge:true}]) {
  const x=mock(opts);x.ctx.pcInsertToday();assert.deepEqual(x.calls,[]);
  assert.equal(x.messages.length,0);assert.equal(x.errors.length,1);
 }
});
