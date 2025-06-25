import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RecommendationRequest {
  user_id: string;
  event_type?: string;
  event_data?: any;
  recommendation_types?: string[];
  context?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, event_type, event_data, recommendation_types, context }: RecommendationRequest = await req.json()

    console.log('Calculating recommendations for user:', { user_id, event_type, recommendation_types })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Get user profile and activity
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

    // Get user's job interactions
    const savedJobsResponse = await fetch(`${supabaseUrl}/rest/v1/saved_jobs?user_id=eq.${user_id}&select=*,job:jobs(*)&order=saved_at.desc&limit=20`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      }
    })
    const savedJobs = await savedJobsResponse.json()

    // Get user's applications
    const applicationsResponse = await fetch(`${supabaseUrl}/rest/v1/applications?user_id=eq.${user_id}&select=*,job:jobs(*)&order=applied_at.desc&limit=10`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      }
    })
    const applications = await applicationsResponse.json()

    // Get user's recent search patterns
    const searchAnalyticsResponse = await fetch(`${supabaseUrl}/rest/v1/search_analytics?user_id=eq.${user_id}&order=search_timestamp.desc&limit=10`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      }
    })
    const searchAnalytics = await searchAnalyticsResponse.json()

    // Generate recommendations based on event type and user behavior
    const recommendations = await generateRecommendations(user, savedJobs, applications, searchAnalytics, event_type, event_data, recommendation_types)

    // Insert recommendations into database
    if (recommendations.length > 0) {
      const insertResponse = await fetch(`${supabaseUrl}/rest/v1/recommendation_history`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseKey
        },
        body: JSON.stringify(recommendations.map(rec => ({
          user_id: user_id,
          ...rec
        })))
      })

      if (!insertResponse.ok) {
        const errorText = await insertResponse.text()
        throw new Error(`Failed to insert recommendations: ${errorText}`)
      }
    }

    // Log the recommendation generation
    await fetch(`${supabaseUrl}/rest/v1/automation_logs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        user_id: user_id,
        workflow_type: 'recommendations_generated',
        status: 'completed',
        result_data: {
          event_type,
          recommendations_count: recommendations.length,
          recommendation_types: recommendations.map(r => r.recommendation_type),
          generated_at: new Date().toISOString()
        }
      })
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Generated ${recommendations.length} recommendations`,
        recommendations: recommendations,
        event_processed: event_type
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Recommendations engine error:', error)
    
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

async function generateRecommendations(
  user: any, 
  savedJobs: any[], 
  applications: any[], 
  searchAnalytics: any[],
  eventType?: string,
  eventData?: any,
  requestedTypes?: string[]
) {
  const recommendations = []

  // Event-specific recommendations
  if (eventType === 'job_viewed' && eventData) {
    // Recommend similar jobs based on viewed job
    recommendations.push({
      recommendation_type: 'job_application',
      content: {
        title: `Similar to "${eventData.job_title}"`,
        description: `Based on your interest in this ${eventData.job_category} role, here are similar opportunities.`,
        action: 'Explore similar jobs',
        expected_outcome: 'Find more relevant opportunities',
        difficulty: 'Easy',
        time_investment: '10-15 minutes'
      }
    })
  }

  if (eventType === 'job_saved' && eventData) {
    // Recommend applying to saved job
    recommendations.push({
      recommendation_type: 'job_application',
      content: {
        title: `Ready to apply to "${eventData.job_title}"?`,
        description: `You saved this job - take the next step and submit your application.`,
        action: 'Apply to saved job',
        expected_outcome: 'Move closer to landing an interview',
        difficulty: 'Medium',
        time_investment: '30-45 minutes'
      }
    })
  }

  // Skill addition recommendations based on saved jobs
  if ((!requestedTypes || requestedTypes.includes('skill_addition')) && savedJobs.length > 0) {
    const jobSkills = savedJobs.flatMap(saved => saved.job.skills_required || [])
    const skillFrequency = jobSkills.reduce((acc, skill) => {
      acc[skill] = (acc[skill] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const missingSkills = Object.entries(skillFrequency)
      .filter(([skill, count]) => 
        count >= 2 && !user.skills?.some((userSkill: string) => 
          userSkill.toLowerCase().includes(skill.toLowerCase())
        )
      )
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)

    for (const [skill, frequency] of missingSkills) {
      recommendations.push({
        recommendation_type: 'skill_addition',
        content: {
          title: `Learn ${skill}`,
          description: `This skill appears in ${frequency} of your saved jobs. Adding it could significantly improve your job matches.`,
          action: `Add ${skill} to your skills`,
          expected_outcome: `Unlock ${Math.floor(frequency * 1.5)} more job opportunities`,
          difficulty: 'Medium',
          time_investment: '2-4 weeks'
        }
      })
    }
  }

  // Profile completion recommendations
  if (!requestedTypes || requestedTypes.includes('profile_completion')) {
    const profileScore = calculateProfileCompleteness(user)
    if (profileScore < 90) {
      const missingElements = []
      if (!user.name) missingElements.push({ field: 'name', impact: 'High', description: 'Helps employers connect with you personally' })
      if (!user.location) missingElements.push({ field: 'location', impact: 'High', description: 'Enables regional job matching' })
      if (!user.skills || user.skills.length < 3) missingElements.push({ field: 'skills', impact: 'Critical', description: 'Essential for accurate job matching' })
      if (!user.experience_level) missingElements.push({ field: 'experience_level', impact: 'High', description: 'Filters jobs to your level' })

      for (const element of missingElements.slice(0, 2)) {
        recommendations.push({
          recommendation_type: 'profile_completion',
          content: {
            title: `Complete your ${element.field}`,
            description: element.description,
            action: `Add your ${element.field} to your profile`,
            expected_outcome: 'Improve job matching accuracy by 15-25%',
            difficulty: 'Easy',
            time_investment: '2-5 minutes'
          }
        })
      }
    }
  }

  // Job application recommendations
  if (!requestedTypes || requestedTypes.includes('job_application')) {
    if (savedJobs.length > 0 && applications.length === 0) {
      recommendations.push({
        recommendation_type: 'job_application',
        content: {
          title: 'Start applying to your saved jobs',
          description: `You have ${savedJobs.length} saved jobs but haven't applied to any yet. Take the next step!`,
          action: 'Apply to your top 2-3 saved jobs',
          expected_outcome: 'Increase your chances of landing interviews',
          difficulty: 'Medium',
          time_investment: '30-60 minutes per application'
        }
      })
    }

    // Application follow-up recommendations
    if (applications.length > 0) {
      const recentApplications = applications.filter(app => {
        const appliedDate = new Date(app.applied_at)
        const daysSince = (Date.now() - appliedDate.getTime()) / (1000 * 60 * 60 * 24)
        return daysSince >= 7 && daysSince <= 14 && app.status === 'applied'
      })

      if (recentApplications.length > 0) {
        recommendations.push({
          recommendation_type: 'job_application',
          content: {
            title: 'Follow up on your applications',
            description: `You have ${recentApplications.length} applications from last week. A polite follow-up can show continued interest.`,
            action: 'Send follow-up emails',
            expected_outcome: 'Demonstrate enthusiasm and professionalism',
            difficulty: 'Easy',
            time_investment: '15-20 minutes'
          }
        })
      }
    }
  }

  // Career path recommendations based on search patterns
  if ((!requestedTypes || requestedTypes.includes('career_path')) && searchAnalytics.length >= 3) {
    const searchTerms = searchAnalytics.flatMap(search => search.search_query ? [search.search_query] : [])
    const categorySearches = searchAnalytics.flatMap(search => 
      search.filters_applied?.category ? [search.filters_applied.category] : []
    )

    if (categorySearches.length >= 2) {
      const categoryFrequency = categorySearches.reduce((acc, category) => {
        acc[category] = (acc[category] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const topCategory = Object.entries(categoryFrequency)
        .sort(([,a], [,b]) => b - a)[0]

      if (topCategory && topCategory[1] >= 2) {
        recommendations.push({
          recommendation_type: 'career_path',
          content: {
            title: `Focus on ${topCategory[0]} roles`,
            description: `Your recent searches show strong interest in ${topCategory[0]}. Consider specializing in this area.`,
            action: `Build expertise in ${topCategory[0]}`,
            expected_outcome: 'Become a specialist and command higher salaries',
            difficulty: 'High',
            time_investment: '3-6 months'
          }
        })
      }
    }
  }

  return recommendations
}

function calculateProfileCompleteness(user: any): number {
  let score = 20 // Base score
  if (user.name) score += 20
  if (user.location) score += 20
  if (user.experience_level) score += 20
  if (user.skills && user.skills.length > 0) score += 20
  return score
}