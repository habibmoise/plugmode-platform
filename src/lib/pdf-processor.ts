// src/lib/pdf-processor.ts - DIAGNOSTIC VERSION WITH ENHANCED LOGGING
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// 🔥 BULLETPROOF WORKER DISABLE - Use the explicit build/pdf import
// This ensures we get the right PDF.js module without bundler interference
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

// 🔍 DIAGNOSTIC: Verify worker is disabled
console.log('🔧 PDF.js Configuration Diagnostics:');
console.log('   - GlobalWorkerOptions.workerSrc:', pdfjsLib.GlobalWorkerOptions.workerSrc);
console.log('   - Worker disabled:', pdfjsLib.GlobalWorkerOptions.workerSrc === '');
console.log('   - PDF.js version:', pdfjsLib.version || 'unknown');

export interface ExtractedResumeData {
  rawText: string;
  cleanedText: string;
  extractionMethod: string;
  textQuality: string;
  extractionMetrics: {
    wordCount: number;
    readablePercentage: number;
    hasStructuredContent: boolean;
    structureIndicators: number;
    wordDiversity: number;
    processingTime: number;
    diagnostics: {
      pdfJsAttempted: boolean;
      pdfJsSuccess: boolean;
      fallbackAttempted: boolean;
      fallbackSuccess: boolean;
      errorDetails: string;
    };
  };
}

const PDF_CONFIG = {
  MAX_PAGES: 10,
  MAIN_TIMEOUT_MS: 10000,
  MIN_TEXT_LENGTH: 30,
  MIN_SEGMENT_LENGTH: 15,
  MIN_WORDS_PER_SEGMENT: 2
};

