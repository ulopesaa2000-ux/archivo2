// app/(admin)/perfil/PerfilForm.tsx
'use client'

import { useActionState, useState } from 'react'
import { updatePerfilAction, type ProfileUpdateResult } from '@/modules/auth/actions'
import type { UsuarioConRol, BodegaRow, UsuarioBodegaRow } from '@/lib/types/tables'
import { Fecha } from '@/components/shared/Fecha'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  User, AtSign, Phone, Mail, Lock, Shield, 
  Warehouse, CheckCircle2, AlertCircle, Loader2, 
  Camera, Sparkles, Key, Check, Info, ShieldCheck
} from 'lucide-react'
import { toast } from 'sonner'

interface PerfilFormProps {
  user: UsuarioConRol
  bodegas: (BodegaRow & { permisos_bodega?: UsuarioBodegaRow })[]
}

export function PerfilForm({ user, bodegas }: PerfilFormProps) {
  const [activeTab, setActiveTab] = useState('basica')
  const [photoInfoOpen, setPhotoInfoOpen] = useState(false)

  const [state, formAction, isPending] = useActionState(
    async (prevState: ProfileUpdateResult, formData: FormData) => {
      const result = await updatePerfilAction(prevState, formData)
      if (result.success && result.message) {
        toast.success(result.message)
      } else if (!result.success && result.error) {
        toast.error(result.error)
      }
      return result
    },
    { success: true }
  )

  const inicial = user.nombre_completo?.charAt(0)?.toUpperCase() ?? 'U'

  return (
    <div className="space-y-6">
      {/* ── Hero del Perfil con Avatar & Datos Principales ── */}
      <Card className="border-border bg-gradient-to-br from-card to-muted/30 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-0" />
        
        <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          {/* Avatar con botón para subir foto (Placeholder futuro) */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-3xl sm:text-4xl font-extrabold text-primary shadow-md">
              {inicial}
            </div>

            {/* Botón flotante para cambiar foto */}
            <button
              type="button"
              onClick={() => setPhotoInfoOpen(!photoInfoOpen)}
              className="absolute bottom-0 right-0 p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg active:scale-95 transition-all outline-none"
              title="Cambiar foto de perfil"
              aria-label="Cambiar foto de perfil"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* Información Principal del Usuario */}
          <div className="text-center sm:text-left flex-1 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  {user.nombre_completo}
                </h1>
                <p className="text-sm font-medium text-muted-foreground flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                  <AtSign className="w-3.5 h-3.5" />
                  <span>{user.username}</span>
                </p>
              </div>

              {/* Badges de Rol y Estado */}
              <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap">
                <Badge variant="secondary" className="px-2.5 py-1 text-xs font-bold bg-primary/10 text-primary border-primary/20">
                  <Shield className="w-3 h-3 mr-1" />
                  {user.rol?.nombre ?? 'Sin Rol'}
                </Badge>
                <Badge variant="outline" className="px-2.5 py-1 text-xs font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                  <Check className="w-3 h-3 mr-1" />
                  Activo
                </Badge>
              </div>
            </div>

            {/* Metadatos de la cuenta */}
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>
                <strong>Tenant:</strong> {user.tenant}
              </span>
              <span>•</span>
              <span>
                <strong>Último acceso:</strong>{' '}
                <Fecha valor={user.ultimo_acceso} formato="fecha-hora" fallback="Primera sesión" />
              </span>
            </div>

            {/* Mensaje desplegable de Foto de Perfil */}
            {photoInfoOpen && (
              <div className="mt-3 p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Subida de Avatar / Foto de Perfil</p>
                    <p className="text-muted-foreground mt-0.5 leading-relaxed">
                      El soporte para subir fotos personalizadas directamente a Supabase Storage estará disponible en la siguiente actualización. Por ahora se utiliza tu inicial identificadora.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs del Perfil ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full sm:w-[480px] p-1 rounded-xl bg-muted/60">
          <TabsTrigger value="basica" className="rounded-lg text-xs font-semibold">
            Información Básica
          </TabsTrigger>
          <TabsTrigger value="seguridad" className="rounded-lg text-xs font-semibold">
            Seguridad y Rol
          </TabsTrigger>
          <TabsTrigger value="permisos" className="rounded-lg text-xs font-semibold">
            Bodegas y Permisos
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: INFORMACIÓN BÁSICA (EDITABLE) ── */}
        <TabsContent value="basica" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <span>Datos Generales</span>
              </CardTitle>
              <CardDescription>
                Actualiza tu nombre de usuario, nombre completo y datos de contacto en la plataforma.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form action={formAction} className="space-y-5 max-w-xl">
                {/* Mensaje de estado */}
                {state && !state.success && state.error && (
                  <div
                    className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-sm text-red-600 dark:text-red-400 animate-in fade-in duration-200"
                    role="alert"
                  >
                    <AlertCircle className="h-4.5 w-4.5 mt-0.5 shrink-0" />
                    <span>{state.error}</span>
                  </div>
                )}

                {state && state.success && state.message && (
                  <div
                    className="flex items-start gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-sm text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200"
                    role="alert"
                  >
                    <CheckCircle2 className="h-4.5 w-4.5 mt-0.5 shrink-0" />
                    <span>{state.message}</span>
                  </div>
                )}

                {/* Nombre Completo */}
                <div className="space-y-1.5">
                  <Label htmlFor="nombre_completo" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Nombre Completo <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="nombre_completo"
                      name="nombre_completo"
                      defaultValue={user.nombre_completo}
                      disabled={isPending}
                      placeholder="Ej. Juan Carlos Pérez"
                      className="pl-10 h-11 rounded-xl"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Nombre visible en notas de inventario, auditorías y órdenes del sistema.
                  </p>
                </div>

                {/* Nombre de Usuario (Username) */}
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Nombre de Usuario <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="username"
                      name="username"
                      defaultValue={user.username}
                      disabled={isPending}
                      placeholder="Ej. juan.perez"
                      className="pl-10 h-11 rounded-xl"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Identificador único para menciones y registros en el tenant.
                  </p>
                </div>

                {/* Teléfono de Contacto */}
                <div className="space-y-1.5">
                  <Label htmlFor="telefono" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Teléfono de Contacto
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="telefono"
                      name="telefono"
                      type="tel"
                      defaultValue={user.telefono ?? ''}
                      disabled={isPending}
                      placeholder="Ej. 55 1234 5678"
                      className="pl-10 h-11 rounded-xl"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Teléfono para notificaciones operativas o contacto directo de pedidos.
                  </p>
                </div>

                {/* Botón Guardar */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="h-11 px-6 font-semibold rounded-xl"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando cambios...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Guardar Información
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: SEGURIDAD Y ROL (PROTEGIDO / DESHABILITADO) ── */}
        <TabsContent value="seguridad" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <span>Cuenta y Nivel de Acceso</span>
              </CardTitle>
              <CardDescription>
                Estos campos son administrados centralmente por las políticas de seguridad del sistema y Supabase Auth.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 max-w-xl">
              {/* Correo Electrónico (Protegido) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Correo Electrónico
                  </Label>
                  <Badge variant="outline" className="text-[10px] font-normal border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                    <Lock className="w-2.5 h-2.5 mr-1" />
                    Auth Vinculado
                  </Badge>
                </div>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={user.email ?? 'Sin correo registrado'}
                    disabled
                    className="pl-10 h-11 rounded-xl bg-muted/60 text-muted-foreground cursor-not-allowed"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  El correo se utiliza para la autenticación en Supabase Auth y recuperación de contraseña.
                </p>
              </div>

              {/* Contraseña (Deshabilitada) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Contraseña
                  </Label>
                  <Badge variant="outline" className="text-[10px] font-normal border-slate-500/30 text-slate-500">
                    <Key className="w-2.5 h-2.5 mr-1" />
                    Encriptada
                  </Badge>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="password"
                    value="••••••••••••"
                    disabled
                    className="pl-10 h-11 rounded-xl bg-muted/60 text-muted-foreground cursor-not-allowed"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Para actualizar tu contraseña, solicita un enlace de restablecimiento al administrador o en la pantalla de inicio de sesión.
                </p>
              </div>

              {/* Rol y Nivel de Acceso */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Rol Asignado
                  </span>
                  <p className="text-base font-bold text-foreground">
                    {user.rol?.nombre ?? 'Sin Rol'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.rol?.descripcion || 'Rol operativo estándar en el sistema'}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Nivel de Acceso
                  </span>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-foreground">
                      Nivel {user.rol?.nivel_acceso ?? '3'}
                    </p>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {user.rol?.nivel_acceso === 1
                        ? 'Super Admin'
                        : user.rol?.nivel_acceso === 2
                        ? 'Administrador'
                        : 'Operativo'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {user.rol?.nivel_acceso === 1
                      ? 'Acceso total a todos los módulos y bodegas'
                      : user.rol?.nivel_acceso === 2
                      ? 'Acceso completo a bodegas y órdenes B2B'
                      : 'Acceso delimitado por bodegas asignadas'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 3: BODEGAS Y PERMISOS ── */}
        <TabsContent value="permisos" className="space-y-4">
          {/* Bodegas Asignadas */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-primary" />
                <span>Bodegas con Acceso Autorizado</span>
              </CardTitle>
              <CardDescription>
                Bodegas asignadas para consultar stock, registrar movimientos y gestionar inventario.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {bodegas.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
                  No tienes bodegas asignadas actualmente. Contacta al administrador del sistema.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {bodegas.map((bodega) => (
                    <div
                      key={bodega.id}
                      className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-2 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-sm text-foreground truncate">
                          {bodega.nombre}
                        </span>
                        {bodega.es_virtual && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-500/30 text-indigo-500 bg-indigo-500/10">
                            Virtual
                          </Badge>
                        )}
                      </div>

                      {bodega.codigo && (
                        <p className="text-xs font-mono text-muted-foreground">
                          Código: {bodega.codigo}
                        </p>
                      )}

                      <div className="pt-2 border-t border-border/50 flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Consultar
                        </Badge>
                        {bodega.permisos_bodega?.puede_crear_notas && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Crear Notas
                          </Badge>
                        )}
                        {bodega.permisos_bodega?.puede_confirmar_notas && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Confirmar
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Permisos de Módulos */}
          {user.permisos && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <span>Permisos Operativos Especiales</span>
                </CardTitle>
                <CardDescription>
                  Capacidades habilitadas para tu perfil en el esquema del sistema.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/10 text-xs">
                    <span className="font-medium text-foreground">Super Administrador</span>
                    <Badge variant={user.permisos.es_super_admin ? 'default' : 'outline'}>
                      {user.permisos.es_super_admin ? 'Sí' : 'No'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/10 text-xs">
                    <span className="font-medium text-foreground">Ver Inventario</span>
                    <Badge variant={user.permisos.puede_ver_inventario ? 'default' : 'outline'}>
                      {user.permisos.puede_ver_inventario ? 'Habilitado' : 'No'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/10 text-xs">
                    <span className="font-medium text-foreground">Crear Notas Inventario</span>
                    <Badge variant={user.permisos.puede_crear_notas_inventario ? 'default' : 'outline'}>
                      {user.permisos.puede_crear_notas_inventario ? 'Habilitado' : 'No'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/10 text-xs">
                    <span className="font-medium text-foreground">Aprobar Notas Inventario</span>
                    <Badge variant={user.permisos.puede_aprobar_notas_inventario ? 'default' : 'outline'}>
                      {user.permisos.puede_aprobar_notas_inventario ? 'Habilitado' : 'No'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/10 text-xs">
                    <span className="font-medium text-foreground">Gestionar B2B</span>
                    <Badge variant={user.permisos.puede_gestionar_compras_b2b ? 'default' : 'outline'}>
                      {user.permisos.puede_gestionar_compras_b2b ? 'Habilitado' : 'No'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/10 text-xs">
                    <span className="font-medium text-foreground">Gestionar Ecommerce</span>
                    <Badge variant={user.permisos.puede_gestionar_ecommerce ? 'default' : 'outline'}>
                      {user.permisos.puede_gestionar_ecommerce ? 'Habilitado' : 'No'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
