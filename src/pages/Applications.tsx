import React, { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Briefcase, MapPin, DollarSign, Clock, CheckCircle, AlertCircle, Eye, Calendar, Filter } from 'lucide-react';

interface Application {
  id: string;
  applied_at: string;
  status: string;
  automation_enabled: boolean;
  notes: string | null;
  last_updated: string;
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    salary: string;
    category: string;
    source_url: string | null;
  };
}

const statusConfig = {
  applied: { label: 'Applied', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  reviewing: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800', icon: Eye },
  interview: { label: 'Interview', color: 'bg-purple-100 text-purple-800', icon: Calendar },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  offer: { label: 'Offer Received', color: 'bg-green-100 text-green-800', icon: CheckCircle }
};

export function Applications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadApplications();
  }, [user]);

  const loadApplications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          applied_at,
          status,
          automation_enabled,
          notes,
          last_updated,
          job:jobs (
            id,
            title,
            company,
            location,
            salary,
            category,
            source_url
          )
        `)
        .eq('user_id', user.id)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: newStatus,
          last_updated: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;

      setApplications(prev => prev.map(app => 
        app.id === applicationId 
          ? { ...app, status: newStatus, last_updated: new Date().toISOString() }
          : app
      ));

      // Log automation event
      await supabase.from('automation_logs').insert({
        user_id: user!.id,
        workflow_type: 'application_status',
        status: 'completed',
        result_data: {
          application_id: applicationId,
          new_status: newStatus,
          updated_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error updating application status:', error);
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

  const getStatusStats = () => {
    const stats = {
      total: applications.length,
      applied: applications.filter(app => app.status === 'applied').length,
      reviewing: applications.filter(app => app.status === 'reviewing').length,
      interview: applications.filter(app => app.status === 'interview').length,
      offer: applications.filter(app => app.status === 'offer').length,
      rejected: applications.filter(app => app.status === 'rejected').length
    };
    return stats;
  };

  const filteredApplications = filterStatus === 'all' 
    ? applications 
    : applications.filter(app => app.status === filterStatus);

  const stats = getStatusStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">My Applications</h1>
          <p className="text-gray-600">
            Track your job applications and their progress
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-black">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Applied</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{stats.applied}</div>
            <div className="text-sm text-gray-600">Applied</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-yellow-600">{stats.reviewing}</div>
            <div className="text-sm text-gray-600">Reviewing</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">{stats.interview}</div>
            <div className="text-sm text-gray-600">Interview</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-green-600">{stats.offer}</div>
            <div className="text-sm text-gray-600">Offers</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-600">Rejected</div>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Applications</option>
              <option value="applied">Applied</option>
              <option value="reviewing">Under Review</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer Received</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {filteredApplications.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Briefcase className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filterStatus === 'all' ? 'No applications yet' : `No ${filterStatus} applications`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filterStatus === 'all' 
                ? 'Start applying to jobs to track your progress here'
                : `You don't have any applications with ${filterStatus} status`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application) => {
              const statusInfo = statusConfig[application.status as keyof typeof statusConfig];
              const StatusIcon = statusInfo.icon;
              
              return (
                <div key={application.id} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-black">{application.job.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                          <StatusIcon className="h-4 w-4 inline mr-1" />
                          {statusInfo.label}
                        </span>
                      </div>
                      
                      <div className="text-gray-600 mb-2">{application.job.company}</div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {application.job.location}
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          {formatSalary(application.job.salary)}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          Applied {getTimeAgo(application.applied_at)}
                        </div>
                      </div>
                    </div>

                    <div className="ml-4">
                      <select
                        value={application.status}
                        onChange={(e) => updateApplicationStatus(application.id, e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="applied">Applied</option>
                        <option value="reviewing">Under Review</option>
                        <option value="interview">Interview</option>
                        <option value="rejected">Rejected</option>
                        <option value="offer">Offer Received</option>
                      </select>
                    </div>
                  </div>

                  {application.notes && (
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <p className="text-sm text-gray-700">{application.notes}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div>
                      Last updated: {getTimeAgo(application.last_updated)}
                    </div>
                    {application.automation_enabled && (
                      <div className="flex items-center space-x-1 text-blue-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Automation enabled</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}