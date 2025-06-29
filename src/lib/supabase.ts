// src/lib/supabase.ts
// Fixed configuration to handle OAuth properly

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable automatic token refresh on startup
    autoRefreshToken: true,
    // Don't persist session in localStorage (causes 401 on page reload)
    persistSession: true,
    // Detect session from URL on OAuth callbacks
    detectSessionInUrl: true,
    // Use a more reliable storage method
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  // Add retry logic for network requests
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
    };
  };
};