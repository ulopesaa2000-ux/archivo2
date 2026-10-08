// components/store/layout/StoreFooter.tsx
'use client'

import Link from 'next/link'
import { Instagram, Facebook, Twitter, Phone, MessageCircle } from 'lucide-react'
import { TikTokIcon } from '@/components/shared/TikTokIcon'
import { StoreThemeToggle } from './StoreThemeToggle'
import { useConfigEcommerce } from '@/hooks/useConfigEcommerce'
import { parseStoreConfig, getContactosActivos, buildWhatsAppLink } from '@/lib/utils/storeConfig'

export function StoreFooter() {
  const currentYear = new Date().getFullYear()
  const { config } = useConfigEcommerce()
  const contactos = getContactosActivos(parseStoreConfig(config?.mensaje_precio_variable))

  return (
    <footer className="bg-store-surface border-t border-store-border">
      {/* Main footer content */}
      <div className="px-4 md:px-8 py-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand & Regional Contacts column */}
          <div className="space-y-4">
            <Link href="/inicio" className="font-serif text-2xl text-store-ink hover:text-store-accent transition-colors inline-block font-bold">
              Catálogo IDOL NAVY
            </Link>
            <p className="text-xs text-store-ink2 leading-relaxed max-w-xs">
              Catálogo oficial de productos. Prendas diseñadas con estilo, calidad y comodidad para cada ocasión.
            </p>

            {/* Contact info por región */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-store-ink">Atención por Región:</p>
                <Link href="/contactos" className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
                  Ver distribuidores →
                </Link>
              </div>
              <ul className="text-xs text-store-ink2 space-y-1.5 font-sans">
                {contactos.map((contacto) => (
                  <li key={contacto.id}>
                    <a
                      href={buildWhatsAppLink(contacto)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-emerald-600 transition-colors flex items-center justify-between gap-2 group"
                    >
                      <span>• <strong>{contacto.nombre}</strong>{contacto.zona ? ` (${contacto.zona})` : ''}</span>
                      <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400 group-hover:underline shrink-0">{contacto.telefono_display}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Company links */}
          <div className="space-y-4">
            <h3 className="font-serif text-base text-store-ink mb-4 font-bold">Navegación</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/shop?genero=dama" className="text-store-ink2 hover:text-store-accent transition-colors">
                  Categoría Dama
                </Link>
              </li>
              <li>
                <Link href="/shop?genero=caballero" className="text-store-ink2 hover:text-store-accent transition-colors">
                  Categoría Caballero
                </Link>
              </li>
              <li>
                <Link href="/shop?genero=infantil" className="text-store-ink2 hover:text-store-accent transition-colors">
                  Categoría Infantil
                </Link>
              </li>
              <li>
                <Link href="/shop?destacado=true" className="text-store-ink2 hover:text-store-accent transition-colors">
                  Promociones & Destacados
                </Link>
              </li>
              <li>
                <Link href="/contactos" className="text-store-ink2 hover:text-emerald-600 font-semibold transition-colors flex items-center gap-1">
                  <span>Contactos Directos</span>
                  <MessageCircle className="h-3 w-3 text-emerald-600" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Help links */}
          <div className="space-y-4">
            <h3 className="font-serif text-base text-store-ink mb-4 font-bold">Líneas de Producto</h3>
            <ul className="space-y-2 text-xs text-store-ink2">
              <li>Chamarras & Rompevientos</li>
              <li>Chalecos Deportivo / Casual</li>
              <li>Conjuntos & Sudaderas</li>
              <li>Abrigos & Suéteres</li>
            </ul>
          </div>

          {/* Legal links and social */}
          <div className="space-y-4">
            <h3 className="font-serif text-base text-store-ink mb-4 font-bold">Redes y Canales Oficiales</h3>
            <div className="space-y-3">
              <div className="flex flex-col space-y-2 text-xs">
                {/* Instagram */}
                <a 
                  href="https://www.instagram.com/idol_navy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 p-2.5 rounded-lg bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-amber-500/10 border border-pink-500/20 text-store-ink hover:border-pink-500/40 font-medium transition-all shadow-xs"
                >
                  <Instagram className="h-4 w-4 text-pink-600" />
                  <span>Instagram <strong>@idol_navy</strong></span>
                </a>

                {/* TikTok */}
                <a 
                  href="https://www.tiktok.com/@idol_navy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 p-2.5 rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/10 border border-store-border text-store-ink font-medium transition-all shadow-xs"
                >
                  <TikTokIcon className="h-5 w-5 shrink-0" />
                  <span>TikTok <strong>@idol_navy</strong></span>
                </a>

                {/* WhatsApp Group */}
                <a 
                  href="https://chat.whatsapp.com/KvLFLG2hbYNKU56CGzDjcg" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 p-2.5 rounded-lg bg-[#25D366]/10 border border-[#25D366]/30 text-[#128C7E] font-medium hover:bg-[#25D366]/20 transition-all shadow-xs"
                >
                  <Phone className="h-4 w-4 text-[#25D366]" />
                  <span>Grupo Oficial WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-store-bg border-t border-store-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-store-ink3 text-center md:text-left">
            © {currentYear} Catálogo IDOL NAVY. Todos los derechos reservados.
          </p>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-store-ink3 hidden sm:inline">Tema:</span>
            <StoreThemeToggle variant="segmented" size="sm" />
          </div>

          <div className="flex items-center gap-4 text-xs text-store-ink3">
            <Link href="/contactos" className="hover:underline">
              Página de Contactos
            </Link>
            <span>•</span>
            <span>Catálogo e-Commerce & B2B</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
