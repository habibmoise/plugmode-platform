// src/lib/supabase.ts
// Fixed version with explicit keys to solve production deployment issues

import { createClient } from '@supabase/supabase-js';

// Hardcoded values instead of environment variables (fixes Netlify/Vite production issues)
const supabaseUrl = 'https://mxiqidkcthfkrtoptcet.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14aXFpZGtjdGhma3J0b3B0Y2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODEwODIsImV4cCI6MjA2NTA1NzA4Mn0.pYFl0NqpPaKV_w9dlGxtjI_A7pZdE64xGXGEVFZwNcA';

// Debug logging to verify correct values are being used
console.log('🔍 Supabase Client Configuration:', {
  url: supabaseUrl,
  keyPrefix: supabaseAnonKey.substring(0, 50) + '...',
  keyLength: supabaseAnonKey.length,
  timestamp: new Date().toISOString()
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    headers: {
      'x-application-name': 'plugmode-platform',
    },
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          first_name: string | null;
          last_name: string | null;
          location: string | null;
          skills: string[] | null;
          experience_level: string | null;
          phone: string | null;
          bio: string | null;
          profile_completion: number | null;
          subscription_tier: string | null;
          automation_preferences: any | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          location?: string | null;
          skills?: string[] | null;
          experience_level?: string | null;
          phone?: string | null;
          bio?: string | null;
          profile_completion?: number | null;
          subscription_tier?: string | null;
          automation_preferences?: any | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          location?: string | null;
          skills?: string[] | null;
          experience_level?: string | null;
          phone?: string | null;
          bio?: string | null;
          profile_completion?: number | null;
          subscription_tier?: string | null;
          automation_preferences?: any | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          event_data: any | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: string;
          event_data?: any | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_type?: string;
          event_data?: any | null;
          created_at?: string;
        };
      };
    };
  };
};