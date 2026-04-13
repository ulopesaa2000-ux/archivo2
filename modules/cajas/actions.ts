'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function desactivarCajaAction(cajaId: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('cajas_producto')
    .update({ activo: false })
    .eq('id', cajaId)

  if (error) {
    console.error('Error desactivando caja:', error)
    throw new Error('No se pudo desactivar la caja')
  }

  // Refrescar las rutas afectadas
  revalidatePath('/(admin)/catalogo/[id]', 'page')
  revalidatePath('/(admin)/ordenes-b2b/[id]', 'page')
  revalidatePath('/(admin)/ordenes-b2b/cajas', 'page')
}
