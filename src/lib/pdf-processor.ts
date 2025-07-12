// src/lib/pdf-processor.ts - ZERO CSP ISSUES
import * as pdfjsLib from 'pdfjs-dist';

// 🔥 COMPLETELY DISABLE WORKERS TO AVOID ALL CSP ISSUES
pdfjsLib.GlobalWorkerOptions.workerSrc = false;

export interface ExtractedResumeData {
  rawText: string;
  cleanedText: string;
  extractionMethod: string;
  textQuality: string;
  extractionMetrics: {
    wordCount: number;
    readablePercentage: number;
    hasStructuredContent: boolean;
  };
}

export const extractTextFromPDF = async (file: File): Promise<ExtractedResumeData> => {
  console.log('🔍 Starting workerless PDF text extraction for:', file.name);
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    console.log('📄 Loading PDF without workers...');
    
    // Configure PDF.js for maximum compatibility
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      // Critical: Disable ALL external dependencies
      disableWorker: true,
      isEvalSupported: false,
      disableAutoFetch: true,
      disableStream: true,
      useSystemFonts: false,
      standardFontDataUrl: null
    });
    
    const pdf = await loadingTask.promise;
    console.log(`📑 PDF loaded successfully: ${pdf.numPages} pages`);
    
    let fullText = '';
    const maxPages = Math.min(pdf.numPages, 10); // Prevent timeouts
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        console.log(`📄 Processing page ${pageNum}...`);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Extract text with proper spacing and filtering
        const pageText = textContent.items
          .map((item: any) => {
            // Only process actual text items
            if (item && typeof item.str === 'string' && item.str.trim()) {
              return item.str;
            }
            return '';
          })
          .filter(text => text.length > 0)
          .join(' ');
        
        if (pageText.trim()) {
          fullText += pageText + '\n\n';
          console.log(`✅ Page ${pageNum}: extracted ${pageText.length} characters`);
        }
        
        // Clean up page to free memory
        page.cleanup();
        
      } catch (pageError) {
        console.warn(`⚠️ Failed to extract page ${pageNum}:`, pageError.message);
        // Continue with other pages
      }
    }
    
    // Clean up PDF document
    pdf.destroy();
    
    // Clean and validate the extracted text
    const cleanedText = cleanExtractedText(fullText);
    
    if (!cleanedText || cleanedText.length < 100) {
      throw new Error('PDF contains no readable text - may be image-based or corrupted');
    }
    
    console.log('✅ PDF extraction successful:', {
      originalLength: fullText.length,
      cleanedLength: cleanedText.length,
      pages: maxPages
    });
    
    // Calculate quality metrics
    const metrics = calculateTextMetrics(cleanedText);
    
    return {
      rawText: fullText,
      cleanedText: cleanedText,
      extractionMethod: 'workerless-pdfjs',
      textQuality: metrics.readablePercentage > 80 ? 'excellent' : 
                   metrics.readablePercentage > 60 ? 'good' : 'poor',
      extractionMetrics: metrics
    };
    
  } catch (error) {
    console.error('❌ Primary PDF extraction failed:', error.message);
    
    // Fallback: Try basic ArrayBuffer parsing
    try {
      console.log('🔄 Attempting fallback extraction...');
      const fallbackText = await extractWithFallback(file);
      
      if (fallbackText && fallbackText.length > 50) {
        const metrics = calculateTextMetrics(fallbackText);
        
        return {
          rawText: fallbackText,
          cleanedText: fallbackText,
          extractionMethod: 'fallback-parsing',
          textQuality: 'poor',
          extractionMetrics: metrics
        };
      }
    } catch (fallbackError) {
      console.error('❌ Fallback extraction also failed:', fallbackError.message);
    }
    
    // Final fallback: Return filename for processing
    console.log('🔄 Using minimal fallback...');
    const minimalText = `Resume: ${file.name} - Manual text extraction required`;
    
    return {
      rawText: minimalText,
      cleanedText: minimalText,
      extractionMethod: 'minimal-fallback',
      textQuality: 'poor',
      extractionMetrics: {
        wordCount: minimalText.split(' ').length,
        readablePercentage: 100,
        hasStructuredContent: false
      }
    };
  }
};

function cleanExtractedText(text: string): string {
  if (!text) return '';
  
  return text
    // Remove PDF binary artifacts
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g, ' ')
    // Remove PDF object notation
    .replace(/\d+\s+0\s+obj\s*<</g, ' ')
    .replace(/\/\w+\s+\d+/g, ' ')
    .replace(/stream[\s\S]*?endstream/g, ' ')
    .replace(/endobj/g, ' ')
    .replace(/<</g, ' ')
    .replace(/>>/g, ' ')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

async function extractWithFallback(file: File): Promise<string> {
  console.log('🔄 Trying basic text extraction...');
  
  try {
    // Try to read as text (works for some PDFs)
    const text = await file.text();
    
    // Look for readable text patterns
    const lines = text.split('\n');
    const readableLines = lines.filter(line => {
      // Keep lines that look like readable text
      const hasLetters = /[a-zA-Z]{3,}/.test(line);
      const reasonableLength = line.length > 5 && line.length < 200;
      const notBinary = !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/.test(line);
      
      return hasLetters && reasonableLength && notBinary;
    });
    
    const extractedText = readableLines.join('\n');
    
    if (extractedText.length > 100) {
      console.log('✅ Fallback extraction found readable text');
      return cleanExtractedText(extractedText);
    }
  } catch (error) {
    console.warn('⚠️ Basic text extraction failed:', error.message);
  }
  
  // Try ArrayBuffer analysis
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Look for text patterns in the binary data
    let text = '';
    for (let i = 0; i < uint8Array.length - 1; i++) {
      const char = uint8Array[i];
      // Include printable ASCII characters
      if ((char >= 32 && char <= 126) || char === 10 || char === 13) {
        text += String.fromCharCode(char);
      } else if (text.length > 0 && text[text.length - 1] !== ' ') {
        text += ' ';
      }
    }
    
    // Clean and filter the extracted text
    const cleanText = text
      .replace(/\s+/g, ' ')
      .split(' ')
      .filter(word => word.length > 2 && /[a-zA-Z]/.test(word))
      .join(' ');
    
    if (cleanText.length > 100) {
      console.log('✅ ArrayBuffer analysis found text');
      return cleanText;
    }
    
  } catch (error) {
    console.warn('⚠️ ArrayBuffer analysis failed:', error.message);
  }
  
  throw new Error('No extractable text found in PDF');
}

function calculateTextMetrics(text: string) {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const readableWords = words.filter(word => 
    /^[a-zA-Z0-9@.\-+()%$#!]+$/.test(word) && 
    word.length > 1 &&
    word.length < 50
  );
  
  const readablePercentage = words.length > 0 
    ? Math.round((readableWords.length / words.length) * 100)
    : 0;
  
  // Check for resume structure indicators
  const hasStructuredContent = /\b(education|experience|skills|summary|objective|employment|qualifications|accomplishments)\b/i.test(text);
  
  return {
    wordCount: words.length,
    readablePercentage,
    hasStructuredContent
  };
}