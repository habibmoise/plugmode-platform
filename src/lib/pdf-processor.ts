// src/lib/pdf-processor.ts - Complete automated solution
import * as pdfjsLib from 'pdfjs-dist';
import { createClient } from '@supabase/supabase-js';

// Use local worker to avoid CSP issues
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface ExtractedResumeData {
  rawText: string;
  extractedSkills: string[];
  phoneNumber?: string;
  email?: string;
  linkedIn?: string;
  name?: string;
  location?: string;
  experience?: string;
  education?: string;
  summary?: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  confidence: number;
}

// Comprehensive skill categories for automated detection
const SKILL_CATEGORIES = {
  programming: [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'swift', 'kotlin',
    'go', 'rust', 'scala', 'dart', 'perl', 'sql', 'html', 'css', 'sass', 'less'
  ],
  frameworks: [
    'react', 'angular', 'vue', 'svelte', 'node.js', 'express', 'django', 'flask', 'spring',
    'laravel', 'rails', 'next.js', 'nuxt.js', 'gatsby', 'ember', 'backbone', 'jquery'
  ],
  databases: [
    'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'cassandra', 'dynamodb',
    'oracle', 'sqlite', 'mariadb', 'firebase', 'supabase'
  ],
  cloud: [
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ansible', 'jenkins',
    'github actions', 'gitlab ci', 'circleci', 'heroku', 'vercel', 'netlify'
  ],
  tools: [
    'git', 'jira', 'confluence', 'slack', 'figma', 'sketch', 'photoshop', 'illustrator',
    'postman', 'insomnia', 'webpack', 'vite', 'babel', 'eslint', 'prettier'
  ],
  methodologies: [
    'agile', 'scrum', 'kanban', 'devops', 'ci/cd', 'tdd', 'bdd', 'microservices',
    'api design', 'system design', 'architecture'
  ],
  soft_skills: [
    'leadership', 'management', 'communication', 'teamwork', 'problem solving',
    'project management', 'mentoring', 'training', 'presentation', 'negotiation'
  ]
};

/**
 * Automated PDF text extraction with fallback strategies
 */
