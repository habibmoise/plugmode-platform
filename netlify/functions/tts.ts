// netlify/functions/tts.ts
export const handler = async (event: any, context: any) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const requestBody = JSON.parse(event.body || '{}');
    const { text, voiceId = '9BWtsMINqrJLrRacOk9x' } = requestBody;

    if (!text) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Text is required' }),
      };
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error('ElevenLabs API key not found');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Voice service not configured' }),
      };
    }

    console.log(`Converting text to speech with voice ${voiceId}: "${text.substring(0, 50)}..."`);
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API Error:', response.status, errorText);
      
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `ElevenLabs API error: ${response.status}`,
          details: errorText
        }),
      };
    }

    const audioBuffer = await response.arrayBuffer();
    
    // Return the audio data as base64
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'audio/mpeg',
      },
      body: base64Audio,
      isBase64Encoded: true,
    };
    
  } catch (error: any) {
    console.error('Text-to-speech failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Voice generation failed',
        details: error.message || 'Unknown error'
      }),
    };
  }
};