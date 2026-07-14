// hooks/useConfigEcommerce.ts
'use client'

import { useSyncExternalStore } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ConfigEcommerce } from '@/modules/ecommerce/types'

export interface ConfigSnapshot {
  config: ConfigEcommerce | null
  loading: boolean
  error: string | null
}

// Singleton state to share one instance and one subscription globally
let globalConfig: ConfigEcommerce | null = null
let globalLoading = true
let globalError: string | null = null
let isSubscribed = false
let supabaseClient: any = null
let cleanupChannel: (() => void) | null = null

const listeners = new Set<() => void>()

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient()
  }
  return supabaseClient
}

let snapshot: ConfigSnapshot = {
  config: globalConfig,
  loading: globalLoading,
  error: globalError,
}

const serverSnapshot: ConfigSnapshot = {
  config: null,
  loading: true,
  error: null,
}

function updateSnapshot() {
  snapshot = {
    config: globalConfig,
    loading: globalLoading,
    error: globalError,
  }
  for (const listener of listeners) {
    listener()
  }
}

const store = {
  subscribe(listener: () => void) {
    listeners.add(listener)

    if (!isSubscribed) {
      isSubscribed = true
      const supabase = getSupabase()

      const fetchConfig = async () => {
        try {
          const { data, error } = await supabase
            .from('config_ecommerce')
            .select('*')
            .eq('id', 1)
            .single()

          if (error) throw error
          globalConfig = data as ConfigEcommerce
          globalError = null
        } catch (err) {
          globalError = err instanceof Error ? err.message : 'Error cargando configuración'
          console.error('Error fetching config:', err)
        } finally {
          globalLoading = false
          updateSnapshot()
        }
      }

      fetchConfig()

      const uniqueChannelName = `config_ecommerce_changes_${Math.random().toString(36).substring(2, 10)}`
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
          (payload: any) => {
            globalConfig = payload.new as ConfigEcommerce
            updateSnapshot()
          }
        )
        .subscribe()

      cleanupChannel = () => {
        supabase.removeChannel(channel)
      }
    }

    return () => {
      listeners.delete(listener)
      if (listeners.size === 0 && isSubscribed) {
        if (cleanupChannel) {
          cleanupChannel()
          cleanupChannel = null
        }
        isSubscribed = false
      }
    };
  },

  getSnapshot(): ConfigSnapshot {
    return snapshot
  },

  getServerSnapshot(): ConfigSnapshot {
    return serverSnapshot
  }
}

export function useConfigEcommerce() {
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  )

  const refresh = async () => {
    globalLoading = true
    updateSnapshot()
    const supabase = getSupabase()
    try {
      const { data, error } = await supabase
        .from('config_ecommerce')
        .select('*')
        .eq('id', 1)
        .single()
      if (error) throw error
      globalConfig = data as ConfigEcommerce
      globalError = null
    } catch (err) {
      globalError = err instanceof Error ? err.message : 'Error'
    } finally {
      globalLoading = false
      updateSnapshot()
    }
  }

  const esCatalogo = state.config?.modo_operacion === 'catalogo'
  const esEcommerce = state.config?.modo_operacion === 'ecommerce'
  const esHibrido = state.config?.modo_operacion === 'hibrido'
  const mostrarPrecios = state.config?.mostrar_precios ?? false
  const ventaPorCajas = state.config?.tipo_venta === 'cajas'
  const ventaPorPiezas = state.config?.tipo_venta === 'piezas'

  return {
    config: state.config,
    loading: state.loading,
    error: state.error,
    refresh,
    esCatalogo,
    esEcommerce,
    esHibrido,
    mostrarPrecios,
    ventaPorCajas,
    ventaPorPiezas,
  }
}
