// supabase/functions/resume-analyzer/index.ts - PHASE 2: OPENAI PROMPT FIX
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, fileName, extractionMetrics } = await req.json()

    console.log('🔍 Resume Analysis Request:', {
      fileName,
      textLength: text?.length || 0,
      extractionQuality: extractionMetrics?.textQuality || 'unknown'
    })

    // Validate input
    if (!text || text.length < 50) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Text too short for analysis',
          data: null
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not found')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OpenAI API key not configured',
          data: null
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🤖 Calling OpenAI with enhanced prompt...')

    // ENHANCED OPENAI PROMPT - PHASE 2 FIX
    const prompt = `You are a senior HR analyst and resume parsing expert analyzing a real resume document.

CRITICAL INSTRUCTIONS:
1. Extract ACTUAL information from the provided resume text - do NOT use placeholder data
2. Find the candidate's real name, contact information, and experience
3. Extract ALL skills mentioned or implied in the resume content
4. Categorize skills into: technical, business, soft, and industry-specific
5. Include skill variations and synonyms (e.g., "project management" = "PM", "project coordination")
6. Determine experience level based on job titles, years, and responsibilities
7. Write a professional summary based on the actual resume content

RESUME TEXT TO ANALYZE:
${text.substring(0, 8000)}

Return ONLY valid JSON in this exact format:
{
  "personalInfo": {
    "name": "actual candidate name from resume",
    "email": "actual email if found",
    "phone": "actual phone if found", 
    "location": "actual location if found"
  },
  "currentRole": "most recent job title from resume",
  "experienceLevel": "Entry|Mid|Senior|Executive based on experience",
  "professionalSummary": "2-3 sentence summary based on actual resume content",
  "skills": {
    "technical": ["actual technical skills found"],
    "business": ["actual business skills found"],
    "soft": ["actual soft skills found"],
    "industry": ["actual industry-specific skills found"]
  }
}

IMPORTANT: Extract real information from the resume text provided above. Do not use template or placeholder values.`

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

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text()
      console.error('❌ OpenAI API Error:', errorData)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `OpenAI API error: ${openaiResponse.status}`,
          data: null
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const openaiData = await openaiResponse.json()
    console.log('🤖 OpenAI Response received:', {
      usage: openaiData.usage,
      hasChoices: !!openaiData.choices?.length
    })

    let analysisResult
    try {
      const content = openaiData.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content in OpenAI response')
      }
      
      analysisResult = JSON.parse(content)
      console.log('✅ Parsed OpenAI result:', {
        hasName: !!analysisResult.personalInfo?.name,
        skillsFound: {
          technical: analysisResult.skills?.technical?.length || 0,
          business: analysisResult.skills?.business?.length || 0,
          soft: analysisResult.skills?.soft?.length || 0,
          industry: analysisResult.skills?.industry?.length || 0
        }
      })
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response:', parseError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to parse AI analysis',
          data: null
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // ENHANCED FALLBACK - If OpenAI returns poor results
    const totalSkills = (analysisResult.skills?.technical?.length || 0) +
                       (analysisResult.skills?.business?.length || 0) +
                       (analysisResult.skills?.soft?.length || 0) +
                       (analysisResult.skills?.industry?.length || 0)

    if (totalSkills < 3 || 
        analysisResult.personalInfo?.name === 'Full Name' ||
        analysisResult.personalInfo?.email === 'email@domain.com') {
      
      console.log('🔧 OpenAI returned poor results, enhancing with pattern matching...')
      
      // Pattern-based skill extraction as fallback
      const skillPatterns = {
        technical: [
          'JavaScript', 'Python', 'Java', 'C++', 'React', 'Node.js', 'SQL', 'HTML', 'CSS',
          'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git', 'Jenkins', 'MongoDB', 'PostgreSQL',
          'Machine Learning', 'AI', 'Data Science', 'Analytics', 'Excel', 'Power BI', 'Tableau'
        ],
        business: [
          'Project Management', 'Leadership', 'Strategy', 'Business Development', 'Sales',
          'Marketing', 'Customer Service', 'Account Management', 'Budget Management',
          'Process Improvement', 'Change Management', 'Strategic Planning', 'Negotiation'
        ],
        soft: [
          'Communication', 'Teamwork', 'Problem Solving', 'Critical Thinking', 'Adaptability',
          'Time Management', 'Attention to Detail', 'Creativity', 'Initiative', 'Collaboration'
        ],
        industry: [
          'Healthcare', 'Finance', 'Technology', 'Education', 'Retail', 'Manufacturing',
          'Consulting', 'Real Estate', 'Insurance', 'Telecommunications', 'Government'
        ]
      }

      const enhancedSkills = {
        technical: [],
        business: [],
        soft: [],
        industry: []
      }

      const textLower = text.toLowerCase()
      
      for (const [category, skills] of Object.entries(skillPatterns)) {
        for (const skill of skills) {
          if (textLower.includes(skill.toLowerCase())) {
            enhancedSkills[category].push(skill)
          }
        }
      }

      // Merge with OpenAI results
      analysisResult.skills = {
        technical: [...(analysisResult.skills?.technical || []), ...enhancedSkills.technical],
        business: [...(analysisResult.skills?.business || []), ...enhancedSkills.business],
        soft: [...(analysisResult.skills?.soft || []), ...enhancedSkills.soft],
        industry: [...(analysisResult.skills?.industry || []), ...enhancedSkills.industry]
      }

      // Remove duplicates
      for (const category of Object.keys(analysisResult.skills)) {
        analysisResult.skills[category] = [...new Set(analysisResult.skills[category])]
      }

      console.log('🚀 Enhanced skills extraction completed:', {
        technical: analysisResult.skills.technical.length,
        business: analysisResult.skills.business.length,
        soft: analysisResult.skills.soft.length,
        industry: analysisResult.skills.industry.length
      })
    }

    // Calculate final statistics
    const finalTotalSkills = (analysisResult.skills?.technical?.length || 0) +
                            (analysisResult.skills?.business?.length || 0) +
                            (analysisResult.skills?.soft?.length || 0) +
                            (analysisResult.skills?.industry?.length || 0)

    const analysisType = totalSkills >= 3 ? 'ai-analysis' : 'enhanced-pattern-matching'
    const textQuality = extractionMetrics?.textQuality || Math.min(100, Math.round((text.length / 1000) * 10))

    console.log('✅ Analysis completed:', {
      analysisType,
      totalSkills: finalTotalSkills,
      textQuality: `${textQuality}%`,
      hasName: !!analysisResult.personalInfo?.name && analysisResult.personalInfo.name !== 'Full Name'
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: analysisResult,
        analysisType,
        textQuality,
        skillsExtracted: finalTotalSkills
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Resume analysis error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Analysis failed',
        data: null
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})