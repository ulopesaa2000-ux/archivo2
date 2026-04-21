const http = require('http');

const sql = `SELECT tgname, pg_get_triggerdef(oid) 
FROM pg_trigger 
WHERE tgname NOT LIKE 'RI_%' AND tgrelid = '"inv-tienda".nota_detalle_productos'::regclass;`;

const payload = JSON.stringify({
  jsonrpc: "2.0",
  id: 18,
  method: "tools/call",
  params: { name: "execute_sql", arguments: { query: sql } }
});

const req = http.request({ hostname: 'localhost', port: 8080, path: '/mcp', method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' } }, res => {
  let data = ''; res.on('data', d => data += d); res.on('end', () => console.log(data));
});
req.write(payload);
req.end();