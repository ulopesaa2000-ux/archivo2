// hooks/useConfigEcommerce.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ConfigEcommerce, ModoOperacion, TipoVenta, TipoPrecioVisible } from '@/modules/ecommerce/types'

export function useConfigEcommerce() {
  const [supabase] = useState(() => createClient())
  const [config, setConfig] = useState<ConfigEcommerce | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('config_ecommerce')
        .select('*')
        .eq('id', 1)
        .single()

      if (error) throw error
      setConfig(data as ConfigEcommerce)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando configuración')
      console.error('Error fetching config:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchConfig()

    // Generar un ID de canal único para evitar colisiones entre múltiples instancias del hook o en StrictMode
    const uniqueChannelName = `config_ecommerce_changes_${Math.random().toString(36).substring(2, 10)}`

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'inv-tienda',
          table: 'config_ecommerce',
          filter: 'id=eq.1',
        },
        (payload) => {
          setConfig(payload.new as ConfigEcommerce)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchConfig, supabase])

  // Helpers derivados
  const esCatalogo = config?.modo_operacion === 'catalogo'
  const esEcommerce = config?.modo_operacion === 'ecommerce'
  const esHibrido = config?.modo_operacion === 'hibrido'
  const mostrarPrecios = config?.mostrar_precios ?? false
  const ventaPorCajas = config?.tipo_venta === 'cajas'
  const ventaPorPiezas = config?.tipo_venta === 'piezas'

  return {
    config,
    loading,
    error,
    refresh: fetchConfig,
    // Helpers
    esCatalogo,
    esEcommerce,
    esHibrido,
    mostrarPrecios,
    ventaPorCajas,
    ventaPorPiezas,
  }
}

