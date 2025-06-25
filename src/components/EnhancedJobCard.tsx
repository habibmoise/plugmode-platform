import React from 'react';
import { MapPin, DollarSign, Clock, Heart, Briefcase, Star, Globe, CheckCircle, TrendingUp, Building } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  remote_type: 'fully-remote' | 'hybrid' | 'remote-friendly' | 'on-site';
  job_type: 'full-time' | 'part-time' | 'contract' | 'freelance';
  experience_level: 'entry' | 'mid' | 'senior' | 'lead' | 'any';
  category: string;
  skills_required?: string[];
  description?: string;
  created_at: string;
  updated_at: string;
  culture_score: number;
  auto_collected?: boolean;
  regional_hiring?: {
    africa_friendly?: boolean;
    asia_friendly?: boolean;
    latam_friendly?: boolean;
    visa_sponsorship?: boolean;
    timezone_flexibility?: boolean;
  };
}

interface EnhancedJobCardProps {
  job: Job;
  isSaved?: boolean;
  isApplied?: boolean;
  onSave?: (jobId: string) => void;
  onApply?: (jobId: string) => void;
  matchScore?: number;
  showIntelligence?: boolean;
  userSkills?: string[];
  showSkillsMatch?: boolean;
}

export function EnhancedJobCard({ 
  job, 
  isSaved = false, 
  isApplied = false, 
  onSave, 
  onApply,
  matchScore,
  showIntelligence = true,
  userSkills = [],
  showSkillsMatch = false
}: EnhancedJobCardProps) {
  
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
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-orange-600 bg-orange-50 border-orange-200';
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 relative border border-gray-100">
      {/* Header with badges and save button */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-wrap gap-2">
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

          {/* Regional hiring badge */}
          {job.regional_hiring?.africa_friendly && (
            <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-full text-xs border border-purple-200 flex items-center space-x-1">
              <Globe className="h-3 w-3" />
              <span>Africa Friendly</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Match Score */}
          {matchScore && (
            <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getMatchScoreColor(matchScore)}`}>
              {matchScore}% match
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              onSave?.(job.id);
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <Heart 
              className={`h-5 w-5 transition-colors ${
                isSaved 
                  ? 'text-red-500 fill-current' 
                  : 'text-gray-400 hover:text-red-500'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Job Title and Company */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-black mb-2 line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer">
          {job.title}
        </h3>
        
        <div className="text-gray-600 font-medium flex items-center space-x-2">
          <Building className="h-4 w-4" />
          <span>{job.company}</span>
        </div>
      </div>

      {/* Job Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-gray-600">
          <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="text-sm">{job.location}</span>
          <span className="mx-2">•</span>
          <span className="text-sm">{getRemoteTypeLabel(job.remote_type)}</span>
        </div>
        
        <div className="flex items-center text-gray-600">
          <DollarSign className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="text-sm">{formatSalary(job.salary)}</span>
          <span className="mx-2">•</span>
          <span className="text-sm capitalize">{job.job_type}</span>
        </div>

        <div className="flex items-center text-gray-600">
          <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="text-sm">{getTimeAgo(job.created_at)}</span>
          {job.auto_collected && (
            <>
              <span className="mx-2">•</span>
              <span className="text-sm text-green-600">Auto-updated</span>
            </>
          )}
        </div>
      </div>

      {/* Skills */}
      {job.skills_required && job.skills_required.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {job.skills_required.slice(0, 4).map((skill, index) => (
              <span
                key={index}
                className={`px-2 py-1 rounded text-xs ${
                  userSkills.some(userSkill => 
                    userSkill.toLowerCase().includes(skill.toLowerCase()) ||
                    skill.toLowerCase().includes(userSkill.toLowerCase())
                  ) 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {skill}
              </span>
            ))}
            {job.skills_required.length > 4 && (
              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                +{job.skills_required.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Job Intelligence */}
      {showIntelligence && (
        <div className="mb-4 space-y-2">
          {/* Remote-Friendly Score */}
          <div className="flex items-center space-x-2">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getRemoteFriendlyScoreColor(job.culture_score)}`}>
              <Star className="h-3 w-3 inline mr-1" />
              Remote-Friendly Score: {job.culture_score}/100
            </div>
          </div>

          {/* Regional Hiring Indicators */}
          {job.regional_hiring && (
            <div className="flex items-center space-x-2 text-xs">
              {job.regional_hiring.visa_sponsorship && (
                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-200">
                  <CheckCircle className="h-3 w-3 inline mr-1" />
                  Visa Sponsorship
                </span>
              )}
              {job.regional_hiring.timezone_flexibility && (
                <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-full border border-purple-200">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Flexible Hours
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        {isApplied ? (
          <div className="w-full bg-green-50 border border-green-200 text-green-700 py-2 px-4 rounded-lg flex items-center justify-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Applied</span>
          </div>
        ) : (
          <button 
            onClick={() => onApply?.(job.id)}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2"
          >
            <Briefcase className="h-4 w-4" />
            <span>Apply Now</span>
          </button>
        )}
        
        <button className="bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-gray-200 transition-colors" title="View job details">
          <Globe className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}