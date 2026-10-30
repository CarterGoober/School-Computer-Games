'use strict';
// Runs against an isolated in-memory PostgreSQL database. Never connects to Supabase.
const {PGlite}=require('@electric-sql/pglite'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const db=new PGlite();await db.exec('create role anon; create role authenticated;');
 const sql=fs.readFileSync(__dirname+'/feedback-backend/setup.sql','utf8');await db.exec(sql);await db.exec(sql);
 const client='00000000-0000-4000-8000-000000000001';let n=1;
 const id=()=>`00000000-0000-4000-9000-${String(n++).padStart(12,'0')}`;
 const submit=async(overrides={})=>{const p={id:id(),client,username:'Local tester',game:'basketball',kind:'review',rating:5,title:'A local test',message:'Only in an isolated test database.',website:'',...overrides};return(await db.query('select public.submit_garage_feedback($1,$2,$3,$4,$5,$6,$7,$8,$9) as result',Object.values(p))).rows[0].result;};
 const listing=async()=> (await db.query("select public.list_garage_feedback_v2('all','all',20) as result")).rows[0].result;
 await db.exec('set role anon');assert.equal((await listing()).total,0);
 for(const bad of [{rating:0},{rating:6},{rating:null},{game:'unknown'},{kind:'unknown'},{username:'x'},{title:''},{message:'short'},{website:'spam'}])await assert.rejects(submit(bad));
 const firstId=id(),first=await submit({id:firstId});assert.equal(first.id,firstId);
 assert.equal((await submit({id:firstId})).id,firstId,'same request can retry safely');assert.equal((await listing()).total,1);
 await assert.rejects(submit(),/one minute/);
 for(const action of ['select * from public.garage_feedback',"update public.garage_feedback set visible=false",'delete from public.garage_feedback'])await assert.rejects(db.query(action),/permission denied/);
 await db.exec('reset role');await db.query("update public.garage_feedback set created_at=now()-interval '2 minutes'");await db.exec('set role anon');
 await submit({kind:'bug',rating:null});await db.exec('reset role');await db.exec("update public.garage_feedback set created_at=now()-interval '2 minutes'");await db.exec('set role anon');
 await submit({kind:'idea',rating:null});
 for(let i=0;i<2;i++){await db.exec('reset role');await db.exec("update public.garage_feedback set created_at=now()-interval '2 minutes'");await db.exec('set role anon');await submit();}
 await db.exec('reset role');await db.exec("update public.garage_feedback set created_at=now()-interval '2 minutes'");await db.exec('set role anon');await assert.rejects(submit(),/5 times/);
 let data=await listing();assert.equal(data.total,5);assert.equal(data.rating_count,1,'one rating per browser and game');assert.equal(data.average,5);
 const filtered=(await db.query("select public.list_garage_feedback_v2('basketball','bug',20) as result")).rows[0].result;assert.equal(filtered.entries.length,1);assert.equal(filtered.entries[0].kind,'bug');assert(!('client_id' in filtered.entries[0]));
 await db.exec('reset role');await db.exec('update public.garage_feedback set visible=false');await db.exec('set role anon');data=await listing();assert.equal(data.total,0);assert.equal(data.rating_count,0);await db.close();
 console.log('PASS SQL setup/reapply, anonymous APIs, validation, retries, minute/day limits, permissions, rating deduplication, filters, private client IDs and moderation');
})().catch(e=>{console.error(e);process.exitCode=1;});
