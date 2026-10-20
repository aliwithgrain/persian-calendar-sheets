import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('SO-03: menu exposes exactly four supported commands, in defined order',()=>{
 const items=[];
 const menu={addItem(label,fn){items.push([label,fn]);return this;},addToUi(){return this;}};
 const context=vm.createContext({SpreadsheetApp:{getUi:()=>({createMenu:(label)=>{assert.equal(label,'Persian Calendar');return menu;}})}});
 vm.runInContext(fs.readFileSync('src/Code.gs','utf8'),context);
 context.onOpen();
 assert.deepEqual(items,[['Insert Today','pcInsertToday'],['Convert Selection','pcConvertSelection'],['Set as Persian Date Column','pcMarkColumns'],['Settings','pcShowSettings']]);
});
test('SO-03: no visual calendar files or server UI entry points are shipped',()=>{
 assert.equal(fs.existsSync('src/Calendar.html'),false);
 assert.equal(fs.existsSync('dist/Calendar.html'),false);
 const code=fs.readFileSync('dist/Code.gs','utf8');
 for(const name of ['pcShowCalendar','pcGetCalendarState','pcGetMonth'])assert.doesNotMatch(code,new RegExp('function '+name+'\\('));
 assert.match(code,/function pcWriteDate\(/);
 assert.match(code,/function pcInsertToday\(/);
 assert.ok(fs.existsSync('src/CalendarCore.gs'),'Jalali arithmetic remains available');
});
