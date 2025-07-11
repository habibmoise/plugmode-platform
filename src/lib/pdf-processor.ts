// src/lib/pdf-processor.ts - Production ready with CSP handling
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from './supabase';

// Configure PDF.js worker with multiple fallback strategies
const setupPDFWorker = () => {
  try {
    // Try local worker first (best for production)
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.js',
        import.meta.url
      ).toString();
    }
  } catch (error) {
    console.warn('⚠️ Local PDF worker setup failed, using fallback');
    // Fallback: disable worker entirely
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  }
};

// Initialize worker setup
setupPDFWorker();

export interface ExtractedResumeData {
  rawText: string;
  sections: {
    contact?: string;
    summary?: string;
    experience?: string;
    education?: string;
    skills?: string;
  };
  extractedSkills: string[];
  phoneNumber?: string;
  email?: string;
  linkedIn?: string;
  name?: string;
  currentRole?: string;
  experienceLevel?: string;
  professionalSummary?: string;
  aiAnalysisSuccess?: boolean;
}

interface TextExtractionResult {
  success: boolean;
  preview: string;
  quality: number;
}

export const extractTextFromPDF = async (file: File): Promise<string> => {
  console.log('📄 Extracting text from PDF (production method):', file.name);
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Configure PDF.js for CSP compatibility
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      // Disable worker if CSP issues persist
      disableWorker: true
    });
    
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    console.log(`📑 Processing ${pdf.numPages} pages...`);
    
    // Extract text from all pages with error handling
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Extract text with basic positioning
        const textItems = textContent.items as any[];
        let pageText = '';
        
        // Sort by position for better text flow
        textItems.sort((a, b) => {
          const yDiff = Math.abs(a.transform[5] - b.transform[5]);
          if (yDiff < 5) {
            return a.transform[4] - b.transform[4]; // Same line, sort by x
          }
          return b.transform[5] - a.transform[5]; // Different lines, sort by y
        });
        
        let lastY: number | null = null;
        for (const item of textItems) {
          const currentY = Math.round(item.transform[5]);
          
          // Add line break for new lines
          if (lastY !== null && Math.abs(currentY - lastY) > 5) {
            pageText += '\n';
          }
          
          pageText += item.str + ' ';
          lastY = currentY;
        }
        
        fullText += pageText + '\n\n';
        
      } catch (pageError) {
        console.warn(`⚠️ Error processing page ${pageNum}:`, pageError);
        // Continue with other pages
        continue;
      }
    }
    
    // Clean up the extracted text
    const cleanText = cleanExtractedText(fullText);
    
    console.log('✅ Successfully extracted text, length:', cleanText.length);
    console.log('📝 First 200 chars:', cleanText.substring(0, 200));
    
    if (cleanText.length < 50) {
      throw new Error('Extracted text too short - PDF might be image-based or corrupted');
    }
    
    // Assess text quality
    const quality = assessTextQuality(cleanText);
    console.log('📊 Text quality score:', quality);
    
    if (quality < 0.3) {
      console.warn('⚠️ Low quality text extraction detected');
    }
    
    return cleanText;
    
  } catch (error) {
    console.error('❌ PDF extraction failed:', error);
    
    // Advanced fallback strategies
    try {
      console.log('🔄 Trying alternative extraction methods...');
      
      // Fallback 1: Try simple file reading
      const fileText = await file.text();
      if (fileText && fileText.length > 100) {
        console.log('✅ File.text() extraction successful');
        return cleanExtractedText(fileText);
      }
      
      // Fallback 2: Try reading as data URL
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      // Basic text extraction from data URL (limited but sometimes works)
      const base64 = dataUrl.split(',')[1];
      const binaryString = atob(base64);
      const possibleText = binaryString.replace(/[^\x20-\x7E]/g, ' ').trim();
      
      if (possibleText.length > 100) {
        console.log('✅ DataURL extraction found some text');
        return cleanExtractedText(possibleText);
      }
      
    } catch (fallbackError) {
      console.error('❌ All fallback methods failed:', fallbackError);
    }
    
    // Final fallback: provide instructions for manual input
    return `Resume document: ${file.name}

❌ Automatic PDF processing failed due to document format or security restrictions.

📋 For best results, please try one of these options:

1. CONVERT TO TEXT-BASED PDF:
   - Open your resume in Word/Google Docs
   - Save/Export as PDF (ensure "text-based" not "image")
   - Upload the new PDF

2. COPY & PASTE METHOD:
   - Open your resume
   - Select all content (Ctrl+A)
   - Copy and paste into a text upload field

3. MANUAL ENTRY:
   - List your key information: name, email, phone
   - Work experience with job titles and companies
   - Skills and technologies you use
   - Education and certifications

The AI analysis will continue with any available information.`;
  }
};

