// components/admin/AdminLayoutClient.tsx
'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import type { UsuarioConRol, BodegaRow } from '@/lib/types/tables'
import { UnauthorizedToastListener } from './UnauthorizedToastListener'

interface AdminLayoutClientProps {
  user: UsuarioConRol
  bodegas: BodegaRow[]
  children: React.ReactNode
}

/**
 * Wrapper cliente persistente para el Shell del Administrador.
 * Administra el estado de colapso de la barra lateral izquierda
 * de forma reactiva y persiste la preferencia del usuario en localStorage.
 */
export function AdminLayoutClient({ user, bodegas, children }: AdminLayoutClientProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  const [isMounted, setIsMounted] = useState<boolean>(false)

  // Cargar preferencia del usuario al montar
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('sidebar-collapsed')
      if (savedState !== null) {
        setIsCollapsed(savedState === 'true')
      }
    } catch (e) {
      console.warn('No se pudo acceder a localStorage para la barra lateral:', e)
    }
    setIsMounted(true)
  }, [])

  const handleToggle = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    try {
      localStorage.setItem('sidebar-collapsed', String(newState))
    } catch (e) {
      console.warn('No se pudo guardar en localStorage para la barra lateral:', e)
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <UnauthorizedToastListener />
      {/* Sidebar para Desktop */}
      <Sidebar 
        user={user} 
        isCollapsed={isMounted ? isCollapsed : false} 
        onToggle={handleToggle} 
      />
      
      {/* Contenedor Principal */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
        <Header user={user} bodegas={bodegas} />
        <main className="flex-1 overflow-auto bg-background/50">
          <div className="p-6 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
