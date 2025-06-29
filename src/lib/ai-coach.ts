// src/lib/ai-coach.ts
import { supabase } from './supabase';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface CoachingResponse {
  response: string;
  remainingUses: number;
  tier: string;
  success: boolean;
}

export const generateCareerCoaching = async (
  message: string,
  userId: string,
  conversationId?: string
): Promise<CoachingResponse> => {
  try {
    // Check user subscription and usage limits
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('subscription_tier, subscription_status')
      .eq('user_id', userId)
      .single();

    const tier = subscription?.subscription_tier || 'free';
    const status = subscription?.subscription_status || 'active';

    if (status !== 'active') {
      throw new Error('Subscription is not active. Please check your billing.');
    }

    // Check usage limits based on tier
    let monthlyLimit = 5; // Free tier default
    if (tier === 'professional') monthlyLimit = 50;
    if (tier === 'career_os') monthlyLimit = -1; // Unlimited

    if (monthlyLimit !== -1) {
      // Check current month usage
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const { data: usage } = await supabase
        .from('user_usage')
        .select('usage_count')
        .eq('user_id', userId)
        .eq('usage_type', 'ai_conversations')
        .gte('reset_date', startOfMonth.toISOString())
        .single();

      const currentUsage = usage?.usage_count || 0;
      const remaining = monthlyLimit - currentUsage;

      if (remaining <= 0) {
        return {
          response: `You've reached your monthly limit of ${monthlyLimit} AI conversations. Upgrade to Professional for 50 conversations/month or Career OS for unlimited conversations.`,
          remainingUses: 0,
          tier,
          success: false
        };
      }
    }

    // For demo purposes, provide contextual responses based on tier and message
    let response = '';
    
    if (message.toLowerCase().includes('resume') || message.toLowerCase().includes('cv')) {
      response = tier === 'career_os' 
        ? "I'd be happy to help with your resume! As a Career OS member, I can provide detailed analysis, suggest improvements, and even help you create multiple versions for different roles. Share your current resume or tell me about the role you're targeting."
        : tier === 'professional'
        ? "Great question about resumes! I can help you optimize your resume structure and content. For advanced features like multiple resume versions and A/B testing, consider upgrading to Career OS."
        : "I can provide basic resume tips! For detailed resume analysis and optimization, consider upgrading to Professional or Career OS for advanced features.";
    } else if (message.toLowerCase().includes('job') || message.toLowerCase().includes('career')) {
      response = tier === 'career_os'
        ? "Let's explore your career path! With Career OS, I can provide comprehensive career guidance, market insights, and personalized strategies. What specific aspect of your career would you like to focus on?"
        : tier === 'professional'
        ? "I'm here to help with your career development! I can provide job search strategies and career advice. What's your current situation and goal?"
        : "I can offer general career advice! For detailed career planning and market insights, Professional and Career OS tiers offer more comprehensive guidance.";
    } else if (message.toLowerCase().includes('salary') || message.toLowerCase().includes('negotiate')) {
      response = tier === 'career_os'
        ? "Salary negotiation is crucial! With your Career OS access, I can provide detailed negotiation strategies, market data insights, and role-specific advice. What's your current situation?"
        : "I can provide general salary negotiation tips. For detailed market insights and personalized strategies, Career OS offers comprehensive salary guidance.";
    } else {
      response = `Hello! I'm your AI Career Coach. ${
        tier === 'career_os' 
          ? 'With your Career OS subscription, I can provide unlimited, comprehensive career guidance. How can I help you today?' 
          : tier === 'professional'
          ? 'As a Professional member, I can offer detailed career advice. What would you like to discuss?'
          : 'I can provide basic career guidance. For unlimited conversations and advanced features, consider upgrading to Professional or Career OS.'
      }`;
    }

    // Store conversation in database
    await supabase.from('ai_conversations').insert({
      user_id: userId,
      conversation_id: conversationId || `coaching-${Date.now()}`,
      message: message,
      response: response,
      tier: tier
    });

    // Increment usage count for non-unlimited tiers
    if (monthlyLimit !== -1) {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      
      // Get existing usage
      const { data: existingUsage } = await supabase
        .from('user_usage')
        .select('usage_count')
        .eq('user_id', userId)
        .eq('usage_type', 'ai_conversations')
        .eq('reset_date', startOfMonth.toISOString())
        .single();

      if (existingUsage) {
        await supabase
          .from('user_usage')
          .update({ usage_count: existingUsage.usage_count + 1 })
          .eq('user_id', userId)
          .eq('usage_type', 'ai_conversations')
          .eq('reset_date', startOfMonth.toISOString());
      } else {
        await supabase
          .from('user_usage')
          .insert({
            user_id: userId,
            usage_type: 'ai_conversations',
            usage_count: 1,
            reset_date: startOfMonth.toISOString()
          });
      }
    }

    const remainingUses = monthlyLimit === -1 ? -1 : monthlyLimit - (usage?.usage_count || 0) - 1;

    return {
      response,
      remainingUses,
      tier,
      success: true
    };

  } catch (error) {
    console.error('Career coaching error:', error);
    return {
      response: 'I apologize, but I encountered an error. Please try again in a moment.',
      remainingUses: 0,
      tier: 'free',
      success: false
    };
  }
};