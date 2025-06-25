export class VoiceCoachService {
  private apiKey: string;
  private voiceId: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
    this.voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID || '';
  }

  async generateCoachingResponse(text: string, userTier: string): Promise<ArrayBuffer> {
    // Only available for Career OS subscribers
    if (userTier !== 'career_os') {
      throw new Error('Voice responses require Career OS subscription');
    }

    if (!this.apiKey || !this.voiceId) {
      throw new Error('ElevenLabs API key or voice ID not configured');
    }

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text: text.substring(0, 500), // Limit for cost control
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('Error generating voice response:', error);
      throw error;
    }
  }

  createAudioURL(audioBuffer: ArrayBuffer): string {
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    return URL.createObjectURL(blob);
  }

  async testVoiceConnection(): Promise<boolean> {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': this.apiKey
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const voiceCoachService = new VoiceCoachService();