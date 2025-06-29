// ========================================
// FINAL REPLACEMENT FOR src/components/ResumeUpload.tsx
// Uses Supabase Edge Functions for secure OpenAI processing
// ========================================

import React, { useState, useCallback } from 'react';
import { FileText, CheckCircle, AlertCircle, X, Loader, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface ExtractedData {
  skills: string[];
  name: string;
  email: string;
  phone: string;
  location: string;
}

interface ResumeUploadProps {
  onUploadComplete?: (resumeId: string, extractedData?: ExtractedData) => void;
  className?: string;
}

const ResumeUpload: React.FC<ResumeUploadProps> = ({ onUploadComplete, className = '' }) => {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingStage, setProcessingStage] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'Please upload a PDF file only.';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'File size must be less than 10MB.';
    }
    return null;
  };

  // Extract text from PDF
  const extractTextFromPDF = async (file: File): Promise<string> => {
    console.log('📄 Extracting text from PDF:', file.name);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      let extractedText = '';
      for (let i = 0; i < uint8Array.length; i++) {
        const byte = uint8Array[i];
        if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13) {
          extractedText += String.fromCharCode(byte);
        } else if (byte === 9) {
          extractedText += ' ';
        }
      }
      
      extractedText = extractedText
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s@.-]/g, ' ')
        .trim();
      
      if (extractedText.length > 200) {
        console.log('✅ Text extracted successfully, length:', extractedText.length);
        console.log('📝 Sample text:', extractedText.substring(0, 200) + '...');
        return extractedText;
      }
      
      // Fallback to FileReader
      console.log('⚠️ Trying FileReader fallback...');
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          if (result && result.length > 100) {
            console.log('✅ FileReader extraction successful');
            resolve(result);
          } else {
            console.log('❌ Could not extract meaningful text');
            resolve('Could not extract text from this PDF file. The file may be image-based or encrypted.');
          }
        };
        reader.onerror = () => {
          console.log('❌ FileReader failed');
          resolve('Error reading PDF file.');
        };
        reader.readAsText(file);
      });
      
    } catch (error) {
      console.error('❌ PDF extraction error:', error);
      return 'Error processing PDF file.';
    }
  };

  // Analyze with Supabase Edge Function
  const analyzeWithSupabase = async (text: string): Promise<ExtractedData> => {
    console.log('🤖 Analyzing with Supabase Edge Function...');
    console.log('📝 Text length:', text.length);
    console.log('📝 Sample text:', text.substring(0, 300) + '...');
    
    if (text.startsWith('Error:') || text.startsWith('Could not')) {
      throw new Error('Cannot analyze - PDF text extraction failed');
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('resume-analyzer', {
        body: { text }
      });

      console.log('📡 Supabase function response:', { data, error });

      if (error) {
        console.error('❌ Supabase function error:', error);
        throw new Error(`AI analysis failed: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from AI analysis');
      }

      if (!data.success) {
        throw new Error(data.error || 'AI analysis failed');
      }

      console.log('✅ Supabase analysis complete:', data.data.skills?.length || 0, 'skills found');
      console.log('🎯 Skills found:', data.data.skills);
      
      return {
        skills: data.data.skills || [],
        name: data.data.name || '',
        email: data.data.email || '',
        phone: data.data.phone || '',
        location: data.data.location || ''
      };

    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw error;
    }
  };

  const uploadFile = async (file: File) => {
    if (!user) return;

    setUploading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);
    setExtractedData(null);

    try {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setUploadProgress(20);
      setProcessingStage('Uploading to secure storage...');

      // Upload to Supabase Storage
      const fileName = `${user.id}/${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setUploadProgress(40);
      setProcessingStage('Extracting text from PDF...');

      // Extract text from PDF
      const extractedText = await extractTextFromPDF(file);

      setUploadProgress(60);
      setProcessingStage('Analyzing with secure AI...');

      // Analyze with Supabase Edge Function
      const aiResult = await analyzeWithSupabase(extractedText);
      setExtractedData(aiResult);

      setUploadProgress(80);
      setProcessingStage('Saving to database...');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);

      // Save to database
      const { data: resumeData, error: dbError } = await supabase
        .from('resumes')
        .insert([{
          user_id: user.id,
          file_name: file.name,
          file_size: file.size,
          file_url: publicUrl,
          processing_status: 'completed'
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      setUploadProgress(95);
      setProcessingStage('Updating your profile...');

      // Update user profile
      if (aiResult.skills.length > 0) {
        const profileUpdates: any = {
          skills: aiResult.skills,
          updated_at: new Date().toISOString()
        };

        if (aiResult.name) {
          profileUpdates.display_name = aiResult.name;
        }

        await supabase
          .from('user_profiles')
          .update(profileUpdates)
          .eq('user_id', user.id);
      }

      setUploadProgress(100);
      setProcessingStage('Complete!');
      setSuccess(`Resume processed successfully! Found ${aiResult.skills.length} skills from your actual resume content.`);

      if (onUploadComplete) {
        onUploadComplete(resumeData.id, aiResult);
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload resume. Please try again.');
    } finally {
      setUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
        setProcessingStage('');
      }, 3000);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) uploadFile(files[0]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) uploadFile(files[0]);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
          isDragging ? 'border-blue-500 bg-blue-50' : uploading ? 'border-gray-300 bg-gray-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        {uploading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <Loader className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">{processingStage}</p>
              <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                <div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">{uploadProgress}% complete</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full">
                <Zap className="h-8 w-8 text-white" />
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure AI Resume Analysis</h3>
              <p className="text-gray-600 mb-6">Upload your PDF resume for intelligent skill extraction via secure server-side processing</p>
              
              <input type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" id="resume-upload" disabled={uploading} />
              
              <label htmlFor="resume-upload" className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all cursor-pointer font-medium transform hover:scale-105">
                <FileText className="h-5 w-5" />
                <span>Choose PDF Resume</span>
              </label>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>PDF files only</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Maximum 10MB</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Secure server-side AI</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Real resume analysis</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Preview */}
      {extractedData && !uploading && (
        <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Secure AI Analysis Complete
              </h4>
              
              {/* Personal Info */}
              {(extractedData.name || extractedData.email || extractedData.phone || extractedData.location) && (
                <div className="mb-4">
                  <h5 className="font-medium text-green-800 mb-2">Personal Information:</h5>
                  <div className="text-sm text-green-700 space-y-1">
                    {extractedData.name && <p>Name: {extractedData.name}</p>}
                    {extractedData.email && <p>Email: {extractedData.email}</p>}
                    {extractedData.phone && <p>Phone: {extractedData.phone}</p>}
                    {extractedData.location && <p>Location: {extractedData.location}</p>}
                  </div>
                </div>
              )}
              
              {/* Skills */}
              {extractedData.skills.length > 0 ? (
                <div>
                  <h5 className="font-medium text-green-800 mb-3">Skills Extracted from Resume ({extractedData.skills.length}):</h5>
                  <div className="flex flex-wrap gap-2">
                    {extractedData.skills.map((skill, index) => (
                      <span key={index} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full border border-green-200 font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-yellow-800 text-sm">
                    No skills found. The PDF may be image-based or text extraction failed.
                  </p>
                </div>
              )}
            </div>
            
            <button onClick={() => setExtractedData(null)} className="text-green-400 hover:text-green-600 p-2">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-700 font-medium">Upload Failed</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-green-700 font-medium">Success!</p>
            <p className="text-green-600 text-sm">{success}</p>
          </div>
          <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;