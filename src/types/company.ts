export interface Company {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  hiring_regions: {
    africa?: boolean;
    asia?: boolean;
    latam?: boolean;
    hiring_from_nigeria?: number;
    hiring_from_kenya?: number;
    hiring_from_indonesia?: number;
    visa_sponsorship?: boolean;
    timezone_flexible?: boolean;
    global_team?: boolean;
    early_career_friendly?: boolean;
  };
  culture_score: number;
  hiring_stats: {
    total_remote_hires?: number;
    international_hires_last_year?: number;
    retention_rate?: number;
    avg_time_to_hire?: string;
  };
  benefits: {
    equipment_stipend?: string;
    home_office_setup?: boolean;
    learning_budget?: string;
    health_insurance?: boolean;
    flexible_hours?: boolean;
    conference_budget?: string;
    unlimited_pto?: boolean;
    stock_options?: boolean;
    equity_package?: boolean;
  };
  tech_stack: string[];
  founded_year: number | null;
  headquarters: string | null;
  employee_count_range: string | null;
  last_updated: string;
  created_at: string;
}

export interface UserInsight {
  id: string;
  user_id: string;
  insight_type: 'skills_gap' | 'market_trend' | 'salary_benchmark' | 'career_recommendation' | 'job_match_summary';
  insight_data: {
    title?: string;
    description?: string;
    action_items?: string[];
    data?: any;
    recommendations?: string[];
    impact?: string;
    priority_level?: string;
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'dismissed' | 'acted_upon';
  generated_at: string;
  expires_at: string | null;
  automation_source: string | null;
  effectiveness_score: number | null;
}

export interface RecommendationHistory {
  id: string;
  user_id: string;
  recommendation_type: 'skill_addition' | 'job_application' | 'profile_completion' | 'career_path' | 'salary_negotiation';
  content: {
    title?: string;
    description?: string;
    action?: string;
    expected_outcome?: string;
    difficulty?: string;
    time_investment?: string;
  };
  effectiveness_score: number | null;
  user_action: 'accepted' | 'dismissed' | 'partially_accepted' | 'no_action' | null;
  recommended_at: string;
  acted_upon_at: string | null;
  outcome_data: any;
}

export interface RegionalMarketData {
  id: string;
  region: string;
  country: string;
  job_category: string;
  experience_level: 'entry' | 'mid' | 'senior' | 'lead';
  avg_salary_usd: number;
  salary_range_min: number;
  salary_range_max: number;
  job_count: number;
  growth_rate: number;
  top_skills: string[];
  market_trends: {
    demand_growth?: string;
    remote_adoption?: number;
    top_hiring_companies?: string[];
    salary_trend?: string;
  };
  data_source: string | null;
  last_updated: string;
}