// Enhanced text cleaning
const cleanExtractedText = (rawText: string): string => {
  return rawText
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove non-printable characters but keep basic punctuation
    .replace(/[^\x20-\x7E\n\r]/g, ' ')
    // Remove excessive line breaks
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Clean up around punctuation
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/([,.;:])\s+/g, '$1 ')
    // Trim and normalize
    .trim();
};

// Text quality assessment
const assessTextQuality = (text: string): number => {
  const indicators = {
    hasEmail: /@[\w.-]+\.\w+/.test(text),
    hasPhone: /(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/.test(text),
    hasResumeWords: /\b(experience|education|skills|work|employment|university|degree)\b/i.test(text),
    hasReasonableLength: text.length > 200 && text.length < 50000,
    notMostlySymbols: (text.match(/[a-zA-Z]/g)?.length || 0) > text.length * 0.6,
    hasStructure: text.includes('\n') && text.split('\n').length > 5
  };
  
  return Object.values(indicators).filter(Boolean).length / Object.keys(indicators).length;
};

export const parseResumeWithAI = async (rawText: string): Promise<ExtractedResumeData> => {
  console.log('🤖 Analyzing resume with ChatGPT-level AI...');
  
  try {
    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('chatgpt-resume-analyzer', {
      body: { 
        text: rawText,
        fileName: 'uploaded-resume.pdf'
      }
    });

    if (error) {
      console.error('❌ Supabase function error:', error);
      throw new Error(`AI analysis failed: ${error.message}`);
    }

    if (!data.success) {
      console.error('❌ AI analysis unsuccessful:', data.error);
      throw new Error(data.error || 'AI analysis failed');
    }

    const analysis = data.data;
    console.log('✅ ChatGPT-level analysis complete:', analysis);
    
    // Combine all skills from different categories
    const allSkills = [
      ...(analysis.skills?.technical || []),
      ...(analysis.skills?.business || []),
      ...(analysis.skills?.soft || []),
      ...(analysis.skills?.industry || [])
    ];
    
    return {
      rawText,
      sections: {
        contact: `${analysis.personalInfo?.name || ''} ${analysis.personalInfo?.email || ''} ${analysis.personalInfo?.phone || ''}`.trim(),
        summary: analysis.professionalSummary || '',
        experience: analysis.experience?.map((exp: any) => `${exp.position} at ${exp.company}`).join(', ') || '',
        education: analysis.education?.map((edu: any) => `${edu.degree} from ${edu.institution}`).join(', ') || '',
        skills: allSkills.join(', ')
      },
      extractedSkills: allSkills,
      phoneNumber: analysis.personalInfo?.phone || '',
      email: analysis.personalInfo?.email || '',
      linkedIn: analysis.personalInfo?.linkedIn || '',
      name: analysis.personalInfo?.name || '',
      currentRole: analysis.currentRole || '',
      experienceLevel: analysis.experienceLevel || '',
      professionalSummary: analysis.professionalSummary || '',
      aiAnalysisSuccess: true
    };
    
  } catch (error) {
    console.error('❌ ChatGPT-level AI analysis failed, using enhanced fallback:', error);
    
    // Enhanced fallback analysis
    const fallbackData = performEnhancedFallbackAnalysis(rawText);
    
    return {
      ...fallbackData,
      rawText,
      aiAnalysisSuccess: false
    };
  }
};

// Enhanced fallback analysis when AI fails
const performEnhancedFallbackAnalysis = (text: string): Partial<ExtractedResumeData> => {
  const textLower = text.toLowerCase();
  
  // Extract basic information
  const email = extractEmail(text);
  const phone = extractPhone(text);
  const name = extractName(text);
  const skills = extractEnhancedSkills(text);
  
  // Determine experience level
  let experienceLevel = 'Mid Level';
  if (textLower.includes('director') || textLower.includes('vp') || textLower.includes('executive')) {
    experienceLevel = 'Executive';
  } else if (textLower.includes('senior') || textLower.includes('lead') || textLower.includes('manager')) {
    experienceLevel = 'Senior Level';
  } else if (textLower.includes('junior') || textLower.includes('entry') || textLower.includes('intern')) {
    experienceLevel = 'Entry Level';
  }
  
  // Extract current role
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  let currentRole = 'Professional';
  for (const line of lines.slice(0, 10)) {
    if (line.length < 100 && (line.includes('Manager') || line.includes('Developer') || line.includes('Analyst') || line.includes('Specialist'))) {
      currentRole = line.trim();
      break;
    }
  }
  
  return {
    sections: {
      contact: `${name} ${email} ${phone}`.trim(),
      skills: skills.join(', ')
    },
    extractedSkills: skills,
    phoneNumber: phone,
    email: email,
    name: name,
    currentRole: currentRole,
    experienceLevel: experienceLevel,
    professionalSummary: `Experienced ${currentRole.toLowerCase()} with expertise in ${skills.slice(0, 3).join(', ')}.`
  };
};

// Enhanced skill extraction
const extractEnhancedSkills = (text: string): string[] => {
  const textLower = text.toLowerCase();
  const skills = new Set<string>();
  
  const skillCategories = {
    sales: {
      keywords: ['sales', 'salesforce', 'crm', 'business development', 'account management', 'pipeline', 'revenue', 'quota'],
      skills: ['Sales Management', 'CRM Systems', 'Business Development', 'Account Management', 'Pipeline Management', 'Revenue Growth']
    },
    tech: {
      keywords: ['javascript', 'python', 'react', 'node.js', 'aws', 'sql', 'api', 'software', 'programming'],
      skills: ['Software Development', 'Programming', 'Database Management', 'Cloud Computing', 'API Development', 'Web Development']
    },
    marketing: {
      keywords: ['marketing', 'seo', 'social media', 'content', 'digital marketing', 'campaigns', 'analytics'],
      skills: ['Digital Marketing', 'SEO', 'Social Media Marketing', 'Content Marketing', 'Campaign Management', 'Marketing Analytics']
    },
    management: {
      keywords: ['team', 'leadership', 'management', 'project', 'strategic', 'planning', 'coordination'],
      skills: ['Team Leadership', 'Project Management', 'Strategic Planning', 'Cross-functional Coordination', 'Performance Management']
    }
  };
  
  // Check each category and add relevant skills
  Object.values(skillCategories).forEach(category => {
    const hasKeywords = category.keywords.some(keyword => textLower.includes(keyword));
    if (hasKeywords) {
      category.skills.forEach(skill => skills.add(skill));
    }
  });
  
  // Add universal soft skills
  skills.add('Communication');
  skills.add('Problem Solving');
  skills.add('Team Collaboration');
  
  return Array.from(skills).slice(0, 12);
};

// Helper functions
const extractName = (text: string): string => {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  for (const line of lines.slice(0, 5)) {
    const cleanLine = line.trim();
    if (cleanLine.length > 3 && cleanLine.length < 50 && 
        !cleanLine.includes('@') && !cleanLine.includes('http') &&
        !/^\d/.test(cleanLine) && !cleanLine.toLowerCase().includes('resume')) {
      return cleanLine;
    }
  }
  
  return 'Professional';
};

const extractEmail = (text: string): string => {
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  return emailMatch?.[0] || '';
};

const extractPhone = (text: string): string => {
  const phoneMatch = text.match(/(\+?\d{1,4}[\s\-\.]?)?\(?(\d{3})\)?[\s\-\.]?(\d{3,4})[\s\-\.]?(\d{4})/);
  return phoneMatch?.[0] || '';
};

export const testPDFExtraction = async (file: File): Promise<TextExtractionResult> => {
  try {
    const text = await extractTextFromPDF(file);
    const quality = assessTextQuality(text);
    
    return {
      success: true,
      preview: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
      quality
    };
  } catch (error) {
    return {
      success: false,
      preview: error instanceof Error ? error.message : 'Extraction failed',
      quality: 0
    };
  }
};