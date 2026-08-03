// app/(store)/contactos/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Phone, MapPin, User, MessageCircle, Instagram, ExternalLink } from 'lucide-react'
import { TikTokIcon } from '@/components/shared/TikTokIcon'

export const metadata: Metadata = {
  title: 'Contactos | Catálogo IDOL NAVY',
  description: 'Atención personalizada y distribuidores autorizados por región. Contacta a nuestros ejecutivos de ventas.',
}

interface Distribuidor {
  region: string
  nombre: string
  telefono: string
  phoneRaw: string
}

const distribuidores: Distribuidor[] = [
  {
    region: 'ZONA CENTRO CDMX',
    nombre: 'Daniel Leyva',
    telefono: '248 125 0472',
    phoneRaw: '522481250472',
  },
  {
    region: 'CHINCONCUAC TEXCOCO',
    nombre: 'Juan',
    telefono: '248 125 1671',
    phoneRaw: '522481251671',
  },
  {
    region: 'TOLUCA EDO MEX',
    nombre: 'Juan',
    telefono: '248 125 1671',
    phoneRaw: '522481251671',
  },
  {
    region: 'SAN MARTÍN TEXMELUCAN PUE',
    nombre: 'Juan',
    telefono: '248 125 1671',
    phoneRaw: '522481251671',
  },
  {
    region: 'TULANCINGO HGO',
    nombre: 'Javier',
    telefono: '56 1549 5410',
    phoneRaw: '525615495410',
  },
  {
    region: 'MOROLEÓN GTO',
    nombre: 'Carlos',
    telefono: '55 3935 6156',
    phoneRaw: '525539356156',
  },
]

export default function ContactosPage() {
  return (
    <div className="bg-[var(--bg)] min-h-screen py-12 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Cabecera principal */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#2D5A3D] bg-[#2D5A3D]/10 px-3 py-1 rounded-full">
            Atención Personalizada
          </span>
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-store-ink tracking-tight">
            CONTACTOS
          </h1>
          <p className="text-sm md:text-base text-store-ink2 leading-relaxed">
            Si tienes preguntas sobre nuestros productos, disponibilidad, tallas o promociones, nuestro equipo estará encantado de atenderte.
          </p>
          <p className="text-sm text-store-ink2 leading-relaxed">
            También puedes contactarnos a través de nuestras redes sociales para conocer novedades, lanzamientos y promociones especiales.
          </p>
          <p className="text-sm font-semibold text-[#2D5A3D]">
            Tu satisfacción es nuestra prioridad. ¡Esperamos tu mensaje!
          </p>
        </div>

        {/* Sección Distribuidores por Región */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-store-border pb-4">
            <h2 className="font-serif text-2xl font-bold text-store-ink tracking-tight flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#2D5A3D]" />
              DISTRIBUIDORES POR REGIÓN
            </h2>
            <span className="text-xs text-store-ink3 hidden sm:inline">
              Ventas directas y atención local
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {distribuidores.map((item, idx) => (
              <div 
                key={idx}
                className="bg-store-surface border border-store-border rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-5 group hover:border-[#2D5A3D]/30"
              >
                <div className="space-y-3">
                  <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-[#2D5A3D] bg-[#2D5A3D]/10 px-2.5 py-1 rounded-md inline-block">
                    {item.region}
                  </span>
                  
                  <div className="flex items-center gap-2.5 pt-1">
                    <div className="w-9 h-9 rounded-full bg-store-bg flex items-center justify-center border border-store-border text-store-ink group-hover:bg-[#2D5A3D] group-hover:text-white transition-colors">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-store-ink text-base">
                        {item.nombre}
                      </h3>
                      <p className="text-xs text-store-ink3 font-mono">
                        {item.telefono}
                      </p>
                    </div>
                  </div>
                </div>

                <a
                  href={`https://wa.me/${item.phoneRaw}?text=Hola%20${encodeURIComponent(item.nombre)},%20vengo%20del%20Cat%C3%A1logo%20IDOL%20NAVY%20y%20me%20gustar%C3%ADa%20solicitar%20informaci%C3%B3n.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-white font-semibold text-xs tracking-wider uppercase transition-colors shadow-xs"
                >
                  <MessageCircle className="h-4 w-4" />
                  Enviar WhatsApp
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Sección Canales Digitales y Redes */}
        <div className="bg-store-surface border border-store-border rounded-2xl p-6 md:p-8 space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="font-serif text-2xl font-bold text-store-ink">
              Canales Oficiales y Redes Sociales
            </h2>
            <p className="text-xs md:text-sm text-store-ink2">
              Sigue nuestras publicaciones diarias para estar al tanto de nuevas prendas, catálogos en tendencia y promociones especiales.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Instagram */}
            <a 
              href="https://www.instagram.com/idol_navy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-amber-500/10 border border-pink-500/20 text-store-ink hover:border-pink-500/40 transition-all shadow-xs group"
            >
              <div className="flex items-center gap-3">
                <Instagram className="h-5 w-5 text-pink-600" />
                <div>
                  <div className="text-xs text-store-ink3 font-medium">Instagram</div>
                  <div className="text-sm font-bold text-store-ink">@idol_navy</div>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-store-ink3 group-hover:text-pink-600 transition-colors" />
            </a>

            {/* TikTok */}
            <a 
              href="https://www.tiktok.com/@idol_navy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-xl bg-black/5 dark:bg-white/10 border border-store-border text-store-ink hover:border-black/30 transition-all shadow-xs group"
            >
              <div className="flex items-center gap-3">
                <TikTokIcon className="h-6 w-6 shrink-0" />
                <div>
                  <div className="text-xs text-store-ink3 font-medium">TikTok</div>
                  <div className="text-sm font-bold text-store-ink">@idol_navy</div>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-store-ink3 group-hover:text-store-ink transition-colors" />
            </a>

            {/* WhatsApp Group */}
            <a 
              href="https://chat.whatsapp.com/KvLFLG2hbYNKU56CGzDjcg" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#128C7E] hover:bg-[#25D366]/20 transition-all shadow-xs group"
            >
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-[#25D366]" />
                <div>
                  <div className="text-xs text-[#128C7E]/80 font-medium">Grupo de Novedades</div>
                  <div className="text-sm font-bold text-[#128C7E]">Comunidad WhatsApp</div>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-[#128C7E]/60 group-hover:text-[#128C7E] transition-colors" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
