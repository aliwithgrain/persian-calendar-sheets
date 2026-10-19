import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';

function setup() {
  const cells=new Map();const tabs=[];let active=null;const messages=[];
  const key=(r,c)=>r+':'+c;
  class Sheet {
    constructor(name,id) {this.name=name;this.id=id;this.cells=new Map();this.meta=[];this.failMetadata=false;this.rows=1000;this.columns=20;this.denied=new Set();this.failWriteAt=null;this.failFormatAt=null;this.formats=0;this.writes=0;this.permissionChecks=0;this.protectionChecks=0;this.formatReads=0;this.gridReads=0;this.metadataFinds=0;this.formatBatchCalls=0;this.protections={RANGE:[],SHEET:[]};}
    cell(r,c){let v=this.cells.get(key(r,c));if(!v){v={value:'',format:'General',formula:'',validation:null};this.cells.set(key(r,c),v);}return v;}
    getRange(...args){
      if(typeof args[0]==='string') {
        const match=/^([A-Z]+)(\d+)$/.exec(args[0]);
        let col=0;for(const c of match[1])col=col*26+c.charCodeAt(0)-64;
        return new Range(this,Number(match[2]),col,1,1);
      }
      return new Range(this,args[0],args[1],args[2]||1,args[3]||1);
    }
    getLastRow(){let max=0;for(const [k,v] of this.cells){if(v.value!==''||v.formula)max=Math.max(max,Number(k.split(':')[0]));}return max;}
    getLastColumn(){let max=0;for(const [k,v] of this.cells){if(v.value!==''||v.formula)max=Math.max(max,Number(k.split(':')[1]));}return max;}
    getRangeList(notations){
      const sheet=this;
      return {setNumberFormat(fmt){
        sheet.formatBatchCalls++;
        for(const a1 of notations){
          const m=/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(a1);
          if(!m) throw new Error('Bad test range: '+a1);
          let c1=0,c2=0;for(const ch of m[1])c1=c1*26+ch.charCodeAt(0)-64;
          for(const ch of m[3])c2=c2*26+ch.charCodeAt(0)-64;
          for(let r=Number(m[2]);r<=Number(m[4]);r++)for(let c=c1;c<=c2;c++)sheet.cell(r,c).format=fmt;
        }
      }};
    }
    getSheetId(){return this.id;}
    getName(){return this.name;}
    getMaxRows(){return this.rows;}
    getMaxColumns(){return this.columns;}
    getProtections(type){this.protectionChecks++;return this.protections[type]||[];}
    hideSheet(){this.hidden=true;}
    clearContents(){for(const x of this.cells.values())x.value='';}
    insertRowsAfter(_,num){this.rows+=num;}
    createDeveloperMetadataFinder(){return {withKey:field=>({find:()=>{this.metadataFinds++;return this.meta.filter(x=>x.getKey()===field);}})};}
  }
  class Range {
    constructor(sheet,r,c,n,m){this.sheet=sheet;this.r=r;this.c=c;this.n=n;this.m=m;}
    getSheet(){return this.sheet;}getRow(){return this.r;}getColumn(){return this.c;}
    getLastRow(){return this.r+this.n-1;}getLastColumn(){return this.c+this.m-1;}
    getNumRows(){return this.n;}getNumColumns(){return this.m;}
    getA1Notation(){return String.fromCharCode(64+this.c)+this.r;}
    getValue(){return this.sheet.cell(this.r,this.c).value;}
    getDisplayValue(){return String(this.getValue());}
    getFormula(){return this.sheet.cell(this.r,this.c).formula;}
    getNumberFormat(){return this.sheet.cell(this.r,this.c).format;}
    getDataValidation(){return this.sheet.cell(this.r,this.c).validation;}
    getMergedRanges(){return [];}
    getValues(){this.sheet.gridReads++;return Array.from({length:this.n},(_,i)=>Array.from({length:this.m},(_,j)=>this.sheet.cell(this.r+i,this.c+j).value));}
    getDisplayValues(){return this.getValues().map(row=>row.map(String));}
    getFormulas(){return Array.from({length:this.n},(_,i)=>Array.from({length:this.m},(_,j)=>this.sheet.cell(this.r+i,this.c+j).formula));}
    getNumberFormats(){this.sheet.formatReads++;return Array.from({length:this.n},(_,i)=>Array.from({length:this.m},(_,j)=>this.sheet.cell(this.r+i,this.c+j).format));}
    getDataValidations(){return Array.from({length:this.n},(_,i)=>Array.from({length:this.m},(_,j)=>this.sheet.cell(this.r+i,this.c+j).validation));}
    setNumberFormat(fmt){this.sheet.formats++;if(this.sheet.failFormatAt===this.sheet.formats)throw new Error('injected format failure');for(let r=this.r;r<this.r+this.n;r++)for(let c=this.c;c<this.c+this.m;c++)this.sheet.cell(r,c).format=fmt;return this;}
    setNumberFormats(matrix){for(let i=0;i<this.n;i++)for(let j=0;j<this.m;j++)this.sheet.cell(this.r+i,this.c+j).format=matrix[i][j];return this;}
    setValue(val){this.sheet.cell(this.r,this.c).value=val;return this;}
    setValues(matrix){this.sheet.writes++;if(this.sheet.failWriteAt===this.sheet.writes) throw new Error('injected write failure');for(let i=0;i<this.n;i++)for(let j=0;j<this.m;j++)this.sheet.cell(this.r+i,this.c+j).value=matrix[i][j];return this;}
    canEdit(){this.sheet.permissionChecks++;for(let i=0;i<this.n;i++)for(let j=0;j<this.m;j++)if(this.sheet.denied.has((this.r+i)+':'+(this.c+j)))return false;return true;}
    addDeveloperMetadata(k,v){if(this.sheet.failMetadata) throw new Error('injected metadata failure');const sheet=this.sheet,column=this.c;this.sheet.meta.push({getKey:()=>k,getLocation:()=>({getColumn:()=>({getColumn:()=>column})}),remove(){sheet.meta=sheet.meta.filter(x=>x!==this);}});}
  }
  const spreadsheet={
    getActiveSheet:()=>active,getSheetByName:name=>tabs.find(t=>t.name===name),
    getSheetById:id=>tabs.find(t=>t.id===id),
    getSpreadsheetTimeZone:()=>'Asia/Tehran',
    getSelection:()=>({getActiveRangeList:()=>({getRanges:()=>[active.getRange(1,1,6,3)]}),getCurrentCell:()=>active.getRange(2,1)}),
    insertSheet:name=>{const s=new Sheet(name,tabs.length+11);tabs.push(s);return s;},
    toast:(message)=>messages.push(message)
  };
  const props=new Map();let settingsReadCount=0;const object={
    getProperty:k=>{if(k==='pc_settings_v3')settingsReadCount++;return props.get(k)||null;},setProperty:(k,v)=>props.set(k,v),deleteProperty:k=>props.delete(k)
  };
  const locks={held:false,denied:false,acquires:0,releases:0};
  const ctx=vm.createContext({Date,Intl,console,Map,Set,JSON,String,Number,Object,Math,
    SpreadsheetApp:{getActiveSpreadsheet:()=>spreadsheet,flush:()=>{},ProtectionType:{RANGE:'RANGE',SHEET:'SHEET'}},
    LockService:{getDocumentLock:()=>({tryLock:()=>{locks.acquires++;if(locks.denied||locks.held)return false;locks.held=true;return true;},releaseLock:()=>{locks.held=false;locks.releases++;}})},
    PropertiesService:{getDocumentProperties:()=>object},
    Utilities:{getUuid:()=> 'uuid-test',formatDate:()=> '2026-10-18 00:00:00'}});
  vm.runInContext(fs.readFileSync('dist/Code.gs','utf8'),ctx);
  active=new Sheet('Data',1);tabs.push(active);
  return {ctx,active,spreadsheet,messages,locks,settingsReadCount:()=>settingsReadCount};
}

