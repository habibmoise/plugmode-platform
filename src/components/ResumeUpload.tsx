// components/ResumeUpload.tsx - CLEAN & BULLETPROOF
import React, { useState } from 'react'
import { Upload, CheckCircle, AlertCircle, X, Loader, Zap, Info } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
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

export default function ResumeUpload() {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
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
      setAnalysis(null)
    }
  }

  const handleUpload = async () => {
    if (!file || !user) return
    
    setLoading(true)
    setError('')
    setAnalysis(null)
    setProgress(0)

    try {
      // Step 1: Extract text from PDF
      setStage('📄 Extracting text from PDF...')
      setProgress(20)
      
      const extractedText = await extractTextFromPDF(file)
      console.log('📄 PDF extraction result:', extractedText)
      
      if (!extractedText.cleanedText || extractedText.cleanedText.length < 50) {
        throw new Error('Could not extract readable text from PDF. Please ensure the PDF contains selectable text.')
      }

      // Step 2: Send for analysis
      setStage('🤖 Analyzing resume with AI...')
      setProgress(60)
      
      const payload = { 
        text: extractedText.cleanedText, 
        fileName: file.name 
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Analysis failed')
      }

      // Step 3: Complete
      setStage('✅ Analysis complete!')
      setProgress(100)
      
      setAnalysis(data.data)
      console.log('✅ Analysis successful:', data.data)

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
  }

  const renderSkillCategory = (skills: string[], title: string, bgColor: string, textColor: string) => {
    if (!skills || skills.length === 0) return null
    
    return (
      <div className="mb-4">
        <h5 className="font-medium text-gray-700 mb-2">{title} ({skills.length})</h5>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, index) => (
            <span 
              key={index} 
              className={`px-2 py-1 text-xs rounded-full ${bgColor} ${textColor}`}
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Upload className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Resume Analysis</h2>
            <p className="text-gray-600">Upload your resume for AI-powered skill extraction</p>
          </div>
        </div>

        {/* Upload Area */}
        {!analysis && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
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
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {file ? file.name : 'Upload Your Resume'}
              </p>
              <p className="text-gray-500">
                Drop your PDF here or click to browse (Max 10MB)
              </p>
            </label>
          </div>
        )}

        {/* Upload Button */}
        {file && !analysis && (
          <button
            onClick={handleUpload}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mb-6"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Analyzing Resume...
              </span>
            ) : (
              'Analyze Resume'
            )}
          </button>
        )}

        {/* Progress Bar */}
        {loading && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Loader className="w-5 h-5 text-indigo-600 animate-spin" />
              <span className="text-sm font-medium text-gray-700">{stage}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Results Display */}
        {analysis && (
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Analysis Complete</h3>
              </div>
              <button
                onClick={resetUpload}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Personal Information */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Personal Information</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Name:</span> {analysis.personalInfo.name || 'Not provided'}</div>
                  <div><span className="font-medium">Email:</span> {analysis.personalInfo.email || 'Not provided'}</div>
                  <div><span className="font-medium">Phone:</span> {analysis.personalInfo.phone || 'Not provided'}</div>
                  <div><span className="font-medium">Location:</span> {analysis.personalInfo.location || 'Not provided'}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Professional Profile</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Role:</span> {analysis.currentRole}</div>
                  <div><span className="font-medium">Level:</span> {analysis.experienceLevel}</div>
                </div>
              </div>
            </div>

            {/* Professional Summary */}
            {analysis.professionalSummary && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Professional Summary</h4>
                <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                  {analysis.professionalSummary}
                </p>
              </div>
            )}

            {/* Skills */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Extracted Skills</h4>
              {renderSkillCategory(analysis.skills.technical, 'Technical Skills', 'bg-blue-100', 'text-blue-800')}
              {renderSkillCategory(analysis.skills.business, 'Business Skills', 'bg-green-100', 'text-green-800')}
              {renderSkillCategory(analysis.skills.soft, 'Soft Skills', 'bg-purple-100', 'text-purple-800')}
              {renderSkillCategory(analysis.skills.industry, 'Industry Skills', 'bg-orange-100', 'text-orange-800')}
            </div>

            {/* Upload Another Button */}
            <div className="mt-6 pt-4 border-t">
              <button
                onClick={resetUpload}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Upload Another Resume
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}