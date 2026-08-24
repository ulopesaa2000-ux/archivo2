'use client'

import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-store-bg flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="font-serif text-2xl text-store-ink mb-4">
                Algo salió mal
              </h1>
              <p className="text-store-ink2 leading-relaxed mb-6">
                Ha ocurrido un error inesperado. No te preocupamos, estamos trabajando para solucionarlo.
              </p>

              {this.state.error && (
                <details className="text-left bg-store-surface border border-store-border rounded-lg p-4 mb-6">
                  <summary className="cursor-pointer text-sm font-medium text-store-ink mb-2">
                    Ver detalles del error
                  </summary>
                  <p className="text-xs text-store-ink3 font-mono">
                    {this.state.error.message}
                  </p>
                </details>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => this.setState({ hasError: false })}
                className="flex items-center justify-center gap-2 bg-store-accent text-white py-3 px-6 rounded-lg hover:bg-store-accent/90 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Intentar de nuevo</span>
              </button>
              <Link
                href="/inicio"
                className="flex items-center justify-center gap-2 bg-store-bg border border-store-border text-store-ink py-3 px-6 rounded-lg hover:bg-store-surface transition-colors"
              >
                <Home className="w-5 h-5" />
                <span>Ir al inicio</span>
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}