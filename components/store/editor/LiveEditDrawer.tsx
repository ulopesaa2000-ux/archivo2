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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Edit3, Save, CheckCircle2, AlertCircle, Type, Sparkles } from 'lucide-react'
import { useLiveStoreEditor, EditableSection } from './LiveStoreEditorContext'
import { useConfigEcommerce } from '@/hooks/useConfigEcommerce'
import { actualizarConfigEcommerce } from '@/modules/ecommerce/actions'
import { ColeccionProductoSelector } from './ColeccionProductoSelector'
import { 
  parseStoreConfig, 
  serializeStoreConfig, 
  ParsedStoreConfig, 
  DEFAULT_STORE_CONFIG, 
  TextSizeOption 
} from '@/lib/utils/storeConfig'

export function LiveEditDrawer() {
  const router = useRouter()
  const { config } = useConfigEcommerce()
  const { activeSection, openEditor, isDrawerOpen, closeEditor } = useLiveStoreEditor()
  
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string>('¡Cambios guardados con éxito en la tienda!')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Estado del objeto de configuración global de textos
  const [storeConfig, setStoreConfig] = useState<ParsedStoreConfig>(DEFAULT_STORE_CONFIG)

  // Cargar configuración de Supabase
  useEffect(() => {
    if (config?.mensaje_precio_variable) {
      setStoreConfig(parseStoreConfig(config.mensaje_precio_variable))
    }
  }, [config])

  const handleSuccessNotification = (msg?: string) => {
    if (msg) setSuccessMsg(msg)
    setSaveSuccess(true)
    setTimeout(() => {
      setSaveSuccess(false)
      closeEditor()
      router.refresh()
    }, 2200)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMsg(null)

    try {
      const payload = serializeStoreConfig(storeConfig)

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
      case 'hero': return 'Hero / Bienvenida'
      case 'coleccion_dama': return 'Colección Dama'
      case 'coleccion_caballero': return 'Colección Caballero'
      case 'explora_categoria': return 'Explora por Categoría'
      case 'categorias_grid': return 'Catálogo por Líneas'
      case 'destacados': return 'Productos Destacados'
      case 'contactos_regionales': return 'Contactos Regionales'
      case 'footer_agradecimiento': return 'Mensaje de Agradecimiento'
      default: return 'Edición Rápida'
    }
  }

  // Componente de Control para Selector de 3 Tamaños Tipográficos
  const SizeSelectorControl = ({
    label,
    value,
    onChange,
  }: {
    label: string
    value: TextSizeOption
    onChange: (val: TextSizeOption) => void
  }) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-foreground dark:text-gray-200 flex items-center gap-1.5">
          <Type className="h-3.5 w-3.5 text-amber-500" />
          <span>{label}</span>
        </Label>
        <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
          {value === 'small' ? 'Pequeño' : value === 'large' ? 'Grande' : 'Mediano'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { id: 'small' as TextSizeOption, label: 'Pequeño', desc: 'S s' },
          { id: 'normal' as TextSizeOption, label: 'Mediano', desc: 'M m' },
          { id: 'large' as TextSizeOption, label: 'Grande', desc: 'L l' },
        ].map((sz) => {
          const isSelected = value === sz.id
          return (
            <button
              key={sz.id}
              type="button"
              onClick={() => onChange(sz.id)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all duration-200 flex flex-col items-center justify-center gap-0.5 ${
                isSelected
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-md ring-2 ring-emerald-500/30'
                  : 'bg-card text-foreground border-border hover:bg-muted dark:bg-zinc-900 dark:border-zinc-800'
              }`}
            >
              <span>{sz.label}</span>
              <span className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-muted-foreground'}`}>
                {sz.desc}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <Sheet open={isDrawerOpen} onOpenChange={(open) => !open && closeEditor()}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-lg flex flex-col p-0 bg-background text-foreground border-l border-border dark:bg-zinc-950 dark:text-gray-100 shadow-2xl"
      >
        {/* Header con Selector de Sección Móvil */}
        <SheetHeader className="p-4 sm:p-5 border-b border-border bg-card dark:bg-zinc-900 space-y-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-bold text-foreground dark:text-gray-100 flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-amber-500" />
              <span>{getSectionTitle()}</span>
            </SheetTitle>
            <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
          </div>

          {/* Submenú Dropdown para cambiar de apartado sin cerrar */}
          <div>
            <Label className="text-[11px] font-medium text-muted-foreground dark:text-gray-400 mb-1 block">
              Cambiar apartado a editar:
            </Label>
            <Select 
              value={activeSection || 'hero'} 
              onValueChange={(val) => openEditor(val as EditableSection)}
            >
              <SelectTrigger className="bg-background dark:bg-zinc-950 text-xs h-9">
                <SelectValue placeholder="Seleccionar apartado..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hero">Hero / Bienvenida</SelectItem>
                <SelectItem value="coleccion_dama">Portada Colección Dama</SelectItem>
                <SelectItem value="coleccion_caballero">Portada Colección Caballero</SelectItem>
                <SelectItem value="explora_categoria">Explora por Categoría</SelectItem>
                <SelectItem value="categorias_grid">Catálogo por Líneas (Dama, Caballero, Infantil)</SelectItem>
                <SelectItem value="destacados">Productos Destacados</SelectItem>
                <SelectItem value="contactos_regionales">Contactos Regionales</SelectItem>
                <SelectItem value="footer_agradecimiento">Mensaje de Agradecimiento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SheetDescription className="text-[11px] text-muted-foreground dark:text-gray-400">
            Personaliza el título, descripción y tamaño de letra en tiempo real
          </SheetDescription>
        </SheetHeader>

        {/* Contenido del Formulario */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in shadow-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section: Hero / Bienvenida */}
          {activeSection === 'hero' && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-foreground dark:text-gray-200">Insignia / Badge de Bienvenida</Label>
                <Input
                  value={storeConfig.heroBadge}
                  onChange={(e) => setStoreConfig({ ...storeConfig, heroBadge: e.target.value })}
                  className="mt-1 bg-background dark:bg-zinc-900 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-foreground dark:text-gray-200">Título Principal</Label>
                <Input
                  value={storeConfig.heroTitle}
                  onChange={(e) => setStoreConfig({ ...storeConfig, heroTitle: e.target.value })}
                  className="mt-1 bg-background dark:bg-zinc-900 text-xs font-serif"
                />
              </div>

              <SizeSelectorControl
                label="Tamaño del Título Principal"
                value={storeConfig.heroTitleSize}
                onChange={(val) => setStoreConfig({ ...storeConfig, heroTitleSize: val })}
              />

              <div>
                <Label className="text-xs font-semibold text-foreground dark:text-gray-200">Mensaje / Descripción</Label>
                <Textarea
                  rows={3}
                  value={storeConfig.heroDescription}
                  onChange={(e) => setStoreConfig({ ...storeConfig, heroDescription: e.target.value })}
                  className="mt-1 bg-background dark:bg-zinc-900 text-xs leading-relaxed"
                />
              </div>

              <SizeSelectorControl
                label="Tamaño del Mensaje"
                value={storeConfig.heroDescriptionSize}
                onChange={(val) => setStoreConfig({ ...storeConfig, heroDescriptionSize: val })}
              />
            </div>
          )}

          {/* Section: Colección Dama */}
          {activeSection === 'coleccion_dama' && (
            <ColeccionProductoSelector
              generoId={1}
              generoNombre="Dama"
              onSuccess={(detalle) => handleSuccessNotification(detalle)}
            />
          )}

          {/* Section: Colección Caballero */}
          {activeSection === 'coleccion_caballero' && (
            <ColeccionProductoSelector
              generoId={2}
              generoNombre="Caballero"
              onSuccess={(detalle) => handleSuccessNotification(detalle)}
            />
          )}

          {/* Section: Explora por Categoría */}
          {activeSection === 'explora_categoria' && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-foreground dark:text-gray-200">Título de la Sección</Label>
                <Input
                  value={storeConfig.exploraTitle}
                  onChange={(e) => setStoreConfig({ ...storeConfig, exploraTitle: e.target.value })}
                  className="mt-1 bg-background dark:bg-zinc-900 text-xs font-serif"
                />
              </div>

              <SizeSelectorControl
                label="Tamaño del Título"
                value={storeConfig.exploraTitleSize}
                onChange={(val) => setStoreConfig({ ...storeConfig, exploraTitleSize: val })}
              />

              <div>
                <Label className="text-xs font-semibold text-foreground dark:text-gray-200">Mensaje / Subtítulo</Label>
                <Textarea
                  rows={4}
                  value={storeConfig.exploraCategoria}
                  onChange={(e) => setStoreConfig({ ...storeConfig, exploraCategoria: e.target.value })}
                  className="mt-1 bg-background dark:bg-zinc-900 text-xs leading-relaxed"
                />
              </div>

              <SizeSelectorControl
                label="Tamaño del Mensaje"
                value={storeConfig.exploraCategoriaSize}
                onChange={(val) => setStoreConfig({ ...storeConfig, exploraCategoriaSize: val })}
              />
            </div>
          )}

          {/* Section: Catálogo por Líneas */}
          {activeSection === 'categorias_grid' && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-foreground dark:text-gray-200">Título del Catálogo por Líneas</Label>
                <Input
                  value={storeConfig.categoriasGridTitle}
                  onChange={(e) => setStoreConfig({ ...storeConfig, categoriasGridTitle: e.target.value })}
                  className="mt-1 bg-background dark:bg-zinc-900 text-xs font-serif"
                />
              </div>

              <SizeSelectorControl
                label="Tamaño del Título"
                value={storeConfig.categoriasGridTitleSize}
                onChange={(val) => setStoreConfig({ ...storeConfig, categoriasGridTitleSize: val })}
              />

              <div>
                <Label className="text-xs font-semibold text-foreground dark:text-gray-200">Subtítulo / Descripción de Líneas</Label>
                <Input
                  value={storeConfig.categoriasGridSubtitle}
                  onChange={(e) => setStoreConfig({ ...storeConfig, categoriasGridSubtitle: e.target.value })}
                  className="mt-1 bg-background dark:bg-zinc-900 text-xs"
                />
              </div>

              <SizeSelectorControl
                label="Tamaño del Subtítulo"
                value={storeConfig.categoriasGridSubtitleSize}
                onChange={(val) => setStoreConfig({ ...storeConfig, categoriasGridSubtitleSize: val })}
              />
            </div>
          )}

          {/* Section: Destacados */}
          {activeSection === 'destacados' && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-foreground dark:text-gray-200">Título de la Sección Destacados</Label>
                <Input
                  value={storeConfig.destacadosTitle}
                  onChange={(e) => setStoreConfig({ ...storeConfig, destacadosTitle: e.target.value })}
                  className="mt-1 bg-background dark:bg-zinc-900 text-xs font-serif"
                />
              </div>

              <SizeSelectorControl
                label="Tamaño del Título"
                value={storeConfig.destacadosTitleSize}
                onChange={(val) => setStoreConfig({ ...storeConfig, destacadosTitleSize: val })}
              />

              <div>
                <Label className="text-xs font-semibold text-foreground dark:text-gray-200">Subtítulo</Label>
                <Input
                  value={storeConfig.destacadosSubtitle}
                  onChange={(e) => setStoreConfig({ ...storeConfig, destacadosSubtitle: e.target.value })}
                  className="mt-1 bg-background dark:bg-zinc-900 text-xs"
                />
              </div>

              <SizeSelectorControl
                label="Tamaño del Subtítulo"
                value={storeConfig.destacadosSubtitleSize}
                onChange={(val) => setStoreConfig({ ...storeConfig, destacadosSubtitleSize: val })}
              />

              <div className="pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => router.push('/catalogo')}
                >
                  Gestión completa de prendas destacadas en Catálogo
                </Button>
              </div>
            </div>
          )}

          {/* Section: Contactos Regionales */}
          {activeSection === 'contactos_regionales' && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-foreground dark:text-gray-200">Título de la Sección Contactos</Label>
                <Input
                  value={storeConfig.contactosTitle}
                  onChange={(e) => setStoreConfig({ ...storeConfig, contactosTitle: e.target.value })}
                  className="mt-1 bg-background dark:bg-zinc-900 text-xs font-serif"
                />
              </div>

              <SizeSelectorControl
                label="Tamaño del Título"
                value={storeConfig.contactosTitleSize}
                onChange={(val) => setStoreConfig({ ...storeConfig, contactosTitleSize: val })}
              />

              <div>
                <Label className="text-xs font-semibold text-foreground dark:text-gray-200">Subtítulo de Contactos</Label>
                <Textarea
                  rows={2}
                  value={storeConfig.contactosSubtitle}
                  onChange={(e) => setStoreConfig({ ...storeConfig, contactosSubtitle: e.target.value })}
                  className="mt-1 bg-background dark:bg-zinc-900 text-xs leading-relaxed"
                />
              </div>

              <SizeSelectorControl
                label="Tamaño del Subtítulo"
                value={storeConfig.contactosSubtitleSize}
                onChange={(val) => setStoreConfig({ ...storeConfig, contactosSubtitleSize: val })}
              />
            </div>
          )}

          {/* Section: Footer Agradecimiento */}
          {activeSection === 'footer_agradecimiento' && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-foreground dark:text-gray-200">Mensaje de Agradecimiento / Comunidad</Label>
                <Textarea
                  rows={3}
                  value={storeConfig.footerAgradecimiento}
                  onChange={(e) => setStoreConfig({ ...storeConfig, footerAgradecimiento: e.target.value })}
                  className="mt-1 bg-background dark:bg-zinc-900 text-xs leading-relaxed"
                />
              </div>

              <SizeSelectorControl
                label="Tamaño del Mensaje"
                value={storeConfig.footerAgradecimientoSize}
                onChange={(val) => setStoreConfig({ ...storeConfig, footerAgradecimientoSize: val })}
              />
            </div>
          )}

          {/* Footer de Acciones de Guardado */}
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
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 rounded-xl shadow-md"
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
