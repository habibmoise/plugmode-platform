// ========================================
// COMPLETE src/pages/api/resume/process-pdf.ts
// NO MOCKS - REAL PDF PROCESSING & AI ANALYSIS
// ========================================

import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import pdf from 'pdf-parse';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '10mb',
  },
};

interface ProcessedResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
  };
  skills: string[];
  experience: Array<{
    company: string;
    position: string;
    duration: string;
    responsibilities: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    duration: string;
  }>;
  summary: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let tempFilePath: string | null = null;

  try {
    console.log('🚀 Starting PDF processing...');

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Parse the uploaded file
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      keepExtensions: true,
    });

    const [, files] = await form.parse(req);
    const file = Array.isArray(files.resume) ? files.resume[0] : files.resume;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    tempFilePath = file.filepath;
    console.log('📄 Processing PDF file:', file.originalFilename, 'Size:', file.size);

    // Extract text from PDF
    const fileBuffer = fs.readFileSync(file.filepath);
    const pdfData = await pdf(fileBuffer);
    
    const extractedText = pdfData.text;
    console.log('✅ PDF text extracted successfully, length:', extractedText.length);

    if (!extractedText || extractedText.length < 50) {
      return res.status(400).json({ 
        error: 'Could not extract meaningful text from PDF. Please ensure the PDF contains readable text.' 
      });
    }

    // Clean and prepare text for AI processing
    const cleanedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s@.-]/g, ' ')
      .trim()
      .substring(0, 4000); // Limit to 4000 chars for AI processing

    console.log('🤖 Sending to OpenAI for analysis...');

    // Process with OpenAI
    const processedData = await analyzeResumeWithAI(cleanedText);

    console.log('✅ AI analysis complete, found', processedData.skills.length, 'skills');

    return res.status(200).json({
      success: true,
      data: {
        rawText: extractedText,
        processedData,
        extractedSkills: processedData.skills,
        personalInfo: processedData.personalInfo,
        sections: {
          summary: processedData.summary,
          experience: processedData.experience,
          education: processedData.education,
        }
      }
    });

  } catch (error) {
    console.error('❌ PDF processing error:', error);
    
    let errorMessage = 'Failed to process PDF';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return res.status(500).json({ 
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log('🧹 Cleaned up temporary file');
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup temp file:', cleanupError);
      }
    }
  }
}

async function analyzeResumeWithAI(resumeText: string): Promise<ProcessedResumeData> {
  const prompt = `Analyze this resume text and extract structured information. Return ONLY valid JSON.

Resume Text:
${resumeText}

Extract the following information and return as JSON in this EXACT format:

{
  "personalInfo": {
    "name": "full name from resume",
    "email": "email address",
    "phone": "phone number", 
    "location": "city, state/country"
  },
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {
      "company": "company name",
      "position": "job title", 
      "duration": "time period",
      "responsibilities": ["responsibility 1", "responsibility 2"]
    }
  ],
  "education": [
    {
      "institution": "school name",
      "degree": "degree/program",
      "duration": "time period"
    }
  ],
  "summary": "brief professional summary"
}

CRITICAL RULES:
1. Extract ONLY information explicitly mentioned in the resume
2. For skills, include technical skills, soft skills, tools, and technologies mentioned
3. Return ONLY the JSON object - no explanations, no markdown
4. If information is missing, use empty string "" or empty array []
5. Ensure all JSON syntax is correct with proper quotes and commas`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert resume parser. Extract accurate information from resumes and return only valid JSON. Never add information that is not explicitly stated in the resume."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0].message.content;
    
    if (!response) {
      throw new Error('Empty response from OpenAI');
    }

    console.log('🔍 OpenAI response received, length:', response.length);

    // Parse JSON response
    let parsedData: ProcessedResumeData;
    try {
      parsedData = JSON.parse(response);
    } catch (parseError) {
      console.error('❌ JSON parsing failed, raw response:', response);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate and clean the parsed data
    const validatedData: ProcessedResumeData = {
      personalInfo: {
        name: parsedData.personalInfo?.name || "",
        email: parsedData.personalInfo?.email || "",
        phone: parsedData.personalInfo?.phone || "",
        location: parsedData.personalInfo?.location || ""
      },
      skills: Array.isArray(parsedData.skills) ? parsedData.skills.filter(skill => skill && skill.trim()) : [],
      experience: Array.isArray(parsedData.experience) ? parsedData.experience.map(exp => ({
        company: exp.company || "",
        position: exp.position || "",
        duration: exp.duration || "",
        responsibilities: Array.isArray(exp.responsibilities) ? exp.responsibilities : []
      })) : [],
      education: Array.isArray(parsedData.education) ? parsedData.education.map(edu => ({
        institution: edu.institution || "",
        degree: edu.degree || "",
        duration: edu.duration || ""
      })) : [],
      summary: parsedData.summary || ""
    };

    console.log('✅ Data validated successfully');
    return validatedData;

  } catch (error) {
    console.error('❌ OpenAI analysis failed:', error);
    throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}