import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Star } from 'lucide-react';

export function Pricing() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started',
      features: [
        'Basic job matching',
        'Save up to 5 jobs',
        'Community access',
        'Basic profile creation'
      ],
      cta: 'Get Started Free',
      popular: false
    },
    {
      name: 'Professional',
      price: '$4.99',
      period: 'per month',
      description: 'For serious job seekers',
      features: [
        'Unlimited job matches',
        'Advanced filters',
        'AI coaching (5 sessions)',
        'Priority support',
        'Resume optimization',
        'Interview preparation'
      ],
      cta: 'Start Professional',
      popular: true
    },
    {
      name: 'Career OS',
      price: '$9.99',
      period: 'per month',
      description: 'Complete career transformation',
      features: [
        'Everything in Professional',
        'Unlimited AI coaching',
        'Voice coaching features',
        'Personal career advisor',
        'Salary negotiation support',
        'Career path planning',
        'Exclusive job opportunities'
      ],
      cta: 'Unlock Career OS',
      popular: false
    }
  ];

  return (
    <section className="bg-gray-50 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4">
            Choose Your Career Growth Plan
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start free and upgrade as you advance your global career journey
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`rounded-2xl p-8 relative ${
                plan.popular 
                  ? 'ring-2 ring-blue-600 shadow-xl bg-blue-600/5' 
                  : 'shadow-lg bg-white'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-1">
                    <Star className="h-4 w-4" />
                    <span>Most Popular</span>
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-black mb-2">{plan.name}</h3>
                <div className="mb-2">
                  <span className="text-4xl font-bold text-black">{plan.price}</span>
                  <span className="text-gray-600 ml-1">/{plan.period}</span>
                </div>
                <p className="text-gray-600">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/signup"
                className={`w-full py-3 px-4 rounded-lg font-medium text-center block transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}