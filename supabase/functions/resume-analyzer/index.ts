// supabase/functions/resume-analyzer/index.ts - WORKING OPENAI INTEGRATION
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, fileName } = await req.json()
    
    console.log('🔍 OPENAI INTEGRATION: Function called with text length:', text?.length || 0)
    console.log('📁 File name:', fileName)

    // Check OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    console.log('🔑 OpenAI key exists:', !!openaiApiKey)
    console.log('🔑 Key prefix:', openaiApiKey?.substring(0, 10))

    if (!openaiApiKey) {
      console.error('❌ CRITICAL: No OpenAI API key found in environment')
      throw new Error('OpenAI API key not configured')
    }

    console.log('🤖 Making OpenAI API call...')
    
    // Call OpenAI API
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
            content: `You are an expert resume analyzer. Extract detailed information from the resume text and return ONLY a valid JSON object with this exact structure:
            {
              "personalInfo": {
                "name": "Full name of the person",
                "email": "email@domain.com",
                "phone": "phone number",
                "location": "city, state/country"
              },
              "currentRole": "Current job title or most recent position",
              "experienceLevel": "Entry Level, Mid Level, Senior Level, or Executive Level",
              "skills": {
                "technical": ["technical skills like software, programming languages, tools"],
                "business": ["business skills like sales, marketing, management"],
                "soft": ["soft skills like communication, leadership"],
                "industry": ["industry-specific skills"]
              },
              "professionalSummary": "2-3 sentence summary of background and expertise",
              "keyStrengths": ["top 8 most important skills/strengths"]
            }

            IMPORTANT: 
            - Extract the person's actual name, not filename
            - Be comprehensive with skills - look for ALL mentioned abilities
            - Include programming languages, frameworks, tools, certifications
            - Include business skills like project management, leadership
            - Include soft skills mentioned or implied
            - Return ONLY the JSON object, no additional text`
          },
          {
            role: 'user',
            content: `Please analyze this resume and extract comprehensive information:\n\n${text.substring(0, 12000)}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    })

    console.log('📡 OpenAI response status:', openaiResponse.status)

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('❌ OpenAI API error:', openaiResponse.status, errorText)
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`)
    }

    const openaiData = await openaiResponse.json()
    console.log('✅ OpenAI response received successfully')
    
    let aiAnalysis
    try {
      const content = openaiData.choices[0].message.content
      console.log('🔍 Raw OpenAI content:', content.substring(0, 200) + '...')
      aiAnalysis = JSON.parse(content)
      console.log('✅ Successfully parsed OpenAI JSON')
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI JSON:', parseError)
      throw new Error('OpenAI returned invalid JSON format')
    }

    // Count total skills
    const totalSkills = [
      ...(aiAnalysis.skills?.technical || []),
      ...(aiAnalysis.skills?.business || []),
      ...(aiAnalysis.skills?.soft || []),
      ...(aiAnalysis.skills?.industry || [])
    ].length

    console.log('📊 AI extracted', totalSkills, 'total skills')
    console.log('👤 Extracted name:', aiAnalysis.personalInfo?.name)
    console.log('💼 Detected role:', aiAnalysis.currentRole)

    // Format response
    const result = {
      personalInfo: aiAnalysis.personalInfo || {
        name: fileName?.replace(/\.(pdf|doc|docx)$/i, '').replace(/[-_]/g, ' ') || 'Professional',
        email: '',
        phone: '',
        location: ''
      },
      currentRole: aiAnalysis.currentRole || 'Professional',
      experienceLevel: aiAnalysis.experienceLevel || 'Mid Level',
      skills: aiAnalysis.skills || { technical: [], business: [], soft: [], industry: [] },
      professionalSummary: aiAnalysis.professionalSummary || 'Experienced professional with diverse skill set.',
      keyStrengths: aiAnalysis.keyStrengths || [],
      remoteWorkReady: true
    }

    console.log('✅ Final result prepared with', totalSkills, 'skills')

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        analysisType: 'openai-powered',
        totalSkillsFound: totalSkills
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Function error:', error)
    
    // Enhanced fallback with better skill detection
    console.log('🔄 Using enhanced fallback analysis...')
    
    const text = req.body?.text || ''
    const fileName = req.body?.fileName || 'resume.pdf'
    
    return enhancedFallbackAnalysis(text, fileName)
  }
})

