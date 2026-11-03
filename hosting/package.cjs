'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),archive=path.resolve(root,process.argv[2]||'work/hosted-release.tar.gz');
function run(cmd,args){const r=spawnSync(cmd,args,{cwd:root,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr||r.stdout||cmd+' failed');return r.stdout;}
run(process.execPath,['hosting/test-migrations.cjs']);run(process.execPath,['hosting/build.cjs']);fs.mkdirSync(path.dirname(archive),{recursive:true});
// Sites discovers schema migrations at the archive root, independently of the Worker entrypoint.
run('tar',['-czf',archive,'.openai/hosting.json','dist/server/index.js','dist/.openai/hosting.json','drizzle','dist/drizzle']);
const entries=run('tar',['-tzf',archive]).trim().split('\n');for(const file of ['.openai/hosting.json','dist/server/index.js','drizzle/meta/_journal.json','drizzle/0001_shared_physics.sql'])assert(entries.includes(file),'Missing deployment artifact: '+file);console.log('Validated deployment archive: '+archive);
