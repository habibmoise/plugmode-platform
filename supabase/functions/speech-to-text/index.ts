import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: 'No audio file provided' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // This would integrate with OpenAI Whisper or ElevenLabs speech-to-text
    // For now, we'll return a simulated transcription
    const mockTranscription = "How can I improve my resume for remote jobs?"

    // In production, you would:
    // 1. Convert the audio file to the required format
    // 2. Send it to OpenAI Whisper API or ElevenLabs
    // 3. Return the actual transcription

    const response = {
      transcription: mockTranscription,
      confidence: 0.95,
      processing_time: '1.2s'
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Speech-to-text error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process audio',
        message: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})