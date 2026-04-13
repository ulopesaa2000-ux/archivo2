// app/(auth)/login/LoginForm.tsx
'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/modules/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, AlertCircle, Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react'

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  // Autofocus en email al montar
  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = (formData.get('email') as string)?.trim()
    const password = formData.get('password') as string

    // Validación rápida en cliente (antes de ir al server)
    if (!email) {
      setError('Ingresa tu email.')
      emailRef.current?.focus()
      return
    }

    if (!password) {
      setError('Ingresa tu contraseña.')
      return
    }

    // Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('El formato del email no es válido.')
      emailRef.current?.focus()
      return
    }

    startTransition(async () => {
      try {
        const result = await signIn(email, password)

        if (!result.success) {
          setError(result.error ?? 'Error desconocido.')
          return
        }

        // Login exitoso → navegar al destino
        router.push(redirectTo)
        router.refresh()
      } catch (err: any) {
        setError('Ocurrió un error inesperado al intentar iniciar sesión. Revisa tu conexión.')
      }
    })
  }

  return (
    <Card className="shadow-sm border-0 shadow-gray-200/50">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Error Message ────────────────────────────── */}
          {error && (
            <div
              className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
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
