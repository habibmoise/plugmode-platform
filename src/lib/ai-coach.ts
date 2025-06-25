import { openaiService } from './openai';
import { voiceCoachService } from './elevenlabs';
import { lingoService } from './lingo';
import { supabase } from './supabase';

export interface CoachingResponse {
  message: string;
  translatedMessage?: string;
  audioUrl?: string;
  upgradeRequired?: boolean;
  usageRemaining?: number;
}

export interface CoachingOptions {
  userTier: 'free' | 'professional' | 'career_os';
  targetLanguage?: string;
  includeVoice?: boolean;
  userContext?: any;
}

export class AICareerCoach {
  async processMessage(
    userId: string, 
    message: string, 
    options: CoachingOptions
  ): Promise<CoachingResponse> {
    try {
      // Check usage limits based on tier
      const usageCheck = await this.checkAIUsageLimit(userId, options.userTier);
      if (!usageCheck.canUse) {
        return {
          message: this.getUpgradeMessage(options.userTier),
          upgradeRequired: true,
          usageRemaining: usageCheck.remaining
        };
      }

      // Get conversation history
      const conversationHistory = await this.getConversationHistory(userId);

      // Generate AI response
      const aiResponse = await openaiService.generateCareerCoaching(
        message,
        options.userContext || {},
        conversationHistory
      );

      let response: CoachingResponse = {
        message: aiResponse,
        usageRemaining: usageCheck.remaining - 1
      };

      // Add translation for Career OS users
      if (options.targetLanguage && options.userTier === 'career_os') {
        try {
          const translation = await lingoService.translateCoachingResponse(
            response.message,
            options.targetLanguage,
            options.userTier
          );
          response.translatedMessage = translation.translatedText;
        } catch (error) {
          console.error('Translation error:', error);
        }
      }

      // Add voice response for Career OS users
      if (options.includeVoice && options.userTier === 'career_os') {
        try {
          const audioBuffer = await voiceCoachService.generateCoachingResponse(
            response.translatedMessage || response.message,
            options.userTier
          );
          response.audioUrl = voiceCoachService.createAudioURL(audioBuffer);
        } catch (error) {
          console.error('Voice generation error:', error);
        }
      }

      // Save conversation and track usage
      await this.saveConversation(userId, message, response.message);
      await this.incrementAIUsage(userId);

      return response;
    } catch (error) {
      console.error('AI coaching error:', error);
      return {
        message: 'I apologize, but I encountered an error. Please try again in a moment.',
        upgradeRequired: false
      };
    }
  }

  private async checkAIUsageLimit(userId: string, tier: string): Promise<{ canUse: boolean; remaining: number }> {
    const limits = { 
      free: 0, 
      professional: 5, 
      career_os: -1 // unlimited
    };
    
    const limit = limits[tier as keyof typeof limits];
    
    if (limit === -1) {
      return { canUse: true, remaining: -1 }; // unlimited
    }
    
    if (limit === 0) {
      return { canUse: false, remaining: 0 }; // not allowed
    }
    
    // Check current month usage
    const usage = await this.getCurrentMonthUsage(userId);
    const remaining = Math.max(0, limit - usage);
    
    return { 
      canUse: usage < limit, 
      remaining 
    };
  }

  private async getCurrentMonthUsage(userId: string): Promise<number> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('user_usage')
        .select('usage_count')
        .eq('user_id', userId)
        .eq('usage_type', 'ai_conversations')
        .gte('reset_date', startOfMonth.toISOString())
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking usage:', error);
        return 0;
      }

      return data?.usage_count || 0;
    } catch (error) {
      console.error('Error getting usage:', error);
      return 0;
    }
  }

  private async incrementAIUsage(userId: string): Promise<void> {
    try {
      const today = new Date();
      const resetDate = new Date(today.getFullYear(), today.getMonth(), 1);

      const { error } = await supabase
        .from('user_usage')
        .upsert({
          user_id: userId,
          usage_type: 'ai_conversations',
          usage_count: 1,
          reset_date: resetDate.toISOString().split('T')[0]
        }, {
          onConflict: 'user_id,usage_type,reset_date',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Error incrementing usage:', error);
      }
    } catch (error) {
      console.error('Error tracking usage:', error);
    }
  }

  private async getConversationHistory(userId: string): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    try {
      const { data, error } = await supabase
        .from('user_events')
        .select('event_data')
        .eq('user_id', userId)
        .eq('event_type', 'ai_conversation')
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) {
        console.error('Error getting conversation history:', error);
        return [];
      }

      return data?.map(event => ({
        role: event.event_data.role,
        content: event.event_data.content
      })).reverse() || [];
    } catch (error) {
      console.error('Error loading conversation history:', error);
      return [];
    }
  }

  private async saveConversation(userId: string, userMessage: string, aiResponse: string): Promise<void> {
    try {
      // Save user message
      await supabase.from('user_events').insert({
        user_id: userId,
        event_type: 'ai_conversation',
        event_data: {
          role: 'user',
          content: userMessage,
          timestamp: new Date().toISOString()
        }
      });

      // Save AI response
      await supabase.from('user_events').insert({
        user_id: userId,
        event_type: 'ai_conversation',
        event_data: {
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }

  private getUpgradeMessage(tier: string): string {
    if (tier === 'free') {
      return "AI Career Coaching is available with Professional ($4.99/month) for 5 sessions per month, or Career OS ($9.99/month) for unlimited coaching with voice responses and multi-language support!";
    } else if (tier === 'professional') {
      return "You've used all 5 AI coaching sessions this month. Upgrade to Career OS ($9.99/month) for unlimited coaching with voice responses and multi-language support!";
    }
    return "Upgrade required to access AI coaching features.";
  }
}

export const aiCareerCoach = new AICareerCoach();