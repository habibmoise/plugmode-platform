import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Globe, 
  Rss, 
  Database, 
  Webhook, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface JobSource {
  id: string;
  source_name: string;
  source_url: string;
  source_type: 'api' | 'scraper' | 'rss' | 'webhook';
  last_scraped: string | null;
  active_status: boolean;
  scrape_frequency: string;
  total_jobs_collected: number;
  config: any;
  created_at: string;
}

export function JobSources() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sources, setSources] = useState<JobSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState<JobSource | null>(null);

  useEffect(() => {
    loadJobSources();
  }, []);

  const loadJobSources = async () => {
    try {
      const { data, error } = await supabase
        .from('job_sources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSources(data || []);
    } catch (error) {
      console.error('Error loading job sources:', error);
      showToast({
        type: 'error',
        title: 'Error Loading Sources',
        message: 'Failed to load job sources.'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSourceStatus = async (sourceId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('job_sources')
        .update({ active_status: !currentStatus })
        .eq('id', sourceId);

      if (error) throw error;

      setSources(prev => prev.map(source => 
        source.id === sourceId 
          ? { ...source, active_status: !currentStatus }
          : source
      ));

      showToast({
        type: 'success',
        title: 'Source Updated',
        message: `Source ${!currentStatus ? 'activated' : 'paused'} successfully.`
      });
    } catch (error) {
      console.error('Error updating source status:', error);
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update source status.'
      });
    }
  };

  const deleteSource = async (sourceId: string) => {
    if (!confirm('Are you sure you want to delete this job source?')) return;

    try {
      const { error } = await supabase
        .from('job_sources')
        .delete()
        .eq('id', sourceId);

      if (error) throw error;

      setSources(prev => prev.filter(source => source.id !== sourceId));

      showToast({
        type: 'success',
        title: 'Source Deleted',
        message: 'Job source deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting source:', error);
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete job source.'
      });
    }
  };

  const getSourceTypeIcon = (type: string) => {
    switch (type) {
      case 'api': return Database;
      case 'rss': return Rss;
      case 'webhook': return Webhook;
      case 'scraper': return Globe;
      default: return Globe;
    }
  };

  const getSourceTypeColor = (type: string) => {
    switch (type) {
      case 'api': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'rss': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'webhook': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'scraper': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 gap-6">
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
              <h1 className="text-3xl font-bold text-black mb-2">Job Sources</h1>
              <p className="text-gray-600">
                Manage automated job collection sources
              </p>
            </div>
            
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Add Source</span>
            </button>
          </div>
        </div>

        {/* Sources List */}
        {sources.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Database className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No job sources configured</h3>
            <p className="text-gray-600 mb-6">
              Add your first job source to start collecting opportunities automatically
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Source
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {sources.map((source) => {
              const SourceIcon = getSourceTypeIcon(source.source_type);
              
              return (
                <div key={source.id} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg border ${getSourceTypeColor(source.source_type)}`}>
                        <SourceIcon className="h-6 w-6" />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-black mb-1">{source.source_name}</h3>
                        <p className="text-gray-600 text-sm mb-2">{source.source_url}</p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Type: {source.source_type.toUpperCase()}</span>
                          <span>•</span>
                          <span>Last scraped: {formatDate(source.last_scraped)}</span>
                          <span>•</span>
                          <span>Jobs collected: {source.total_jobs_collected}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        source.active_status 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {source.active_status ? 'Active' : 'Paused'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Frequency: {source.scrape_frequency}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleSourceStatus(source.id, source.active_status)}
                        className={`p-2 rounded-lg transition-colors ${
                          source.active_status
                            ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                        }`}
                        title={source.active_status ? 'Pause source' : 'Activate source'}
                      >
                        {source.active_status ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      
                      <button
                        onClick={() => {
                          setEditingSource(source);
                          setShowForm(true);
                        }}
                        className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                        title="Edit source"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => deleteSource(source.id)}
                        className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                        title="Delete source"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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