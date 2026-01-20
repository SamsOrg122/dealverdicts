import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { stripe } from '@/app/lib/stripe'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getString(v: unknown) {
  return typeof v === 'string' ? v : null
}

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    console.error('❌ Missing stripe-signature or STRIPE_WEBHOOK_SECRET')
    return NextResponse.json({ error: 'Webhook misconfigured' }, { status: 400 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('❌ Signature verification failed:', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Bad signature' }, { status: 400 })
  }

  try {
    // -------------------------
    // 1) checkout.session.completed
    // -------------------------
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      const userId =
        getString(session.metadata?.supabase_user_id) ??
        getString(session.client_reference_id)

      const email = session.customer_details?.email ?? null
      const customerId = getString(session.customer)
      const subscriptionId = getString(session.subscription)

      console.log('✅ checkout.session.completed', { userId, email, customerId, subscriptionId })

      if (!userId) return NextResponse.json({ received: true })

      const { error } = await supabaseAdmin
        .from('profiles')
        .upsert(
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

      if (error) {
        console.error('❌ Supabase upsert error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ received: true })
    }

    // -------------------------
    // 2) invoice.paid (keep Pro + period end + price id)
    // -------------------------
if (event.type === 'invoice.paid') {
  const invoice: any = event.data.object // <- any: voorkomt "subscription bestaat niet"

  const subId = getString(invoice.subscription)
  const customerId = getString(invoice.customer)

  if (!subId && !customerId) return NextResponse.json({ received: true })

  // subscription ophalen + unwrap (sommige Stripe versies returnen Response<Subscription>)
  const subResp: any = subId ? await stripe.subscriptions.retrieve(subId) : null
  const sub: any = subResp ? (subResp.data ?? subResp) : null

  const userId = sub ? getString(sub.metadata?.supabase_user_id) : null
  const priceId = sub?.items?.data?.[0]?.price?.id ?? null

  const currentPeriodEndISO =
    sub?.current_period_end != null ? new Date(Number(sub.current_period_end) * 1000).toISOString() : null

  const updatePayload: any = {
    is_pro: true,
    plan: 'pro',
    stripe_customer_id: customerId,
    stripe_subscription_id: subId,
    stripe_price_id: priceId,
    current_period_end: currentPeriodEndISO,
  }

  let q = supabaseAdmin.from('profiles').update(updatePayload)

  const { error } = userId
    ? await q.eq('id', userId)
    : customerId
    ? await q.eq('stripe_customer_id', customerId)
    : await q.eq('stripe_subscription_id', subId as string)

  if (error) {
    console.error('❌ Supabase update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

    // -------------------------
    // 3) customer.subscription.deleted (revert to Free)
    // -------------------------
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription

      const userId = getString(sub.metadata?.supabase_user_id)
      const customerId = getString(sub.customer)
      const subId = getString(sub.id)

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
        : await q.eq('stripe_subscription_id', subId as string)

      if (error) {
        console.error('❌ Supabase revert error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ received: true })
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('❌ Webhook handler error:', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Webhook error' }, { status: 500 })
  }
}
