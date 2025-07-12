// supabase/functions/resume-analyzer/index.ts - Enhanced version
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
    
    console.log('📄 Enhanced resume analyzer called with text length:', text?.length || 0)

    // Enhanced skill extraction
    const allSkills = extractComprehensiveSkills(text || '')
    const personalInfo = extractPersonalInfo(text || '', fileName || 'resume.pdf')
    
    // Categorize skills
    const categorizedSkills = categorizeSkills(allSkills)
    
    console.log('🎯 Enhanced analysis found', allSkills.length, 'total skills')
    console.log('📊 Skills breakdown:', {
      technical: categorizedSkills.technical.length,
      business: categorizedSkills.business.length,
      soft: categorizedSkills.soft.length,
      industry: categorizedSkills.industry.length
    })
    
    const result = {
      personalInfo,
      currentRole: determineRole(text, personalInfo.name),
      experienceLevel: determineExperienceLevel(text),
      skills: categorizedSkills,
      professionalSummary: generateSummary(personalInfo, categorizedSkills, text),
      keyStrengths: allSkills.slice(0, 8), // Top 8 strengths
      remoteWorkReady: assessRemoteReadiness(text, categorizedSkills)
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        analysisType: 'enhanced-extraction',
        totalSkillsFound: allSkills.length
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

function extractComprehensiveSkills(text: string): string[] {
  const textLower = text.toLowerCase()
  const skills = new Set<string>()
  
  // Comprehensive skill database with variations
  const skillDatabase = {
    // CRM & Sales Technology
    'Salesforce': ['salesforce', 'sfdc', 'sales force'],
    'HubSpot': ['hubspot', 'hub spot'],
    'CRM Systems': ['crm', 'customer relationship management'],
    'Pipedrive': ['pipedrive', 'pipe drive'],
    'Zoho CRM': ['zoho', 'zoho crm'],
    
    // Sales Skills
    'Sales Management': ['sales management', 'sales manager', 'managing sales'],
    'Business Development': ['business development', 'biz dev', 'bizdev', 'bd'],
    'Account Management': ['account management', 'account manager', 'managing accounts'],
    'Lead Generation': ['lead generation', 'lead gen', 'generating leads'],
    'Pipeline Management': ['pipeline management', 'sales pipeline', 'managing pipeline'],
    'Revenue Growth': ['revenue growth', 'revenue increase', 'growing revenue'],
    'Sales Forecasting': ['sales forecasting', 'forecasting', 'sales prediction'],
    'Quota Management': ['quota', 'sales quota', 'quota achievement'],
    'Cold Calling': ['cold calling', 'cold calls', 'prospecting calls'],
    'Client Acquisition': ['client acquisition', 'customer acquisition', 'new client'],
    'Relationship Building': ['relationship building', 'client relationships'],
    'Sales Training': ['sales training', 'training sales team'],
    
    // Leadership & Management
    'Team Leadership': ['team leadership', 'leading team', 'team lead'],
    'People Management': ['people management', 'managing people', 'staff management'],
    'Strategic Planning': ['strategic planning', 'strategy', 'strategic'],
    'Performance Management': ['performance management', 'performance review'],
    'Budget Management': ['budget management', 'managing budget', 'budget planning'],
    'Project Management': ['project management', 'project manager', 'managing projects'],
    'Cross-functional Leadership': ['cross-functional', 'cross functional'],
    'Change Management': ['change management', 'organizational change'],
    
    // Technical Skills
    'Microsoft Excel': ['excel', 'microsoft excel', 'spreadsheet'],
    'Microsoft Office': ['microsoft office', 'ms office', 'office suite'],
    'PowerPoint': ['powerpoint', 'ppt', 'presentations'],
    'Data Analysis': ['data analysis', 'data analytics', 'analyzing data'],
    'SQL': ['sql', 'structured query language'],
    'Tableau': ['tableau', 'data visualization'],
    'Power BI': ['power bi', 'powerbi'],
    'Google Analytics': ['google analytics', 'ga'],
    'Marketing Automation': ['marketing automation', 'automated marketing'],
    
    // Soft Skills
    'Communication': ['communication', 'communicating', 'verbal communication'],
    'Presentation Skills': ['presentation', 'presenting', 'public speaking'],
    'Negotiation': ['negotiation', 'negotiating', 'negotiate'],
    'Problem Solving': ['problem solving', 'troubleshooting', 'problem resolution'],
    'Critical Thinking': ['critical thinking', 'analytical thinking'],
    'Time Management': ['time management', 'prioritization'],
    'Adaptability': ['adaptability', 'flexible', 'adaptable'],
    'Mentoring': ['mentoring', 'coaching', 'training others'],
    
    // Industry Knowledge
    'SaaS': ['saas', 'software as a service'],
    'B2B Sales': ['b2b', 'business to business'],
    'Enterprise Sales': ['enterprise sales', 'enterprise'],
    'Channel Sales': ['channel sales', 'partner sales'],
    'Inside Sales': ['inside sales', 'internal sales'],
    'Field Sales': ['field sales', 'outside sales'],
    'Account-Based Marketing': ['account-based marketing', 'abm'],
    'Customer Success': ['customer success', 'client success'],
    
    // Additional Professional Skills
    'Market Research': ['market research', 'market analysis'],
    'Competitive Analysis': ['competitive analysis', 'competitor analysis'],
    'Product Knowledge': ['product knowledge', 'product expertise'],
    'Customer Retention': ['customer retention', 'client retention'],
    'Upselling': ['upselling', 'cross-selling', 'up-selling'],
    'Contract Negotiation': ['contract negotiation', 'contract management'],
    'Territory Management': ['territory management', 'territory planning'],
    'Sales Operations': ['sales operations', 'sales ops']
  }

  // Check each skill against text
  Object.entries(skillDatabase).forEach(([skill, patterns]) => {
    if (patterns.some(pattern => textLower.includes(pattern))) {
      skills.add(skill)
    }
  })

  // Add context-based skills (inferred from responsibilities)
  if (textLower.includes('managed') || textLower.includes('led')) {
    skills.add('Leadership')
  }
  if (textLower.includes('increased') || textLower.includes('grew') || textLower.includes('improved')) {
    skills.add('Performance Improvement')
  }
  if (textLower.includes('team') && textLower.includes('of')) {
    skills.add('Team Management')
  }
  if (textLower.includes('$') || textLower.includes('revenue') || textLower.includes('million')) {
    skills.add('Financial Management')
  }

  return Array.from(skills)
}

function categorizeSkills(allSkills: string[]): any {
  const technical = allSkills.filter(skill => 
    ['Salesforce', 'HubSpot', 'CRM Systems', 'Microsoft Excel', 'Microsoft Office', 
     'PowerPoint', 'Data Analysis', 'SQL', 'Tableau', 'Power BI', 'Google Analytics',
     'Marketing Automation'].includes(skill)
  )

  const business = allSkills.filter(skill => 
    ['Sales Management', 'Business Development', 'Account Management', 'Lead Generation',
     'Pipeline Management', 'Revenue Growth', 'Strategic Planning', 'Budget Management',
     'Project Management', 'Performance Management', 'Territory Management'].includes(skill)
  )

  const soft = allSkills.filter(skill => 
    ['Communication', 'Presentation Skills', 'Negotiation', 'Problem Solving',
     'Critical Thinking', 'Time Management', 'Adaptability', 'Leadership',
     'Team Management', 'Mentoring'].includes(skill)
  )

  const industry = allSkills.filter(skill => 
    ['SaaS', 'B2B Sales', 'Enterprise Sales', 'Channel Sales', 'Inside Sales',
     'Field Sales', 'Customer Success', 'Account-Based Marketing'].includes(skill)
  )

  return { technical, business, soft, industry }
}

function determineRole(text: string, name: string): string {
  const textLower = text.toLowerCase()
  
  if (textLower.includes('sales manager') || textLower.includes('sales management')) {
    return 'Sales Manager'
  } else if (textLower.includes('business development manager')) {
    return 'Business Development Manager'
  } else if (textLower.includes('account manager')) {
    return 'Account Manager'
  } else if (textLower.includes('sales director')) {
    return 'Sales Director'
  } else if (textLower.includes('vp') || textLower.includes('vice president')) {
    return 'VP of Sales'
  } else if (name.toLowerCase().includes('manager')) {
    return 'Sales Manager'
  }
  
  return 'Sales Professional'
}

function determineExperienceLevel(text: string): string {
  const textLower = text.toLowerCase()
  
  if (textLower.includes('director') || textLower.includes('vp') || textLower.includes('vice president')) {
    return 'Executive Level'
  } else if (textLower.includes('senior') || textLower.includes('lead') || textLower.includes('manager')) {
    return 'Senior Level'
  } else if (textLower.includes('junior') || textLower.includes('entry') || textLower.includes('associate')) {
    return 'Entry Level'
  }
  
  return 'Mid Level'
}

function generateSummary(personalInfo: any, skills: any, text: string): string {
  const role = determineRole(text, personalInfo.name)
  const topSkills = [...skills.business.slice(0, 2), ...skills.technical.slice(0, 2)].join(', ')
  
  return `Experienced ${role} with demonstrated expertise in ${topSkills}. Proven track record in sales performance and team leadership.`
}

function assessRemoteReadiness(text: string, skills: any): boolean {
  const textLower = text.toLowerCase()
  const remoteIndicators = ['remote', 'virtual', 'zoom', 'teams', 'slack', 'digital']
  const hasRemoteExp = remoteIndicators.some(indicator => textLower.includes(indicator))
  const hasTechSkills = skills.technical.length > 0
  
  return hasRemoteExp || hasTechSkills
}

function extractPersonalInfo(text: string, fileName: string) {
  console.log('📋 Extracting personal information from text...')
  
  // Enhanced email extraction (multiple patterns)
  const emailPatterns = [
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    /email[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    /e-mail[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
  ]
  
  let email = ''
  for (const pattern of emailPatterns) {
    const match = text.match(pattern)
    if (match) {
      email = match[0].replace(/^(email|e-mail)[:\s]*/i, '')
      break
    }
  }

  // Enhanced phone extraction (multiple formats)
  const phonePatterns = [
    /(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/,
    /phone[:\s]*(\+?[\d\s\-\(\)]{8,15})/gi,
    /mobile[:\s]*(\+?[\d\s\-\(\)]{8,15})/gi,
    /cell[:\s]*(\+?[\d\s\-\(\)]{8,15})/gi,
    /tel[:\s]*(\+?[\d\s\-\(\)]{8,15})/gi
  ]
  
  let phone = ''
  for (const pattern of phonePatterns) {
    const match = text.match(pattern)
    if (match) {
      phone = match[1] || match[0].replace(/^(phone|mobile|cell|tel)[:\s]*/i, '')
      break
    }
  }

  // Enhanced name extraction
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  let name = ''
  
  // Look for name patterns in first 15 lines
  for (const line of lines.slice(0, 15)) {
    const cleanLine = line.trim()
    
    // Skip lines that are clearly not names
    if (cleanLine.length < 2 || cleanLine.length > 60) continue
    if (cleanLine.includes('@')) continue
    if (cleanLine.includes('http')) continue
    if (cleanLine.includes('www')) continue
    if (/^\d/.test(cleanLine)) continue // Starts with number
    if (cleanLine.toLowerCase().includes('resume')) continue
    if (cleanLine.toLowerCase().includes('curriculum')) continue
    if (cleanLine.toLowerCase().includes('cv')) continue
    
    // Look for typical name patterns
    const namePattern = /^[A-Za-z][A-Za-z\s.'-]{1,40}[A-Za-z]$/
    if (namePattern.test(cleanLine)) {
      const words = cleanLine.split(' ').filter(word => word.length > 1)
      if (words.length >= 2 && words.length <= 4) { // 2-4 words typical for names
        name = cleanLine
        break
      }
    }
  }
  
  // Enhanced location extraction
  const locationPatterns = [
    /address[:\s]*([^\n]{10,50})/gi,
    /location[:\s]*([^\n]{5,40})/gi,
    /([A-Za-z\s]+,\s*[A-Z]{2})/g, // City, State format
    /([A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2,3})/g // City, State, Country
  ]
  
  let location = ''
  for (const pattern of locationPatterns) {
    const match = text.match(pattern)
    if (match) {
      location = match[1] || match[0].replace(/^(address|location)[:\s]*/i, '')
      break
    }
  }
  
  // Fallback name from filename if no good name found
  if (!name || name.length < 3) {
    name = fileName
      .replace(/\.(pdf|doc|docx)$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/resume|cv/gi, '')
      .trim()
  }
  
  // Final cleanup
  name = name || 'Professional'
  email = email.replace(/[^\w@.-]/g, '')
  phone = phone.replace(/[^\d\s\-\(\)\+]/g, '').trim()
  location = location.trim()

  console.log('📋 Extracted info:', { 
    name: name.substring(0, 20) + '...', 
    email: email ? 'Found' : 'Not found',
    phone: phone ? 'Found' : 'Not found',
    location: location ? 'Found' : 'Not found'
  })

  return {
    name: name,
    email: email,
    phone: phone,
    location: location
  }
}