test('SAFE-01: conversion does not create, clear or read hidden backup',()=>{
 const {ctx,active,spreadsheet}=setup();
 const old=spreadsheet.insertSheet('__PC_v3_Last_Conversion');
 old.getRange(1,1).setValue('PERSIAN_CALENDAR_BACKUP_V3');
 old.getRange(2,1).setValue('precious-old-snapshot');
 const originalLookup=spreadsheet.getSheetByName;
 spreadsheet.getSheetByName=()=>{throw new Error('Hidden backup unexpectedly accessed');};
 active.getRange(2,1).setValue('Wednesday,28 May 2025');
 active.getRange(3,1).setValue('monday,16 december 2024');
 active.getRange(4,1).setValue('03/04/2026');
 active.getRange(5,1).setValue('۱۴۰۵/۰۷/۲۶');
 active.getRange(6,1).setValue('Thursday,13 November 2025');
 active.getRange(3,2).setValue('Important text');
 active.getRange(4,2).setValue('=NOW()');active.cell(4,2).formula='=NOW()';
 active.getRange(5,2).setValue(true);active.cell(5,2).validation={kind:'CHECKBOX'};
 ctx.pcConvertSelection();
 assert.equal(active.getRange(2,1).getValue(),'۱۴۰۴/۰۳/۰۷');
 assert.equal(active.getRange(3,1).getValue(),'۱۴۰۳/۰۹/۲۶');
 assert.equal(active.getRange(4,1).getValue(),'03/04/2026');
 assert.equal(active.getRange(6,1).getValue(),'۱۴۰۴/۰۸/۲۲');
 assert.equal(active.getRange(3,2).getValue(),'Important text');
 assert.equal(active.getRange(4,2).getValue(),'=NOW()');
 assert.equal(active.getRange(5,2).getValue(),true);
 assert.equal(old.getRange(2,1).getValue(),'precious-old-snapshot');
 assert.equal(ctx.pcGetSettingsState().backup,undefined);
 assert.equal(typeof ctx.pcRestoreLatest,'undefined');
 spreadsheet.getSheetByName=originalLookup;
});

