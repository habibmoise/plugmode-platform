import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { useSubscription } from '../contexts/SubscriptionContext';
import { revenueCatService } from '../lib/revenuecat';
import { useToast } from '../contexts/ToastContext';
import { 
  Check, 
  Crown, 
  Star, 
  Zap, 
  ArrowRight, 
  Loader,
  Globe,
  MessageCircle,
  BarChart3,
  Users,
  Shield,
  Headphones
} from 'lucide-react';

export function Pricing() {
  const { subscriptionStatus, refreshSubscription } = useSubscription();
  const { showToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (tier: string) => {
    setLoading(tier);
    
    try {
      const offerings = await revenueCatService.getOfferings();
      if (!offerings?.current) {
        throw new Error('No offerings available');
      }

      const packageToPurchase = tier === 'professional' 
        ? offerings.current.monthly?.professional
        : offerings.current.monthly?.career_os;

      if (!packageToPurchase) {
        throw new Error('Package not found');
      }

      await revenueCatService.purchasePackage(packageToPurchase);
      await refreshSubscription();
      
      showToast({
        type: 'success',
        title: 'Subscription Activated!',
        message: `Welcome to ${tier === 'professional' ? 'Professional' : 'Career OS'}! Your new features are now available.`
      });
    } catch (error: any) {
      console.error('Purchase error:', error);
      showToast({
        type: 'error',
        title: 'Purchase Failed',
        message: error.message || 'Failed to complete purchase. Please try again.'
      });
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Starter',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started with your global career search',
      icon: Zap,
      color: 'gray',
      features: [
        'View all jobs with basic search',
        'Save up to 5 jobs',
        'Basic profile creation',
        'Community access (read-only)',
        'Email job alerts',
        'Basic application tracking'
      ],
      limitations: [
        'Limited to 5 saved jobs',
        'No AI career coaching',
        'Basic search filters only',
        'No priority support'
      ],
      cta: 'Get Started Free',
      popular: false,
      current: subscriptionStatus.tier === 'free'
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '$4.99',
      period: 'per month',
      description: 'For serious job seekers ready to accelerate their career',
      icon: Star,
      color: 'blue',
      features: [
        'Everything in Starter',
        'Unlimited job saves and applications',
        'Advanced search filters (salary, company size, remote type)',
        'Application templates and tracking',
        'AI career coaching (5 sessions/month)',
        'Enhanced profile optimization',
        'Priority customer support',
        'Resume optimization tools',
        'Interview preparation guides'
      ],
      cta: 'Start Professional',
      popular: true,
      current: subscriptionStatus.tier === 'professional'
    },
    {
      id: 'career_os',
      name: 'Career OS',
      price: '$9.99',
      period: 'per month',
      description: 'Complete career transformation with AI-powered guidance',
      icon: Crown,
      color: 'purple',
      features: [
        'Everything in Professional',
        'Unlimited AI career coaching with voice responses',
        'Multi-language translation support',
        'Advanced market insights and salary data',
        'Personal career roadmap generation',
        'Interview preparation with AI coaching',
        'Premium analytics dashboard',
        'Exclusive networking opportunities',
        'White-glove career consultation'
      ],
      cta: 'Unlock Career OS',
      popular: false,
      current: subscriptionStatus.tier === 'career_os'
    }
  ];

  const getColorClasses = (color: string, variant: 'bg' | 'text' | 'border' | 'gradient') => {
    const colors = {
      gray: {
        bg: 'bg-gray-50',
        text: 'text-gray-600',
        border: 'border-gray-200',
        gradient: 'from-gray-500 to-gray-600'
      },
      blue: {
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        border: 'border-blue-200',
        gradient: 'from-blue-500 to-blue-600'
      },
      purple: {
        bg: 'bg-purple-50',
        text: 'text-purple-600',
        border: 'border-purple-200',
        gradient: 'from-purple-500 to-purple-600'
      }
    };
    return colors[color as keyof typeof colors][variant];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-black mb-4">
            Choose Your Career Growth Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Start free and upgrade as you advance your global career journey. 
            All plans include access to our global job marketplace.
          </p>
          
          {/* Regional Context */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Global Accessibility</span>
            </div>
            <p className="text-blue-800 text-sm">
              Pricing optimized for professionals in Nigeria, Kenya, Indonesia, and other emerging markets. 
              Local payment methods supported via Paddle.
            </p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isLoading = loading === plan.id;
            
            return (
              <div 
                key={plan.id}
                className={`rounded-2xl p-8 relative transition-all duration-300 hover:scale-105 ${
                  plan.popular 
                    ? 'ring-2 ring-blue-500 shadow-xl bg-white' 
                    : 'shadow-lg bg-white hover:shadow-xl'
                } ${plan.current ? 'ring-2 ring-green-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-1">
                      <Star className="h-4 w-4" />
                      <span>Most Popular</span>
                    </div>
                  </div>
                )}

                {plan.current && (
                  <div className="absolute -top-4 right-4">
                    <div className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Current Plan
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <div className={`${getColorClasses(plan.color, 'bg')} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <Icon className={`h-8 w-8 ${getColorClasses(plan.color, 'text')}`} />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-black mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-black">{plan.price}</span>
                    <span className="text-gray-600 ml-1">/{plan.period}</span>
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.id === 'free' ? (
                  <Link
                    to="/signup"
                    className="w-full py-3 px-4 rounded-lg font-medium text-center block transition-all duration-300 transform hover:scale-105 hover:shadow-lg bg-gray-100 text-gray-900 hover:bg-gray-200"
                  >
                    {plan.cta}
                  </Link>
                ) : plan.current ? (
                  <div className="w-full py-3 px-4 rounded-lg font-medium text-center bg-green-100 text-green-800 border border-green-200">
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handlePurchase(plan.id)}
                    disabled={isLoading}
                    className={`w-full py-3 px-4 rounded-lg font-medium text-center transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${getColorClasses(plan.color, 'gradient')} text-white hover:opacity-90 flex items-center justify-center space-x-2`}
                  >
                    {isLoading ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>{plan.cta}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Feature Comparison */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-16">
          <h2 className="text-2xl font-bold text-black mb-8 text-center">Feature Comparison</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-900">AI Career Coaching</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Starter</span>
                  <span className="text-gray-500">Not included</span>
                </div>
                <div className="flex justify-between">
                  <span>Professional</span>
                  <span className="text-blue-600">5 sessions/month</span>
                </div>
                <div className="flex justify-between">
                  <span>Career OS</span>
                  <span className="text-purple-600">Unlimited + Voice</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-900">Analytics Dashboard</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Starter</span>
                  <span className="text-gray-500">Basic</span>
                </div>
                <div className="flex justify-between">
                  <span>Professional</span>
                  <span className="text-blue-600">Enhanced</span>
                </div>
                <div className="flex justify-between">
                  <span>Career OS</span>
                  <span className="text-purple-600">Premium</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-gray-900">Saved Jobs</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Starter</span>
                  <span className="text-gray-500">5 jobs</span>
                </div>
                <div className="flex justify-between">
                  <span>Professional</span>
                  <span className="text-blue-600">Unlimited</span>
                </div>
                <div className="flex justify-between">
                  <span>Career OS</span>
                  <span className="text-purple-600">Unlimited</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Headphones className="h-5 w-5 text-red-600" />
                <span className="font-medium text-gray-900">Support</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Starter</span>
                  <span className="text-gray-500">Community</span>
                </div>
                <div className="flex justify-between">
                  <span>Professional</span>
                  <span className="text-blue-600">Priority</span>
                </div>
                <div className="flex justify-between">
                  <span>Career OS</span>
                  <span className="text-purple-600">White-glove</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-black mb-8 text-center">Frequently Asked Questions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Can I change plans anytime?</h3>
                <p className="text-gray-600 text-sm">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h3>
                <p className="text-gray-600 text-sm">We accept all major credit cards, PayPal, and local payment methods in your region via Paddle.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Is there a free trial?</h3>
                <p className="text-gray-600 text-sm">Our Starter plan is free forever. You can upgrade to paid plans anytime to unlock additional features.</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h3>
                <p className="text-gray-600 text-sm">Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Do you offer refunds?</h3>
                <p className="text-gray-600 text-sm">We offer a 30-day money-back guarantee for all paid plans if you're not satisfied.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Is my data secure?</h3>
                <p className="text-gray-600 text-sm">Yes, we use enterprise-grade security and encryption to protect your personal and career data.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}