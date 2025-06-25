import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Globe, Brain, TrendingUp } from 'lucide-react';

export function Hero() {
  return (
    <section 
      className="relative py-24 overflow-hidden"
      style={{
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url("/pexels-august-de-richelieu-4427814.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* World map overlay */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" viewBox="0 0 1200 600" fill="none">
          <path d="M200 300 Q400 200 600 300 T1000 300" stroke="white" strokeWidth="2" strokeDasharray="5,5" opacity="0.3"/>
          <circle cx="250" cy="320" r="3" fill="white" opacity="0.6"/>
          <circle cx="450" cy="280" r="3" fill="white" opacity="0.6"/>
          <circle cx="650" cy="310" r="3" fill="white" opacity="0.6"/>
          <circle cx="850" cy="290" r="3" fill="white" opacity="0.6"/>
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
            Your Career Operating System for{' '}
            <span className="text-white drop-shadow-lg">
              Global Remote Opportunities
            </span>
          </h1>
          
          <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
            Connect talented professionals from underserved regions with global remote opportunities. 
            AI-powered matching for careers in Africa, Southeast Asia, and Latin America.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link 
              to="/signup"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2"
            >
              <span>Start Your Global Career</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            
            <Link 
              to="/login"
              className="border border-white text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-white/10 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              Sign In
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-white/20 backdrop-blur-sm w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 drop-shadow-md">AI-Powered Matching</h3>
              <p className="text-white/80 drop-shadow-sm">Smart algorithms connect you with opportunities that match your skills and aspirations.</p>
            </div>

            <div className="text-center">
              <div className="bg-white/20 backdrop-blur-sm w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 drop-shadow-md">Regional Expertise</h3>
              <p className="text-white/80 drop-shadow-sm">Specialized support for professionals in Africa, Southeast Asia, and Latin America.</p>
            </div>

            <div className="text-center">
              <div className="bg-white/20 backdrop-blur-sm w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 drop-shadow-md">Career Acceleration</h3>
              <p className="text-white/80 drop-shadow-sm">Access global opportunities and accelerate your career with our comprehensive platform.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}