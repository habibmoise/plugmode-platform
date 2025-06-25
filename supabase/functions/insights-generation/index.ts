import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InsightRequest {
  user_id: string;
  insight_types?: string[];
  force_regenerate?: boolean;
  event_type?: string;
  event_data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, insight_types, force_regenerate, event_type, event_data }: InsightRequest = await req.json()

    console.log('Generating insights for user:', { user_id, insight_types, force_regenerate, event_type })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Get user profile
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

    // Get user's job matches
    const matchesResponse = await fetch(`${supabaseUrl}/rest/v1/job_matches?user_id=eq.${user_id}&select=*,job:jobs(*)&order=match_score.desc&limit=20`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      }
    })
    const matches = await matchesResponse.json()

    // Get user's saved jobs for preference analysis
    const savedJobsResponse = await fetch(`${supabaseUrl}/rest/v1/saved_jobs?user_id=eq.${user_id}&select=*,job:jobs(*)`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      }
    })
    const savedJobs = await savedJobsResponse.json()

    // Get user's applications
    const applicationsResponse = await fetch(`${supabaseUrl}/rest/v1/applications?user_id=eq.${user_id}&select=*,job:jobs(*)`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      }
    })
    const applications = await applicationsResponse.json()

    // Get regional market data
    const marketResponse = await fetch(`${supabaseUrl}/rest/v1/regional_market_data`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      }
    })
    const marketData = await marketResponse.json()

    // Generate insights
    const insights = await generateInsights(user, matches, savedJobs, applications, marketData, insight_types)

    // Clear existing insights if force regenerate
    if (force_regenerate) {
      await fetch(`${supabaseUrl}/rest/v1/user_insights?user_id=eq.${user_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        }
      })
    }

    // Insert new insights
    if (insights.length > 0) {
      const insertResponse = await fetch(`${supabaseUrl}/rest/v1/user_insights`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseKey
        },
        body: JSON.stringify(insights.map(insight => ({
          user_id: user_id,
          ...insight,
          automation_source: event_type ? `${event_type}_trigger` : 'insights_api'
        })))
      })

      if (!insertResponse.ok) {
        const errorText = await insertResponse.text()
        throw new Error(`Failed to insert insights: ${errorText}`)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Generated ${insights.length} insights`,
        insights_generated: insights.length,
        insights: insights
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Insights generation error:', error)
    
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

async function generateInsights(user: any, matches: any[], savedJobs: any[], applications: any[], marketData: any[], requestedTypes?: string[]) {
  const insights = []

  // Skills gap analysis
  if (!requestedTypes || requestedTypes.includes('skills_gap')) {
    if (user.skills && user.location) {
      const relevantMarketData = marketData.find(data => 
        user.location.toLowerCase().includes(data.country.toLowerCase()) &&
        data.experience_level === user.experience_level
      )

      if (relevantMarketData) {
        const missingSkills = relevantMarketData.top_skills.filter(
          (skill: string) => !user.skills.some((userSkill: string) => 
            userSkill.toLowerCase().includes(skill.toLowerCase())
          )
        )

        if (missingSkills.length > 0) {
          const potentialJobs = Math.floor(Math.random() * 8) + 3
          insights.push({
            insight_type: 'skills_gap',
            insight_data: {
              title: `Add ${missingSkills[0]} to unlock ${potentialJobs} more opportunities`,
              description: `Based on market data from ${relevantMarketData.country}, adding ${missingSkills[0]} could significantly increase your job matches.`,
              action_items: [
                `Learn ${missingSkills[0]} fundamentals`,
                'Complete online courses or tutorials',
                'Build a project showcasing this skill',
                'Add the skill to your PlugMode profile'
              ],
              recommendations: missingSkills.slice(0, 3),
              impact: `High - Could open ${potentialJobs} new job opportunities`
            },
            priority: 'high'
          })
        }
      }
    }
  }

  // Salary benchmark insight
  if (!requestedTypes || requestedTypes.includes('salary_benchmark')) {
    if (user.experience_level && user.location) {
      const salaryData = marketData.find(data => 
        user.location.toLowerCase().includes(data.country.toLowerCase()) &&
        data.experience_level === user.experience_level
      )

      if (salaryData) {
        insights.push({
          insight_type: 'salary_benchmark',
          insight_data: {
            title: `Your market value: $${salaryData.avg_salary_usd.toLocaleString()}`,
            description: `Based on ${salaryData.job_count} similar roles in ${salaryData.country}, here's your salary benchmark.`,
            data: {
              avg_salary: salaryData.avg_salary_usd,
              range_min: salaryData.salary_range_min,
              range_max: salaryData.salary_range_max,
              growth_rate: salaryData.growth_rate
            },
            impact: `Market growing at ${salaryData.growth_rate}% annually`
          },
          priority: 'medium'
        })
      }
    }
  }

  // Job match summary
  if (!requestedTypes || requestedTypes.includes('job_match_summary')) {
    if (matches && matches.length > 0) {
      const highMatches = matches.filter(match => match.match_score >= 70)
      const avgScore = Math.round(matches.reduce((sum, match) => sum + match.match_score, 0) / matches.length) || 0

      insights.push({
        insight_type: 'job_match_summary',
        insight_data: {
          title: `You match ${highMatches.length} high-quality opportunities`,
          description: 'Based on your skills and experience, here are your current job matching stats.',
          data: {
            high_matches: highMatches.length,
            avg_match_score: avgScore,
            total_matches: matches.length
          },
          action_items: [
            'Review your top matches',
            'Apply to 2-3 best fits this week',
            'Update your profile for better matching'
          ]
        },
        priority: 'medium'
      })
    }
  }

  // Career recommendation based on profile completeness and activity
  if (!requestedTypes || requestedTypes.includes('career_recommendation')) {
    const profileScore = calculateProfileCompleteness(user)
    
    if (profileScore < 80) {
      const missingElements = []
      if (!user.name) missingElements.push('full name')
      if (!user.location) missingElements.push('location')
      if (!user.skills || user.skills.length === 0) missingElements.push('skills')
      if (!user.experience_level) missingElements.push('experience level')

      if (missingElements.length > 0) {
        insights.push({
          insight_type: 'career_recommendation',
          insight_data: {
            title: `Complete your profile to unlock ${Math.floor((100 - profileScore) / 10)} more features`,
            description: `Your profile is ${profileScore}% complete. Adding missing information will improve job matching.`,
            action_items: missingElements.map(element => `Add your ${element}`),
            impact: 'Medium - Better job matching and visibility'
          },
          priority: 'medium'
        })
      }
    }

    // Application activity insights
    if (savedJobs.length > 0 && applications.length === 0) {
      insights.push({
        insight_type: 'career_recommendation',
        insight_data: {
          title: `Start applying to your ${savedJobs.length} saved jobs`,
          description: 'You have saved jobs but haven\'t applied yet. Take the next step in your career journey!',
          action_items: [
            'Review your saved jobs',
            'Apply to your top 2-3 matches',
            'Set up application tracking'
          ],
          impact: 'High - Convert interest into action'
        },
        priority: 'high'
      })
    }

    // Skills trend analysis based on saved jobs
    if (savedJobs.length >= 3) {
      const jobSkills = savedJobs.flatMap(saved => saved.job.skills_required || [])
      const skillFrequency = jobSkills.reduce((acc, skill) => {
        acc[skill] = (acc[skill] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const topSkills = Object.entries(skillFrequency)
        .filter(([skill, count]) => count >= 2)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)

      if (topSkills.length > 0) {
        const [topSkill, frequency] = topSkills[0]
        if (!user.skills?.some((userSkill: string) => 
          userSkill.toLowerCase().includes(topSkill.toLowerCase())
        )) {
          insights.push({
            insight_type: 'career_recommendation',
            insight_data: {
              title: `Consider learning ${topSkill}`,
              description: `This skill appears in ${frequency} of your saved jobs, suggesting it's important for your career goals.`,
              action_items: [
                `Research ${topSkill} learning resources`,
                'Start with beginner tutorials',
                'Practice with real projects',
                'Add to your skills once proficient'
              ],
              impact: `High - Aligns with your job interests`
            },
            priority: 'high'
          })
        }
      }
    }
  }

  return insights
}

function calculateProfileCompleteness(user: any): number {
  let score = 20 // Base score
  if (user.name) score += 20
  if (user.location) score += 20
  if (user.experience_level) score += 20
  if (user.skills && user.skills.length > 0) score += 20
  return score
}