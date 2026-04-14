// app/(auth)/login/LoginForm.tsx
'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { loginAction } from '@/modules/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, AlertCircle, Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react'

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [showPassword, setShowPassword] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  
  // React 19 forma segura y nativa de manejar el estado de las acciones del formulario (reemplaza old forms)
  const [state, formAction, isPending] = useActionState(loginAction, {
    success: true, // initial clean state
    error: undefined,
  });

  // Autofocus en email al montar
  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  return (
    <Card className="shadow-sm border-0 shadow-gray-200/50">
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">

          {/* Estado escondido para transportar adonde redirigir sin usar window.location */}
          <input type="hidden" name="redirectTo" value={redirectTo} />

          {/* ── Error Message ────────────────────────────── */}
          {state && !state.success && state.error && (
            <div
              className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          {/* ── Email ────────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                autoComplete="email"
                disabled={isPending}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* ── Password ─────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isPending}
                className="pl-10 pr-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* ── Submit ────────────────────────────────────── */}
          <Button
            type="submit"
            className="w-full h-11 text-sm font-medium"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                Iniciar Sesión
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

        </form>
      </CardContent>
    </Card>
  )
}
