import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, email, name } = await req.json()

    // Log the user creation event
    console.log('New user created:', { user_id, email, name })

    // Here you can add automation logic:
    // - Send welcome email
    // - Add to mailing list
    // - Trigger onboarding sequence
    // - Notify team via Slack/Discord
    
    // Example: Send welcome email (placeholder)
    const welcomeEmailData = {
      to: email,
      subject: 'Welcome to PlugMode - Your Global Career Journey Starts Now!',
      template: 'welcome',
      data: {
        name: name,
        user_id: user_id
      }
    }

    // This would integrate with your email service
    console.log('Would send welcome email:', welcomeEmailData)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User creation webhook processed successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})