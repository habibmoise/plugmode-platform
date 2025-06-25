import React from 'react';
import { UserPlus, Brain, Briefcase, TrendingUp, ArrowRight } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      icon: UserPlus,
      title: 'Create Your Profile',
      description: 'Sign up and complete your professional profile with your skills, experience, and career goals. Upload your resume for AI-powered analysis.',
      color: 'bg-blue-50 text-blue-600',
      borderColor: 'border-blue-200'
    },
    {
      icon: Brain,
      title: 'AI Matches You',
      description: 'Our intelligent matching system analyzes your profile and connects you with remote opportunities that fit your skills and aspirations.',
      color: 'bg-purple-50 text-purple-600',
      borderColor: 'border-purple-200'
    },
    {
      icon: Briefcase,
      title: 'Apply & Track',
      description: 'Apply to jobs with one click and track your applications. Get automated follow-ups and interview preparation resources.',
      color: 'bg-green-50 text-green-600',
      borderColor: 'border-green-200'
    },
    {
      icon: TrendingUp,
      title: 'Grow Your Career',
      description: 'Access ongoing career coaching, skill development recommendations, and networking opportunities to accelerate your global career.',
      color: 'bg-orange-50 text-orange-600',
      borderColor: 'border-orange-200'
    }
  ];

  return (
    <section className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-black mb-4">
            How PlugMode Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From profile creation to career growth, we guide you through every step of your global remote career journey
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection lines for desktop */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 via-green-200 to-orange-200"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Step Card */}
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100 relative z-10">
                  {/* Step Number */}
                  <div className="absolute -top-4 left-8">
                    <div className="bg-white border-2 border-gray-200 rounded-full w-8 h-8 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-600">{index + 1}</span>
                    </div>
                  </div>

                  {/* Icon */}
                  <div className={`${step.color} ${step.borderColor} border-2 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto`}>
                    <step.icon className="h-8 w-8" />
                  </div>

                  {/* Content */}
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-black mb-4">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Arrow for mobile */}
                  {index < steps.length - 1 && (
                    <div className="lg:hidden flex justify-center mt-8">
                      <ArrowRight className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-200">
            <h3 className="text-2xl font-bold text-black mb-4">
              Ready to Start Your Journey?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Join thousands of professionals who've transformed their careers with PlugMode. 
              Your global remote opportunity is waiting.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/signup"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg font-medium"
              >
                Get Started Free
              </a>
              <a
                href="/login"
                className="border border-blue-600 text-blue-600 px-8 py-3 rounded-lg hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 font-medium"
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}