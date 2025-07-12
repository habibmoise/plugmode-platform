// supabase/functions/resume-analyzer/index.ts - BULLETPROOF CORS
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// 🔥 BULLETPROOF CORS - Handles ALL possible headers dynamically
const createCorsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') || ''
  const allowedOrigins = ['https://plugmode.tech', 'http://localhost:3000', 'http://localhost:5173']
  const isAllowedOrigin = allowedOrigins.includes(origin)
  
  // Get ALL requested headers from preflight and allow them
  const requestedHeaders = req.headers.get('access-control-request-headers') || ''
  const standardHeaders = 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-api-version'
  const allHeaders = requestedHeaders ? `${standardHeaders}, ${requestedHeaders}` : standardHeaders
  
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': allHeaders,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  }
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req)
  
  // 🚨 CRITICAL: Handle OPTIONS preflight IMMEDIATELY
  if (req.method === 'OPTIONS') {
    console.log('🛫 CORS preflight - Origin:', req.headers.get('origin'))
    console.log('🛫 Requested headers:', req.headers.get('access-control-request-headers'))
    
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    console.log('📧 Resume analyzer function called')
    console.log('🌐 Origin:', req.headers.get('origin'))
    
    const body = await req.json()
    const { text, fileName, extractionMetrics } = body

    console.log('📝 Processing:', {
      fileName,
      textLength: text?.length || 0,
      hasMetrics: !!extractionMetrics
    })

    // Validate input
    if (!text || text.length < 50) {
      console.log('❌ Text too short for analysis')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Resume text too short for analysis (minimum 50 characters)',
          data: null
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get OpenAI API key with validation
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey || !openaiApiKey.startsWith('sk-')) {
      console.error('❌ Invalid OpenAI API Key - missing or wrong format')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OpenAI API key not configured properly',
          data: null
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🚀 Calling OpenAI with enhanced prompt...')

    // Enhanced prompt for better skill extraction
    const prompt = `You are a senior HR analyst and resume parsing expert. Analyze this real resume and extract ACTUAL information.

RESUME TEXT TO ANALYZE:
${text.substring(0, 8000)}

Extract the candidate's real information and skills from the resume above. Return ONLY valid JSON:

{
  "personalInfo": {
    "name": "actual candidate name from resume (not placeholder)",
    "email": "actual email if found",
    "phone": "actual phone if found",
    "location": "actual location if found"
  },
  "currentRole": "most recent job title from resume",
  "experienceLevel": "Entry|Mid|Senior|Executive based on years and responsibilities",
  "professionalSummary": "2-3 sentence summary based on actual resume content and achievements",
  "skills": {
    "technical": ["actual technical skills, tools, software found in resume"],
    "business": ["actual business skills, management abilities found"],
    "soft": ["actual soft skills, interpersonal abilities mentioned"],
    "industry": ["actual industry-specific skills and knowledge areas"]
  }
}

CRITICAL: Extract real information from the resume text. Do not use placeholder values like "Full Name", "email@domain.com", or generic skills. Find actual skills mentioned or implied in the candidate's experience.`

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      }),
    })

    console.log('📡 OpenAI response status:', openaiResponse.status)

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text()
      console.error('❌ OpenAI API error:', openaiResponse.status, errorData.substring(0, 200))
      
      // Return enhanced fallback instead of failing
      const fallbackResult = createFallbackAnalysis(text, fileName)
      
      return new Response(
        JSON.stringify({
          success: true,
          data: fallbackResult,
          analysisType: 'fallback-pattern-matching',
          textQuality: calculateTextQuality(text),
          skillsExtracted: countSkills(fallbackResult.skills),
          note: 'Used intelligent fallback due to OpenAI API issue'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const openaiData = await openaiResponse.json()
    console.log('🤖 OpenAI response received:', {
      usage: openaiData.usage,
      hasChoices: !!openaiData.choices?.length
    })

    let analysisResult
    try {
      const content = openaiData.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content in OpenAI response')
      }
      
      console.log('📋 Parsing OpenAI JSON response...')
      analysisResult = JSON.parse(content)
      
      console.log('✅ OpenAI analysis successful:', {
        hasName: !!analysisResult.personalInfo?.name,
        nameIsReal: analysisResult.personalInfo?.name !== 'Full Name',
        totalSkills: countSkills(analysisResult.skills)
      })
      
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response:', parseError)
      console.log('📋 Raw OpenAI content (first 200 chars):', openaiData.choices[0]?.message?.content?.substring(0, 200))
      
      // Use fallback instead of failing
      analysisResult = createFallbackAnalysis(text, fileName)
    }

    // Enhanced fallback if OpenAI returns poor results
    const totalSkills = countSkills(analysisResult.skills)
    const hasPlaceholderData = analysisResult.personalInfo?.name === 'Full Name' || 
                              analysisResult.personalInfo?.email === 'email@domain.com'

    if (totalSkills < 3 || hasPlaceholderData) {
      console.log('🔧 Enhancing results with pattern matching...')
      analysisResult = enhanceWithPatternMatching(text, analysisResult, fileName)
    }

    const finalSkillCount = countSkills(analysisResult.skills)
    const analysisType = totalSkills >= 5 ? 'ai-analysis' : 'enhanced-fallback'

    console.log('✅ Analysis completed:', {
      analysisType,
      finalSkillCount,
      textQuality: calculateTextQuality(text)
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: analysisResult,
        analysisType,
        textQuality: calculateTextQuality(text),
        skillsExtracted: finalSkillCount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('💥 Resume analysis error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Analysis failed due to server error',
        data: null
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Helper Functions
function createFallbackAnalysis(text: string, fileName: string) {
  const skills = extractSkillsWithPatterns(text)
  const contact = extractContactInfo(text)
  const name = extractNameFromText(text) || extractNameFromFilename(fileName)
  
  return {
    personalInfo: {
      name: name,
      email: contact.email,
      phone: contact.phone,
      location: contact.location
    },
    currentRole: determineRole(text),
    experienceLevel: determineExperienceLevel(text),
    professionalSummary: generateSummary(text, skills),
    skills: skills
  }
}

function enhanceWithPatternMatching(text: string, existing: any, fileName: string) {
  const enhancedSkills = extractSkillsWithPatterns(text)
  const contact = extractContactInfo(text)
  
  // Merge skills
  const mergedSkills = {
    technical: [...new Set([...(existing.skills?.technical || []), ...enhancedSkills.technical])],
    business: [...new Set([...(existing.skills?.business || []), ...enhancedSkills.business])],
    soft: [...new Set([...(existing.skills?.soft || []), ...enhancedSkills.soft])],
    industry: [...new Set([...(existing.skills?.industry || []), ...enhancedSkills.industry])]
  }
  
  // Enhance personal info if missing
  if (!existing.personalInfo?.name || existing.personalInfo.name === 'Full Name') {
    existing.personalInfo.name = extractNameFromText(text) || extractNameFromFilename(fileName)
  }
  
  if (!existing.personalInfo?.email && contact.email) {
    existing.personalInfo.email = contact.email
  }
  
  if (!existing.personalInfo?.phone && contact.phone) {
    existing.personalInfo.phone = contact.phone
  }
  
  existing.skills = mergedSkills
  return existing
}

function extractSkillsWithPatterns(text: string) {
  const skillPatterns = {
    technical: [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'HTML', 'CSS',
      'AWS', 'Azure', 'Docker', 'Git', 'MongoDB', 'PostgreSQL', 'Excel', 'Power BI',
      'Tableau', 'Salesforce', 'CRM', 'ERP', 'Jira', 'Slack', 'Microsoft Office'
    ],
    business: [
      'Project Management', 'Leadership', 'Sales', 'Marketing', 'Account Management',
      'Customer Service', 'Business Development', 'Strategic Planning', 'Budgeting',
      'Team Management', 'Operations', 'Process Improvement', 'Quality Assurance',
      'Negotiation', 'Vendor Management', 'Client Relations'
    ],
    soft: [
      'Communication', 'Teamwork', 'Problem Solving', 'Leadership', 'Time Management',
      'Adaptability', 'Critical Thinking', 'Collaboration', 'Presentation',
      'Writing', 'Public Speaking', 'Creativity', 'Initiative', 'Mentoring'
    ],
    industry: [
      'Healthcare', 'Finance', 'Technology', 'Education', 'Retail', 'Manufacturing',
      'Consulting', 'Real Estate', 'Insurance', 'Telecommunications', 'Government',
      'Non-profit', 'Automotive', 'Construction', 'Media', 'Hospitality'
    ]
  }

  const foundSkills = {
    technical: [],
    business: [],
    soft: [],
    industry: []
  }

  const textLower = text.toLowerCase()
  
  for (const [category, skills] of Object.entries(skillPatterns)) {
    for (const skill of skills) {
      const regex = new RegExp(`\\b${skill.toLowerCase()}\\b`, 'i')
      if (regex.test(textLower)) {
        foundSkills[category].push(skill)
      }
    }
  }
  
  return foundSkills
}

function extractContactInfo(text: string) {
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
  const phoneMatch = text.match(/(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/)
  const locationMatch = text.match(/([A-Z][a-z]+,\s*[A-Z]{2})|([A-Z][a-z]+\s+[A-Z][a-z]+,\s*[A-Z]{2})/g)
  
  return {
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[0] : '',
    location: locationMatch ? locationMatch[0] : ''
  }
}

function extractNameFromText(text: string): string {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  for (const line of lines.slice(0, 5)) {
    // Skip obvious headers and contact info
    if (line.toLowerCase().includes('resume') || 
        line.includes('@') || 
        line.includes('http') ||
        line.length < 5 || 
        line.length > 50) {
      continue
    }
    
    // Look for name patterns
    const namePattern = /^[A-Z][a-z]+(\s+[A-Z][a-z]+){1,3}$/
    if (namePattern.test(line)) {
      return line
    }
  }
  
  return ''
}

function extractNameFromFilename(fileName: string): string {
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')
  return nameWithoutExt
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function determineRole(text: string): string {
  const rolePatterns = [
    'manager', 'director', 'engineer', 'developer', 'analyst', 'coordinator',
    'specialist', 'consultant', 'administrator', 'supervisor', 'lead'
  ]
  
  const textLower = text.toLowerCase()
  for (const role of rolePatterns) {
    if (textLower.includes(role)) {
      return role.charAt(0).toUpperCase() + role.slice(1)
    }
  }
  
  return 'Professional'
}

function determineExperienceLevel(text: string): string {
  const yearsMatch = text.match(/(\d+)\+?\s*years?/gi)
  if (yearsMatch) {
    const maxYears = Math.max(...yearsMatch.map(y => parseInt(y.match(/\d+/)[0])))
    if (maxYears >= 8) return 'Senior'
    if (maxYears >= 4) return 'Mid-Level'
    return 'Entry Level'
  }
  
  const textLower = text.toLowerCase()
  if (/senior|lead|principal|director|manager/.test(textLower)) return 'Senior'
  if (/junior|entry|intern|graduate|associate/.test(textLower)) return 'Entry Level'
  
  return 'Mid-Level'
}

function generateSummary(text: string, skills: any): string {
  const totalSkills = countSkills(skills)
  const role = determineRole(text)
  const experience = determineExperienceLevel(text)
  
  return `${experience} ${role} with demonstrated expertise across ${totalSkills} key skill areas. ` +
         `Strong background in ${skills.business?.slice(0, 2).join(' and ') || 'professional development'} ` +
         `with experience in ${skills.technical?.slice(0, 2).join(' and ') || 'various tools and technologies'}.`
}

function countSkills(skills: any): number {
  if (!skills) return 0
  return Object.values(skills).reduce((acc: number, arr: any) => {
    return acc + (Array.isArray(arr) ? arr.length : 0)
  }, 0)
}

function calculateTextQuality(text: string): number {
  const words = text.split(/\s+/).length
  const readableChars = (text.match(/[a-zA-Z0-9\s]/g) || []).length
  const totalChars = text.length
  
  const readablePercentage = totalChars > 0 ? (readableChars / totalChars) * 100 : 0
  const lengthScore = Math.min(100, (words / 200) * 100)
  
  return Math.round((readablePercentage + lengthScore) / 2)
}