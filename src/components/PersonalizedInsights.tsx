import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { UserInsight, RegionalMarketData } from '../types/company';
import { 
  TrendingUp, 
  Target, 
  DollarSign, 
  Lightbulb, 
  BarChart3, 
  X, 
  CheckCircle,
  AlertTriangle,
  Info,
  Star,
  ArrowRight,
  Globe,
  Users,
  RefreshCw
} from 'lucide-react';

interface PersonalizedInsightsProps {
  className?: string;
}

export function PersonalizedInsights({ className = '' }: PersonalizedInsightsProps) {
  const { user } = useAuth();
  const [insights, setInsights] = useState<UserInsight[]>([]);
  const [marketData, setMarketData] = useState<RegionalMarketData[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadInsightsData();
    }
  }, [user]);

  const loadInsightsData = async () => {
    if (!user) return;

    try {
      // Load user profile
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      setUserProfile(userData);

      // Load user insights
      const { data: insightsData } = await supabase
        .from('user_insights')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('priority', { ascending: false })
        .order('generated_at', { ascending: false })
        .limit(5);

      // Load regional market data
      const { data: marketDataResult } = await supabase
        .from('regional_market_data')
        .select('*')
        .order('last_updated', { ascending: false });

      setInsights(insightsData || []);
      setMarketData(marketDataResult || []);

      // If no insights exist, trigger generation via backend
      if (!insightsData || insightsData.length === 0) {
        await triggerInsightsGeneration();
      }
    } catch (error) {
      console.error('Error loading insights data:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerInsightsGeneration = async (forceRegenerate = false) => {
    if (!user) return;

    setRefreshing(true);
    try {
      // Call the insights generation edge function
      const { data, error } = await supabase.functions.invoke('insights-generation', {
        body: {
          user_id: user.id,
          insight_types: ['skills_gap', 'salary_benchmark', 'job_match_summary', 'career_recommendation'],
          force_regenerate: forceRegenerate
        }
      });

      if (error) {
        console.error('Error generating insights:', error);
        return;
      }

      console.log('Insights generation triggered:', data);

      // Reload insights after generation
      setTimeout(() => {
        loadInsightsData();
      }, 2000); // Give the backend time to process

    } catch (error) {
      console.error('Error triggering insights generation:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const dismissInsight = async (insightId: string) => {
    try {
      await supabase
        .from('user_insights')
        .update({ status: 'dismissed' })
        .eq('id', insightId);

      setInsights(prev => prev.filter(insight => insight.id !== insightId));
    } catch (error) {
      console.error('Error dismissing insight:', error);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'skills_gap': return Target;
      case 'salary_benchmark': return DollarSign;
      case 'market_trend': return TrendingUp;
      case 'career_recommendation': return Lightbulb;
      case 'job_match_summary': return BarChart3;
      default: return Info;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-200 bg-red-50';
      case 'high': return 'border-orange-200 bg-orange-50';
      case 'medium': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getPriorityTextColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-800';
      case 'high': return 'text-orange-800';
      case 'medium': return 'text-blue-800';
      default: return 'text-gray-800';
    }
  };

  const renderSalaryChart = (data: any) => {
    const { avg_salary, range_min, range_max } = data;
    const maxSalary = range_max;
    const avgPosition = ((avg_salary - range_min) / (range_max - range_min)) * 100;
    
    return (
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-600 mb-2">
          <span>${range_min.toLocaleString()}</span>
          <span>${range_max.toLocaleString()}</span>
        </div>
        <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
          {/* Salary range bar */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-300 to-blue-500 rounded-full"></div>
          
          {/* Average salary indicator */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white border-2 border-blue-700 rounded-full"
            style={{ left: `${avgPosition}%` }}
          ></div>
        </div>
        <div className="flex justify-center mt-2">
          <div className="text-center">
            <div className="text-sm font-medium text-blue-800">
              ${avg_salary.toLocaleString()}
            </div>
            <div className="text-xs text-blue-600">Average</div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl p-6 shadow-lg animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-50 p-2 rounded-lg">
              <Lightbulb className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-black">Personalized Insights</h3>
              <p className="text-gray-600">AI-powered recommendations for your career</p>
            </div>
          </div>
          
          <button
            onClick={() => triggerInsightsGeneration(true)}
            disabled={refreshing}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {insights.length === 0 ? (
          <div className="text-center py-8">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Generating Insights</h4>
            <p className="text-gray-600 mb-4">We're analyzing your profile to provide personalized recommendations.</p>
            <button
              onClick={() => triggerInsightsGeneration(false)}
              disabled={refreshing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {refreshing ? 'Generating...' : 'Generate Insights'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight) => {
              const Icon = getInsightIcon(insight.insight_type);
              
              return (
                <div 
                  key={insight.id} 
                  className={`border rounded-lg p-4 ${getPriorityColor(insight.priority)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-2 rounded-lg ${getPriorityColor(insight.priority)}`}>
                        <Icon className={`h-5 w-5 ${getPriorityTextColor(insight.priority)}`} />
                      </div>
                      
                      <div className="flex-1">
                        <h4 className={`font-medium ${getPriorityTextColor(insight.priority)} mb-1`}>
                          {insight.insight_data.title}
                        </h4>
                        <p className={`text-sm ${getPriorityTextColor(insight.priority)} opacity-80 mb-3`}>
                          {insight.insight_data.description}
                        </p>

                        {/* Action items */}
                        {insight.insight_data.action_items && (
                          <div className="space-y-1">
                            {insight.insight_data.action_items.slice(0, 2).map((item, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <ArrowRight className={`h-3 w-3 ${getPriorityTextColor(insight.priority)}`} />
                                <span className={`text-xs ${getPriorityTextColor(insight.priority)}`}>
                                  {item}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Data visualization for salary benchmark */}
                        {insight.insight_type === 'salary_benchmark' && insight.insight_data.data && (
                          <div className="mt-3">
                            {renderSalaryChart(insight.insight_data.data)}
                            <div className="grid grid-cols-2 gap-4 mt-4">
                              <div>
                                <div className={`text-xs ${getPriorityTextColor(insight.priority)} opacity-70`}>
                                  Salary Range
                                </div>
                                <div className={`text-sm font-medium ${getPriorityTextColor(insight.priority)}`}>
                                  ${insight.insight_data.data.range_min.toLocaleString()} - ${insight.insight_data.data.range_max.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <div className={`text-xs ${getPriorityTextColor(insight.priority)} opacity-70`}>
                                  Growth Rate
                                </div>
                                <div className={`text-sm font-medium ${getPriorityTextColor(insight.priority)}`}>
                                  +{insight.insight_data.data.growth_rate}% annually
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Impact indicator */}
                        {insight.insight_data.impact && (
                          <div className="mt-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(insight.priority)} ${getPriorityTextColor(insight.priority)} font-medium`}>
                              {insight.insight_data.impact}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => dismissInsight(insight.id)}
                      className={`p-1 rounded-full hover:bg-white/50 transition-colors ${getPriorityTextColor(insight.priority)} opacity-60 hover:opacity-100`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Market trends summary */}
        {marketData.length > 0 && userProfile?.location && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span>Market Trends in Your Region</span>
            </h4>
            
            {marketData
              .filter(data => userProfile.location.toLowerCase().includes(data.country.toLowerCase()))
              .slice(0, 2)
              .map((data, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 mb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {data.job_category} • {data.experience_level} level
                      </div>
                      <div className="text-gray-600 text-xs">
                        {data.job_count} opportunities • Growing {data.growth_rate}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900 text-sm">
                        ${data.avg_salary_usd.toLocaleString()}
                      </div>
                      <div className="text-gray-600 text-xs">avg. salary</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}