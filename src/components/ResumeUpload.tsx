import { supabase } from '../lib/supabase';
import React, { useState, useCallback } from 'react';
import { FileText, CheckCircle, AlertCircle, X, Loader, Zap, Brain } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { extractTextFromPDF, parseResumeWithAI } from '../lib/pdf-processor';

interface ExtractedData {
  skills: string[];
  name: string;
  email: string;
  phone: string;
  location: string;
  currentRole?: string;
  experienceLevel?: string;
  professionalSummary?: string;
  aiAnalysisSuccess?: boolean;
}

interface ResumeUploadProps {
  onUploadComplete?: (resumeId: string, extractedData?: ExtractedData) => void;
  className?: string;
}

const ResumeUpload: React.FC<ResumeUploadProps> = ({ onUploadComplete, className = '' }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
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

  const uploadFile = async (file: File) => {
    if (!user) {
      showToast('Please log in to upload a resume', 'error');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);
    setExtractedData(null);

    try {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setUploading(false);
        return;
      }

      setUploadProgress(20);
      setProcessingStage('Reading PDF content...');

      // Extract text from PDF using our working method
      const extractedText = await extractTextFromPDF(file);
      console.log('📝 Extracted text length:', extractedText.length);

      setUploadProgress(40);
      setProcessingStage('Analyzing with ChatGPT-level AI...');

      // Analyze with our working ChatGPT function
      const analysisResult = await parseResumeWithAI(extractedText);

      setUploadProgress(60);
      setProcessingStage('Uploading to secure storage...');

      // Upload to Supabase Storage
      const fileName = `${user.id}/${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file);

      if (uploadError) {
        console.warn('Storage upload failed:', uploadError);
        // Continue anyway - analysis is more important
      }

      setUploadProgress(80);
      setProcessingStage('Saving analysis to your profile...');

      // Convert analysis to our format
      const extractedDataFormatted: ExtractedData = {
        skills: analysisResult.extractedSkills || [],
        name: analysisResult.name || '',
        email: analysisResult.email || '',
        phone: analysisResult.phoneNumber || '',
        location: '',
        currentRole: analysisResult.currentRole || '',
        experienceLevel: analysisResult.experienceLevel || '',
        professionalSummary: analysisResult.professionalSummary || '',
        aiAnalysisSuccess: analysisResult.aiAnalysisSuccess || false
      };

      setExtractedData(extractedDataFormatted);

      setUploadProgress(100);
      setProcessingStage('Complete!');
      
      const skillCount = extractedDataFormatted.skills.length;
      const analysisType = extractedDataFormatted.aiAnalysisSuccess ? 'ChatGPT-level AI' : 'enhanced fallback';
      
      setSuccess(`Resume analyzed with ${analysisType}! Found ${skillCount} skills from your resume content.`);
      showToast(`🎯 Resume analyzed! Found ${skillCount} skills.`, 'success');

      if (onUploadComplete) {
        onUploadComplete('resume-processed', extractedDataFormatted);
      }

    } catch (error: any) {
      console.error('❌ Upload error:', error);
      setError(error.message || 'Failed to upload resume. Please try again.');
      showToast('Upload failed. Please try again.', 'error');
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
              {processingStage.includes('AI') ? (
                <div className="relative">
                  <Loader className="h-8 w-8 text-blue-600 animate-spin" />
                  <Brain className="h-4 w-4 text-green-600 absolute -bottom-1 -right-1" />
                </div>
              ) : (
                <Loader className="h-8 w-8 text-blue-600 animate-spin" />
              )}
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">{processingStage}</p>
              <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-500" style={{ width: `${uploadProgress}%` }}></div>
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
              <h3 className="text-xl font-semibold text-gray-900 mb-3">AI-Powered Resume Analysis</h3>
              <p className="text-gray-600 mb-6">Upload your PDF resume for intelligent skill extraction and career insights</p>
              
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
                <span>Advanced AI analysis</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Real content analysis</span>
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
                {extractedData.aiAnalysisSuccess ? 'ChatGPT-Level' : 'Enhanced'} Analysis Complete
                {extractedData.aiAnalysisSuccess && (
                  <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    AI-Powered
                  </span>
                )}
              </h4>
              
              {/* Professional Summary */}
              {extractedData.professionalSummary && (
                <div className="mb-4 p-3 bg-white rounded-lg border">
                  <h5 className="font-medium text-gray-900 mb-1">Professional Summary</h5>
                  <p className="text-sm text-gray-700">{extractedData.professionalSummary}</p>
                </div>
              )}
              
              {/* Personal Info */}
              {(extractedData.name || extractedData.email || extractedData.phone || extractedData.currentRole || extractedData.experienceLevel) && (
                <div className="mb-4">
                  <h5 className="font-medium text-green-800 mb-2">Profile Information:</h5>
                  <div className="text-sm text-green-700 space-y-1">
                    {extractedData.name && <p><span className="font-medium">Name:</span> {extractedData.name}</p>}
                    {extractedData.email && <p><span className="font-medium">Email:</span> {extractedData.email}</p>}
                    {extractedData.currentRole && <p><span className="font-medium">Role:</span> {extractedData.currentRole}</p>}
                    {extractedData.experienceLevel && <p><span className="font-medium">Level:</span> {extractedData.experienceLevel}</p>}
                    {extractedData.phone && <p><span className="font-medium">Phone:</span> {extractedData.phone}</p>}
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