import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JobInteractionRequest {
  user_id: string;
  job_id: string;
  interaction_type: string;
  job_data: any;
  timestamp?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, job_id, interaction_type, job_data, timestamp }: JobInteractionRequest = await req.json()

    console.log('Processing job interaction:', { user_id, job_id, interaction_type, timestamp })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Get user profile for context
    const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user_id}`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      }
    })
    const userData = await userResponse.json()
    const user = userData[0]

    if (!user) {
      throw new Error('User not found')
    }

    // Process different interaction types
    if (interaction_type === 'job_saved') {
      await processJobSavedInteraction(user, job_id, job_data, supabaseUrl, supabaseKey)
    } else if (interaction_type === 'job_applied') {
      await processJobAppliedInteraction(user, job_id, job_data, supabaseUrl, supabaseKey)
    }

    // Log the interaction processing
    await fetch(`${supabaseUrl}/rest/v1/automation_logs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        user_id: user_id,
        workflow_type: 'job_interaction_processed',
        status: 'completed',
        result_data: {
          interaction_type,
          job_id,
          job_title: job_data.job_title,
          processed_at: new Date().toISOString()
        }
      })
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Job interaction processed successfully',
        interaction_type,
        automation_triggered: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Job interaction processing error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

async function processJobSavedInteraction(user: any, jobId: string, jobData: any, supabaseUrl: string, supabaseKey: string) {
  console.log('Processing job saved interaction for user:', user.id)

  // Analyze saved job to improve recommendations
  const jobAnalysis = {
    category: jobData.job_category,
    location: jobData.job_location || 'remote',
    skills: jobData.job_skills || [],
    company: jobData.job_company,
    saved_at: new Date().toISOString()
  }

  // Update user preferences based on saved job patterns
  const { data: recentSavedJobs } = await fetch(`${supabaseUrl}/rest/v1/saved_jobs?user_id=eq.${user.id}&select=*,job:jobs(*)&order=saved_at.desc&limit=10`, {
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey
    }
  }).then(res => res.json())

  if (recentSavedJobs && recentSavedJobs.length >= 3) {
    // Analyze patterns in saved jobs
    const categories = recentSavedJobs.map(saved => saved.job.category)
    const categoryFrequency = categories.reduce((acc, cat) => {
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topCategory = Object.entries(categoryFrequency)
      .sort(([,a], [,b]) => b - a)[0]

    // Update user automation preferences
    if (topCategory && topCategory[1] >= 2) {
      await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseKey
        },
        body: JSON.stringify({
          automation_preferences: {
            ...user.automation_preferences,
            preferred_categories: [topCategory[0]],
            last_preference_update: new Date().toISOString()
          }
        })
      })
    }
  }

  // Trigger job matching for similar jobs
  await fetch(`${supabaseUrl}/functions/v1/job-matching`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_id: user.id,
      context: 'job_saved',
      job_preferences: jobAnalysis
    })
  })

  console.log('Job saved interaction processed:', jobAnalysis)
}

async function processJobAppliedInteraction(user: any, jobId: string, jobData: any, supabaseUrl: string, supabaseKey: string) {
  console.log('Processing job applied interaction for user:', user.id)

  // Set up application follow-up automation
  const followUpSchedule = [
    { days: 7, type: 'first_followup' },
    { days: 14, type: 'second_followup' },
    { days: 30, type: 'final_followup' }
  ]

  // Schedule follow-up reminders (in a real system, this would integrate with a job scheduler)
  for (const followUp of followUpSchedule) {
    const followUpDate = new Date()
    followUpDate.setDate(followUpDate.getDate() + followUp.days)

    await fetch(`${supabaseUrl}/rest/v1/automation_logs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        user_id: user.id,
        workflow_type: 'application_followup_scheduled',
        status: 'pending',
        result_data: {
          job_id: jobId,
          job_title: jobData.job_title,
          followup_type: followUp.type,
          scheduled_for: followUpDate.toISOString(),
          application_date: jobData.applied_at
        }
      })
    })
  }

  // Generate application-specific insights
  await fetch(`${supabaseUrl}/functions/v1/insights-generation`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_id: user.id,
      event_type: 'job_applied',
      event_data: jobData,
      insight_types: ['career_recommendation']
    })
  })

  console.log('Job application follow-up automation set up for:', jobData.job_title)
}