// supabase/functions/resume-analyzer/index.ts - ENHANCED WITH TEXT QUALITY
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, fileName, extractionMetrics } = await req.json()
    
    console.log('🔍 Enhanced resume analyzer called')
    console.log('📄 Text length:', text?.length || 0)
    console.log('📊 Extraction metrics:', extractionMetrics)
    console.log('📁 File name:', fileName)

    // Validate text quality before processing
    const textQuality = validateTextQuality(text || '')
    console.log('🎯 Text quality assessment:', textQuality)

    if (textQuality.score < 30) {
      console.log('⚠️ Poor text quality detected, using enhanced fallback')
      return enhancedFallbackAnalysis(text, fileName, textQuality)
    }

    // Try OpenAI for good quality text
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    console.log('🔑 OpenAI key exists:', !!openaiApiKey)

    if (!openaiApiKey) {
      console.log('🔄 No OpenAI key, using enhanced fallback')
      return enhancedFallbackAnalysis(text, fileName, textQuality)
    }

    try {
      console.log('🤖 Attempting OpenAI analysis...')
      
      // Prepare clean text for OpenAI
      const cleanText = prepareTextForAI(text)
      console.log('✨ Cleaned text length:', cleanText.length)

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an expert resume analyzer. Extract information from the resume text and return ONLY a valid JSON object.

              IMPORTANT INSTRUCTIONS:
              - Extract ALL skills mentioned or implied in the text
              - Look for programming languages, frameworks, tools, software
              - Include business skills like project management, sales, leadership
              - Include soft skills like communication, teamwork, problem-solving
              - Extract the person's actual full name (not filename)
              - Find email, phone, and location if mentioned
              - Determine current role based on job titles and experience
              - Assess experience level based on years and responsibilities

              Return this exact JSON structure:
              {
                "personalInfo": {
                  "name": "Full name from resume",
                  "email": "email address or empty string",
                  "phone": "phone number or empty string", 
                  "location": "city, state/country or empty string"
                },
                "currentRole": "Most recent job title or Professional",
                "experienceLevel": "Entry Level, Mid Level, Senior Level, or Executive Level",
                "skills": {
                  "technical": ["all technical skills found"],
                  "business": ["all business/management skills found"],
                  "soft": ["all soft skills found"],
                  "industry": ["all industry-specific skills found"]
                },
                "professionalSummary": "Brief 2-3 sentence summary",
                "keyStrengths": ["top 8 skills/strengths"]
              }`
            },
            {
              role: 'user',
              content: `Analyze this resume:\n\n${cleanText}`
            }
          ],
          max_tokens: 2500,
          temperature: 0.1,
          response_format: { type: "json_object" }
        })
      })

      console.log('📡 OpenAI response status:', openaiResponse.status)

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text()
        console.error('❌ OpenAI error:', openaiResponse.status, errorText)
        throw new Error(`OpenAI API error: ${openaiResponse.status}`)
      }

      const openaiData = await openaiResponse.json()
      const aiAnalysis = JSON.parse(openaiData.choices[0].message.content)
      
      console.log('✅ OpenAI analysis successful')
      console.log('👤 Extracted name:', aiAnalysis.personalInfo?.name)
      console.log('💼 Detected role:', aiAnalysis.currentRole)

      const totalSkills = [
        ...(aiAnalysis.skills?.technical || []),
        ...(aiAnalysis.skills?.business || []),
        ...(aiAnalysis.skills?.soft || []),
        ...(aiAnalysis.skills?.industry || [])
      ].length

      console.log('📊 Total skills extracted:', totalSkills)

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            personalInfo: aiAnalysis.personalInfo || { name: '', email: '', phone: '', location: '' },
            currentRole: aiAnalysis.currentRole || 'Professional',
            experienceLevel: aiAnalysis.experienceLevel || 'Mid Level',
            skills: aiAnalysis.skills || { technical: [], business: [], soft: [], industry: [] },
            professionalSummary: aiAnalysis.professionalSummary || 'Professional with diverse experience.',
            keyStrengths: aiAnalysis.keyStrengths || [],
            remoteWorkReady: true
          },
          analysisType: 'openai-powered',
          totalSkillsFound: totalSkills,
          textQuality: textQuality.score
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (openaiError) {
      console.error('❌ OpenAI failed:', openaiError)
      console.log('🔄 Falling back to enhanced pattern matching')
      return enhancedFallbackAnalysis(text, fileName, textQuality)
    }

  } catch (error) {
    console.error('❌ Function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        fallback: 'Please ensure the PDF contains readable text'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function validateTextQuality(text: string) {
  const totalChars = text.length
  if (totalChars < 50) return { score: 0, issues: ['Text too short'] }

  const readableChars = (text.match(/[a-zA-Z0-9\s.,!?;:()\-@]/g) || []).length
  const readablePercentage = (readableChars / totalChars) * 100

  const words = text.split(/\s+/).filter(word => word.length > 1)
  const resumeKeywords = text.match(/\b(experience|education|skills|work|employment|university|college|manager|developer|analyst|email|phone)\b/gi) || []

  const score = Math.min(
    readablePercentage + 
    (words.length / 10) + 
    (resumeKeywords.length * 5),
    100
  )

  const issues = []
  if (readablePercentage < 70) issues.push('Contains non-readable characters')
  if (words.length < 50) issues.push('Too few words')
  if (resumeKeywords.length < 3) issues.push('Missing resume keywords')

  return { score: Math.round(score), issues, readablePercentage, wordCount: words.length }
}

function prepareTextForAI(text: string): string {
  return text
    // Remove PDF artifacts
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    // Remove common PDF metadata patterns
    .replace(/\/Type\s*\/\w+/g, '')
    .replace(/\/Filter\s*\/\w+/g, '')
    .replace(/stream\s*endstream/g, '')
    .replace(/obj\s*endobj/g, '')
    .replace(/<<.*?>>/g, '')
    // Keep only readable characters
    .replace(/[^\x20-\x7E\x09\x0A\x0D]/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
    // Limit length for OpenAI
    .substring(0, 15000)
}

function enhancedFallbackAnalysis(text: string, fileName: string, textQuality: any) {
  console.log('🔄 Enhanced fallback analysis starting')
  
  const textLower = (text || '').toLowerCase()
  const skills = {
    technical: [] as string[],
    business: [] as string[],
    soft: [] as string[],
    industry: [] as string[]
  }

  // Comprehensive skill patterns
  const skillPatterns = [
    // Technical Skills
    { pattern: /\b(javascript|js|node\.?js|react|angular|vue|typescript)\b/i, skill: 'JavaScript/React', category: 'technical' },
    { pattern: /\b(python|django|flask|pandas|numpy|machine learning|ai)\b/i, skill: 'Python/AI', category: 'technical' },
    { pattern: /\b(java|spring|hibernate|kotlin)\b/i, skill: 'Java', category: 'technical' },
    { pattern: /\b(c#|\.net|asp\.net|visual studio)\b/i, skill: 'C#/.NET', category: 'technical' },
    { pattern: /\b(php|laravel|wordpress|drupal)\b/i, skill: 'PHP', category: 'technical' },
    { pattern: /\b(html|css|sass|less|frontend|front.end|ui|ux)\b/i, skill: 'Frontend Development', category: 'technical' },
    { pattern: /\b(sql|mysql|postgresql|oracle|database|mongodb|nosql)\b/i, skill: 'Database Management', category: 'technical' },
    { pattern: /\b(aws|azure|google cloud|gcp|cloud|docker|kubernetes|devops)\b/i, skill: 'Cloud Technologies', category: 'technical' },
    { pattern: /\b(git|github|gitlab|version control|svn)\b/i, skill: 'Version Control', category: 'technical' },
    { pattern: /\b(linux|ubuntu|centos|unix|bash|shell)\b/i, skill: 'Linux/Unix', category: 'technical' },

    // CRM & Sales Technology
    { pattern: /\b(salesforce|sfdc|crm|hubspot|pipedrive)\b/i, skill: 'CRM Systems', category: 'technical' },
    { pattern: /\b(excel|powerpoint|word|office|outlook|teams)\b/i, skill: 'Microsoft Office', category: 'technical' },
    { pattern: /\b(tableau|power.?bi|analytics|reporting|dashboard)\b/i, skill: 'Data Analytics', category: 'technical' },
    { pattern: /\b(jira|asana|trello|monday|project management software)\b/i, skill: 'PM Tools', category: 'technical' },

    // Business Skills
    { pattern: /\b(sales|selling|revenue|quota|pipeline|prospecting)\b/i, skill: 'Sales', category: 'business' },
    { pattern: /\b(business development|bizdev|bd|partnerships)\b/i, skill: 'Business Development', category: 'business' },
    { pattern: /\b(account management|client management|relationship management)\b/i, skill: 'Account Management', category: 'business' },
    { pattern: /\b(project management|pmp|agile|scrum|kanban|waterfall)\b/i, skill: 'Project Management', category: 'business' },
    { pattern: /\b(strategic planning|strategy|business strategy)\b/i, skill: 'Strategic Planning', category: 'business' },
    { pattern: /\b(marketing|digital marketing|seo|sem|social media|content marketing)\b/i, skill: 'Marketing', category: 'business' },
    { pattern: /\b(budget|financial|finance|accounting|p&l|profit)\b/i, skill: 'Financial Management', category: 'business' },
    { pattern: /\b(operations|operational|process improvement|lean|six sigma)\b/i, skill: 'Operations Management', category: 'business' },
    { pattern: /\b(vendor management|procurement|sourcing|contracts)\b/i, skill: 'Vendor Management', category: 'business' },

    // Soft Skills
    { pattern: /\b(leadership|leading|lead|manage|management|supervise)\b/i, skill: 'Leadership', category: 'soft' },
    { pattern: /\b(communication|presenting|presentation|public speaking)\b/i, skill: 'Communication', category: 'soft' },
    { pattern: /\b(team|collaboration|teamwork|cross.functional|stakeholder)\b/i, skill: 'Team Collaboration', category: 'soft' },
    { pattern: /\b(problem.solving|troubleshooting|analytical|critical thinking)\b/i, skill: 'Problem Solving', category: 'soft' },
    { pattern: /\b(training|mentoring|coaching|teaching|knowledge transfer)\b/i, skill: 'Training & Development', category: 'soft' },
    { pattern: /\b(negotiation|negotiating|conflict resolution)\b/i, skill: 'Negotiation', category: 'soft' },
    { pattern: /\b(customer service|client relations|customer support)\b/i, skill: 'Customer Service', category: 'soft' },
    { pattern: /\b(time management|organization|prioritization|multitasking)\b/i, skill: 'Time Management', category: 'soft' },

    // Industry Skills
    { pattern: /\b(saas|software.as.a.service|cloud software)\b/i, skill: 'SaaS', category: 'industry' },
    { pattern: /\b(b2b|business.to.business|enterprise)\b/i, skill: 'B2B Sales', category: 'industry' },
    { pattern: /\b(b2c|business.to.consumer|retail|e.commerce)\b/i, skill: 'B2C/Retail', category: 'industry' },
    { pattern: /\b(healthcare|medical|pharmaceutical|biotech|clinical)\b/i, skill: 'Healthcare', category: 'industry' },
    { pattern: /\b(fintech|financial.services|banking|insurance|investment)\b/i, skill: 'Financial Services', category: 'industry' },
    { pattern: /\b(manufacturing|automotive|industrial|supply chain|logistics)\b/i, skill: 'Manufacturing', category: 'industry' },
    { pattern: /\b(education|edtech|training|academic|university)\b/i, skill: 'Education', category: 'industry' },
    { pattern: /\b(consulting|advisory|professional services)\b/i, skill: 'Consulting', category: 'industry' },
    { pattern: /\b(real estate|property|commercial real estate)\b/i, skill: 'Real Estate', category: 'industry' },
    { pattern: /\b(non.profit|ngo|charity|social impact|volunteer)\b/i, skill: 'Non-Profit', category: 'industry' }
  ]

  // Extract skills using comprehensive patterns
  skillPatterns.forEach(({ pattern, skill, category }) => {
    if (pattern.test(textLower) && !skills[category as keyof typeof skills].includes(skill)) {
      skills[category as keyof typeof skills].push(skill)
    }
  })

  // Context-based skill inference
  if (textLower.includes('managed') || textLower.includes('supervised') || textLower.includes('led')) {
    if (!skills.soft.includes('Leadership')) skills.soft.push('Leadership')
  }
  
  if (textLower.includes('increased') || textLower.includes('improved') || textLower.includes('optimized')) {
    if (!skills.soft.includes('Performance Improvement')) skills.soft.push('Performance Improvement')
  }
  
  if (textLower.includes('team') && (textLower.includes('of') || textLower.includes('member'))) {
    if (!skills.soft.includes('Team Collaboration')) skills.soft.push('Team Collaboration')
  }

  // Extract personal information with multiple patterns
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)?.[1] || ''
  const phoneMatch = text.match(/(\+?[\d\s\-\(\)]{8,20})/)?.[1]?.replace(/[^\d\+]/g, '').slice(0, 15) || ''
  
  // Enhanced name extraction
  let extractedName = ''
  const namePatterns = [
    /^([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/m,
    /name[:\s]+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*\n.*@/i
  ]
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern)
    if (match && match[1] && !match[1].toLowerCase().includes('resume')) {
      extractedName = match[1].trim()
      break
    }
  }
  
  if (!extractedName) {
    extractedName = fileName?.replace(/\.(pdf|doc|docx)$/i, '').replace(/[-_]/g, ' ').replace(/resume/gi, '').trim() || 'Professional'
  }

  // Location extraction
  const locationPatterns = [
    /([A-Za-z\s]+,\s*[A-Z]{2}(?:\s*[0-9]{5})?)/g,
    /location[:\s]*([^\n]{5,50})/gi,
    /address[:\s]*([^\n]{10,60})/gi
  ]
  
  let location = ''
  for (const pattern of locationPatterns) {
    const match = text.match(pattern)
    if (match) {
      location = (match[1] || match[0]).replace(/^(location|address)[:\s]*/i, '').trim()
      if (location.length > 3 && location.length < 60) break
    }
  }

  // Role detection
  let currentRole = 'Professional'
  const rolePatterns = {
    'Software Developer': /\b(software (developer|engineer)|full.?stack|frontend|backend|web developer)\b/i,
    'Sales Manager': /\b(sales manager|account manager|business development manager)\b/i,
    'Project Manager': /\b(project manager|program manager|scrum master|product manager)\b/i,
    'Marketing Manager': /\b(marketing manager|digital marketing|brand manager|marketing director)\b/i,
    'Data Analyst': /\b(data analyst|business analyst|data scientist|research analyst)\b/i,
    'Operations Manager': /\b(operations manager|ops manager|operational manager)\b/i,
    'HR Manager': /\b(hr manager|human resources|people manager|talent acquisition)\b/i,
    'Financial Analyst': /\b(financial analyst|finance manager|accounting manager|controller)\b/i
  }
  
  for (const [role, pattern] of Object.entries(rolePatterns)) {
    if (pattern.test(textLower)) {
      currentRole = role
      break
    }
  }

  // Experience level detection
  let experienceLevel = 'Mid Level'
  if (/\b(director|vp|vice president|head of|chief)\b/i.test(textLower)) {
    experienceLevel = 'Executive Level'
  } else if (/\b(senior|lead|principal|sr\.)\b/i.test(textLower)) {
    experienceLevel = 'Senior Level'
  } else if (/\b(junior|entry|associate|intern|jr\.)\b/i.test(textLower)) {
    experienceLevel = 'Entry Level'
  }

  const totalSkills = skills.technical.length + skills.business.length + skills.soft.length + skills.industry.length
  
  console.log('📊 Fallback extracted', totalSkills, 'skills')
  console.log('👤 Extracted name:', extractedName)
  console.log('💼 Detected role:', currentRole)
  console.log('📈 Experience level:', experienceLevel)

  // Generate professional summary
  const topSkills = [...skills.business.slice(0, 2), ...skills.technical.slice(0, 2)].filter(Boolean).join(', ')
  const professionalSummary = topSkills 
    ? `Experienced ${currentRole.toLowerCase()} with demonstrated expertise in ${topSkills}. Proven track record in delivering results and contributing to organizational success.`
    : `Experienced ${currentRole.toLowerCase()} with a diverse skill set and proven ability to deliver results.`

  const result = {
    personalInfo: {
      name: extractedName,
      email: emailMatch,
      phone: phoneMatch,
      location: location
    },
    currentRole: currentRole,
    experienceLevel: experienceLevel,
    skills: skills,
    professionalSummary: professionalSummary,
    keyStrengths: [...skills.business.slice(0, 3), ...skills.technical.slice(0, 3), ...skills.soft.slice(0, 2)],
    remoteWorkReady: skills.technical.length > 0 || /\b(remote|virtual|distributed|telecommute)\b/i.test(textLower)
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: result,
      analysisType: 'enhanced-fallback',
      totalSkillsFound: totalSkills,
      textQuality: textQuality.score,
      extractionIssues: textQuality.issues
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}