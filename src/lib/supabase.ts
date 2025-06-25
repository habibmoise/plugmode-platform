import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string | null;
          first_name: string | null;
          last_name: string | null;
          email: string;
          location: string | null;
          skills: string[] | null;
          experience_level: string | null;
          created_at: string;
          automation_preferences: any | null;
          avatar_url: string | null;
        };
        Insert: {
          id?: string;
          name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          email: string;
          location?: string | null;
          skills?: string[] | null;
          experience_level?: string | null;
          created_at?: string;
          automation_preferences?: any | null;
          avatar_url?: string | null;
        };
        Update: {
          id?: string;
          name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          email?: string;
          location?: string | null;
          skills?: string[] | null;
          experience_level?: string | null;
          created_at?: string;
          automation_preferences?: any | null;
          avatar_url?: string | null;
        };
      };
      jobs: {
        Row: {
          id: string;
          title: string;
          company: string;
          description: string | null;
          location: string;
          salary: string;
          category: string;
          experience_level: 'entry' | 'mid' | 'senior' | 'lead' | 'any' | null;
          job_type: 'full-time' | 'part-time' | 'contract' | 'freelance';
          is_remote: boolean;
          remote_type: 'fully-remote' | 'hybrid' | 'remote-friendly' | 'on-site';
          culture_score: number;
          regional_hiring: {
            africa_friendly?: boolean;
            asia_friendly?: boolean;
            latam_friendly?: boolean;
            visa_sponsorship?: boolean;
            timezone_flexibility?: boolean;
          };
          auto_collected: boolean;
          skills_required: string[];
          salary_min: number | null;
          salary_max: number | null;
          created_at: string;
          source_url: string | null;
          last_updated: string;
        };
        Insert: {
          id?: string;
          title: string;
          company: string;
          description?: string | null;
          location: string;
          salary: string;
          category: string;
          experience_level?: 'entry' | 'mid' | 'senior' | 'lead' | 'any' | null;
          job_type?: 'full-time' | 'part-time' | 'contract' | 'freelance';
          is_remote?: boolean;
          remote_type?: 'fully-remote' | 'hybrid' | 'remote-friendly' | 'on-site';
          culture_score?: number;
          regional_hiring?: any;
          auto_collected?: boolean;
          skills_required?: string[];
          salary_min?: number | null;
          salary_max?: number | null;
          created_at?: string;
          source_url?: string | null;
          last_updated?: string;
        };
        Update: {
          id?: string;
          title?: string;
          company?: string;
          description?: string | null;
          location?: string;
          salary?: string;
          category?: string;
          experience_level?: 'entry' | 'mid' | 'senior' | 'lead' | 'any' | null;
          job_type?: 'full-time' | 'part-time' | 'contract' | 'freelance';
          is_remote?: boolean;
          remote_type?: 'fully-remote' | 'hybrid' | 'remote-friendly' | 'on-site';
          culture_score?: number;
          regional_hiring?: any;
          auto_collected?: boolean;
          skills_required?: string[];
          salary_min?: number | null;
          salary_max?: number | null;
          created_at?: string;
          source_url?: string | null;
          last_updated?: string;
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
      resumes: {
        Row: {
          id: string;
          user_id: string;
          file_url: string;
          file_name: string;
          file_size: number;
          extracted_text: string | null;
          uploaded_at: string;
          processing_status: string;
          processing_error: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_url: string;
          file_name: string;
          file_size: number;
          extracted_text?: string | null;
          uploaded_at?: string;
          processing_status?: string;
          processing_error?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_url?: string;
          file_name?: string;
          file_size?: number;
          extracted_text?: string | null;
          uploaded_at?: string;
          processing_status?: string;
          processing_error?: string | null;
        };
      };
      saved_jobs: {
        Row: {
          id: string;
          user_id: string;
          job_id: string;
          saved_at: string;
          notes: string | null;
          interaction_type: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_id: string;
          saved_at?: string;
          notes?: string | null;
          interaction_type?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          job_id?: string;
          saved_at?: string;
          notes?: string | null;
          interaction_type?: string;
        };
      };
      applications: {
        Row: {
          id: string;
          user_id: string;
          job_id: string;
          applied_at: string;
          status: string;
          automation_enabled: boolean;
          notes: string | null;
          last_updated: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_id: string;
          applied_at?: string;
          status?: string;
          automation_enabled?: boolean;
          notes?: string | null;
          last_updated?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          job_id?: string;
          applied_at?: string;
          status?: string;
          automation_enabled?: boolean;
          notes?: string | null;
          last_updated?: string;
        };
      };
      automation_logs: {
        Row: {
          id: string;
          user_id: string;
          workflow_type: string;
          status: string;
          executed_at: string;
          result_data: any | null;
          webhook_url: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          workflow_type: string;
          status?: string;
          executed_at?: string;
          result_data?: any | null;
          webhook_url?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          workflow_type?: string;
          status?: string;
          executed_at?: string;
          result_data?: any | null;
          webhook_url?: string | null;
        };
      };
      job_sources: {
        Row: {
          id: string;
          source_name: string;
          source_url: string;
          source_type: string;
          last_scraped: string | null;
          active_status: boolean;
          scrape_frequency: string;
          total_jobs_collected: number;
          config: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_name: string;
          source_url: string;
          source_type: string;
          last_scraped?: string | null;
          active_status?: boolean;
          scrape_frequency?: string;
          total_jobs_collected?: number;
          config?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          source_name?: string;
          source_url?: string;
          source_type?: string;
          last_scraped?: string | null;
          active_status?: boolean;
          scrape_frequency?: string;
          total_jobs_collected?: number;
          config?: any;
          created_at?: string;
        };
      };
      job_matches: {
        Row: {
          id: string;
          user_id: string;
          job_id: string;
          match_score: number;
          match_reasons: any;
          created_at: string;
          notified_at: string | null;
          viewed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          job_id: string;
          match_score: number;
          match_reasons?: any;
          created_at?: string;
          notified_at?: string | null;
          viewed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          job_id?: string;
          match_score?: number;
          match_reasons?: any;
          created_at?: string;
          notified_at?: string | null;
          viewed_at?: string | null;
        };
      };
      search_analytics: {
        Row: {
          id: string;
          user_id: string | null;
          search_query: string | null;
          filters_applied: any;
          results_count: number;
          clicked_job_ids: string[];
          search_timestamp: string;
          session_id: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          search_query?: string | null;
          filters_applied?: any;
          results_count?: number;
          clicked_job_ids?: string[];
          search_timestamp?: string;
          session_id?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          search_query?: string | null;
          filters_applied?: any;
          results_count?: number;
          clicked_job_ids?: string[];
          search_timestamp?: string;
          session_id?: string;
        };
      };
    };
  };
};