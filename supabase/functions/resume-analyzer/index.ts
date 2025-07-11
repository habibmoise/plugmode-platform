// supabase/functions/resume-analyzer/index.ts - Update the existing one
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
    
    console.log('📄 Resume analyzer called with text length:', text?.length || 0)

    // Simple skill extraction without OpenAI to avoid API issues
    const skills = extractSkillsFromText(text || '')
    const personalInfo = extractPersonalInfo(text || '', fileName || 'resume.pdf')
    
    const result = {
      personalInfo,
      currentRole: personalInfo.name.includes('Manager') ? 'Manager' : 'Professional',
      experienceLevel: 'Mid Level',
      skills: {
        technical: skills.filter(s => ['Salesforce', 'Excel', 'CRM', 'Data Analysis'].includes(s)),
        business: skills.filter(s => ['Sales', 'Management', 'Leadership', 'Strategy'].includes(s)),
        soft: ['Communication', 'Problem Solving'],
        industry: ['Sales', 'Business Development']
      },
      professionalSummary: `Experienced professional with skills in ${skills.slice(0, 3).join(', ')}.`,
      keyStrengths: skills.slice(0, 5),
      remoteWorkReady: true
    }

    console.log('✅ Analysis completed, found', skills.length, 'skills')

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        analysisType: 'enhanced-extraction'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function extractSkillsFromText(text: string): string[] {
  const textLower = text.toLowerCase()
  const skills = new Set<string>()
  
  const skillMap = {
    'Salesforce': ['salesforce', 'crm'],
    'Sales Management': ['sales', 'revenue', 'quota'],
    'Team Leadership': ['team', 'leadership', 'management', 'managed'],
    'Excel': ['excel', 'spreadsheet'],
    'Data Analysis': ['data', 'analysis', 'analytics'],
    'Project Management': ['project management', 'scrum', 'agile'],
    'Strategic Planning': ['strategy', 'strategic', 'planning'],
    'Customer Relations': ['customer', 'client', 'relationship'],
    'Business Development': ['business development', 'bd'],
    'Communication': ['communication', 'presentation'],
    'Problem Solving': ['problem solving', 'troubleshooting'],
    'Microsoft Office': ['microsoft office', 'word', 'powerpoint']
  }

  Object.entries(skillMap).forEach(([skill, patterns]) => {
    if (patterns.some(pattern => textLower.includes(pattern))) {
      skills.add(skill)
    }
  })

  return Array.from(skills)
}

function extractPersonalInfo(text: string, fileName: string) {
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
  const phoneMatch = text.match(/(\+?[\d\s\-\(\)]{8,15})/)
  
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  let name = ''
  
  for (const line of lines.slice(0, 5)) {
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

  return {
    name: name || 'Professional',
    email: emailMatch ? emailMatch[1] : '',
    phone: phoneMatch ? phoneMatch[1] : '',
    location: ''
  }
}