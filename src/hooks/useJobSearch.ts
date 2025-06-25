import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Job, JobFilters } from '../types/job';
import { useAuth } from '../contexts/AuthContext';

interface UseJobSearchResult {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

export function useJobSearch(
  filters: JobFilters = {},
  sortBy: 'newest' | 'match_score' | 'salary' | 'company' = 'newest',
  limit: number = 20
): UseJobSearchResult {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const buildQuery = useCallback(() => {
    let query = supabase
      .from('jobs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.search) {
      query = query.textSearch('title,company,description', filters.search);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.experience_level) {
      query = query.in('experience_level', [filters.experience_level, 'any']);
    }

    if (filters.job_type) {
      query = query.eq('job_type', filters.job_type);
    }

    if (filters.remote_type) {
      query = query.eq('remote_type', filters.remote_type);
    }

    if (filters.salary_min) {
      query = query.gte('salary_min', filters.salary_min);
    }

    if (filters.salary_max) {
      query = query.lte('salary_max', filters.salary_max);
    }

    if (filters.skills && filters.skills.length > 0) {
      query = query.overlaps('skills_required', filters.skills);
    }

    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'salary':
        query = query.order('salary_max', { ascending: false, nullsLast: true });
        break;
      case 'company':
        query = query.order('company', { ascending: true });
        break;
      case 'match_score':
        // For match score, we'd need to join with job_matches table
        // For now, fall back to newest
        query = query.order('created_at', { ascending: false });
        break;
    }

    return query;
  }, [filters, sortBy]);

  const fetchJobs = useCallback(async (isLoadMore = false) => {
    try {
      setLoading(true);
      setError(null);

      const query = buildQuery();
      const currentOffset = isLoadMore ? offset : 0;
      
      const { data, error: queryError, count } = await query
        .range(currentOffset, currentOffset + limit - 1);

      if (queryError) throw queryError;

      const newJobs = data || [];
      
      if (isLoadMore) {
        setJobs(prev => [...prev, ...newJobs]);
      } else {
        setJobs(newJobs);
        setOffset(0);
      }

      setTotalCount(count || 0);
      setHasMore(newJobs.length === limit);
      
      if (isLoadMore) {
        setOffset(prev => prev + limit);
      } else {
        setOffset(limit);
      }

      // Log search analytics
      if (user) {
        await logSearchAnalytics(filters, count || 0);
      }

    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [buildQuery, limit, offset, user, filters]);

  const logSearchAnalytics = async (appliedFilters: JobFilters, resultsCount: number) => {
    try {
      await supabase.from('search_analytics').insert({
        user_id: user?.id,
        search_query: appliedFilters.search || null,
        filters_applied: appliedFilters,
        results_count: resultsCount,
        session_id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
    } catch (error) {
      console.error('Error logging search analytics:', error);
    }
  };

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchJobs(true);
    }
  }, [loading, hasMore, fetchJobs]);

  const refetch = useCallback(() => {
    setOffset(0);
    fetchJobs(false);
  }, [fetchJobs]);

  useEffect(() => {
    fetchJobs(false);
  }, [filters, sortBy]);

  return {
    jobs,
    loading,
    error,
    totalCount,
    hasMore,
    loadMore,
    refetch
  };
}