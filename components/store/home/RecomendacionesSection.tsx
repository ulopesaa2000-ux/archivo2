// components/store/home/RecomendacionesSection.tsx
import { fetchConfigEcommerce, fetchProductosRecomendadosHome } from '@/modules/ecommerce/queries'
import { ProductCarouselRail } from './ProductCarouselRail'

export async function RecomendacionesSection({ excludeIds = [] }: { excludeIds?: number[] }) {
  const [{ tendencias, novedades }, config] = await Promise.all([
    fetchProductosRecomendadosHome(excludeIds),
    fetchConfigEcommerce(),
  ])

  return (
    <>
      <ProductCarouselRail
        title="Tendencias y Más Vistos"
        subtitle="Lo que otros compradores están explorando ahora"
        href="/shop"
        hrefLabel="Explorar tendencias"
        productos={tendencias}
        config={config}
        badgeType="trending"
      />
      <ProductCarouselRail
        title="Te Puede Interesar"
        subtitle="Selección recomendada para ti de nuestra colección"
        href="/shop?nuevo=true"
        hrefLabel="Ver más prendas"
        productos={novedades}
        config={config}
        badgeType="recommended"
      />
    </>
  )
}
