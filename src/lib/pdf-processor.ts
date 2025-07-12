import * as pdfjsLib from 'pdfjs-dist/build/pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.3.93/pdf.worker.min.js';

// 📢 Diagnostics
console.log('🔧 PDF.js Configuration Diagnostics:');
console.log('   - GlobalWorkerOptions.workerSrc:', pdfjsLib.GlobalWorkerOptions.workerSrc);
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
    diagnostics: any;
  };
}

const PDF_CONFIG = {
  MAX_PAGES: 10,
  MAIN_TIMEOUT_MS: 10000,
  MIN_TEXT_LENGTH: 100,
};

export const extractTextFromPDF = async (file: File): Promise<ExtractedResumeData> => {
  const startTime = Date.now();
  console.log('🔍 Starting robust PDF text extraction...');
  const diagnostics: any = {
    pdfJsAttempted: false,
    pdfJsSuccess: false,
    fallbackAttempted: false,
    fallbackSuccess: false,
    errorDetails: '',
  };

  try {
    const arrayBuffer = await file.arrayBuffer();
    console.log('📄 PDF loaded, size:', arrayBuffer.byteLength, 'bytes');
    diagnostics.pdfJsAttempted = true;

    try {
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapPacked: false,
        disableWorker: false, // Allow worker now that we set workerSrc
      });
      const pdf = await Promise.race([
        loadingTask.promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('PDF.js loading timeout')), PDF_CONFIG.MAIN_TIMEOUT_MS)
        ),
      ]);
      console.log('✅ PDF.js loaded:', pdf.numPages, 'pages');

      let allText = '';
      const maxPages = Math.min(pdf.numPages, PDF_CONFIG.MAX_PAGES);
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .filter((str: string) => str.trim().length > 0)
          .join(' ');
        console.log(`📄 Page ${pageNum}: ${pageText.length} chars`);
        allText += pageText + '\n\n';
      }

      await pdf.destroy();
      const cleanedText = cleanAndValidateText(allText);
      if (cleanedText.length >= PDF_CONFIG.MIN_TEXT_LENGTH) {
        diagnostics.pdfJsSuccess = true;
        return makeResult(cleanedText, 'pdfjs', startTime, diagnostics);
      }
      throw new Error('PDF.js extracted insufficient text');
    } catch (err: any) {
      diagnostics.errorDetails = 'PDF.js failed: ' + err.message;
      console.warn('❌ PDF.js failed:', err.message);
    }

    // 🧠 Fallback to ArrayBuffer extraction
    diagnostics.fallbackAttempted = true;
    const fallbackText = extractWithArrayBuffer(arrayBuffer);
    if (fallbackText.length >= PDF_CONFIG.MIN_TEXT_LENGTH) {
      diagnostics.fallbackSuccess = true;
      return makeResult(fallbackText, 'arraybuffer-fallback', startTime, diagnostics);
    }
    throw new Error('ArrayBuffer fallback insufficient text');
  } catch (finalError: any) {
    diagnostics.errorDetails += ' | Final fallback: ' + finalError.message;
    console.warn('⚠️ All extractions failed:', finalError.message);

    // Last resort fallback
    const filenameText = `Resume: ${file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')}. Professional document requiring manual extraction.`;
    return makeResult(filenameText, 'filename-fallback', startTime, diagnostics);
  }
};

function extractWithArrayBuffer(arrayBuffer: ArrayBuffer): string {
  console.log('🧠 Starting ArrayBuffer fallback...');
  const uint8 = new Uint8Array(arrayBuffer);
  const textDecoder = new TextDecoder('utf-8');
  let text = textDecoder.decode(uint8);

  // 🧹 Clean binary noise
  text = text
    .split(/\r?\n/)
    .filter((line) => {
      const alphaRatio = (line.replace(/[^A-Za-z]/g, '').length / Math.max(1, line.length));
      return alphaRatio >= 0.5 && !/obj|endobj|stream|endstream|\/Filter|\/FlateDecode/i.test(line);
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  console.log(`📊 Fallback cleaned text length: ${text.length} chars`);
  return text;
}

function makeResult(text: string, method: string, startTime: number, diagnostics: any): ExtractedResumeData {
  const metrics = calculateTextMetrics(text, Date.now() - startTime, diagnostics);
  console.log('📊 Extraction completed:', {
    method,
    quality: metrics.textQuality,
    wordCount: metrics.wordCount,
    readablePercentage: metrics.readablePercentage,
  });
  return {
    rawText: text,
    cleanedText: text,
    extractionMethod: method,
    textQuality: metrics.textQuality,
    extractionMetrics: metrics,
  };
}

function calculateTextMetrics(text: string, processingTime: number, diagnostics: any) {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const readableWords = words.filter((w) => /[A-Za-z]/.test(w));
  const readablePercentage = Math.round((readableWords.length / Math.max(1, words.length)) * 100);

  const structureIndicators = ['experience', 'education', 'skills', 'summary'].filter((kw) =>
    new RegExp(`\\b${kw}\\b`, 'i').test(text)
  ).length;

  return {
    wordCount: words.length,
    readablePercentage,
    hasStructuredContent: structureIndicators > 0,
    structureIndicators,
    wordDiversity: Math.round(
      (new Set(readableWords.map((w) => w.toLowerCase())).size / Math.max(1, readableWords.length)) * 100
    ),
    processingTime,
    diagnostics,
    textQuality: getQualityLabel(readablePercentage, structureIndicators > 0),
  };
}

function cleanAndValidateText(text: string): string {
  return text
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getQualityLabel(readablePercentage: number, hasStructure: boolean): string {
  if (readablePercentage >= 90 && hasStructure) return 'excellent';
  if (readablePercentage >= 75) return 'good';
  if (readablePercentage >= 50) return 'fair';
  return 'poor';
}
