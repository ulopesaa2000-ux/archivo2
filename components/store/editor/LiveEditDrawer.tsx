// components/store/editor/LiveEditDrawer.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter 
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Edit3, Save, CheckCircle2, AlertCircle } from 'lucide-react'
import { useLiveStoreEditor } from './LiveStoreEditorContext'
import { useConfigEcommerce } from '@/hooks/useConfigEcommerce'
import { actualizarConfigEcommerce } from '@/modules/ecommerce/actions'
import { ColeccionProductoSelector } from './ColeccionProductoSelector'

export function LiveEditDrawer() {
  const router = useRouter()
  const { config } = useConfigEcommerce()
  const { activeSection, isDrawerOpen, closeEditor } = useLiveStoreEditor()
  
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string>('¡Cambios guardados con éxito en la tienda!')

  const handleSuccessNotification = (msg?: string) => {
    if (msg) setSuccessMsg(msg)
    setSaveSuccess(true)
    setTimeout(() => {
      setSaveSuccess(false)
      closeEditor()
      router.refresh()
    }, 2500)
  }
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Estados de formularios
  const [heroBadgeText, setHeroBadgeText] = useState('Bienvenido a Catálogo IDOL NAVY')
  const [heroTitle, setHeroTitle] = useState('Estilo, Calidad y Comodidad Exclusiva')
  const [heroDescription, setHeroDescription] = useState('Nos alegra que formes parte de esta experiencia. Aquí encontrarás nuestra colección diseñada para ofrecerte prendas de alta gama.')
  const [exploraCategoriaText, setExploraCategoriaText] = useState(
    'Explora cada una de nuestras opciones y descubre los diseños que mejor se adapten a tu personalidad. Nos esforzamos por brindarte productos de excelente calidad y una atención cercana para que tu experiencia sea la mejor.'
  )
  const [exploraCategoriaSize, setExploraCategoriaSize] = useState<string>('normal')

  const [footerAgradecimientoText, setFooterAgradecimientoText] = useState(
    '¡Gracias por confiar en nosotros y ser parte de nuestra comunidad!'
  )
  const [footerAgradecimientoSize, setFooterAgradecimientoSize] = useState<string>('large')
  
  const [damaLink, setDamaLink] = useState('/shop?genero=dama')
  const [caballeroLink, setCaballeroLink] = useState('/shop?genero=caballero')

  // Contactos Regionales
  const [contactoCentro, setContactoCentro] = useState('248 125 0472')
  const [contactoTulancingo, setContactoTulancingo] = useState('56 1549 5410')
  const [contactoMoroleon, setContactoMoroleon] = useState('55 3935 6156')
  const [contactoSanMartin, setContactoSanMartin] = useState('248 125 167')

  useEffect(() => {
    if (config?.mensaje_precio_variable) {
      try {
        const parsed = JSON.parse(config.mensaje_precio_variable)
        if (parsed.hero_description) setHeroDescription(parsed.hero_description)
        if (parsed.explora_categoria) setExploraCategoriaText(parsed.explora_categoria)
        if (parsed.explora_categoria_size) setExploraCategoriaSize(parsed.explora_categoria_size)
        if (parsed.footer_agradecimiento) setFooterAgradecimientoText(parsed.footer_agradecimiento)
        if (parsed.footer_agradecimiento_size) setFooterAgradecimientoSize(parsed.footer_agradecimiento_size)
      } catch {
        setHeroDescription(config.mensaje_precio_variable)
      }
    }
  }, [config])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMsg(null)

    try {
      const payload = JSON.stringify({
        hero_description: heroDescription,
        explora_categoria: exploraCategoriaText,
        explora_categoria_size: exploraCategoriaSize,
        footer_agradecimiento: footerAgradecimientoText,
        footer_agradecimiento_size: footerAgradecimientoSize,
      })

      const result = await actualizarConfigEcommerce({
        mensaje_precio_variable: payload,
      })

      if (result.success) {
        handleSuccessNotification('¡Cambios guardados con éxito en la tienda!')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar los cambios')
    } finally {
      setIsSaving(false)
    }
  }

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'hero': return 'Editar Sección Hero / Bienvenida'
      case 'coleccion_dama': return 'Editar Colección Dama'
      case 'coleccion_caballero': return 'Editar Colección Caballero'
      case 'explora_categoria': return 'Editar Sección Explora por Categoría'
      case 'footer_agradecimiento': return 'Editar Mensaje de Agradecimiento'
      case 'contactos_regionales': return 'Editar Contactos por Región'
      case 'destacados': return 'Editar Productos Destacados'
      default: return 'Edición Rápida'
    }
  }

  return (
    <Sheet open={isDrawerOpen} onOpenChange={(open) => !open && closeEditor()}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-lg flex flex-col p-0 bg-background text-foreground border-l border-border dark:bg-zinc-950 dark:text-gray-100"
      >
        <SheetHeader className="p-5 border-b border-border bg-card dark:bg-zinc-900">
          <SheetTitle className="text-lg font-semibold text-foreground dark:text-gray-100 flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-amber-500" />
            <span>{getSectionTitle()}</span>
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground dark:text-gray-400">
            Los cambios guardados se reflejarán de inmediato en la tienda pública
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200 rounded-lg text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200 rounded-lg text-xs font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Formulario Hero / Bienvenida */}
          {activeSection === 'hero' && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-foreground dark:text-gray-200">
                  Insignia de Bienvenida
                </Label>
                <Input
                  value={heroBadgeText}
                  onChange={(e) => setHeroBadgeText(e.target.value)}
                  className="mt-1 bg-background dark:bg-zinc-900 text-foreground dark:text-gray-100"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-foreground dark:text-gray-200">
                  Título Principal
                </Label>
                <Input
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  className="mt-1 bg-background dark:bg-zinc-900 text-foreground dark:text-gray-100"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-foreground dark:text-gray-200">
                  Mensaje / Descripción
                </Label>
                <Textarea
                  rows={3}
                  value={heroDescription}
                  onChange={(e) => setHeroDescription(e.target.value)}
                  className="mt-1 bg-background dark:bg-zinc-900 text-foreground dark:text-gray-100"
                />
              </div>
            </div>
          )}

          {/* Formulario Colección Dama */}
          {activeSection === 'coleccion_dama' && (
            <ColeccionProductoSelector
              generoId={1}
              generoNombre="Dama"
              onSuccess={(detalle) => handleSuccessNotification(detalle)}
            />
          )}

          {/* Formulario Colección Caballero */}
          {activeSection === 'coleccion_caballero' && (
            <ColeccionProductoSelector
              generoId={2}
              generoNombre="Caballero"
              onSuccess={(detalle) => handleSuccessNotification(detalle)}
            />
          )}

          {/* Formulario Explora por Categoría */}
          {activeSection === 'explora_categoria' && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-foreground dark:text-gray-200">
                  Mensaje / Subtítulo de Explora por Categoría
                </Label>
                <Textarea
                  rows={4}
                  value={exploraCategoriaText}
                  onChange={(e) => setExploraCategoriaText(e.target.value)}
                  className="mt-1 bg-background dark:bg-zinc-900 text-foreground dark:text-gray-100 text-xs leading-relaxed"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-foreground dark:text-gray-200">
                  Tamaño de Texto
                </Label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {[
                    { id: 'small', label: 'Pequeño' },
                    { id: 'normal', label: 'Mediano' },
                    { id: 'large', label: 'Grande' }
                  ].map((sz) => (
                    <button
                      key={sz.id}
                      type="button"
                      onClick={() => setExploraCategoriaSize(sz.id)}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                        exploraCategoriaSize === sz.id
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-card text-foreground border-border hover:bg-muted'
                      }`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Formulario Mensaje de Agradecimiento Footer */}
          {activeSection === 'footer_agradecimiento' && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-foreground dark:text-gray-200">
                  Mensaje de Agradecimiento / Comunidad
                </Label>
                <Textarea
                  rows={3}
                  value={footerAgradecimientoText}
                  onChange={(e) => setFooterAgradecimientoText(e.target.value)}
                  className="mt-1 bg-background dark:bg-zinc-900 text-foreground dark:text-gray-100 text-xs leading-relaxed"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-foreground dark:text-gray-200">
                  Tamaño de Texto (3 opciones)
                </Label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {[
                    { id: 'small', label: 'Pequeño' },
                    { id: 'normal', label: 'Mediano' },
                    { id: 'large', label: 'Grande' }
                  ].map((sz) => (
                    <button
                      key={sz.id}
                      type="button"
                      onClick={() => setFooterAgradecimientoSize(sz.id)}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                        footerAgradecimientoSize === sz.id
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-card text-foreground border-border hover:bg-muted'
                      }`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Formulario Contactos por Región */}
          {activeSection === 'contactos_regionales' && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-foreground dark:text-gray-200">
                  Daniel (Centro) - Teléfono
                </Label>
                <Input
                  value={contactoCentro}
                  onChange={(e) => setContactoCentro(e.target.value)}
                  className="mt-1 bg-background dark:bg-zinc-900 text-foreground dark:text-gray-100"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-foreground dark:text-gray-200">
                  Javier (Tulancingo) - Teléfono
                </Label>
                <Input
                  value={contactoTulancingo}
                  onChange={(e) => setContactoTulancingo(e.target.value)}
                  className="mt-1 bg-background dark:bg-zinc-900 text-foreground dark:text-gray-100"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-foreground dark:text-gray-200">
                  Carlos (Moroleón) - Teléfono
                </Label>
                <Input
                  value={contactoMoroleon}
                  onChange={(e) => setContactoMoroleon(e.target.value)}
                  className="mt-1 bg-background dark:bg-zinc-900 text-foreground dark:text-gray-100"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-foreground dark:text-gray-200">
                  Juan (San Martín, Toluca, Chiconcuac) - Teléfono
                </Label>
                <Input
                  value={contactoSanMartin}
                  onChange={(e) => setContactoSanMartin(e.target.value)}
                  className="mt-1 bg-background dark:bg-zinc-900 text-foreground dark:text-gray-100"
                />
              </div>
            </div>
          )}

          {/* Formulario Productos Destacados */}
          {activeSection === 'destacados' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground dark:text-gray-400">
                Los productos destacados se gestionan directamente marcando la casilla de <strong>Destacado</strong> en el panel de productos del catálogo.
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs"
                onClick={() => router.push('/catalogo')}
              >
                Ir a gestión de catálogo
              </Button>
            </div>
          )}

          {activeSection !== 'coleccion_dama' && activeSection !== 'coleccion_caballero' && (
            <SheetFooter className="pt-4 border-t border-border flex flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeEditor}
                className="flex-1 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
              </Button>
            </SheetFooter>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
