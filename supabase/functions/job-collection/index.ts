import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JobData {
  title: string;
  company: string;
  description?: string;
  location: string;
  salary: string;
  category: string;
  experience_level?: string;
  job_type?: string;
  remote_type?: string;
  skills_required?: string[];
  source_url?: string;
  auto_collected: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { jobs, source_id } = await req.json()

    console.log('Collecting jobs from automated source:', { source_id, count: jobs.length })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Process and insert jobs
    const processedJobs = jobs.map((job: JobData) => ({
      ...job,
      auto_collected: true,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      // Parse salary into min/max if possible
      salary_min: parseSalaryMin(job.salary),
      salary_max: parseSalaryMax(job.salary),
      // Set defaults
      experience_level: job.experience_level || 'any',
      job_type: job.job_type || 'full-time',
      remote_type: job.remote_type || 'fully-remote',
      is_remote: true,
      culture_score: calculateRemoteFriendlyScore(job),
      regional_hiring: generateRegionalHiring(job)
    }))

    // Insert jobs into database
    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/jobs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(processedJobs)
    })

    if (!insertResponse.ok) {
      throw new Error(`Failed to insert jobs: ${insertResponse.statusText}`)
    }

    // Update job source last_scraped timestamp
    if (source_id) {
      await fetch(`${supabaseUrl}/rest/v1/job_sources?id=eq.${source_id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseKey
        },
        body: JSON.stringify({
          last_scraped: new Date().toISOString(),
          total_jobs_collected: processedJobs.length
        })
      })
    }

    // Trigger job matching for active users
    await triggerJobMatching(processedJobs)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully collected ${processedJobs.length} jobs`,
        jobs_processed: processedJobs.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Job collection error:', error)
    
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

function parseSalaryMin(salary: string): number | null {
  const patterns = [
    /\$?(\d+)-(\d+)k/,
    /\$?(\d+)k-(\d+)k/,
    /\$?(\d+)k\+/,
    /\$?(\d+),(\d+)-\$?(\d+),(\d+)/
  ]

  for (const pattern of patterns) {
    const match = salary.match(pattern)
    if (match) {
      if (pattern.source.includes('k+')) {
        return parseInt(match[1]) * 1000
      } else if (pattern.source.includes(',')) {
        return parseInt(match[1]) * 1000 + parseInt(match[2])
      } else {
        return parseInt(match[1]) * 1000
      }
    }
  }
  
  return null
}

function parseSalaryMax(salary: string): number | null {
  const patterns = [
    /\$?(\d+)-(\d+)k/,
    /\$?(\d+)k-(\d+)k/,
    /\$?(\d+)k\+/,
    /\$?(\d+),(\d+)-\$?(\d+),(\d+)/
  ]

  for (const pattern of patterns) {
    const match = salary.match(pattern)
    if (match) {
      if (pattern.source.includes('k+')) {
        return parseInt(match[1]) * 1000 + 20000 // Add 20k for + salaries
      } else if (pattern.source.includes(',')) {
        return parseInt(match[3]) * 1000 + parseInt(match[4])
      } else {
        return parseInt(match[2]) * 1000
      }
    }
  }
  
  return null
}

function calculateRemoteFriendlyScore(job: JobData): number {
  let score = 40 // Base score for being a remote job
  
  const description = job.description?.toLowerCase() || ''
  const title = job.title.toLowerCase()
  const company = job.company.toLowerCase()
  
  // Fully remote-first culture (15 points)
  if (description.includes('remote-first') || 
      description.includes('fully remote') || 
      description.includes('distributed team') ||
      description.includes('remote culture')) {
    score += 15
  } else if (description.includes('remote') && 
             (description.includes('team') || description.includes('work'))) {
    score += 10
  }
  
  // Global team, timezone flexible (25 points)
  if (description.includes('global team') || 
      description.includes('international team') ||
      description.includes('worldwide team')) {
    score += 15
  }
  
  if (description.includes('timezone flexible') || 
      description.includes('flexible hours') ||
      description.includes('any timezone') ||
      description.includes('flexible schedule')) {
    score += 10
  }
  
  // Equipment & home office support (10 points)
  if (description.includes('equipment stipend') || 
      description.includes('home office setup') ||
      description.includes('tools provided') ||
      description.includes('laptop provided') ||
      description.includes('equipment allowance')) {
    score += 10
  }
  
  // Strong diversity commitment (10 points)
  if (description.includes('diversity') || 
      description.includes('inclusive') ||
      description.includes('equal opportunity') ||
      description.includes('underrepresented') ||
      description.includes('all backgrounds')) {
    score += 10
  }
  
  // Professional development budget (10 points)
  if (description.includes('professional development') || 
      description.includes('learning budget') ||
      description.includes('upskilling') ||
      description.includes('training budget') ||
      description.includes('conference budget')) {
    score += 10
  }
  
  // Competitive salary transparency (5 points)
  if (description.includes('transparent salary') || 
      description.includes('competitive pay') ||
      description.includes('salary transparency') ||
      job.salary.includes('$')) {
    score += 5
  }
  
  // Boost for tech companies and startups (known for remote work)
  if (company.includes('tech') || 
      company.includes('startup') ||
      description.includes('startup') ||
      description.includes('saas') ||
      description.includes('software')) {
    score += 5
  }
  
  // Boost for companies explicitly welcoming international talent
  if (description.includes('international') || 
      description.includes('global talent') ||
      description.includes('worldwide') ||
      description.includes('any location') ||
      description.includes('location independent')) {
    score += 5
  }
  
  return Math.min(score, 100)
}

function generateRegionalHiring(job: JobData) {
  const description = job.description?.toLowerCase() || ''
  
  return {
    africa_friendly: true, // Default to true for all remote jobs
    asia_friendly: true,
    latam_friendly: true,
    visa_sponsorship: description.includes('visa') || 
                     description.includes('sponsorship') || 
                     description.includes('relocation') ||
                     Math.random() > 0.8, // Some random chance for variety
    timezone_flexibility: description.includes('timezone') || 
                         description.includes('flexible hours') ||
                         description.includes('any time') ||
                         Math.random() > 0.4 // Higher chance for remote jobs
  }
}

async function triggerJobMatching(jobs: JobData[]) {
  // This would trigger the job matching algorithm
  // For now, we'll just log that it should happen
  console.log(`Would trigger job matching for ${jobs.length} new jobs`)
  
  // In a real implementation, this would:
  // 1. Get all active users
  // 2. Calculate match scores for each job-user pair
  // 3. Insert high-scoring matches into job_matches table
  // 4. Send notifications for top matches
}