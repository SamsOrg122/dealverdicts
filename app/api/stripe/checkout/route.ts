import { NextResponse } from 'next/server'
import { stripe } from '@/app/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { userId, email } = await req.json()

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId/email' }, { status: 400 })
    }

    const priceId = process.env.STRIPE_PRICE_ID
    if (!priceId) {
      return NextResponse.json({ error: 'Missing STRIPE_PRICE_ID env var' }, { status: 500 })
    }

    // ✅ Always derive a valid origin (with https) from the request (works on Vercel)
    const proto = req.headers.get('x-forwarded-proto') ?? 'https'
    const host = req.headers.get('host')
    if (!host) {
      return NextResponse.json({ error: 'Missing host header' }, { status: 500 })
    }
    const origin = `${proto}://${host}`

    // Reuse customer by email (avoid duplicates)
    const safeEmail = String(email).replace(/"/g, '\\"')
    const existing = await stripe.customers.search({
      query: `email:"${safeEmail}"`,
      limit: 1,
    })

    const customer =
      existing.data?.[0] ??
      (await stripe.customers.create({
        email,
        metadata: { supabase_user_id: userId },
      }))

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/account?success=1`,
      cancel_url: `${origin}/account?canceled=1`,
      client_reference_id: userId,
      metadata: { supabase_user_id: userId },
      subscription_data: {
        metadata: { supabase_user_id: userId },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 })
  }
}
