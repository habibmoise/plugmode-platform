import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface ResumeUploadProps {
  onUploadComplete?: (resumeId: string) => void;
  className?: string;
}

export function ResumeUpload({ onUploadComplete, className = '' }: ResumeUploadProps) {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingStage, setProcessingStage] = useState('');
  const [extractedPreview, setExtractedPreview] = useState('');

  const validateFile = (file: File): string | null => {
    // Check file type
    if (file.type !== 'application/pdf') {
      return 'Please upload a PDF file only.';
    }

    // Check file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      return 'File size must be less than 2MB.';
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    if (!user) return;

    setUploading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);
    setProcessingStage('Uploading file...');

    try {
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Create unique file path
      const fileExt = 'pdf';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      setUploadProgress(25);
      setProcessingStage('Uploading to storage...');

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setUploadProgress(50);
      setProcessingStage('Creating database record...');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);

      setUploadProgress(75);

      // Save resume record to database
      const { data: resumeData, error: dbError } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          processing_status: 'pending'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setUploadProgress(90);
      setProcessingStage('Starting text extraction...');

      // Log automation event
      await supabase.from('automation_logs').insert({
        user_id: user.id,
        workflow_type: 'resume_uploaded',
        status: 'pending',
        result_data: {
          resume_id: resumeData.id,
          file_name: file.name,
          file_size: file.size
        }
      });

      // Trigger resume processing webhook (placeholder for n8n integration)
      setProcessingStage('Processing resume...');
      try {
        await fetch('/api/webhooks/resume-uploaded', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resume_id: resumeData.id,
            user_id: user.id,
            file_url: publicUrl
          })
        });
      } catch (webhookError) {
        console.warn('Webhook call failed:', webhookError);
      }

      setUploadProgress(100);
      setProcessingStage('Complete!');
      setSuccess('Resume uploaded successfully! Processing will begin shortly.');
      
      // Simulate text extraction preview (in production, this would come from the backend)
      setTimeout(() => {
        setExtractedPreview('Software Engineer with 5+ years experience in React, Node.js...');
      }, 2000);
      
      if (onUploadComplete) {
        onUploadComplete(resumeData.id);
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload resume. Please try again.');
    } finally {
      setUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
        setProcessingStage('');
        setSuccess('');
      }, 3000);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFile(files[0]);
    }
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
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : uploading
            ? 'border-gray-300 bg-gray-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        {uploading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <Loader className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">{processingStage}</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1">{uploadProgress}% complete</p>
              
              {extractedPreview && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Eye className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Preview Extracted</span>
                  </div>
                  <p className="text-sm text-green-700">{extractedPreview}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="bg-blue-50 p-3 rounded-full">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Upload Your Resume
              </h3>
              <p className="text-gray-600 mb-4">
                Drag and drop your PDF resume here, or click to browse
              </p>
              
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
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <FileText className="h-5 w-5" />
                <span>Choose File</span>
              </label>
            </div>
            
            <div className="text-sm text-gray-500">
              <p>• PDF files only</p>
              <p>• Maximum size: 2MB</p>
              <p>• Text will be extracted automatically</p>
            </div>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-700 font-medium">Upload Failed</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-green-700 font-medium">Upload Successful</p>
            <p className="text-green-600 text-sm">{success}</p>
          </div>
          <button
            onClick={() => setSuccess('')}
            className="ml-auto text-green-400 hover:text-green-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}