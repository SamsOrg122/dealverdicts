import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function s(v: unknown): string | null {
  return typeof v === 'string' && v.length ? v : null
}

export async function POST(req: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!stripeSecret || !webhookSecret || !supabaseUrl || !serviceRole) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // ✅ import pas hier (build-safe)
  const StripeMod = await import('stripe')
  const Stripe = StripeMod.default
  const { createClient } = await import('@supabase/supabase-js')

  const stripe = new Stripe(stripeSecret, {
    apiVersion: '2025-12-15.clover',
  })

  const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })

  const body = await req.text()

  let event: any
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Bad signature' }, { status: 400 })
  }

  // A) checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = s(session?.metadata?.supabase_user_id) ?? s(session?.client_reference_id)
    const email = session?.customer_details?.email ?? null
    const customerId = s(session?.customer)
    const subscriptionId = s(session?.subscription)

    if (!userId) return NextResponse.json({ received: true })

    const { error } = await supabaseAdmin.from('profiles').upsert(
      {
        id: userId,
        email,
        is_pro: true,
        plan: 'pro',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
      },
      { onConflict: 'id' }
    )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ received: true })
  }

  // B) subscription created/updated
  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    const sub = event.data.object
    const userId = s(sub?.metadata?.supabase_user_id)
    const customerId = s(sub?.customer)
    const subId = s(sub?.id)
    const priceId = sub?.items?.data?.[0]?.price?.id ?? null
    const currentPeriodEndISO =
      sub?.current_period_end != null ? new Date(Number(sub.current_period_end) * 1000).toISOString() : null

    const payload: any = {
      is_pro: true,
      plan: 'pro',
      stripe_customer_id: customerId,
      stripe_subscription_id: subId,
      stripe_price_id: priceId,
      current_period_end: currentPeriodEndISO,
    }

    let q = supabaseAdmin.from('profiles').update(payload)
    const { error } = userId
      ? await q.eq('id', userId)
      : customerId
      ? await q.eq('stripe_customer_id', customerId)
      : subId
      ? await q.eq('stripe_subscription_id', subId)
      : await q.eq('id', '__never__')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ received: true })
  }

  // C) subscription deleted
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    const userId = s(sub?.metadata?.supabase_user_id)
    const customerId = s(sub?.customer)
    const subId = s(sub?.id)

    const payload = {
      is_pro: false,
      plan: 'free',
      stripe_subscription_id: null,
      stripe_price_id: null,
      current_period_end: null,
    }

    let q = supabaseAdmin.from('profiles').update(payload)
    const { error } = userId
      ? await q.eq('id', userId)
      : customerId
      ? await q.eq('stripe_customer_id', customerId)
      : subId
      ? await q.eq('stripe_subscription_id', subId)
      : await q.eq('id', '__never__')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true })
}
