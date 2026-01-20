import { NextResponse } from 'next/server'
import { stripe } from '@/app/lib/stripe'

export async function POST(req: Request) {
  try {
    const { userId, email } = await req.json()

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId/email' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!
    const priceId = process.env.STRIPE_PRICE_ID!

    const customer = await stripe.customers.create({
      email,
      metadata: { supabase_user_id: userId },
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/account?success=1`,
      cancel_url: `${appUrl}/account?canceled=1`,
      metadata: { supabase_user_id: userId },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 })
  }
}
