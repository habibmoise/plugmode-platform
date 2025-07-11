// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const debugInfo: string[] = []
  debugInfo.push('Function started at ' + new Date().toISOString())

  try {
    const { text } = await req.json()
    debugInfo.push(`Text received, length: ${text?.length}`)

    if (!text || text.length < 50) {
      return new Response(
        JSON.stringify({ 
          error: 'Valid resume text required',
          debug: debugInfo
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiApiKey) {
      debugInfo.push('CRITICAL: OpenAI API key not found in environment')
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured',
          debug: debugInfo
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    debugInfo.push(`OpenAI key found, length: ${openaiApiKey.length}, starts with sk-: ${openaiApiKey.startsWith('sk-')}`)

    // Call OpenAI API
    try {
      debugInfo.push('About to call OpenAI API...')
      
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
              role: 'system',
              content: `You are an expert resume analyzer. Extract comprehensive information and return ONLY valid JSON:

{
  "name": "Full Name",
  "email": "email@domain.com", 
  "phone": "+1234567890",
  "location": "City, State",
  "skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "profession": "detected job title"
}

Extract ALL skills: technical, business, soft skills, tools, certifications.`
            },
            {
              role: 'user',
              content: `Analyze this resume and return only the JSON:\n\n${text}`
            }
          ],
          temperature: 0.3,
          max_tokens: 800
        })
      })

      debugInfo.push(`OpenAI API response status: ${openaiResponse.status}`)
      debugInfo.push(`OpenAI API response headers: ${JSON.stringify(Object.fromEntries(openaiResponse.headers.entries()))}`)

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text()
        debugInfo.push(`OpenAI API error response: ${errorText}`)
        
        return new Response(
          JSON.stringify({ 
            error: `OpenAI API error: ${openaiResponse.status}`,
            debug: debugInfo,
            openaiError: errorText,
            openaiStatus: openaiResponse.status
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const openaiData = await openaiResponse.json()
      debugInfo.push('OpenAI response received successfully')
      debugInfo.push(`OpenAI usage: ${JSON.stringify(openaiData.usage)}`)

      // Parse AI response
      let extractedData
      try {
        const aiContent = openaiData.choices[0].message.content.trim()
        debugInfo.push(`AI content preview: ${aiContent.substring(0, 100)}...`)
        
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('No valid JSON found')
        }
        
        extractedData = JSON.parse(jsonMatch[0])
        debugInfo.push(`JSON parsed successfully, keys: ${Object.keys(extractedData)}`)
      } catch (parseError) {
        debugInfo.push(`JSON parse failed: ${parseError.message}`)
        
        // Fallback extraction
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
        const phoneMatch = text.match(/[\+]?[1-9]?[\s\-\(\)]?\d{3}[\s\-\(\)]?\d{3}[\s\-]?\d{4}/)
        
        extractedData = {
          name: '',
          email: emailMatch?.[0] || '',
          phone: phoneMatch?.[0] || '',
          location: '',
          skills: ['Communication', 'Problem Solving', 'Teamwork'],
          profession: 'Professional'
        }
        debugInfo.push('Using fallback extraction')
      }

      // Validate data
      const validatedData = {
        name: extractedData.name || '',
        email: extractedData.email || '',
        phone: extractedData.phone || '',
        location: extractedData.location || '',
        skills: Array.isArray(extractedData.skills) ? 
          extractedData.skills.filter(s => s && s.trim()).slice(0, 15) : [],
        profession: extractedData.profession || 'Professional'
      }

      debugInfo.push(`Final skills count: ${validatedData.skills.length}`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: validatedData,
          debug: debugInfo
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (fetchError) {
      debugInfo.push(`Fetch error: ${fetchError.message}`)
      return new Response(
        JSON.stringify({ 
          error: `Network error: ${fetchError.message}`,
          debug: debugInfo
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    debugInfo.push(`Top level error: ${error.message}`)
    return new Response(
      JSON.stringify({ 
        error: `Processing failed: ${error.message}`,
        debug: debugInfo
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})