function enhancedFallbackAnalysis(text: string, fileName: string) {
  console.log('🔄 Enhanced fallback analysis starting...')
  
  const textLower = text.toLowerCase()
  const skills = {
    technical: [] as string[],
    business: [] as string[],
    soft: [] as string[],
    industry: [] as string[]
  }
  
  // Comprehensive skill detection patterns
  const skillPatterns = [
    // Programming & Technical
    { pattern: /\b(javascript|js|node\.?js|react|angular|vue)\b/i, skill: 'JavaScript', category: 'technical' },
    { pattern: /\b(python|django|flask|pandas|numpy)\b/i, skill: 'Python', category: 'technical' },
    { pattern: /\b(java|spring|hibernate)\b/i, skill: 'Java', category: 'technical' },
    { pattern: /\b(html|css|frontend|front.end)\b/i, skill: 'Frontend Development', category: 'technical' },
    { pattern: /\b(sql|mysql|postgresql|database)\b/i, skill: 'Database Management', category: 'technical' },
    { pattern: /\b(aws|azure|cloud|docker|kubernetes)\b/i, skill: 'Cloud Technologies', category: 'technical' },
    { pattern: /\b(git|github|version control)\b/i, skill: 'Version Control', category: 'technical' },
    
    // Sales & Business
    { pattern: /\b(salesforce|sfdc|crm)\b/i, skill: 'Salesforce CRM', category: 'technical' },
    { pattern: /\b(sales|selling|revenue)\b/i, skill: 'Sales', category: 'business' },
    { pattern: /\b(business development|bizdev|bd)\b/i, skill: 'Business Development', category: 'business' },
    { pattern: /\b(account management|client management)\b/i, skill: 'Account Management', category: 'business' },
    { pattern: /\b(project management|pmp|agile|scrum)\b/i, skill: 'Project Management', category: 'business' },
    { pattern: /\b(strategic planning|strategy)\b/i, skill: 'Strategic Planning', category: 'business' },
    { pattern: /\b(budget|financial|finance)\b/i, skill: 'Financial Management', category: 'business' },
    { pattern: /\b(marketing|digital marketing|seo)\b/i, skill: 'Marketing', category: 'business' },
    
    // Soft Skills
    { pattern: /\b(leadership|leading|lead|manage|management)\b/i, skill: 'Leadership', category: 'soft' },
    { pattern: /\b(communication|presenting|presentation)\b/i, skill: 'Communication', category: 'soft' },
    { pattern: /\b(team|collaboration|teamwork)\b/i, skill: 'Team Collaboration', category: 'soft' },
    { pattern: /\b(problem.solving|troubleshooting|analytical)\b/i, skill: 'Problem Solving', category: 'soft' },
    { pattern: /\b(training|mentoring|coaching)\b/i, skill: 'Training & Development', category: 'soft' },
    { pattern: /\b(negotiation|negotiating)\b/i, skill: 'Negotiation', category: 'soft' },
    
    // Tools & Software
    { pattern: /\b(excel|spreadsheet|powerpoint|office)\b/i, skill: 'Microsoft Office', category: 'technical' },
    { pattern: /\b(tableau|power.?bi|analytics)\b/i, skill: 'Data Analytics', category: 'technical' },
    { pattern: /\b(jira|asana|trello)\b/i, skill: 'Project Management Tools', category: 'technical' },
    
    // Industry
    { pattern: /\b(saas|software.as.a.service)\b/i, skill: 'SaaS', category: 'industry' },
    { pattern: /\b(b2b|business.to.business)\b/i, skill: 'B2B', category: 'industry' },
    { pattern: /\b(healthcare|medical|pharmaceutical)\b/i, skill: 'Healthcare', category: 'industry' },
    { pattern: /\b(fintech|financial.services|banking)\b/i, skill: 'Financial Services', category: 'industry' }
  ]
  
  // Extract skills using patterns
  skillPatterns.forEach(({ pattern, skill, category }) => {
    if (pattern.test(textLower)) {
      if (!skills[category as keyof typeof skills].includes(skill)) {
        skills[category as keyof typeof skills].push(skill)
      }
    }
  })
  
  // Extract basic personal info
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)?.[1] || ''
  const phoneMatch = text.match(/(\+?[\d\s\-\(\)]{8,15})/)?.[1]?.replace(/[^\d\+]/g, '') || ''
  
  // Determine role
  let currentRole = 'Professional'
  if (/developer|engineer|programmer/i.test(textLower)) currentRole = 'Software Developer'
  else if (/sales.*manager|account.*manager/i.test(textLower)) currentRole = 'Sales Manager'
  else if (/project.*manager/i.test(textLower)) currentRole = 'Project Manager'
  else if (/marketing.*manager/i.test(textLower)) currentRole = 'Marketing Manager'
  else if (/manager/i.test(textLower)) currentRole = 'Manager'
  
  // Experience level
  let experienceLevel = 'Mid Level'
  if (/senior|lead|principal/i.test(textLower)) experienceLevel = 'Senior Level'
  else if (/director|vp|head.of/i.test(textLower)) experienceLevel = 'Executive Level'
  else if (/junior|entry|associate|intern/i.test(textLower)) experienceLevel = 'Entry Level'
  
  const totalSkills = skills.technical.length + skills.business.length + skills.soft.length + skills.industry.length
  
  console.log('📊 Fallback extracted', totalSkills, 'skills')
  console.log('💼 Detected role:', currentRole)
  
  const result = {
    personalInfo: {
      name: fileName?.replace(/\.(pdf|doc|docx)$/i, '').replace(/[-_]/g, ' ').replace(/resume/gi, '').trim() || 'Professional',
      email: emailMatch,
      phone: phoneMatch,
      location: ''
    },
    currentRole: currentRole,
    experienceLevel: experienceLevel,
    skills: skills,
    professionalSummary: `Experienced ${currentRole.toLowerCase()} with demonstrated expertise in ${skills.business[0] || skills.technical[0] || 'professional development'}.`,
    keyStrengths: [...skills.business.slice(0, 3), ...skills.technical.slice(0, 3), ...skills.soft.slice(0, 2)],
    remoteWorkReady: true
  }
  
  return new Response(
    JSON.stringify({
      success: true,
      data: result,
      analysisType: 'enhanced-fallback',
      totalSkillsFound: totalSkills
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}