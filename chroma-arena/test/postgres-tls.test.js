import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import tls from 'node:tls';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {postgresConfig} from '../server/postgres-config.js';

test('pg cannot override verified TLS through database URL parameters',()=>{
 for(const query of ['sslmode=disable','sslmode=no-verify','ssl=false','sslmode=require&uselibpqcompat=true','sslrootcert=/missing&sslcert=/missing&sslkey=/missing']){
  const config=postgresConfig('postgres://runner:p%40ss@localhost:5432/postgres?'+query,{});
  const client=new pg.Client(config);
  assert.equal(client.ssl.rejectUnauthorized,true);
  assert.equal(client.connectionParameters.password,'p@ss');
  assert.equal(client.connectionParameters.port,5432);
 }
 assert.throws(()=>postgresConfig('invalid-secret',{}),/^Error: Invalid CHROMA_DATABASE_URL$/);
 assert.throws(()=>postgresConfig('postgres://localhost/db',{CHROMA_DATABASE_CA_FILE:'/missing'}),/Cannot read/);
});

test('database CA validates trusted TLS; untrusted chains and wrong hostnames fail',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'chroma-tls-'));
 let server;
 try{
  const key=join(dir,'key.pem'),cert=join(dir,'cert.pem');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost'],{stdio:'ignore'});
  const configured=postgresConfig('postgres://localhost/db?sslmode=require',{CHROMA_DATABASE_CA_FILE:cert});
  const ssl=new pg.Client(configured).ssl;
  assert.equal(ssl.rejectUnauthorized,true);
  assert.ok(ssl.ca.includes(readFileSync(cert,'utf8')));
  server=tls.createServer({key:readFileSync(key),cert:readFileSync(cert)},socket=>socket.end());
  server.on('tlsClientError',()=>{});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const connect=(options)=>new Promise((resolve,reject)=>{
   const socket=tls.connect({host:'127.0.0.1',port:server.address().port,servername:'localhost',...options});
   socket.once('secureConnect',()=>{const authorized=socket.authorized;socket.destroy();resolve(authorized)});
   socket.once('error',reject);
  });
  assert.equal(await connect(ssl),true);
  await assert.rejects(connect({rejectUnauthorized:true}),/self-signed|self signed/i);
  await assert.rejects(connect({...ssl,servername:'wrong.invalid'}),/Hostname\/IP does not match/);
  writeFileSync(cert,'not a certificate');
  assert.throws(()=>postgresConfig('postgres://localhost/db',{CHROMA_DATABASE_CA_FILE:cert}),/PEM certificates/);
 }finally{
  if(server)await new Promise(resolve=>server.close(resolve));
  rmSync(dir,{recursive:true,force:true});
 }
});
