// src/lib/pdf-processor.ts - Real PDF text extraction
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

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
}

export const extractTextFromPDF = async (file: File): Promise<string> => {
  console.log('📄 Extracting text from PDF using PDF.js:', file.name);
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
    }
    
    // Clean up the text
    const cleanText = fullText
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('✅ Successfully extracted text, length:', cleanText.length);
    console.log('📝 First 200 chars:', cleanText.substring(0, 200));
    
    if (cleanText.length < 50) {
      throw new Error('Extracted text too short - PDF might be image-based');
    }
    
    return cleanText;
    
  } catch (error) {
    console.error('❌ PDF extraction failed:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};

export const parseResumeWithAI = async (rawText: string): Promise<ExtractedResumeData> => {
  console.log('🤖 Analyzing resume with OpenAI...');
  
  try {
    const response = await fetch('/api/openai/analyze-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: rawText }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'OpenAI analysis failed');
    }

    const data = await response.json();
    
    console.log('✅ OpenAI analysis complete:', data);
    
    return {
      rawText,
      sections: {
        contact: '', // Can be enhanced later
        summary: '',
        experience: '',
        education: '',
        skills: data.extractedSkills?.join(', ') || ''
      },
      extractedSkills: data.extractedSkills || [],
      phoneNumber: data.phoneNumber || '',
      email: data.email || '',
      linkedIn: data.linkedIn || ''
    };
    
  } catch (error) {
    console.error('❌ AI analysis failed:', error);
    
    // Fallback: basic text analysis
    console.log('🔄 Using fallback text analysis...');
    
    const fallbackSkills = extractBasicSkills(rawText);
    
    return {
      rawText,
      sections: {
        skills: fallbackSkills.join(', ')
      },
      extractedSkills: fallbackSkills,
      phoneNumber: extractPhone(rawText),
      email: extractEmail(rawText),
    };
  }
};

// Fallback skill extraction
const extractBasicSkills = (text: string): string[] => {
  const textLower = text.toLowerCase();
  const skills = new Set<string>();
  
  // Comprehensive skill database
  const skillKeywords = [
    // Sales & Business
    'sales', 'salesforce', 'crm', 'business development', 'account management',
    'pipeline management', 'customer success', 'revenue growth', 'partnership',
    'strategic planning', 'stakeholder management', 'cross-functional leadership',
    
    // Technical
    'javascript', 'typescript', 'react', 'angular', 'vue', 'node.js', 'python',
    'java', 'sql', 'aws', 'azure', 'docker', 'kubernetes',
    
    // Marketing
    'digital marketing', 'seo', 'social media', 'content marketing', 'google ads',
    
    // Management
    'project management', 'team leadership', 'agile', 'scrum', 'training',
    
    // Soft Skills
    'communication', 'problem solving', 'analytical thinking', 'collaboration'
  ];
  
  skillKeywords.forEach(skill => {
    if (textLower.includes(skill)) {
      skills.add(skill.charAt(0).toUpperCase() + skill.slice(1));
    }
  });
  
  return Array.from(skills).slice(0, 10);
};

const extractEmail = (text: string): string => {
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  return emailMatch?.[0] || '';
};

const extractPhone = (text: string): string => {
  const phoneMatch = text.match(/(\+?\d{1,4}[\s\-\.]?)?\(?(\d{3})\)?[\s\-\.]?(\d{3,4})[\s\-\.]?(\d{4})/);
  return phoneMatch?.[0] || '';
};