test('SAFE-02: injected write failure reports partial, never false success',()=>{
 const {ctx,active,messages}=setup();
 active.getRange(2,1).setValue('2026/10/18');
 active.getRange(4,1).setValue('Wednesday,28 May 2025');
 active.getRange(3,2).setValue('untouched');
 active.failWriteAt=2;
 ctx.pcConvertSelection();
 assert.equal(active.getRange(2,1).getValue(),'۱۴۰۵/۰۷/۲۶');
 assert.equal(active.getRange(4,1).getValue(),'Wednesday,28 May 2025');
 assert.equal(active.getRange(3,2).getValue(),'untouched');
 assert.match(messages.at(-1),/تبدیل ناقص یا نامطمئن/);
 assert.match(messages.at(-1),/1 از 2/);
 assert.doesNotMatch(messages.at(-1),/۲ تبدیل.*تغییر/);
});

test('SAFE-02: preflight permission denial prevents all writes',()=>{
 const {ctx,active,messages}=setup();
 active.getRange(2,1).setValue('2026/10/18');
 active.getRange(3,1).setValue('28 May 2025');
 active.denied.add('3:1');
 ctx.pcConvertSelection();
 assert.equal(active.getRange(2,1).getValue(),'2026/10/18');
 assert.equal(active.getRange(3,1).getValue(),'28 May 2025');
 assert.equal(active.writes,0); // converter performs no writes
 assert.match(messages.at(-1),/خطا/);
});

test('PERF-01: 800-row vertical dates write as one rectangle',()=>{
 const {ctx,active}=setup();
 const data=Array.from({length:800},()=>({text:'۱۴۰۵/۰۷/۲۶'}));
 const changes=data.map((d,i)=>({row:i+1,col:5,text:d.text}));
 active.writes=0;
 assert.equal(ctx.pcWriteRuns_(active,changes),800);
 assert.equal(active.writes,1);
 assert.equal(active.getRange(800,5).getValue(),'۱۴۰۵/۰۷/۲۶');
});

test('PERF-01: irregular positions do not overwrite gaps or text',()=>{
 const {ctx,active}=setup();
 active.getRange(2,2).setValue('PRESERVE GAP');
 active.getRange(4,1).setValue('PRESERVE ROW');
 const changes=[
  {row:1,col:1,text:'a'},{row:1,col:2,text:'b'},
  {row:2,col:1,text:'c'},{row:3,col:1,text:'d'},
  {row:3,col:2,text:'e'}, {row:5,col:1,text:'f'}];
 active.writes=0;
 assert.equal(ctx.pcWriteRuns_(active,changes),6);
 assert.equal(active.getRange(2,2).getValue(),'PRESERVE GAP');
 assert.equal(active.getRange(4,1).getValue(),'PRESERVE ROW');
 assert.equal(active.getRange(5,1).getValue(),'f');
 assert.ok(active.writes<6);
 const positions=ctx.pcWriteRectangles_(changes);
 assert.equal(positions.reduce((n,x)=>n+x.rows.length*x.rows[0].length,0),6);
});

