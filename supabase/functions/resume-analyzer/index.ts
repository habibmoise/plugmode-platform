// supabase/functions/resume-analyzer/index.ts - PRODUCTION READY
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// 🎯 HARDENED SECURITY - Replace with your actual domain
const allowedOrigins = ['https://plugmode.tech', 'http://localhost:3000']
const isDev = Deno.env.get('SUPABASE_ENV') !== 'production'

// 🔥 Bulletproof CORS headers
const corsHeaders = {
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, Content-Type, X-Application-Name, X-Supabase-Api-Version, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  const origin = req.headers.get('origin') || ''
  const isAllowedOrigin = allowedOrigins.includes(origin)

  if (isDev) console.log('🔗 Request from origin:', origin)

  // ✅ CORS Preflight response - BULLETPROOF
  if (req.method === 'OPTIONS') {
    if (isDev) console.log('🛫 CORS preflight handled')
    return new Response('ok', {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
      },
    })
  }

  try {
    const { text, fileName, extractionMetrics } = await req.json()

    if (isDev) console.log('📦 Processing:', { fileName, textLength: text?.length || 0 })

    // Validate input
    if (!text || text.length < 50) {
      return jsonResponse(400, { 
        success: false, 
        error: 'Resume text too short for analysis' 
      }, origin)
    }

    // Check OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey || !openaiApiKey.startsWith('sk-')) {
      console.error('❌ Invalid OpenAI API Key')
      return jsonResponse(500, { 
        success: false, 
        error: 'OpenAI API key not configured properly' 
      }, origin)
    }

    if (isDev) console.log('🚀 Calling OpenAI...')

    // Enhanced prompt for better extraction
    const prompt = createPrompt(text)

    // Call OpenAI with proper error handling
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1500,
        // Removed problematic response_format
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('❌ OpenAI API error:', openaiResponse.status)
      if (isDev) console.error('OpenAI error details:', errorText)
      
      return jsonResponse(502, { 
        success: false, 
        error: `OpenAI API error: ${openaiResponse.status}` 
      }, origin)
    }

    const aiData = await openaiResponse.json()
    const content = aiData?.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No content received from OpenAI')
    }

    if (isDev) console.log('📋 OpenAI response preview:', content.substring(0, 100))

    // 🛡️ SAFE JSON PARSING - Prevents crashes
    const analysisResult = safeJsonParse(content)

    if (!analysisResult) {
      console.warn('⚠️ Failed to parse OpenAI JSON, using fallback')
      // Create fallback structure
      const fallbackResult = createFallbackStructure(text, fileName)
      const enrichedResult = enhanceSkillsFallback(text, fallbackResult)
      
      return jsonResponse(200, {
        success: true,
        data: enrichedResult,
        analysisType: 'fallback-pattern-matching',
        textQuality: calcTextQuality(text),
        skillsExtracted: countSkills(enrichedResult.skills),
      }, origin)
    }

    // Enhance with fallback patterns if OpenAI found few skills
    const enrichedResult = enhanceSkillsFallback(text, analysisResult)
    const totalSkills = countSkills(enrichedResult.skills)

    if (isDev) console.log('✅ Analysis complete:', {
      name: sanitizeForLog(enrichedResult.personalInfo?.name),
      totalSkills,
      analysisType: totalSkills > 5 ? 'ai-analysis' : 'enhanced-fallback'
    })

    return jsonResponse(200, {
      success: true,
      data: enrichedResult,
      analysisType: totalSkills > 5 ? 'ai-analysis' : 'enhanced-fallback',
      textQuality: extractionMetrics?.textQuality || calcTextQuality(text),
      skillsExtracted: totalSkills,
    }, origin)

  } catch (err) {
    console.error('💥 Resume analyzer error:', err.message)
    if (isDev) console.error('Error stack:', err.stack)
    
    return jsonResponse(500, { 
      success: false, 
      error: 'Analysis failed due to server error' 
    }, origin)
  }
})

// 🔧 Helper Functions

function jsonResponse(status: number, body: unknown, origin: string) {
  const isAllowedOrigin = allowedOrigins.includes(origin)
  
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
      'Content-Type': 'application/json',
    },
  })
}

