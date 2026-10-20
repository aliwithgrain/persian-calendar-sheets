import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const settings=()=>fs.readFileSync('src/Settings.html','utf8');
test('UI-03: Settings uses Vazirmatn and shared visual tokens',()=>{
 const html=settings();
 assert.match(html,/fonts\.googleapis\.com\/css2\?family=Vazirmatn/);
 assert.match(html,/font-family:"Vazirmatn",Tahoma,Arial,sans-serif/);
 for(const key of ['--pc-text','--pc-border','--pc-primary','--pc-gap']) assert.ok(html.includes(key));
 assert.match(html,/button,input,select\{font-family:inherit/);
});
test('UI-04: Settings has bounded frame and natural document scroll',()=>{
 const html=settings();
 assert.match(html,/<body><main class="pc-panel">/);
 assert.match(html,/<\/main>\s*<script>/);
 assert.match(html,/\.pc-panel\{[^}]*border-radius:14px/);
 assert.match(html,/overflow-x:hidden/);
 assert.doesNotMatch(html,/overflow-y:\s*hidden|height:\s*100vh/);
});
test('SO-04: Settings is the only sidebar and retains dirty-state protection',()=>{
 const html=settings();
 assert.doesNotMatch(html,/id="back"|id="discard-back"|pcShowCalendar|بازگشت به تقویم/);
 assert.match(html,/id="dirty-status"[^>]*role="status"/);
 assert.match(html,/function isDirty\(\)/);
 assert.match(html,/\$\('save'\)\.disabled=busy\|\|!dirty/);
 assert.match(html,/for\(const key of settingKeys\)/);
});
test('UI-07: Settings provides accessible feedback near the save button',()=>{
 const html=settings();
 assert.match(html,/class="save-area"><button id="save"[^>]*>ذخیره تنظیمات<\/button><div class="status" id="status"/);
 assert.match(html,/id="column-status" role="status"/);
 assert.match(html,/function report\(t,err,area='status'\)/);
});
test('UI-09: settings groups fields, removes duplicate title, and explains automatic mode without registered columns',()=>{
 const html=settings();
 assert.doesNotMatch(html,/<h1>Persian Calendar · Settings<\/h1>/);
 assert.match(html,/aria-labelledby="display-heading"/);
 assert.match(html,/aria-labelledby="conversion-heading"/);
 assert.match(html,/id="auto-hint"/);
 assert.match(html,/تبدیل خودکار فعال است، اما در این تب ستونی/);
 assert.match(html,/تب هنگام آخرین بازخوانی/);
});
test('QA-01: removing a column does not silently erase unsaved settings',()=>{
 const html=settings();
 assert.match(html,/const draft=isDirty\(\)\?currentSettings\(\):null;show\(d\)/);
 assert.match(html,/if\(draft\)\{for\(const key of settingKeys\)/);
});
test('QA-01: user guides describe verified v1.1 interactions',()=>{
 const help=fs.readFileSync('HELP.md','utf8');
 const guide=fs.readFileSync('release/GUIDE.html','utf8');
 for(const text of ['Convert Selection','Set as Persian Date Column']){
  assert.ok(help.includes(text));assert.ok(guide.includes(text));
 }
 assert.doesNotMatch(guide,/Open Calendar|بازگشت به تقویم/);
});
