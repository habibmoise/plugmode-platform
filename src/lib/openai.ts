// This file now redirects to secure API routes
// All OpenAI calls go through server-side endpoints

export interface OpenAIResponse {
  response: string;
  remainingUses: number;
  tier: string;
  success: boolean;
}

// Secure API wrapper
export const callOpenAI = async (message: string, userId: string): Promise<OpenAIResponse> => {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, userId })
  });
  
  if (!response.ok) {
    throw new Error('AI service unavailable');
  }
  
  return response.json();
};

// Legacy OpenAI service class for backward compatibility
export class OpenAIService {
  constructor() {
    console.log('OpenAIService initialized with secure API routing');
  }
  
  async generateCareerCoaching(message: string, userId: string): Promise<OpenAIResponse> {
    return callOpenAI(message, userId);
  }
  
  async chat(message: string, userId: string): Promise<string> {
    const result = await callOpenAI(message, userId);
    return result.response;
  }
}

// Export singleton instance
export const openaiService = new OpenAIService();
export const openAIService = openaiService; // Alternative naming

// Default export for compatibility
export default openaiService;