import pg from 'pg';
import {Store} from './store.js';
// One authoritative simulation writer. Use Supabase's direct connection or SESSION pooler.
export class PostgresStore extends Store {
 constructor(url,options={}){super('unused');this.db=options.client||new pg.Client({connectionString:url,ssl:options.ssl??{rejectUnauthorized:true},connectionTimeoutMillis:10000,query_timeout:12000});this.failed=false;this.writeFailures=0;this.committed=new Map();this.versions=new Map();}
 async init(){await this.db.connect();this.db.on?.('error',()=>{this.failed=true;this.writeFailures++});const lock=await this.db.query("select pg_try_advisory_lock(748921451) locked");if(!lock.rows[0].locked){await this.db.end();throw Error('Another Chroma writer is active')}
 const {rows}=await this.db.query('select id,data,revision from chroma_private.accounts');for(const row of rows){this.accounts.set(row.id,row.data);this.committed.set(row.id,JSON.stringify(row.data));this.versions.set(row.id,Number(row.revision));if(row.data.usernameKey)this.usernameIndex.set(row.data.usernameKey,row.id)}this.ready=true;return this;}
 persist(){const snapshot=new Map([...this.accounts].map(([id,a])=>[id,JSON.stringify(a)]));
 this.flushChain=this.flushChain.then(async()=>{if(this.failed)throw Error('Storage unavailable');const changes=[...snapshot].filter(([id,data])=>data!==this.committed.get(id));if(!changes.length)return;try{await this.db.query('begin');for(const [id,data]of changes){const version=this.versions.get(id);if(version===undefined)await this.db.query('insert into chroma_private.accounts(id,data) values($1,$2::jsonb)',[id,data]);else{const result=await this.db.query('update chroma_private.accounts set data=$2::jsonb,revision=revision+1,updated_at=now() where id=$1 and revision=$3',[id,data,version]);if(result.rowCount!==1)throw Error('Concurrent account modification')}}await this.db.query('commit');for(const [id,data]of changes){this.committed.set(id,data);this.versions.set(id,(this.versions.get(id)||0)+1)}}catch{try{await this.db.query('rollback')}catch{}this.failed=true;this.writeFailures++;this.accounts=new Map([...this.committed].map(([id,data])=>[id,JSON.parse(data)]));this.usernameIndex=new Map([...this.accounts.values()].filter(a=>a.usernameKey).map(a=>[a.usernameKey,a.id]));throw Error('Account save failed; restart required')}});
 // Observe rejections immediately; flush() still propagates failure to request handlers.
 this.flushChain.catch(()=>{});return this.flushChain;}
 async flush(){await this.flushChain;if(this.failed)throw Error('Storage unavailable')}
 async close(){try{await this.flush()}finally{await this.db.end()}}
}
