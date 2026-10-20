// Standalone verifier for the deterministic ZIP format emitted by package.mjs.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const contract=JSON.parse(fs.readFileSync(path.join(root,'scripts/release-contract.json'),'utf8'));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function crc32(raw){let c=0xffffffff;for(const v of raw){c^=v;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
function readZIP(file){
 const buf=fs.readFileSync(file),data=new Map();let at=0;
 while(at+4<=buf.length && buf.readUInt32LE(at)===0x04034b50){
   const method=buf.readUInt16LE(at+8),checksum=buf.readUInt32LE(at+14),clen=buf.readUInt32LE(at+18),rawLen=buf.readUInt32LE(at+22),nameLen=buf.readUInt16LE(at+26),extraLen=buf.readUInt16LE(at+28);
   const name=buf.subarray(at+30,at+30+nameLen).toString('utf8');
   if(name.includes('..')||name.startsWith('/')||data.has(name))throw Error('Unsafe or duplicate ZIP entry: '+name);
   const begin=at+30+nameLen+extraLen;
   const payload=buf.subarray(begin,begin+clen);
   if(payload.length!==clen)throw Error('Truncated payload: '+name);
   const raw=method===8?zlib.inflateRawSync(payload):method===0?payload:null;
   if(!raw||raw.length!==rawLen||crc32(raw)!==checksum)throw Error('Invalid ZIP payload or CRC: '+name);
   data.set(name,raw);at=begin+clen;
 }
 if(buf.readUInt32LE(at)!==0x02014b50)throw Error('Missing ZIP central directory');
 return data;
}
const filename=path.join(root,'release-output',contract.package);
const files=readZIP(filename);
if(JSON.stringify([...files.keys()].sort())!==JSON.stringify([...contract.entries].sort()))throw Error('Unexpected release entries');
for(const [name,source] of Object.entries(contract.sources)){
 const ref=fs.readFileSync(path.join(root,source));
 if(hash(ref)!==hash(files.get(name)))throw Error('Release file mismatch: '+name);
}
for(const name of ['Code.gs','Settings.html']){
 if(!files.has('src/'+name))throw Error('Missing executable: '+name);
}
const guide=files.get('GUIDE.html').toString('utf8');
if(!/<html lang="fa" dir="rtl">/.test(guide)||/<script\b/i.test(guide))throw Error('Guide invalid');
for(const [,link] of guide.matchAll(/href="([^"]+)"/g)){
 if(/^(https?:|mailto:|#)/.test(link))continue;
 const local=path.posix.normalize(link);
 if(!files.has(local))throw Error('Broken link inside GUIDE.html: '+link);
}
console.log(`Unified package verified: ${files.size} expected files, source checksums and CRC OK`);
