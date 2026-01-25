import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id;
  const tier = session.metadata?.tier;
  const plan = session.metadata?.plan;

  if (!userId || !tier || !plan) return;

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const isInTrial = subscription.status === 'trialing';

  await supabase
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_plan: plan,
      subscription_status: subscription.status,
      billing_cycle: subscription.items.data[0].price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
      stripe_subscription_id: subscription.id,
      stripe_price_id: subscription.items.data[0].price.id,
      subscription_start_date: new Date(subscription.created * 1000).toISOString(),
      subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      has_had_trial: isInTrial || undefined,
      trial_start_date: isInTrial ? new Date(subscription.trial_start! * 1000).toISOString() : null,
      trial_end_date: isInTrial ? new Date(subscription.trial_end! * 1000).toISOString() : null,
    })
    .eq('id', userId);

  // Initialize usage tracking
  const periodStart = new Date();
  const periodEnd = new Date(subscription.current_period_end * 1000);

  await supabase.from('user_usage').upsert({
    user_id: userId,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    cim_analyses_count: 0,
    ioi_generations_count: 0,
    loi_generations_count: 0,
  }, {
    onConflict: 'user_id,period_start'
  });
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  let userId = subscription.metadata?.supabase_user_id;
  
  if (!userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .single();
    if (!profile) return;
    userId = profile.id;
  }

  const tier = subscription.metadata?.tier;
  const plan = subscription.metadata?.plan;

  await supabase
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_plan: plan,
      subscription_status: subscription.status,
      subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  // If trial just ended, update trial history
  if (subscription.status === 'active' && subscription.trial_end) {
    await supabase
      .from('trial_history')
      .update({
        trial_ended_at: new Date(subscription.trial_end * 1000).toISOString(),
        converted_to_paid: true,
      })
      .eq('stripe_customer_id', subscription.customer as string)
      .is('trial_ended_at', null);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await supabase
    .from('profiles')
    .update({
      subscription_status: 'canceled',
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);

  await supabase
    .from('profiles')
    .update({
      subscription_status: 'active',
      subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  await supabase
    .from('profiles')
    .update({
      subscription_status: 'past_due',
    })
    .eq('stripe_subscription_id', invoice.subscription as string);
}
