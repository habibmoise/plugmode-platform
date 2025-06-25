import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MatchRequest {
  user_id?: string;
  job_id?: string;
  batch_match?: boolean;
  event_type?: string;
  event_data?: any;
  job_preferences?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, job_id, batch_match, event_type, event_data, job_preferences }: MatchRequest = await req.json()

    console.log('Calculating job matches:', { user_id, job_id, batch_match, event_type })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    let matchesCreated = 0

    if (batch_match) {
      // Calculate matches for all users and recent jobs
      matchesCreated = await calculateBatchMatches(supabaseUrl, supabaseKey)
    } else if (user_id && job_id) {
      // Calculate match for specific user-job pair
      await calculateSingleMatch(supabaseUrl, supabaseKey, user_id, job_id)
      matchesCreated = 1
    } else if (user_id) {
      // Calculate matches for specific user against all jobs
      matchesCreated = await calculateUserMatches(supabaseUrl, supabaseKey, user_id, job_preferences)
    } else if (job_id) {
      // Calculate matches for specific job against all users
      matchesCreated = await calculateJobMatches(supabaseUrl, supabaseKey, job_id)
    } else {
      throw new Error('Invalid match request parameters')
    }

    // Log the matching operation
    await fetch(`${supabaseUrl}/rest/v1/automation_logs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        user_id: user_id || 'system',
        workflow_type: 'job_matching_completed',
        status: 'completed',
        result_data: {
          event_type,
          matches_created: matchesCreated,
          batch_match,
          processed_at: new Date().toISOString()
        }
      })
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Job matching completed successfully',
        matches_created: matchesCreated
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Job matching error:', error)
    
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

async function calculateSingleMatch(supabaseUrl: string, supabaseKey: string, userId: string, jobId: string) {
  // Get user profile
  const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}`, {
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey
    }
  })
  const userData = await userResponse.json()
  const user = userData[0]

  // Get job details
  const jobResponse = await fetch(`${supabaseUrl}/rest/v1/jobs?id=eq.${jobId}`, {
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey
    }
  })
  const jobData = await jobResponse.json()
  const job = jobData[0]

  if (!user || !job) {
    throw new Error('User or job not found')
  }

  const matchScore = calculateMatchScore(user, job)
  const matchReasons = getMatchReasons(user, job)

  // Insert or update match
  await fetch(`${supabaseUrl}/rest/v1/job_matches`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      user_id: userId,
      job_id: jobId,
      match_score: matchScore,
      match_reasons: matchReasons
    })
  })

  console.log(`Match calculated: User ${userId} + Job ${jobId} = ${matchScore}%`)
}

async function calculateUserMatches(supabaseUrl: string, supabaseKey: string, userId: string, jobPreferences?: any) {
  // Get user profile
  const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}`, {
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

  // Get recent jobs (last 30 days) or jobs matching preferences
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  let jobsQuery = `${supabaseUrl}/rest/v1/jobs?created_at=gte.${thirtyDaysAgo.toISOString()}`
  
  // Apply job preferences if provided
  if (jobPreferences?.category) {
    jobsQuery += `&category=eq.${jobPreferences.category}`
  }

  const jobsResponse = await fetch(jobsQuery, {
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey
    }
  })
  const jobs = await jobsResponse.json()

  const matches = []
  for (const job of jobs) {
    const matchScore = calculateMatchScore(user, job)
    if (matchScore >= 60) { // Only store high-quality matches
      matches.push({
        user_id: userId,
        job_id: job.id,
        match_score: matchScore,
        match_reasons: getMatchReasons(user, job)
      })
    }
  }

  if (matches.length > 0) {
    await fetch(`${supabaseUrl}/rest/v1/job_matches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(matches)
    })
  }

  console.log(`Calculated ${matches.length} matches for user ${userId}`)
  return matches.length
}

