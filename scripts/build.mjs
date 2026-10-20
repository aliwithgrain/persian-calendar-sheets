import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'src');const dist=path.join(root,'dist');
fs.mkdirSync(dist,{recursive:true});
const ordered=['CalendarCore.gs','DateParser.gs','SettingsService.gs','ColumnRegistry.gs',
  'ConversionService.gs','EditTrigger.gs','Code.gs'];
const code=ordered.map(f=>'// ===== '+f+' =====\n'+fs.readFileSync(path.join(source,f),'utf8')).join('\n\n');
fs.writeFileSync(path.join(dist,'Code.gs'),code);
fs.rmSync(path.join(dist,'Calendar.html'),{force:true});
for(const f of ['Settings.html','appsscript.json']) fs.copyFileSync(path.join(source,f),path.join(dist,f));
console.log(`Built dist/Code.gs (${code.split('\n').length} lines) and UI/manifest files.`);
