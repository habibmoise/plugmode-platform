import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { JobSearch } from '../components/JobSearch';
import { EnhancedJobCard } from '../components/EnhancedJobCard';
import { useJobSearch } from '../hooks/useJobSearch';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { JobFilters } from '../types/job';
import { ArrowLeft, SortAsc, BarChart3, TrendingUp } from 'lucide-react';

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'match_score', label: 'Best Match' },
  { value: 'salary', label: 'Highest Salary' },
  { value: 'company', label: 'Company A-Z' }
];

export function Jobs() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<JobFilters>({});
  const [sortBy, setSortBy] = useState<'newest' | 'match_score' | 'salary' | 'company'>('newest');
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());

  const { jobs, loading, error, totalCount, hasMore, loadMore } = useJobSearch(filters, sortBy);

  React.useEffect(() => {
    if (user) {
      loadUserJobData();
    }
  }, [user]);

  const loadUserJobData = async () => {
    if (!user) return;

    try {
      // Load saved jobs
      const { data: savedData } = await supabase
        .from('saved_jobs')
        .select('job_id')
        .eq('user_id', user.id);

      // Load applications
      const { data: appliedData } = await supabase
        .from('applications')
        .select('job_id')
        .eq('user_id', user.id);

      setSavedJobs(new Set(savedData?.map(item => item.job_id) || []));
      setAppliedJobs(new Set(appliedData?.map(item => item.job_id) || []));
    } catch (error) {
      console.error('Error loading user job data:', error);
    }
  };

  const toggleSaveJob = async (jobId: string) => {
    if (!user) return;

    try {
      if (savedJobs.has(jobId)) {
        // Unsave job
        await supabase
          .from('saved_jobs')
          .delete()
          .eq('user_id', user.id)
          .eq('job_id', jobId);

        setSavedJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });

        showToast({
          type: 'info',
          title: 'Job Removed',
          message: 'Job removed from your saved list.'
        });
      } else {
        // Save job
        await supabase
          .from('saved_jobs')
          .insert({
            user_id: user.id,
            job_id: jobId,
            interaction_type: 'saved'
          });

        setSavedJobs(prev => new Set([...prev, jobId]));

        showToast({
          type: 'success',
          title: 'Job Saved',
          message: 'Job added to your saved list.'
        });

        // Log automation event
        await supabase.from('automation_logs').insert({
          user_id: user.id,
          workflow_type: 'job_saved',
          status: 'completed',
          result_data: {
            job_id: jobId,
            saved_at: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.error('Error toggling save job:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update job. Please try again.'
      });
    }
  };

  const applyToJob = async (jobId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('applications')
        .insert({
          user_id: user.id,
          job_id: jobId,
          status: 'applied'
        });

      setAppliedJobs(prev => new Set([...prev, jobId]));

      showToast({
        type: 'success',
        title: 'Application Submitted',
        message: 'Your application has been submitted successfully!'
      });

      // Log automation event
      await supabase.from('automation_logs').insert({
        user_id: user.id,
        workflow_type: 'application_status',
        status: 'completed',
        result_data: {
          job_id: jobId,
          status: 'applied',
          applied_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error applying to job:', error);
      showToast({
        type: 'error',
        title: 'Application Failed',
        message: 'Failed to submit application. Please try again.'
      });
    }
  };

  const getCategoryStats = () => {
    const stats = jobs.reduce((acc, job) => {
      acc[job.category] = (acc[job.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(stats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link 
              to="/dashboard"
              className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black mb-2">Global Remote Opportunities</h1>
              <p className="text-gray-600">
                Discover remote jobs from companies worldwide that welcome talent from your region
              </p>
            </div>

            {/* Market Insights */}
            <div className="hidden lg:block bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-900">Market Insights</span>
              </div>
              <div className="text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span>15 companies hired from Nigeria this quarter</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <JobSearch
            filters={filters}
            onFiltersChange={setFilters}
            totalResults={totalCount}
            loading={loading}
          />
        </div>

        {/* Sort and Stats */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <SortAsc className="h-5 w-5 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category breakdown */}
            <div className="hidden md:flex items-center space-x-4 text-sm text-gray-600">
              {getCategoryStats().map(([category, count]) => (
                <span key={category}>
                  {category}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Jobs Grid */}
        {loading && jobs.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
                <div className="flex space-x-2 mt-4">
                  <div className="h-8 bg-gray-200 rounded flex-1"></div>
                  <div className="h-8 bg-gray-200 rounded w-8"></div>
                </div>
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search criteria or filters to find more opportunities.
            </p>
            <button
              onClick={() => setFilters({})}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <EnhancedJobCard
                  key={job.id}
                  job={job}
                  isSaved={savedJobs.has(job.id)}
                  isApplied={appliedJobs.has(job.id)}
                  onSave={toggleSaveJob}
                  onApply={applyToJob}
                  showIntelligence={true}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Loading...' : 'Load More Jobs'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}