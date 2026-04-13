'use client'

// components/store/layout/StoreFooter.tsx
import Link from 'next/link'
import { Instagram, Facebook, Twitter, Mail, Phone, MapPin } from 'lucide-react'

export function StoreFooter() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    empresa: [
      { name: 'Nosotros', href: '/nosotros' },
      { name: 'Historia', href: '/historia' },
      { name: 'Sostenibilidad', href: '/sostenibilidad' },
      { name: 'Contacto', href: '/contacto' },
    ],
    ayuda: [
      { name: 'Envíos', href: '/envios' },
      { name: 'Devoluciones', href: '/devoluciones' },
      { name: 'Tallas', href: '/tallas' },
      { name: 'Preguntas Frecuentes', href: '/faq' },
    ],
    legal: [
      { name: 'Términos y Condiciones', href: '/terminos' },
      { name: 'Política de Privacidad', href: '/privacidad' },
      { name: 'Política de Cookies', href: '/cookies' },
    ],
  }

  const socialLinks = [
    { icon: Instagram, href: 'https://instagram.com/inv-tienda', label: 'Instagram' },
    { icon: Facebook, href: 'https://facebook.com/inv-tienda', label: 'Facebook' },
    { icon: Twitter, href: 'https://twitter.com/inv-tienda', label: 'Twitter' },
  ]

  return (
    <footer className="bg-store-surface border-t border-store-border">
      {/* Main footer content */}
      <div className="px-4 md:px-8 py-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand column */}
          <div className="space-y-4">
            <Link href="/" className="font-serif text-2xl text-store-ink hover:text-store-accent transition-colors inline-block">
              inv-tienda
            </Link>
            <p className="text-sm text-store-ink2 leading-relaxed max-w-xs">
              Moda que te define. Prendas de calidad con materiales exclusivos para expresar tu estilo único.
            </p>

            {/* Contact info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-store-ink2">
                <Phone className="h-4 w-4 text-store-accent" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-store-ink2">
                <Mail className="h-4 w-4 text-store-accent" />
                <span>hola@inv-tienda.com</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-store-ink2">
                <MapPin className="h-4 w-4 text-store-accent" />
                <span>Calle Moda 123, Ciudad</span>
              </div>
            </div>
          </div>

          {/* Company links */}
          <div className="space-y-4">
            <h3 className="font-serif text-lg text-store-ink mb-4">Empresa</h3>
            <ul className="space-y-2">
              {footerLinks.empresa.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-store-ink2 hover:text-store-accent transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help links */}
          <div className="space-y-4">
            <h3 className="font-serif text-lg text-store-ink mb-4">Ayuda</h3>
            <ul className="space-y-2">
              {footerLinks.ayuda.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-store-ink2 hover:text-store-accent transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links and social */}
          <div className="space-y-4">
            <h3 className="font-serif text-lg text-store-ink mb-4">Legal</h3>
            <ul className="space-y-2 mb-6">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-store-ink2 hover:text-store-accent transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Social links */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-store-ink">Síguenos</h4>
              <div className="flex gap-3">
                {socialLinks.map((social) => (
                  <Link
                    key={social.label}
                    href={social.href}
                    className="w-10 h-10 bg-store-bg border border-store-border rounded-lg flex items-center justify-center text-store-ink hover:bg-store-accent hover:text-white transition-all duration-300 hover:scale-110"
                    aria-label={social.label}
                  >
                    <social.icon className="h-5 w-5" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-store-bg border-t border-store-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-store-ink3">
            © {currentYear} inv-tienda. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4 text-xs text-store-ink3">
            <span>Diseñado con ❤️ en México</span>
            <div className="w-px h-4 bg-store-border"></div>
            <span>Envíos a nivel nacional</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
