// supabase/functions/chatgpt-resume-analyzer/index.ts - CORS Fixed
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ResumeAnalysis {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedIn?: string;
  };
  professionalSummary: string;
  currentRole: string;
  experienceLevel: string;
  skills: {
    technical: string[];
    business: string[];
    soft: string[];
    industry: string[];
  };
  experience: Array<{
    company: string;
    position: string;
    duration: string;
    keyAchievements: string[];
    responsibilities: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    year: string;
    field?: string;
  }>;
  keyStrengths: string[];
  careerGoals: string[];
  improvementAreas: string[];
  salaryRange: string;
  industryFocus: string[];
  remoteWorkReady: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🤖 ChatGPT-level resume analyzer starting...')
    
    const { text, fileName } = await req.json()

    if (!text || text.length < 20) {
      return new Response(
        JSON.stringify({ 
          error: 'Resume text is required and must contain actual content',
          success: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📄 Analyzing resume: ${fileName}, text length: ${text.length}`)

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      console.error('❌ OpenAI API key not found')
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured',
          success: false 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ChatGPT-level analysis with intelligent prompting
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert career coach and resume analyzer with 20+ years of experience. 
            
            Analyze this resume like a human expert would - understand the context, read between the lines, 
            and provide comprehensive insights. Pay special attention to:
            
            1. ACTUAL skills mentioned or demonstrated through achievements
            2. Career progression and growth trajectory  
            3. Industry expertise and domain knowledge
            4. Leadership and management experience
            5. Revenue/budget responsibility and business impact
            6. Remote work capabilities and digital skills
            7. Cultural fit indicators and soft skills
            8. Career aspirations and next logical steps
            
            Extract information intelligently - if someone "managed a team of 15" they have leadership skills.
            If they "increased revenue by 40%" they have business development and analytical skills.
            If they use "Salesforce" they have CRM and sales process skills.
            
            Be thorough, intelligent, and provide actionable insights like a top-tier career consultant would.`
          },
          {
            role: 'user',
            content: `Please analyze this resume completely and provide a comprehensive breakdown. 
            Extract ALL relevant information and provide intelligent career insights.
            
            Resume Content:
            ${text.substring(0, 15000)} ${text.length > 15000 ? '...(truncated for analysis)' : ''}
            
            Provide analysis in this exact JSON structure (no additional text, just valid JSON):
            {
              "personalInfo": {
                "name": "Full name extracted from resume",
                "email": "email@domain.com or empty string if not found",
                "phone": "phone number or empty string if not found", 
                "location": "city, country or empty string if not found",
                "linkedIn": "LinkedIn URL or empty string if not found"
              },
              "professionalSummary": "2-3 sentence summary of their career and expertise based on actual resume content",
              "currentRole": "Their current or most recent job title from the resume",
              "experienceLevel": "Entry Level/Mid Level/Senior Level/Executive based on roles and responsibilities",
              "skills": {
                "technical": ["specific technical skills, tools, software mentioned or used"],
                "business": ["business and management skills demonstrated through roles"],
                "soft": ["communication, leadership, etc. inferred from responsibilities"],
                "industry": ["domain-specific knowledge and industry tools"]
              },
              "experience": [
                {
                  "company": "Company name from resume",
                  "position": "Job title from resume", 
                  "duration": "Time period worked",
                  "keyAchievements": ["quantified achievements with numbers if available"],
                  "responsibilities": ["main duties and roles listed"]
                }
              ],
              "education": [
                {
                  "institution": "School/University name",
                  "degree": "Degree type and name",
                  "year": "graduation year if available",
                  "field": "field of study if mentioned"
                }
              ],
              "keyStrengths": ["top 5 professional strengths based on actual resume content"],
              "careerGoals": ["likely next career steps based on trajectory shown in resume"],
              "improvementAreas": ["areas for professional development based on gaps or growth opportunities"],
              "salaryRange": "estimated salary range based on actual experience level and role",
              "industryFocus": ["industries they have actual experience in based on companies worked"],
              "remoteWorkReady": true/false based on experience with remote tools or distributed teams
            }`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const aiResponse = await response.json()
    console.log('✅ OpenAI analysis completed')

    let analysisResult: ResumeAnalysis
    
    try {
      const aiContent = aiResponse.choices[0].message.content
      console.log('🔍 AI Response preview:', aiContent.substring(0, 200))
      
      analysisResult = JSON.parse(aiContent)
      
      // Validate the analysis has meaningful content
      if (!analysisResult.personalInfo?.name || 
          !analysisResult.currentRole ||
          Object.values(analysisResult.skills).every(arr => arr.length === 0)) {
        throw new Error('Analysis incomplete - missing key information')
      }

    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError)
      
      // Intelligent fallback analysis
      analysisResult = createIntelligentFallback(text, fileName || 'resume.pdf')
    }

    // Enhance analysis with additional insights
    analysisResult = enhanceAnalysis(analysisResult, text)

    console.log('🎯 Final analysis completed for:', analysisResult.personalInfo.name)

    return new Response(
      JSON.stringify({
        success: true,
        data: analysisResult,
        analysisType: 'chatgpt-level'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Resume analysis error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        fallback: 'Please try uploading a text-based PDF or Word document'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function createIntelligentFallback(text: string, fileName: string): ResumeAnalysis {
  console.log('🔄 Creating intelligent fallback analysis')
  
  const textLower = text.toLowerCase()
  
  // Extract email and phone with regex
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const phoneMatch = text.match(/(\+?[\d\s\-\(\)]{8,15})/);
  
  // Extract name from first meaningful line
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  let name = '';
  for (const line of lines.slice(0, 8)) {
    const cleanLine = line.trim();
    if (cleanLine.length > 2 && cleanLine.length < 50 && 
        !cleanLine.includes('@') && !cleanLine.includes('http')) {
      name = cleanLine;
      break;
    }
  }
  
  if (!name) {
    name = fileName.replace(/\.(pdf|doc|docx)$/i, '').replace(/[-_]/g, ' ');
  }

  // Intelligent skill detection based on context
  const skills = {
    technical: [] as string[],
    business: [] as string[],
    soft: [] as string[],
    industry: [] as string[]
  };

  // Enhanced skill detection patterns
  const skillPatterns = {
    technical: {
      'CRM Systems': ['salesforce', 'hubspot', 'crm', 'pipedrive'],
      'Data Analysis': ['excel', 'sql', 'tableau', 'power bi', 'analytics', 'data'],
      'Programming': ['javascript', 'python', 'java', 'programming', 'development'],
      'Cloud Computing': ['aws', 'azure', 'cloud', 'saas'],
      'Project Management': ['project management', 'scrum', 'agile', 'jira', 'asana']
    },
    business: {
      'Sales Management': ['sales', 'revenue', 'quota', 'pipeline', 'business development'],
      'Team Leadership': ['team lead', 'management', 'supervisor', 'director', 'managed team'],
      'Strategic Planning': ['strategy', 'planning', 'roadmap', 'vision', 'strategic'],
      'Client Relations': ['customer', 'client', 'relationship', 'account management'],
      'Budget Management': ['budget', 'financial', 'cost', 'revenue', 'profit']
    },
    soft: ['Communication', 'Problem Solving', 'Leadership', 'Team Collaboration', 'Analytical Thinking'],
    industry: {
      'Sales & Marketing': ['sales', 'marketing', 'advertising', 'promotion'],
      'Technology': ['software', 'tech', 'digital', 'it', 'development'],
      'Finance': ['finance', 'accounting', 'banking', 'investment'],
      'Healthcare': ['health', 'medical', 'clinical', 'patient'],
      'Education': ['education', 'teaching', 'training', 'academic']
    }
  };

  // Check technical skills
  Object.entries(skillPatterns.technical).forEach(([skill, patterns]) => {
    if (patterns.some(pattern => textLower.includes(pattern))) {
      skills.technical.push(skill);
    }
  });

  // Check business skills
  Object.entries(skillPatterns.business).forEach(([skill, patterns]) => {
    if (patterns.some(pattern => textLower.includes(pattern))) {
      skills.business.push(skill);
    }
  });

  // Add soft skills
  skills.soft = skillPatterns.soft;

  // Check industry skills
  Object.entries(skillPatterns.industry).forEach(([industry, patterns]) => {
    if (patterns.some(pattern => textLower.includes(pattern))) {
      skills.industry.push(industry);
    }
  });

  // Determine role and experience level
  let currentRole = 'Professional';
  let experienceLevel = 'Mid Level';
  
  if (textLower.includes('director') || textLower.includes('vp') || textLower.includes('executive')) {
    experienceLevel = 'Executive';
    currentRole = 'Executive';
  } else if (textLower.includes('manager') || textLower.includes('lead')) {
    currentRole = 'Manager';
    experienceLevel = 'Senior Level';
  } else if (textLower.includes('senior')) {
    experienceLevel = 'Senior Level';
  } else if (textLower.includes('junior') || textLower.includes('entry')) {
    experienceLevel = 'Entry Level';
  }

  return {
    personalInfo: {
      name: name || 'Professional',
      email: emailMatch ? emailMatch[1] : '',
      phone: phoneMatch ? phoneMatch[1] : '',
      location: ''
    },
    professionalSummary: `Experienced ${currentRole.toLowerCase()} with demonstrated expertise in ${skills.business.concat(skills.technical).slice(0, 3).join(', ')}.`,
    currentRole,
    experienceLevel,
    skills,
    experience: [],
    education: [],
    keyStrengths: [...skills.business.slice(0, 3), ...skills.technical.slice(0, 2)],
    careerGoals: ['Career advancement', 'Skill development', 'Leadership growth'],
    improvementAreas: ['Professional development', 'Industry networking'],
    salaryRange: experienceLevel === 'Executive' ? '$120,000 - $200,000+' : 
                 experienceLevel === 'Senior Level' ? '$80,000 - $120,000' :
                 experienceLevel === 'Mid Level' ? '$50,000 - $80,000' : '$35,000 - $50,000',
    industryFocus: skills.industry.length > 0 ? skills.industry : ['Technology', 'Business'],
    remoteWorkReady: skills.technical.length > 0 || textLower.includes('remote')
  };
}

function enhanceAnalysis(analysis: ResumeAnalysis, originalText: string): ResumeAnalysis {
  const remoteIndicators = ['remote', 'distributed', 'virtual', 'home office', 'digital communication', 'slack', 'zoom', 'teams'];
  const hasRemoteExperience = remoteIndicators.some(indicator => 
    originalText.toLowerCase().includes(indicator)
  );
  
  analysis.remoteWorkReady = hasRemoteExperience || analysis.skills.technical.length > 0;

  return analysis;
}