import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'inv-tienda' }
})

export function slugify(text: string): string {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '')
}

async function run() {
  console.log('Fetching products...')
  const { data: products, error } = await supabase
    .from('productos_web')
    .select('id, slug')
  
  if (error) {
    console.error('Error fetching products:', error)
    return
  }

  let updatedCount = 0
  
  for (const p of products) {
    const cleanSlug = slugify(p.slug)
    if (p.slug !== cleanSlug) {
      console.log(`Updating slug: "${p.slug}" -> "${cleanSlug}"`)
      const { error: updateError } = await supabase
        .from('productos_web')
        .update({ slug: cleanSlug })
        .eq('id', p.id)
      
      if (updateError) {
        console.error(`Error updating product ${p.id}:`, updateError)
      } else {
        updatedCount++
      }
    }
  }

  console.log(`Finished! Updated ${updatedCount} products.`)
}

run()
