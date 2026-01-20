import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anon) {
  throw new Error(
    `Supabase env ontbreekt:
NEXT_PUBLIC_SUPABASE_URL = ${url ? 'OK' : 'MIST'}
NEXT_PUBLIC_SUPABASE_ANON_KEY = ${anon ? 'OK' : 'MIST'}

Fix:
1) .env.local moet in de ROOT staan (naast package.json)
2) Na wijzigen: server herstarten (Ctrl+C, daarna npm run dev)
`
  )
}

export const supabase = createClient(url, anon)
