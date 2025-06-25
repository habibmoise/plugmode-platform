import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

export function CTA() {
  return (
    <section className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 py-24 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-yellow-300 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-pink-300 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-28 h-28 bg-green-300 rounded-full blur-2xl"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-1/4 animate-bounce">
          <div className="w-4 h-4 bg-white/20 rounded-full"></div>
        </div>
        <div className="absolute top-40 right-1/3 animate-pulse">
          <div className="w-6 h-6 bg-yellow-300/30 rounded-full"></div>
        </div>
        <div className="absolute bottom-32 left-1/3 animate-bounce delay-1000">
          <div className="w-3 h-3 bg-pink-300/40 rounded-full"></div>
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-6 py-2 mb-6">
          <Sparkles className="h-5 w-5 text-yellow-300" />
          <span className="text-white font-medium">Ready to Transform?</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6 leading-tight">
          Ready to Transform Your Career?
        </h2>
        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
          Join thousands of professionals who've unlocked global remote opportunities. 
          Your dream career is just one click away.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link 
            to="/signup"
            className="bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-bold hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 shadow-xl"
          >
            <span>Start Your Global Career with PlugMode</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        {/* Success indicators */}
        <div className="flex justify-center items-center space-x-8 text-blue-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">500+</div>
            <div className="text-sm">Success Stories</div>
          </div>
          <div className="w-px h-12 bg-blue-300/50"></div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">50+</div>
            <div className="text-sm">Countries</div>
          </div>
          <div className="w-px h-12 bg-blue-300/50"></div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">1,200+</div>
            <div className="text-sm">Opportunities</div>
          </div>
        </div>
      </div>
    </section>
  );
}