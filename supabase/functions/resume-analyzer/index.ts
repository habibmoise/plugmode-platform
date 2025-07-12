// supabase/functions/resume-analyzer/index.ts - FINAL VERSION WITH REAL AI
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
    const { text, fileName } = await req.json()
    
    console.log('📄 FINAL analyzer called with text length:', text?.length || 0)
    console.log('📄 First 500 chars:', text?.substring(0, 500))

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiApiKey) {
      console.error('❌ No OpenAI API key found')
      return fallbackAnalysis(text, fileName)
    }

    // REAL OpenAI Analysis
    try {
      console.log('🤖 Using REAL OpenAI analysis...')
      
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
              content: `You are an expert resume analyzer. Extract information from the resume text and return a JSON object with:
              {
                "personalInfo": {
                  "name": "Full name of the person",
                  "email": "Email address",
                  "phone": "Phone number", 
                  "location": "City, State/Country"
                },
                "currentRole": "Current job title or most recent position",
                "experienceLevel": "Entry Level/Mid Level/Senior Level/Executive Level",
                "skills": {
                  "technical": ["Technical skills like software, tools, programming languages"],
                  "business": ["Business skills like sales, marketing, management"],
                  "soft": ["Soft skills like communication, leadership, problem-solving"],
                  "industry": ["Industry-specific skills"]
                },
                "professionalSummary": "2-3 sentence summary of their background and expertise",
                "keyStrengths": ["Top 8 most important skills/strengths"],
                "totalExperience": "Number of years of experience (estimate)"
              }

              Be very thorough in skill extraction. Look for:
              - Job titles and responsibilities 
              - Technologies and tools mentioned
              - Educational background
              - Certifications
              - Industry experience
              - Leadership and management experience
              - Languages spoken
              - Software proficiency

              Extract the person's actual name, not the filename. Look carefully at the beginning of the resume.`
            },
            {
              role: 'user',
              content: `Please analyze this resume and extract comprehensive information:\n\n${text.substring(0, 8000)}`
            }
          ],
          max_tokens: 1500,
          temperature: 0.1
        })
      })

      if (!openaiResponse.ok) {
        console.error('❌ OpenAI API error:', openaiResponse.status, await openaiResponse.text())
        throw new Error(`OpenAI API error: ${openaiResponse.status}`)
      }

      const openaiData = await openaiResponse.json()
      console.log('✅ OpenAI response received')
      
      const aiAnalysis = JSON.parse(openaiData.choices[0].message.content)
      console.log('🎯 AI Analysis:', aiAnalysis)

      // Count total skills
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
            personalInfo: aiAnalysis.personalInfo || {},
            currentRole: aiAnalysis.currentRole || 'Professional',
            experienceLevel: aiAnalysis.experienceLevel || 'Mid Level',
            skills: aiAnalysis.skills || { technical: [], business: [], soft: [], industry: [] },
            professionalSummary: aiAnalysis.professionalSummary || 'Experienced professional with diverse skill set.',
            keyStrengths: aiAnalysis.keyStrengths || [],
            totalExperience: aiAnalysis.totalExperience || 'Not specified',
            remoteWorkReady: true
          },
          analysisType: 'openai-powered',
          totalSkillsFound: totalSkills
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (openaiError) {
      console.error('❌ OpenAI analysis failed:', openaiError)
      console.log('🔄 Falling back to enhanced analysis...')
      return fallbackAnalysis(text, fileName)
    }

  } catch (error) {
    console.error('❌ Function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        fallback: 'Please try uploading a text-based PDF or Word document'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function fallbackAnalysis(text: string, fileName: string) {
  console.log('🔄 Using fallback analysis...')
  
  const textLower = text.toLowerCase()
  
  // Enhanced name extraction
  const namePatterns = [
    // Look for name patterns at the beginning
    /^([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/m,
    // Look for "Name:" pattern
    /name[:\s]+([A-Za-z\s]{2,50})/i,
    // Look for email prefix (name before @)
    /([a-z]+\.?[a-z]+)@/i
  ]
  
  let extractedName = ''
  for (const pattern of namePatterns) {
    const match = text.match(pattern)
    if (match && match[1] && !match[1].toLowerCase().includes('resume')) {
      extractedName = match[1].trim()
      break
    }
  }
  
  // Enhanced skill extraction with comprehensive database
  const skillDatabase = {
    technical: {
      'Salesforce': ['salesforce', 'sfdc'],
      'Microsoft Excel': ['excel', 'spreadsheet'],
      'PowerPoint': ['powerpoint', 'ppt'],
      'CRM Systems': ['crm', 'customer relationship'],
      'Data Analysis': ['data analysis', 'analytics'],
      'SQL': ['sql', 'database'],
      'Microsoft Office': ['microsoft office', 'ms office'],
      'Google Analytics': ['google analytics'],
      'HubSpot': ['hubspot'],
      'Tableau': ['tableau'],
      'Power BI': ['power bi', 'powerbi']
    },
    business: {
      'Sales Management': ['sales management', 'sales manager'],
      'Business Development': ['business development', 'biz dev'],
      'Account Management': ['account management', 'account manager'],
      'Project Management': ['project management', 'project manager'],
      'Strategic Planning': ['strategic planning', 'strategy'],
      'Revenue Growth': ['revenue growth', 'revenue'],
      'Pipeline Management': ['pipeline', 'sales pipeline'],
      'Lead Generation': ['lead generation', 'lead gen'],
      'Market Research': ['market research'],
      'Budget Management': ['budget management', 'budget'],
      'Partnership Development': ['partnership', 'partnerships'],
      'Stakeholder Management': ['stakeholder'],
      'Operations Management': ['operations'],
      'Training & Development': ['training', 'development'],
      'Customer Success': ['customer success'],
      'Sales Operations': ['sales operations', 'sales ops']
    },
    soft: {
      'Leadership': ['leadership', 'lead', 'leading'],
      'Communication': ['communication', 'communicate'],
      'Team Management': ['team management', 'manage team'],
      'Problem Solving': ['problem solving', 'troubleshoot'],
      'Negotiation': ['negotiation', 'negotiate'],
      'Presentation': ['presentation', 'presenting'],
      'Critical Thinking': ['critical thinking'],
      'Time Management': ['time management'],
      'Adaptability': ['adaptability', 'flexible'],
      'Mentoring': ['mentoring', 'coaching'],
      'Cross-functional Collaboration': ['cross-functional', 'collaboration'],
      'Relationship Building': ['relationship building']
    },
    industry: {
      'B2B Sales': ['b2b', 'business to business'],
      'SaaS': ['saas', 'software as a service'],
      'Enterprise Sales': ['enterprise'],
      'International Business': ['international', 'global'],
      'Financial Services': ['financial', 'finance'],
      'Technology': ['technology', 'tech'],
      'Healthcare': ['healthcare', 'medical'],
      'Education': ['education', 'educational'],
      'Consulting': ['consulting', 'consultant']
    }
  }
  
  const foundSkills: any = { technical: [], business: [], soft: [], industry: [] }
  
  // Extract skills from each category
  Object.entries(skillDatabase).forEach(([category, skills]) => {
    Object.entries(skills).forEach(([skill, patterns]) => {
      if (patterns.some(pattern => textLower.includes(pattern))) {
        foundSkills[category].push(skill)
      }
    })
  })
  
  // Extract email
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)
  const email = emailMatch?.[0] || ''
  
  // Extract phone
  const phoneMatch = text.match(/(\+?[\d\s\-\(\)]{8,15})/g)
  const phone = phoneMatch?.[0]?.replace(/[^\d\+]/g, '') || ''
  
  // Determine role and experience
  let currentRole = 'Professional'
  if (textLower.includes('manager')) currentRole = 'Manager'
  if (textLower.includes('director')) currentRole = 'Director'
  if (textLower.includes('sales')) currentRole = 'Sales Professional'
  if (textLower.includes('developer')) currentRole = 'Developer'
  
  let experienceLevel = 'Mid Level'
  if (textLower.includes('senior') || textLower.includes('lead')) experienceLevel = 'Senior Level'
  if (textLower.includes('director') || textLower.includes('vp')) experienceLevel = 'Executive Level'
  if (textLower.includes('junior') || textLower.includes('entry')) experienceLevel = 'Entry Level'
  
  const allSkills = [
    ...foundSkills.technical,
    ...foundSkills.business,
    ...foundSkills.soft,
    ...foundSkills.industry
  ]
  
  console.log('📊 Fallback analysis found:', allSkills.length, 'skills')
  
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        personalInfo: {
          name: extractedName || fileName.replace(/\.(pdf|doc|docx)$/i, '').replace(/[-_]/g, ' '),
          email: email,
          phone: phone,
          location: ''
        },
        currentRole: currentRole,
        experienceLevel: experienceLevel,
        skills: foundSkills,
        professionalSummary: `Experienced ${currentRole.toLowerCase()} with expertise in ${foundSkills.business.slice(0, 2).join(', ')}.`,
        keyStrengths: allSkills.slice(0, 8),
        remoteWorkReady: true
      },
      analysisType: 'enhanced-fallback',
      totalSkillsFound: allSkills.length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}