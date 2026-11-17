// scripts/supabase/updates/optimize-heavy-pngs.mjs
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'product_images'
const PUBLIC_PREFIX = '/storage/v1/object/public/product_images/'

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx <= 0) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = val
    }
  }
}

async function main() {
  loadEnvLocal()

  const isExecute = process.argv.includes('--execute')
  const limitArg = process.argv.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    db: { schema: 'inv-tienda' },
    auth: { persistSession: false },
  })

  const { data: rows, error } = await supabase
    .from('producto_imagenes')
    .select('id, producto_id, url, es_principal')
    .ilike('url', `${supabaseUrl}${PUBLIC_PREFIX}%.png`)
    .order('id', { ascending: true })

  if (error) {
    throw new Error(`Error consultando producto_imagenes: ${error.message}`)
  }

  const targets = limit ? (rows || []).slice(0, limit) : (rows || [])
  console.log(`[optimize-heavy-pngs] Modo: ${isExecute ? 'EXECUTE' : 'DRY-RUN'} | Encontrados: ${rows?.length ?? 0} | A procesar: ${targets.length}`)

  if (!isExecute) {
    for (const row of targets.slice(0, 10)) {
      console.log(`  - id=${row.id} prod=${row.producto_id} principal=${row.es_principal} url=${row.url}`)
    }
    if (targets.length > 10) {
      console.log(`  ... y ${targets.length - 10} más`)
    }
    return
  }

  let okCount = 0
  let failCount = 0
  let totalBeforeBytes = 0
  let totalAfterBytes = 0
  const report = []

  for (const row of targets) {
    try {
      const idx = row.url.indexOf(PUBLIC_PREFIX)
      if (idx === -1) {
        failCount++
        report.push({ id: row.id, status: 'skip_invalid_url', url: row.url })
        continue
      }

      const oldStoragePath = decodeURIComponent(row.url.slice(idx + PUBLIC_PREFIX.length).split('?')[0])
      const newStoragePath = oldStoragePath.replace(/\.png$/i, '_opt.jpg')

      const res = await fetch(row.url)
      if (!res.ok) {
        failCount++
        report.push({ id: row.id, status: `download_http_${res.status}`, url: row.url })
        continue
      }

      const inputBuf = Buffer.from(await res.arrayBuffer())
      totalBeforeBytes += inputBuf.length

      // JPEG optimizado con fondo blanco para máxima compatibilidad en WhatsApp/OG y tienda
      const optimizedBuf = await sharp(inputBuf)
        .resize({ width: 2048, withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer()

      totalAfterBytes += optimizedBuf.length

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(newStoragePath, optimizedBuf, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadErr) {
        failCount++
        report.push({ id: row.id, status: 'upload_error', error: uploadErr.message, oldStoragePath })
        continue
      }

      const { data: pubData } = supabase.storage.from(BUCKET).getPublicUrl(newStoragePath)
      const newUrl = pubData.publicUrl

      const headRes = await fetch(newUrl, { method: 'HEAD' })
      if (!headRes.ok) {
        failCount++
        report.push({ id: row.id, status: `verify_http_${headRes.status}`, newUrl })
        continue
      }

      const { error: updateErr } = await supabase
        .from('producto_imagenes')
        .update({ url: newUrl })
        .eq('id', row.id)

      if (updateErr) {
        failCount++
        report.push({ id: row.id, status: 'db_update_error', error: updateErr.message, newUrl })
        continue
      }

      okCount++
      report.push({
        id: row.id,
        producto_id: row.producto_id,
        status: 'ok',
        before_kb: Math.round(inputBuf.length / 1024),
        after_kb: Math.round(optimizedBuf.length / 1024),
        oldStoragePath,
        newUrl,
      })
      console.log(`  [OK] id=${row.id}: ${Math.round(inputBuf.length / 1024)} KB -> ${Math.round(optimizedBuf.length / 1024)} KB`)
    } catch (err) {
      failCount++
      report.push({ id: row.id, status: 'exception', error: err?.message || String(err) })
    }
  }

  const scratchDir = path.resolve(process.cwd(), 'scratch')
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true })
  const reportPath = path.join(scratchDir, 'optimize-heavy-pngs-report.json')
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        executed_at: new Date().toISOString(),
        okCount,
        failCount,
        totalBeforeMB: Number((totalBeforeBytes / 1048576).toFixed(2)),
        totalAfterMB: Number((totalAfterBytes / 1048576).toFixed(2)),
        items: report,
      },
      null,
      2
    )
  )

  console.log(`\nResumen: ${okCount} optimizadas, ${failCount} fallidas.`)
  console.log(`Peso total: ${(totalBeforeBytes / 1048576).toFixed(2)} MB -> ${(totalAfterBytes / 1048576).toFixed(2)} MB`)
  console.log(`Reporte guardado en: ${reportPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
