// src/components/ResumeUpload.tsx - EXACT WORKING VERSION FROM CONVERSATION 17
import React, { useState } from 'react';
import { FileText, CheckCircle, AlertCircle, X, Loader, Zap, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { extractTextFromPDF, ExtractedResumeData } from '../lib/pdf-processor';

const ResumeUpload: React.FC = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingStage, setProcessingStage] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [extractionQuality, setExtractionQuality] = useState<any>(null);
  const [resultsLocked, setResultsLocked] = useState(false);

  const uploadFile = async (file: File) => {
    if (!user) return;

    setUploading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);
    setExtractionQuality(null);

    try {
      // Validate file
      if (file.type !== 'application/pdf') {
        throw new Error('Please upload a PDF file only.');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB.');
      }

      setUploadProgress(10);
      setProcessingStage('Extracting text from PDF...');

      // Enhanced PDF text extraction
      console.log('🔍 Starting robust PDF text extraction...');
      const extractionResult: ExtractedResumeData = await extractTextFromPDF(file);
      
      console.log('📊 Extraction completed:', {
        method: extractionResult.extractionMethod,
        quality: extractionResult.textQuality,
        wordCount: extractionResult.extractionMetrics.wordCount,
        readablePercentage: extractionResult.extractionMetrics.readablePercentage
      });

      setExtractionQuality({
        method: extractionResult.extractionMethod,
        quality: extractionResult.textQuality,
        metrics: extractionResult.extractionMetrics
      });

      setUploadProgress(30);
      setProcessingStage('Preparing text for AI analysis...');

      // Use the best extracted text
      const textToAnalyze = extractionResult.cleanedText || extractionResult.rawText;
      
      if (!textToAnalyze || textToAnalyze.length < 50) {
        throw new Error('Could not extract readable text from PDF. Please ensure the PDF contains selectable text.');
      }

      console.log('📝 Sending to AI for analysis:', {
        textLength: textToAnalyze.length,
        firstChars: textToAnalyze.substring(0, 200)
      });

      setUploadProgress(50);
      setProcessingStage('Analyzing with AI...');

      // Call API route (which proxies to Supabase function)
      const response = await fetch('/api/resume/analyze-complete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          text: textToAnalyze,
          fileName: file.name,
          userId: user.id,
          extractionMetrics: extractionResult.extractionMetrics
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      setUploadProgress(80);
      setProcessingStage('Finalizing results...');

      const analysisResult = data.data;
      
      // ✅ SAFE SKILL EXTRACTION WITH NULL CHECKS
      const safeSkills = analysisResult.skills || {};
      const allSkills = [
        ...(safeSkills.technical || []),
        ...(safeSkills.business || []),
        ...(safeSkills.soft || []),
        ...(safeSkills.industry || [])
      ];

      // ✅ SAFE PERSONAL INFO EXTRACTION  
      const safePersonalInfo = analysisResult.personalInfo || {};

      const formattedData = {
        skills: allSkills,
        name: safePersonalInfo.name || '',
        email: safePersonalInfo.email || '',
        phone: safePersonalInfo.phone || '',
        location: safePersonalInfo.location || '',
        currentRole: analysisResult.currentRole || '',
        experienceLevel: analysisResult.experienceLevel || '',
        professionalSummary: analysisResult.professionalSummary || '',
        skillCategories: safeSkills || { technical: [], business: [], soft: [], industry: [] },
        keyStrengths: analysisResult.keyStrengths || [],
        analysisType: data.analysisType || 'enhanced-analysis',
        textQuality: data.textQuality || 0,
        fileName: file.name,
        uploadDate: new Date().toLocaleString()
      };

      // SET RESULTS AND LOCK THEM TO PREVENT CLEARING
      setExtractedData(formattedData);
      setResultsLocked(true);
      console.log('🔒 Results locked and set:', formattedData);

      setUploadProgress(100);
      setProcessingStage('Complete!');
      setSuccess(`Resume analyzed successfully! Found ${allSkills.length} skills using ${data.analysisType} analysis.`);

      // Clear upload state immediately but keep results
      setUploadProgress(0);
      setProcessingStage('');
      setUploading(false);

    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed. Please try again.');
      setUploadProgress(0);
      setProcessingStage('');
      setUploading(false);
    } finally {
      // Ensure uploading is always set to false
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const resetUpload = () => {
    console.log('🔄 Manually resetting results');
    setExtractedData(null);
    setResultsLocked(false);
    setExtractionQuality(null);
    setSuccess('');
    setError('');
    setUploadProgress(0);
    setProcessingStage('');
    setUploading(false);
  };

  const clearMessages = () => {
    setSuccess('');
    setError('');
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
              
              {/* Show extraction quality during processing */}
              {extractionQuality && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2 text-sm">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-800">
                      Extraction: {extractionQuality.method} | Quality: {extractionQuality.quality} | 
                      Words: {extractionQuality.metrics?.wordCount || 0}
                    </span>
                  </div>
                </div>
              )}
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
              <p className="text-gray-600 mb-4">Upload your PDF resume for intelligent skill extraction and analysis</p>
              
              {/* FILE FORMAT INSTRUCTIONS - COMPREHENSIVE FROM CONVERSATION 17 */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">File Requirements:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Format:</strong> PDF files only (max 10MB)</li>
                  <li>• <strong>Content:</strong> Text-based PDFs work best</li>
                  <li>• <strong>Quality:</strong> Ensure text is selectable (not scanned images)</li>
                  <li>• <strong>Language:</strong> English resumes for optimal results</li>
                </ul>
              </div>
              
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
                <span>{extractedData ? 'Upload Another Resume' : 'Choose PDF Resume'}</span>
              </label>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>OpenAI Analysis</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Skill Categorization</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Quality Validation</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Secure Processing</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PERSISTENT RESULTS DISPLAY - ONLY SHOW IF RESULTS ARE LOCKED */}
      {extractedData && resultsLocked && (
        <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-4">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                <h4 className="font-semibold text-green-900">Analysis Complete</h4>
                <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  {extractedData.analysisType}
                </span>
                {extractedData.textQuality && (
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    Quality: {extractedData.textQuality}%
                  </span>
                )}
              </div>

              {/* File Info */}
              <div className="mb-4 text-xs text-gray-500">
                <span>File: {extractedData.fileName} | Analyzed: {extractedData.uploadDate}</span>
              </div>
              
              {/* Professional Summary */}
              {extractedData.professionalSummary && extractedData.professionalSummary !== 'Brief 2-3 sentence summary' && (
                <div className="mb-4 p-3 bg-white rounded-lg border">
                  <h5 className="font-medium text-gray-900 mb-1">Professional Summary</h5>
                  <p className="text-sm text-gray-700">{extractedData.professionalSummary}</p>
                </div>
              )}
              
              {/* Profile Information */}
              <div className="mb-4">
                <h5 className="font-medium text-green-800 mb-2">Profile Information:</h5>
                <div className="text-sm text-green-700 space-y-1">
                  <p><span className="font-medium">Name:</span> {extractedData.name || 'Not extracted'}</p>
                  <p><span className="font-medium">Email:</span> {extractedData.email || 'Not found'}</p>
                  <p><span className="font-medium">Phone:</span> {extractedData.phone || 'Not found'}</p>
                  <p><span className="font-medium">Location:</span> {extractedData.location || 'Not found'}</p>
                  <p><span className="font-medium">Role:</span> {extractedData.currentRole || 'Professional'}</p>
                  <p><span className="font-medium">Level:</span> {extractedData.experienceLevel || 'Not determined'}</p>
                </div>
              </div>
              
              {/* Skills Display */}
              <div className="space-y-4">
                <h5 className="font-medium text-green-800 mb-3">
                  Skills Analysis ({extractedData.skills?.length || 0} total):
                </h5>
                
                {extractedData.skills && extractedData.skills.length > 0 ? (
                  <>
                    {/* Technical Skills - Safe Rendering */}
                    {extractedData.skillCategories?.technical && extractedData.skillCategories.technical.length > 0 && (
                      <div>
                        <h6 className="text-sm font-medium text-gray-700 mb-2">
                          Technical Skills ({extractedData.skillCategories.technical.length}):
                        </h6>
                        <div className="flex flex-wrap gap-2">
                          {extractedData.skillCategories.technical.map((skill: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full border border-blue-200">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Business Skills - Safe Rendering */}
                    {extractedData.skillCategories?.business && extractedData.skillCategories.business.length > 0 && (
                      <div>
                        <h6 className="text-sm font-medium text-gray-700 mb-2">
                          Business Skills ({extractedData.skillCategories.business.length}):
                        </h6>
                        <div className="flex flex-wrap gap-2">
                          {extractedData.skillCategories.business.map((skill: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full border border-green-200">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Soft Skills - Safe Rendering */}
                    {extractedData.skillCategories?.soft && extractedData.skillCategories.soft.length > 0 && (
                      <div>
                        <h6 className="text-sm font-medium text-gray-700 mb-2">
                          Soft Skills ({extractedData.skillCategories.soft.length}):
                        </h6>
                        <div className="flex flex-wrap gap-2">
                          {extractedData.skillCategories.soft.map((skill: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full border border-purple-200">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Industry Skills - Safe Rendering */}
                    {extractedData.skillCategories?.industry && extractedData.skillCategories.industry.length > 0 && (
                      <div>
                        <h6 className="text-sm font-medium text-gray-700 mb-2">
                          Industry Skills ({extractedData.skillCategories.industry.length}):
                        </h6>
                        <div className="flex flex-wrap gap-2">
                          {extractedData.skillCategories.industry.map((skill: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full border border-orange-200">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                      No skills were extracted from this resume. This might indicate:
                    </p>
                    <ul className="text-yellow-700 text-xs mt-2 list-disc list-inside">
                      <li>PDF contains mostly images or non-selectable text</li>
                      <li>Resume format is not standard</li>
                      <li>Text extraction quality was poor</li>
                    </ul>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="mt-6 pt-4 border-t border-green-200 flex space-x-3">
                  <button
                    onClick={resetUpload}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Upload Another Resume
                  </button>
                  <button
                    onClick={clearMessages}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                  >
                    Clear Messages
                  </button>
                </div>
              </div>
            </div>
            
            <button 
              onClick={resetUpload} 
              className="text-green-400 hover:text-green-600 p-2"
              title="Clear results"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
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

      {/* Success Display */}
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