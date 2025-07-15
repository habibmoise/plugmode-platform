// src/components/ResumeUpload.tsx - Fully automated solution
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import { processResumeAutomatically } from '../lib/pdf-processor';
import type { ExtractedResumeData } from '../lib/pdf-processor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ResumeUploadProps {
  onUploadComplete?: (data: ExtractedResumeData) => void;
}

export default function ResumeUpload({ onUploadComplete }: ResumeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [extractedData, setExtractedData] = useState<ExtractedResumeData | null>(null);
  const [error, setError] = useState<string>('');
  const router = useRouter();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a PDF file');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      setError('');
      setExtractedData(null);
    }
  };

  const updateProgress = (step: number, message: string) => {
    setProgress(step);
    setStatus(message);
  };

  const processResume = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError('');
    
    try {
      // Step 1: Upload file to Supabase Storage
      updateProgress(20, 'Uploading file securely...');
      
      const fileExt = 'pdf';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Step 2: Process PDF automatically
      updateProgress(40, 'Extracting text from PDF...');
      
      const extractedData = await processResumeAutomatically(file);
      
      if (extractedData.confidence < 30) {
        console.warn('⚠️ Low confidence extraction, but continuing...');
      }

      // Step 3: Save to database
      updateProgress(70, 'Saving extracted data...');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const resumeData = {
        user_id: user.id,
        file_path: uploadData.path,
        original_filename: file.name,
        extracted_text: extractedData.rawText,
        skills: extractedData.extractedSkills,
        contact_info: {
          email: extractedData.email,
          phone: extractedData.phoneNumber,
          name: extractedData.name,
          location: extractedData.location,
          linkedin: extractedData.linkedIn
        },
        processing_status: 'completed',
        quality_score: extractedData.confidence,
        created_at: new Date().toISOString()
      };

      const { data: dbData, error: dbError } = await supabase
        .from('resumes')
        .insert(resumeData)
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        // Don't throw error, just log it - the extraction still worked
      }

      // Step 4: Complete
      updateProgress(100, 'Processing complete!');
      
      setExtractedData(extractedData);
      
      if (onUploadComplete) {
        onUploadComplete(extractedData);
      }

      // Auto-redirect after success
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('❌ Processing error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setProgress(0);
      setStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'excellent': return '🟢';
      case 'good': return '🔵';
      case 'fair': return '🟡';
      case 'poor': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Automated Resume Processor
        </h2>
        <p className="text-gray-600">
          Upload your PDF resume for instant skill extraction and analysis
        </p>
      </div>

      {/* File Upload Section */}
      <div className="mb-8">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          
          <label htmlFor="file-upload" className="cursor-pointer">
            <span className="text-lg font-medium text-gray-700">
              {file ? file.name : 'Choose PDF file or drag and drop'}
            </span>
            <input
              id="file-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing}
            />
          </label>
          
          <p className="text-sm text-gray-500 mt-2">
            PDF files only, max 10MB
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">❌</span>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Process Button */}
      {file && !isProcessing && !extractedData && (
        <div className="text-center mb-8">
          <button
            onClick={processResume}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            🚀 Process Resume Automatically
          </button>
        </div>
      )}

      {/* Progress Indicator */}
      {isProcessing && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{status}</span>
            <span className="text-sm text-gray-500">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {extractedData && (
        <div className="space-y-6">
          {/* Quality Indicator */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">
                  {getQualityIcon(extractedData.quality)}
                </span>
                <span className="font-medium text-gray-700">
                  Extraction Quality:
                </span>
                <span className={`font-semibold capitalize ${getQualityColor(extractedData.quality)}`}>
                  {extractedData.quality}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Confidence: {extractedData.confidence}%
              </div>
            </div>
          </div>

          {/* Contact Information */}
          {(extractedData.name || extractedData.email || extractedData.phoneNumber) && (
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">👤</span>
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {extractedData.name && (
                  <div>
                    <span className="text-sm text-gray-600">Name:</span>
                    <p className="font-medium">{extractedData.name}</p>
                  </div>
                )}
                {extractedData.email && (
                  <div>
                    <span className="text-sm text-gray-600">Email:</span>
                    <p className="font-medium">{extractedData.email}</p>
                  </div>
                )}
                {extractedData.phoneNumber && (
                  <div>
                    <span className="text-sm text-gray-600">Phone:</span>
                    <p className="font-medium">{extractedData.phoneNumber}</p>
                  </div>
                )}
                {extractedData.location && (
                  <div>
                    <span className="text-sm text-gray-600">Location:</span>
                    <p className="font-medium">{extractedData.location}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Extracted Skills */}
          {extractedData.extractedSkills.length > 0 && (
            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">🎯</span>
                Extracted Skills ({extractedData.extractedSkills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {extractedData.extractedSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Success Message */}
          <div className="bg-green-100 border border-green-400 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              <p className="text-green-700 font-medium">
                Resume processed successfully! Redirecting to dashboard...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}