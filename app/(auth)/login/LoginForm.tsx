// app/(auth)/login/LoginForm.tsx
'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { loginAction, registerAction } from '@/modules/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, AlertCircle, Eye, EyeOff, Mail, Lock, ArrowRight, User, Phone, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const emailRef = useRef<HTMLInputElement>(null)
  const regNameRef = useRef<HTMLInputElement>(null)

  // useActionState para Login
  const [loginState, loginFormAction, isLoginPending] = useActionState(loginAction, {
    success: true,
    error: undefined,
  })

  // useActionState para Registro
  const [registerState, registerFormAction, isRegisterPending] = useActionState(registerAction, {
    success: true,
    error: undefined,
  })

  // Autofocus inteligente al montar o cambiar de pestaña
  useEffect(() => {
    if (activeTab === 'login') {
      emailRef.current?.focus()
    } else {
      regNameRef.current?.focus()
    }
  }, [activeTab])

  const isPending = isLoginPending || isRegisterPending
  const currentState = activeTab === 'login' ? loginState : registerState

  return (
    <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800/50 transition-all duration-300">
      
      {/* ── Tabs del Selector ────────────────────────────── */}
      <div className="flex border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 select-none p-1">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setActiveTab('login')
            setShowPassword(false)
          }}
          className={cn(
            "flex-1 py-3.5 text-sm font-semibold rounded-xl transition-all duration-300 relative",
            activeTab === 'login'
              ? "text-slate-900 dark:text-white bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800/40"
              : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-900/30"
          )}
        >
          Iniciar Sesión
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setActiveTab('register')
            setShowPassword(false)
            setShowConfirmPassword(false)
          }}
          className={cn(
            "flex-1 py-3.5 text-sm font-semibold rounded-xl transition-all duration-300 relative",
            activeTab === 'register'
              ? "text-slate-900 dark:text-white bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800/40"
              : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-900/30"
          )}
        >
          <span className="flex items-center justify-center gap-1.5">
            Crear Cuenta
            <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
          </span>
        </button>
      </div>

      <CardContent className="p-6 sm:p-8">
        
        {/* Formulario de Iniciar Sesión */}
        {activeTab === 'login' && (
          <form action={loginFormAction} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <input type="hidden" name="redirectTo" value={redirectTo} />

            {/* Mensaje de Error de Login */}
            {loginState && !loginState.success && loginState.error && (
              <div
                className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-sm text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-1 duration-200"
                role="alert"
              >
                <AlertCircle className="h-4.5 w-4.5 mt-0.5 shrink-0 text-red-500" />
                <span>{loginState.error}</span>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Correo Electrónico
              </Label>
              <div className="relative h-12 flex items-center">
                <Mail className="absolute left-4 h-5 w-5 text-slate-400 pointer-events-none" />
                <Input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  autoComplete="email"
                  disabled={isPending}
                  className="pl-11 pr-4 h-12 text-base rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Contraseña con Ojo Corregido y Seguro */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Contraseña
              </Label>
              <div className="relative h-12 flex items-center">
                <Lock className="absolute left-4 h-5 w-5 text-slate-400 pointer-events-none" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isPending}
                  className="pl-11 pr-12 h-12 text-base rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                  required
                />
                
                {/* Ojo de contraseña robusto (sin botón HTML que interfiera) */}
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 flex items-center justify-center h-10 w-10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer select-none z-10"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowPassword(!showPassword)
                  }}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </span>
              </div>
            </div>

            {/* Botón de envío grande y premium */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-medium rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-lg hover:shadow-xl transition-all duration-200 mt-2"
              disabled={isPending}
            >
              {isLoginPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Accediendo...
                </>
              ) : (
                <>
                  Ingresar al Sistema
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>
        )}

        {/* Formulario de Crear Cuenta de Cliente */}
        {activeTab === 'register' && (
          <form action={registerFormAction} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <input type="hidden" name="redirectTo" value={redirectTo} />

            {/* Mensaje de Error de Registro */}
            {registerState && !registerState.success && registerState.error && (
              <div
                className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-sm text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-1 duration-200"
                role="alert"
              >
                <AlertCircle className="h-4.5 w-4.5 mt-0.5 shrink-0 text-red-500" />
                <span>{registerState.error}</span>
              </div>
            )}

            {/* Nombre Completo */}
            <div className="space-y-1.5">
              <Label htmlFor="nombre_completo" className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Nombre Completo
              </Label>
              <div className="relative h-12 flex items-center">
                <User className="absolute left-4 h-5 w-5 text-slate-400 pointer-events-none" />
                <Input
                  ref={regNameRef}
                  id="nombre_completo"
                  name="nombre_completo"
                  type="text"
                  placeholder="Juan Pérez"
                  disabled={isPending}
                  className="pl-11 pr-4 h-12 text-base rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Correo Electrónico */}
            <div className="space-y-1.5">
              <Label htmlFor="reg_email" className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Correo Electrónico
              </Label>
              <div className="relative h-12 flex items-center">
                <Mail className="absolute left-4 h-5 w-5 text-slate-400 pointer-events-none" />
                <Input
                  id="reg_email"
                  name="email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  disabled={isPending}
                  className="pl-11 pr-4 h-12 text-base rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <Label htmlFor="telefono" className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Teléfono de Contacto <span className="text-slate-400 dark:text-slate-500 font-normal">(Opcional)</span>
              </Label>
              <div className="relative h-12 flex items-center">
                <Phone className="absolute left-4 h-5 w-5 text-slate-400 pointer-events-none" />
                <Input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  placeholder="5512345678"
                  disabled={isPending}
                  className="pl-11 pr-4 h-12 text-base rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-1.5">
              <Label htmlFor="reg_password" className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Contraseña
              </Label>
              <div className="relative h-12 flex items-center">
                <Lock className="absolute left-4 h-5 w-5 text-slate-400 pointer-events-none" />
                <Input
                  id="reg_password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  disabled={isPending}
                  className="pl-11 pr-12 h-12 text-base rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                  required
                />
                
                {/* Ojo de contraseña robusto */}
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 flex items-center justify-center h-10 w-10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer select-none z-10"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowPassword(!showPassword)
                  }}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </span>
              </div>
            </div>

            {/* Confirmar Contraseña */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm_password" className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Confirmar Contraseña
              </Label>
              <div className="relative h-12 flex items-center">
                <Lock className="absolute left-4 h-5 w-5 text-slate-400 pointer-events-none" />
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repite la contraseña"
                  disabled={isPending}
                  className="pl-11 pr-12 h-12 text-base rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-950 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                  required
                />
                
                {/* Ojo de confirmación de contraseña robusto */}
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 flex items-center justify-center h-10 w-10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer select-none z-10"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowConfirmPassword(!showConfirmPassword)
                  }}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </span>
              </div>
            </div>

            {/* Botón de Registro */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-200 mt-2"
              disabled={isPending}
            >
              {isRegisterPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creando Cuenta...
                </>
              ) : (
                <>
                  Registrarme y Comenzar
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>
        )}

      </CardContent>
    </Card>
  )
}
