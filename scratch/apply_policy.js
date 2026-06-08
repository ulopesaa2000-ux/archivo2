const http = require('http');

function mcpQuery(sql, id) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      jsonrpc: '2.0', id,
      method: 'tools/call',
      params: { name: 'execute_sql', arguments: { query: sql } }
    });
    const req = http.request({
      hostname: 'localhost', port: 8080, path: '/mcp', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' }
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const r = JSON.parse(data);
          resolve(r.result?.content?.[0]?.text ?? data);
        } catch(e) { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('=== Applying RLS Policy: Super admin gestiona roles ===');
  const sql = `
    CREATE POLICY "Super admin gestiona roles" 
    ON "inv-tienda".roles 
    FOR ALL 
    TO authenticated 
    USING (public.es_super_admin()) 
    WITH CHECK (public.es_super_admin());
  `;
  const result = await mcpQuery(sql, 201);
  console.log(result);

  console.log('\n=== Verifying RLS Policies for roles table ===');
  const verify = await mcpQuery(`
    SELECT tablename, policyname, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'inv-tienda' AND tablename = 'roles';
  `, 202);
  console.log(verify);
}

main().catch(console.error);
