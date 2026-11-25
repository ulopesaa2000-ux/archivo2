// c:\Users\uriel\Downloads\enero 26\archivo2\app\api\docs\asset\route.ts
import fs from 'node:fs/promises'
import path from 'node:path'
import { NextResponse, type NextRequest } from 'next/server'
import { verifySessionOptional } from '@/lib/dal'
import { isClienteEcommerce } from '@/lib/auth/permissions'
import { createClient } from '@/lib/supabase/server'
import { getActiveSupabaseConfig } from '@/lib/supabase/env'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { DOCS_BUCKET } from '@/lib/docs/types'

const SAFE_PNG_REGEX = /^[a-zA-Z0-9_.-]+\.png$/

const ALLOWED_DOCX_PATHS: Record<string, string> = {
  '01_Guia_Administrador_Productos.docx': path.join(
    process.cwd(),
    'docs',
    'manuales',
    'roles',
    '01_Guia_Administrador_Productos.docx'
  ),
  '02_Guia_Administrador_Inventario.docx': path.join(
    process.cwd(),
    'docs',
    'manuales',
    'roles',
    '02_Guia_Administrador_Inventario.docx'
  ),
  '03_Guia_Administrador_Ecommerce.docx': path.join(
    process.cwd(),
    'docs',
    'manuales',
    'roles',
    '03_Guia_Administrador_Ecommerce.docx'
  ),
  '04_Guia_General_Recorrido_Mercancia.docx': path.join(
    process.cwd(),
    'docs',
    'manuales',
    'recorrido-general',
    '04_Guia_General_Recorrido_Mercancia.docx'
  ),
}

function inferContentType(storagePath: string, blobType?: string): string {
  if (blobType && blobType !== 'application/octet-stream') {
    return blobType
  }
  const ext = storagePath.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'webp':
      return 'image/webp'
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'webm':
      return 'video/webm'
    case 'mp4':
      return 'video/mp4'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    default:
      return 'application/octet-stream'
  }
}

async function getBucketClient() {
  const { supabaseUrl, supabaseServiceRoleKey } = getActiveSupabaseConfig()
  if (supabaseServiceRoleKey) {
    return createSupabaseClient<Database, 'inv-tienda'>(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        db: { schema: 'inv-tienda' },
      }
    )
  }
  return createClient()
}

export async function GET(request: NextRequest) {
  const session = await verifySessionOptional()
  if (!session.isAuth || !session.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  if (isClienteEcommerce(session.user)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const kind = searchParams.get('kind')

  if (kind === 'infografia') {
    const file = searchParams.get('file') || ''
    if (!SAFE_PNG_REGEX.test(file) || file.includes('..')) {
      return NextResponse.json({ error: 'Archivo inválido' }, { status: 400 })
    }

    // 1. Intentar desde el bucket privado (media/infografias/<file>.webp)
    const webpPath = `media/infografias/${file.replace(/\.png$/i, '.webp')}`
    const supabase = await getBucketClient()
    const { data: bucketData } = await supabase.storage
      .from(DOCS_BUCKET)
      .download(webpPath)

    if (bucketData) {
      const arrayBuffer = await bucketData.arrayBuffer()
      return new NextResponse(new Uint8Array(arrayBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'private, max-age=3600',
        },
      })
    }

    // 2. Fallback a archivo local del repositorio
    const fullPath = path.join(
      process.cwd(),
      'docs',
      'capturas',
      'infografias_roles',
      file
    )

    try {
      const buffer = await fs.readFile(fullPath)
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'private, max-age=3600',
        },
      })
    } catch {
      return NextResponse.json({ error: 'Infografía no encontrada' }, { status: 404 })
    }
  }

  if (kind === 'docx') {
    const file = searchParams.get('file') || ''
    const targetPath = ALLOWED_DOCX_PATHS[file]
    if (!targetPath) {
      return NextResponse.json({ error: 'Manual no permitido' }, { status: 404 })
    }

    const docxMime =
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    try {
      const buffer = await fs.readFile(targetPath)
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': docxMime,
          'Content-Disposition': `attachment; filename="${file}"`,
          'Cache-Control': 'private, max-age=300',
        },
      })
    } catch {
      const supabase = await getBucketClient()
      const { data: bucketDocx } = await supabase.storage
        .from(DOCS_BUCKET)
        .download(`word/${file}`)

      if (bucketDocx) {
        const arrayBuffer = await bucketDocx.arrayBuffer()
        return new NextResponse(new Uint8Array(arrayBuffer), {
          status: 200,
          headers: {
            'Content-Type': docxMime,
            'Content-Disposition': `attachment; filename="${file}"`,
            'Cache-Control': 'private, max-age=300',
          },
        })
      }

      return NextResponse.json({ error: 'Archivo Word no encontrado' }, { status: 404 })
    }
  }

  if (kind === 'media') {
    const storagePath = searchParams.get('path') || ''
    if (!storagePath.startsWith('media/') || storagePath.includes('..')) {
      return NextResponse.json({ error: 'Ruta de media inválida' }, { status: 400 })
    }

    const supabase = await getBucketClient()
    const { data, error } = await supabase.storage
      .from(DOCS_BUCKET)
      .download(storagePath)

    if (error || !data) {
      return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 })
    }

    const arrayBuffer = await data.arrayBuffer()
    return new NextResponse(new Uint8Array(arrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': inferContentType(storagePath, data.type),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  }

  return NextResponse.json({ error: 'Tipo de recurso no soportado' }, { status: 400 })
}