test('PERF-02: exact range preflight uses few permission checks and no format reads',()=>{
 const {ctx,active,spreadsheet}=setup();
 for(let i=1;i<=150;i++)active.getRange(i,1).setValue('2026/10/18');
 spreadsheet.getSelection=()=>({getActiveRangeList:()=>({getRanges:()=>[active.getRange(1,1,150,1)]}),getCurrentCell:()=>active.getRange(2,1)});
 ctx.pcConvertSelection();
 assert.equal(active.permissionChecks,1);
 assert.equal(active.protectionChecks,2);
 assert.equal(active.formatReads,1); // safe rollback requires original formats for each write rectangle
 assert.equal(active.getRange(150,1).getValue(),'۱۴۰۵/۰۷/۲۶');
});

test('PERF-02: protections and unrelated cells remain unaffected',()=>{
 const {ctx,active}=setup();
 active.getRange(2,1).setValue('2026/10/18');
 active.getRange(2,2).setValue('KEEP');
 active.getRange(3,1).setValue('2026/10/18');
 active.denied.add('3:1');
 ctx.pcConvertSelection();
 assert.equal(active.getRange(2,1).getValue(),'2026/10/18');
 assert.equal(active.getRange(3,1).getValue(),'2026/10/18');
 assert.equal(active.getRange(2,2).getValue(),'KEEP');
});

test('Automatic onEdit conversion acts only on marked columns for paste, and respects validation',()=>{
 const {ctx,active,spreadsheet}=setup();
 active.getRange(1,1,1000,1).addDeveloperMetadata('PERSIAN_CALENDAR_DATE_COLUMN_V3','v3');
 active.getRange(2,1).setValue('Wednesday,28 May 2025');
 active.getRange(3,1).setValue('2026/10/18');
 active.getRange(2,2).setValue('2026/10/18');
 const selection=active.getRange(2,1,2,2);
 ctx.onEdit({range:selection,source:spreadsheet});
 assert.equal(active.getRange(2,1).getValue(),'۱۴۰۴/۰۳/۰۷');
 assert.equal(active.getRange(3,1).getValue(),'۱۴۰۵/۰۷/۲۶');
 assert.equal(active.getRange(2,2).getValue(),'2026/10/18');
 active.getRange(4,1).setValue('2026/10/18');active.cell(4,1).validation={kind:'CHECKBOX'};
 ctx.onEdit({range:active.getRange(4,1),source:spreadsheet,value:'2026/10/18'});
 assert.equal(active.getRange(4,1).getValue(),'2026/10/18');
});


test('PERF-03: unrelated edits never fetch settings or cell grids',()=>{
 const {ctx,active,spreadsheet,settingsReadCount}=setup();
 active.getRange(1,1,1000,1).addDeveloperMetadata('PERSIAN_CALENDAR_DATE_COLUMN_V3','v3');
 active.getRange(2,5).setValue('not a date');
 const before=settingsReadCount();
 ctx.onEdit({range:active.getRange(2,5),source:spreadsheet,value:'not a date'});
 assert.equal(settingsReadCount(),before);
 assert.equal(active.gridReads,0);
 assert.equal(active.getRange(2,5).getValue(),'not a date');
 const meta=active.metadataFinds;
 ctx.onEdit({range:active.getRange(1,1,4000,1),source:spreadsheet});
 assert.equal(active.metadataFinds,meta); // oversized edit short-circuits even metadata lookup
});

test('PERF-03: wide paste reads only relevant marked column',()=>{
 const {ctx,active,spreadsheet}=setup();
 active.getRange(1,1,1000,1).addDeveloperMetadata('PERSIAN_CALENDAR_DATE_COLUMN_V3','v3');
 active.getRange(2,1).setValue('2026/10/18');
 active.getRange(2,15).setValue('KEEP');
 ctx.onEdit({range:active.getRange(2,1,1,15),source:spreadsheet});
 assert.equal(active.getRange(2,1).getValue(),'۱۴۰۵/۰۷/۲۶');
 assert.equal(active.getRange(2,15).getValue(),'KEEP');
});

test('legacy registered column indexes migrate to developer metadata',()=>{
 const {ctx,active}=setup();
 ctx.PropertiesService.getDocumentProperties().setProperty('jalali_cols_1','1,2');
 assert.deepEqual(Array.from(ctx.pcRegisteredColumns_(active)),[1,2]);
 assert.equal(ctx.PropertiesService.getDocumentProperties().getProperty('jalali_cols_1'),null);
 active.getRange(3,2).setValue('2026/10/18');
 ctx.onEdit({range:active.getRange(3,2),value:'2026/10/18'});
 assert.equal(active.getRange(3,2).getValue(),'۱۴۰۵/۰۷/۲۶');
});

