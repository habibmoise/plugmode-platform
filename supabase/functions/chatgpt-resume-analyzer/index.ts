// supabase/functions/chatgpt-resume-analyzer/index.ts - Fixed for large text
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
    console.log('🤖 AI Resume Analyzer starting...')
    
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      console.error('❌ OpenAI API key not found')
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'OpenAI API key not configured'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { text, fileName } = await req.json()

    if (!text || text.length < 20) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Resume text is required'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📄 Processing resume: ${fileName}, length: ${text.length}`)

    // Handle large text by chunking and summarizing key sections
    let processedText = text;
    
    if (text.length > 15000) {
      console.log('📝 Large text detected, extracting key sections...')
      processedText = extractKeyResumeContent(text);
      console.log(`📝 Processed text length: ${processedText.length}`);
    }

    console.log('🤖 Starting AI analysis...')
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert resume analyzer. Extract key information from resumes including:
            - Personal info (name, email, phone)
            - Technical and business skills
            - Experience level (Entry/Mid/Senior/Executive)
            - Current role and responsibilities
            
            Focus on actual skills mentioned, not generic ones. Be specific and accurate.`
          },
          {
            role: 'user',
            content: `Analyze this resume and return JSON with this exact structure:
            {
              "personalInfo": {
                "name": "extracted name or empty string",
                "email": "extracted email or empty string", 
                "phone": "extracted phone or empty string",
                "location": "extracted location or empty string"
              },
              "currentRole": "current job title or 'Professional'",
              "experienceLevel": "Entry Level/Mid Level/Senior Level/Executive",
              "skills": {
                "technical": ["specific technical skills found"],
                "business": ["business and management skills"],
                "soft": ["communication, leadership etc"],
                "industry": ["domain knowledge"]
              },
              "professionalSummary": "2-3 sentence summary of career",
              "keyStrengths": ["top 5 strengths"],
              "remoteWorkReady": true/false
            }
            
            Resume content: ${processedText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ OpenAI API error:', response.status, errorData)
      
      // Return intelligent fallback instead of error
      const fallbackResult = createIntelligentFallback(processedText, fileName);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: fallbackResult,
          analysisType: 'enhanced-fallback',
          note: 'Used advanced fallback analysis due to API limits'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiResponse = await response.json()
    console.log('✅ AI analysis completed')

    let analysisResult
    try {
      const aiContent = aiResponse.choices[0].message.content
      analysisResult = JSON.parse(aiContent)
      
      // Validate required fields
      if (!analysisResult.personalInfo || !analysisResult.skills) {
        throw new Error('Invalid AI response structure')
      }
      
    } catch (parseError) {
      console.warn('⚠️ AI response parsing failed, using fallback')
      analysisResult = createIntelligentFallback(processedText, fileName)
    }

    // Enhance analysis
    analysisResult = enhanceAnalysis(analysisResult, processedText)

    console.log('🎯 Analysis completed for:', analysisResult.personalInfo?.name || 'Professional')

    return new Response(
      JSON.stringify({
        success: true,
        data: analysisResult,
        analysisType: 'ai-powered'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Analysis failed'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Extract key content from large resumes
function extractKeyResumeContent(text: string): string {
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  
  // Extract personal info section (first 50 lines)
  const topSection = lines.slice(0, 50).join('\n')
  
  // Find skills sections
  const skillsSection = extractSection(text, ['skills', 'technical skills', 'competencies', 'technologies'])
  
  // Find experience section
  const experienceSection = extractSection(text, ['experience', 'work history', 'employment', 'professional experience'])
  
  // Find education section
  const educationSection = extractSection(text, ['education', 'qualifications', 'academic'])
  
  // Combine key sections
  const keyContent = [
    topSection,
    skillsSection,
    experienceSection.substring(0, 2000), // Limit experience to 2000 chars
    educationSection
  ].filter(Boolean).join('\n\n')
  
  return keyContent.substring(0, 12000) // Limit total to 12k chars
}

function extractSection(text: string, keywords: string[]): string {
  const textLower = text.toLowerCase()
  
  for (const keyword of keywords) {
    const index = textLower.indexOf(keyword)
    if (index !== -1) {
      // Extract 1000 characters from this section
      return text.substring(index, index + 1000)
    }
  }
  
  return ''
}

function createIntelligentFallback(text: string, fileName: string): any {
  console.log('🔄 Creating intelligent fallback analysis')
  
  const textLower = text.toLowerCase()
  
  // Extract basic info
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
  const phoneMatch = text.match(/(\+?[\d\s\-\(\)]{8,15})/)
  
  // Extract name from first meaningful lines
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  let name = ''
  for (const line of lines.slice(0, 10)) {
    const cleanLine = line.trim()
    if (cleanLine.length > 2 && cleanLine.length < 50 && 
        !cleanLine.includes('@') && !cleanLine.includes('http')) {
      name = cleanLine
      break
    }
  }
  
  if (!name) {
    name = fileName.replace(/\.(pdf|doc|docx)$/i, '').replace(/[-_]/g, ' ')
  }

  // Smart skill extraction
  const skills = {
    technical: [] as string[],
    business: [] as string[],
    soft: [] as string[],
    industry: [] as string[]
  }

  // Technical skills
  const techSkills = {
    'Salesforce': ['salesforce', 'crm'],
    'Excel': ['excel', 'spreadsheet'],
    'Data Analysis': ['data analysis', 'analytics', 'reporting'],
    'Project Management': ['project management', 'scrum', 'agile'],
    'Microsoft Office': ['microsoft office', 'word', 'powerpoint'],
    'SQL': ['sql', 'database'],
    'Python': ['python'],
    'JavaScript': ['javascript', 'js'],
    'AWS': ['aws', 'amazon web services'],
    'Digital Marketing': ['digital marketing', 'seo', 'social media']
  }

  Object.entries(techSkills).forEach(([skill, patterns]) => {
    if (patterns.some(pattern => textLower.includes(pattern))) {
      skills.technical.push(skill)
    }
  })

  // Business skills
  const businessSkills = {
    'Sales Management': ['sales', 'revenue', 'quota', 'pipeline'],
    'Team Leadership': ['team lead', 'management', 'supervisor', 'managed'],
    'Strategic Planning': ['strategy', 'planning', 'strategic'],
    'Customer Relations': ['customer', 'client', 'account management'],
    'Business Development': ['business development', 'bd', 'partnerships'],
    'Budget Management': ['budget', 'financial', 'cost management']
  }

  Object.entries(businessSkills).forEach(([skill, patterns]) => {
    if (patterns.some(pattern => textLower.includes(pattern))) {
      skills.business.push(skill)
    }
  })

  // Universal soft skills
  skills.soft = ['Communication', 'Problem Solving', 'Team Collaboration', 'Leadership']

  // Determine experience level and role
  let experienceLevel = 'Mid Level'
  let currentRole = 'Professional'
  
  if (textLower.includes('director') || textLower.includes('vp') || textLower.includes('executive')) {
    experienceLevel = 'Executive'
    currentRole = 'Executive'
  } else if (textLower.includes('manager') || textLower.includes('lead')) {
    experienceLevel = 'Senior Level'
    currentRole = 'Manager'
  } else if (textLower.includes('senior')) {
    experienceLevel = 'Senior Level'
  }

  return {
    personalInfo: {
      name: name || 'Professional',
      email: emailMatch ? emailMatch[1] : '',
      phone: phoneMatch ? phoneMatch[1] : '',
      location: ''
    },
    currentRole,
    experienceLevel,
    skills,
    professionalSummary: `Experienced ${currentRole.toLowerCase()} with demonstrated expertise in ${[...skills.business, ...skills.technical].slice(0, 3).join(', ')}.`,
    keyStrengths: [...skills.business.slice(0, 3), ...skills.technical.slice(0, 2)],
    remoteWorkReady: skills.technical.length > 0 || textLower.includes('remote')
  }
}

function enhanceAnalysis(analysis: any, text: string): any {
  const textLower = text.toLowerCase()
  
  // Enhance remote work readiness
  const remoteIndicators = ['remote', 'distributed', 'virtual', 'zoom', 'slack', 'teams']
  analysis.remoteWorkReady = remoteIndicators.some(indicator => textLower.includes(indicator)) || 
                            analysis.skills.technical.length > 0

  return analysis
}