import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RevenueCatEvent {
  api_version: string;
  event: {
    id: string;
    type: string;
    event_timestamp_ms: number;
    app_user_id: string;
    aliases?: string[];
    original_app_user_id?: string;
    product_id?: string;
    period_type?: string;
    purchased_at_ms?: number;
    expiration_at_ms?: number;
    environment?: string;
    entitlement_id?: string;
    entitlement_ids?: string[];
    presented_offering_id?: string;
    transaction_id?: string;
    original_transaction_id?: string;
    is_family_share?: boolean;
    country_code?: string;
    app_id?: string;
    offer_code?: string;
    currency?: string;
    price?: number;
    price_in_purchased_currency?: number;
    subscriber_attributes?: Record<string, any>;
    store?: string;
    takehome_percentage?: number;
    tax_percentage?: number;
    commission_percentage?: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const event: RevenueCatEvent = await req.json()
    
    console.log('Received RevenueCat webhook:', {
      type: event.event.type,
      user_id: event.event.app_user_id,
      event_id: event.event.id
    })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Process different event types
    switch (event.event.type) {
      case 'INITIAL_PURCHASE':
        await handleSubscriptionStart(event, supabaseUrl, supabaseKey)
        break
      case 'RENEWAL':
        await handleSubscriptionRenewal(event, supabaseUrl, supabaseKey)
        break
      case 'CANCELLATION':
        await handleSubscriptionCancellation(event, supabaseUrl, supabaseKey)
        break
      case 'EXPIRATION':
        await handleSubscriptionExpiration(event, supabaseUrl, supabaseKey)
        break
      case 'PRODUCT_CHANGE':
        await handleSubscriptionChange(event, supabaseUrl, supabaseKey)
        break
      default:
        console.log('Unhandled event type:', event.event.type)
    }

    // Log the event
    await logSubscriptionEvent(event, supabaseUrl, supabaseKey)

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Webhook processing error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed',
        message: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

async function handleSubscriptionStart(event: RevenueCatEvent, supabaseUrl: string, supabaseKey: string) {
  const userId = event.event.app_user_id
  const tier = determineTierFromProduct(event.event.product_id)
  
  console.log('Processing subscription start:', { userId, tier, productId: event.event.product_id })

  // Update user subscription
  const { error } = await fetch(`${supabaseUrl}/rest/v1/user_subscriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      user_id: userId,
      subscription_tier: tier,
      subscription_status: 'active',
      revenuecat_customer_id: event.event.original_app_user_id || userId,
      current_period_start: new Date(event.event.purchased_at_ms || Date.now()).toISOString(),
      current_period_end: event.event.expiration_at_ms ? new Date(event.event.expiration_at_ms).toISOString() : null,
      updated_at: new Date().toISOString()
    })
  })

  if (error) {
    console.error('Error updating subscription:', error)
  }

  console.log('Subscription started successfully for user:', userId)
}

async function handleSubscriptionRenewal(event: RevenueCatEvent, supabaseUrl: string, supabaseKey: string) {
  const userId = event.event.app_user_id
  
  console.log('Processing subscription renewal for user:', userId)

  // Update subscription period
  const { error } = await fetch(`${supabaseUrl}/rest/v1/user_subscriptions?user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'apikey': supabaseKey
    },
    body: JSON.stringify({
      subscription_status: 'active',
      current_period_start: new Date(event.event.purchased_at_ms || Date.now()).toISOString(),
      current_period_end: event.event.expiration_at_ms ? new Date(event.event.expiration_at_ms).toISOString() : null,
      updated_at: new Date().toISOString()
    })
  })

  if (error) {
    console.error('Error updating subscription renewal:', error)
  }

  console.log('Subscription renewed successfully for user:', userId)
}

async function handleSubscriptionCancellation(event: RevenueCatEvent, supabaseUrl: string, supabaseKey: string) {
  const userId = event.event.app_user_id
  
  console.log('Processing subscription cancellation for user:', userId)

  // Update subscription status to cancelled (but keep access until expiration)
  const { error } = await fetch(`${supabaseUrl}/rest/v1/user_subscriptions?user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'apikey': supabaseKey
    },
    body: JSON.stringify({
      subscription_status: 'cancelled',
      updated_at: new Date().toISOString()
    })
  })

  if (error) {
    console.error('Error updating subscription cancellation:', error)
  }

  console.log('Subscription cancelled for user:', userId)
}

async function handleSubscriptionExpiration(event: RevenueCatEvent, supabaseUrl: string, supabaseKey: string) {
  const userId = event.event.app_user_id
  
  console.log('Processing subscription expiration for user:', userId)

  // Downgrade to free tier
  const { error } = await fetch(`${supabaseUrl}/rest/v1/user_subscriptions?user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'apikey': supabaseKey
    },
    body: JSON.stringify({
      subscription_tier: 'free',
      subscription_status: 'expired',
      updated_at: new Date().toISOString()
    })
  })

  if (error) {
    console.error('Error updating subscription expiration:', error)
  }

  console.log('Subscription expired for user:', userId)
}

async function handleSubscriptionChange(event: RevenueCatEvent, supabaseUrl: string, supabaseKey: string) {
  const userId = event.event.app_user_id
  const newTier = determineTierFromProduct(event.event.product_id)
  
  console.log('Processing subscription change:', { userId, newTier, productId: event.event.product_id })

  // Update subscription tier
  const { error } = await fetch(`${supabaseUrl}/rest/v1/user_subscriptions?user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'apikey': supabaseKey
    },
    body: JSON.stringify({
      subscription_tier: newTier,
      subscription_status: 'active',
      current_period_end: event.event.expiration_at_ms ? new Date(event.event.expiration_at_ms).toISOString() : null,
      updated_at: new Date().toISOString()
    })
  })

  if (error) {
    console.error('Error updating subscription change:', error)
  }

  console.log('Subscription changed successfully for user:', userId)
}

async function logSubscriptionEvent(event: RevenueCatEvent, supabaseUrl: string, supabaseKey: string) {
  const tier = determineTierFromProduct(event.event.product_id)
  
  try {
    await fetch(`${supabaseUrl}/rest/v1/subscription_events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        user_id: event.event.app_user_id,
        event_type: event.event.type.toLowerCase(),
        subscription_tier: tier,
        revenuecat_event_id: event.event.id,
        revenuecat_customer_id: event.event.original_app_user_id || event.event.app_user_id,
        event_data: event.event,
        processed_at: new Date().toISOString()
      })
    })
  } catch (error) {
    console.error('Error logging subscription event:', error)
  }
}

function determineTierFromProduct(productId?: string): string {
  if (!productId) return 'free'
  
  if (productId.includes('professional') || productId.includes('pro')) {
    return 'professional'
  } else if (productId.includes('career_os') || productId.includes('premium') || productId.includes('ultimate')) {
    return 'career_os'
  }
  
  return 'free'
}