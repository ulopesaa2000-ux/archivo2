// scripts/n8n/diagnostics/backup_workflows.js
// Respalda TODOS los workflows de n8n (definición completa vía API pública)
// en scripts/backups/n8n_<timestamp>/ antes de cualquier cambio.
// Uso: N8N_PUBLIC_API_KEY=<key> node scripts/n8n/diagnostics/backup_workflows.js
// (si no se define, usa la llave pública ya registrada en el repo, igual que
//  scratch/verify_live_n8n.js y scratch/n8n/diagnostics/check_n8n_executions.js)

const fs = require('fs');
const path = require('path');

const API_BASE = process.env.N8N_API_BASE || 'https://n8n.sistemaindumentaria.com/api/v1';
const API_KEY =
  process.env.N8N_PUBLIC_API_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZmQ1MzZjYy03M2I1LTQyMmQtOWQyOC02NzE4NzIzNzM2ZWIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzg0MDUzNjcwfQ.QfyrrtYrKyfUaPXMnjSJb78Q_D4mUMjN1_fE0pGc4Xg';

async function apiGet(pathname) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    headers: { 'X-N8N-API-KEY': API_KEY, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`${pathname} -> HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function slug(name) {
  return String(name || 'workflow')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .toLowerCase();
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.resolve('scripts/backups', `n8n_${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  const list = await apiGet('/workflows?limit=100');
  const workflows = list.data || [];
  console.log(`Workflows encontrados: ${workflows.length}`);

  const manifest = [];
  for (const w of workflows) {
    const full = await apiGet(`/workflows/${w.id}`);
    const file = `${w.id}_${slug(w.name || w.id)}.json`;
    fs.writeFileSync(path.join(outDir, file), JSON.stringify(full, null, 2));
    manifest.push({ id: w.id, name: w.name, active: w.active, file });
    console.log(`- [${w.active ? 'ACTIVO' : 'inactivo'}] ${w.name} -> ${file}`);
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ fecha: stamp, total: manifest.length, workflows: manifest }, null, 2));
  console.log(`\nRespaldo completo en: ${outDir}`);
}

main().catch((e) => {
  console.error('ERROR respaldo n8n:', e.message);
  process.exit(1);
});
