import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('release/GUIDE.html','utf8');
test('UX-01: single-package guide is Persian RTL, single page, without sidebar or client scripts',()=>{
  assert.match(source,/<html lang="fa" dir="rtl">/);
  assert.match(source,/<meta name="viewport"/);
  assert.match(source,/@media\(max-width:600px\)/);
  assert.match(source,/@media print/);
  assert.doesNotMatch(source,/<script[ >]/i);
  assert.doesNotMatch(source,/<aside[ >]|<nav[ >]/i);
  assert.match(source,/<section id="installation"/);
  assert.match(source,/<section id="usage"/);
});
test('UX-01: Vazir web font has a readable local fallback for offline viewing',()=>{
  assert.match(source,/family=Vazirmatn/);
  assert.match(source,/"Vazirmatn",Tahoma,sans-serif/);
  assert.match(source,/Code\.gs/);
  assert.doesNotMatch(source,/Calendar\.html/);
  assert.match(source,/Settings\.html/);
  assert.match(source,/LICENSE|MIT/);
});
