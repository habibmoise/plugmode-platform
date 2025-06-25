import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { CompanyProfile } from '../components/CompanyProfile';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { Job } from '../types/job';
import { Company } from '../types/company';
import { 
  ArrowLeft, 
  MapPin, 
  DollarSign, 
  Clock, 
  Briefcase, 
  Heart, 
  ExternalLink,
  Users,
  Globe,
  Star,
  CheckCircle,
  Building,
  Calendar,
  TrendingUp,
  Zap
} from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';

export function JobDetails() {
  const { jobId } = useParams<{ jobId: string }>();
  const { user } = useAuth();
  const { subscriptionStatus } = useSubscription();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (jobId) {
      loadJobDetails();
      if (user) {
        checkUserInteractions();
      }
    }
  }, [jobId, user]);

  const logUserEvent = async (eventType: string, eventData: any) => {
    if (!user) return;
    
    try {
      await supabase.from('user_events').insert({
        user_id: user.id,
        event_type: eventType,
        event_data: eventData
      });
    } catch (error) {
      console.error('Error logging user event:', error);
    }
  };

  const loadJobDetails = async () => {
    if (!jobId) return;

    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setJob(data);

      // Log job view event
      if (user) {
        await logUserEvent('job_viewed', {
          job_id: jobId,
          job_title: data.title,
          job_company: data.company,
          job_category: data.category,
          viewed_at: new Date().toISOString()
        });
      }

      // Load company data if company_id exists
      if (data.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', data.company_id)
          .single();

        if (!companyError && companyData) {
          setCompany(companyData);
        }
      }
    } catch (error) {
      console.error('Error loading job details:', error);
      showToast({
        type: 'error',
        title: 'Error Loading Job',
        message: 'Failed to load job details. Please try again.'
      });
      navigate('/jobs');
    } finally {
      setLoading(false);
    }
  };

  const checkUserInteractions = async () => {
    if (!user || !jobId) return;

    try {
      // Check if job is saved
      const { data: savedData } = await supabase
        .from('saved_jobs')
        .select('id')
        .eq('user_id', user.id)
        .eq('job_id', jobId)
        .maybeSingle();

      // Check if user has applied
      const { data: appliedData } = await supabase
        .from('applications')
        .select('id')
        .eq('user_id', user.id)
        .eq('job_id', jobId)
        .maybeSingle();

      setIsSaved(!!savedData);
      setIsApplied(!!appliedData);
    } catch (error) {
      console.error('Error checking user interactions:', error);
    }
  };

  const toggleSaveJob = async () => {
    if (!user || !jobId) return;

    setActionLoading(true);
    try {
      if (isSaved) {
        // Unsave job
        await supabase
          .from('saved_jobs')
          .delete()
          .eq('user_id', user.id)
          .eq('job_id', jobId);

        setIsSaved(false);
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

        setIsSaved(true);
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

        // Log user event for recommendations
        await logUserEvent('job_saved', {
          job_id: jobId,
          job_title: job?.title,
          job_company: job?.company,
          job_category: job?.category,
          job_skills: job?.skills_required,
          saved_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error toggling save job:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update job. Please try again.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const applyToJob = async () => {
    if (!user || !jobId) return;

    setActionLoading(true);
    try {
      await supabase
        .from('applications')
        .insert({
          user_id: user.id,
          job_id: jobId,
          status: 'applied'
        });

      setIsApplied(true);
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

      // Log user event for recommendations
      await logUserEvent('job_applied', {
        job_id: jobId,
        job_title: job?.title,
        job_company: job?.company,
        job_category: job?.category,
        job_skills: job?.skills_required,
        applied_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error applying to job:', error);
      showToast({
        type: 'error',
        title: 'Application Failed',
        message: 'Failed to submit application. Please try again.'
      });
    } finally {
      setActionLoading(false);
    }
  };
  
  const automateApplication = async () => {
    if (!user || !jobId || !job) return;

    setActionLoading(true);
    try {
      // Log automation request
      await supabase.from('automation_logs').insert({
        user_id: user.id,
        workflow_type: 'automated_application',
        status: 'pending',
        result_data: {
          job_id: jobId,
          job_title: job.title,
          job_company: job.company,
          requested_at: new Date().toISOString()
        }
      });

      showToast({
        type: 'success',
        title: 'Automation Scheduled',
        message: 'Your application will be automatically submitted with your profile and resume.'
      });

      // Log user event for tracking
      await logUserEvent('automated_application_requested', {
        job_id: jobId,
        job_title: job.title,
        job_company: job.company,
        requested_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error scheduling automation:', error);
      showToast({
        type: 'error',
        title: 'Automation Failed',
        message: 'Failed to schedule automated application. Please try manual application.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatSalary = (salary: string) => {
    return salary.replace(/k/g, ',000');
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const getExperienceLevelLabel = (level: string) => {
    const labels = {
      'entry': 'Entry Level',
      'mid': 'Mid Level',
      'senior': 'Senior Level',
      'lead': 'Lead/Principal',
      'any': 'All Levels'
    };
    return labels[level as keyof typeof labels] || level;
  };

  const getRemoteTypeLabel = (type: string) => {
    const labels = {
      'fully-remote': 'Fully Remote',
      'hybrid': 'Hybrid',
      'remote-friendly': 'Remote Friendly',
      'on-site': 'On-site'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getRemoteFriendlyScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  const getRemoteFriendlyScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Average';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-6 bg-gray-200 rounded mb-6"></div>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Job not found</h3>
            <p className="text-gray-600 mb-6">The job you're looking for doesn't exist or has been removed.</p>
            <Link
              to="/jobs"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-8">
          <Link 
            to="/jobs"
            className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Jobs</span>
          </Link>
        </div>

        {/* Job Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
          <div className="p-8">
            {/* Job Title and Company */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold border border-blue-200">
                    {job.category}
                  </span>
                  
                  {job.experience_level && job.experience_level !== 'any' && (
                    <span className="bg-gray-50 text-gray-700 px-3 py-1 rounded-full text-sm border border-gray-200">
                      {getExperienceLevelLabel(job.experience_level)}
                    </span>
                  )}

                  {job.auto_collected && (
                    <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs border border-green-200 flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>Fresh</span>
                    </span>
                  )}
                </div>

                <h1 className="text-3xl font-bold text-black mb-2">{job.title}</h1>
                <div className="flex items-center space-x-2 text-xl text-gray-600 mb-4">
                  <Building className="h-5 w-5" />
                  <span>{job.company}</span>
                </div>

                {/* Job Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>{job.location}</span>
                    <span className="mx-2">•</span>
                    <span>{getRemoteTypeLabel(job.remote_type)}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <DollarSign className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>{formatSalary(job.salary)}</span>
                    <span className="mx-2">•</span>
                    <span className="capitalize">{job.job_type}</span>
                  </div>

                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>Posted {getTimeAgo(job.created_at)}</span>
                  </div>

                  <div className="flex items-center text-gray-600">
                    <Clock className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>Updated {getTimeAgo(job.last_updated)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="ml-6 flex flex-col space-y-3">
                <button
                  onClick={toggleSaveJob}
                  disabled={actionLoading}
                  className="p-3 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <Heart 
                    className={`h-6 w-6 transition-colors ${
                      isSaved 
                        ? 'text-red-500 fill-current' 
                        : 'text-gray-400 hover:text-red-500'
                    }`}
                  />
                </button>

                {job.source_url && (
                  <a
                    href={job.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-full hover:bg-gray-100 transition-colors"
                    title="View original posting"
                  >
                    <ExternalLink className="h-6 w-6 text-gray-600" />
                  </a>
                )}
              </div>
            </div>

            {/* Apply Button */}
            <div className="flex space-x-4">
              {isApplied ? (
                <div className="flex-1 bg-green-50 border border-green-200 text-green-700 py-3 px-6 rounded-lg flex items-center justify-center space-x-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Applied</span>
                </div>
              ) : (
                <button 
                  onClick={applyToJob}
                  disabled={actionLoading}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Briefcase className="h-5 w-5" />
                  <span className="font-medium">
                    {actionLoading ? 'Applying...' : 'Apply Now'}
                  </span>
                </button>
              )}
            </div>
          </div>
          
          {/* Automation Option for Career OS users */}
          {!isApplied && subscriptionStatus.tier === 'career_os' && (
            <button
              onClick={automateApplication}
              disabled={actionLoading}
              className="bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="h-5 w-5" />
              <span className="font-medium">
                {actionLoading ? 'Scheduling...' : 'Automate Application'}
              </span>
            </button>
          )}
        </div>

        {/* Company Profile Section */}
        {company && (
          <div className="mb-8">
            <CompanyProfile company={company} />
          </div>
        )}

        {/* Job Intelligence */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
          <div className="p-8">
            <h2 className="text-xl font-bold text-black mb-6">Remote Work Intelligence</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Remote-Friendly Score */}
              <div className="space-y-4">
                <div className={`px-4 py-3 rounded-lg border ${getRemoteFriendlyScoreColor(job.culture_score)}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <Star className="h-5 w-5" />
                    <span className="font-medium">Remote-Friendly Score</span>
                  </div>
                  <div className="text-2xl font-bold">{job.culture_score}/100</div>
                  <div className="text-sm opacity-75">
                    {getRemoteFriendlyScoreLabel(job.culture_score)} support for remote workers
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">What this means:</h4>
                  <p className="text-blue-800 text-sm">
                    This score tells you how well this company supports remote workers like you. 
                    We measure global mindset, time flexibility, remote support, inclusive culture, 
                    and growth opportunities.
                  </p>
                </div>
              </div>

              {/* Regional Hiring */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">International Remote Support</h3>
                <div className="space-y-2">
                  {job.regional_hiring?.africa_friendly && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <Globe className="h-4 w-4" />
                      <span className="text-sm">Welcomes talent from Africa</span>
                    </div>
                  )}
                  {job.regional_hiring?.asia_friendly && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <Globe className="h-4 w-4" />
                      <span className="text-sm">Welcomes talent from Asia</span>
                    </div>
                  )}
                  {job.regional_hiring?.latam_friendly && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <Globe className="h-4 w-4" />
                      <span className="text-sm">Welcomes talent from Latin America</span>
                    </div>
                  )}
                  {job.regional_hiring?.visa_sponsorship && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Visa sponsorship available</span>
                    </div>
                  )}
                  {job.regional_hiring?.timezone_flexibility && (
                    <div className="flex items-center space-x-2 text-purple-600">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">Flexible working hours</span>
                    </div>
                  )}
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">Why this matters:</h4>
                  <p className="text-green-800 text-sm">
                    Working from Nigeria, Kenya, or Indonesia? This company actively supports 
                    international remote workers with the tools and flexibility you need to succeed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Skills Required */}
        {job.skills_required && job.skills_required.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
            <div className="p-8">
              <h2 className="text-xl font-bold text-black mb-6">Skills Required</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills_required.map((skill, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Job Description */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="p-8">
            <h2 className="text-xl font-bold text-black mb-6">Job Description</h2>
            {job.description ? (
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {job.description}
                </div>
              </div>
            ) : (
              <div className="text-gray-600 italic">
                No detailed description available. Please visit the original job posting for more information.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}