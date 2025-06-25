import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { ProfileProgress } from '../components/ProfileProgress';
import { PersonalizedInsights } from '../components/PersonalizedInsights';
import { EnhancedJobCard } from '../components/EnhancedJobCard';
import { SkillsMatchIndicator } from '../components/SkillsMatchIndicator';
import { AICoachChat } from '../components/AICoachChat';
import { CareerAnalytics } from '../components/CareerAnalytics';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { Job } from '../types/job';
import { User, Heart, FileText, BookmarkCheck, Search, TrendingUp, Globe, Users, Target, BarChart3, MessageCircle } from 'lucide-react';

interface UserProfile {
  firstName: string | null;
  lastName: string | null;
  location: string | null;
  skills: string[] | null;
  experience_level: string | null;
}

interface DashboardStats {
  savedJobs: number;
  applications: number;
  profileCompletion: number;
  jobMatches: number;
  skillsMatchAvg: number;
}

interface JobMatch {
  job: Job;
  match_score: number;
  match_reasons: any;
}

export function Dashboard() {
  const { user } = useAuth();
  const { subscriptionStatus } = useSubscription();
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<DashboardStats>({ 
    savedJobs: 0, 
    applications: 0, 
    profileCompletion: 0,
    jobMatches: 0,
    skillsMatchAvg: 0
  });

  useEffect(() => {
    loadDashboardData();
    setupRealtimeSubscriptions();
  }, [user]);

  const setupRealtimeSubscriptions = () => {
    if (!user) return;

    // Subscribe to new job matches
    const jobMatchesSubscription = supabase
      .channel('job_matches_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_matches',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newMatch = payload.new;
          if (newMatch.match_score >= 80) {
            showToast({
              type: 'success',
              title: 'New High-Quality Match!',
              message: `Found a ${newMatch.match_score}% match for you. Check your matches!`
            });
            // Optionally refresh job matches
            loadDashboardData();
          }
        }
      )
      .subscribe();

    // Subscribe to new insights
    const insightsSubscription = supabase
      .channel('insights_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_insights',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newInsight = payload.new;
          if (newInsight.priority === 'high' || newInsight.priority === 'urgent') {
            showToast({
              type: 'info',
              title: 'New Career Insight',
              message: newInsight.insight_data.title || 'Check your personalized insights!'
            });
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(jobMatchesSubscription);
      supabase.removeChannel(insightsSubscription);
    };
  };
  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Load user profile
      const { data: userData } = await supabase
        .from('users')
        .select('name, location, skills, experience_level')
        .eq('id', user.id)
        .maybeSingle();

      // Parse user profile name into first and last name
      if (userData) {
        const nameParts = userData.name ? userData.name.split(' ') : [];
        const firstName = nameParts[0] || null;
        const lastName = nameParts.slice(1).join(' ') || null;
        
        setUserProfile({
          firstName,
          lastName,
          location: userData.location,
          skills: userData.skills,
          experience_level: userData.experience_level
        });
      }

      // Load job matches with job details
      const { data: matchesData } = await supabase
        .from('job_matches')
        .select(`
          match_score,
          match_reasons,
          job:jobs (*)
        `)
        .eq('user_id', user.id)
        .gte('match_score', 60)
        .order('match_score', { ascending: false })
        .limit(8);

      // Load regular jobs as fallback
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(12);

      // Load saved jobs
      const { data: savedJobsData } = await supabase
        .from('saved_jobs')
        .select('job_id')
        .eq('user_id', user.id);

      // Load applications
      const { data: applicationsData } = await supabase
        .from('applications')
        .select('job_id')
        .eq('user_id', user.id);

      // Check if user has resume
      const { data: resumeData } = await supabase
        .from('resumes')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      // Set data
      setJobMatches(matchesData || []);
      setJobs(jobsData || []);
      setSavedJobs(new Set(savedJobsData?.map(item => item.job_id) || []));
      setAppliedJobs(new Set(applicationsData?.map(item => item.job_id) || []));

      // Calculate stats
      const profileCompletion = calculateProfileCompletion(userData, resumeData);
      const skillsMatchAvg = matchesData && matchesData.length > 0 
        ? Math.round(matchesData.reduce((sum, match) => sum + match.match_score, 0) / matchesData.length)
        : 0;

      setStats({
        savedJobs: savedJobsData?.length || 0,
        applications: applicationsData?.length || 0,
        profileCompletion,
        jobMatches: matchesData?.length || 0,
        skillsMatchAvg
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showToast({
        type: 'error',
        title: 'Error Loading Dashboard',
        message: 'Failed to load dashboard data. Please refresh the page.'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const automateApplication = async (jobId: string) => {
    if (!user) return;

    try {
      await supabase.from('automation_logs').insert({
        user_id: user.id,
        workflow_type: 'automated_application',
        status: 'pending',
        result_data: {
          job_id: jobId,
          requested_at: new Date().toISOString()
        }
      });

      showToast({
        type: 'success',
        title: 'Automation Scheduled',
        message: 'Your application will be automatically submitted.'
      });
    } catch (error) {
      console.error('Error scheduling automation:', error);
      showToast({
        type: 'error',
        title: 'Automation Failed',
        message: 'Failed to schedule automated application.'
      });
    }
  };

  const calculateProfileCompletion = (profile: any, resume: any) => {
    let completion = 10; // Base for having an account
    if (profile?.name) completion += 15;
    if (profile?.location) completion += 15;
    if (profile?.experience_level) completion += 15;
    if (profile?.skills && profile.skills.length > 0) completion += 20;
    if (resume && resume.length > 0) completion += 25;
    return completion;
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

        setStats(prev => ({ ...prev, savedJobs: prev.savedJobs - 1 }));

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
        setStats(prev => ({ ...prev, savedJobs: prev.savedJobs + 1 }));

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
      setStats(prev => ({ ...prev, applications: prev.applications + 1 }));

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

  const getUserName = () => {
    if (userProfile?.firstName) {
      return userProfile.firstName;
    }
    return user?.user_metadata?.firstName || user?.user_metadata?.name || 'Professional';
  };

  const getPersonalizedGreeting = () => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const location = userProfile?.location ? ` from ${userProfile.location}` : '';
    return `${timeGreeting}, ${getUserName()}${location}!`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Personalized Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">
            {getPersonalizedGreeting()}
          </h1>
          <p className="text-gray-600">
            Your global career journey continues. Here's what's happening today.
          </p>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-50 p-3 rounded-lg">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-black">{stats.jobMatches}</div>
                <div className="text-sm text-gray-600">Job Matches</div>
              </div>
            </div>
            {stats.skillsMatchAvg > 0 && (
              <div className="mt-3 text-xs text-blue-600">
                Avg. match: {stats.skillsMatchAvg}%
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-50 p-3 rounded-lg">
                <Heart className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-black">{stats.savedJobs}</div>
                <div className="text-sm text-gray-600">Saved Jobs</div>
              </div>
            </div>
            <Link 
              to="/saved-jobs"
              className="mt-3 text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              View saved jobs →
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-3">
              <div className="bg-green-50 p-3 rounded-lg">
                <BookmarkCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-black">{stats.applications}</div>
                <div className="text-sm text-gray-600">Applications</div>
              </div>
            </div>
            <Link 
              to="/applications"
              className="mt-3 text-green-600 hover:text-green-700 text-sm font-medium"
            >
              Track progress →
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-50 p-3 rounded-lg">
                <User className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-black">{stats.profileCompletion}%</div>
                <div className="text-sm text-gray-600">Profile Complete</div>
              </div>
            </div>
            <Link 
              to="/profile"
              className="mt-3 text-orange-600 hover:text-orange-700 text-sm font-medium"
            >
              Complete profile →
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-50 p-3 rounded-lg">
                <Search className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-black">{jobs.length}</div>
                <div className="text-sm text-gray-600">New Opportunities</div>
              </div>
            </div>
            <Link 
              to="/jobs"
              className="mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              Browse all jobs →
            </Link>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Profile Progress */}
          <div className="lg:col-span-1 space-y-8">
            <ProfileProgress />
            
            {/* AI Coach Chat */}
            <AICoachChat userProfile={userProfile} />
          </div>

          {/* Right Column - Insights and Analytics */}
          <div className="lg:col-span-2 space-y-8">
            <PersonalizedInsights />
            
            {/* Career Analytics for Career OS users */}
            {subscriptionStatus.tier === 'career_os' && (
              <CareerAnalytics />
            )}
          </div>
        </div>

        {/* Market Insights */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-8 border border-blue-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-black">Market Intelligence</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/60 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Globe className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-900">Global Hiring Trends</span>
              </div>
              <p className="text-sm text-gray-700">Remote hiring up 40% in your region this quarter</p>
            </div>
            
            <div className="bg-white/60 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-900">Skills Demand</span>
              </div>
              <p className="text-sm text-gray-700">
                {userProfile?.skills?.[0] || 'JavaScript'} roles increased 25% this month
              </p>
            </div>
            
            <div className="bg-white/60 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-gray-900">Salary Trends</span>
              </div>
              <p className="text-sm text-gray-700">Average remote salaries 20% above local market</p>
            </div>
          </div>
        </div>

        {/* Jobs Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">
              {jobMatches.length > 0 ? 'Your Best Matches' : 'Recommended for You'}
            </h2>
            <Link 
              to="/jobs"
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
            >
              <span>View all jobs</span>
              <Search className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Show matched jobs first if available */}
              {jobMatches.length > 0 ? (
                jobMatches.map((match) => (
                  <div key={match.job.id} className="relative">
                    <EnhancedJobCard
                      job={match.job}
                      isSaved={savedJobs.has(match.job.id)}
                      isApplied={appliedJobs.has(match.job.id)}
                      onSave={toggleSaveJob}
                      onApply={applyToJob}
                      matchScore={match.match_score}
                      showIntelligence={true}
                      onAutomate={automateApplication}
                    />
                    
                    {/* Skills Match Indicator */}
                    {userProfile?.skills && match.job.skills_required && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <SkillsMatchIndicator
                          userSkills={userProfile.skills}
                          requiredSkills={match.job.skills_required}
                          showAddSuggestion={true}
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                // Fallback to regular jobs
                jobs.slice(0, 6).map((job) => (
                  <EnhancedJobCard
                    key={job.id}
                    job={job}
                    isSaved={savedJobs.has(job.id)}
                    isApplied={appliedJobs.has(job.id)}
                    onSave={toggleSaveJob}
                    onApply={applyToJob}
                    showIntelligence={true}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}