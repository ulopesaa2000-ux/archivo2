import fs from 'fs'

async function run() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/?apikey=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
  const res = await fetch(url, {
    headers: { 'Accept-Profile': 'inv-tienda' }
  })
  const json = await res.json()
  console.log(Object.keys(json))
  if (json.definitions) console.log(Object.keys(json.definitions))
}

run()