export const extractTextFromPDF = async (file: File): Promise<ExtractedResumeData> => {
  const startTime = Date.now();
  console.log('🔍 Starting diagnostic PDF text extraction for:', file.name);
  
  // Initialize diagnostics
  const diagnostics = {
    pdfJsAttempted: false,
    pdfJsSuccess: false,
    fallbackAttempted: false,
    fallbackSuccess: false,
    errorDetails: ''
  };
  
  let pdf: any = null;
  
  try {
    // 🔥 OVERALL ERROR PROTECTION - Single try block
    const arrayBuffer = await file.arrayBuffer();
    console.log('📄 PDF file loaded, size:', arrayBuffer.byteLength, 'bytes');
    
    // 🔥 CRITICAL DIAGNOSTIC: Check worker status RIGHT before getDocument
    console.log('🔧 Pre-extraction diagnostics:');
    console.log('   - GlobalWorkerOptions.workerSrc (current):', pdfjsLib.GlobalWorkerOptions.workerSrc);
    console.log('   - Is workerSrc empty string?', pdfjsLib.GlobalWorkerOptions.workerSrc === '');
    
    diagnostics.pdfJsAttempted = true;
    
    try {
      // PDF.js extraction attempt
      console.log('📄 Attempting PDF.js extraction with enhanced config...');
      
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        disableWorker: true,           // ✅ Force disable worker
        useWorkerFetch: false,         // ✅ No worker fetching
        isEvalSupported: false,        // ✅ No eval calls
        disableAutoFetch: true,        // ✅ No auto resource fetching
        disableStream: true,           // ✅ Load all at once
        useSystemFonts: false,         // ✅ No system font loading
        stopAtErrors: false,           // ✅ Continue on errors
        maxImageSize: -1,              // ✅ No image size limits
        cMapPacked: false              // ✅ No CMap worker usage
      });
      
      // Add timeout for PDF loading
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF loading timeout')), PDF_CONFIG.MAIN_TIMEOUT_MS)
      );
      
      pdf = await Promise.race([loadingTask.promise, timeoutPromise]);
      console.log('✅ PDF.js loaded successfully:', pdf.numPages, 'pages');
      
      // Extract text from all pages
      let allText = '';
      const maxPages = Math.min(pdf.numPages, PDF_CONFIG.MAX_PAGES);
      
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        let page: any = null;
        try {
          console.log(`📄 Processing page ${pageNum}...`);
          page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          const pageText = textContent.items
            .map((item: any) => item.str || '')
            .filter((text: string) => text.trim().length > 0)
            .join(' ');
          
          if (pageText.length > 10) {
            allText += pageText + '\n\n';
            console.log(`✅ Page ${pageNum}: ${pageText.length} characters extracted`);
            console.log(`   Preview: "${pageText.substring(0, 100)}..."`);
          }
          
        } catch (pageError: any) {
          console.warn(`⚠️ Page ${pageNum} failed:`, pageError.message);
        } finally {
          // ✅ Proper page cleanup with error handling
          if (page) {
            try {
              await page.cleanup();
            } catch (cleanupError: any) {
              console.warn(`⚠️ Page ${pageNum} cleanup failed:`, cleanupError.message);
            }
          }
        }
      }
      
      if (pdf) {
        pdf.destroy();
        pdf = null;
      }
      
      const cleanedText = cleanAndValidateText(allText);
      console.log('📊 PDF.js extraction results:', {
        totalLength: allText.length,
        cleanedLength: cleanedText.length,
        preview: cleanedText.substring(0, 200)
      });
      
      if (cleanedText.length >= PDF_CONFIG.MIN_TEXT_LENGTH) {
        diagnostics.pdfJsSuccess = true;
        const processingTime = Date.now() - startTime;
        const metrics = calculateTextMetrics(cleanedText, processingTime, diagnostics);
        
        console.log('✅ PDF.js extraction successful!');
        
        return {
          rawText: allText,
          cleanedText: cleanedText,
          extractionMethod: 'pdfjs-main-thread',
          textQuality: getQualityLabel(metrics.readablePercentage, metrics.hasStructuredContent),
          extractionMetrics: metrics
        };
      } else {
        throw new Error(`PDF.js extracted insufficient text (${cleanedText.length} chars)`);
      }
      
    } catch (pdfError: any) {
      // PDF.js failed, try fallback
      diagnostics.errorDetails = pdfError.message;
      console.warn('❌ PDF.js extraction failed:', pdfError.message);
      
      try {
        diagnostics.fallbackAttempted = true;
        console.log('🔄 Attempting enhanced ArrayBuffer fallback extraction...');
        
        const fallbackText = await extractWithEnhancedArrayBuffer(file);
        
        if (fallbackText && fallbackText.length >= PDF_CONFIG.MIN_TEXT_LENGTH) {
          diagnostics.fallbackSuccess = true;
          const processingTime = Date.now() - startTime;
          const metrics = calculateTextMetrics(fallbackText, processingTime, diagnostics);
          
          console.log('✅ Fallback extraction successful!');
          
          return {
            rawText: fallbackText,
            cleanedText: fallbackText,
            extractionMethod: 'enhanced-arraybuffer-fallback',
            textQuality: getQualityLabel(metrics.readablePercentage, metrics.hasStructuredContent),
            extractionMetrics: metrics
          };
        }
        
      } catch (fallbackError: any) {
        console.warn('❌ Fallback extraction also failed:', fallbackError.message);
        diagnostics.errorDetails = diagnostics.errorDetails 
          ? `${diagnostics.errorDetails} | Fallback: ${fallbackError.message}`
          : `Fallback: ${fallbackError.message}`;
      }
      
      // Final filename-based fallback
      console.log('📄 Using filename-based extraction as last resort...');
      const filename = file.name.replace(/\.[^/.]+$/, '');
      const filenameText = `Resume: ${filename.replace(/[-_]/g, ' ')}. Professional document requiring manual text extraction for optimal AI analysis.`;
      
      const processingTime = Date.now() - startTime;
      const metrics = calculateTextMetrics(filenameText, processingTime, diagnostics);
      
      return {
        rawText: filenameText,
        cleanedText: filenameText,
        extractionMethod: 'filename-minimal-fallback',
        textQuality: 'poor',
        extractionMetrics: metrics
      };
    }
    
  } catch (unexpectedError: any) {
    // Top-level error protection
    console.error('💥 Unexpected error in PDF extraction:', unexpectedError);
    const processingTime = Date.now() - startTime;
    
    diagnostics.errorDetails = diagnostics.errorDetails 
      ? `${diagnostics.errorDetails} | Unexpected: ${unexpectedError.message}`
      : `Unexpected: ${unexpectedError.message}`;
    
    const emergencyText = `Resume document: ${file.name}. Emergency fallback due to extraction error.`;
    const metrics = calculateTextMetrics(emergencyText, processingTime, diagnostics);
    
    return {
      rawText: emergencyText,
      cleanedText: emergencyText,
      extractionMethod: 'emergency-fallback',
      textQuality: 'poor',
      extractionMetrics: metrics
    };
    
  } finally {
    // Final cleanup
    if (pdf) {
      try {
        pdf.destroy();
      } catch (cleanupError: any) {
        console.warn('⚠️ PDF cleanup failed:', cleanupError.message);
      }
    }
  }
};