async function calculateJobMatches(supabaseUrl: string, supabaseKey: string, jobId: string) {
  // Get job details
  const jobResponse = await fetch(`${supabaseUrl}/rest/v1/jobs?id=eq.${jobId}`, {
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey
    }
  })
  const jobData = await jobResponse.json()
  const job = jobData[0]

  if (!job) {
    throw new Error('Job not found')
  }

  // Get all active users (those who logged in within last 60 days)
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const usersResponse = await fetch(`${supabaseUrl}/rest/v1/users?created_at=gte.${sixtyDaysAgo.toISOString()}`, {
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey
    }
  })
  const users = await usersResponse.json()

  const matches = []
  for (const user of users) {
    const matchScore = calculateMatchScore(user, job)
    if (matchScore >= 60) { // Only store high-quality matches
      matches.push({
        user_id: user.id,
        job_id: jobId,
        match_score: matchScore,
        match_reasons: getMatchReasons(user, job)
      })
    }
  }

  if (matches.length > 0) {
    await fetch(`${supabaseUrl}/rest/v1/job_matches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(matches)
    })
  }

  console.log(`Calculated ${matches.length} matches for job ${jobId}`)
  return matches.length
}

async function calculateBatchMatches(supabaseUrl: string, supabaseKey: string) {
  // Get recent jobs (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const jobsResponse = await fetch(`${supabaseUrl}/rest/v1/jobs?created_at=gte.${sevenDaysAgo.toISOString()}&limit=50`, {
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey
    }
  })
  const jobs = await jobsResponse.json()

  let totalMatches = 0
  for (const job of jobs) {
    const jobMatches = await calculateJobMatches(supabaseUrl, supabaseKey, job.id)
    totalMatches += jobMatches
  }

  console.log(`Batch matching completed: ${totalMatches} total matches created`)
  return totalMatches
}

function calculateMatchScore(user: any, job: any): number {
  let score = 0
  let maxScore = 0

  // Skills match (40% weight)
  const skillsWeight = 40
  maxScore += skillsWeight
  if (user.skills && job.skills_required) {
    const userSkills = user.skills.map((s: string) => s.toLowerCase())
    const jobSkills = job.skills_required.map((s: string) => s.toLowerCase())
    const matchingSkills = userSkills.filter((skill: string) => 
      jobSkills.some((jobSkill: string) => 
        jobSkill.includes(skill) || skill.includes(jobSkill)
      )
    )
    const skillsMatch = (matchingSkills.length / Math.max(jobSkills.length, 1)) * 100
    score += (skillsMatch / 100) * skillsWeight
  }

  // Experience level match (25% weight)
  const experienceWeight = 25
  maxScore += experienceWeight
  if (user.experience_level && job.experience_level) {
    if (job.experience_level === 'any' || user.experience_level === job.experience_level) {
      score += experienceWeight
    } else {
      // Partial match for adjacent levels
      const levels = ['entry', 'mid', 'senior', 'lead']
      const userLevel = levels.indexOf(user.experience_level)
      const jobLevel = levels.indexOf(job.experience_level)
      if (Math.abs(userLevel - jobLevel) === 1) {
        score += experienceWeight * 0.7
      }
    }
  }

  // Location preference (20% weight)
  const locationWeight = 20
  maxScore += locationWeight
  if (user.location && job.regional_hiring) {
    if (user.location.toLowerCase().includes('nigeria') && job.regional_hiring.africa_friendly) {
      score += locationWeight
    } else if (user.location.toLowerCase().includes('indonesia') && job.regional_hiring.asia_friendly) {
      score += locationWeight
    } else if (user.location.toLowerCase().includes('brazil') && job.regional_hiring.latam_friendly) {
      score += locationWeight
    } else {
      score += locationWeight * 0.5 // Partial match for other locations
    }
  }

  // Remote work preference (15% weight)
  const remoteWeight = 15
  maxScore += remoteWeight
  if (job.is_remote) {
    score += remoteWeight
  }

  return Math.round((score / maxScore) * 100)
}

function getMatchReasons(user: any, job: any) {
  const reasons: any = {}

  // Calculate individual match components
  if (user.skills && job.skills_required) {
    const userSkills = user.skills.map((s: string) => s.toLowerCase())
    const jobSkills = job.skills_required.map((s: string) => s.toLowerCase())
    const matchingSkills = userSkills.filter((skill: string) => 
      jobSkills.some((jobSkill: string) => 
        jobSkill.includes(skill) || skill.includes(jobSkill)
      )
    )
    reasons.skills_match = Math.round((matchingSkills.length / Math.max(jobSkills.length, 1)) * 100)
    reasons.matching_skills = matchingSkills
  }

  if (user.experience_level && job.experience_level) {
    if (job.experience_level === 'any' || user.experience_level === job.experience_level) {
      reasons.experience_match = 100
    } else {
      const levels = ['entry', 'mid', 'senior', 'lead']
      const userLevel = levels.indexOf(user.experience_level)
      const jobLevel = levels.indexOf(job.experience_level)
      if (Math.abs(userLevel - jobLevel) === 1) {
        reasons.experience_match = 70
      } else {
        reasons.experience_match = 30
      }
    }
  }

  if (user.location && job.regional_hiring) {
    if (user.location.toLowerCase().includes('nigeria') && job.regional_hiring.africa_friendly) {
      reasons.location_preference = 100
    } else if (user.location.toLowerCase().includes('indonesia') && job.regional_hiring.asia_friendly) {
      reasons.location_preference = 100
    } else if (user.location.toLowerCase().includes('brazil') && job.regional_hiring.latam_friendly) {
      reasons.location_preference = 100
    } else {
      reasons.location_preference = 50
    }
  }

  return reasons
}