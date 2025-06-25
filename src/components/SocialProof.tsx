import React from 'react';
import { MapPin, Users, Briefcase } from 'lucide-react';

export function SocialProof() {
  const stats = [
    {
      icon: Users,
      number: '500+',
      label: 'Professionals Hired',
      description: 'From Nigeria, Kenya, Indonesia'
    },
    {
      icon: Briefcase,
      number: '1,200+',
      label: 'Remote Opportunities',
      description: 'Available globally'
    },
    {
      icon: MapPin,
      number: '50+',
      label: 'Countries Supported',
      description: 'Across 3 continents'
    }
  ];

  return (
    <section className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-black mb-4">
            Trusted by Professionals Worldwide
          </h2>
          <p className="text-xl text-gray-600">
            Join thousands of talented professionals who've found their dream remote careers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="bg-blue-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <stat.icon className="h-8 w-8 text-white" />
              </div>
              <div className="text-5xl font-bold text-black mb-2">{stat.number}</div>
              <div className="text-lg font-semibold text-gray-900 mb-1">{stat.label}</div>
              <div className="text-gray-600">{stat.description}</div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-600 text-lg">
            Connecting talent across continents - from Lagos to Silicon Valley, Jakarta to London, São Paulo to Toronto
          </p>
        </div>
      </div>
    </section>
  );
}