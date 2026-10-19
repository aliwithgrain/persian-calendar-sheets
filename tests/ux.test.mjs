import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync('src/Calendar.html','utf8');
test('UX-01: Calendar settings shortcut exists but startup only fetches calendar state',()=>{
 assert.match(html,/id="settings"[^>]+aria-label="باز کردن تنظیمات"/);
 assert.match(html,/\$\('settings'\)\.onclick=\(\)=>\{if\(!busy\)call\('pcShowSettings'/);
 assert.match(html,/function refresh\(\).*call\('pcGetCalendarState'/);
 assert.doesNotMatch(html,/function refresh\(\).*pcGetSettingsState/);
});

const settings=fs.readFileSync('src/Settings.html','utf8');
test('UX-02: settings controls have accessible labels and report asynchronous status',()=>{
 for(const id of ['format','digits','ambiguous','automatic']) assert.match(settings,new RegExp('for="'+id+'"'));
 assert.match(settings,/id="status" role="status" aria-live="polite" aria-atomic="true"/);
 assert.match(settings,/setAttribute\('aria-label','لغو ثبت ستون '/);
 assert.match(settings,/document\.querySelectorAll\('button'\)/);
 assert.doesNotMatch(settings,/confirm\s*\(/);
 assert.doesNotMatch(settings,/pcRestoreLatest/);
});
test('UX-02: calendar day buttons support keyboard navigation and RTL semantics',()=>{
 assert.match(html,/lang="fa" dir="rtl"/);
 assert.match(html,/addEventListener\('keydown'/);
 assert.match(html,/ArrowLeft:1,ArrowRight:-1,ArrowDown:7,ArrowUp:-7/);
 assert.match(html,/aria-label/);
});
