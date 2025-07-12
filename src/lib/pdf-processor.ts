// src/lib/pdf-processor.ts - ROBUST PDF TEXT EXTRACTION
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker with multiple CDN fallbacks
const configureWorker = () => {
  const workerUrls = [
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`,
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`,
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`
  ];
  
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrls[0];
};

configureWorker();

export interface ExtractedResumeData {
  rawText: string;
  cleanedText: string;
  extractionMethod: string;
  textQuality: 'excellent' | 'good' | 'poor' | 'failed';
  extractionMetrics: {
    totalLength: number;
    readablePercentage: number;
    lineCount: number;
    wordCount: number;
  };
  sections: {
    contact?: string;
    summary?: string;
    experience?: string;
    education?: string;
    skills?: string;
  };
}

export class RobustPDFProcessor {
  
  /**
   * Main extraction method - tries multiple strategies
   */
  async extractTextFromPDF(file: File): Promise<ExtractedResumeData> {
    console.log('🔍 Starting robust PDF text extraction for:', file.name);
    
    const strategies = [
      () => this.extractWithPDFJS(file),
      () => this.extractWithFileReader(file),
      () => this.extractWithFormData(file),
      () => this.extractWithArrayBuffer(file)
    ];
    
    let bestResult: ExtractedResumeData | null = null;
    let bestQualityScore = 0;
    
    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`📄 Trying extraction strategy ${i + 1}...`);
        const result = await strategies[i]();
        const qualityScore = this.calculateQualityScore(result);
        
        console.log(`📊 Strategy ${i + 1} quality score:`, qualityScore);
        
        if (qualityScore > bestQualityScore) {
          bestResult = result;
          bestQualityScore = qualityScore;
        }
        
        // If we get excellent quality, stop trying
        if (result.textQuality === 'excellent') {
          console.log('✅ Excellent quality achieved, stopping extraction attempts');
          break;
        }
        
      } catch (error) {
        console.warn(`⚠️ Strategy ${i + 1} failed:`, error.message);
        continue;
      }
    }
    
    if (!bestResult) {
      throw new Error('All PDF extraction strategies failed');
    }
    
    console.log(`🎯 Best extraction method: ${bestResult.extractionMethod}`);
    console.log(`📊 Final text quality: ${bestResult.textQuality}`);
    console.log(`📝 Extracted ${bestResult.extractionMetrics.wordCount} words`);
    
    return bestResult;
  }
  
  /**
   * Strategy 1: Advanced PDF.js with text positioning
   */
  private async extractWithPDFJS(file: File): Promise<ExtractedResumeData> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true,
      verbosity: 0
    }).promise;
    
    let fullText = '';
    const textItems: any[] = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent({
        includeMarkedContent: true,
        disableCombineTextItems: false
      });
      
      // Enhanced text extraction with positioning
      const pageItems = textContent.items.map((item: any) => ({
        str: item.str,
        x: item.transform?.[4] || 0,
        y: item.transform?.[5] || 0,
        width: item.width || 0,
        height: item.height || 0,
        fontName: item.fontName || '',
        dir: item.dir || 'ltr'
      }));
      
      textItems.push(...pageItems);
      
      // Sort by Y position (top to bottom), then X position (left to right)
      pageItems.sort((a, b) => {
        const yDiff = Math.abs(a.y - b.y);
        if (yDiff < 5) { // Same line
          return a.x - b.x;
        }
        return b.y - a.y; // PDF coordinates are bottom-up
      });
      
      const pageText = pageItems.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    const cleanedText = this.cleanExtractedText(fullText);
    const metrics = this.calculateMetrics(cleanedText);
    
    return {
      rawText: fullText,
      cleanedText,
      extractionMethod: 'PDF.js with positioning',
      textQuality: this.assessTextQuality(cleanedText, metrics),
      extractionMetrics: metrics,
      sections: this.extractSections(cleanedText)
    };
  }
  
  /**
   * Strategy 2: Simple file reader approach
   */
  private async extractWithFileReader(file: File): Promise<ExtractedResumeData> {
    const text = await file.text();
    const cleanedText = this.cleanExtractedText(text);
    const metrics = this.calculateMetrics(cleanedText);
    
    return {
      rawText: text,
      cleanedText,
      extractionMethod: 'File.text() method',
      textQuality: this.assessTextQuality(cleanedText, metrics),
      extractionMetrics: metrics,
      sections: this.extractSections(cleanedText)
    };
  }
  
  /**
   * Strategy 3: FormData extraction
   */
  private async extractWithFormData(file: File): Promise<ExtractedResumeData> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Convert back to text (simulates server processing)
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    let extractedText = '';
    for (let i = 0; i < uint8Array.length; i++) {
      const byte = uint8Array[i];
      // Only extract printable ASCII characters
      if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
        extractedText += String.fromCharCode(byte);
      } else if (byte >= 160) {
        // Handle extended ASCII/UTF-8
        extractedText += String.fromCharCode(byte);
      }
    }
    
    const cleanedText = this.cleanExtractedText(extractedText);
    const metrics = this.calculateMetrics(cleanedText);
    
    return {
      rawText: extractedText,
      cleanedText,
      extractionMethod: 'Binary extraction with filtering',
      textQuality: this.assessTextQuality(cleanedText, metrics),
      extractionMetrics: metrics,
      sections: this.extractSections(cleanedText)
    };
  }
  
  /**
   * Strategy 4: ArrayBuffer with smart filtering
   */
  private async extractWithArrayBuffer(file: File): Promise<ExtractedResumeData> {
    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);
    let extractedText = '';
    
    // Look for text patterns in the binary data
    for (let i = 0; i < dataView.byteLength - 1; i++) {
      const byte = dataView.getUint8(i);
      const nextByte = dataView.getUint8(i + 1);
      
      // Detect potential text sequences
      if (this.isPrintableCharacter(byte)) {
        // Check if this starts a text sequence
        let textSequence = '';
        let j = i;
        
        while (j < dataView.byteLength && this.isPrintableCharacter(dataView.getUint8(j))) {
          textSequence += String.fromCharCode(dataView.getUint8(j));
          j++;
        }
        
        // Only include sequences that look like real text
        if (textSequence.length > 2 && this.isLikelyRealText(textSequence)) {
          extractedText += textSequence + ' ';
          i = j - 1; // Skip processed bytes
        }
      }
    }
    
    const cleanedText = this.cleanExtractedText(extractedText);
    const metrics = this.calculateMetrics(cleanedText);
    
    return {
      rawText: extractedText,
      cleanedText,
      extractionMethod: 'Smart ArrayBuffer parsing',
      textQuality: this.assessTextQuality(cleanedText, metrics),
      extractionMetrics: metrics,
      sections: this.extractSections(cleanedText)
    };
  }
  
  /**
   * Clean and normalize extracted text
   */
  private cleanExtractedText(text: string): string {
    return text
      // Remove PDF artifacts
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      // Remove common PDF metadata
      .replace(/\/Type\s*\/\w+/g, '')
      .replace(/\/Filter\s*\/\w+/g, '')
      .replace(/stream\s*endstream/g, '')
      .replace(/obj\s*endobj/g, '')
      // Remove binary sequences
      .replace(/[^\x20-\x7E\x09\x0A\x0D]/g, '')
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive spaces
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      // Remove leading/trailing whitespace
      .trim();
  }
  
  /**
   * Calculate text quality metrics
   */
  private calculateMetrics(text: string) {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const words = text.split(/\s+/).filter(word => word.length > 0);
    
    // Calculate readability
    const totalChars = text.length;
    const readableChars = (text.match(/[a-zA-Z0-9\s.,!?;:()\-@]/g) || []).length;
    const readablePercentage = totalChars > 0 ? (readableChars / totalChars) * 100 : 0;
    
    return {
      totalLength: totalChars,
      readablePercentage: Math.round(readablePercentage),
      lineCount: lines.length,
      wordCount: words.length
    };
  }
  
  /**
   * Assess overall text quality
   */
  private assessTextQuality(text: string, metrics: any): 'excellent' | 'good' | 'poor' | 'failed' {
    if (metrics.totalLength < 50) return 'failed';
    if (metrics.readablePercentage < 30) return 'poor';
    if (metrics.readablePercentage < 70) return 'good';
    
    // Check for common resume indicators
    const resumeIndicators = [
      /\b(experience|education|skills|work|employment|job|position|role)\b/i,
      /\b(university|college|degree|certification|training)\b/i,
      /\b(email|phone|address|contact|linkedin)\b/i,
      /\b(manager|developer|analyst|coordinator|specialist|engineer)\b/i
    ];
    
    const indicatorCount = resumeIndicators.filter(pattern => pattern.test(text)).length;
    
    if (indicatorCount >= 3 && metrics.wordCount > 100) return 'excellent';
    if (indicatorCount >= 2 && metrics.wordCount > 50) return 'good';
    
    return 'poor';
  }
  
  /**
   * Calculate quality score for comparison
   */
  private calculateQualityScore(result: ExtractedResumeData): number {
    const qualityScores = { excellent: 100, good: 75, poor: 25, failed: 0 };
    const baseScore = qualityScores[result.textQuality];
    
    // Bonus points for word count and readability
    const wordBonus = Math.min(result.extractionMetrics.wordCount / 10, 50);
    const readabilityBonus = result.extractionMetrics.readablePercentage / 4;
    
    return baseScore + wordBonus + readabilityBonus;
  }
  
  /**
   * Extract document sections
   */
  private extractSections(text: string) {
    const sections: any = {};
    
    // Contact information (usually at top)
    const contactMatch = text.substring(0, 500).match(/(.*(?:@|phone|tel|email|linkedin).*)/i);
    if (contactMatch) sections.contact = contactMatch[0];
    
    // Professional summary/objective
    const summaryMatch = text.match(/(summary|objective|profile)[\s\S]{1,500}/i);
    if (summaryMatch) sections.summary = summaryMatch[0];
    
    // Experience section
    const experienceMatch = text.match(/(experience|employment|work history)[\s\S]{1,1000}/i);
    if (experienceMatch) sections.experience = experienceMatch[0];
    
    // Education section
    const educationMatch = text.match(/(education|academic|degree|university|college)[\s\S]{1,500}/i);
    if (educationMatch) sections.education = educationMatch[0];
    
    // Skills section
    const skillsMatch = text.match(/(skills|competencies|technical|proficiencies)[\s\S]{1,500}/i);
    if (skillsMatch) sections.skills = skillsMatch[0];
    
    return sections;
  }
  
  /**
   * Helper methods
   */
  private isPrintableCharacter(byte: number): boolean {
    return (byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13;
  }
  
  private isLikelyRealText(text: string): boolean {
    // Check if text contains common English patterns
    const vowels = text.match(/[aeiouAEIOU]/g);
    const consonants = text.match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g);
    
    if (!vowels || !consonants) return false;
    
    const vowelRatio = vowels.length / text.length;
    return vowelRatio > 0.1 && vowelRatio < 0.7 && text.length > 3;
  }
}

// Export convenience function
export async function extractTextFromPDF(file: File): Promise<ExtractedResumeData> {
  const processor = new RobustPDFProcessor();
  return processor.extractTextFromPDF(file);
}