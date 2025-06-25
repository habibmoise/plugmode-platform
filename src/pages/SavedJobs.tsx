import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Heart, MapPin, DollarSign, Clock, Briefcase, Trash2, Edit3, ExternalLink } from 'lucide-react';

interface SavedJob {
  id: string;
  saved_at: string;
  notes: string | null;
  interaction_type: string;
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    salary: string;
    category: string;
    created_at: string;
    source_url: string | null;
  };
}

export function SavedJobs() {
  const { user } = useAuth();
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    loadSavedJobs();
  }, [user]);

  const loadSavedJobs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('saved_jobs')
        .select(`
          id,
          saved_at,
          notes,
          interaction_type,
          job:jobs (
            id,
            title,
            company,
            location,
            salary,
            category,
            created_at,
            source_url
          )
        `)
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false });

      if (error) throw error;
      setSavedJobs(data || []);
    } catch (error) {
      console.error('Error loading saved jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const unsaveJob = async (savedJobId: string) => {
    try {
      const { error } = await supabase
        .from('saved_jobs')
        .delete()
        .eq('id', savedJobId);

      if (error) throw error;

      setSavedJobs(prev => prev.filter(job => job.id !== savedJobId));
    } catch (error) {
      console.error('Error unsaving job:', error);
    }
  };

  const updateNotes = async (savedJobId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('saved_jobs')
        .update({ notes })
        .eq('id', savedJobId);

      if (error) throw error;

      setSavedJobs(prev => prev.map(job => 
        job.id === savedJobId ? { ...job, notes } : job
      ));
      setEditingNotes(null);
      setNoteText('');
    } catch (error) {
      console.error('Error updating notes:', error);
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

  const startEditingNotes = (savedJobId: string, currentNotes: string | null) => {
    setEditingNotes(savedJobId);
    setNoteText(currentNotes || '');
  };

  const cancelEditingNotes = () => {
    setEditingNotes(null);
    setNoteText('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
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
          <h1 className="text-3xl font-bold text-black mb-2">Saved Jobs</h1>
          <p className="text-gray-600">
            {savedJobs.length} job{savedJobs.length !== 1 ? 's' : ''} saved for later review
          </p>
        </div>

        {savedJobs.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No saved jobs yet</h3>
            <p className="text-gray-600 mb-6">Start saving jobs you're interested in to build your shortlist</p>
            <Link
              to="/dashboard"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedJobs.map((savedJob) => (
              <div key={savedJob.id} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                {/* Header with unsave button */}
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-bold border border-blue-200">
                    {savedJob.job.category}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center text-gray-500 text-sm">
                      <Clock className="h-4 w-4 mr-1" />
                      Saved {getTimeAgo(savedJob.saved_at)}
                    </div>
                    <button
                      onClick={() => unsaveJob(savedJob.id)}
                      className="p-1 rounded-full hover:bg-red-100 transition-colors group"
                      title="Remove from saved jobs"
                    >
                      <Heart className="h-5 w-5 text-red-500 fill-current group-hover:text-red-600" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-black mb-2 line-clamp-2">
                  {savedJob.job.title}
                </h3>
                
                <div className="text-gray-600 mb-4">{savedJob.job.company}</div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span className="text-sm">{savedJob.job.location}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <span className="text-sm">{formatSalary(savedJob.job.salary)}</span>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="mb-4">
                  {editingNotes === savedJob.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add your notes about this job..."
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm resize-none"
                        rows={3}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateNotes(savedJob.id, noteText)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditingNotes}
                          className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {savedJob.notes ? (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-start justify-between">
                            <p className="text-sm text-gray-700 flex-1">{savedJob.notes}</p>
                            <button
                              onClick={() => startEditingNotes(savedJob.id, savedJob.notes)}
                              className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Edit notes"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditingNotes(savedJob.id, null)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                        >
                          <Edit3 className="h-4 w-4" />
                          <span>Add notes</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button 
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2"
                  >
                    <Briefcase className="h-4 w-4" />
                    <span>Apply Now</span>
                  </button>
                  
                  {savedJob.job.source_url && (
                    <a
                      href={savedJob.job.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-gray-200 transition-colors"
                      title="View original posting"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}