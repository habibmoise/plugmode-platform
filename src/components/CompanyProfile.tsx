import React from 'react';
import { Company } from '../types/company';
import { 
  Building, 
  Users, 
  Globe, 
  Star, 
  MapPin, 
  Calendar,
  TrendingUp,
  CheckCircle,
  DollarSign,
  Award,
  Clock,
  Heart
} from 'lucide-react';

interface CompanyProfileProps {
  company: Company;
  className?: string;
  compact?: boolean;
}

export function CompanyProfile({ company, className = '', compact = false }: CompanyProfileProps) {
  const getCompanySizeLabel = (size: string) => {
    const labels = {
      'startup': 'Startup',
      'small': 'Small (10-50)',
      'medium': 'Medium (50-200)',
      'large': 'Large (200-1000)',
      'enterprise': 'Enterprise (1000+)'
    };
    return labels[size as keyof typeof labels] || size;
  };

  const getRemoteFriendlyScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 80) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getRemoteFriendlyLabel = (score: number) => {
    if (score >= 90) return 'Exceptional';
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Good';
    return 'Average';
  };

  if (compact) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="flex items-start space-x-3">
          {company.logo_url ? (
            <img 
              src={company.logo_url} 
              alt={`${company.name} logo`}
              className="w-12 h-12 rounded-lg object-cover border border-gray-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building className="h-6 w-6 text-blue-600" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-black truncate">{company.name}</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
              <span>{getCompanySizeLabel(company.size)}</span>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3" />
                <span>{company.culture_score}/100</span>
              </div>
            </div>
            
            {/* Regional hiring indicators */}
            <div className="flex items-center space-x-1 mt-2">
              {company.hiring_regions.africa_friendly && (
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                  Africa Friendly
                </span>
              )}
              {company.hiring_regions.visa_sponsorship && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                  Visa Sponsorship
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start space-x-4">
          {company.logo_url ? (
            <img 
              src={company.logo_url} 
              alt={`${company.name} logo`}
              className="w-16 h-16 rounded-xl object-cover border border-gray-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center">
              <Building className="h-8 w-8 text-blue-600" />
            </div>
          )}
          
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-black mb-2">{company.name}</h2>
            
            <div className="flex items-center space-x-4 text-gray-600 mb-3">
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{getCompanySizeLabel(company.size)}</span>
              </div>
              
              {company.headquarters && (
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{company.headquarters}</span>
                </div>
              )}
              
              {company.founded_year && (
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Founded {company.founded_year}</span>
                </div>
              )}
            </div>

            {/* Remote-Friendly Score */}
            <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium border ${getRemoteFriendlyScoreColor(company.culture_score)}`}>
              <Star className="h-4 w-4" />
              <span>Remote-Friendly Score: {company.culture_score}/100</span>
              <span className="text-xs">({getRemoteFriendlyLabel(company.culture_score)})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Company Description */}
      {company.description && (
        <div className="p-6 border-b border-gray-200">
          <p className="text-gray-700 leading-relaxed">{company.description}</p>
        </div>
      )}

      {/* Hiring Intelligence */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-black mb-4 flex items-center space-x-2">
          <Globe className="h-5 w-5" />
          <span>International Hiring</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Regional Support */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Regional Support</h4>
            <div className="space-y-2">
              {company.hiring_regions.africa_friendly && (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Actively hires from Africa</span>
                  {company.hiring_regions.hiring_from_nigeria && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      {company.hiring_regions.hiring_from_nigeria} from Nigeria
                    </span>
                  )}
                </div>
              )}
              {company.hiring_regions.asia_friendly && (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Welcomes Asian talent</span>
                  {company.hiring_regions.hiring_from_indonesia && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      {company.hiring_regions.hiring_from_indonesia} from Indonesia
                    </span>
                  )}
                </div>
              )}
              {company.hiring_regions.latam_friendly && (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Open to Latin American professionals</span>
                </div>
              )}
            </div>
          </div>

          {/* Support Features */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Remote Support</h4>
            <div className="space-y-2">
              {company.hiring_regions.visa_sponsorship && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Visa sponsorship available</span>
                </div>
              )}
              {company.hiring_regions.timezone_flexible && (
                <div className="flex items-center space-x-2 text-purple-600">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Flexible working hours</span>
                </div>
              )}
              {company.hiring_regions.global_team && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">Global distributed team</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hiring Stats */}
      {company.hiring_stats && Object.keys(company.hiring_stats).length > 0 && (
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-black mb-4 flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Hiring Performance</span>
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {company.hiring_stats.total_remote_hires && (
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {company.hiring_stats.total_remote_hires}
                </div>
                <div className="text-sm text-gray-600">Remote Hires</div>
              </div>
            )}
            
            {company.hiring_stats.international_hires_last_year && (
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {company.hiring_stats.international_hires_last_year}
                </div>
                <div className="text-sm text-gray-600">International (2024)</div>
              </div>
            )}
            
            {company.hiring_stats.retention_rate && (
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {company.hiring_stats.retention_rate}%
                </div>
                <div className="text-sm text-gray-600">Retention Rate</div>
              </div>
            )}
            
            {company.hiring_stats.avg_time_to_hire && (
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {company.hiring_stats.avg_time_to_hire}
                </div>
                <div className="text-sm text-gray-600">Avg. Hiring Time</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Benefits & Perks */}
      {company.benefits && Object.keys(company.benefits).length > 0 && (
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-black mb-4 flex items-center space-x-2">
            <Heart className="h-5 w-5" />
            <span>Benefits & Perks</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {company.benefits.equipment_stipend && (
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm">Equipment stipend: {company.benefits.equipment_stipend}</span>
              </div>
            )}
            
            {company.benefits.learning_budget && (
              <div className="flex items-center space-x-2">
                <Award className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Learning budget: {company.benefits.learning_budget}</span>
              </div>
            )}
            
            {company.benefits.home_office_setup && (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Home office setup support</span>
              </div>
            )}
            
            {company.benefits.flexible_hours && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="text-sm">Flexible working hours</span>
              </div>
            )}
            
            {company.benefits.health_insurance && (
              <div className="flex items-center space-x-2">
                <Heart className="h-4 w-4 text-red-600" />
                <span className="text-sm">Health insurance</span>
              </div>
            )}
            
            {company.benefits.unlimited_pto && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <span className="text-sm">Unlimited PTO</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tech Stack */}
      {company.tech_stack && company.tech_stack.length > 0 && (
        <div className="p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Tech Stack</h3>
          <div className="flex flex-wrap gap-2">
            {company.tech_stack.map((tech, index) => (
              <span
                key={index}
                className="bg-gray-100 text-gray-800 px-3 py-1 rounded-lg text-sm font-medium"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}