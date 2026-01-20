import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRole) {
  throw new Error(
    `Supabase Admin env ontbreekt:
NEXT_PUBLIC_SUPABASE_URL = ${url ? 'OK' : 'MIST'}
SUPABASE_SERVICE_ROLE_KEY = ${serviceRole ? 'OK' : 'MIST'}

Fix:
- Zet SUPABASE_SERVICE_ROLE_KEY in .env.local
- Herstart dev server (Ctrl+C → npm run dev)
`
  )
}

// Server-only client (NOOIT importeren in client components)
export const supabaseAdmin = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
})
