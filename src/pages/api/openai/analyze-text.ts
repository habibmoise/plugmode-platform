// ========================================
// REPLACE: src/pages/api/openai/analyze-text.ts
// Enhanced AI Analysis - Finds More Skills
// ========================================

import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🤖 OpenAI API called for comprehensive resume analysis');

    const { text } = req.body;

    if (!text || text.length < 10) {
      return res.status(400).json({ error: 'Text is required and must be at least 10 characters' });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not found');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    console.log('📝 Analyzing resume text, length:', text.length);
    console.log('📄 First 200 characters:', text.substring(0, 200));

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system", 
          content: `You are an expert resume analyzer. Your job is to extract ALL skills mentioned in a resume, including:

TECHNICAL SKILLS: Programming languages, software, tools, platforms, frameworks
BUSINESS SKILLS: Sales, marketing, management, strategy, operations, finance
SOFT SKILLS: Leadership, communication, problem-solving, teamwork
INDUSTRY SKILLS: Specific to their field (CRM, Salesforce, AutoCAD, etc.)
CERTIFICATIONS: Any mentioned qualifications or certifications
LANGUAGES: Spoken languages with proficiency levels

Be comprehensive and extract every relevant skill mentioned, even if implied from job responsibilities or achievements.`
        },
        {
          role: "user",
          content: `Analyze this resume text thoroughly and extract ALL skills, contact information, and personal details. 

IMPORTANT INSTRUCTIONS:
1. Extract EVERY skill mentioned or implied in the resume
2. Look at job responsibilities and extract skills they imply
3. Include tools, software, technologies, methodologies
4. Include both hard and soft skills
5. Be comprehensive - aim for 10-20 skills minimum if they exist

Resume text to analyze:
${text}

Return ONLY JSON in this exact format:
{
  "skills": ["skill1", "skill2", "skill3", "skill4", "skill5", "skill6", "skill7", "skill8", "skill9", "skill10"],
  "name": "full name from resume",
  "email": "email address", 
  "phone": "phone number",
  "location": "city, country/state"
}`
        }
      ],
      temperature: 0.2,
      max_tokens: 1500
    });

    const response = completion.choices[0].message.content;
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    console.log('🤖 OpenAI raw response length:', response.length);
    console.log('🤖 OpenAI raw response:', response);

    // Parse JSON response with better error handling
    let parsedData;
    try {
      // Clean the response more thoroughly
      let cleanResponse = response.replace(/```json|```/g, '').trim();
      
      // If response doesn't start with {, try to find the JSON
      if (!cleanResponse.startsWith('{')) {
        const jsonStart = cleanResponse.indexOf('{');
        const jsonEnd = cleanResponse.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
        }
      }
      
      parsedData = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError);
      console.error('Raw response was:', response);
      
      // Try to extract JSON from response if it's wrapped in text
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[0]);
        } catch (e) {
          throw new Error('Could not parse JSON from OpenAI response');
        }
      } else {
        throw new Error('No JSON found in OpenAI response');
      }
    }

    // Validate and clean the response
    const validatedData = {
      skills: Array.isArray(parsedData.skills) 
        ? parsedData.skills.filter((skill: string) => skill && skill.trim().length > 0)
        : [],
      name: parsedData.name || '',
      email: parsedData.email || '',
      phone: parsedData.phone || '',
      location: parsedData.location || ''
    };

    console.log('✅ Analysis complete:');
    console.log('📊 Skills found:', validatedData.skills.length);
    console.log('🎯 Skills list:', validatedData.skills);
    console.log('👤 Name:', validatedData.name);
    console.log('📧 Email:', validatedData.email);
    console.log('📞 Phone:', validatedData.phone);
    console.log('📍 Location:', validatedData.location);

    return res.status(200).json({
      success: true,
      data: validatedData
    });

  } catch (error) {
    console.error('❌ OpenAI API error:', error);
    
    return res.status(500).json({ 
      error: 'Failed to analyze text with AI',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}