// src/components/ResumeUpload.tsx - COMPLETE SOLUTION
import React, { useState } from 'react'
import { Upload, CheckCircle, AlertCircle, X, Loader, Zap, Info, FileText, User, Mail, Phone, MapPin } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { extractTextFromPDF } from '../lib/pdf-processor'

interface AnalysisResult {
  personalInfo: {
    name: string
    email: string  
    phone: string
    location: string
  }
  currentRole: string
  experienceLevel: string
  professionalSummary: string
  skills: {
    technical: string[]
    business: string[]
    soft: string[]
    industry: string[]
  }
}

interface UploadResponse {
  success: boolean
  data: AnalysisResult
  analysisType: string
  textQuality: number
  fallbackReason?: string
  error?: string
}

export default function ResumeUpload() {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('')
  const [analysisType, setAnalysisType] = useState('')
  const [textQuality, setTextQuality] = useState(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a PDF file only')
        return
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      
      setFile(selectedFile)
      setError('')
      setSuccess('')
      setAnalysis(null)
      setProgress(0)
      setStage('')
    }
  }

  const handleUpload = async () => {
    if (!file || !user) {
      setError('Please select a file and ensure you are logged in')
      return
    }
    
    setLoading(true)
    setError('')
    setSuccess('')
    setAnalysis(null)
    setProgress(0)

    try {
      // Step 1: Extract text from PDF
      setStage('📄 Extracting text from PDF...')
      setProgress(25)
      
      console.log('🔍 Starting PDF text extraction for:', file.name)
      const extractedText = await extractTextFromPDF(file)
      
      console.log('📊 PDF extraction result:', {
        method: extractedText.extractionMethod,
        quality: extractedText.textQuality,
        textLength: extractedText.cleanedText.length,
        wordCount: extractedText.extractionMetrics.wordCount
      })
      
      if (!extractedText.cleanedText || extractedText.cleanedText.length < 50) {
        throw new Error('Could not extract sufficient text from PDF. Please ensure the PDF contains readable text content.')
      }

      // Step 2: Upload file to storage
      setStage('☁️ Uploading file to secure storage...')
      setProgress(40)
      
      const fileName = `${user.id}-${Date.now()}-${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file)

      if (uploadError) {
        console.warn('⚠️ File upload failed, continuing with analysis:', uploadError)
        // Continue anyway - file storage is not critical for analysis
      } else {
        console.log('✅ File uploaded to storage:', uploadData.path)
      }

      // Step 3: Analyze resume with AI
      setStage('🤖 Analyzing resume with AI...')
      setProgress(60)
      
      const analysisPayload = {
        text: extractedText.cleanedText,
        fileName: file.name,
        userId: user.id,
        extractionMetrics: extractedText.extractionMetrics
      }

      console.log('📤 Sending analysis request:', {
        textLength: analysisPayload.text.length,
        fileName: analysisPayload.fileName,
        userId: analysisPayload.userId
      })

      const response = await fetch('/api/resume/analyze-complete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}` // Add auth header
        },
        body: JSON.stringify(analysisPayload)
      })

      console.log('📡 API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API response error:', response.status, errorText)
        throw new Error(`Server error: ${response.status}`)
      }

      const analysisData: UploadResponse = await response.json()
      
      console.log('📊 Analysis response:', {
        success: analysisData.success,
        analysisType: analysisData.analysisType,
        textQuality: analysisData.textQuality,
        hasData: !!analysisData.data
      })

      if (!analysisData.success) {
        throw new Error(analysisData.error || 'Analysis failed')
      }

      if (!analysisData.data) {
        throw new Error('No analysis data returned')
      }

      // Step 4: Save skills to user profile
      setStage('💾 Saving skills to your profile...')
      setProgress(80)
      
      const skillsData = analysisData.data
      const allSkills = [
        ...(skillsData.skills?.technical || []),
        ...(skillsData.skills?.business || []),
        ...(skillsData.skills?.soft || []),
        ...(skillsData.skills?.industry || [])
      ]

      console.log('💾 Saving skills to profile:', {
        totalSkills: allSkills.length,
        technical: skillsData.skills?.technical?.length || 0,
        business: skillsData.skills?.business?.length || 0,
        soft: skillsData.skills?.soft?.length || 0,
        industry: skillsData.skills?.industry?.length || 0
      })

      // Update user profile with extracted data
      const { error: profileError } = await supabase
        .from('users')
        .update({ 
          skills: allSkills,
          professional_summary: skillsData.professionalSummary,
          current_role: skillsData.currentRole,
          experience_level: skillsData.experienceLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (profileError) {
        console.warn('⚠️ Profile update failed, continuing anyway:', profileError)
        // Don't fail the entire process for profile update issues
      } else {
        console.log('✅ Profile updated successfully')
      }

      // Step 5: Complete
      setStage('✅ Analysis complete!')
      setProgress(100)
      
      setAnalysis(analysisData.data)
      setAnalysisType(analysisData.analysisType)
      setTextQuality(analysisData.textQuality)
      
      const totalSkills = allSkills.length
      setSuccess(`Resume analyzed successfully! Found ${totalSkills} skills using ${analysisData.analysisType} analysis.`)
      
      console.log('🎉 Upload process completed successfully')

    } catch (err: any) {
      console.error('❌ Upload error:', err)
      setError(err.message || 'Upload failed. Please try again.')
    } finally {
      setLoading(false)
      setProgress(0)
      setStage('')
    }
  }

  const resetUpload = () => {
    setFile(null)
    setAnalysis(null)
    setError('')
    setSuccess('')
    setProgress(0)
    setStage('')
    setAnalysisType('')
    setTextQuality(0)
  }

  const renderSkillCategory = (skills: string[], title: string, bgColor: string, textColor: string, icon: React.ReactNode) => {
    if (!skills || skills.length === 0) return null
    
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h5 className="font-medium text-gray-700">{title}</h5>
          <span className="text-sm text-gray-500">({skills.length})</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, index) => (
            <span 
              key={index} 
              className={`px-3 py-1 text-sm rounded-full border ${bgColor} ${textColor}`}
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    )
  }

  const getAnalysisTypeDisplay = (type: string) => {
    const types = {
      'openai-powered': { label: 'AI-Powered', color: 'bg-green-100 text-green-800', icon: '🤖' },
      'enhanced-fallback': { label: 'Enhanced', color: 'bg-blue-100 text-blue-800', icon: '⚡' },
      'minimal-safe': { label: 'Basic', color: 'bg-yellow-100 text-yellow-800', icon: '📄' }
    }
    return types[type] || { label: 'Analysis', color: 'bg-gray-100 text-gray-800', icon: '📊' }
  }

  const getQualityDisplay = (quality: number) => {
    if (quality >= 80) return { label: 'Excellent', color: 'text-green-600' }
    if (quality >= 60) return { label: 'Good', color: 'text-blue-600' }
    if (quality >= 40) return { label: 'Fair', color: 'text-yellow-600' }
    return { label: 'Basic', color: 'text-gray-600' }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Resume Analysis</h2>
            <p className="text-gray-600">Upload your resume for comprehensive skill extraction and analysis</p>
          </div>
        </div>

        {/* Upload Area */}
        {!analysis && (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center mb-8 hover:border-indigo-400 transition-colors">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="resume-upload"
              disabled={loading}
            />
            <label 
              htmlFor="resume-upload" 
              className={`cursor-pointer ${loading ? 'cursor-not-allowed' : ''}`}
            >
              <div className="flex flex-col items-center">
                <Upload className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {file ? file.name : 'Upload Your Resume'}
                </h3>
                <p className="text-gray-500 mb-4">
                  Drop your PDF here or click to browse (Maximum 10MB)
                </p>
                <div className="text-sm text-gray-400">
                  Supports: PDF files with selectable text
                </div>
              </div>
            </label>
          </div>
        )}

        {/* Upload Button */}
        {file && !analysis && (
          <div className="text-center mb-8">
            <button
              onClick={handleUpload}
              disabled={loading}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-8 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 font-semibold text-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <Loader className="w-5 h-5 animate-spin" />
                  Analyzing Resume...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-3">
                  <Zap className="w-5 h-5" />
                  Start AI Analysis
                </span>
              )}
            </button>
          </div>
        )}

        {/* Progress Bar */}
        {loading && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <Loader className="w-6 h-6 text-indigo-600 animate-spin" />
              <span className="font-medium text-gray-700">{stage}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-indigo-600 to-purple-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{progress}% Complete</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <span className="text-green-800 font-medium">{success}</span>
                {analysisType && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-1 rounded-full ${getAnalysisTypeDisplay(analysisType).color}`}>
                      {getAnalysisTypeDisplay(analysisType).icon} {getAnalysisTypeDisplay(analysisType).label}
                    </span>
                    {textQuality > 0 && (
                      <span className={`text-xs font-medium ${getQualityDisplay(textQuality).color}`}>
                        Quality: {getQualityDisplay(textQuality).label} ({textQuality}%)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <span className="text-red-800 font-medium">Analysis Failed</span>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {analysis && (
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Analysis Complete</h3>
                  <p className="text-gray-600">Comprehensive resume analysis results</p>
                </div>
              </div>
              <button
                onClick={resetUpload}
                className="text-gray-500 hover:text-gray-700 p-2 hover:bg-white rounded-lg transition-colors"
                title="Upload another resume"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Personal Information */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-semibold text-gray-900">Personal Information</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      <span className="font-medium">Name:</span> {analysis.personalInfo.name || 'Not provided'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      <span className="font-medium">Email:</span> {analysis.personalInfo.email || 'Not provided'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      <span className="font-medium">Phone:</span> {analysis.personalInfo.phone || 'Not provided'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      <span className="font-medium">Location:</span> {analysis.personalInfo.location || 'Not provided'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-semibold text-gray-900">Professional Profile</h4>
                </div>
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="font-medium">Current Role:</span> {analysis.currentRole}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Experience Level:</span> {analysis.experienceLevel}
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Summary */}
            {analysis.professionalSummary && (
              <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-semibold text-gray-900">Professional Summary</h4>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {analysis.professionalSummary}
                </p>
              </div>
            )}

            {/* Skills Categories */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Info className="w-5 h-5 text-indigo-600" />
                <h4 className="font-semibold text-gray-900">Extracted Skills</h4>
                <span className="text-sm text-gray-500">
                  ({Object.values(analysis.skills).flat().length} total)
                </span>
              </div>
              
              <div className="space-y-6">
                {renderSkillCategory(
                  analysis.skills.technical, 
                  'Technical Skills', 
                  'bg-blue-100 border-blue-200', 
                  'text-blue-800',
                  <Zap className="w-4 h-4 text-blue-600" />
                )}
                
                {renderSkillCategory(
                  analysis.skills.business, 
                  'Business Skills', 
                  'bg-green-100 border-green-200', 
                  'text-green-800',
                  <FileText className="w-4 h-4 text-green-600" />
                )}
                
                {renderSkillCategory(
                  analysis.skills.soft, 
                  'Soft Skills', 
                  'bg-purple-100 border-purple-200', 
                  'text-purple-800',
                  <User className="w-4 h-4 text-purple-600" />
                )}
                
                {renderSkillCategory(
                  analysis.skills.industry, 
                  'Industry Skills', 
                  'bg-orange-100 border-orange-200', 
                  'text-orange-800',
                  <Info className="w-4 h-4 text-orange-600" />
                )}
              </div>

              {/* No Skills Found Message */}
              {Object.values(analysis.skills).flat().length === 0 && (
                <div className="text-center py-12">
                  <Info className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h5 className="text-lg font-medium text-gray-600 mb-2">No Skills Extracted</h5>
                  <p className="text-gray-500 mb-4">
                    This might indicate the PDF contains mostly images or non-selectable text.
                  </p>
                  <div className="text-sm text-gray-400">
                    <p>Try uploading a different PDF format or ensure the document contains selectable text.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Upload Another Resume Button */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <button
                onClick={resetUpload}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-8 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 font-semibold"
              >
                Upload Another Resume
              </button>
            </div>
          </div>
        )}

        {/* Upload Instructions (Always Visible) */}
        {!loading && (
          <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-4">📋 Upload Guidelines</h4>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600">
              <div>
                <h5 className="font-medium text-gray-800 mb-2">✅ Supported Formats:</h5>
                <ul className="space-y-1">
                  <li>• PDF files only (maximum 10MB)</li>
                  <li>• Text-based PDFs work best</li>
                  <li>• Ensure text is selectable (not scanned images)</li>
                  <li>• English language resumes for optimal results</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-gray-800 mb-2">🎯 What We Extract:</h5>
                <ul className="space-y-1">
                  <li>• Personal contact information</li>
                  <li>• Technical and business skills</li>
                  <li>• Professional experience and role</li>
                  <li>• Education and qualifications</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Pro Tip:</strong> For best results, ensure your resume has clear section headers 
                like "Experience", "Skills", "Education", and uses standard formatting.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}