// 🔍 RESTORED WORKING ARRAYBUFFER EXTRACTION - Less strict filtering
async function extractWithEnhancedArrayBuffer(file: File): Promise<string> {
  console.log('🧠 Starting enhanced ArrayBuffer extraction...');
  
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  console.log('📊 ArrayBuffer analysis:', {
    totalBytes: uint8Array.length,
    firstBytes: Array.from(uint8Array.slice(0, 10)).map(b => String.fromCharCode(b)).join(''),
    isPdfFormat: Array.from(uint8Array.slice(0, 4)).every((b, i) => b === '%PDF'.charCodeAt(i))
  });
  
  let textChunks: string[] = [];
  let currentChunk = '';
  let readableCharCount = 0;
  let totalCharCount = 0;
  
  // More permissive text extraction - restore working approach
  for (let i = 0; i < uint8Array.length; i++) {
    const byte = uint8Array[i];
    totalCharCount++;
    
    // Accept wider range of characters
    if ((byte >= 32 && byte <= 126) ||     // Printable ASCII
        (byte >= 128 && byte <= 255) ||    // Extended ASCII
        byte === 10 || byte === 13 || byte === 9) {  // Whitespace
      
      const char = String.fromCharCode(byte);
      readableCharCount++;
      
      // Less aggressive filtering - keep more content
      if (!/^[%<>{}[\]()]$/.test(char)) {
        currentChunk += char;
      }
      
    } else if (currentChunk.length > 5) {
      // Process accumulated chunk with more permissive rules
      const words = currentChunk.split(/\s+/)
        .filter(word => word.length > 1 && /[a-zA-Z]/.test(word))
        .filter(word => !isPdfArtifact(word));
      
      if (words.length > 1) {
        const chunkText = words.join(' ');
        textChunks.push(chunkText);
        console.log('📝 Found text chunk:', chunkText.substring(0, 80) + (chunkText.length > 80 ? '...' : ''));
      }
      
      currentChunk = '';
    }
  }
  
  // Process final chunk
  if (currentChunk.length > 5) {
    const words = currentChunk.split(/\s+/)
      .filter(word => word.length > 1 && /[a-zA-Z]/.test(word))
      .filter(word => !isPdfArtifact(word));
    
    if (words.length > 1) {
      const chunkText = words.join(' ');
      textChunks.push(chunkText);
      console.log('📝 Found final chunk:', chunkText.substring(0, 80) + (chunkText.length > 80 ? '...' : ''));
    }
  }
  
  const extractedText = textChunks.join(' ');
  
  console.log('📊 ArrayBuffer extraction results:', {
    totalChunks: textChunks.length,
    extractedLength: extractedText.length,
    readableRatio: Math.round((readableCharCount / totalCharCount) * 100) + '%',
    preview: extractedText.substring(0, 300),
    hasResumeContent: extractedText.length > 100
  });
  
  if (extractedText.length > 50 && textChunks.length > 1) {
    console.log('✅ Enhanced ArrayBuffer extraction found text content');
    return extractedText;
  }
  
  throw new Error(`ArrayBuffer extraction insufficient: ${extractedText.length} chars, ${textChunks.length} chunks`);
}

function isLikelyResumeText(text: string): boolean {
  // Check if text looks like resume content
  const resumeIndicators = [
    /\b(experience|education|skills|summary|objective|work|job|employment|qualifications|achievements|accomplishments|projects|certifications|training|languages|references|contact|profile|career|professional|responsibilities|management|leadership|technical)\b/i,
    /\b(manager|engineer|developer|analyst|coordinator|specialist|consultant|administrator|supervisor|director|lead|senior|junior)\b/i,
    /\b(years?|months?|graduated|degree|university|college|company|corporation|inc|llc|ltd)\b/i,
    /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/, // Likely names (two capitalized words)
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // Phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
  ];
  
  // Must have reasonable letter density
  const letters = (text.match(/[a-zA-Z]/g) || []).length;
  const letterRatio = letters / text.length;
  
  // Must not be mostly PDF artifacts
  const pdfArtifacts = /\b(obj|endobj|stream|endstream|filter|flatedecode|length|type|subtype|basefont|encoding|font)\b/gi;
  const artifactMatches = (text.match(pdfArtifacts) || []).length;
  const words = text.split(/\s+/).length;
  const artifactRatio = artifactMatches / Math.max(1, words);
  
  return letterRatio > 0.6 && // At least 60% letters
         artifactRatio < 0.3 && // Less than 30% PDF artifacts
         resumeIndicators.some(pattern => pattern.test(text)); // Has resume indicators
}

function isPdfArtifact(word: string): boolean {
  const artifacts = [
    'obj', 'endobj', 'stream', 'endstream', 'xref', 'trailer', 'startxref',
    'filter', 'flatedecode', 'length', 'type', 'subtype', 'basefont',
    'encoding', 'font', 'fontname', 'fontsize', 'bbox', 'matrix'
  ];
  return artifacts.includes(word.toLowerCase()) || /^[0-9]+$/.test(word);
}

function cleanAndValidateText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ') // Remove control chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function calculateTextMetrics(text: string, processingTime: number, diagnostics: any) {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const readableWords = words.filter(w => /[a-zA-Z]/.test(w) && w.length > 1);
  const readablePercentage = words.length > 0 ? Math.round((readableWords.length / words.length) * 100) : 0;
  
  const structureWords = ['experience', 'education', 'skills', 'summary', 'work', 'job'];
  const hasStructuredContent = structureWords.some(word => 
    new RegExp(`\\b${word}\\b`, 'i').test(text)
  );
  
  return {
    wordCount: words.length,
    readablePercentage,
    hasStructuredContent,
    structureIndicators: structureWords.filter(word => 
      new RegExp(`\\b${word}\\b`, 'i').test(text)
    ).length,
    wordDiversity: Math.round((new Set(readableWords.map(w => w.toLowerCase())).size / Math.max(1, readableWords.length)) * 100),
    processingTime,
    diagnostics
  };
}

function getQualityLabel(readablePercentage: number, hasStructure: boolean): string {
  if (readablePercentage >= 90 && hasStructure) return 'excellent';
  if (readablePercentage >= 75) return 'good';
  if (readablePercentage >= 50) return 'fair';
  return 'poor';
}