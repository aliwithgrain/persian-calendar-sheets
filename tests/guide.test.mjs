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
  assert.match(source,/font-face\.css/);
  assert.match(source,/"Vazir",Tahoma,sans-serif/);
  assert.match(source,/Code\.gs/);
  assert.match(source,/Calendar\.html/);
  assert.match(source,/Settings\.html/);
  assert.match(source,/LICENSE|MIT/);
});
test('UX-01: README includes current Calendar screenshot rather than landscape placeholder',()=>{
  const readme=fs.readFileSync('README.md','utf8');
  assert.match(readme,/assets\/screenshots\/calendar\.png/);
  const png=fs.readFileSync('assets/screenshots/calendar.png');
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
  assert.ok(width>250 && width<800 && height>500 && height>width,`Expected portrait Calendar screenshot, got ${width}x${height}`);
  assert.ok(png.byteLength>10_000,'A real screenshot must replace the temporary placeholder');
});
