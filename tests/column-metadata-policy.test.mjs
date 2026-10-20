import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync('src/ColumnRegistry.gs','utf8');
test('SO-06: metadata location uses whole-column A1 for single-letter and multi-letter columns',()=>{
 const ranges=[];
 const ctx=vm.createContext({});vm.runInContext(src,ctx);
 const sheet={getRange:(a1)=>{ranges.push(a1);return {a1};}};
 assert.equal(ctx.pcFullColumnRange_(sheet,1).a1,'A:A');
 assert.equal(ctx.pcFullColumnRange_(sheet,11).a1,'K:K');
 assert.equal(ctx.pcFullColumnRange_(sheet,27).a1,'AA:AA');
 assert.deepEqual(ranges,['A:A','K:K','AA:AA']);
});
test('SO-06: initial registration and legacy migration both use full-column helper',()=>{
 assert.match(src,/pcFullColumnRange_\(sheet,idx\)\.addDeveloperMetadata/);
 assert.match(src,/pcFullColumnRange_\(sheet,c\)\.addDeveloperMetadata/);
 assert.doesNotMatch(src,/getRange\(1,\s*(?:idx|c),\s*sheet\.getMaxRows\(\),\s*1\)\.addDeveloperMetadata/);
 assert.match(src,/props\.deleteProperty\(key\)/);
 assert.match(src,/pcRemoveColumn\(column\)/);
});
