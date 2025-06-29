export interface Job {
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
}

export interface JobFilters {
  search?: string;
  category?: string;
  experience_level?: string;
  job_type?: string;
  remote_type?: string;
  salary_min?: number;
  salary_max?: number;
  skills?: string[];
  location?: string;
}

export interface JobMatch {
  id: string;
  user_id: string;
  job_id: string;
  match_score: number;
  match_reasons: {
    skills_match?: number;
    experience_match?: number;
    location_preference?: number;
    salary_match?: number;
  };
  created_at: string;
  notified_at: string | null;
  viewed_at: string | null;
  job: Job;
}

export interface SearchAnalytics {
  id: string;
  user_id: string | null;
  search_query: string | null;
  filters_applied: JobFilters;
  results_count: number;
  clicked_job_ids: string[];
  search_timestamp: string;
  session_id: string;
}
export interface UserProfile {
  firstName: string | null;
  lastName: string | null;
  location: string | null;
  skills: string[] | null;
  experience_level: string | null;
  id?: string;
  email?: string;
  phone?: string;
  bio?: string;
  profile_completion?: number;
  subscription_tier?: string;
}