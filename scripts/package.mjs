import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const c=JSON.parse(fs.readFileSync(path.join(root,'scripts/release-contract.json'),'utf8'));
const outDir=path.join(root,'release-output');
const read=(file)=>fs.readFileSync(path.join(root,file));
const files=c.sources;
function crc32(data){
  let x=0xffffffff;
  for(const b of data){x^=b;for(let i=0;i<8;i++)x=(x>>>1)^((x&1)?0xedb88320:0);}
  return (x^0xffffffff)>>>0;
}
function archive(entries){
  const locals=[], central=[];let offset=0;
  // Constant date and entry order ensure byte-for-byte reproducibility.
  for(const name of entries){
    if(!Object.hasOwn(files,name))throw Error('Unexpected release entry: '+name);
    const filename=Buffer.from(name,'utf8'), raw=read(files[name]);
    const payload=zlib.deflateRawSync(raw,{level:9});
    const crc=crc32(raw),flags=0x800,method=8;
    const local=Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);
    local.writeUInt16LE(flags,6);local.writeUInt16LE(method,8);
    local.writeUInt16LE(0,10);local.writeUInt16LE(0x21,12);
    local.writeUInt32LE(crc,14);local.writeUInt32LE(payload.length,18);
    local.writeUInt32LE(raw.length,22);local.writeUInt16LE(filename.length,26);
    const cd=Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50,0);cd.writeUInt16LE(20,4);cd.writeUInt16LE(20,6);
    cd.writeUInt16LE(flags,8);cd.writeUInt16LE(method,10);
    cd.writeUInt16LE(0,12);cd.writeUInt16LE(0x21,14);
    cd.writeUInt32LE(crc,16);cd.writeUInt32LE(payload.length,20);
    cd.writeUInt32LE(raw.length,24);cd.writeUInt16LE(filename.length,28);
    cd.writeUInt32LE(0,38);cd.writeUInt32LE(offset,42);
    locals.push(local,filename,payload);central.push(cd,filename);
    offset+=local.length+filename.length+payload.length;
  }
  const centralLen=central.reduce((n,b)=>n+b.length,0);
  const end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50,0);
  end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);
  end.writeUInt32LE(centralLen,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...locals,...central,end]);
}
fs.mkdirSync(outDir,{recursive:true});
const entries=c.entries;
if(entries.length!==new Set(entries).size)throw Error('Duplicate release entries');
const output=path.join(outDir,c.package);
fs.writeFileSync(output,archive(entries));
const digests=entries.filter(n=>n.startsWith('src/')).map(name=>crypto.createHash('sha256').update(read(files[name])).digest('hex'));
console.log(`Install: ${output} (${entries.length} files; executable SHA-256: ${digests.map(s=>s.slice(0,12)).join(' ')})`);
await import('./verify-package.mjs');