test('repeat conversion is idempotent without snapshots',()=>{
 const {ctx,active}=setup();
 active.getRange(2,1).setValue('Wednesday,28 May 2025');
 ctx.pcConvertSelection();
 ctx.pcConvertSelection();
 assert.equal(active.getRange(2,1).getValue(),'۱۴۰۴/۰۳/۰۷');
});

test('PERF-04: alternating populated cells use batched format without touching data',()=>{
 const {ctx,active,spreadsheet}=setup();
 active.rows=4000;
 for(let i=1;i<=3000;i+=2){
   active.getRange(i,1).setValue('KEEP').setNumberFormat('yyyy-mm-dd');
 }
 spreadsheet.getSelection=()=>({getActiveRangeList:()=>({getRanges:()=>[active.getRange(1,1,1,1)]}),getCurrentCell:()=>active.getRange(2,1)});
 ctx.pcMarkColumns();
 assert.equal(active.cell(1,1).value,'KEEP');
 assert.equal(active.cell(1,1).format,'yyyy-mm-dd');
 assert.equal(active.cell(2,1).format,'@');
 assert.equal(active.cell(3000,1).format,'@');
 assert.equal(active.cell(4000,1).format,'@');
 assert.ok(active.formatBatchCalls<=8,'expected 1500+ runs in max eight RangeList calls');
 assert.equal(ctx.pcColumnA1_(28),'AB');
});

test('automatic date column setup formats only blanks, never existing values',()=>{
 const {ctx,active}=setup();
 active.getRange(1,1).setValue('عنوان');
 active.getRange(2,1).setNumberFormat('yyyy-mm-dd').setValue('Wednesday,28 May 2025');
 active.getRange(3,1).setValue('');
 ctx.pcMarkColumns();
 assert.equal(active.getRange(2,1).getNumberFormat(),'yyyy-mm-dd');
 assert.equal(active.getRange(2,1).getValue(),'Wednesday,28 May 2025');
 assert.equal(active.getRange(3,1).getNumberFormat(),'@');
 assert.deepEqual(Array.from(ctx.pcRegisteredColumns_(active)),[1,2,3]);
});


test('FIX-01: sheet protections preserve editable exceptions but block surrounding cells',()=>{
 const {ctx,active}=setup();
 active.protections.SHEET=[{canEdit:()=>false,getUnprotectedRanges:()=>[active.getRange(2,2,2,1)]}];
 const blocks=ctx.pcProtectionBlocks_(active);
 assert.equal(ctx.pcIsBlocked_(2,2,blocks),false);
 assert.equal(ctx.pcIsBlocked_(3,2,blocks),false);
 assert.equal(ctx.pcIsBlocked_(1,2,blocks),true);
 assert.equal(ctx.pcIsBlocked_(2,1,blocks),true);
 active.protections.RANGE=[{canEdit:()=>false,getRange:()=>active.getRange(3,2)}];
 const combined=ctx.pcProtectionBlocks_(active);
 assert.equal(ctx.pcIsBlocked_(2,2,combined),false);
 assert.equal(ctx.pcIsBlocked_(3,2,combined),true);
});

test('FIX-01: conversions touch unprotected exceptions only',()=>{
 const {ctx,active}=setup();
 active.protections.SHEET=[{canEdit:()=>false,getUnprotectedRanges:()=>[active.getRange(2,2)]}];
 active.getRange(2,1).setValue('2026/10/18');
 active.getRange(2,2).setValue('2026/10/18');
 ctx.pcConvertSelection();
 assert.equal(active.getRange(2,1).getValue(),'2026/10/18');
 assert.equal(active.getRange(2,2).getValue(),'۱۴۰۵/۰۷/۲۶');
});


test('FIX-03: failed data write restores original cell format without changing data',()=>{
 const {ctx,active}=setup();
 active.getRange(2,1).setValue('2026/10/18').setNumberFormat('yyyy-mm-dd');
 active.failWriteAt=1;
 assert.throws(()=>ctx.pcWriteRuns_(active,[{row:2,col:1,text:'۱۴۰۵/۰۷/۲۶'}]),/قالب اولیه بازیابی شد/);
 assert.equal(active.cell(2,1).format,'yyyy-mm-dd');
 assert.equal(active.cell(2,1).value,'2026/10/18');
});