function createPrompt(text: string): string {
  return `You are a senior HR analyst parsing resumes. Extract REAL information from this resume text.

RESUME TEXT:
${text.slice(0, 8000)}

Return ONLY valid JSON in this exact format:
{
  "personalInfo": {
    "name": "actual candidate name from resume",
    "email": "actual email if found",
    "phone": "actual phone if found",
    "location": "actual location if found"
  },
  "currentRole": "most recent job title from resume",
  "experienceLevel": "Entry|Mid|Senior|Executive",
  "professionalSummary": "2-3 sentence summary based on actual resume content",
  "skills": {
    "technical": ["actual technical skills found"],
    "business": ["actual business skills found"],
    "soft": ["actual soft skills found"],
    "industry": ["actual industry skills found"]
  }
}

IMPORTANT: Extract real information from the resume text. Do not use placeholder values like "Full Name" or "email@domain.com".`
}

function safeJsonParse(content: string) {
  try {
    // Clean common JSON formatting issues
    const cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    
    const parsed = JSON.parse(cleanContent)
    
    // Validate structure
    if (!parsed.personalInfo || !parsed.skills) {
      return null
    }
    
    return parsed
  } catch (error) {
    console.warn('⚠️ JSON parse failed:', error.message)
    return null
  }
}

function createFallbackStructure(text: string, fileName: string) {
  return {
    personalInfo: {
      name: extractNameFromFilename(fileName),
      email: extractEmail(text),
      phone: extractPhone(text),
      location: ''
    },
    currentRole: 'Professional',
    experienceLevel: 'Mid',
    professionalSummary: 'Professional with diverse experience and skills.',
    skills: {
      technical: [],
      business: [],
      soft: [],
      industry: []
    }
  }
}

function enhanceSkillsFallback(text: string, result: any) {
  const skillPatterns = {
    technical: [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'HTML', 'CSS',
      'AWS', 'Azure', 'Docker', 'Git', 'MongoDB', 'PostgreSQL', 'Excel', 'Power BI',
      'Tableau', 'Machine Learning', 'Data Analysis', 'Analytics'
    ],
    business: [
      'Project Management', 'Leadership', 'Sales', 'Marketing', 'CRM',
      'Customer Service', 'Account Management', 'Business Development',
      'Strategic Planning', 'Budget Management', 'Team Management', 'Operations',
      'Process Improvement', 'Quality Assurance', 'Negotiation'
    ],
    soft: [
      'Communication', 'Teamwork', 'Problem Solving', 'Leadership',
      'Time Management', 'Adaptability', 'Critical Thinking', 'Collaboration',
      'Presentation', 'Writing', 'Public Speaking', 'Creativity'
    ],
    industry: [
      'Healthcare', 'Finance', 'Technology', 'Education', 'Retail',
      'Manufacturing', 'Consulting', 'Real Estate', 'Insurance',
      'Telecommunications', 'Government', 'Non-profit'
    ]
  }

  const textLower = text.toLowerCase()
  
  for (const [category, skills] of Object.entries(skillPatterns)) {
    const categorySkills = result.skills?.[category] || []
    
    for (const skill of skills) {
      // Use word boundaries for better matching
      const regex = new RegExp(`\\b${skill.toLowerCase()}\\b`, 'i')
      if (regex.test(textLower) && !categorySkills.includes(skill)) {
        categorySkills.push(skill)
      }
    }
    
    // Remove duplicates and update
    result.skills[category] = Array.from(new Set(categorySkills))
  }
  
  return result
}

function countSkills(skills: any) {
  if (!skills) return 0
  return Object.values(skills).reduce((acc: number, arr: any) => {
    return acc + (Array.isArray(arr) ? arr.length : 0)
  }, 0)
}

function calcTextQuality(text: string) {
  const wordCount = text.split(/\s+/).length
  const charCount = text.length
  
  // Quality based on length and word density
  const lengthScore = Math.min(100, (charCount / 2000) * 50)
  const densityScore = Math.min(100, (wordCount / charCount) * 1000)
  
  return Math.round((lengthScore + densityScore) / 2)
}

function extractNameFromFilename(fileName: string): string {
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')
  return nameWithoutExt
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function extractEmail(text: string): string {
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
  return emailMatch ? emailMatch[0] : ''
}

function extractPhone(text: string): string {
  const phoneMatch = text.match(/(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/)
  return phoneMatch ? phoneMatch[0] : ''
}

function sanitizeForLog(value: string | undefined): string {
  if (!value || isDev) return value || 'N/A'
  // In production, mask PII
  return value.length > 2 ? value.charAt(0) + '*'.repeat(value.length - 2) + value.charAt(value.length - 1) : '***'
}