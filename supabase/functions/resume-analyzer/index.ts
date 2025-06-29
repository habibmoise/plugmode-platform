// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text } = await req.json()
    
    if (!text || text.length < 50) {
      return new Response(
        JSON.stringify({ error: 'Valid resume text required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🤖 Using REAL OpenAI to analyze resume...')
    
    // Get OpenAI API key
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Clean the text to remove PDF formatting junk
    const cleanText = text
      .replace(/\b(obj|endobj|stream|endstream|xref|startxref|trailer|%%EOF)\b/g, '')
      .replace(/\b\d+\s+\d+\s+(obj|R)\b/g, '')
      .replace(/<<[^>]*>>/g, '')
      .replace(/BT\s+ET/g, '')
      .replace(/[^\x20-\x7E\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    console.log('📝 Cleaned text length:', cleanText.length)
    console.log('📝 Sample cleaned text:', cleanText.substring(0, 300))

    // Call OpenAI API for intelligent analysis
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are an expert resume analyzer. Your job is to:
1. Extract ALL relevant skills from the resume text
2. Identify the person's profession and experience level
3. Extract contact information
4. Focus on skills actually mentioned or demonstrated in the resume

Return ONLY a JSON object with this structure:
{
  "skills": ["skill1", "skill2", "skill3"],
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "phone number",
  "location": "City, State/Country",
  "profession": "detected job role"
}

Be comprehensive but accurate. Include technical skills, business skills, soft skills, tools, and any other relevant competencies mentioned.`
          },
          {
            role: 'user',
            content: `Analyze this resume text and extract information. The text may contain some PDF formatting artifacts - focus on the meaningful content:

${cleanText.substring(0, 4000)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.log('❌ OpenAI API failed:', openaiResponse.status, errorText)
      
      // Fallback to manual analysis if OpenAI fails
      return fallbackAnalysis(text)
    }

    const openaiData = await openaiResponse.json()
    const response = openaiData.choices[0].message.content

    console.log('🤖 OpenAI raw response:', response)

    // Parse JSON response
    let parsedData
    try {
      const cleanResponse = response.replace(/```json|```/g, '').trim()
      parsedData = JSON.parse(cleanResponse)
    } catch (e) {
      console.log('❌ JSON parsing failed, using fallback')
      return fallbackAnalysis(text)
    }

    // Validate and return data
    const extractedData = {
      skills: Array.isArray(parsedData.skills) ? parsedData.skills.slice(0, 15) : [],
      name: parsedData.name || '',
      email: parsedData.email || '',
      phone: parsedData.phone || '',
      location: parsedData.location || '',
      profession: parsedData.profession || ''
    }

    console.log('✅ OpenAI analysis complete:', extractedData)

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.log('❌ Function error:', error?.message)
    return fallbackAnalysis(text)
  }
})

// Fallback analysis function
function fallbackAnalysis(text: string) {
  console.log('🔄 Using fallback analysis...')
  
  const textLower = text.toLowerCase()
  const skills = []
  
  // Basic skill detection as fallback
  const basicSkills = [
    'sales', 'business development', 'leadership', 'management', 'crm', 'salesforce',
    'strategic planning', 'team leadership', 'customer success', 'revenue growth',
    'partnership development', 'account management', 'operations', 'training',
    'communication', 'collaboration', 'problem solving', 'analytical thinking'
  ]
  
  basicSkills.forEach(skill => {
    if (textLower.includes(skill)) {
      skills.push(skill.charAt(0).toUpperCase() + skill.slice(1))
    }
  })
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      data: {
        skills: skills,
        name: '',
        email: '',
        phone: '',
        location: '',
        profession: 'Professional'
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}