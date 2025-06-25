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
    const { user_id, fields_updated, profile_data } = await req.json()

    // Log the profile update event
    console.log('User profile updated:', { user_id, fields_updated, profile_data })

    // Automation logic based on profile completion:
    // - Calculate profile completion percentage
    // - Trigger job matching if profile is complete enough
    // - Send personalized recommendations
    // - Update user segments for targeted campaigns

    const profileCompletion = calculateProfileCompletion(profile_data)
    
    if (profileCompletion >= 75) {
      // Trigger advanced job matching
      console.log('Profile complete enough for advanced matching:', user_id)
      
      // This would trigger job matching algorithm
      const matchingData = {
        user_id: user_id,
        skills: profile_data.skills,
        experience_level: profile_data.experience_level,
        location: profile_data.location
      }
      
      console.log('Would trigger job matching:', matchingData)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Profile update webhook processed successfully',
        profile_completion: profileCompletion
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

function calculateProfileCompletion(profile: any): number {
  let completion = 25 // Base for having an account
  
  if (profile.name) completion += 25
  if (profile.location) completion += 25
  if (profile.skills && profile.skills.length > 0) completion += 25
  
  return completion
}