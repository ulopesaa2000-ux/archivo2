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

    const fullPath = path.join(
      process.cwd(),
      'docs',
      'capturas',
      'infografias_roles',
      file
    )

    try {
      const buffer = await fs.readFile(fullPath)
      return new NextResponse(buffer, {
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

    try {
      const buffer = await fs.readFile(targetPath)
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${file}"`,
          'Cache-Control': 'private, max-age=300',
        },
      })
    } catch {
      return NextResponse.json({ error: 'Archivo Word no encontrado' }, { status: 404 })
    }
  }

  if (kind === 'media') {
    const storagePath = searchParams.get('path') || ''
    if (!storagePath.startsWith('media/') || storagePath.includes('..')) {
      return NextResponse.json({ error: 'Ruta de media inválida' }, { status: 400 })
    }

    const { supabaseUrl, supabaseServiceRoleKey } = getActiveSupabaseConfig()
    const supabase = supabaseServiceRoleKey
      ? createSupabaseClient<Database, 'inv-tienda'>(
          supabaseUrl,
          supabaseServiceRoleKey,
          {
            auth: { autoRefreshToken: false, persistSession: false },
            db: { schema: 'inv-tienda' },
          }
        )
      : await createClient()

    const { data, error } = await supabase.storage
      .from(DOCS_BUCKET)
      .download(storagePath)

    if (error || !data) {
      return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 })
    }

    const arrayBuffer = await data.arrayBuffer()
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  }

  return NextResponse.json({ error: 'Tipo de recurso no soportado' }, { status: 400 })
}
