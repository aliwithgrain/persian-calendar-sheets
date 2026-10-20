import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const settings=fs.readFileSync('src/Settings.html','utf8');
test('UX-02: settings controls have accessible labels and report asynchronous status',()=>{
 for(const id of ['format','digits','ambiguous','automatic']) assert.match(settings,new RegExp('for="'+id+'"'));
 assert.match(settings,/id="status" role="status" aria-live="polite" aria-atomic="true"/);
 assert.match(settings,/setAttribute\('aria-label','لغو ثبت ستون '/);
 assert.match(settings,/document\.querySelectorAll\('button'\)/);
 assert.doesNotMatch(settings,/confirm\s*\(/);
 assert.doesNotMatch(settings,/pcRestoreLatest/);
});