async function extractTextFromPDF(file: File): Promise<{ text: string; quality: string }> {
  console.log('🚀 Starting automated PDF extraction...');
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    console.log(`📄 PDF loaded: ${pdf.numPages} pages`);
    
    let fullText = '';
    let totalItems = 0;
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Smart text reconstruction preserving structure
      const pageText = textContent.items
        .map((item: any) => {
          if ('str' in item) {
            totalItems++;
            return item.str;
          }
          return '';
        })
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      fullText += pageText + '\n\n';
    }
    
    // Quality assessment
    const wordCount = fullText.split(' ').length;
    const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(fullText);
    const hasPhone = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(fullText);
    
    let quality = 'poor';
    if (wordCount > 100 && hasEmail && hasPhone) quality = 'excellent';
    else if (wordCount > 50 && (hasEmail || hasPhone)) quality = 'good';
    else if (wordCount > 20) quality = 'fair';
    
    console.log(`✅ Extraction complete: ${wordCount} words, quality: ${quality}`);
    
    return {
      text: fullText.trim(),
      quality
    };
    
  } catch (error) {
    console.error('❌ PDF extraction failed:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Automated skill extraction using pattern matching and context analysis
 */
function extractSkillsAutomatically(text: string): string[] {
  const normalizedText = text.toLowerCase();
  const foundSkills = new Set<string>();
  
  // Extract skills from all categories
  Object.values(SKILL_CATEGORIES).forEach(categorySkills => {
    categorySkills.forEach(skill => {
      // Multiple pattern matching strategies
      const patterns = [
        new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
        new RegExp(`\\b${skill.replace(/\./g, '').replace(/\s+/g, '')}\\b`, 'gi'),
        new RegExp(`${skill.replace(/\./g, '\\.')}`, 'gi')
      ];
      
      patterns.forEach(pattern => {
        if (pattern.test(normalizedText)) {
          foundSkills.add(skill);
        }
      });
    });
  });
  
  // Context-based skill detection for common variations
  const contextMappings = {
    'react': ['reactjs', 'react.js'],
    'node.js': ['nodejs', 'node'],
    'javascript': ['js', 'ecmascript'],
    'typescript': ['ts'],
    'c++': ['cpp'],
    'c#': ['csharp'],
    'postgresql': ['postgres'],
    'mongodb': ['mongo'],
    'aws': ['amazon web services'],
    'gcp': ['google cloud'],
    'azure': ['microsoft azure']
  };
  
  Object.entries(contextMappings).forEach(([mainSkill, variations]) => {
    variations.forEach(variation => {
      if (normalizedText.includes(variation)) {
        foundSkills.add(mainSkill);
      }
    });
  });
  
  return Array.from(foundSkills).sort();
}

/**
 * Extract contact information automatically
 */
function extractContactInfo(text: string): {
  email?: string;
  phone?: string;
  name?: string;
  location?: string;
  linkedIn?: string;
} {
  // Email extraction
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  const email = emailMatch ? emailMatch[0] : undefined;
  
  // Phone extraction (multiple formats)
  const phonePatterns = [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
    /\(\d{3}\)\s?\d{3}[-.]?\d{4}/,
    /\+\d{1,3}\s?\d{3}[-.]?\d{3}[-.]?\d{4}/
  ];
  
  let phone: string | undefined;
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      phone = match[0];
      break;
    }
  }
  
  // LinkedIn extraction
  const linkedInMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
  const linkedIn = linkedInMatch ? `https://${linkedInMatch[0]}` : undefined;
  
  // Name extraction (first line or before email)
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  let name: string | undefined;
  
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    // Simple heuristic: if first line has 2-4 words and no common resume keywords
    const words = firstLine.split(' ');
    const commonKeywords = ['resume', 'cv', 'curriculum', 'profile', 'summary'];
    
    if (words.length >= 2 && words.length <= 4 && 
        !commonKeywords.some(keyword => firstLine.toLowerCase().includes(keyword))) {
      name = firstLine;
    }
  }
  
  // Location extraction (look for city, state patterns)
  const locationMatch = text.match(/([A-Z][a-z]+,\s*[A-Z]{2})|([A-Z][a-z]+\s+[A-Z][a-z]+,\s*[A-Z]{2})/);
  const location = locationMatch ? locationMatch[0] : undefined;
  
  return { email, phone, name, location, linkedIn };
}

/**
 * Main automated processing function
 */
export async function processResumeAutomatically(file: File): Promise<ExtractedResumeData> {
  console.log('🤖 Starting automated resume processing...');
  
  try {
    // Step 1: Extract text from PDF
    const { text, quality } = await extractTextFromPDF(file);
    
    if (!text || text.length < 50) {
      throw new Error('Insufficient text extracted from PDF');
    }
    
    // Step 2: Extract skills automatically
    const extractedSkills = extractSkillsAutomatically(text);
    console.log(`🎯 Found ${extractedSkills.length} skills automatically`);
    
    // Step 3: Extract contact information
    const contactInfo = extractContactInfo(text);
    console.log('📇 Contact info extracted:', contactInfo);
    
    // Step 4: Calculate confidence score
    const confidence = Math.min(100, Math.max(0, 
      (extractedSkills.length * 5) + 
      (contactInfo.email ? 20 : 0) + 
      (contactInfo.phone ? 15 : 0) + 
      (contactInfo.name ? 10 : 0) +
      (text.length > 500 ? 20 : 10)
    ));
    
    const result: ExtractedResumeData = {
      rawText: text,
      extractedSkills,
      phoneNumber: contactInfo.phone,
      email: contactInfo.email,
      linkedIn: contactInfo.linkedIn,
      name: contactInfo.name,
      location: contactInfo.location,
      quality: quality as any,
      confidence
    };
    
    console.log('✅ Automated processing complete:', {
      skills: extractedSkills.length,
      quality,
      confidence: `${confidence}%`
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Automated processing failed:', error);
    
    // Fallback response to ensure the system continues working
    return {
      rawText: '',
      extractedSkills: [],
      quality: 'poor',
      confidence: 0
    };
  }
}