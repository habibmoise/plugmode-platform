export interface TranslationResult {
  translatedText: string;
  confidence: number;
  sourceLanguage?: string;
}

export class LingoService {
  private apiKey: string;
  private projectId: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_LINGO_API_KEY || '';
    this.projectId = import.meta.env.VITE_LINGO_PROJECT_ID || '';
  }

  async translateCoachingResponse(
    text: string, 
    targetLanguage: string, 
    userTier: string
  ): Promise<TranslationResult> {
    // Only available for Career OS subscribers
    if (userTier !== 'career_os') {
      return { 
        translatedText: text, 
        confidence: 0,
        sourceLanguage: 'en'
      };
    }

    if (!this.apiKey || !this.projectId) {
      console.warn('Lingo API credentials not configured');
      return { 
        translatedText: text, 
        confidence: 0,
        sourceLanguage: 'en'
      };
    }

    try {
      const response = await fetch('https://api.lingo.ai/v1/translate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          target_language: targetLanguage,
          source_language: 'en',
          context: 'career_coaching',
          quality: 'professional',
          project_id: this.projectId
        })
      });

      if (!response.ok) {
        throw new Error(`Lingo API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        translatedText: data.translated_text || text,
        confidence: data.confidence_score || 0,
        sourceLanguage: data.source_language || 'en'
      };
    } catch (error) {
      console.error('Translation error:', error);
      return { 
        translatedText: text, 
        confidence: 0,
        sourceLanguage: 'en'
      };
    }
  }

  getSupportedLanguages() {
    return {
      'africa': [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'fr', name: 'French', flag: '🇫🇷' },
        { code: 'sw', name: 'Swahili', flag: '🇰🇪' },
        { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
        { code: 'pt', name: 'Portuguese', flag: '🇵🇹' }
      ],
      'southeast-asia': [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
        { code: 'ms', name: 'Malay', flag: '🇲🇾' },
        { code: 'th', name: 'Thai', flag: '🇹🇭' },
        { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' }
      ],
      'latin-america': [
        { code: 'es', name: 'Spanish', flag: '🇪🇸' },
        { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
        { code: 'en', name: 'English', flag: '🇺🇸' }
      ]
    };
  }

  getRegionFromLocation(location: string): string {
    const locationLower = location.toLowerCase();
    
    if (locationLower.includes('nigeria') || locationLower.includes('kenya') || 
        locationLower.includes('ghana') || locationLower.includes('south africa') ||
        locationLower.includes('morocco') || locationLower.includes('egypt')) {
      return 'africa';
    }
    
    if (locationLower.includes('indonesia') || locationLower.includes('malaysia') ||
        locationLower.includes('thailand') || locationLower.includes('vietnam') ||
        locationLower.includes('philippines') || locationLower.includes('singapore')) {
      return 'southeast-asia';
    }
    
    if (locationLower.includes('brazil') || locationLower.includes('mexico') ||
        locationLower.includes('argentina') || locationLower.includes('colombia') ||
        locationLower.includes('chile') || locationLower.includes('peru')) {
      return 'latin-america';
    }
    
    return 'africa'; // Default fallback
  }
}

export const lingoService = new LingoService();