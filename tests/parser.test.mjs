import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
const ctx=vm.createContext({Intl,Date,console,Number,String,Object,Set,Map,Math,JSON});
vm.runInContext(fs.readFileSync('dist/Code.gs','utf8'),ctx);
const run=script=>vm.runInContext(script,ctx);
const config={format:'numeric',digits:'persian',ambiguous:'skip'};
const classify=(v,settings=config)=>ctx.pcClassify_(v,String(v),false,settings,'Asia/Tehran',false);

test('all reported input forms and expected conversions',()=>{
 const cases=[
 ['2026/10/18','۱۴۰۵/۰۷/۲۶'],
 ['2026-10-18','۱۴۰۵/۰۷/۲۶'],
 ['Wednesday,28 May 2025','۱۴۰۴/۰۳/۰۷'],
 ['monday,16 december 2024','۱۴۰۳/۰۹/۲۶'],
 ['Monday,14 April 2025','۱۴۰۴/۰۱/۲۵'],
 ['Thursday,13 November 2025','۱۴۰۴/۰۸/۲۲'],
 ['28 May 2025','۱۴۰۴/۰۳/۰۷'],
 ['Sep 28, 2025','۱۴۰۴/۰۷/۰۶'],
 ['۲۰۲۶/۱۰/۱۸','۱۴۰۵/۰۷/۲۶'],
 ['1405/7/26','۱۴۰۵/۰۷/۲۶']
 ];
 for(const [a,b] of cases) assert.equal(classify(a).normalizedText,b,a);
});
test('named weekday must match actual date',()=>{
 assert.equal(classify('Monday,4 May 2025').status,'invalid');
 assert.equal(classify('Sunday,4 May 2025').normalizedText,'۱۴۰۴/۰۲/۱۴');
});
test('skip ambiguous dates unless explicitly configured',()=>{
 assert.equal(classify('03/04/2026').status,'ambiguous');
 assert.equal(classify('03/04/2026',{...config,ambiguous:'dmy'}).normalizedText,'۱۴۰۵/۰۱/۱۴');
 assert.equal(classify('03/04/2026',{...config,ambiguous:'mdy'}).normalizedText,'۱۴۰۴/۱۲/۱۳');
});
test('invalid, time, formula, checkbox, number, prose and idempotency',()=>{
 for(const x of ['2025/02/31','۱۴۰۴/۱۳/۴۰','1404/12/30']) assert.equal(classify(x).status,'invalid',x);
 assert.equal(classify('2026/10/18 14:30').status,'datetime');
 assert.equal(ctx.pcClassify_('2026/10/18','',true,config,'UTC',false).status,'formula');
 assert.equal(ctx.pcClassify_('2026/10/18','',false,config,'UTC',true).status,'checkbox');
 assert.equal(classify(42).status,'other');
 assert.equal(classify('Project update').status,'other');
 assert.equal(classify('۱۴۰۵/۰۷/۲۶').status,'already');
});
test('date range, leap years, reversible conversion and custom functions',()=>{
 for(let y=1200;y<=1599;y+=3)for(let m=1;m<=12;m++) {
  const last=ctx.pcMonthLength_(y,m);
  for(const d of [1,last]) {
   const serial=ctx.pcToDay_(y,m,d);
   const back=ctx.pcParts_(serial);
   assert.deepEqual([back.y,back.m,back.d],[y,m,d]);
  }
 }
 assert.equal(ctx.JALALI_DIFF('۱۴۰۵/۰۷/۲۶','۱۴۰۵/۰۷/۲۸'),2);
 assert.equal(ctx.JALALI_ADD('۱۴۰۵/۰۷/۲۶',10),'۱۴۰۵/۰۸/۰۶');
 assert.equal(ctx.JALALI_ADD('۲۶ مهر ۱۴۰۵',0),'۱۴۰۵/۰۷/۲۶');
 assert.equal(ctx.pcFormat_({y:1405,m:7,d:26},{format:'long',digits:'persian'}),'۲۶ مهر ۱۴۰۵');
});
test('Apps Script Date values distinguish midnight and time',()=>{
 ctx.Utilities={formatDate:(d,tz,pattern)=>'2026-10-18 00:00:00'};
 const val=new Date('2026-10-18T00:00:00.000Z');
 assert.equal(classify(val).normalizedText,'۱۴۰۵/۰۷/۲۶');
 ctx.Utilities={formatDate:()=> '2026-10-18 12:30:00'};
 assert.equal(classify(val).status,'datetime');
});


test('FIX-02: native Date with nonzero milliseconds is not treated as a date-only value',()=>{
 ctx.Utilities={formatDate:()=> '2026-10-18 00:00:00'};
 const dateOnly=new Date('2026-10-18T00:00:00.000Z');
 const subsecond=new Date('2026-10-18T00:00:00.500Z');
 assert.equal(classify(dateOnly).status,'convert');
 assert.equal(classify(subsecond).status,'datetime');
 assert.equal(classify(new Date('2026-10-18T00:00:00.001Z')).status,'datetime');
});
