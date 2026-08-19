// app/(admin)/configuracion/general/ConfiguracionGeneralForm.tsx
'use client'

import { useState, useTransition } from 'react'
import type { UsuarioConRol, BodegaRow } from '@/lib/types/tables'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  LayoutDashboard, 
  Shield, 
  Check, 
  Building2, 
  Package, 
  ShoppingCart, 
  Calendar, 
  Sliders, 
  Users,
  Eye,
  Lock,
  Shirt
} from 'lucide-react'
import { toast } from 'sonner'

interface ConfiguracionGeneralFormProps {
  user: UsuarioConRol
  bodegas: BodegaRow[]
}

export function ConfiguracionGeneralForm({ user, bodegas }: ConfiguracionGeneralFormProps) {
  const [isPending, startTransition] = useTransition()
  const [defaultView, setDefaultView] = useState('comercial')
  const [defaultPeriod, setDefaultPeriod] = useState('semana')
  const [selectedRolePreview, setSelectedRolePreview] = useState('1')

  function handleSavePreferences(e: React.FormEvent) {
    e.preventDefault()
    startTransition(() => {
      // Guardar en localStorage para persistencia de preferencia local
      if (typeof window !== 'undefined') {
        localStorage.setItem('inv_dashboard_default_view', defaultView)
        localStorage.setItem('inv_dashboard_default_period', defaultPeriod)
      }
      toast.success('Preferencias de dashboard guardadas correctamente.')
    })
  }

  const roleProfiles = [
    {
      nivel: '1',
      nombre: 'Super Administrador',
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      dashboardRecomendado: 'Vista 360° / Comercial',
      modulosVisibles: [
        'Dashboard 360',
        'Catálogo de Productos',
        'Inventario (Notas, Stock, Bodegas)',
        'Órdenes B2B y Cajas',
        'Contenedores de Importación',
        'E-commerce & Catálogo Web',
        'Configuración (Usuarios, Roles, Tablas)',
      ],
    },
    {
      nivel: '2',
      nombre: 'Administrador Operativo / Comercial',
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      dashboardRecomendado: 'Comercial B2B',
      modulosVisibles: [
        'Dashboard Comercial',
        'Catálogo de Productos',
        'Inventario (Notas y Stock)',
        'Órdenes B2B y Cajas',
        'Contenedores',
        'E-commerce & Órdenes de Venta',
      ],
    },
    {
      nivel: '3',
      nombre: 'Operativo de Inventario & Bodega',
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      dashboardRecomendado: 'Inventario & Bodegas',
      modulosVisibles: [
        'Dashboard de Inventario',
        'Catálogo de Consulta',
        'Notas de Inventario (Creación/Revisión)',
        'Stock en Bodegas Asignadas',
      ],
    },
    {
      nivel: '4',
      nombre: 'Cliente B2B / Proveedor Externo',
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      dashboardRecomendado: 'Portal Comercial B2B',
      modulosVisibles: [
        'Portal Comercial Personalizado',
        'Órdenes B2B Asignadas',
        'Contenedores Vinculados',
        'Despachos',
      ],
    },
  ]

  const currentProfile = roleProfiles.find((r) => r.nivel === selectedRolePreview) || roleProfiles[0]

  return (
    <div className="space-y-8">
      
      {/* ── Sección 1: Preferencias del Dashboard ── */}
      <div className="grid gap-6 md:grid-cols-2 items-start">
        
        {/* Formulario de Preferencias */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              <span>Personalización del Dashboard</span>
            </CardTitle>
            <CardDescription>
              Configura la vista y el período temporal que deseas ver al entrar al panel.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSavePreferences} className="space-y-4">
              
              {/* Vista Predeterminada */}
              <div className="space-y-1.5">
                <Label htmlFor="defaultView" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Perspectiva Predeterminada
                </Label>
                <Select value={defaultView} onValueChange={(val) => val && setDefaultView(val)}>
                  <SelectTrigger id="defaultView" className="h-10 rounded-xl">
                    <SelectValue placeholder="Selecciona una vista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comercial">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-500" />
                        <span>Comercial B2B (Órdenes y Embarques)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="inventario">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-emerald-500" />
                        <span>Inventario & Bodegas (Notas y Stock)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="catalogo">
                      <div className="flex items-center gap-2">
                        <Shirt className="w-4 h-4 text-pink-500" />
                        <span>Catálogo & Existencias (Por Género y Prenda)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="ecommerce">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-amber-500" />
                        <span>E-commerce & Tienda (Cotizaciones)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="general">
                      <div className="flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                        <span>Vista 360° Completa</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Período Predeterminado */}
              <div className="space-y-1.5">
                <Label htmlFor="defaultPeriod" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Rango Temporal por Defecto
                </Label>
                <Select value={defaultPeriod} onValueChange={(val) => val && setDefaultPeriod(val)}>
                  <SelectTrigger id="defaultPeriod" className="h-10 rounded-xl">
                    <SelectValue placeholder="Selecciona un período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semana">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>Esta Semana (Lunes a Domingo)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="mes">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>Este Mes (Mes Actual)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="todo">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>Histórico Global</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Botón Guardar */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-10 px-5 rounded-xl font-semibold"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Guardar Preferencias
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Resumen del Perfil Actual */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span>Tu Nivel de Acceso Actual</span>
            </CardTitle>
            <CardDescription>
              Configuración aplicada a tu cuenta según tus credenciales.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">{user.nombre_completo}</span>
                <Badge variant="outline" className="text-xs font-bold border-primary/30 text-primary bg-primary/10">
                  {user.rol?.nombre ?? 'Sin Rol'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Nivel de acceso <strong>Nivel {user.rol?.nivel_acceso ?? '3'}</strong> en el tenant <strong>{user.tenant}</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Bodegas Habilitadas ({bodegas.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {bodegas.slice(0, 6).map((b) => (
                  <Badge key={b.id} variant="secondary" className="text-[11px] py-0.5">
                    {b.nombre}
                  </Badge>
                ))}
                {bodegas.length > 6 && (
                  <Badge variant="outline" className="text-[11px] py-0.5">
                    +{bodegas.length - 6} más
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Sección 2: Simulador y Matriz de Roles ── */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span>Estructura del Menú y Vistas por Rol</span>
              </CardTitle>
              <CardDescription>
                Visualiza qué módulos y dashboard corresponden a cada nivel jerárquico del sistema.
              </CardDescription>
            </div>

            {/* Selector de Rol a Inspeccionar */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Inspeccionar Rol:</span>
              <Select value={selectedRolePreview} onValueChange={(val) => val && setSelectedRolePreview(val)}>
                <SelectTrigger className="h-8 w-44 text-xs font-semibold rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Nivel 1: Super Admin</SelectItem>
                  <SelectItem value="2">Nivel 2: Admin Operativo</SelectItem>
                  <SelectItem value="3">Nivel 3: Inventario</SelectItem>
                  <SelectItem value="4">Nivel 4: Clientes B2B</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="p-5 rounded-2xl border border-border bg-card/60 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-bold text-sm text-foreground">{currentProfile.nombre}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Dashboard Sugerido: <strong>{currentProfile.dashboardRecomendado}</strong>
                </p>
              </div>
              <Badge className={currentProfile.color}>
                Nivel {currentProfile.nivel}
              </Badge>
            </div>

            <div className="pt-2 border-t border-border space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-primary" />
                <span>Módulos Visibles en el Menú Lateral:</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                {currentProfile.modulosVisibles.map((mod, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl border border-border/80 bg-muted/20 flex items-center gap-2 text-xs">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-medium text-foreground">{mod}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
