// components/ResumeUpload.tsx
import { useState } from 'react'

export default function ResumeUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null)
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setAnalysis(null)

    const text = await file.text()
    const payload = { text, fileName: file.name }

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Unknown error')
      setAnalysis(data.data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <input type="file" accept=".pdf,.txt,.docx" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={!file || loading}>
        {loading ? 'Analyzing…' : 'Upload Resume'}
      </button>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {analysis && (
        <pre style={{ textAlign: 'left', background: '#f5f5f5', padding: '1rem' }}>
          {JSON.stringify(analysis, null, 2)}
        </pre>
      )}
    </div>
  )
}
