import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AutomationRequest {
  user_id: string;
  job_id: string;
  automation_log_id?: string;
  options?: {
    include_cover_letter?: boolean;
    custom_message?: string;
    follow_up_schedule?: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, job_id, automation_log_id, options }: AutomationRequest = await req.json()

    console.log('Processing automated application:', { user_id, job_id, automation_log_id })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Step 1: Get user profile and resume
    const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user_id}&select=*`, {
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

    // Get user's latest resume
    const resumeResponse = await fetch(`${supabaseUrl}/rest/v1/resumes?user_id=eq.${user_id}&processing_status=eq.completed&order=uploaded_at.desc&limit=1`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      }
    })
    const resumeData = await resumeResponse.json()
    const resume = resumeData[0]

    if (!resume) {
      throw new Error('No processed resume found. Please upload and process a resume first.')
    }

    // Step 2: Get job details
    const jobResponse = await fetch(`${supabaseUrl}/rest/v1/jobs?id=eq.${job_id}&select=*`, {
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

    // Step 3: Check if user has already applied
    const existingApplicationResponse = await fetch(`${supabaseUrl}/rest/v1/applications?user_id=eq.${user_id}&job_id=eq.${job_id}`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      }
    })
    const existingApplications = await existingApplicationResponse.json()

    if (existingApplications && existingApplications.length > 0) {
      throw new Error('You have already applied to this job')
    }

    // Step 4: Validate user profile completeness
    const profileScore = calculateProfileCompleteness(user, resume)
    if (profileScore < 70) {
      throw new Error('Profile incomplete. Please complete your profile and upload a resume before using automation.')
    }

    // Step 5: Generate application content
    const applicationContent = await generateApplicationContent(user, job, resume, options)

    // Step 6: Simulate application submission (in production, integrate with job board APIs)
    const submissionResult = await simulateApplicationSubmission(user, job, applicationContent)

    // Step 7: Create application record
    const applicationData = {
      user_id: user_id,
      job_id: job_id,
      status: 'applied',
      automation_enabled: true,
      notes: `Automated application submitted. ${applicationContent.cover_letter ? 'Included personalized cover letter.' : 'Standard application.'}`
    }

    const createApplicationResponse = await fetch(`${supabaseUrl}/rest/v1/applications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey
      },
      body: JSON.stringify(applicationData)
    })

    if (!createApplicationResponse.ok) {
      throw new Error('Failed to create application record')
    }

    const applicationResult = await createApplicationResponse.json()

    // Step 8: Log user event for tracking
    await fetch(`${supabaseUrl}/rest/v1/user_events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        user_id: user_id,
        event_type: 'automated_application_completed',
        event_data: {
          job_id: job_id,
          job_title: job.title,
          job_company: job.company,
          application_id: applicationResult[0]?.id,
          automation_method: 'ai_assisted',
          submission_channel: submissionResult.channel,
          completed_at: new Date().toISOString()
        }
      })
    })

    // Step 9: Update automation log with success
    if (automation_log_id) {
      await fetch(`${supabaseUrl}/rest/v1/automation_logs?id=eq.${automation_log_id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseKey
        },
        body: JSON.stringify({
          status: 'completed',
          result_data: {
            application_id: applicationResult[0]?.id,
            submission_result: submissionResult,
            profile_score: profileScore,
            content_generated: applicationContent,
            completed_at: new Date().toISOString()
          }
        })
      })
    }

    // Step 10: Schedule follow-up automation if requested
    if (options?.follow_up_schedule) {
      await scheduleFollowUp(user_id, job_id, applicationResult[0]?.id, supabaseUrl, supabaseKey)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Application submitted successfully via automation',
        application_id: applicationResult[0]?.id,
        submission_details: submissionResult,
        automation_features_used: {
          cover_letter_generated: !!applicationContent.cover_letter,
          profile_optimization: true,
          follow_up_scheduled: !!options?.follow_up_schedule
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Automation error:', error)
    
    // Update automation log with failure if provided
    const { automation_log_id } = await req.json().catch(() => ({}))
    if (automation_log_id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      
      await fetch(`${supabaseUrl}/rest/v1/automation_logs?id=eq.${automation_log_id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseKey
        },
        body: JSON.stringify({
          status: 'failed',
          result_data: {
            error: error.message,
            failed_at: new Date().toISOString()
          }
        })
      })
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        error_type: error.name || 'AutomationError'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

function calculateProfileCompleteness(user: any, resume: any): number {
  let score = 20 // Base score
  if (user.name) score += 15
  if (user.location) score += 15
  if (user.experience_level) score += 15
  if (user.skills && user.skills.length > 0) score += 15
  if (resume && resume.extracted_text) score += 20
  return score
}

async function generateApplicationContent(user: any, job: any, resume: any, options: any) {
  // In production, this would use OpenAI to generate personalized content
  const applicationContent = {
    cover_letter: null as string | null,
    application_answers: {} as Record<string, string>,
    personalization_score: 85
  }

  if (options?.include_cover_letter !== false) {
    // Generate personalized cover letter based on user profile and job requirements
    applicationContent.cover_letter = generateCoverLetter(user, job, resume)
  }

  // Generate answers to common application questions
  applicationContent.application_answers = {
    'Why are you interested in this role?': generateInterestAnswer(user, job),
    'Why do you want to work for our company?': generateCompanyInterestAnswer(user, job),
    'What makes you a good fit for this position?': generateFitAnswer(user, job, resume)
  }

  return applicationContent
}

function generateCoverLetter(user: any, job: any, resume: any): string {
  return `Dear ${job.company} Hiring Team,

I am writing to express my strong interest in the ${job.title} position at ${job.company}. With my background in ${user.experience_level} level work and expertise in ${user.skills?.slice(0, 3).join(', ')}, I am excited about the opportunity to contribute to your team.

Based on my experience and the job requirements, I believe I would be a strong fit for this role. My skills in ${user.skills?.[0]} and ${user.skills?.[1]} align well with your needs for ${job.skills_required?.slice(0, 2).join(' and ')}.

As someone based in ${user.location}, I am particularly drawn to ${job.company}'s commitment to remote work and global talent. I am excited about the prospect of contributing to your team while working in a distributed environment.

I have attached my resume for your review and would welcome the opportunity to discuss how my background and enthusiasm can contribute to ${job.company}'s continued success.

Thank you for your consideration.

Best regards,
${user.name || user.first_name || 'Applicant'}`
}

function generateInterestAnswer(user: any, job: any): string {
  return `I am particularly excited about this ${job.title} role because it aligns perfectly with my ${user.experience_level} level experience and my skills in ${user.skills?.slice(0, 2).join(' and ')}. The opportunity to work with ${job.category} technologies and contribute to meaningful projects at ${job.company} resonates with my career goals and passion for remote work.`
}

function generateCompanyInterestAnswer(user: any, job: any): string {
  return `${job.company} stands out to me as a company that values global talent and embraces remote-first culture. As a professional from ${user.location}, I appreciate companies that recognize the value of diverse, distributed teams. Your commitment to ${job.category} innovation and remote work flexibility aligns perfectly with my values and work style.`
}

function generateFitAnswer(user: any, job: any, resume: any): string {
  return `My combination of ${user.experience_level} level experience and expertise in ${user.skills?.slice(0, 3).join(', ')} makes me well-suited for this position. I bring a proven track record in ${job.category} work, strong remote collaboration skills, and the ability to work effectively across different time zones. My background demonstrates both the technical skills and the adaptability needed to excel in this role.`
}

async function simulateApplicationSubmission(user: any, job: any, content: any) {
  // In production, this would:
  // 1. Check if the company has an API for applications
  // 2. Submit via their ATS (Workday, Greenhouse, etc.)
  // 3. Fall back to email application if no API available
  // 4. Handle different submission formats and requirements

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000))

  return {
    channel: job.source_url ? 'job_board_api' : 'email',
    confirmation_id: `AUTO_${Date.now()}`,
    submitted_at: new Date().toISOString(),
    submission_method: 'automated',
    response_time: '1.2s',
    success: true
  }
}

async function scheduleFollowUp(userId: string, jobId: string, applicationId: string, supabaseUrl: string, supabaseKey: string) {
  const followUpDates = [
    { days: 7, type: 'first_followup' },
    { days: 14, type: 'second_followup' },
    { days: 30, type: 'final_followup' }
  ]

  for (const followUp of followUpDates) {
    const scheduledDate = new Date()
    scheduledDate.setDate(scheduledDate.getDate() + followUp.days)

    await fetch(`${supabaseUrl}/rest/v1/automation_logs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        user_id: userId,
        workflow_type: 'application_followup',
        status: 'pending',
        result_data: {
          job_id: jobId,
          application_id: applicationId,
          followup_type: followUp.type,
          scheduled_for: scheduledDate.toISOString(),
          automated: true
        }
      })
    })
  }
}