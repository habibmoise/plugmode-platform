// pages/api/resume/analyze-complete.ts - COMPLETE API PROXY
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed. Use POST.',
      data: null 
    })
  }

  try {
    console.log('📡 API Route: Proxying request to Supabase Edge Function')
    console.log('📊 API Route: Request body keys:', Object.keys(req.body || {}))
    
    // Extract data from request
    const { text, fileName, userId } = req.body
    
    if (!text || !fileName) {
      console.warn('⚠️ API Route: Missing required fields')
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: text and fileName',
        data: null
      })
    }

    console.log('📝 API Route: Text length:', text.length)
    console.log('📄 API Route: File name:', fileName)
    console.log('👤 API Route: User ID:', userId || 'Not provided')

    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('resume-analyzer', {
      body: {
        text: text,
        fileName: fileName
      }
    })

    console.log('📡 API Route: Supabase function response received')
    console.log('✅ API Route: Success:', !error)
    
    if (error) {
      console.error('❌ API Route: Supabase function error:', error)
      return res.status(500).json({
        success: false,
        error: `Supabase function error: ${error.message}`,
        data: null
      })
    }

    if (!data) {
      console.error('❌ API Route: No data returned from Supabase function')
      return res.status(500).json({
        success: false,
        error: 'No data returned from analysis function',
        data: null
      })
    }

    console.log('📊 API Route: Response data type:', typeof data)
    console.log('📊 API Route: Response success:', data.success)
    console.log('📊 API Route: Analysis type:', data.analysisType)
    
    // If the Supabase function returned structured data, pass it through
    if (data.success !== undefined) {
      console.log('✅ API Route: Returning structured response from Supabase function')
      return res.status(200).json(data)
    }

    // If raw data, wrap it properly
    console.log('🔧 API Route: Wrapping raw data in success response')
    return res.status(200).json({
      success: true,
      data: data,
      analysisType: 'api-proxy',
      source: 'supabase-edge-function'
    })
    
  } catch (error: any) {
    console.error('💥 API Route: Unexpected error:', error)
    console.error('💥 API Route: Error stack:', error.stack)
    
    return res.status(500).json({
      success: false,
      error: `Server error: ${error.message || 'Unknown error occurred'}`,
      data: null,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}

// Export config for larger file uploads if needed
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '10mb',
  },
}