import React, { useState, useEffect } from 'react';
import { Search, Filter, X, ChevronDown, MapPin, DollarSign, Briefcase, Clock, Users } from 'lucide-react';
import { JobFilters } from '../types/job';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface JobSearchProps {
  filters: JobFilters;
  onFiltersChange: (filters: JobFilters) => void;
  totalResults: number;
  loading?: boolean;
}

const categories = [
  { value: '', label: 'All Categories' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Design', label: 'Design' },
  { value: 'Management', label: 'Management' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Other', label: 'Other' }
];

const experienceLevels = [
  { value: '', label: 'All Levels' },
  { value: 'entry', label: 'Entry Level (0-2 years)' },
  { value: 'mid', label: 'Mid Level (2-5 years)' },
  { value: 'senior', label: 'Senior Level (5-10 years)' },
  { value: 'lead', label: 'Lead/Principal (10+ years)' }
];

const jobTypes = [
  { value: '', label: 'All Types' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' }
];

const remoteTypes = [
  { value: '', label: 'All Remote Types' },
  { value: 'fully-remote', label: 'Fully Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote-friendly', label: 'Remote Friendly' }
];

const salaryRanges = [
  { value: '', label: 'Any Salary' },
  { value: '30000', label: '$30k+' },
  { value: '50000', label: '$50k+' },
  { value: '70000', label: '$70k+' },
  { value: '100000', label: '$100k+' }
];

const popularSkills = [
  'JavaScript', 'Python', 'React', 'Node.js', 'TypeScript', 'SQL',
  'AWS', 'Docker', 'Git', 'HTML/CSS', 'Java', 'C++',
  'UI/UX Design', 'Figma', 'Adobe Creative Suite',
  'Digital Marketing', 'SEO', 'Content Writing',
  'Project Management', 'Leadership', 'Communication'
];

export function JobSearch({ filters, onFiltersChange, totalResults, loading }: JobSearchProps) {
  const { user } = useAuth();
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search || '');

  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ ...filters, search: searchInput });
    
    // Log search event for recommendations
    logUserEvent('search_filters_changed', {
      search_query: searchInput,
      filters: filters,
      results_count: totalResults,
      searched_at: new Date().toISOString()
    });
  };

  const handleFilterChange = (key: keyof JobFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
    
    // Log filter change event
    logUserEvent('search_filters_changed', {
      search_query: searchInput,
      filters: newFilters,
      filter_changed: key,
      new_value: value,
      results_count: totalResults,
      filtered_at: new Date().toISOString()
    });
  };

  const toggleSkill = (skill: string) => {
    const currentSkills = filters.skills || [];
    const newSkills = currentSkills.includes(skill)
      ? currentSkills.filter(s => s !== skill)
      : [...currentSkills, skill];
    
    handleFilterChange('skills', newSkills);
  };

  const clearFilters = () => {
    onFiltersChange({});
    setSearchInput('');
    
    // Log clear filters event
    logUserEvent('search_filters_cleared', {
      previous_filters: filters,
      cleared_at: new Date().toISOString()
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.category) count++;
    if (filters.experience_level) count++;
    if (filters.job_type) count++;
    if (filters.remote_type) count++;
    if (filters.salary_min) count++;
    if (filters.skills && filters.skills.length > 0) count++;
    if (filters.location) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
      {/* Search Header */}
      <div className="p-6 border-b border-gray-100">
        <form onSubmit={handleSearchSubmit} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search jobs, companies, or skills..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center space-x-2 px-4 py-3 border rounded-lg transition-colors ${
              showAdvancedFilters || activeFilterCount > 0
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-gray-300 text-gray-600 hover:border-gray-400'
            }`}
          >
            <Filter className="h-5 w-5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
          </button>
        </form>

        {/* Results Summary */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-gray-600">
            {loading ? (
              <span>Searching...</span>
            ) : (
              <span>
                {totalResults.toLocaleString()} job{totalResults !== 1 ? 's' : ''} found
                {filters.search && ` for "${filters.search}"`}
              </span>
            )}
          </div>
          
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-4 w-4" />
              <span>Clear all filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Briefcase className="h-4 w-4 inline mr-1" />
                Category
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Experience Level Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="h-4 w-4 inline mr-1" />
                Experience Level
              </label>
              <select
                value={filters.experience_level || ''}
                onChange={(e) => handleFilterChange('experience_level', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {experienceLevels.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>

            {/* Job Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Job Type
              </label>
              <select
                value={filters.job_type || ''}
                onChange={(e) => handleFilterChange('job_type', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {jobTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Salary Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="h-4 w-4 inline mr-1" />
                Minimum Salary
              </label>
              <select
                value={filters.salary_min || ''}
                onChange={(e) => handleFilterChange('salary_min', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {salaryRanges.map(range => (
                  <option key={range.value} value={range.value}>{range.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Remote Type Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 inline mr-1" />
              Remote Type
            </label>
            <select
              value={filters.remote_type || ''}
              onChange={(e) => handleFilterChange('remote_type', e.target.value || undefined)}
              className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {remoteTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Skills Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Skills
            </label>
            <div className="flex flex-wrap gap-2">
              {popularSkills.map(skill => (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    filters.skills?.includes(skill)
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  {skill}
                  {filters.skills?.includes(skill) && (
                    <X className="h-3 w-3 inline ml-1" />
                  )}
                </button>
              ))}
            </div>
            {filters.skills && filters.skills.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                Selected: {filters.skills.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}