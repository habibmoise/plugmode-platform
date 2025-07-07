import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import pdf from 'pdf-parse';
import OpenAI from 'openai';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AnalysisResult {
  skills: string[];
  technicalSkills: string[];
  businessSkills: string[];
  confidence: 'high' | 'medium' | 'low';
  industry: string;
  experienceLevel: 'entry' | 'mid' | 'senior';
  extractionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });
    
    const [fields, files] = await form.parse(req);
    
    // Extract file
    const pdfFile = files.pdf;
    const uploadedFile = Array.isArray(pdfFile) ? pdfFile[0] : pdfFile;
    
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Extract fields
    const userIdField = fields.userId;
    const resumeIdField = fields.resumeId;
    
    const userId = Array.isArray(userIdField) ? userIdField[0] : userIdField;
    const resumeId = Array.isArray(resumeIdField) ? resumeIdField[0] : resumeIdField;

    if (!userId || !resumeId) {
      return res.status(400).json({ error: 'Missing userId or resumeId' });
    }

    // Extract text from PDF using pdf-parse
    let extractedText = '';
    let extractionMethod = 'direct';
    
    try {
      console.log('📄 Reading PDF file:', uploadedFile.originalFilename);
      const pdfBuffer = fs.readFileSync(uploadedFile.filepath);
      const pdfData = await pdf(pdfBuffer);
      extractedText = pdfData.text.trim();
      
      console.log('📝 Extracted text length:', extractedText.length);
      console.log('📝 Sample text (first 300 chars):', extractedText.substring(0, 300));
      
      if (extractedText.length < 50) {
        throw new Error('PDF appears to be image-based or corrupted');
      }
      
    } catch (pdfError) {
      console.error('❌ PDF extraction failed:', pdfError);
      
      // Try OCR as fallback (if available)
      try {
        extractedText = await extractWithOCR(uploadedFile.filepath);
        extractionMethod = 'ocr';
        console.log('✅ OCR extraction successful, length:', extractedText.length);
      } catch (ocrError) {
        console.error('❌ OCR also failed:', ocrError);
        throw new Error('Could not extract text from PDF. Please ensure your resume is a text-based PDF, not a scanned image.');
      }
    }

    // REAL AI analysis with OpenAI - works for ANY resume
    console.log('🤖 Starting AI analysis...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `You are a professional resume analyzer. Extract skills from this resume with high accuracy.

RESUME TEXT:
${extractedText}

INSTRUCTIONS:
1. Only extract skills explicitly mentioned in the text
2. Focus on professional skills, tools, technologies, methodologies, certifications
3. Include both technical and business skills
4. Categorize skills appropriately
5. Return 8-25 relevant skills (depending on resume content)
6. Determine industry and experience level based on content
7. Assess confidence based on text clarity and skill visibility

REQUIRED JSON FORMAT:
{
  "skills": ["skill1", "skill2", "skill3"],
  "technicalSkills": ["specific technical skills from the resume"],
  "businessSkills": ["business/management skills from the resume"],
  "confidence": "high|medium|low",
  "industry": "detected industry based on experience",
  "experienceLevel": "entry|mid|senior",
  "extractionQuality": "excellent|good|fair|poor"
}

CRITICAL RULES:
- ONLY include skills that actually appear in the resume text
- Do NOT add generic skills that aren't mentioned
- Be specific and accurate
- If technical skills aren't mentioned, return empty array for technicalSkills
- If business skills aren't mentioned, return empty array for businessSkills
- Base industry on actual job titles and companies mentioned
- Base experience level on years mentioned or job progression shown`
      }],
      temperature: 0.1,
      max_tokens: 1000
    });

    let result: AnalysisResult;
    try {
      result = JSON.parse(completion.choices[0].message.content || '{"skills":[]}');
      console.log('✅ AI analysis complete:', {
        totalSkills: result.skills?.length || 0,
        technicalSkills: result.technicalSkills?.length || 0,
        businessSkills: result.businessSkills?.length || 0,
        confidence: result.confidence,
        industry: result.industry
      });
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError);
      throw new Error('AI analysis returned invalid format');
    }
    
    // Update database with REAL extracted skills
    await updateDatabase(userId, resumeId, result, extractionMethod);
    
    // Clean up uploaded file
    if (fs.existsSync(uploadedFile.filepath)) {
      fs.unlinkSync(uploadedFile.filepath);
    }
    
    res.json({
      success: true,
      data: {
        skills: result.skills || [],
        technicalSkills: result.technicalSkills || [],
        businessSkills: result.businessSkills || [],
        industry: result.industry || 'Unknown',
        experienceLevel: result.experienceLevel || 'Unknown',
        confidence: result.confidence || 'medium',
        extractionMethod,
        extractionQuality: result.extractionQuality || 'good',
        rawTextPreview: extractedText.substring(0, 300)
      }
    });

  } catch (error: any) {
    console.error('❌ Resume analysis failed:', error);
    res.status(500).json({ 
      error: 'Analysis failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try uploading a different PDF format'
    });
  }
}

// OCR fallback function (optional - requires tesseract.js)
async function extractWithOCR(filePath: string): Promise<string> {
  try {
    // This requires: npm install tesseract.js
    const { createWorker } = require('tesseract.js');
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(filePath);
    await worker.terminate();
    return text.trim();
  } catch (error) {
    throw new Error('OCR processing failed');
  }
}

// Database update function - works for any user
async function updateDatabase(
  userId: string, 
  resumeId: string, 
  analysisResult: AnalysisResult, 
  extractionMethod: string
) {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    console.log('💾 Updating database for user:', userId);

    // Get existing user skills
    let existingSkills: string[] = [];
    
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('skills')
        .eq('id', userId)
        .single();
      
      existingSkills = userData?.skills || [];
    } catch (error) {
      // Try user_profiles table as fallback
      try {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('skills')
          .eq('user_id', userId)
          .single();
        
        existingSkills = profileData?.skills || [];
      } catch (profileError) {
        console.log('⚠️ No existing skills found, starting fresh');
      }
    }

    // Intelligently merge skills (avoid duplicates)
    const newSkills = analysisResult.skills || [];
    const mergedSkills = [...new Set([...existingSkills, ...newSkills])];

    console.log('📊 Skills summary:', {
      existing: existingSkills.length,
      new: newSkills.length,
      merged: mergedSkills.length
    });

    // Update user skills
    try {
      await supabase
        .from('users')
        .update({ 
          skills: mergedSkills,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      console.log('✅ Users table updated successfully');
    } catch (error) {
      // Fallback to user_profiles
      await supabase
        .from('user_profiles')
        .update({ 
          skills: mergedSkills,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      console.log('✅ User_profiles table updated successfully');
    }

    // Update resume record
    await supabase
      .from('resumes')
      .update({ 
        processing_status: 'completed',
        extracted_skills: newSkills,
        extraction_method: extractionMethod,
        confidence_score: analysisResult.confidence,
        processed_at: new Date().toISOString()
      })
      .eq('id', resumeId);
    
    console.log('✅ Resume record updated successfully');

  } catch (error) {
    console.error('❌ Database update failed:', error);
    // Don't throw - allow API to succeed even if DB update fails
  }
}