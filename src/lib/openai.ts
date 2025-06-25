import OpenAI from 'openai';

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
      dangerouslyAllowBrowser: true
    });
  }

  async generateCareerCoaching(
    message: string,
    userContext: {
      name?: string;
      location?: string;
      skills?: string[];
      experience_level?: string;
      career_goal?: string;
    },
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(userContext);
    
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.slice(-6), // Keep last 6 messages for context
      { role: 'user' as const, content: message }
    ];

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages,
        max_tokens: 500,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      return completion.choices[0]?.message?.content || 'I apologize, but I encountered an error. Please try again.';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate coaching response');
    }
  }

  private buildSystemPrompt(userContext: any): string {
    return `You are an expert career coach specializing in helping professionals from underserved regions (Africa, Southeast Asia, Latin America) find global remote opportunities.

User Context:
- Name: ${userContext.name || 'Professional'}
- Location: ${userContext.location || 'Not specified'}
- Skills: ${userContext.skills?.join(', ') || 'Not specified'}
- Experience Level: ${userContext.experience_level || 'Not specified'}
- Career Goal: ${userContext.career_goal || 'Not specified'}

Your role:
1. Provide actionable career advice tailored to remote work opportunities
2. Help with job search strategies, interview preparation, and skill development
3. Address challenges specific to working remotely from their region (time zones, cultural differences, etc.)
4. Be encouraging and supportive while being realistic about market conditions
5. Suggest specific skills to learn based on global market demand
6. Help with salary negotiation and understanding global compensation standards

Guidelines:
- Keep responses concise but comprehensive (under 400 words)
- Be culturally sensitive and aware of regional challenges
- Focus on practical, actionable advice
- Encourage continuous learning and skill development
- Highlight opportunities in the global remote job market
- Address any concerns about working with international teams

Always maintain a professional, encouraging, and supportive tone.`;
  }

  async generateJobMatchInsights(
    userProfile: any,
    jobData: any
  ): Promise<string> {
    const prompt = `Analyze this job match and provide insights:

User Profile:
- Skills: ${userProfile.skills?.join(', ') || 'Not specified'}
- Experience: ${userProfile.experience_level || 'Not specified'}
- Location: ${userProfile.location || 'Not specified'}

Job:
- Title: ${jobData.title}
- Company: ${jobData.company}
- Required Skills: ${jobData.skills_required?.join(', ') || 'Not specified'}
- Experience Level: ${jobData.experience_level || 'Not specified'}

Provide a brief analysis (under 200 words) covering:
1. Match strength and why
2. Skills gaps to address
3. Application strategy recommendations
4. Interview preparation tips`;

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.6
      });

      return completion.choices[0]?.message?.content || 'Unable to generate insights at this time.';
    } catch (error) {
      console.error('Error generating job insights:', error);
      return 'Unable to generate insights at this time.';
    }
  }
}

export const openaiService = new OpenAIService();