test('FIX-03: a formatting failure preserves original content and format',()=>{
 const {ctx,active}=setup();
 active.getRange(2,1).setValue('2026/10/18').setNumberFormat('yyyy-mm-dd');
 active.failFormatAt=active.formats+1;
 assert.throws(()=>ctx.pcWriteRuns_(active,[{row:2,col:1,text:'۱۴۰۵/۰۷/۲۶'}]));
 assert.equal(active.cell(2,1).format,'yyyy-mm-dd');
 assert.equal(active.cell(2,1).value,'2026/10/18');
});


test('FIX-04: stale values are rejected before formatting or overwriting',()=>{
 const {ctx,active}=setup();
 active.getRange(2,1).setValue('Newer user edit').setNumberFormat('General');
 assert.throws(()=>ctx.pcWriteRuns_(active,[{row:2,col:1,original:'Old user edit',text:'۱۴۰۵/۰۷/۲۶'}]),/مقدار سلول از زمان خواندن تغییر کرده/);
 assert.equal(active.getRange(2,1).getValue(),'Newer user edit');
 assert.equal(active.getRange(2,1).getNumberFormat(),'General');
});

test('FIX-04: onEdit skips while the document lock is held, and releases it on success',()=>{
 const {ctx,active,spreadsheet,locks}=setup();
 active.getRange(1,1,1000,1).addDeveloperMetadata('PERSIAN_CALENDAR_DATE_COLUMN_V3','v3');
 active.getRange(2,1).setValue('2026/10/18');
 locks.denied=true;
 ctx.onEdit({range:active.getRange(2,1),source:spreadsheet,value:'2026/10/18'});
 assert.equal(active.getRange(2,1).getValue(),'2026/10/18');
 locks.denied=false;
 ctx.onEdit({range:active.getRange(2,1),source:spreadsheet,value:'2026/10/18'});
 assert.equal(active.getRange(2,1).getValue(),'۱۴۰۵/۰۷/۲۶');
 assert.equal(locks.held,false);
 assert.equal(locks.releases,1);
});


test('FIX-05: oversized paste provides visible fallback guidance',()=>{
 const {ctx,active,spreadsheet,messages}=setup();
 ctx.onEdit({range:active.getRange(1,1,3001,1),source:spreadsheet});
 assert.match(messages.at(-1),/Convert Selection/);
 assert.equal(active.writes,0);
});

test('FIX-05: trigger write failures are visible and do not report success',()=>{
 const {ctx,active,spreadsheet,messages}=setup();
 active.getRange(1,1,1000,1).addDeveloperMetadata('PERSIAN_CALENDAR_DATE_COLUMN_V3','v3');
 active.getRange(2,1).setValue('2026/10/18');
 active.failWriteAt=1;
 ctx.onEdit({range:active.getRange(2,1),source:spreadsheet,value:'2026/10/18'});
 assert.match(messages.at(-1),/Convert Selection/);
 assert.equal(active.getRange(2,1).getValue(),'2026/10/18');
});


test('FIX-06: a long unrelated column does not prevent preparation of a short date column',()=>{
 const {ctx,active,spreadsheet,messages}=setup();
 active.rows=12000;
 active.getRange(11000,2).setValue('unrelated');
 spreadsheet.getSelection=()=>({getActiveRangeList:()=>({getRanges:()=>[active.getRange(1,1)]})});
 ctx.pcMarkColumns();
 assert.deepEqual(Array.from(ctx.pcRegisteredColumns_(active)),[1]);
 assert.equal(active.getRange(5000,1).getNumberFormat(),'@');
 assert.equal(active.getRange(10001,1).getNumberFormat(),'General');
 assert.match(messages.at(-1),/10000/);
});

test('FIX-06: permission preflight rejects without changing formats or metadata',()=>{
 const {ctx,active,spreadsheet,messages}=setup();
 active.denied.add('2:1');
 spreadsheet.getSelection=()=>({getActiveRangeList:()=>({getRanges:()=>[active.getRange(1,1)]})});
 ctx.pcMarkColumns();
 assert.equal(active.meta.length,0);
 assert.equal(active.getRange(2,1).getNumberFormat(),'General');
 assert.match(messages.at(-1),/خطا/);
});

test('FIX-06: metadata failure does not modify cell formats',()=>{
 const {ctx,active,spreadsheet,messages}=setup();
 active.failMetadata=true;
 spreadsheet.getSelection=()=>({getActiveRangeList:()=>({getRanges:()=>[active.getRange(1,1)]})});
 ctx.pcMarkColumns();
 assert.equal(active.meta.length,0);
 assert.equal(active.getRange(2,1).getNumberFormat(),'General');
 assert.match(messages.at(-1),/خطا/);
});
