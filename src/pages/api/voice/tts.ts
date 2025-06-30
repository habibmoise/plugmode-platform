// src/pages/api/voice/tts.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, voiceId = '9BWtsMINqrJLrRacOk9x' } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('ElevenLabs API key not found');
    return res.status(500).json({ error: 'Voice service not configured' });
  }

  try {
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
      
      // Handle specific error cases
      if (response.status === 401) {
        return res.status(500).json({ error: 'Voice service authentication failed' });
      }
      if (response.status === 400) {
        return res.status(400).json({ error: 'Invalid voice request' });
      }
      if (response.status === 422) {
        return res.status(400).json({ error: 'Voice ID not found or invalid' });
      }
      
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    
    // Set proper headers for audio response
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Send the audio data
    res.status(200).send(Buffer.from(audioBuffer));
    
  } catch (error) {
    console.error('Text-to-speech failed:', error);
    res.status(500).json({ 
      error: 'Voice generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}