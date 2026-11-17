import {readFileSync} from 'node:fs';
import {rootCertificates} from 'node:tls';

// Scope the additional Supabase CA to PostgreSQL; never weaken HTTPS/global TLS.
export function postgresConfig(url, env=process.env) {
 let parsed;
 try { parsed=new URL(url); if(!['postgres:','postgresql:'].includes(parsed.protocol))throw Error(); }
 catch { throw Error('Invalid CHROMA_DATABASE_URL'); }
 // pg connection-string SSL options replace the explicit ssl object, including ca.
 for(const key of [...parsed.searchParams.keys()]) {
  if(key.toLowerCase().startsWith('ssl')||key.toLowerCase()==='uselibpqcompat')parsed.searchParams.delete(key);
 }
 const ssl={rejectUnauthorized:true};
 if(env.CHROMA_DATABASE_CA_FILE) {
  let ca;
  try { ca=readFileSync(env.CHROMA_DATABASE_CA_FILE,'utf8'); }
  catch { throw Error('Cannot read CHROMA_DATABASE_CA_FILE'); }
  if(!ca.includes('-----BEGIN CERTIFICATE-----'))throw Error('CHROMA_DATABASE_CA_FILE must contain PEM certificates');
  ssl.ca=[...rootCertificates,ca];
 }
 return {connectionString:parsed.toString(),ssl,connectionTimeoutMillis:10000,query_timeout:12000};
}
