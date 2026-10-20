import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const c=JSON.parse(fs.readFileSync('scripts/release-contract.json','utf8'));
test('PKG-01: a single installation ZIP holds install-ready files under src',()=>{
 assert.equal(c.version,'1.1.0');
 assert.equal(c.package,'Persian-Calendar-v1.1.0-Install.zip');
 assert.deepEqual(c.entries,['src/Code.gs','src/Settings.html','GUIDE.html','LICENSE']);
 assert.deepEqual(Object.keys(c.sources).sort(),[...c.entries].sort());
 assert.ok(Object.entries(c.sources).filter(([n])=>n.startsWith('src/')).every(([,v])=>v.startsWith('dist/')));
 assert.ok(c.entries.every(n=>!n.startsWith('tests/')&&!n.startsWith('dist/')));
 assert.ok(!c.entries.includes('appsscript.json'));
});
