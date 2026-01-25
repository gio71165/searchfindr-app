import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim().replace(/^["']|["']$/g, '');
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(key, {
    apiVersion: '2025-12-15.clover',
  });
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Price ID mapping from env
function getPriceIds() {
  return {
    self_funded_early_bird_monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SELF_FUNDED_EARLY_MONTHLY!,
    self_funded_early_bird_yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SELF_FUNDED_EARLY_YEARLY!,
    search_fund_early_bird_monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SEARCH_FUND_EARLY_MONTHLY!,
    search_fund_early_bird_yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SEARCH_FUND_EARLY_YEARLY!,
  };
}

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const supabase = getSupabase();
    const PRICE_IDS = getPriceIds();
    const { tier, plan, billingCycle, userId, email } = await req.json();

    if (!tier || !plan || !billingCycle || !userId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check trial eligibility
    const { data: isEligible } = await supabase.rpc('check_trial_eligibility', {
      p_user_id: userId,
      p_email: email
    });

    const isTrialEligible = isEligible === true;

    // Get price ID
    const priceKey = `${tier}_${plan}_${billingCycle}` as keyof typeof PRICE_IDS;
    const priceId = PRICE_IDS[priceKey];

    if (!priceId) {
      return NextResponse.json({ error: 'Invalid subscription configuration' }, { status: 400 });
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      
      subscription_data: isTrialEligible ? {
        trial_period_days: 7,
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'cancel',
          },
        },
        metadata: {
          supabase_user_id: userId,
          tier,
          plan,
          billing_cycle: billingCycle,
        },
      } : {
        metadata: {
          supabase_user_id: userId,
          tier,
          plan,
          billing_cycle: billingCycle,
        },
      },
      
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      
      metadata: {
        supabase_user_id: userId,
        tier,
        plan,
      },
      
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    // Create trial history if eligible
    if (isTrialEligible) {
      await supabase.from('trial_history').insert({
        user_id: userId,
        email,
        stripe_customer_id: customerId,
        trial_started_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      isTrialEligible,
    });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
