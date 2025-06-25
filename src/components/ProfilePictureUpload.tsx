import React, { useState, useCallback } from 'react';
import { Upload, Image, CheckCircle, AlertCircle, X, Loader, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';

interface ProfilePictureUploadProps {
  onUploadComplete?: (avatarUrl: string) => void;
  currentAvatarUrl?: string | null;
  className?: string;
}

export function ProfilePictureUpload({ onUploadComplete, currentAvatarUrl, className = '' }: ProfilePictureUploadProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      return 'Please upload a JPG or PNG image.';
    }

    // Check file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      return 'File size must be less than 2MB.';
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    if (!user) {
      showToast({ type: 'error', title: 'Authentication Required', message: 'Please log in to upload a profile picture.' });
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgress(0);
    setPreviewUrl(null);

    try {
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setUploading(false);
        return;
      }

      // Generate preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Create unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      setUploadProgress(25);

      // Delete existing avatar if it exists
      if (currentAvatarUrl) {
        try {
          const oldFileName = currentAvatarUrl.split('/').pop();
          if (oldFileName) {
            await supabase.storage
              .from('avatars')
              .remove([`${user.id}/${oldFileName}`]);
          }
        } catch (deleteError) {
          console.warn('Could not delete old avatar:', deleteError);
        }
      }

      setUploadProgress(50);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      setUploadProgress(75);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update user's avatar_url in the database
      const { error: dbError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (dbError) throw dbError;

      setUploadProgress(100);
      showToast({
        type: 'success',
        title: 'Profile Picture Updated',
        message: 'Your profile picture has been successfully uploaded.'
      });

      if (onUploadComplete) {
        onUploadComplete(publicUrl);
      }

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload profile picture. Please try again.');
      showToast({
        type: 'error',
        title: 'Upload Failed',
        message: err.message || 'Failed to upload profile picture.'
      });
    } finally {
      setUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
        setPreviewUrl(null);
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
  }, [user, showToast, onUploadComplete]);

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

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const displayAvatar = previewUrl || currentAvatarUrl;

  return (
    <div className={`w-full ${className}`}>
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
              <p className="text-lg font-medium text-gray-900">Uploading...</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1">{uploadProgress}% complete</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center mb-4">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Profile Preview"
                  className="w-24 h-24 rounded-full object-cover border-4 border-blue-200 shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-4xl font-bold border-4 border-blue-200 shadow-md">
                  {getInitials(user?.user_metadata?.name || user?.email)}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Upload Profile Picture
              </h3>
              <p className="text-gray-600 mb-4">
                Drag and drop your image here, or click to browse
              </p>

              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileSelect}
                className="hidden"
                id="profile-picture-upload"
                disabled={uploading}
              />

              <label
                htmlFor="profile-picture-upload"
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Image className="h-5 w-5" />
                <span>Choose Image</span>
              </label>
            </div>

            <div className="text-sm text-gray-500">
              <p>• JPG or PNG files only</p>
              <p>• Maximum size: 2MB</p>
              <p>• Image will be resized and optimized</p>
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}