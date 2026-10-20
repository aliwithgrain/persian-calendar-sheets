import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const read=n=>fs.readFileSync(n,'utf8');
test('DOC-01: README and DEPLOY match the single release asset',()=>{
  const contract=JSON.parse(read('scripts/release-contract.json'));
  const readme=read('README.md'), deploy=read('DEPLOY.md');
  for(const name of [contract.package]) {
    assert.ok(readme.includes(name),`README missing ${name}`);
    assert.ok(deploy.includes(name),`DEPLOY missing ${name}`);
  }
  assert.match(readme,/\]\(https:\/\/github\.com\/aliwithgrain\/persian-calendar-sheets\/releases\/latest\)/);
  assert.match(deploy,/npm run package/);
  assert.doesNotMatch(deploy,/Release-Notes\.md/);
});
test('DOC-01: all relative markdown links resolve to existing files',()=>{
  for(const file of ['README.md','INSTALL.md','HELP.md','DEPLOY.md']) {
    const content=read(file);
    for(const match of content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      const url=match[1];
      if(/^(https?:|\.\.\/|#)/.test(url))continue;
      assert.ok(fs.existsSync(path.join(path.dirname(file),url)),`${file} has broken link: ${url}`);
    }
  }
});

test('DOC-03: Only one install package is described',()=>{
 const readme=read('README.md'),deploy=read('DEPLOY.md');
 assert.match(readme,/src\//);
 assert.match(readme,/GUIDE\.html/);
 assert.match(deploy,/یک بسته نصب/);
 assert.doesNotMatch(readme,/Full|Lite|\bFull\.zip|\bLite\.zip/);
});

test('SO-11: documentation matches the four-command Settings-only experience',()=>{
 for(const file of ['README.md','INSTALL.md','HELP.md','release/GUIDE.html']){
  const t=read(file);
  assert.doesNotMatch(t,/Open Calendar|Calendar\.html|pcShowCalendar/,file);
  assert.match(t,/Settings/,file);
  assert.match(t,/Convert Selection/,file);
 }
 assert.doesNotMatch(read('README.md'),/<(?:div|style|span)\b/i);
 const guide=read('release/GUIDE.html');
 assert.match(guide,/Vazirmatn/);
 assert.match(read('tests/acceptance-cases.md'),/four approved menu commands/);
});
