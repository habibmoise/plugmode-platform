// src/components/ResumeUpload.tsx - FINAL WORKING VERSION
import React, { useState } from 'react';
import { FileText, CheckCircle, AlertCircle, X, Loader, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const ResumeUpload: React.FC = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingStage, setProcessingStage] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const text = await file.text();
      if (text && text.length > 100) {
        return text.replace(/\s+/g, ' ').trim();
      }
      
      // Fallback method
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
      
      return extractedText.replace(/\s+/g, ' ').trim();
    } catch (error) {
      console.error('PDF extraction error:', error);
      return `Resume file: ${file.name}. Unable to extract text automatically.`;
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
      // Validate file
      if (file.type !== 'application/pdf') {
        throw new Error('Please upload a PDF file only.');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB.');
      }

      setUploadProgress(20);
      setProcessingStage('Reading PDF content...');

      // Extract text
      const extractedText = await extractTextFromPDF(file);
      console.log('📝 Extracted text length:', extractedText.length);

      setUploadProgress(40);
      setProcessingStage('Analyzing with AI...');

      // Call Supabase function
      const { data, error: funcError } = await supabase.functions.invoke('resume-analyzer', {
        body: { 
          text: extractedText,
          fileName: file.name
        }
      });

      if (funcError) {
        throw new Error(`Analysis failed: ${funcError.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      setUploadProgress(80);
      setProcessingStage('Saving results...');

      const analysisResult = data.data;
      
      // Format for display
      const allSkills = [
        ...(analysisResult.skills?.technical || []),
        ...(analysisResult.skills?.business || []),
        ...(analysisResult.skills?.soft || []),
        ...(analysisResult.skills?.industry || [])
      ];

      const formattedData = {
        skills: allSkills,
        name: analysisResult.personalInfo?.name || '',
        email: analysisResult.personalInfo?.email || '',
        phone: analysisResult.personalInfo?.phone || '',
        currentRole: analysisResult.currentRole || '',
        experienceLevel: analysisResult.experienceLevel || '',
        professionalSummary: analysisResult.professionalSummary || '',
        analysisType: data.analysisType || 'ai-powered'
      };

      setExtractedData(formattedData);

      setUploadProgress(100);
      setProcessingStage('Complete!');
      setSuccess(`Resume analyzed successfully! Found ${allSkills.length} skills.`);

    } catch (error: any) {
      console.error('❌ Upload error:', error);
      setError(error.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
        setProcessingStage('');
      }, 3000);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  return (
    <div className="w-full">
      {/* Upload Area */}
      <div className="border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 border-gray-300 hover:border-blue-400 hover:bg-blue-50">
        {uploading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <Loader className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">{processingStage}</p>
              <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-500" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
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
              <p className="text-gray-600 mb-6">Upload your PDF resume for intelligent skill extraction</p>
              
              <input 
                type="file" 
                accept=".pdf" 
                onChange={handleFileSelect} 
                className="hidden" 
                id="resume-upload" 
                disabled={uploading} 
              />
              
              <label 
                htmlFor="resume-upload" 
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all cursor-pointer font-medium transform hover:scale-105"
              >
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

      {/* Results */}
      {extractedData && !uploading && (
        <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Analysis Complete
                <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  {extractedData.analysisType}
                </span>
              </h4>
              
              {/* Profile Info */}
              {(extractedData.name || extractedData.email || extractedData.currentRole) && (
                <div className="mb-4">
                  <h5 className="font-medium text-green-800 mb-2">Profile Information:</h5>
                  <div className="text-sm text-green-700 space-y-1">
                    {extractedData.name && <p><span className="font-medium">Name:</span> {extractedData.name}</p>}
                    {extractedData.email && <p><span className="font-medium">Email:</span> {extractedData.email}</p>}
                    {extractedData.currentRole && <p><span className="font-medium">Role:</span> {extractedData.currentRole}</p>}
                    {extractedData.experienceLevel && <p><span className="font-medium">Level:</span> {extractedData.experienceLevel}</p>}
                  </div>
                </div>
              )}
              
              {/* Skills */}
              {extractedData.skills.length > 0 && (
                <div>
                  <h5 className="font-medium text-green-800 mb-3">Skills Found ({extractedData.skills.length}):</h5>
                  <div className="flex flex-wrap gap-2">
                    {extractedData.skills.map((skill: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full border border-green-200 font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setExtractedData(null)} 
              className="text-green-400 hover:text-green-600 p-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Error */}
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

      {/* Success */}
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