import fs from 'node:fs';import vm from 'node:vm';
const gs=fs.readFileSync('dist/Code.gs','utf8');
new vm.Script(gs,{filename:'Code.gs'});
for(const html of ['Settings.html']) {
 const source=fs.readFileSync('dist/'+html,'utf8');
 if(!source.includes('<html')||!source.includes('google.script.run'))throw new Error('Missing HTML functionality: '+html);
 const match=source.match(/<script>([\s\S]*?)<\/script>/i);if(!match)throw new Error('Missing script: '+html);
 new vm.Script(match[1],{filename:html});
}
JSON.parse(fs.readFileSync('dist/appsscript.json','utf8'));
console.log('Syntax checks passed: Code.gs, Settings.html, appsscript.json');
