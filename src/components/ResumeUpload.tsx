import React, { useState, useCallback } from 'react';
import { FileText, CheckCircle, AlertCircle, X, Loader, Zap, Info, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface ExtractedData {
  skills: string[];
  technicalSkills?: string[];
  businessSkills?: string[];
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  industry?: string;
  experienceLevel?: string;
  confidence?: string;
  extractionMethod?: string;
}

interface Props {
  onUploadComplete?: (resumeId: string, extractedData?: ExtractedData) => void;
  className?: string;
}

export default function ResumeUpload({ onUploadComplete, className = '' }: Props) {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingStage, setProcessingStage] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(true);

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'Please upload a PDF file only.';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'File size must be less than 10MB.';
    }
    return null;
  };

  // Universal server-side analysis - works for ANY resume
  const analyzeWithServer = async (file: File, resumeId: string): Promise<ExtractedData> => {
    console.log('🤖 Starting server-side analysis for any resume type...');
    
    try {
      // Create FormData with the actual file
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('userId', user!.id);
      formData.append('resumeId', resumeId);

      console.log('📤 Sending file to server:', {
        fileName: file.name,
        fileSize: file.size,
        userId: user!.id
      });

      const response = await fetch('/api/resume/analyze-complete', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Server response error:', errorData);
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('📡 Server analysis complete:', result);

      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      const skillsFound = result.data.skills?.length || 0;
      console.log(`✅ Analysis successful: ${skillsFound} skills extracted from actual resume content`);
      
      return {
        skills: result.data.skills || [],
        technicalSkills: result.data.technicalSkills || [],
        businessSkills: result.data.businessSkills || [],
        name: result.data.name || '',
        email: result.data.email || '',
        phone: result.data.phone || '',
        location: result.data.location || '',
        industry: result.data.industry || '',
        experienceLevel: result.data.experienceLevel || '',
        confidence: result.data.confidence || '',
        extractionMethod: result.data.extractionMethod || 'direct'
      };

    } catch (error) {
      console.error('❌ Server analysis failed:', error);
      throw error;
    }
  };

  const uploadFile = async (file: File) => {
    if (!user) {
      setError('Please log in to upload your resume');
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
      setProcessingStage('Creating database record...');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);

      // Create resume record FIRST to get the resumeId
      const { data: resumeData, error: dbError } = await supabase
        .from('resumes')
        .insert([{
          user_id: user.id,
          file_name: file.name,
          file_size: file.size,
          file_url: publicUrl,
          processing_status: 'pending' // Will be updated by API
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      setUploadProgress(60);
      setProcessingStage('Analyzing resume content with AI...');

      // Process with universal server-side AI
      const aiResult = await analyzeWithServer(file, resumeData.id);
      setExtractedData(aiResult);

      setUploadProgress(100);
      setProcessingStage('Complete!');
      
      const skillsCount = aiResult.skills.length;
      setSuccess(
        skillsCount > 0 
          ? `Resume processed successfully! Found ${skillsCount} professional skills from your resume.`
          : 'Resume uploaded successfully! Note: No skills could be extracted - please ensure your PDF contains readable text.'
      );

      if (onUploadComplete) {
        onUploadComplete(resumeData.id, aiResult);
      }

    } catch (error: any) {
      console.error('❌ Upload error:', error);
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
      {/* Upload Guidelines */}
      {showGuidelines && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  📄 Resume Upload Guidelines
                </h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>For best results:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Use text-based PDFs (not scanned images)</li>
                    <li>Ensure your resume is clearly formatted</li>
                    <li>Include skills, experience, and contact information</li>
                    <li>File size should be under 10MB</li>
                  </ul>
                </div>
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Note:</strong> Some PDF formats may not read properly. If skills aren't extracted correctly, 
                      try converting your resume to a newer PDF format or ensure it's text-based rather than an image scan.
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowGuidelines(false)}
              className="text-blue-400 hover:text-blue-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Universal AI Resume Analysis</h3>
              <p className="text-gray-600 mb-6">Upload any PDF resume for intelligent skill extraction and career analysis</p>
              
              <input type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" id="resume-upload" disabled={uploading} />
              
              <label htmlFor="resume-upload" className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all cursor-pointer font-medium transform hover:scale-105">
                <FileText className="h-5 w-5" />
                <span>Choose PDF Resume</span>
              </label>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Any profession</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Maximum 10MB</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>AI-powered analysis</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Universal compatibility</span>
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
                AI Analysis Complete
              </h4>
              
              {/* Analysis Metadata */}
              <div className="flex items-center space-x-4 mb-4 text-sm">
                {extractedData.confidence && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    extractedData.confidence === 'high' 
                      ? 'bg-green-100 text-green-800'
                      : extractedData.confidence === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {extractedData.confidence} confidence
                  </span>
                )}
                {extractedData.extractionMethod && (
                  <span className="text-xs text-gray-500">
                    via {extractedData.extractionMethod} extraction
                  </span>
                )}
              </div>

              {/* Personal Info */}
              {(extractedData.name || extractedData.email || extractedData.phone || extractedData.location) && (
                <div className="mb-4">
                  <h5 className="font-medium text-green-800 mb-2">Extracted Information:</h5>
                  <div className="text-sm text-green-700 space-y-1">
                    {extractedData.name && <p>Name: {extractedData.name}</p>}
                    {extractedData.email && <p>Email: {extractedData.email}</p>}
                    {extractedData.phone && <p>Phone: {extractedData.phone}</p>}
                    {extractedData.location && <p>Location: {extractedData.location}</p>}
                  </div>
                </div>
              )}
              
              {/* All Skills */}
              {extractedData.skills && extractedData.skills.length > 0 ? (
                <div className="mb-4">
                  <h5 className="font-medium text-green-800 mb-3">Professional Skills ({extractedData.skills.length}):</h5>
                  <div className="flex flex-wrap gap-2">
                    {extractedData.skills.map((skill, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full border border-blue-200 font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded mb-4">
                  <p className="text-yellow-800 text-sm">
                    No skills could be extracted from this resume. This may indicate the PDF is image-based or the text formatting is not readable by our AI system.
                  </p>
                </div>
              )}

              {/* Categorized Skills */}
              {(extractedData.technicalSkills?.length || extractedData.businessSkills?.length) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {extractedData.technicalSkills && extractedData.technicalSkills.length > 0 && (
                    <div>
                      <h5 className="font-medium text-green-800 mb-2">Technical Skills ({extractedData.technicalSkills.length}):</h5>
                      <div className="flex flex-wrap gap-1">
                        {extractedData.technicalSkills.map((skill, index) => (
                          <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {extractedData.businessSkills && extractedData.businessSkills.length > 0 && (
                    <div>
                      <h5 className="font-medium text-green-800 mb-2">Business Skills ({extractedData.businessSkills.length}):</h5>
                      <div className="flex flex-wrap gap-1">
                        {extractedData.businessSkills.map((skill, index) => (
                          <span key={index} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Career Information */}
              {(extractedData.industry || extractedData.experienceLevel) && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-green-200">
                  {extractedData.industry && (
                    <div>
                      <h5 className="text-sm font-medium text-green-600">Industry</h5>
                      <p className="text-sm text-green-900">{extractedData.industry}</p>
                    </div>
                  )}
                  {extractedData.experienceLevel && (
                    <div>
                      <h5 className="text-sm font-medium text-green-600">Experience Level</h5>
                      <p className="text-sm text-green-900 capitalize">{extractedData.experienceLevel}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Quality Indicators */}
              {extractedData.extractionMethod === 'ocr' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <strong>Image-based PDF detected:</strong> Skills were extracted using OCR technology. 
                      For better accuracy, consider uploading a text-based PDF version.
                    </div>
                  </div>
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
}