// src/lib/pdf-processor.ts - BULLETPROOF WITH OCR FALLBACK
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import Tesseract from 'tesseract.js';

// ✅ Disable workers for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

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
      ocrAttempted: boolean;
      ocrSuccess: boolean;
      errorDetails: string;
    };
  };
}

const PDF_CONFIG = {
  MAX_PAGES: 5,
  MAIN_TIMEOUT_MS: 10000,
  MIN_TEXT_LENGTH: 30
};

export const extractTextFromPDF = async (file: File): Promise<ExtractedResumeData> => {
  const startTime = Date.now();
  console.log('🔍 Starting robust PDF text extraction...');
  
  const diagnostics = {
    pdfJsAttempted: false,
    pdfJsSuccess: false,
    fallbackAttempted: false,
    fallbackSuccess: false,
    ocrAttempted: false,
    ocrSuccess: false,
    errorDetails: ''
  };

  let pdf: any = null;

  try {
    const arrayBuffer = await file.arrayBuffer();
    console.log('📄 PDF loaded, size:', arrayBuffer.byteLength, 'bytes');
    diagnostics.pdfJsAttempted = true;

    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      disableWorker: true
    });

    pdf = await Promise.race([
      loadingTask.promise,
      timeout(PDF_CONFIG.MAIN_TIMEOUT_MS, 'PDF.js loading timeout')
    ]);

    console.log('✅ PDF.js loaded:', pdf.numPages, 'pages');

    const maxPages = Math.min(pdf.numPages, PDF_CONFIG.MAX_PAGES);
    let allText = '';

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      console.log(`📄 Processing page ${pageNum}...`);
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .filter((t: string) => t.trim().length > 0)
        .join(' ');

      if (pageText.length > 10) {
        allText += pageText + '\n\n';
        console.log(`✅ Page ${pageNum}: ${pageText.length} characters extracted`);
      } else {
        console.log(`⚠️ Page ${pageNum}: No text content found`);
      }

      await page.cleanup();
    }

    await pdf.destroy();
    pdf = null;

    const cleanedText = cleanAndValidateText(allText);
    if (cleanedText.length >= PDF_CONFIG.MIN_TEXT_LENGTH) {
      diagnostics.pdfJsSuccess = true;
      return buildResult(cleanedText, 'pdfjs-main-thread', startTime, diagnostics);
    } else {
      throw new Error('PDF.js extracted insufficient text');
    }

  } catch (pdfError: any) {
    console.warn('❌ PDF.js failed:', pdfError.message);
    diagnostics.errorDetails += `PDF.js: ${pdfError.message}`;
  }

  // 🔄 Try ArrayBuffer fallback
  try {
    diagnostics.fallbackAttempted = true;
    const fallbackText = await extractWithArrayBuffer(file);

    if (fallbackText && fallbackText.length >= PDF_CONFIG.MIN_TEXT_LENGTH) {
      diagnostics.fallbackSuccess = true;
      return buildResult(fallbackText, 'arraybuffer-fallback', startTime, diagnostics);
    }
  } catch (fbError: any) {
    console.warn('❌ ArrayBuffer fallback failed:', fbError.message);
    diagnostics.errorDetails += ` | ArrayBuffer: ${fbError.message}`;
  }

  // 🧠 Try OCR fallback
  try {
    diagnostics.ocrAttempted = true;
    const ocrText = await extractWithOCR(file);

    if (ocrText && ocrText.length >= PDF_CONFIG.MIN_TEXT_LENGTH) {
      diagnostics.ocrSuccess = true;
      return buildResult(ocrText, 'ocr-fallback', startTime, diagnostics);
    }
  } catch (ocrError: any) {
    console.warn('❌ OCR fallback failed:', ocrError.message);
    diagnostics.errorDetails += ` | OCR: ${ocrError.message}`;
  }

  // 📄 Filename fallback
  console.log('📄 Using filename fallback...');
  const filenameText = `Resume: ${file.name.replace(/\.[^/.]+$/, '')}`;
  return buildResult(filenameText, 'filename-fallback', startTime, diagnostics, 'poor');
};

// 📖 OCR fallback using Tesseract.js
async function extractWithOCR(file: File): Promise<string> {
  console.log('🧠 Starting OCR fallback...');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise;
  const maxPages = Math.min(pdf.numPages, PDF_CONFIG.MAX_PAGES);

  let ocrText = '';

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    console.log(`🖼️ Rendering page ${pageNum} for OCR...`);
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;

    const dataUrl = canvas.toDataURL('image/png');
    const { data: { text } } = await Tesseract.recognize(dataUrl, 'eng', {
      logger: m => console.log(`🔠 OCR Progress [Page ${pageNum}]:`, m.status, m.progress)
    });

    ocrText += text + '\n\n';
    console.log(`✅ OCR Page ${pageNum} text length:`, text.length);
  }

  await pdf.destroy();

  return cleanAndValidateText(ocrText);
}

async function extractWithArrayBuffer(file: File): Promise<string> {
  console.log('🧠 Starting ArrayBuffer fallback...');
  const arrayBuffer = await file.arrayBuffer();
  const text = new TextDecoder('utf-8').decode(arrayBuffer);
  return cleanAndValidateText(text);
}

function cleanAndValidateText(text: string): string {
  return text.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildResult(text: string, method: string, startTime: number, diagnostics: any, quality?: string): ExtractedResumeData {
  const processingTime = Date.now() - startTime;
  const words = text.split(/\s+/);
  const readableWords = words.filter(w => /\w/.test(w));

  return {
    rawText: text,
    cleanedText: text,
    extractionMethod: method,
    textQuality: quality || (readableWords.length > 50 ? 'good' : 'poor'),
    extractionMetrics: {
      wordCount: readableWords.length,
      readablePercentage: Math.round((readableWords.length / words.length) * 100),
      hasStructuredContent: /\b(experience|skills|education|summary)\b/i.test(text),
      structureIndicators: 0,
      wordDiversity: Math.round((new Set(readableWords.map(w => w.toLowerCase())).size / readableWords.length) * 100),
      processingTime,
      diagnostics
    }
  };
}

function timeout(ms: number, msg: string) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms));
}
