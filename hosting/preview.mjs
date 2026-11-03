// Local hosted-adapter preview. Node 22+ supplies the disposable SQLite database.
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import worker from '../dist/server/index.js';
const sql = new DatabaseSync(':memory:');
const journal = JSON.parse(fs.readFileSync('drizzle/meta/_journal.json', 'utf8'));
for (const entry of journal.entries) sql.exec(fs.readFileSync('drizzle/' + entry.tag + '.sql', 'utf8'));
const DB = { prepare(query) { let args = []; return {
  bind(...values) { args = values; return this; },
  async first() { return sql.prepare(query).get(...args) || null; },
  async all() { return { results: sql.prepare(query).all(...args) }; },
  async run() { return { meta: { changes: Number(sql.prepare(query).run(...args).changes) } }; }
}; } };
const port = Number(process.env.PORT || 8005);
http.createServer(async (request, response) => {
  try {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const result = await worker.fetch(new Request('http://127.0.0.1:' + port + request.url, {
      method: request.method, headers: request.headers, ...(body.length ? { body } : {})
    }), { DB });
    response.writeHead(result.status, Object.fromEntries(result.headers));
    response.end(Buffer.from(await result.arrayBuffer()));
  } catch (error) { response.writeHead(500); response.end('Preview error: ' + error.message); }
}).listen(port, '127.0.0.1', () => console.log('Hosted Worker / journal migrations preview http://127.0.0.1:' + port));
