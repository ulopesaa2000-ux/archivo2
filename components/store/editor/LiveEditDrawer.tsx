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
import { Edit3, Save, CheckCircle2, AlertCircle, Type, Sparkles, Plus, Trash2, Palette } from 'lucide-react'
import { useLiveStoreEditor, EditableSection } from './LiveStoreEditorContext'
import { useConfigEcommerce } from '@/hooks/useConfigEcommerce'
import { actualizarConfigEcommerce } from '@/modules/ecommerce/actions'
import { ColeccionProductoSelector } from './ColeccionProductoSelector'
import { ContactosListEditor } from './ContactosListEditor'
import { RedesSocialesListEditor } from './RedesSocialesListEditor'
import {
  parseStoreConfig,
  serializeStoreConfig,
  ParsedStoreConfig,
  DEFAULT_STORE_CONFIG,
  TextSizeOption,
  SECTION_BG_OPTIONS,
  type SectionBgTheme,
  type SectionBgIntensity,
  type QuickNavItem,
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
      case 'seo_general': return 'SEO General y Redes'
      case 'barra_rapida': return 'Barra Rápida (Izquierda / Prendas)'
      case 'redes_sociales': return 'Redes y Canales Oficiales'
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

  const BackgroundThemeSelector = ({
    value,
    onChange,
    intensity,
    onIntensityChange,
  }: {
    value: SectionBgTheme
    onChange: (val: SectionBgTheme) => void
    intensity: SectionBgIntensity
    onIntensityChange: (val: SectionBgIntensity) => void
  }) => (
    <div className="space-y-3 pt-2 border-t border-border">
      <Label className="text-xs font-semibold text-foreground dark:text-gray-200 flex items-center gap-1.5">
        <Palette className="h-3.5 w-3.5 text-emerald-500" />
        <span>Fondo Neutro Difuminado (Claro / Oscuro)</span>
      </Label>
      <div className="grid grid-cols-5 gap-2">
        {SECTION_BG_OPTIONS.map((opt) => {
          const isSelected = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              title={opt.label}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border text-[10px] font-medium transition-all ${
                isSelected
                  ? 'border-emerald-600 ring-2 ring-emerald-500/30 bg-emerald-500/5 font-bold'
                  : 'border-border hover:border-foreground/30'
              }`}
            >
              <span className={`w-full h-7 rounded-lg border border-black/10 dark:border-white/10 ${opt.swatchClass}`} />
              <span className="truncate w-full text-center leading-tight">{opt.label}</span>
            </button>
          )
        })}
      </div>

      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-muted-foreground block">
          Intensidad del difuminado:
        </span>
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: 'suave' as SectionBgIntensity, label: 'Suave' },
            { id: 'medio' as SectionBgIntensity, label: 'Medio' },
            { id: 'intenso' as SectionBgIntensity, label: 'Intenso' },
          ]).map((lvl) => {
            const active = intensity === lvl.id
            return (
              <button
                key={lvl.id}
                type="button"
                onClick={() => onIntensityChange(lvl.id)}
                className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all ${
                  active
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-card text-foreground border-border hover:bg-muted dark:bg-zinc-900'
                }`}
              >
                {lvl.label}
              </button>
            )
          })}
        </div>
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
                <SelectItem value="barra_rapida">Barra Rápida (Izquierda / Prendas)</SelectItem>
                <SelectItem value="redes_sociales">Redes y Canales Oficiales</SelectItem>
                <SelectItem value="seo_general">SEO General y Redes (Google / WhatsApp)</SelectItem>
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

              <BackgroundThemeSelector
                value={storeConfig.heroBgTheme}
                onChange={(val) => setStoreConfig({ ...storeConfig, heroBgTheme: val })}
                intensity={storeConfig.heroBgIntensity}
                onIntensityChange={(val) => setStoreConfig({ ...storeConfig, heroBgIntensity: val })}
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

              <BackgroundThemeSelector
                value={storeConfig.exploraBgTheme}
                onChange={(val) => setStoreConfig({ ...storeConfig, exploraBgTheme: val })}
                intensity={storeConfig.exploraBgIntensity}
                onIntensityChange={(val) => setStoreConfig({ ...storeConfig, exploraBgIntensity: val })}
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

              <BackgroundThemeSelector
                value={storeConfig.categoriasBgTheme}
                onChange={(val) => setStoreConfig({ ...storeConfig, categoriasBgTheme: val })}
                intensity={storeConfig.categoriasBgIntensity}
                onIntensityChange={(val) => setStoreConfig({ ...storeConfig, categoriasBgIntensity: val })}
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

              <BackgroundThemeSelector
                value={storeConfig.destacadosBgTheme}
                onChange={(val) => setStoreConfig({ ...storeConfig, destacadosBgTheme: val })}
                intensity={storeConfig.destacadosBgIntensity}
                onIntensityChange={(val) => setStoreConfig({ ...storeConfig, destacadosBgIntensity: val })}
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

              <BackgroundThemeSelector
                value={storeConfig.contactosBgTheme}
                onChange={(val) => setStoreConfig({ ...storeConfig, contactosBgTheme: val })}
                intensity={storeConfig.contactosBgIntensity}
                onIntensityChange={(val) => setStoreConfig({ ...storeConfig, contactosBgIntensity: val })}
              />

              <ContactosListEditor
                value={storeConfig.contactosLista}
                onChange={(next) => setStoreConfig({ ...storeConfig, contactosLista: next })}
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

              <BackgroundThemeSelector
                value={storeConfig.footerBgTheme}
                onChange={(val) => setStoreConfig({ ...storeConfig, footerBgTheme: val })}
                intensity={storeConfig.footerBgIntensity}
                onIntensityChange={(val) => setStoreConfig({ ...storeConfig, footerBgIntensity: val })}
              />
            </div>
          )}

          {/* Section: Redes y Canales Oficiales */}
          {activeSection === 'redes_sociales' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground dark:text-gray-200">
                  Título de la sección en Footer
                </Label>
                <Input
                  value={storeConfig.redesSocialesTitle}
                  onChange={(e) => setStoreConfig({ ...storeConfig, redesSocialesTitle: e.target.value })}
                  placeholder="Redes y Canales Oficiales"
                  className="bg-background dark:bg-zinc-950 text-xs"
                />
              </div>

              <RedesSocialesListEditor
                value={storeConfig.redesSocialesLista}
                onChange={(next) => setStoreConfig({ ...storeConfig, redesSocialesLista: next })}
              />
            </div>
          )}

          {/* Section: Barra Rápida (Izquierda / Prendas) */}
          {activeSection === 'barra_rapida' && (
            <div className="space-y-6">
              {([
                { key: 'quickNavIzquierda' as const, title: 'Lado Izquierdo (Campañas / Estados)', placeholderLabel: 'Ej. Novedades', placeholderHref: '/shop?nuevo=true' },
                { key: 'quickNavDerecha' as const, title: 'Lado Derecho (Prendas)', placeholderLabel: 'Ej. Chamarras', placeholderHref: '/shop?tipo=chamarras' },
              ]).map((group) => {
                const items: QuickNavItem[] = storeConfig[group.key] || []
                const updateList = (next: QuickNavItem[]) =>
                  setStoreConfig({ ...storeConfig, [group.key]: next })

                return (
                  <div key={group.key} className="space-y-3 border border-border rounded-xl p-3.5 bg-card dark:bg-zinc-900">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{group.title}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] gap-1"
                        onClick={() =>
                          updateList([
                            ...items,
                            { id: `qn-${Date.now()}`, label: 'Nuevo', href: '/shop', activo: true },
                          ])
                        }
                      >
                        <Plus className="h-3 w-3" /> Agregar
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {items.map((item, idx) => (
                        <div key={item.id} className="grid grid-cols-[1fr_1fr_auto_auto] gap-1.5 items-center">
                          <Input
                            value={item.label}
                            placeholder={group.placeholderLabel}
                            onChange={(e) => {
                              const copy = [...items]
                              copy[idx] = { ...item, label: e.target.value }
                              updateList(copy)
                            }}
                            className="h-8 text-xs"
                          />
                          <Input
                            value={item.href}
                            placeholder={group.placeholderHref}
                            onChange={(e) => {
                              const copy = [...items]
                              copy[idx] = { ...item, href: e.target.value }
                              updateList(copy)
                            }}
                            className="h-8 text-[11px] font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const copy = [...items]
                              copy[idx] = { ...item, activo: !item.activo }
                              updateList(copy)
                            }}
                            className={`h-8 px-2 rounded-md text-[10px] font-bold border ${
                              item.activo
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                            title={item.activo ? 'Visible' : 'Oculto'}
                          >
                            {item.activo ? 'ON' : 'OFF'}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateList(items.filter((_, i) => i !== idx))}
                            className="h-8 w-8 rounded-md border border-border hover:bg-red-500/10 text-red-500 flex items-center justify-center"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Section: SEO General y Redes */}
          {activeSection === 'seo_general' && (
            <div className="space-y-4">
              {/* Vista previa en Google */}
              <div className="rounded-xl border border-border bg-card dark:bg-zinc-900 p-3.5 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Vista previa en Google
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate">
                  https://wear.sistemaindumentaria.com
                </div>
                <div className="text-sm font-semibold text-blue-700 dark:text-blue-400 line-clamp-1">
                  {storeConfig.seoTitle}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {storeConfig.seoDescription}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground dark:text-gray-200">
                    Título SEO (Pestaña / Google)
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    {storeConfig.seoTitle.length}/60 rec.
                  </span>
                </div>
                <Input
                  value={storeConfig.seoTitle}
                  onChange={(e) => setStoreConfig({ ...storeConfig, seoTitle: e.target.value })}
                  className="mt-1 bg-background dark:bg-zinc-900 text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground dark:text-gray-200">
                    Meta Descripción
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    {storeConfig.seoDescription.length}/160 rec.
                  </span>
                </div>
                <Textarea
                  rows={3}
                  value={storeConfig.seoDescription}
                  onChange={(e) => setStoreConfig({ ...storeConfig, seoDescription: e.target.value })}
                  className="mt-1 bg-background dark:bg-zinc-900 text-xs leading-relaxed"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-foreground dark:text-gray-200">
                  Palabras Clave (Keywords separadas por coma)
                </Label>
                <Input
                  value={storeConfig.seoKeywords}
                  onChange={(e) => setStoreConfig({ ...storeConfig, seoKeywords: e.target.value })}
                  className="mt-1 bg-background dark:bg-zinc-900 text-xs"
                />
              </div>

              <div className="pt-2 border-t border-border space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  OpenGraph (WhatsApp / Facebook)
                </div>
                <div>
                  <Label className="text-xs font-semibold text-foreground dark:text-gray-200">
                    Título al compartir
                  </Label>
                  <Input
                    value={storeConfig.ogTitle}
                    onChange={(e) => setStoreConfig({ ...storeConfig, ogTitle: e.target.value })}
                    className="mt-1 bg-background dark:bg-zinc-900 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-foreground dark:text-gray-200">
                    Descripción al compartir
                  </Label>
                  <Textarea
                    rows={2}
                    value={storeConfig.ogDescription}
                    onChange={(e) => setStoreConfig({ ...storeConfig, ogDescription: e.target.value })}
                    className="mt-1 bg-background dark:bg-zinc-900 text-xs leading-relaxed"
                  />
                </div>
              </div>
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
