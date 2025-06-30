import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Create admin Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, userId, conversationId } = req.body;

    // Validate required fields
    if (!message || !userId) {
      return res.status(400).json({ error: 'Message and userId are required' });
    }

    // Get user's subscription tier
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Define usage limits by tier
    const limits = {
      starter: 0,
      professional: 5,
      career_os: 25
    };

    const userTier = user.subscription_tier || 'starter';
    const userLimit = limits[userTier as keyof typeof limits] || 0;

    // Check monthly usage for non-unlimited tiers
    if (userTier !== 'career_os') {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('ai_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', monthStart.toISOString());

      if (count && count >= userLimit) {
        return res.status(429).json({ 
          error: 'Monthly AI conversation limit reached',
          limit: userLimit,
          used: count,
          tier: userTier
        });
      }
    }

    // Create AI completion
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an expert career coach specializing in helping professionals in underserved regions (Africa, Southeast Asia, Latin America) access global remote opportunities. Provide practical, actionable advice focused on:

- Remote work skills and best practices
- International job applications and resume optimization
- Building professional networks globally
- Salary negotiation for remote positions
- Career development in tech and other remote-friendly fields
- Overcoming geographical barriers in job search

Keep responses concise but actionable. Always consider the unique challenges faced by professionals in emerging markets.`
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";

    // Log the conversation
    const { error: logError } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: userId,
        conversation_id: conversationId || `chat-${Date.now()}`,
        user_message: message,
        ai_response: aiResponse,
        tokens_used: completion.usage?.total_tokens || 0
      });

    if (logError) {
      console.error('Failed to log conversation:', logError);
    }

    // Calculate remaining uses
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { count: currentCount } = await supabase
      .from('ai_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', monthStart.toISOString());

    const remainingUses = userTier === 'career_os' ? -1 : Math.max(0, userLimit - (currentCount || 0));

    res.status(200).json({ 
      response: aiResponse,
      remainingUses,
      tier: userTier,
      success: true
    });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process AI request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}