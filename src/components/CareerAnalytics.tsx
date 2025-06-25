import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { supabase } from '../lib/supabase';
import { FeatureGate } from './FeatureGate';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  DollarSign, 
  Users, 
  Calendar,
  Award,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface AnalyticsData {
  applicationStats: {
    total: number;
    thisMonth: number;
    successRate: number;
    averageResponseTime: number;
  };
  skillsAnalysis: {
    topSkills: string[];
    gapSkills: string[];
    marketDemand: Record<string, number>;
  };
  salaryInsights: {
    currentRange: { min: number; max: number };
    marketAverage: number;
    growthPotential: number;
  };
  jobMatchTrends: {
    averageScore: number;
    topCategories: string[];
    monthlyMatches: number[];
  };
}

export function CareerAnalytics({ className = '' }: { className?: string }) {
  const { user } = useAuth();
  const { subscriptionStatus } = useSubscription();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    if (user && subscriptionStatus.tier === 'career_os') {
      loadAnalytics();
    }
  }, [user, subscriptionStatus.tier, timeRange]);

  const loadAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      // Load application stats
      const { data: applications } = await supabase
        .from('applications')
        .select('*, job:jobs(title, company, category)')
        .eq('user_id', user.id)
        .gte('applied_at', startDate.toISOString());

      // Load job matches
      const { data: jobMatches } = await supabase
        .from('job_matches')
        .select('*, job:jobs(category, skills_required)')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString());

      // Load user profile for skills analysis
      const { data: userProfile } = await supabase
        .from('users')
        .select('skills, experience_level, location')
        .eq('id', user.id)
        .single();

      // Load regional market data
      const { data: marketData } = await supabase
        .from('regional_market_data')
        .select('*')
        .eq('experience_level', userProfile?.experience_level || 'mid');

      // Process analytics data
      const analyticsData = processAnalyticsData(
        applications || [],
        jobMatches || [],
        userProfile,
        marketData || []
      );

      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (
    applications: any[],
    jobMatches: any[],
    userProfile: any,
    marketData: any[]
  ): AnalyticsData => {
    // Application stats
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const thisMonthApplications = applications.filter(
      app => new Date(app.applied_at) >= thisMonth
    );
    
    const successfulApplications = applications.filter(
      app => ['interview', 'offer'].includes(app.status)
    );

    // Skills analysis
    const userSkills = userProfile?.skills || [];
    const jobSkills = jobMatches.flatMap(match => match.job?.skills_required || []);
    const skillFrequency = jobSkills.reduce((acc, skill) => {
      acc[skill] = (acc[skill] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topSkills = Object.entries(skillFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([skill]) => skill);

    const gapSkills = topSkills.filter(skill => 
      !userSkills.some(userSkill => 
        userSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );

    // Salary insights
    const relevantMarketData = marketData.find(data => 
      userProfile?.location?.toLowerCase().includes(data.country.toLowerCase())
    );

    // Job match trends
    const averageScore = jobMatches.length > 0 
      ? Math.round(jobMatches.reduce((sum, match) => sum + match.match_score, 0) / jobMatches.length)
      : 0;

    const categoryFrequency = jobMatches.reduce((acc, match) => {
      const category = match.job?.category;
      if (category) {
        acc[category] = (acc[category] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    return {
      applicationStats: {
        total: applications.length,
        thisMonth: thisMonthApplications.length,
        successRate: applications.length > 0 
          ? Math.round((successfulApplications.length / applications.length) * 100)
          : 0,
        averageResponseTime: 7 // Mock data
      },
      skillsAnalysis: {
        topSkills,
        gapSkills,
        marketDemand: skillFrequency
      },
      salaryInsights: {
        currentRange: {
          min: relevantMarketData?.salary_range_min || 35000,
          max: relevantMarketData?.salary_range_max || 65000
        },
        marketAverage: relevantMarketData?.avg_salary_usd || 50000,
        growthPotential: relevantMarketData?.growth_rate || 15
      },
      jobMatchTrends: {
        averageScore,
        topCategories,
        monthlyMatches: [12, 18, 15, 22, 19, 25] // Mock trend data
      }
    };
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-6 animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 rounded mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <FeatureGate
      feature="analytics_dashboard"
      requiredTier="career_os"
      fallback={
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="bg-purple-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <BarChart3 className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-xl font-semibold text-black mb-2">Career Analytics Dashboard</h3>
          <p className="text-gray-600 mb-4">
            Get detailed insights into your job search performance, skill gaps, and market trends.
          </p>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-purple-800 font-medium">Available with Career OS ($9.99/month)</p>
            <ul className="text-purple-700 text-sm mt-2 space-y-1">
              <li>• Application success rate tracking</li>
              <li>• Skills gap analysis</li>
              <li>• Salary benchmarking</li>
              <li>• Market trend insights</li>
            </ul>
          </div>
        </div>
      }
    >
      <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 ${className}`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-50 p-2 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black">Career Analytics</h3>
                <p className="text-gray-600">Insights into your job search performance</p>
              </div>
            </div>
            
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>

        {analytics && (
          <div className="p-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors group">
                <div className="flex items-center justify-between mb-2">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(5)}
                    <ChevronRight className="h-4 w-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-900">{analytics.applicationStats.total}</div>
                <div className="text-blue-700 text-sm">Total Applications</div>
                <div className="text-blue-600 text-xs mt-1">
                  {analytics.applicationStats.thisMonth} this month
                </div>
                <div className="text-blue-600 text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to view breakdown by status
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4 cursor-pointer hover:bg-green-100 transition-colors group">
                <div className="flex items-center justify-between mb-2">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(analytics.applicationStats.successRate)}
                    <ChevronRight className="h-4 w-4 text-green-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-900">{analytics.applicationStats.successRate}%</div>
                <div className="text-green-700 text-sm">Success Rate</div>
                <div className="text-green-600 text-xs mt-1">Interview + Offer</div>
                <div className="text-green-600 text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  View success timeline
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Award className="h-5 w-5 text-purple-600" />
                  </div>
                  {getTrendIcon(analytics.jobMatchTrends.averageScore - 70)}
                </div>
                <div className="text-2xl font-bold text-purple-900">{analytics.jobMatchTrends.averageScore}%</div>
                <div className="text-purple-700 text-sm">Avg Match Score</div>
                <div className="text-purple-600 text-xs mt-1">Job compatibility</div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <DollarSign className="h-5 w-5 text-orange-600" />
                  </div>
                  {getTrendIcon(analytics.salaryInsights.growthPotential)}
                </div>
                <div className="text-2xl font-bold text-orange-900">
                  {formatCurrency(analytics.salaryInsights.marketAverage)}
                </div>
                <div className="text-orange-700 text-sm">Market Average</div>
                <div className="text-orange-600 text-xs mt-1">
                  +{analytics.salaryInsights.growthPotential}% growth
                </div>
              </div>
            </div>

            {/* Skills Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Top Skills in Demand</span>
                </h4>
                <div className="space-y-2">
                  {analytics.skillsAnalysis.topSkills.map((skill, index) => (
                    <div key={skill} className="flex items-center justify-between hover:bg-white p-2 rounded cursor-pointer transition-colors group">
                      <span className="text-gray-700">{skill}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.max(20, 100 - index * 15)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {analytics.skillsAnalysis.marketDemand[skill] || 0}
                        </span>
                        <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View skill learning resources →
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Skills to Develop</span>
                </h4>
                {analytics.skillsAnalysis.gapSkills.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.skillsAnalysis.gapSkills.slice(0, 5).map((skill) => (
                      <div key={skill} className="flex items-center justify-between p-2 bg-yellow-50 rounded hover:bg-yellow-100 cursor-pointer transition-colors group">
                        <span className="text-gray-700">{skill}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                            High demand
                          </span>
                          <ExternalLink className="h-3 w-3 text-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <button className="text-yellow-600 hover:text-yellow-700 text-sm font-medium">
                        Generate learning plan →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-green-600 mb-2">
                      <Award className="h-8 w-8 mx-auto" />
                    </div>
                    <p className="text-green-700 font-medium">Great job!</p>
                    <p className="text-green-600 text-sm">Your skills align well with market demand</p>
                  </div>
                )}
              </div>
            </div>

            {/* Salary Insights */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Salary Insights</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(analytics.salaryInsights.currentRange.min)} - {formatCurrency(analytics.salaryInsights.currentRange.max)}
                  </div>
                  <div className="text-gray-600 text-sm">Your Range</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {formatCurrency(analytics.salaryInsights.marketAverage)}
                  </div>
                  <div className="text-gray-600 text-sm">Market Average</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    +{analytics.salaryInsights.growthPotential}%
                  </div>
                  <div className="text-gray-600 text-sm">Annual Growth</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </FeatureGate>
  );
}