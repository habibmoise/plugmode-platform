// Replace your entire src/components/ResumeUpload.tsx with this version
import React, { useState, useCallback } from 'react';
import { FileText, CheckCircle, AlertCircle, X, Loader, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { extractTextFromPDF, parseResumeWithAI } from '../lib/pdf-processor';

interface UploadState {
  uploading: boolean;
  analyzing: boolean;
  extractedData: any | null;
  error: string | null;
  success: boolean;
}

const ResumeUpload: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    analyzing: false,
    extractedData: null,
    error: null,
    success: false
  });

  const resetState = () => {
    setUploadState({
      uploading: false,
      analyzing: false,
      extractedData: null,
      error: null,
      success: false
    });
  };

  const uploadFile = useCallback(async (file: File) => {
    if (!user) {
      showToast('Please log in to upload a resume', 'error');
      return;
    }

    resetState();
    setUploadState(prev => ({ ...prev, uploading: true }));

    try {
      console.log('📄 Processing file:', file.name);
      
      // Extract text from PDF
      const extractedText = await extractTextFromPDF(file);
      console.log('📝 Extracted text length:', extractedText.length);

      setUploadState(prev => ({ 
        ...prev, 
        uploading: false, 
        analyzing: true 
      }));

      // Analyze with ChatGPT-level AI
      const analysisResult = await parseResumeWithAI(extractedText);
      
      setUploadState(prev => ({
        ...prev,
        analyzing: false,
        extractedData: analysisResult,
        success: true
      }));

      const skillCount = analysisResult.extractedSkills?.length || 0;
      showToast(`🎯 Resume analyzed! Found ${skillCount} skills.`, 'success');

    } catch (error) {
      console.error('❌ Upload error:', error);
      setUploadState(prev => ({
        ...prev,
        uploading: false,
        analyzing: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }));
      showToast('Upload failed. Please try again.', 'error');
    }
  }, [user, showToast]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showToast('Please upload a PDF file', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('File size must be less than 10MB', 'error');
      return;
    }

    uploadFile(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      uploadFile(file);
    } else {
      showToast('Please upload a PDF file', 'error');
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">AI Resume Analysis</h2>
      
      {/* Upload Area - Using only safe Tailwind classes */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          uploadState.uploading || uploadState.analyzing
            ? 'border-blue-300 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {uploadState.uploading || uploadState.analyzing ? (
          <div className="flex flex-col items-center space-y-4">
            <Loader className="h-12 w-12 text-blue-600 animate-spin" />
            <div className="text-lg font-medium text-blue-600">
              {uploadState.uploading ? 'Processing PDF...' : 'AI analyzing resume...'}
            </div>
            <div className="text-sm text-gray-600">
              {uploadState.analyzing ? 'Extracting skills and insights...' : 'Reading document content...'}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="h-12 w-12 text-gray-400 mx-auto" />
            <div className="space-y-2">
              <div className="text-xl font-semibold text-gray-900">
                Upload Your Resume for AI Analysis
              </div>
              <div className="text-gray-600">
                Get comprehensive insights about your career and skills
              </div>
              <div className="text-sm text-gray-500 mt-3">
                <div className="font-medium mb-1">📄 Supported formats:</div>
                <div>• PDF files only (max 10MB)</div>
                <div>• Text-based PDFs work best</div>
                <div>• Avoid image-only or scanned documents</div>
              </div>
              <div className="text-xs text-blue-600 mt-2 font-medium">
                ✨ Powered by advanced AI technology
              </div>
            </div>
            
            <input
              id="resume-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploadState.uploading || uploadState.analyzing}
            />
            
            <div className="mt-6">
              <label 
                htmlFor="resume-upload" 
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors font-medium"
              >
                <FileText className="h-5 w-5 mr-2" />
                Choose Resume File
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Error Display - Safe classes only */}
      {uploadState.error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-700">{uploadState.error}</span>
            <button
              onClick={resetState}
              className="ml-auto text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Success Display - Safe classes only */}
      {uploadState.success && uploadState.extractedData && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
            <span className="text-lg font-medium text-green-800">
              🎯 Resume Analysis Complete!
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Skills Found */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Skills Detected ({uploadState.extractedData.extractedSkills?.length || 0})
              </h4>
              <div className="flex flex-wrap gap-2">
                {(uploadState.extractedData.extractedSkills || []).slice(0, 10).map((skill: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
                {(uploadState.extractedData.extractedSkills?.length || 0) > 10 && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                    +{(uploadState.extractedData.extractedSkills?.length || 0) - 10} more
                  </span>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Profile Information</h4>
              <div className="space-y-2 text-sm">
                {uploadState.extractedData.name && (
                  <div>
                    <span className="font-medium">Name:</span> {uploadState.extractedData.name}
                  </div>
                )}
                {uploadState.extractedData.email && (
                  <div>
                    <span className="font-medium">Email:</span> {uploadState.extractedData.email}
                  </div>
                )}
                {uploadState.extractedData.currentRole && (
                  <div>
                    <span className="font-medium">Role:</span> {uploadState.extractedData.currentRole}
                  </div>
                )}
                {uploadState.extractedData.experienceLevel && (
                  <div>
                    <span className="font-medium">Level:</span> {uploadState.extractedData.experienceLevel}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Professional Summary */}
          {uploadState.extractedData.professionalSummary && (
            <div className="mt-4 p-3 bg-white rounded border">
              <h5 className="font-medium text-gray-900 mb-1">Professional Summary</h5>
              <p className="text-sm text-gray-700">{uploadState.extractedData.professionalSummary}</p>
            </div>
          )}

          <div className="mt-4 text-sm text-green-700">
            ✅ Analysis complete! {uploadState.extractedData.aiAnalysisSuccess ? 'AI-powered' : 'Fallback'} analysis used.
          </div>

          <button
            onClick={resetState}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Upload Another Resume
          </button>
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;