// File: src/pages/api/resume/parse.ts
import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

// Direct OpenAI client for resume parsing
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Check if OpenAI API key exists
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured' 
      });
    }

    const prompt = `
Analyze this resume text and extract structured information. Return valid JSON with this exact structure:

{
  "sections": {
    "contact": "extracted contact info",
    "summary": "professional summary section", 
    "experience": "work experience section",
    "education": "education section",
    "skills": "skills section"
  },
  "skills": ["skill1", "skill2", "skill3"],
  "contact": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "phone number",
    "linkedin": "LinkedIn profile URL"
  },
  "experience_years": 5,
  "location": "City, State/Country"
}

Resume text:
${text}

Extract all relevant information and return only the JSON object, no other text.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 1500,
    });

    const result = completion.choices[0]?.message?.content;
    
    if (!result) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    try {
      const parsedData = JSON.parse(result);
      res.status(200).json(parsedData);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      res.status(500).json({ 
        error: 'Invalid AI response format',
        details: 'AI returned malformed JSON'
      });
    }
  } catch (error) {
    console.error('Resume parsing error:', error);
    res.status(500).json({ 
      error: 'Failed to parse resume',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}