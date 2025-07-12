// supabase/functions/resume-analyzer/index.ts - OPTIMIZED OPENAI PROMPT
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

    // Show first part of text for debugging
    console.log('🔍 Text preview:', text?.substring(0, 500))

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    console.log('🔑 OpenAI key exists:', !!openaiApiKey)

    if (!openaiApiKey) {
      console.log('🔄 No OpenAI key, using enhanced fallback')
      return enhancedFallbackAnalysis(text, fileName)
    }

    try {
      console.log('🤖 Attempting OpenAI analysis with optimized prompt...')
      
      // Clean and prepare text
      const cleanText = text?.replace(/[^\x20-\x7E\x09\x0A\x0D]/g, ' ')
                             .replace(/\s+/g, ' ')
                             .trim()
                             .substring(0, 12000) || ''

      console.log('✨ Cleaned text length:', cleanText.length)
      console.log('✨ Cleaned text preview:', cleanText.substring(0, 300))

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
              content: `You are an expert resume analyzer. Your job is to extract comprehensive information from resumes and return structured data.

CRITICAL INSTRUCTIONS:
1. Find ALL skills mentioned in the resume - be very thorough
2. Look for job titles, responsibilities, technologies, tools, software mentioned
3. Include implied skills based on job descriptions and achievements
4. Extract contact information carefully
5. Determine role based on job titles and experience described

SKILL CATEGORIES TO LOOK FOR:
- Technical: Any software, tools, programming languages, platforms, systems (Salesforce, Excel, CRM, etc.)
- Business: Management, sales, marketing, strategy, project management, business development
- Soft: Communication, leadership, teamwork, problem-solving, training, mentoring
- Industry: Specific industry knowledge (SaaS, B2B, healthcare, etc.)

Return ONLY this JSON structure (no additional text):
{
  "personalInfo": {
    "name": "Person's full name from resume (not filename)",
    "email": "email address if found",
    "phone": "phone number if found",
    "location": "location if mentioned"
  },
  "currentRole": "Most recent job title or Professional",
  "experienceLevel": "Entry Level, Mid Level, Senior Level, or Executive Level",
  "skills": {
    "technical": ["list every technical skill, tool, software mentioned"],
    "business": ["list every business skill, management skill mentioned"],
    "soft": ["list every soft skill mentioned or implied"],
    "industry": ["list industry-specific knowledge"]
  },
  "professionalSummary": "2-3 sentence summary of their background",
  "keyStrengths": ["top 8 most important skills from all categories"]
}

BE VERY THOROUGH - extract every skill you can find, even if mentioned briefly.`
            },
            {
              role: 'user',
              content: `Analyze this resume thoroughly and extract ALL skills:\n\n${cleanText}`
            }
          ],
          max_tokens: 3000,
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
      console.log('✅ OpenAI response received successfully')
      
      let aiAnalysis
      try {
        const content = openaiData.choices[0].message.content
        console.log('🔍 Raw OpenAI content length:', content.length)
        console.log('🔍 Raw OpenAI content preview:', content.substring(0, 300))
        
        aiAnalysis = JSON.parse(content)
        console.log('✅ Successfully parsed OpenAI JSON')
        console.log('👤 AI extracted name:', aiAnalysis.personalInfo?.name)
        console.log('💼 AI detected role:', aiAnalysis.currentRole)
        console.log('🎯 AI extracted skills:', {
          technical: aiAnalysis.skills?.technical?.length || 0,
          business: aiAnalysis.skills?.business?.length || 0,
          soft: aiAnalysis.skills?.soft?.length || 0,
          industry: aiAnalysis.skills?.industry?.length || 0
        })
      } catch (parseError) {
        console.error('❌ Failed to parse OpenAI JSON:', parseError)
        console.log('🔍 Problematic content:', openaiData.choices[0].message.content)
        throw new Error('OpenAI returned invalid JSON format')
      }

      // Count total skills
      const totalSkills = [
        ...(aiAnalysis.skills?.technical || []),
        ...(aiAnalysis.skills?.business || []),
        ...(aiAnalysis.skills?.soft || []),
        ...(aiAnalysis.skills?.industry || [])
      ].length

      console.log('📊 Total skills extracted by AI:', totalSkills)

      // If OpenAI found very few skills, enhance with pattern matching
      let enhancedSkills = aiAnalysis.skills
      if (totalSkills < 5) {
        console.log('🔄 Low skill count from AI, enhancing with pattern matching...')
        const fallbackSkills = extractSkillsWithPatterns(cleanText)
        
        enhancedSkills = {
          technical: [...(aiAnalysis.skills?.technical || []), ...fallbackSkills.technical].filter((v, i, a) => a.indexOf(v) === i),
          business: [...(aiAnalysis.skills?.business || []), ...fallbackSkills.business].filter((v, i, a) => a.indexOf(v) === i),
          soft: [...(aiAnalysis.skills?.soft || []), ...fallbackSkills.soft].filter((v, i, a) => a.indexOf(v) === i),
          industry: [...(aiAnalysis.skills?.industry || []), ...fallbackSkills.industry].filter((v, i, a) => a.indexOf(v) === i)
        }
        
        const enhancedTotal = enhancedSkills.technical.length + enhancedSkills.business.length + enhancedSkills.soft.length + enhancedSkills.industry.length
        console.log('🚀 Enhanced total skills:', enhancedTotal)
      }

      const finalTotalSkills = enhancedSkills.technical.length + enhancedSkills.business.length + enhancedSkills.soft.length + enhancedSkills.industry.length

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            personalInfo: aiAnalysis.personalInfo || { name: '', email: '', phone: '', location: '' },
            currentRole: aiAnalysis.currentRole || 'Professional',
            experienceLevel: aiAnalysis.experienceLevel || 'Mid Level',
            skills: enhancedSkills,
            professionalSummary: aiAnalysis.professionalSummary || 'Professional with diverse experience.',
            keyStrengths: aiAnalysis.keyStrengths || [],
            remoteWorkReady: true
          },
          analysisType: totalSkills < 5 ? 'openai-enhanced' : 'openai-powered',
          totalSkillsFound: finalTotalSkills,
          aiSkillsFound: totalSkills,
          textPreview: cleanText.substring(0, 200)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (openaiError) {
      console.error('❌ OpenAI failed:', openaiError)
      console.log('🔄 Falling back to enhanced pattern matching')
      return enhancedFallbackAnalysis(text, fileName)
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

function extractSkillsWithPatterns(text: string) {
  const textLower = text.toLowerCase()
  const skills = {
    technical: [] as string[],
    business: [] as string[],
    soft: [] as string[],
    industry: [] as string[]
  }

  // Comprehensive skill patterns
  const skillPatterns = [
    // Sales & CRM
    { pattern: /\b(salesforce|sfdc|crm|hubspot|pipedrive)\b/i, skill: 'CRM Systems', category: 'technical' },
    { pattern: /\b(sales|selling|revenue|quota|pipeline)\b/i, skill: 'Sales', category: 'business' },
    { pattern: /\b(business development|bizdev|bd|partnerships)\b/i, skill: 'Business Development', category: 'business' },
    { pattern: /\b(account management|client management|relationship management)\b/i, skill: 'Account Management', category: 'business' },
    
    // Office & Tools
    { pattern: /\b(excel|powerpoint|word|office|outlook)\b/i, skill: 'Microsoft Office', category: 'technical' },
    { pattern: /\b(tableau|power.?bi|analytics|reporting)\b/i, skill: 'Data Analytics', category: 'technical' },
    
    // Management & Leadership
    { pattern: /\b(management|managing|manager|leadership|leading)\b/i, skill: 'Leadership', category: 'soft' },
    { pattern: /\b(project management|pmp|agile|scrum)\b/i, skill: 'Project Management', category: 'business' },
    { pattern: /\b(strategic planning|strategy|business strategy)\b/i, skill: 'Strategic Planning', category: 'business' },
    { pattern: /\b(team|collaboration|teamwork|cross.functional)\b/i, skill: 'Team Collaboration', category: 'soft' },
    
    // Communication & Training
    { pattern: /\b(communication|presenting|presentation)\b/i, skill: 'Communication', category: 'soft' },
    { pattern: /\b(training|mentoring|coaching|teaching)\b/i, skill: 'Training & Development', category: 'soft' },
    { pattern: /\b(negotiation|negotiating|conflict resolution)\b/i, skill: 'Negotiation', category: 'soft' },
    
    // Technical Skills
    { pattern: /\b(javascript|js|react|node|python|java|html|css)\b/i, skill: 'Programming', category: 'technical' },
    { pattern: /\b(sql|database|mysql|postgresql)\b/i, skill: 'Database Management', category: 'technical' },
    { pattern: /\b(aws|azure|cloud|docker)\b/i, skill: 'Cloud Technologies', category: 'technical' },
    
    // Industry
    { pattern: /\b(saas|software.as.a.service)\b/i, skill: 'SaaS', category: 'industry' },
    { pattern: /\b(b2b|business.to.business)\b/i, skill: 'B2B Sales', category: 'industry' },
    { pattern: /\b(healthcare|medical|fintech|financial)\b/i, skill: 'Industry Knowledge', category: 'industry' }
  ]

  skillPatterns.forEach(({ pattern, skill, category }) => {
    if (pattern.test(textLower) && !skills[category as keyof typeof skills].includes(skill)) {
      skills[category as keyof typeof skills].push(skill)
    }
  })

  return skills
}

function enhancedFallbackAnalysis(text: string, fileName: string) {
  console.log('🔄 Enhanced fallback analysis starting')
  
  const textLower = (text || '').toLowerCase()
  const skills = extractSkillsWithPatterns(text || '')

  // Extract personal info
  const emailMatch = text?.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)?.[1] || ''
  const phoneMatch = text?.match(/(\+?[\d\s\-\(\)]{8,20})/)?.[1]?.replace(/[^\d\+]/g, '').slice(0, 15) || ''
  
  // Name extraction
  let extractedName = ''
  const namePatterns = [
    /^([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/m,
    /name[:\s]+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
  ]
  
  for (const pattern of namePatterns) {
    const match = text?.match(pattern)
    if (match && match[1] && !match[1].toLowerCase().includes('resume')) {
      extractedName = match[1].trim()
      break
    }
  }
  
  if (!extractedName) {
    extractedName = fileName?.replace(/\.(pdf|doc|docx)$/i, '').replace(/[-_]/g, ' ').replace(/resume/gi, '').trim() || 'Professional'
  }

  // Role detection
  let currentRole = 'Professional'
  if (/\b(sales manager|account manager)\b/i.test(textLower)) currentRole = 'Sales Manager'
  else if (/\b(software (developer|engineer)|developer)\b/i.test(textLower)) currentRole = 'Software Developer'
  else if (/\b(project manager|program manager)\b/i.test(textLower)) currentRole = 'Project Manager'
  else if (/\b(marketing manager|brand manager)\b/i.test(textLower)) currentRole = 'Marketing Manager'

  const totalSkills = skills.technical.length + skills.business.length + skills.soft.length + skills.industry.length
  
  console.log('📊 Fallback extracted', totalSkills, 'skills')
  console.log('👤 Extracted name:', extractedName)
  console.log('💼 Detected role:', currentRole)

  const result = {
    personalInfo: {
      name: extractedName,
      email: emailMatch,
      phone: phoneMatch,
      location: ''
    },
    currentRole: currentRole,
    experienceLevel: 'Mid Level',
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
      totalSkillsFound: totalSkills,
      textPreview: text?.substring(0, 200) || ''
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}